import fs from 'fs';
import bcrypt from 'bcrypt';
import { db } from '../server/db';
import { users } from '../shared/schema';

async function importClients() {
  console.log('📧 Reading CSV file...');
  const fileContent = fs.readFileSync('attached_assets/emails_1761239360120.csv', 'utf-8');
  
  // Split by lines and process
  const lines = fileContent.split(/\r?\n/);
  console.log(`📝 Found ${lines.length} lines in file`);
  
  // Extract emails
  const emails: string[] = [];
  const skipped: string[] = [];
  
  for (const line of lines) {
    // Remove BOM, quotes, commas, and whitespace
    const cleaned = line
      .replace(/^\uFEFF/, '') // Remove BOM
      .replace(/^["'\s]+|["'\s,]+$/g, '') // Remove quotes, commas, whitespace from start/end
      .trim();
    
    // Skip empty lines
    if (!cleaned) continue;
    
    // Must contain @ to be valid email
    if (!cleaned.includes('@')) {
      skipped.push(cleaned);
      continue;
    }
    
    // Skip obvious fake/test emails if needed (optional)
    const lowerEmail = cleaned.toLowerCase();
    
    emails.push(cleaned);
  }
  
  console.log(`✅ Extracted ${emails.length} valid emails`);
  console.log(`⚠️  Skipped ${skipped.length} invalid entries`);
  
  // Remove duplicates (case-insensitive)
  const uniqueEmails = Array.from(new Set(emails.map(e => e.toLowerCase())));
  console.log(`🔍 ${uniqueEmails.length} unique emails after deduplication`);
  
  // Import in batches
  const BATCH_SIZE = 100;
  let imported = 0;
  let failed = 0;
  const failedEmails: { email: string; error: string }[] = [];
  
  console.log(`\n🚀 Starting import of ${uniqueEmails.length} clients...\n`);
  
  for (let i = 0; i < uniqueEmails.length; i += BATCH_SIZE) {
    const batch = uniqueEmails.slice(i, i + BATCH_SIZE);
    
    for (const email of batch) {
      try {
        const username = email.split('@')[0].toLowerCase();
        
        // Skip if invalid email format
        if (!email.includes('@') || !username) {
          failed++;
          failedEmails.push({ email, error: 'Invalid email format' });
          continue;
        }
        
        // Check if already exists
        const existing = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.email, email)
        });
        
        if (existing) {
          failed++;
          failedEmails.push({ email, error: 'Already exists' });
          continue;
        }
        
        // Hash password (username as initial password)
        const passwordHash = await bcrypt.hash(username, 10);
        
        // Insert user
        await db.insert(users).values({
          username,
          email,
          passwordHash,
          role: 'CLIENT',
          forcePasswordReset: true,
        });
        
        imported++;
        
        // Progress update every 100 clients
        if (imported % 100 === 0) {
          console.log(`✓ Imported ${imported} / ${uniqueEmails.length} clients...`);
        }
      } catch (error: any) {
        failed++;
        failedEmails.push({ email, error: error.message });
      }
    }
    
    // Small delay between batches to avoid overwhelming the database
    if (i + BATCH_SIZE < uniqueEmails.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  console.log(`\n✅ Import complete!`);
  console.log(`📊 Results:`);
  console.log(`   - Total unique emails: ${uniqueEmails.length}`);
  console.log(`   - Successfully imported: ${imported}`);
  console.log(`   - Failed: ${failed}`);
  
  if (failedEmails.length > 0 && failedEmails.length <= 50) {
    console.log(`\n⚠️  Failed emails:`);
    failedEmails.forEach(({ email, error }) => {
      console.log(`   - ${email}: ${error}`);
    });
  } else if (failedEmails.length > 50) {
    console.log(`\n⚠️  ${failedEmails.length} emails failed (too many to display)`);
  }
  
  process.exit(0);
}

importClients().catch((error) => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
