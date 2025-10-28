import { db } from "./db";
import { weeks, type Week } from "@shared/schema";
import { eq } from "drizzle-orm";
import { log } from "./vite";

// NFL Season start date - configurable via environment variable
// Default to September 4, 2025 (2025 NFL regular season kickoff)
// NFL season typically starts first Thursday of September
const SEASON_START = process.env.SEASON_START_DATE 
  ? new Date(process.env.SEASON_START_DATE)
  : new Date('2025-09-04');

/**
 * Calculate the current week number based on the current date
 * Weeks start on Sunday
 */
export function getCurrentWeekNumber(): number {
  const now = new Date();
  
  // Calculate days since season start
  const diffTime = Math.abs(now.getTime() - SEASON_START.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Calculate week number (starting from week 1)
  // Each week starts on Sunday
  const weekNumber = Math.floor(diffDays / 7) + 1;
  
  return weekNumber;
}

/**
 * Get the start and end dates for a given week number
 */
export function getWeekDateRange(weekNumber: number): { start: Date; end: Date } {
  const weeksToAdd = weekNumber - 1;
  const start = new Date(SEASON_START);
  start.setDate(start.getDate() + (weeksToAdd * 7));
  
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Get or create the current week
 * This function is idempotent - safe to call multiple times
 */
export async function getCurrentWeek(): Promise<Week> {
  const currentWeekNumber = getCurrentWeekNumber();
  
  // Check if this week already exists
  const existingWeeks = await db
    .select()
    .from(weeks)
    .where(eq(weeks.weekNumber, currentWeekNumber));
  
  if (existingWeeks.length > 0) {
    return existingWeeks[0];
  }
  
  // Create the week if it doesn't exist
  log(`Auto-creating Week ${currentWeekNumber}...`);
  
  // First, set all existing weeks to inactive
  const allWeeks = await db.select().from(weeks);
  for (const week of allWeeks) {
    await db
      .update(weeks)
      .set({ isActive: false })
      .where(eq(weeks.id, week.id));
  }
  
  // Create the new week as active
  const [newWeek] = await db
    .insert(weeks)
    .values({
      weekNumber: currentWeekNumber,
      isActive: true,
    })
    .returning();
  
  log(`Created Week ${currentWeekNumber} as active week`);
  
  return newWeek;
}

/**
 * Format week number with date range for display
 */
export function formatWeekDisplay(weekNumber: number): string {
  const { start, end } = getWeekDateRange(weekNumber);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `Week ${weekNumber} (${startStr} - ${endStr})`;
}
