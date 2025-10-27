import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertPickSchema,
  insertFadeSchema,
  insertChatMessageSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);

    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  function broadcast(message: any) {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  app.get("/api/players", async (_req, res) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.get("/api/weeks/active", async (_req, res) => {
    try {
      const week = await storage.getActiveWeek();
      if (!week) {
        return res.status(404).json({ error: "No active week found" });
      }
      res.json(week);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active week" });
    }
  });

  app.get("/api/picks", async (req, res) => {
    try {
      const weekId = req.query.weekId as string;
      if (!weekId) {
        return res.status(400).json({ error: "weekId is required" });
      }

      const picks = await storage.getPicks(weekId);
      const players = await storage.getPlayers();
      const fades = await storage.getFades(weekId);

      const picksWithDetails = await Promise.all(
        picks.map(async (pick) => {
          const player = players.find((p) => p.id === pick.playerId);
          const pickFades = fades.filter((f) => f.targetPickId === pick.id);
          const fadedBy = await Promise.all(
            pickFades.map(async (fade) => {
              const fader = players.find((p) => p.id === fade.playerId);
              return fader?.name || "Unknown";
            })
          );

          return {
            ...pick,
            playerName: player?.name || "Unknown",
            isFaded: fadedBy.length > 0,
            fadedBy,
          };
        })
      );

      res.json(picksWithDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch picks" });
    }
  });

  app.post("/api/picks", async (req, res) => {
    try {
      const activeWeek = await storage.getActiveWeek();
      if (!activeWeek) {
        return res.status(400).json({ error: "No active week" });
      }

      const { playerId, lock, side, lotto } = req.body;

      if (!playerId || !lock || !side || !lotto) {
        return res.status(400).json({ error: "All picks are required" });
      }

      const existingPicks = await storage.getPicksByPlayer(
        activeWeek.id,
        playerId
      );
      if (existingPicks.length > 0) {
        return res
          .status(400)
          .json({ error: "Player has already submitted picks this week" });
      }

      const lockPick = await storage.createPick(
        insertPickSchema.parse({
          weekId: activeWeek.id,
          playerId,
          pickType: "LOCK",
          pick: lock,
          chips: 100,
        })
      );

      const sidePick = await storage.createPick(
        insertPickSchema.parse({
          weekId: activeWeek.id,
          playerId,
          pickType: "SIDE",
          pick: side,
          chips: 50,
        })
      );

      const lottoPick = await storage.createPick(
        insertPickSchema.parse({
          weekId: activeWeek.id,
          playerId,
          pickType: "LOTTO",
          pick: lotto,
          chips: 10,
        })
      );

      const picks = [lockPick, sidePick, lottoPick];
      broadcast({ type: "picks_submitted", data: picks });

      res.json(picks);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to submit picks" });
    }
  });

  app.post("/api/fades", async (req, res) => {
    try {
      const activeWeek = await storage.getActiveWeek();
      if (!activeWeek) {
        return res.status(400).json({ error: "No active week" });
      }

      const fadeData = insertFadeSchema.parse({
        ...req.body,
        weekId: activeWeek.id,
      });

      const existingFades = await storage.getFadesByPlayer(
        activeWeek.id,
        fadeData.playerId
      );

      if (existingFades.length > 0) {
        return res
          .status(400)
          .json({ error: "You've already used your fade this week" });
      }

      const pick = await storage.getPicks(activeWeek.id);
      const targetPick = pick.find((p) => p.id === fadeData.targetPickId);
      if (!targetPick) {
        return res.status(404).json({ error: "Pick not found" });
      }

      if (targetPick.pickType !== "LOCK") {
        return res
          .status(400)
          .json({ error: "Can only fade LOCK picks" });
      }

      if (targetPick.playerId === fadeData.playerId) {
        return res.status(400).json({ error: "Cannot fade your own pick" });
      }

      const fade = await storage.createFade(fadeData);
      broadcast({ type: "fade_created", data: fade });

      res.json(fade);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create fade" });
    }
  });

  app.post("/api/picks/:pickId/resolve", async (req, res) => {
    try {
      const { pickId } = req.params;
      const { status } = req.body;

      if (status !== "win" && status !== "loss") {
        return res.status(400).json({ error: "Invalid status" });
      }

      const pick = await storage.updatePickStatus(pickId, status);
      if (!pick) {
        return res.status(404).json({ error: "Pick not found" });
      }

      const fades = await storage.getFadesForPick(pickId);
      const player = await storage.getPlayer(pick.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      let chipDelta = 0;
      if (status === "win") {
        chipDelta = pick.chips;
        if (fades.length > 0) {
          chipDelta += fades.length * pick.chips;
        }
      } else {
        chipDelta = -pick.chips;
        if (fades.length > 0) {
          for (const fade of fades) {
            const fader = await storage.getPlayer(fade.playerId);
            if (fader) {
              await storage.updatePlayerChips(fader.id, fader.chips + pick.chips);
            }
          }
        }
      }

      await storage.updatePlayerChips(player.id, player.chips + chipDelta);

      broadcast({ type: "pick_resolved", data: { pickId, status } });

      res.json({ success: true, pick });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to resolve pick" });
    }
  });

  app.get("/api/chat/messages", async (_req, res) => {
    try {
      const messages = await storage.getChatMessages(100);
      const players = await storage.getPlayers();

      const messagesWithPlayerNames = messages.map((msg) => {
        const player = players.find((p) => p.id === msg.playerId);
        return {
          ...msg,
          playerName: player?.name || "Unknown",
        };
      });

      res.json(messagesWithPlayerNames);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/messages", async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse(req.body);
      const message = await storage.createChatMessage(messageData);

      const player = await storage.getPlayer(message.playerId);
      const messageWithPlayerName = {
        ...message,
        playerName: player?.name || "Unknown",
      };

      broadcast({ type: "chat_message", data: messageWithPlayerName });

      res.json(messageWithPlayerName);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to send message" });
    }
  });

  return httpServer;
}
