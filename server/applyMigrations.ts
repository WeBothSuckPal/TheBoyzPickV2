import { sql } from "drizzle-orm";
import { db } from "./db";
import { log } from "./logger";

/**
 * Idempotent bootstrap — creates all app tables if missing and adds any
 * columns that older DBs may lack. Safe to re-run on every startup.
 *
 * The session table is intentionally omitted — connect-pg-simple manages it
 * with createTableIfMissing:true and its own schema.
 */
export async function applyMigrations() {
  // ── Create tables ───────────────────────────────────────────────────────
  // Each statement is wrapped individually so one failure doesn't abort the rest.

  await exec(sql`
    CREATE TABLE IF NOT EXISTS "players" (
      "id"         varchar   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name"       text      NOT NULL,
      "email"      text,
      "password"   text      NOT NULL DEFAULT '',
      "chips"      integer   NOT NULL DEFAULT 1000,
      "avatar"     text      NOT NULL DEFAULT 'dollar',
      "is_admin"   boolean   NOT NULL DEFAULT false,
      "created_at" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "players_name_unique" UNIQUE("name")
    )
  `, "create players");

  await exec(sql`
    CREATE TABLE IF NOT EXISTS "weeks" (
      "id"          varchar   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "week_number" integer   NOT NULL,
      "is_active"   boolean   NOT NULL DEFAULT true,
      "created_at"  timestamp NOT NULL DEFAULT now()
    )
  `, "create weeks");

  await exec(sql`
    CREATE TABLE IF NOT EXISTS "picks" (
      "id"         varchar   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "week_id"    varchar   NOT NULL,
      "player_id"  varchar   NOT NULL,
      "pick_type"  text      NOT NULL,
      "pick"       text      NOT NULL,
      "game_id"    varchar,
      "sport_key"  text,
      "chips"      integer   NOT NULL,
      "status"     text      NOT NULL DEFAULT 'pending',
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `, "create picks");

  await exec(sql`
    CREATE TABLE IF NOT EXISTS "fades" (
      "id"             varchar   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "week_id"        varchar   NOT NULL,
      "player_id"      varchar   NOT NULL,
      "target_pick_id" varchar   NOT NULL,
      "created_at"     timestamp NOT NULL DEFAULT now()
    )
  `, "create fades");

  await exec(sql`
    CREATE TABLE IF NOT EXISTS "chat_messages" (
      "id"         varchar   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "player_id"  varchar   NOT NULL,
      "message"    text      NOT NULL,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `, "create chat_messages");

  await exec(sql`
    CREATE TABLE IF NOT EXISTS "games" (
      "id"            varchar   PRIMARY KEY NOT NULL,
      "week_id"       varchar   NOT NULL,
      "sport_key"     text      NOT NULL DEFAULT 'americanfootball_ncaaf',
      "commence_time" timestamp NOT NULL,
      "home_team"     text      NOT NULL,
      "away_team"     text      NOT NULL,
      "home_spread"   text,
      "away_spread"   text,
      "over_under"    text,
      "created_at"    timestamp NOT NULL DEFAULT now()
    )
  `, "create games");

  await exec(sql`
    CREATE TABLE IF NOT EXISTS "chip_transactions" (
      "id"         varchar   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "player_id"  varchar   NOT NULL,
      "amount"     integer   NOT NULL,
      "reason"     text      NOT NULL,
      "week_id"    varchar,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `, "create chip_transactions");

  // ── Add missing columns to existing DBs ────────────────────────────────
  await exec(sql`ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "email"      text`,                              "add players.email");
  await exec(sql`ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "password"   text NOT NULL DEFAULT ''`,          "add players.password");
  await exec(sql`ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "is_admin"   boolean NOT NULL DEFAULT false`,    "add players.is_admin");
  await exec(sql`ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now()`,  "add players.created_at");
  await exec(sql`ALTER TABLE "picks"   ADD COLUMN IF NOT EXISTS "sport_key"  text`,                              "add picks.sport_key");
  await exec(sql`ALTER TABLE "picks"   ADD COLUMN IF NOT EXISTS "game_id"    varchar`,                           "add picks.game_id");

  // ── Constraints ─────────────────────────────────────────────────────────
  await exec(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'players_email_unique'
          AND conrelid = 'players'::regclass
      ) THEN
        ALTER TABLE "players" ADD CONSTRAINT "players_email_unique" UNIQUE("email");
      END IF;
    END $$
  `, "players_email_unique constraint");

  // ── Seed admin flag ─────────────────────────────────────────────────────
  await exec(sql`UPDATE "players" SET "is_admin" = true WHERE "name" = 'Carter'`, "mark Carter admin");

  log("Database migrations applied successfully.");
}

/** Run one SQL statement, logging but not throwing on failure. */
async function exec(statement: Parameters<typeof db.execute>[0], label: string) {
  try {
    await db.execute(statement);
  } catch (err: any) {
    // Log every failure but keep going — a missing column is not fatal if
    // the table already has everything it needs.
    console.error(`Migration step failed (${label}):`, err?.message ?? err);
  }
}
