import { sql } from "drizzle-orm";
import { db } from "./db";
import { log } from "./logger";

/**
 * Idempotent bootstrap — creates all tables if missing and adds any columns
 * that existing DBs might lack. Safe to run on every startup.
 */
export async function applyMigrations() {
  try {
    // ── Create tables (IF NOT EXISTS = safe no-op on existing DBs) ──────────

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "players" (
        "id"         varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name"       text    NOT NULL,
        "email"      text,
        "password"   text    NOT NULL DEFAULT '',
        "chips"      integer NOT NULL DEFAULT 1000,
        "avatar"     text    NOT NULL DEFAULT 'dollar',
        "is_admin"   boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "players_name_unique" UNIQUE("name")
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "weeks" (
        "id"          varchar   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "week_number" integer   NOT NULL,
        "is_active"   boolean   NOT NULL DEFAULT true,
        "created_at"  timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "picks" (
        "id"        varchar   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "week_id"   varchar   NOT NULL,
        "player_id" varchar   NOT NULL,
        "pick_type" text      NOT NULL,
        "pick"      text      NOT NULL,
        "game_id"   varchar,
        "sport_key" text,
        "chips"     integer   NOT NULL,
        "status"    text      NOT NULL DEFAULT 'pending',
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "fades" (
        "id"             varchar   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "week_id"        varchar   NOT NULL,
        "player_id"      varchar   NOT NULL,
        "target_pick_id" varchar   NOT NULL,
        "created_at"     timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id"         varchar   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "player_id"  varchar   NOT NULL,
        "message"    text      NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "games" (
        "id"           varchar   PRIMARY KEY NOT NULL,
        "week_id"      varchar   NOT NULL,
        "sport_key"    text      NOT NULL DEFAULT 'americanfootball_ncaaf',
        "commence_time" timestamp NOT NULL,
        "home_team"    text      NOT NULL,
        "away_team"    text      NOT NULL,
        "home_spread"  text,
        "away_spread"  text,
        "over_under"   text,
        "created_at"   timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "chip_transactions" (
        "id"         varchar   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "player_id"  varchar   NOT NULL,
        "amount"     integer   NOT NULL,
        "reason"     text      NOT NULL,
        "week_id"    varchar,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid"    varchar   NOT NULL COLLATE "default",
        "sess"   json      NOT NULL,
        "expire" timestamp NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )
    `);

    // ── Add missing columns to existing DBs (IF NOT EXISTS = safe no-op) ────

    await db.execute(sql`ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "email"      text`);
    await db.execute(sql`ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "password"   text NOT NULL DEFAULT ''`);
    await db.execute(sql`ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "is_admin"   boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now()`);
    await db.execute(sql`ALTER TABLE "picks"   ADD COLUMN IF NOT EXISTS "sport_key"  text`);
    await db.execute(sql`ALTER TABLE "picks"   ADD COLUMN IF NOT EXISTS "game_id"    varchar`);

    // ── Unique constraint on email ───────────────────────────────────────────
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'players_email_unique'
            AND conrelid = 'players'::regclass
        ) THEN
          ALTER TABLE "players" ADD CONSTRAINT "players_email_unique" UNIQUE("email");
        END IF;
      END $$
    `);

    // ── Mark Carter as admin ─────────────────────────────────────────────────
    await db.execute(sql`UPDATE "players" SET "is_admin" = true WHERE "name" = 'Carter'`);

    log("Database migrations applied successfully.");
  } catch (error) {
    console.error("Migration error:", error);
    throw error; // Re-throw so the caller knows something is broken
  }
}
