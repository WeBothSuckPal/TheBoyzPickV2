import {
  type Player,
  type InsertPlayer,
  type Week,
  type InsertWeek,
  type Pick,
  type InsertPick,
  type Fade,
  type InsertFade,
  type ChatMessage,
  type InsertChatMessage,
  type Game,
  type InsertGame,
  type ChipTransaction,
  type InsertChipTransaction,
  players as playersTable,
  weeks as weeksTable,
  picks as picksTable,
  fades as fadesTable,
  chatMessages as chatMessagesTable,
  games as gamesTable,
  chipTransactions as chipTransactionsTable,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, inArray, desc } from "drizzle-orm";
import { getCurrentWeek } from "./weekUtils";
import bcrypt from "bcryptjs";

// Default password hash for in-memory dev players
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("password", 10);

export interface IStorage {
  getPlayers(): Promise<Player[]>;
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayerByName(name: string): Promise<Player | undefined>;
  getPlayerByEmail(email: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayerChips(playerId: string, chips: number): Promise<Player | undefined>;
  updatePlayerPassword(playerId: string, hashedPassword: string): Promise<Player | undefined>;
  deletePlayer(playerId: string): Promise<void>;

  getWeeks(): Promise<Week[]>;
  getActiveWeek(): Promise<Week | undefined>;
  createWeek(week: InsertWeek): Promise<Week>;
  setActiveWeek(weekId: string): Promise<void>;

  getPicks(weekId: string): Promise<Pick[]>;
  getPicksByPlayer(weekId: string, playerId: string): Promise<Pick[]>;
  createPick(pick: InsertPick): Promise<Pick>;
  updatePickStatus(pickId: string, status: "pending" | "win" | "loss"): Promise<Pick | undefined>;

  getFades(weekId: string): Promise<Fade[]>;
  getFadesByPlayer(weekId: string, playerId: string): Promise<Fade[]>;
  getFadesForPick(pickId: string): Promise<Fade[]>;
  createFade(fade: InsertFade): Promise<Fade>;

  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  getGames(weekId: string): Promise<Game[]>;
  getGame(id: string): Promise<Game | undefined>;
  getGamesByIds(ids: string[]): Promise<Game[]>;
  createGame(game: InsertGame): Promise<Game>;
  deleteGamesByWeek(weekId: string): Promise<void>;
  deleteGamesByWeekAndSport(weekId: string, sportKey: string): Promise<void>;

  getChipTransactions(playerId: string): Promise<ChipTransaction[]>;
  createChipTransaction(tx: InsertChipTransaction): Promise<ChipTransaction>;
}

export class MemStorage implements IStorage {
  private players: Map<string, Player>;
  private weeks: Map<string, Week>;
  private picks: Map<string, Pick>;
  private fades: Map<string, Fade>;
  private chatMessages: Map<string, ChatMessage>;
  private games: Map<string, Game>;
  private chipTransactions: Map<string, ChipTransaction>;

  constructor() {
    this.players = new Map();
    this.weeks = new Map();
    this.picks = new Map();
    this.fades = new Map();
    this.chatMessages = new Map();
    this.games = new Map();
    this.chipTransactions = new Map();

    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    const defaultPlayers: InsertPlayer[] = [
      { name: "Carter", password: DEFAULT_PASSWORD_HASH, chips: 1000, avatar: "dollar" },
      { name: "Chub", password: DEFAULT_PASSWORD_HASH, chips: 1000, avatar: "brain" },
      { name: "Perky", password: DEFAULT_PASSWORD_HASH, chips: 1000, avatar: "crystal" },
      { name: "Jerry Fader", password: DEFAULT_PASSWORD_HASH, chips: 1000, avatar: "mirror" },
    ];

    defaultPlayers.forEach((p) => {
      const id = randomUUID();
      const player: Player = {
        id,
        name: p.name,
        email: p.email ?? null,
        password: p.password,
        avatar: p.avatar,
        chips: p.chips ?? 1000,
        isAdmin: false,
        createdAt: new Date(),
      };
      this.players.set(id, player);
    });

    const weekId = randomUUID();
    const week: Week = {
      id: weekId,
      weekNumber: 9,
      isActive: true,
      createdAt: new Date(),
    };
    this.weeks.set(weekId, week);
  }

