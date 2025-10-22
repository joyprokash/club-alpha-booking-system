import { db } from "./db";
import { users, hostesses, services, bookings, weeklySchedule, timeOff } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { format, addDays } from "date-fns";

const SALT_ROUNDS = 10;

async function seed() {
  console.log("🌱 Starting database seed...\n");

  try {
    // Check if already seeded
    const existingServices = await db.select().from(services).limit(1);
    if (existingServices.length > 0) {
      console.log("⚠️  Database already seeded. Skipping...");
      console.log("   To re-seed, manually clear the database tables first.");
      return;
    }

    // 1. Create Admin User
    console.log("👤 Creating admin user...");
    const adminPassword = await bcrypt.hash("admin123", SALT_ROUNDS);
    const [adminUser] = await db.insert(users).values({
      email: "admin@clubalpha.ca",
      passwordHash: adminPassword,
      role: "ADMIN",
      forcePasswordReset: false,
    }).returning();
    console.log(`   ✓ Admin created: ${adminUser.email}`);

    // 2. Create Reception User
    console.log("👤 Creating reception user...");
    const receptionPassword = await bcrypt.hash("reception123", SALT_ROUNDS);
    const [receptionUser] = await db.insert(users).values({
      email: "reception@clubalpha.ca",
      passwordHash: receptionPassword,
      role: "RECEPTION",
      forcePasswordReset: false,
    }).returning();
    console.log(`   ✓ Reception created: ${receptionUser.email}`);

    // 3. Create Staff User (Demo Hostess Account)
    console.log("👤 Creating staff user...");
    const staffPassword = await bcrypt.hash("staff123", SALT_ROUNDS);
    const [staffUser] = await db.insert(users).values({
      email: "staff@clubalpha.ca",
      passwordHash: staffPassword,
      role: "STAFF",
      forcePasswordReset: false,
    }).returning();
    console.log(`   ✓ Staff created: ${staffUser.email}`);

    // 4. Create Services
    console.log("\n💆 Creating services...");
    const serviceData = [
      { name: "Express Session", durationMin: 15, priceCents: 3000 },
      { name: "Quick Refresh", durationMin: 30, priceCents: 5000 },
      { name: "Standard Session", durationMin: 45, priceCents: 7500 },
      { name: "Extended Session", durationMin: 60, priceCents: 10000 },
      { name: "Premium Experience", durationMin: 90, priceCents: 15000 },
      { name: "Deluxe Package", durationMin: 120, priceCents: 20000 },
      { name: "VIP Treatment", durationMin: 150, priceCents: 25000 },
      { name: "Ultimate Indulgence", durationMin: 180, priceCents: 30000 },
      { name: "Half Day Retreat", durationMin: 240, priceCents: 40000 },
      { name: "Full Day Experience", durationMin: 360, priceCents: 60000 },
    ];

    const createdServices = await db.insert(services).values(serviceData).returning();
    console.log(`   ✓ Created ${createdServices.length} services`);

    // 5. Create Hostesses (10 Downtown, 10 West End)
    console.log("\n👯 Creating hostesses...");
    const hostessData = [
      // Downtown only
      { slug: "sophia-downtown", displayName: "Sophia", bio: "Experienced and attentive, specializing in personalized care.", specialties: ["Relaxation", "Deep Tissue", "Aromatherapy"], locations: ["DOWNTOWN"] },
      { slug: "emily-downtown", displayName: "Emily", bio: "Warm and welcoming with a focus on comfort and ease.", specialties: ["Swedish", "Hot Stone", "Reflexology"], locations: ["DOWNTOWN"] },
      { slug: "olivia-downtown", displayName: "Olivia", bio: "Professional and skilled in therapeutic techniques.", specialties: ["Sports Massage", "Trigger Point", "Stretching"], locations: ["DOWNTOWN"] },
      { slug: "ava-downtown", displayName: "Ava", bio: "Gentle and nurturing, perfect for first-time guests.", specialties: ["Gentle Touch", "Prenatal", "Stress Relief"], locations: ["DOWNTOWN"] },
      { slug: "isabella-downtown", displayName: "Isabella", bio: "Energetic and passionate about holistic wellness.", specialties: ["Thai Massage", "Shiatsu", "Energy Work"], locations: ["DOWNTOWN"] },
      
      // West End only
      { slug: "emma-westend", displayName: "Emma", bio: "Calm and soothing presence for ultimate relaxation.", specialties: ["Relaxation", "Meditation", "Sound Therapy"], locations: ["WEST_END"] },
      { slug: "madison-westend", displayName: "Madison", bio: "Expert in traditional and modern techniques.", specialties: ["Traditional Thai", "Modern Fusion", "Pressure Point"], locations: ["WEST_END"] },
      { slug: "lily-westend", displayName: "Lily", bio: "Compassionate and attentive to your comfort.", specialties: ["Gentle Care", "Senior Wellness", "Comfort Focus"], locations: ["WEST_END"] },
      { slug: "grace-westend", displayName: "Grace", bio: "Dynamic and versatile in all service offerings.", specialties: ["All Services", "Versatile", "Adaptable"], locations: ["WEST_END"] },
      { slug: "chloe-westend", displayName: "Chloe", bio: "Certified in aromatherapy and essential oils.", specialties: ["Aromatherapy", "Essential Oils", "Natural Healing"], locations: ["WEST_END"] },
      
      // Both locations - these hostesses work at both Downtown and West End
      { slug: "mia-both", displayName: "Mia", bio: "Detail-oriented with expertise in luxury treatments at both locations.", specialties: ["Luxury Spa", "Body Scrubs", "Hydrotherapy"], locations: ["DOWNTOWN", "WEST_END"] },
      { slug: "charlotte-both", displayName: "Charlotte", bio: "Creative and intuitive, adapting to your needs at both locations.", specialties: ["Customized Sessions", "Mindfulness", "Meditation"], locations: ["DOWNTOWN", "WEST_END"] },
      { slug: "amelia-both", displayName: "Amelia", bio: "Certified specialist in advanced techniques, available at both locations.", specialties: ["Neuromuscular", "Myofascial Release", "Cupping"], locations: ["DOWNTOWN", "WEST_END"] },
      { slug: "harper-both", displayName: "Harper", bio: "Friendly and professional with years of experience at both locations.", specialties: ["Classic Massage", "Couples Massage", "Consultation"], locations: ["DOWNTOWN", "WEST_END"] },
      { slug: "ella-both", displayName: "Ella", bio: "Passionate about creating memorable experiences at both locations.", specialties: ["VIP Services", "Special Occasions", "Gift Packages"], locations: ["DOWNTOWN", "WEST_END"] },
      { slug: "zoe-both", displayName: "Zoe", bio: "Energizing and rejuvenating treatments at both locations.", specialties: ["Energy Boost", "Revitalization", "Morning Sessions"], locations: ["DOWNTOWN", "WEST_END"] },
      { slug: "luna-both", displayName: "Luna", bio: "Specializing in evening and night treatments at both locations.", specialties: ["Evening Sessions", "Sleep Therapy", "Unwinding"], locations: ["DOWNTOWN", "WEST_END"] },
      { slug: "hannah-both", displayName: "Hannah", bio: "Professional and courteous, always on time at both locations.", specialties: ["Punctuality", "Reliability", "Consistency"], locations: ["DOWNTOWN", "WEST_END"] },
      { slug: "victoria-both", displayName: "Victoria", bio: "Premium service provider for discerning clients at both locations.", specialties: ["Premium Service", "Luxury Experience", "Excellence"], locations: ["DOWNTOWN", "WEST_END"] },
      { slug: "sophia-both", displayName: "Sophia W", bio: "Skilled practitioner focusing on pain relief and recovery at both locations.", specialties: ["Pain Management", "Injury Recovery", "Rehabilitation"], locations: ["DOWNTOWN", "WEST_END"] },
    ];

    const createdHostesses = await db.insert(hostesses).values(hostessData).returning();
    console.log(`   ✓ Created ${createdHostesses.length} hostesses`);

    // Link staff user to first hostess for demo purposes
    await db.update(hostesses)
      .set({ userId: staffUser.id })
      .where(eq(hostesses.id, createdHostesses[0].id));
    console.log(`   ✓ Linked staff user to ${createdHostesses[0].displayName} (${createdHostesses[0].slug})`);

    // 6. Create Weekly Schedules for all hostesses
    console.log("\n📅 Creating weekly schedules...");
    const scheduleData = [];
    
    for (const hostess of createdHostesses) {
      // Monday-Friday: 10:00-23:00
      for (let day = 1; day <= 5; day++) {
        scheduleData.push({
          hostessId: hostess.id,
          weekday: day,
          startTime: 600, // 10:00
          endTime: 1380, // 23:00
        });
      }
      
      // Saturday: 12:00-20:00
      scheduleData.push({
        hostessId: hostess.id,
        weekday: 6,
        startTime: 720, // 12:00
        endTime: 1200, // 20:00
      });
      
      // Sunday: Off
    }

    await db.insert(weeklySchedule).values(scheduleData);
    console.log(`   ✓ Created ${scheduleData.length} weekly schedule entries`);

    // 7. Create Client Users
    console.log("\n👥 Creating client users...");
    const clientData = [];
    const clientPassword = await bcrypt.hash("client123", SALT_ROUNDS);
    
    for (let i = 1; i <= 50; i++) {
      clientData.push({
        email: `client${i}@example.com`,
        passwordHash: clientPassword,
        role: "CLIENT" as const,
        forcePasswordReset: false,
      });
    }

    const createdClients = await db.insert(users).values(clientData).returning();
    console.log(`   ✓ Created ${createdClients.length} clients`);

    // 8. Create Sample Bookings (only on weekdays, respecting schedule)
    console.log("\n📝 Creating sample bookings...");
    const bookingData = [];
    const today = new Date();
    
    // Find next 3 weekdays (Mon-Sat)
    const validDates = [];
    for (let i = 0; i < 10 && validDates.length < 3; i++) {
      const checkDate = addDays(today, i);
      const dayOfWeek = checkDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      if (dayOfWeek >= 1 && dayOfWeek <= 6) { // Mon-Sat
        validDates.push(checkDate);
      }
    }
    
    // Create bookings that fit within schedule windows
    let bookingCount = 0;
    for (const date of validDates) {
      for (let h = 0; h < Math.ceil(createdHostesses.length / 2); h++) {
        const hostess = createdHostesses[h];
        const client = createdClients[bookingCount % createdClients.length];
        
        // Create 1-2 bookings per hostess: one in day shift, one in night shift
        // Day shift: 10:00-18:00 (600-1080 minutes)
        const dayService = createdServices[bookingCount % 5]; // Use shorter services (15-90 min)
        const dayStartTime = 600 + (bookingCount % 4) * 60; // Stagger: 10:00, 11:00, 12:00, 13:00
        
        if (dayStartTime + dayService.durationMin <= 1080) { // Must end by 18:00
          bookingData.push({
            date: format(date, "yyyy-MM-dd"),
            startTime: dayStartTime,
            endTime: dayStartTime + dayService.durationMin,
            hostessId: hostess.id,
            clientId: client.id,
            serviceId: dayService.id,
            status: bookingCount % 4 === 0 ? "COMPLETED" as const : (bookingCount % 4 === 1 ? "CONFIRMED" as const : "PENDING" as const),
            notes: bookingCount % 3 === 0 ? "Client prefers quiet environment" : null,
          });
          bookingCount++;
        }
        
        // Night shift: 19:00-23:00 (1140-1380 minutes) - only Mon-Fri
        const dayOfWeek = date.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && bookingCount < 30) {
          const nightService = createdServices[bookingCount % 5]; // Use shorter services
          const nightStartTime = 1140 + (bookingCount % 3) * 60; // Stagger: 19:00, 20:00, 21:00
          
          if (nightStartTime + nightService.durationMin <= 1380) { // Must end by 23:00
            const nightClient = createdClients[(bookingCount + 1) % createdClients.length];
            bookingData.push({
              date: format(date, "yyyy-MM-dd"),
              startTime: nightStartTime,
              endTime: nightStartTime + nightService.durationMin,
              hostessId: hostess.id,
              clientId: nightClient.id,
              serviceId: nightService.id,
              status: bookingCount % 4 === 0 ? "COMPLETED" as const : (bookingCount % 4 === 1 ? "CONFIRMED" as const : "PENDING" as const),
              notes: null,
            });
            bookingCount++;
          }
        }
        
        if (bookingData.length >= 30) break;
      }
      if (bookingData.length >= 30) break;
    }

    const createdBookings = await db.insert(bookings).values(bookingData).returning();
    console.log(`   ✓ Created ${createdBookings.length} bookings`);

    // 8. Create Sample Time-Off Blocks
    console.log("\n🚫 Creating time-off blocks...");
    const timeOffData = [];
    const nextWeek = addDays(today, 7);
    
    // Give 5 random hostesses a time-off block next week
    for (let i = 0; i < 5; i++) {
      const hostess = createdHostesses[i];
      timeOffData.push({
        hostessId: hostess.id,
        date: format(nextWeek, "yyyy-MM-dd"),
        startTime: 600, // 10:00
        endTime: 1080, // 18:00
        reason: "Personal day",
      });
    }

    await db.insert(timeOff).values(timeOffData);
    console.log(`   ✓ Created ${timeOffData.length} time-off blocks`);

    console.log("\n✅ Seed completed successfully!\n");
    console.log("📋 Summary:");
    console.log(`   - 1 Admin user (admin@clubalpha.ca / admin123)`);
    console.log(`   - 1 Reception user (reception@clubalpha.ca / reception123)`);
    console.log(`   - ${createdServices.length} Services`);
    console.log(`   - ${createdHostesses.length} Hostesses`);
    console.log(`   - ${scheduleData.length} Weekly Schedule Entries`);
    console.log(`   - ${createdClients.length} Clients (client1@example.com - client50@example.com / client123)`);
    console.log(`   - ${createdBookings.length} Sample Bookings`);
    console.log(`   - ${timeOffData.length} Time-Off Blocks\n`);
    
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("Seed script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
