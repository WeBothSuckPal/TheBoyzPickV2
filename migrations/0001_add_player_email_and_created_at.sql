-- Migration: add email + created_at to players table
-- email is nullable so existing rows keep NULL (unique constraint allows multiple NULLs in Postgres)
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "email" text;
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'players_email_unique' AND conrelid = 'players'::regclass
  ) THEN
    ALTER TABLE "players" ADD CONSTRAINT "players_email_unique" UNIQUE("email");
  END IF;
END $$;
