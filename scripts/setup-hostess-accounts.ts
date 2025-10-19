import { db } from "../server/db";
import { users, hostesses } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";

/**
 * Creates STAFF user accounts for all hostesses who don't have one yet
 * Username: First name only (e.g., "Amelia")
 * Initial password: Same as username (e.g., "Amelia")
 * Requires password reset on first login
 */
async function setupHostessAccounts() {
  console.log("🔍 Finding hostesses without user accounts...\n");

  // Find all hostesses without linked user accounts
  const hostessesWithoutAccounts = await db
    .select()
    .from(hostesses)
    .where(isNull(hostesses.userId));

  console.log(`Found ${hostessesWithoutAccounts.length} hostesses without accounts:\n`);

  for (const hostess of hostessesWithoutAccounts) {
    // Extract first name from display name (e.g., "Amelia" from "Amelia")
    const firstName = hostess.displayName.split(' ')[0];
    const username = firstName.toLowerCase();
    const email = `${username}@clubalpha.ca`;
    
    // Hash the username as the initial password
    const passwordHash = await bcrypt.hash(firstName, 10);

    try {
      console.log(`Creating account for ${hostess.displayName}:`);
      console.log(`  Username: ${username}`);
      console.log(`  Email: ${email}`);
      console.log(`  Initial password: ${firstName} (must be changed on first login)`);

      // Create the user account
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          email,
          passwordHash,
          role: 'STAFF',
          forcePasswordReset: true, // Require password change on first login
        })
        .returning();

      // Link the user to the hostess
      await db
        .update(hostesses)
        .set({ userId: newUser.id })
        .where(eq(hostesses.id, hostess.id));

      console.log(`  ✅ Account created successfully\n`);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        console.log(`  ⚠️  Username "${username}" already exists, skipping...\n`);
      } else {
        console.error(`  ❌ Error creating account:`, error.message, '\n');
      }
    }
  }

  console.log("✅ Setup complete!");
  console.log("\n📋 Summary:");
  console.log("All hostesses can now log in with:");
  console.log("  Username: Their first name (e.g., 'Amelia')");
  console.log("  Initial Password: Same as their first name");
  console.log("  They will be required to set a new password on first login\n");

  process.exit(0);
}

setupHostessAccounts().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
