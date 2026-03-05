import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  password: text("password").notNull(),
  chips: integer("chips").notNull().default(1000),
  avatar: text("avatar").notNull(),
});

export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

export const weeks = pgTable("weeks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekNumber: integer("week_number").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWeekSchema = createInsertSchema(weeks).omit({ id: true, createdAt: true });
export type InsertWeek = z.infer<typeof insertWeekSchema>;
export type Week = typeof weeks.$inferSelect;

export const picks = pgTable("picks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekId: varchar("week_id").notNull(),
  playerId: varchar("player_id").notNull(),
  pickType: text("pick_type").notNull(),
  pick: text("pick").notNull(),
  gameId: varchar("game_id"),
  sportKey: text("sport_key"),
  chips: integer("chips").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPickSchema = createInsertSchema(picks).omit({ id: true, createdAt: true, status: true });
export type InsertPick = z.infer<typeof insertPickSchema>;
export type Pick = typeof picks.$inferSelect;

export const fades = pgTable("fades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekId: varchar("week_id").notNull(),
  playerId: varchar("player_id").notNull(),
  targetPickId: varchar("target_pick_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFadeSchema = createInsertSchema(fades).omit({ id: true, createdAt: true });
export type InsertFade = z.infer<typeof insertFadeSchema>;
export type Fade = typeof fades.$inferSelect;

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export const chipTransactions = pgTable("chip_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  weekId: varchar("week_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChipTransactionSchema = createInsertSchema(chipTransactions).omit({ id: true, createdAt: true });
export type InsertChipTransaction = z.infer<typeof insertChipTransactionSchema>;
export type ChipTransaction = typeof chipTransactions.$inferSelect;

export const games = pgTable("games", {
  id: varchar("id").primaryKey(),
  weekId: varchar("week_id").notNull(),
  sportKey: text("sport_key").notNull().default("americanfootball_ncaaf"),
  commenceTime: timestamp("commence_time").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  homeSpread: text("home_spread"),
  awaySpread: text("away_spread"),
  overUnder: text("over_under"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGameSchema = createInsertSchema(games).omit({ createdAt: true });
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
