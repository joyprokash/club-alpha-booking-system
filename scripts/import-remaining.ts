import fs from 'fs';
import bcrypt from 'bcrypt';
import { db } from '../server/db';
import { users } from '../shared/schema';

async function importRemaining() {
  console.log('📧 Reading CSV file...');
  const fileContent = fs.readFileSync('attached_assets/emails_1761239360120.csv', 'utf-8');
  
  const lines = fileContent.split(/\r?\n/);
  const emails: string[] = [];
  
  for (const line of lines) {
    const cleaned = line
      .replace(/^\uFEFF/, '')
      .replace(/^["'\s]+|["'\s,]+$/g, '')
      .trim();
    
    if (!cleaned || !cleaned.includes('@')) continue;
    emails.push(cleaned.toLowerCase());
  }
  
  const uniqueEmails = Array.from(new Set(emails));
  console.log(`🔍 ${uniqueEmails.length} unique emails total`);
  
  // Get all existing client emails
  const existingClients = await db.query.users.findMany({
    where: (users, { eq }) => eq(users.role, 'CLIENT'),
    columns: { email: true }
  });
  
  const existingEmails = new Set(existingClients.map(c => c.email.toLowerCase()));
  console.log(`✅ ${existingEmails.size} clients already in database`);
  
  // Find missing emails
  const missingEmails = uniqueEmails.filter(email => !existingEmails.has(email));
  console.log(`📋 ${missingEmails.length} clients need to be imported`);
  
  if (missingEmails.length === 0) {
    console.log('\n🎉 All clients already imported!');
    process.exit(0);
  }
  
  // Import missing emails (using bcrypt rounds=8 for speed)
  let imported = 0;
  let failed = 0;
  
  console.log(`\n🚀 Importing ${missingEmails.length} remaining clients...\n`);
  
  for (const email of missingEmails) {
    try {
      const username = email.split('@')[0];
      const passwordHash = await bcrypt.hash(username, 8); // Reduced from 10 to 8 for speed
      
      await db.insert(users).values({
        username,
        email,
        passwordHash,
        role: 'CLIENT',
        forcePasswordReset: true,
      });
      
      imported++;
      console.log(`✓ [${imported}/${missingEmails.length}] ${email}`);
    } catch (error: any) {
      failed++;
      console.error(`✗ ${email}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Import complete!`);
  console.log(`   - Successfully imported: ${imported}`);
  console.log(`   - Failed: ${failed}`);
  console.log(`   - Total clients now: ${existingEmails.size + imported}`);
  
  process.exit(0);
}

importRemaining().catch((error) => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
