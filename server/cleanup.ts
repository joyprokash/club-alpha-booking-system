import { db } from "./db";
import { bookings, users } from "@shared/schema";
import { eq, and, lt, inArray, sql } from "drizzle-orm";
import { subWeeks, format } from "date-fns";

/**
 * Deletes client booking history older than 2 weeks
 * This runs automatically to maintain privacy and keep the database clean
 */
export async function cleanupOldClientBookings() {
  try {
    const twoWeeksAgo = subWeeks(new Date(), 2);
    const cutoffDate = format(twoWeeksAgo, "yyyy-MM-dd");
    
    console.log(`🧹 Running booking cleanup for records before ${cutoffDate}...`);
    
    // Get all CLIENT user IDs
    const clientUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "CLIENT"));
    
    const clientIds = clientUsers.map(u => u.id);
    
    if (clientIds.length === 0) {
      console.log("   ✓ No client users found, skipping cleanup");
      return 0;
    }
    
    // Delete bookings older than 2 weeks for CLIENT users only
    const result = await db
      .delete(bookings)
      .where(
        and(
          lt(bookings.date, cutoffDate),
          inArray(bookings.clientId, clientIds)
        )
      )
      .returning({ id: bookings.id });
    
    const deletedCount = result.length;
    
    if (deletedCount > 0) {
      console.log(`   ✓ Deleted ${deletedCount} old client booking(s)`);
    } else {
      console.log(`   ✓ No old client bookings to delete`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error("❌ Error during booking cleanup:", error);
    throw error;
  }
}

/**
 * Schedule cleanup to run periodically
 * Runs every 24 hours
 */
export function scheduleBookingCleanup() {
  // Run immediately on startup
  cleanupOldClientBookings().catch(console.error);
  
  // Schedule to run every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    cleanupOldClientBookings().catch(console.error);
  }, TWENTY_FOUR_HOURS);
  
  console.log("📅 Scheduled automatic booking cleanup (runs every 24 hours)");
}
