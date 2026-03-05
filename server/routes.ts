import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertPickSchema,
  insertFadeSchema,
  insertChatMessageSchema,
} from "@shared/schema";
import bcrypt from "bcryptjs";

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
      // Remove password from response for security
      const playersWithoutPasswords = players.map(({ password, ...player }) => player);
      res.json(playersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  // Player Authentication Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { name, password } = req.body;
      
      if (!name || !password) {
        return res.status(400).json({ error: "Name and password are required" });
      }

      const players = await storage.getPlayers();
      const player = players.find((p) => p.name === name);

      if (!player) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, player.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Store player ID in session
      req.session.playerId = player.id;
      req.session.playerName = player.name;
      
      // Grant admin access to Carter
      if (player.name === "Carter") {
        req.session.isAdminAuthenticated = true;
      }

      res.json({ 
        success: true,
        player: {
          id: player.id,
          name: player.name,
          chips: player.chips,
          avatar: player.avatar,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/auth/status", async (req, res) => {
    try {
      if (!req.session.playerId) {
        return res.json({ isAuthenticated: false });
      }

      const players = await storage.getPlayers();
      const player = players.find((p) => p.id === req.session.playerId);

      if (!player) {
        req.session.playerId = undefined;
        req.session.playerName = undefined;
        return res.json({ isAuthenticated: false });
      }

      res.json({ 
        isAuthenticated: true,
        player: {
          id: player.id,
          name: player.name,
          chips: player.chips,
          avatar: player.avatar,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check auth status" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    // M1: Properly destroy the session rather than just clearing fields
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
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
      // C2: Verify the requester is authenticated and submitting as themselves
      if (!req.session.playerId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const activeWeek = await storage.getActiveWeek();
      if (!activeWeek) {
        return res.status(400).json({ error: "No active week" });
      }

      const { playerId, lock, side, lotto, lockGameId, sideGameId, lottoGameId } = req.body;

      if (!playerId || !lock || !side || !lotto) {
        return res.status(400).json({ error: "All picks are required" });
      }

      if (req.session.playerId !== playerId) {
        return res.status(403).json({ error: "Cannot submit picks for another player" });
      }

      // Require all gameIds to prevent deadline bypass
      if (!lockGameId || !sideGameId || !lottoGameId) {
        return res.status(400).json({ error: "Game IDs are required for all picks" });
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

      // Validate all games exist and haven't started
      const gameIds = [lockGameId, sideGameId, lottoGameId];
      const games = await storage.getGamesByIds(gameIds);
      
      if (games.length !== 3) {
        return res.status(400).json({ error: "One or more invalid game IDs" });
      }

      const now = new Date();
      const startedGame = games.find(game => new Date(game.commenceTime) <= now);
      if (startedGame) {
        return res.status(400).json({ 
          error: `Cannot submit picks after game has started (${startedGame.awayTeam} @ ${startedGame.homeTeam})` 
        });
      }

      // Get sportKeys from games
      const lockGame = games.find(g => g.id === lockGameId);
      const sideGame = games.find(g => g.id === sideGameId);
      const lottoGame = games.find(g => g.id === lottoGameId);

      const lockPick = await storage.createPick(
        insertPickSchema.parse({
          weekId: activeWeek.id,
          playerId,
          pickType: "LOCK",
          pick: lock,
          gameId: lockGameId,
          sportKey: lockGame?.sportKey,
          chips: 100,
        })
      );

      const sidePick = await storage.createPick(
        insertPickSchema.parse({
          weekId: activeWeek.id,
          playerId,
          pickType: "SIDE",
          pick: side,
          gameId: sideGameId,
          sportKey: sideGame?.sportKey,
          chips: 50,
        })
      );

      const lottoPick = await storage.createPick(
        insertPickSchema.parse({
          weekId: activeWeek.id,
          playerId,
          pickType: "LOTTO",
          pick: lotto,
          gameId: lottoGameId,
          sportKey: lottoGame?.sportKey,
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
      // C3: Verify the requester is authenticated and fading as themselves
      if (!req.session.playerId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const activeWeek = await storage.getActiveWeek();
      if (!activeWeek) {
        return res.status(400).json({ error: "No active week" });
      }

      const fadeData = insertFadeSchema.parse({
        ...req.body,
        weekId: activeWeek.id,
      });

      if (req.session.playerId !== fadeData.playerId) {
        return res.status(403).json({ error: "Cannot fade as another player" });
      }

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
      // C1: Require admin authentication
      if (!req.session.isAdminAuthenticated) {
        return res.status(401).json({ error: "Admin authentication required" });
      }

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

      // C5: Fix chip economy — faders must gain/lose chips opposite to the pick owner
      if (status === "win") {
        // Pick owner wins their chips back plus chips from each fader
        let ownerGain = pick.chips;
        for (const fade of fades) {
          const fader = await storage.getPlayer(fade.playerId);
          if (fader) {
            // Each fader loses pick.chips to the pick owner
            ownerGain += pick.chips;
            await storage.updatePlayerChips(fader.id, fader.chips - pick.chips);
          }
        }
        await storage.updatePlayerChips(player.id, player.chips + ownerGain);
      } else {
        // Pick owner loses their chips; each fader gains pick.chips from the owner
        let ownerLoss = pick.chips;
        for (const fade of fades) {
          const fader = await storage.getPlayer(fade.playerId);
          if (fader) {
            ownerLoss += pick.chips;
            await storage.updatePlayerChips(fader.id, fader.chips + pick.chips);
          }
        }
        await storage.updatePlayerChips(player.id, player.chips - ownerLoss);
      }

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
      // C4: Verify the requester is authenticated and posting as themselves
      if (!req.session.playerId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const messageData = insertChatMessageSchema.parse(req.body);

      if (req.session.playerId !== messageData.playerId) {
        return res.status(403).json({ error: "Cannot post as another player" });
      }

      // M4: Enforce message length limit
      if (messageData.message.length > 500) {
        return res.status(400).json({ error: "Message must be 500 characters or fewer" });
      }

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

  app.get("/api/games", async (req, res) => {
    try {
      const weekId = req.query.weekId as string;
      if (!weekId) {
        return res.status(400).json({ error: "weekId is required" });
      }

      const games = await storage.getGames(weekId);
      res.json(games);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  app.post("/api/admin/fetch-games", async (req, res) => {
    try {
      if (!req.session.isAdminAuthenticated) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { weekId, sportKey = "americanfootball_ncaaf" } = req.body;
      if (!weekId) {
        return res.status(400).json({ error: "weekId is required" });
      }

      const validSportKeys = [
        "americanfootball_ncaaf",
        "americanfootball_nfl",
        "baseball_mlb",
        "basketball_ncaab",
        "basketball_nba",
      ];

      if (!validSportKeys.includes(sportKey)) {
        return res.status(400).json({ error: "Invalid sport key" });
      }

      const apiKey = process.env.ODDS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Odds API key not configured" });
      }

      const response = await fetch(
        `https://api.the-odds-api.com/v4/sports/${sportKey}/odds?apiKey=${apiKey}&regions=us&markets=spreads,totals&oddsFormat=american`
      );

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch games from Odds API" });
      }

      const oddsData = await response.json();

      await storage.deleteGamesByWeekAndSport(weekId, sportKey);

      const createdGames = [];
      for (const game of oddsData) {
        let homeSpread = null;
        let awaySpread = null;
        let overUnder = null;

        if (game.bookmakers && game.bookmakers.length > 0) {
          const bookmaker = game.bookmakers[0];
          const spreadsMarket = bookmaker.markets?.find((m: any) => m.key === "spreads");
          const totalsMarket = bookmaker.markets?.find((m: any) => m.key === "totals");

          if (spreadsMarket) {
            const homeOutcome = spreadsMarket.outcomes.find((o: any) => o.name === game.home_team);
            const awayOutcome = spreadsMarket.outcomes.find((o: any) => o.name === game.away_team);
            if (homeOutcome) homeSpread = `${homeOutcome.point > 0 ? '+' : ''}${homeOutcome.point}`;
            if (awayOutcome) awaySpread = `${awayOutcome.point > 0 ? '+' : ''}${awayOutcome.point}`;
          }

          if (totalsMarket) {
            const overOutcome = totalsMarket.outcomes.find((o: any) => o.name === "Over");
            if (overOutcome) overUnder = `${overOutcome.point}`;
          }
        }

        const createdGame = await storage.createGame({
          id: game.id,
          weekId,
          sportKey: game.sport_key,
          commenceTime: new Date(game.commence_time),
          homeTeam: game.home_team,
          awayTeam: game.away_team,
          homeSpread,
          awaySpread,
          overUnder,
        });
        createdGames.push(createdGame);
      }

      const sportLabels: Record<string, string> = {
        "americanfootball_ncaaf": "College Football",
        "americanfootball_nfl": "NFL",
        "baseball_mlb": "MLB",
        "basketball_ncaab": "Men's College Basketball",
        "basketball_nba": "NBA",
      };

      res.json({ 
        success: true, 
        count: createdGames.length,
        sport: sportLabels[sportKey] || sportKey,
        games: createdGames,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch and store games" });
    }
  });

  app.post("/api/admin/verify", async (req, res) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminPassword) {
        return res.status(500).json({ error: "Admin password not configured" });
      }

      if (password === adminPassword) {
        req.session.isAdminAuthenticated = true;
        res.json({ success: true });
      } else {
        res.status(401).json({ error: "Incorrect password" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to verify password" });
    }
  });

  app.get("/api/admin/status", async (req, res) => {
    try {
      const isAuthenticated = req.session.isAdminAuthenticated === true;
      res.json({ isAuthenticated });
    } catch (error) {
      res.status(500).json({ error: "Failed to check auth status" });
    }
  });

  app.post("/api/admin/logout", async (req, res) => {
    try {
      req.session.isAdminAuthenticated = false;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  return httpServer;
}
