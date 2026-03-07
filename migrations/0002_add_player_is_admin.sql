-- Migration: add is_admin flag to players table
-- Defaults to false for all existing players, then marks Carter as owner
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "players" SET "is_admin" = true WHERE "name" = 'Carter';
