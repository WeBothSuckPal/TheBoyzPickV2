import { sql } from "drizzle-orm";
import { db } from "./db";
import { log } from "./logger";

/**
 * Runs idempotent ALTER TABLE statements on every server startup.
 * All statements use IF NOT EXISTS / IF NOT CONSTRAINT so they are safe
 * to run repeatedly whether or not the columns already exist.
 */
export async function applyMigrations() {
  try {
    // 0001 — add email + created_at to players
    await db.execute(
      sql`ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "email" text`
    );
    await db.execute(
      sql`ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL`
    );
    // unique constraint on email (safe no-op if already present)
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

    // 0002 — add is_admin flag, mark Carter as owner
    await db.execute(
      sql`ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT false NOT NULL`
    );
    await db.execute(
      sql`UPDATE "players" SET "is_admin" = true WHERE "name" = 'Carter'`
    );

    log("Database migrations applied successfully.");
  } catch (error) {
    // Non-fatal — log and continue. Server will still start.
    console.error("Migration warning (non-fatal):", error);
  }
}
