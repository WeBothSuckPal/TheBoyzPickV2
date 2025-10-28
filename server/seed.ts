import { db } from "./db";
import { players, type InsertPlayer } from "@shared/schema";
import { log } from "./vite";
import { getCurrentWeek, formatWeekDisplay } from "./weekUtils";

const DEFAULT_PLAYERS: InsertPlayer[] = [
  { name: "Carter", chips: 1000, avatar: "dollar" },
  { name: "Chub", chips: 1000, avatar: "brain" },
  { name: "Perky", chips: 1000, avatar: "crystal" },
  { name: "Jerry Fader", chips: 1000, avatar: "mirror" },
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
