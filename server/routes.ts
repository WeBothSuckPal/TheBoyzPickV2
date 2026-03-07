import type { Express } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import {
  insertPickSchema,
  insertFadeSchema,
  insertChatMessageSchema,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { fetchGamesForAllSports } from "./cronJobs";

// ── Rate limiters ────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts — please wait 15 minutes and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Too many accounts created from this IP — please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many admin login attempts — please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(
  app: Express,
  broadcast: (message: any) => void = () => {}
): Promise<void> {

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
  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      // Accept either { identifier, password } (new) or { name, password } (legacy)
      const { identifier, name, password } = req.body;
      const login = (identifier || name || "").trim();

      if (!login || !password) {
        return res.status(400).json({ error: "Email/username and password are required" });
      }

      // Try by email first, then fall back to username
      const isEmail = login.includes("@");
      let player = isEmail
        ? await storage.getPlayerByEmail(login)
        : await storage.getPlayerByName(login);

      // If email lookup found nothing, also try as username (user typed email-like username)
      if (!player && isEmail) {
        player = await storage.getPlayerByName(login);
      }

      if (!player) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, player.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.playerId = player.id;
      req.session.playerName = player.name;

      if (player.isAdmin) {
        req.session.isAdminAuthenticated = true;
      }

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error on login:", saveErr);
          return res.status(500).json({ error: "Login failed: could not establish session" });
        }
        res.json({
          success: true,
          player: {
            id: player.id,
            name: player.name,
            chips: player.chips,
            avatar: player.avatar,
            isAdmin: player.isAdmin,
          },
        });
      });
    } catch (error: any) {
      console.error("Login error:", error?.message ?? error);
      res.status(500).json({ error: error?.message ?? "Failed to login" });
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
          isAdmin: player.isAdmin,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check auth status" });
    }
  });

  app.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // --- Field presence ---
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Username, email, and password are required" });
      }

      // --- Username rules (like Discord / Reddit) ---
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        return res.status(400).json({ error: "Username must be at least 2 characters" });
      }
      if (trimmedName.length > 30) {
        return res.status(400).json({ error: "Username must be 30 characters or fewer" });
      }

      // --- Email format (like every major platform) ---
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const trimmedEmail = email.trim().toLowerCase();
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }

      // --- Password strength (DraftKings / ESPN minimum: 8 chars) ---
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      // --- Uniqueness checks ---
      const existingByName = await storage.getPlayerByName(trimmedName);
      if (existingByName) {
        return res.status(409).json({ error: "Username already taken" });
      }

      const existingByEmail = await storage.getPlayerByEmail(trimmedEmail);
      if (existingByEmail) {
        return res.status(409).json({ error: "An account with that email already exists" });
      }

      const avatars = ["dollar", "brain", "crystal", "mirror", "fire", "star"];
      const avatar = avatars[Math.floor(Math.random() * avatars.length)];
      const hashedPassword = await bcrypt.hash(password, 10);

      const newPlayer = await storage.createPlayer({
        name: trimmedName,
        email: trimmedEmail,
        password: hashedPassword,
        avatar,
        chips: 1000,
      });

      req.session.playerId = newPlayer.id;
      req.session.playerName = newPlayer.name;

      // Explicitly save the session before responding — in Vercel's serverless
      // environment the function can be torn down right after res.end(), which
      // means an implicit (post-response) session save may never complete.
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error on register:", saveErr);
          return res.status(500).json({ error: "Account created but session could not be established. Please log in." });
        }
        res.status(201).json({
          success: true,
          player: {
            id: newPlayer.id,
            name: newPlayer.name,
            chips: newPlayer.chips,
            avatar: newPlayer.avatar,
          },
        });
      });
    } catch (error: any) {
      console.error("Register error:", error?.message ?? error);
      res.status(500).json({ error: error?.message ?? "Failed to create account" });
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

  // ── Weekly Recap: per-player stats + grade for a given week ─────────────
  app.get("/api/weeks/:weekId/recap", async (req, res) => {
    try {
      const { weekId } = req.params;
      const picks = await storage.getPicks(weekId);
      const players = await storage.getPlayers();

      // Only include players who submitted at least one pick
      const playerMap = new Map(players.map((p) => [p.id, p]));
      const byPlayer: Record<string, {
        playerId: string; playerName: string; avatar: string;
        wins: number; losses: number; pending: number;
        chipDelta: number;
        bestPick: { pick: string; chips: number; pickType: string } | null;
        worstPick: { pick: string; chips: number; pickType: string } | null;
      }> = {};

      for (const pick of picks) {
        const player = playerMap.get(pick.playerId);
        if (!player) continue;
        if (!byPlayer[pick.playerId]) {
          byPlayer[pick.playerId] = {
            playerId: pick.playerId,
            playerName: player.name,
            avatar: player.avatar,
            wins: 0, losses: 0, pending: 0,
            chipDelta: 0,
            bestPick: null,
            worstPick: null,
          };
        }
        const entry = byPlayer[pick.playerId];
        if (pick.status === "win") {
          entry.wins++;
          entry.chipDelta += pick.chips;
          if (!entry.bestPick || pick.chips > entry.bestPick.chips) {
            entry.bestPick = { pick: pick.pick, chips: pick.chips, pickType: pick.pickType };
          }
        } else if (pick.status === "loss") {
          entry.losses++;
          entry.chipDelta -= pick.chips;
          if (!entry.worstPick || pick.chips > entry.worstPick.chips) {
            entry.worstPick = { pick: pick.pick, chips: pick.chips, pickType: pick.pickType };
          }
        } else {
          entry.pending++;
        }
      }

      const recap = Object.values(byPlayer).map((e) => ({
        ...e,
        grade: calcGrade(e.wins, e.losses, e.chipDelta),
      }));

      // Sort by chipDelta descending (best performers first)
      recap.sort((a, b) => b.chipDelta - a.chipDelta);
      res.json(recap);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate recap" });
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

      // C5 + Feature 6: Fix chip economy and record all transactions
      const activeWeekForTx = await storage.getActiveWeek();
      const txWeekId = activeWeekForTx?.id;

      if (status === "win") {
        let ownerGain = pick.chips;
        for (const fade of fades) {
          const fader = await storage.getPlayer(fade.playerId);
          if (fader) {
            ownerGain += pick.chips;
            await storage.updatePlayerChips(fader.id, fader.chips - pick.chips);
            await storage.createChipTransaction({
              playerId: fader.id, amount: -pick.chips,
              reason: `Fade lost on ${player.name}'s ${pick.pickType}: ${pick.pick}`,
              weekId: txWeekId,
            });
          }
        }
        await storage.updatePlayerChips(player.id, player.chips + ownerGain);
        await storage.createChipTransaction({
          playerId: player.id, amount: ownerGain,
          reason: `${pick.pickType} WIN: ${pick.pick}${fades.length > 0 ? ` (+${fades.length} fade${fades.length > 1 ? 's' : ''})` : ''}`,
          weekId: txWeekId,
        });
      } else {
        let ownerLoss = pick.chips;
        for (const fade of fades) {
          const fader = await storage.getPlayer(fade.playerId);
          if (fader) {
            ownerLoss += pick.chips;
            await storage.updatePlayerChips(fader.id, fader.chips + pick.chips);
            await storage.createChipTransaction({
              playerId: fader.id, amount: pick.chips,
              reason: `Fade WON on ${player.name}'s ${pick.pickType}: ${pick.pick}`,
              weekId: txWeekId,
            });
          }
        }
        await storage.updatePlayerChips(player.id, player.chips - ownerLoss);
        await storage.createChipTransaction({
          playerId: player.id, amount: -ownerLoss,
          reason: `${pick.pickType} LOSS: ${pick.pick}${fades.length > 0 ? ` (${fades.length} fade${fades.length > 1 ? 's' : ''} collected)` : ''}`,
          weekId: txWeekId,
        });
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

  app.post("/api/admin/verify", adminVerifyLimiter, async (req, res) => {
    try {
      const { password } = req.body;

      if (typeof password !== "string" || password.length === 0) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        return res.status(500).json({ error: "Admin password not configured" });
      }

      // bcrypt compare — timing-safe, works whether ADMIN_PASSWORD is stored
      // as a bcrypt hash OR as a plain-text env var (plain-text → compare fails
      // → fall through to plain-text equality as legacy fallback).
      let isValid = false;
      if (adminPassword.startsWith("$2")) {
        isValid = await bcrypt.compare(password, adminPassword);
      } else {
        isValid = password === adminPassword;
      }

      if (isValid) {
        req.session.isAdminAuthenticated = true;
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error on admin verify:", saveErr);
            return res.status(500).json({ error: "Failed to establish session" });
          }
          res.json({ success: true });
        });
      } else {
        console.warn(`[SECURITY] Failed admin login attempt from ${req.ip}`);
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

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  // Feature 1: Password change
  app.post("/api/auth/change-password", async (req, res) => {
    try {
      if (!req.session.playerId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Both passwords are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters" });
      }
      const player = await storage.getPlayer(req.session.playerId);
      if (!player) return res.status(404).json({ error: "Player not found" });
      const isValid = await bcrypt.compare(currentPassword, player.password);
      if (!isValid) return res.status(401).json({ error: "Current password is incorrect" });
      const hashed = await bcrypt.hash(newPassword, 10);
      await storage.updatePlayerPassword(player.id, hashed);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to change password" });
    }
  });

  // Feature 3: List all weeks for season history
  app.get("/api/weeks", async (_req, res) => {
    try {
      const weeks = await storage.getWeeks();
      res.json(weeks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch weeks" });
    }
  });

  // Feature 6: Chip transaction history — own data only (or admin)
  app.get("/api/players/:playerId/transactions", async (req, res) => {
    try {
      if (!req.session.playerId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { playerId } = req.params;
      if (req.session.playerId !== playerId && !req.session.isAdminAuthenticated) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const transactions = await storage.getChipTransactions(playerId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Feature 7: Auto-resolve picks using The Odds API scores
  app.post("/api/admin/auto-resolve", async (req, res) => {
    try {
      if (!req.session.isAdminAuthenticated) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      const { weekId, sportKey } = req.body;
      if (!weekId || !sportKey) {
        return res.status(400).json({ error: "weekId and sportKey are required" });
      }
      const apiKey = process.env.ODDS_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Odds API key not configured" });

      const scoresRes = await fetch(
        `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?apiKey=${apiKey}&daysFrom=3`
      );
      if (!scoresRes.ok) {
        return res.status(scoresRes.status).json({ error: "Failed to fetch scores from Odds API" });
      }
      const scoresData: any[] = await scoresRes.json();
      const completedGames = new Map(
        scoresData.filter(g => g.completed && g.scores?.length >= 2).map(g => [g.id, g])
      );

      const picks = await storage.getPicks(weekId);
      const pendingPicks = picks.filter(p => p.status === "pending" && p.gameId);

      let resolved = 0;
      let skipped = 0;

      for (const pick of pendingPicks) {
        const game = completedGames.get(pick.gameId!);
        if (!game) { skipped++; continue; }

        const homeScore = parseInt(game.scores.find((s: any) => s.name === game.home_team)?.score ?? "-1");
        const awayScore = parseInt(game.scores.find((s: any) => s.name === game.away_team)?.score ?? "-1");
        if (homeScore < 0 || awayScore < 0) { skipped++; continue; }

        const outcome = determinePickOutcome(pick.pick, game.home_team, game.away_team, homeScore, awayScore);
        if (!outcome) { skipped++; continue; }

        const updatedPick = await storage.updatePickStatus(pick.id, outcome);
        if (!updatedPick) continue;

        const fades = await storage.getFadesForPick(pick.id);
        const player = await storage.getPlayer(pick.playerId);
        if (!player) continue;

        if (outcome === "win") {
          let ownerGain = pick.chips;
          for (const fade of fades) {
            const fader = await storage.getPlayer(fade.playerId);
            if (fader) {
              ownerGain += pick.chips;
              await storage.updatePlayerChips(fader.id, fader.chips - pick.chips);
              await storage.createChipTransaction({
                playerId: fader.id,
                amount: -pick.chips,
                reason: `Fade lost on ${player.name}'s ${pick.pickType}: ${pick.pick}`,
                weekId,
              });
            }
          }
          await storage.updatePlayerChips(player.id, player.chips + ownerGain);
          await storage.createChipTransaction({
            playerId: player.id,
            amount: ownerGain,
            reason: `${pick.pickType} WIN: ${pick.pick}${fades.length > 0 ? ` (+${fades.length} fade${fades.length > 1 ? 's' : ''})` : ''}`,
            weekId,
          });
        } else {
          let ownerLoss = pick.chips;
          for (const fade of fades) {
            const fader = await storage.getPlayer(fade.playerId);
            if (fader) {
              ownerLoss += pick.chips;
              await storage.updatePlayerChips(fader.id, fader.chips + pick.chips);
              await storage.createChipTransaction({
                playerId: fader.id,
                amount: pick.chips,
                reason: `Fade WON on ${player.name}'s ${pick.pickType}: ${pick.pick}`,
                weekId,
              });
            }
          }
          await storage.updatePlayerChips(player.id, player.chips - ownerLoss);
          await storage.createChipTransaction({
            playerId: player.id,
            amount: -ownerLoss,
            reason: `${pick.pickType} LOSS: ${pick.pick}${fades.length > 0 ? ` (${fades.length} fade${fades.length > 1 ? 's' : ''} collected)` : ''}`,
            weekId,
          });
        }

        broadcast({ type: "pick_resolved", data: { pickId: pick.id, status: outcome } });
        resolved++;
      }

      res.json({ success: true, resolved, skipped });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to auto-resolve" });
    }
  });

  // ── Owner: full player roster with emails ─────────────────────────────
  app.get("/api/admin/players", async (req, res) => {
    try {
      if (!req.session.isAdminAuthenticated) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      const players = await storage.getPlayers();
      res.json(players.map(({ password, ...p }) => p));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  // ── Owner: adjust chips for a player ──────────────────────────────────
  app.post("/api/admin/players/:id/chips", async (req, res) => {
    try {
      if (!req.session.isAdminAuthenticated) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      const { id } = req.params;
      const { amount, reason } = req.body;
      if (typeof amount !== "number") {
        return res.status(400).json({ error: "amount must be a number" });
      }
      const player = await storage.getPlayer(id);
      if (!player) return res.status(404).json({ error: "Player not found" });

      const newChips = player.chips + amount;
      const updated = await storage.updatePlayerChips(id, newChips);
      await storage.createChipTransaction({
        playerId: id,
        amount,
        reason: reason || (amount >= 0 ? "Admin adjustment (added)" : "Admin adjustment (deducted)"),
        weekId: null,
      });
      res.json({ success: true, player: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to adjust chips" });
    }
  });

  // ── Owner: remove a player ─────────────────────────────────────────────
  app.delete("/api/admin/players/:id", async (req, res) => {
    try {
      if (!req.session.isAdminAuthenticated) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      const { id } = req.params;
      const player = await storage.getPlayer(id);
      if (!player) return res.status(404).json({ error: "Player not found" });
      if (player.isAdmin) {
        return res.status(403).json({ error: "Cannot remove an admin account" });
      }
      await storage.deletePlayer(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove player" });
    }
  });

  // ── Owner: get all weeks ───────────────────────────────────────────────
  app.get("/api/admin/weeks", async (req, res) => {
    try {
      if (!req.session.isAdminAuthenticated) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      const weeks = await storage.getWeeks();
      res.json(weeks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch weeks" });
    }
  });

  // ── Owner: create a new week ───────────────────────────────────────────
  app.post("/api/admin/weeks", async (req, res) => {
    try {
      if (!req.session.isAdminAuthenticated) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      const { weekNumber } = req.body;
      if (!weekNumber || typeof weekNumber !== "number") {
        return res.status(400).json({ error: "weekNumber is required" });
      }
      const week = await storage.createWeek({ weekNumber, isActive: false });
      res.status(201).json(week);
    } catch (error) {
      res.status(500).json({ error: "Failed to create week" });
    }
  });

  // ── Owner: set a week as active ────────────────────────────────────────
  app.post("/api/admin/weeks/:id/activate", async (req, res) => {
    try {
      if (!req.session.isAdminAuthenticated) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      const { id } = req.params;
      await storage.setActiveWeek(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to set active week" });
    }
  });

  // Vercel Cron endpoint — triggers daily game fetch
  app.post("/api/cron/fetch-games", async (req, res) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return res.status(500).json({ error: "CRON_SECRET not configured" });
    }
    const authHeader = req.headers["authorization"];
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      await fetchGamesForAllSports();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });
}

// Feature 7: Parse pick text and determine win/loss from final scores
function determinePickOutcome(
  pickText: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): "win" | "loss" | null {
  // Total pick: "Over X" or "Under X"
  const totalMatch = pickText.match(/^(Over|Under)\s+([\d.]+)$/i);
  if (totalMatch) {
    const direction = totalMatch[1].toLowerCase();
    const total = parseFloat(totalMatch[2]);
    const actualTotal = homeScore + awayScore;
    if (actualTotal === total) return null; // push
    return (direction === "over" ? actualTotal > total : actualTotal < total) ? "win" : "loss";
  }

  // Spread pick: "Team Name +/-X.X"
  const spreadMatch = pickText.match(/^(.+?)\s+([+-][\d.]+)$/);
  if (spreadMatch) {
    const team = spreadMatch[1].trim();
    const spread = parseFloat(spreadMatch[2]);
    const isHome = team === homeTeam;
    const isAway = team === awayTeam;
    if (!isHome && !isAway) return null;
    const adjustedMargin = isHome
      ? (homeScore + spread) - awayScore
      : (awayScore + spread) - homeScore;
    if (adjustedMargin === 0) return null; // push
    return adjustedMargin > 0 ? "win" : "loss";
  }

  return null;
}

// ── Grade calculation for weekly recap ────────────────────────────────────
function calcGrade(wins: number, losses: number, chipDelta: number): string {
  const total = wins + losses;
  if (total === 0) return "N/A";
  const rate = wins / total;
  // Base grade from win rate
  let base: string;
  if (rate === 1.0)        base = "A+";
  else if (rate >= 0.75)   base = "A";
  else if (rate >= 0.60)   base = "B+";
  else if (rate >= 0.50)   base = "B";
  else if (rate >= 0.34)   base = "C";
  else if (rate > 0)       base = "D";
  else                     base = "F";
  // Chip delta bump: if you won big on a tough record, give a +
  if (base !== "A+" && chipDelta > 0 && base === "C") base = "C+";
  if (base !== "A+" && chipDelta > 500 && base === "B") base = "B+";
  return base;
}