  async getPlayers(): Promise<Player[]> {
    return Array.from(this.players.values()).sort((a, b) => b.chips - a.chips);
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayerByName(name: string): Promise<Player | undefined> {
    return Array.from(this.players.values()).find((p) => p.name === name);
  }

  async getPlayerByEmail(email: string): Promise<Player | undefined> {
    return Array.from(this.players.values()).find(
      (p) => p.email?.toLowerCase() === email.toLowerCase()
    );
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = randomUUID();
    const player: Player = {
      id,
      name: insertPlayer.name,
      email: insertPlayer.email ?? null,
      password: insertPlayer.password,
      avatar: insertPlayer.avatar,
      chips: insertPlayer.chips ?? 1000,
      isAdmin: false,
      createdAt: new Date(),
    };
    this.players.set(id, player);
    return player;
  }

  async deletePlayer(playerId: string): Promise<void> {
    this.players.delete(playerId);
  }

  async updatePlayerChips(playerId: string, chips: number): Promise<Player | undefined> {
    const player = this.players.get(playerId);
    if (!player) return undefined;
    player.chips = chips;
    this.players.set(playerId, player);
    return player;
  }

  async updatePlayerPassword(playerId: string, hashedPassword: string): Promise<Player | undefined> {
    const player = this.players.get(playerId);
    if (!player) return undefined;
    player.password = hashedPassword;
    this.players.set(playerId, player);
    return player;
  }

  async getWeeks(): Promise<Week[]> {
    return Array.from(this.weeks.values()).sort(
      (a, b) => b.weekNumber - a.weekNumber
    );
  }

  async getActiveWeek(): Promise<Week | undefined> {
    return Array.from(this.weeks.values()).find((w) => w.isActive);
  }

  async createWeek(insertWeek: InsertWeek): Promise<Week> {
    const id = randomUUID();
    const week: Week = {
      id,
      weekNumber: insertWeek.weekNumber,
      isActive: insertWeek.isActive ?? true,
      createdAt: new Date(),
    };
    this.weeks.set(id, week);
    return week;
  }

  async setActiveWeek(weekId: string): Promise<void> {
    Array.from(this.weeks.values()).forEach((w) => {
      w.isActive = w.id === weekId;
      this.weeks.set(w.id, w);
    });
  }

  async getPicks(weekId: string): Promise<Pick[]> {
    return Array.from(this.picks.values())
      .filter((p) => p.weekId === weekId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getPicksByPlayer(weekId: string, playerId: string): Promise<Pick[]> {
    return Array.from(this.picks.values())
      .filter((p) => p.weekId === weekId && p.playerId === playerId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createPick(insertPick: InsertPick): Promise<Pick> {
    const id = randomUUID();
    const pick: Pick = {
      id,
      ...insertPick,
      sportKey: insertPick.sportKey ?? null,
      gameId: insertPick.gameId ?? null,
      status: "pending",
      createdAt: new Date(),
    };
    this.picks.set(id, pick);
    return pick;
  }

  async updatePickStatus(
    pickId: string,
    status: "pending" | "win" | "loss"
  ): Promise<Pick | undefined> {
    const pick = this.picks.get(pickId);
    if (!pick) return undefined;
    pick.status = status;
    this.picks.set(pickId, pick);
    return pick;
  }

  async getFades(weekId: string): Promise<Fade[]> {
    return Array.from(this.fades.values()).filter((f) => f.weekId === weekId);
  }

  async getFadesByPlayer(weekId: string, playerId: string): Promise<Fade[]> {
    return Array.from(this.fades.values()).filter(
      (f) => f.weekId === weekId && f.playerId === playerId
    );
  }

  async getFadesForPick(pickId: string): Promise<Fade[]> {
    return Array.from(this.fades.values()).filter(
      (f) => f.targetPickId === pickId
    );
  }

  async createFade(insertFade: InsertFade): Promise<Fade> {
    const id = randomUUID();
    const fade: Fade = {
      id,
      ...insertFade,
      createdAt: new Date(),
    };
    this.fades.set(id, fade);
    return fade;
  }

  async getChatMessages(limit: number = 100): Promise<ChatMessage[]> {
    const messages = Array.from(this.chatMessages.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    return messages.slice(-limit);
  }

  async createChatMessage(
    insertMessage: InsertChatMessage
  ): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      id,
      ...insertMessage,
      createdAt: new Date(),
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async getGames(weekId: string): Promise<Game[]> {
    return Array.from(this.games.values())
      .filter((g) => g.weekId === weekId)
      .sort((a, b) => a.commenceTime.getTime() - b.commenceTime.getTime());
  }

  async getGame(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getGamesByIds(ids: string[]): Promise<Game[]> {
    return ids.map(id => this.games.get(id)).filter((g): g is Game => g !== undefined);
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const game: Game = {
      id: insertGame.id,
      weekId: insertGame.weekId,
      sportKey: insertGame.sportKey ?? "americanfootball_ncaaf",
      commenceTime: insertGame.commenceTime,
      homeTeam: insertGame.homeTeam,
      awayTeam: insertGame.awayTeam,
      homeSpread: insertGame.homeSpread ?? null,
      awaySpread: insertGame.awaySpread ?? null,
      overUnder: insertGame.overUnder ?? null,
      createdAt: new Date(),
    };
    this.games.set(insertGame.id, game);
    return game;
  }

  async deleteGamesByWeek(weekId: string): Promise<void> {
    const gameIds = Array.from(this.games.values())
      .filter((g) => g.weekId === weekId)
      .map((g) => g.id);
    gameIds.forEach((id) => this.games.delete(id));
  }

  async deleteGamesByWeekAndSport(weekId: string, sportKey: string): Promise<void> {
    const gameIds = Array.from(this.games.values())
      .filter((g) => g.weekId === weekId && g.sportKey === sportKey)
      .map((g) => g.id);
    gameIds.forEach((id) => this.games.delete(id));
  }

  async getChipTransactions(playerId: string): Promise<ChipTransaction[]> {
    return Array.from(this.chipTransactions.values())
      .filter((t) => t.playerId === playerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createChipTransaction(tx: InsertChipTransaction): Promise<ChipTransaction> {
    const id = randomUUID();
    const transaction: ChipTransaction = { id, ...tx, weekId: tx.weekId ?? null, createdAt: new Date() };
    this.chipTransactions.set(id, transaction);
    return transaction;
  }
}

export class DbStorage implements IStorage {
  async getPlayers(): Promise<Player[]> {
    // H1: Sort descending so leaderboard shows highest chips first
    return await db.select().from(playersTable).orderBy(desc(playersTable.chips));
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    const results = await db.select().from(playersTable).where(eq(playersTable.id, id));
    return results[0];
  }

  async getPlayerByName(name: string): Promise<Player | undefined> {
    const results = await db.select().from(playersTable).where(eq(playersTable.name, name));
    return results[0];
  }

  async getPlayerByEmail(email: string): Promise<Player | undefined> {
    const results = await db.select().from(playersTable).where(eq(playersTable.email, email.toLowerCase()));
    return results[0];
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const results = await db.insert(playersTable).values(insertPlayer).returning();
    return results[0];
  }

  async updatePlayerChips(playerId: string, chips: number): Promise<Player | undefined> {
    const results = await db.update(playersTable)
      .set({ chips })
      .where(eq(playersTable.id, playerId))
      .returning();
    return results[0];
  }

  async updatePlayerPassword(playerId: string, hashedPassword: string): Promise<Player | undefined> {
    const results = await db.update(playersTable)
      .set({ password: hashedPassword })
      .where(eq(playersTable.id, playerId))
      .returning();
    return results[0];
  }

  async deletePlayer(playerId: string): Promise<void> {
    await db.delete(playersTable).where(eq(playersTable.id, playerId));
  }

  async getWeeks(): Promise<Week[]> {
    return await db.select().from(weeksTable);
  }

  async getActiveWeek(): Promise<Week | undefined> {
    // Auto-create and return the current week based on date
    return await getCurrentWeek();
  }

  async createWeek(week: InsertWeek): Promise<Week> {
    const results = await db.insert(weeksTable).values(week).returning();
    return results[0];
  }

  async setActiveWeek(weekId: string): Promise<void> {
    await db.update(weeksTable).set({ isActive: false });
    await db.update(weeksTable).set({ isActive: true }).where(eq(weeksTable.id, weekId));
  }

  async getPicks(weekId: string): Promise<Pick[]> {
    return await db.select().from(picksTable).where(eq(picksTable.weekId, weekId));
  }

  async getPicksByPlayer(weekId: string, playerId: string): Promise<Pick[]> {
    return await db.select().from(picksTable).where(
      and(eq(picksTable.weekId, weekId), eq(picksTable.playerId, playerId))
    );
  }

  async createPick(pick: InsertPick): Promise<Pick> {
    const results = await db.insert(picksTable).values(pick).returning();
    return results[0];
  }

  async updatePickStatus(pickId: string, status: "pending" | "win" | "loss"): Promise<Pick | undefined> {
    const results = await db.update(picksTable)
      .set({ status })
      .where(eq(picksTable.id, pickId))
      .returning();
    return results[0];
  }

  async getFades(weekId: string): Promise<Fade[]> {
    return await db.select().from(fadesTable).where(eq(fadesTable.weekId, weekId));
  }

  async getFadesByPlayer(weekId: string, playerId: string): Promise<Fade[]> {
    return await db.select().from(fadesTable).where(
      and(eq(fadesTable.weekId, weekId), eq(fadesTable.playerId, playerId))
    );
  }

  async getFadesForPick(pickId: string): Promise<Fade[]> {
    return await db.select().from(fadesTable).where(eq(fadesTable.targetPickId, pickId));
  }

  async createFade(fade: InsertFade): Promise<Fade> {
    const results = await db.insert(fadesTable).values(fade).returning();
    return results[0];
  }

  async getChatMessages(limit: number = 100): Promise<ChatMessage[]> {
    return await db.select().from(chatMessagesTable).orderBy(chatMessagesTable.createdAt).limit(limit);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const results = await db.insert(chatMessagesTable).values(message).returning();
    return results[0];
  }

  async getGames(weekId: string): Promise<Game[]> {
    return await db.select().from(gamesTable)
      .where(eq(gamesTable.weekId, weekId))
      .orderBy(gamesTable.commenceTime);
  }

  async getGame(id: string): Promise<Game | undefined> {
    const results = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
    return results[0];
  }

  async getGamesByIds(ids: string[]): Promise<Game[]> {
    if (ids.length === 0) return [];
    return await db.select().from(gamesTable).where(inArray(gamesTable.id, ids));
  }

  async createGame(game: InsertGame): Promise<Game> {
    const results = await db.insert(gamesTable).values(game).returning();
    return results[0];
  }

  async deleteGamesByWeek(weekId: string): Promise<void> {
    await db.delete(gamesTable).where(eq(gamesTable.weekId, weekId));
  }

  async deleteGamesByWeekAndSport(weekId: string, sportKey: string): Promise<void> {
    await db.delete(gamesTable).where(
      and(eq(gamesTable.weekId, weekId), eq(gamesTable.sportKey, sportKey))
    );
  }

  async getChipTransactions(playerId: string): Promise<ChipTransaction[]> {
    return await db.select()
      .from(chipTransactionsTable)
      .where(eq(chipTransactionsTable.playerId, playerId))
      .orderBy(desc(chipTransactionsTable.createdAt))
      .limit(50);
  }

  async createChipTransaction(tx: InsertChipTransaction): Promise<ChipTransaction> {
    const results = await db.insert(chipTransactionsTable).values(tx).returning();
    return results[0];
  }
}

export const storage = new DbStorage();
