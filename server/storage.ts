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
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getPlayers(): Promise<Player[]>;
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayerByName(name: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayerChips(playerId: string, chips: number): Promise<Player | undefined>;

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
}

export class MemStorage implements IStorage {
  private players: Map<string, Player>;
  private weeks: Map<string, Week>;
  private picks: Map<string, Pick>;
  private fades: Map<string, Fade>;
  private chatMessages: Map<string, ChatMessage>;

  constructor() {
    this.players = new Map();
    this.weeks = new Map();
    this.picks = new Map();
    this.fades = new Map();
    this.chatMessages = new Map();

    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    const defaultPlayers: InsertPlayer[] = [
      { name: "Money-Mike", chips: 1250, avatar: "dollar" },
      { name: "The Professor", chips: 1100, avatar: "brain" },
      { name: "Mr. Gut-Feeling", chips: 950, avatar: "crystal" },
      { name: "The Jinx", chips: 750, avatar: "mirror" },
    ];

    defaultPlayers.forEach((p) => {
      const id = randomUUID();
      const player: Player = { ...p, id };
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

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = randomUUID();
    const player: Player = { ...insertPlayer, id };
    this.players.set(id, player);
    return player;
  }

  async updatePlayerChips(playerId: string, chips: number): Promise<Player | undefined> {
    const player = this.players.get(playerId);
    if (!player) return undefined;
    player.chips = chips;
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
      ...insertWeek,
      id,
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
}

export const storage = new MemStorage();
