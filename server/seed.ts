import { db } from "./db";
import { players, type InsertPlayer } from "@shared/schema";
import { log } from "./vite";
import { getCurrentWeek, formatWeekDisplay } from "./weekUtils";
import bcrypt from "bcryptjs";

// Default password for all players: "password"
// Players can change this after first login
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("password", 10);

const DEFAULT_PLAYERS: InsertPlayer[] = [
  { name: "Carter", password: DEFAULT_PASSWORD_HASH, chips: 1000, avatar: "dollar" },
  { name: "Chub", password: DEFAULT_PASSWORD_HASH, chips: 1000, avatar: "brain" },
  { name: "Perky", password: DEFAULT_PASSWORD_HASH, chips: 1000, avatar: "crystal" },
  { name: "Jerry Fader", password: DEFAULT_PASSWORD_HASH, chips: 1000, avatar: "mirror" },
];

export async function seedDatabase() {
  try {
    // Check if players already exist
    const existingPlayers = await db.select().from(players);
    
    if (existingPlayers.length === 0) {
      log("Seeding database with default players...");
      
      // Insert all default players
      for (const player of DEFAULT_PLAYERS) {
        await db.insert(players).values(player);
      }
      
      log("Database seeding complete! Added 4 players.");
    } else {
      log(`Database already contains ${existingPlayers.length} players. Skipping seed.`);
    }
    
    // Ensure current week exists (auto-create if needed)
    const currentWeek = await getCurrentWeek();
    log(`Current week: ${formatWeekDisplay(currentWeek.weekNumber)}`);
  } catch (error) {
    console.error("Error seeding database:", error);
    // Don't throw - we want the server to start even if seeding fails
  }
}
