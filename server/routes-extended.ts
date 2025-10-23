import type { Express } from "express";
import { z } from "zod";
import QRCode from "qrcode";
import Papa from "papaparse";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { authenticateToken, requireRole, type AuthRequest } from "./middleware";
import { insertTimeOffSchema, insertWeeklyScheduleSchema } from "@shared/schema";
import { parseTimeToMinutes, minutesToTime, hasTimeConflict, getDayOfWeek } from "../client/src/lib/time-utils";

export function registerExtendedRoutes(app: Express) {
  const importLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: { error: { code: "RATE_LIMIT", message: "Too many import requests" } },
    validate: { trustProxy: false },
  });

  // ==================== TIME OFF ENDPOINTS ====================
  
  // Create time-off (admin/reception only)
  app.post("/api/timeoff", authenticateToken, requireRole("ADMIN", "RECEPTION"), async (req: AuthRequest, res, next) => {
    try {
      const data = insertTimeOffSchema.parse(req.body);
      const timeOff = await storage.createTimeOff(data);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "CREATE",
        entity: "timeoff",
        entityId: timeOff.id,
        meta: { data },
      });

      res.json(timeOff);
    } catch (error) {
      next(error);
    }
  });

  // Get time-off for hostess
  app.get("/api/timeoff/:hostessId", async (req, res, next) => {
    try {
      const { hostessId } = req.params;
      const { date } = req.query;
      const timeOff = await storage.getTimeOffByHostess(hostessId, date as string);
      res.json(timeOff);
    } catch (error) {
      next(error);
    }
  });

  // ==================== WEEKLY SCHEDULE ENDPOINTS ====================
  
  // Import schedule CSV (admin/reception)
  app.post("/api/schedule/import", importLimiter, authenticateToken, requireRole("ADMIN", "RECEPTION"), async (req: AuthRequest, res, next) => {
    try {
      const { csvData } = z.object({ csvData: z.string() }).parse(req.body);
      
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      const results: any[] = [];

      for (const row of parsed.data as any[]) {
        try {
          const hostessName = row.hostess?.trim();
          if (!hostessName) {
            results.push({ row, success: false, error: "Missing hostess name" });
            continue;
          }

          // Find hostess by display name
          const allHostesses = await storage.getHostesses();
          const hostess = allHostesses.find(h => 
            h.displayName.toLowerCase().includes(hostessName.toLowerCase())
          );

          if (!hostess) {
            results.push({ row, success: false, error: `Hostess not found: ${hostessName}` });
            continue;
          }

          // Parse weekly schedule for each day
          const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
          
          for (let i = 0; i < days.length; i++) {
            const dayValue = row[days[i]]?.trim();

            const parseTimeSlot = (slot: string) => {
              if (!slot) return null;
              const match = slot.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
              if (!match) return null;
              const start = parseInt(match[1]) * 60 + parseInt(match[2]);
              const end = parseInt(match[3]) * 60 + parseInt(match[4]);
              return { start, end };
            };

            const timeSlot = parseTimeSlot(dayValue);

            await storage.upsertWeeklySchedule({
              hostessId: hostess.id,
              weekday: i,
              startTime: timeSlot?.start || null,
              endTime: timeSlot?.end || null,
            });
          }

          results.push({ row, success: true });
        } catch (error: any) {
          results.push({ row, success: false, error: error.message });
        }

        // Small delay to prevent DB spam
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "IMPORT",
        entity: "schedule",
        entityId: "bulk",
        meta: { results },
      });

      res.json({ results, total: results.length });
    } catch (error) {
      next(error);
    }
  });

  // Export schedule CSV
  app.get("/api/schedule/export", authenticateToken, requireRole("ADMIN", "RECEPTION"), async (req, res, next) => {
    try {
      const { location } = req.query;
      const hostesses = await storage.getHostesses(location as string);
      
      const sorted = hostesses.sort((a, b) => 
        (a.displayName || "").localeCompare(b.displayName || "")
      );

      const csvRows: string[] = [];
      csvRows.push("id,hostess,monday,tuesday,wednesday,thursday,friday,saturday,sunday");

      for (const hostess of sorted) {
        const schedule = await storage.getWeeklyScheduleByHostess(hostess.id);
        const row: string[] = [hostess.id, hostess.displayName];

        const days = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
        for (const day of days) {
          const daySchedule = schedule.find(s => s.weekday === day);
          
          const formatSlot = (start: number | null, end: number | null) => {
            if (!start || !end) return "";
            return `${minutesToTime(start)}-${minutesToTime(end)}`;
          };

          row.push(formatSlot(daySchedule?.startTime || null, daySchedule?.endTime || null));
        }

        csvRows.push(row.join(","));
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=schedule-${location || "all"}.csv`);
      res.send(csvRows.join("\n"));
    } catch (error) {
      next(error);
    }
  });

  // ==================== BULK CLIENT IMPORT ====================
  
  // Optimized for large datasets (e.g., 14,000+ records)
  app.post("/api/clients/bulk-import", importLimiter, authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { csvData } = z.object({ csvData: z.string() }).parse(req.body);
      
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      const results: any[] = [];

      // Process in batches to avoid overwhelming the database
      const BATCH_SIZE = 100;
      const rows = parsed.data as any[];
      
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (row) => {
          try {
            const email = row.email?.trim();
            
            // Extract username from email (part before @)
            const username = email?.split('@')[0]?.toLowerCase();
            
            if (!email || !email.includes("@") || !username) {
              results.push({ row, success: false, error: "Invalid email", email });
              return;
            }

            // Check if exists
            const existing = await storage.getUserByEmail(email);
            if (existing) {
              results.push({ row, success: false, error: "User already exists", email });
              return;
            }

            // Use username as default password and hash it for each user
            const passwordHash = await bcrypt.hash(username, 10);

            await storage.createUser({
              username,
              email,
              passwordHash,
              role: "CLIENT",
              forcePasswordReset: true,
            });

            results.push({ row, success: true, email });
          } catch (error: any) {
            results.push({ row, success: false, error: error.message, email: row.email?.trim() || "unknown" });
          }
        }));
        
        // Small delay between batches to prevent overwhelming the DB
        if (i + BATCH_SIZE < rows.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "BULK_IMPORT",
        entity: "client",
        entityId: "bulk",
        meta: { 
          total: results.length,
          imported: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        },
      });

      res.json({ 
        results, 
        total: results.length, 
        imported: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== QR CODE ENDPOINT ====================
  
  app.get("/api/qr", async (req, res, next) => {
    try {
      const { url } = z.object({ url: z.string().url() }).parse(req.query);
      
      const qrDataURL = await QRCode.toDataURL(url, { width: 300, margin: 2 });
      const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      res.setHeader("Content-Type", "image/png");
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  });

  // ==================== BULK USER IMPORT ====================
  
  app.post("/api/admin/users/bulk-import", importLimiter, authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { csvData } = z.object({ csvData: z.string() }).parse(req.body);
      
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      const results: any[] = [];

      for (const row of parsed.data as any[]) {
        try {
          const email = row.email?.trim();
          const role = row.role?.trim().toUpperCase() || "CLIENT";
          // Generate unique password for each user if not provided
          const password = row.password?.trim() || Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-8);

          // Validate email
          if (!email || !email.includes("@")) {
            results.push({ row, success: false, error: "Invalid email" });
            continue;
          }

          // Validate role
          if (!["ADMIN", "STAFF", "RECEPTION", "CLIENT"].includes(role)) {
            results.push({ row, success: false, error: `Invalid role: ${role}. Must be ADMIN, STAFF, RECEPTION, or CLIENT` });
            continue;
          }

          // Check if user already exists
          const existing = await storage.getUserByEmail(email);
          if (existing) {
            results.push({ row, success: false, error: "User already exists" });
            continue;
          }

          // Hash password
          const passwordHash = await bcrypt.hash(password, 10);

          // Extract username from email (part before @)
          const username = email.split('@')[0];

          // Create user
          await storage.createUser({
            username,
            email,
            passwordHash,
            role: role as "ADMIN" | "STAFF" | "RECEPTION" | "CLIENT",
            forcePasswordReset: !row.password, // Force reset if password was auto-generated
          });

          results.push({ row, success: true, generatedPassword: !row.password ? password : undefined });
        } catch (error: any) {
          results.push({ row, success: false, error: error.message });
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "BULK_IMPORT",
        entity: "user",
        entityId: "bulk",
        meta: { results, count: results.filter(r => r.success).length },
      });

      res.json({ 
        results, 
        total: results.length, 
        imported: results.filter(r => r.success).length 
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== HOSTESS IMPORT ENDPOINT ====================
  
  app.post("/api/hostesses/import", importLimiter, authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { csvData } = z.object({ csvData: z.string() }).parse(req.body);
      
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      const results: any[] = [];

      for (const row of parsed.data as any[]) {
        try {
          const displayName = row.display_name?.trim() || row.name?.trim();
          if (!displayName) {
            results.push({ row, success: false, error: "Missing display_name" });
            continue;
          }

          const location = row.location?.trim().toUpperCase();
          if (!location || !["DOWNTOWN", "WEST_END"].includes(location)) {
            results.push({ row, success: false, error: "Invalid location (must be DOWNTOWN or WEST_END)" });
            continue;
          }

          // Parse specialties (comma-separated or array)
          let specialties: string[] = [];
          if (row.specialties) {
            if (typeof row.specialties === 'string') {
              specialties = row.specialties.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else if (Array.isArray(row.specialties)) {
              specialties = row.specialties;
            }
          }

          // Generate slug from display name
          const slug = displayName.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') + '-' + location.toLowerCase().replace('_', '-');

          // Check if hostess already exists by slug
          const existingHostesses = await storage.getHostesses();
          const existingHostess = existingHostesses.find(h => h.slug === slug);

          if (existingHostess) {
            // Update existing hostess
            await storage.updateHostess(existingHostess.id, {
              displayName,
              bio: row.bio?.trim() || existingHostess.bio,
              specialties: specialties.length > 0 ? specialties : existingHostess.specialties,
              locations: [location as "DOWNTOWN" | "WEST_END"],
              active: row.active !== undefined ? row.active === 'true' || row.active === true : existingHostess.active,
            });
            results.push({ row, success: true, action: 'updated', hostess: displayName });
          } else {
            // Create new hostess
            await storage.createHostess({
              slug,
              displayName,
              bio: row.bio?.trim() || null,
              specialties: specialties.length > 0 ? specialties : [],
              locations: [location as "DOWNTOWN" | "WEST_END"],
              active: row.active !== undefined ? row.active === 'true' || row.active === true : true,
              userId: null,
            });
            results.push({ row, success: true, action: 'created', hostess: displayName });
          }
        } catch (error: any) {
          results.push({ row, success: false, error: error.message });
        }

        // Small delay to prevent DB spam
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "IMPORT",
        entity: "hostess",
        entityId: "bulk",
        meta: { results },
      });

      res.json({ results, total: results.length });
    } catch (error) {
      next(error);
    }
  });

  // ==================== AVAILABILITY ENDPOINT ====================
  
  app.get("/api/bookings/availability", async (req, res, next) => {
    try {
      const { hostessId, date } = req.query;
      
      if (!hostessId || !date) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "hostessId and date required" } });
      }

      const bookings = await storage.getBookingsByDate(date as string);
      const hostessBookings = bookings.filter(b => 
        b.hostessId === hostessId && b.status !== "CANCELED"
      );

      const bookedSlots = hostessBookings.flatMap(b => {
        const slots: number[] = [];
        for (let t = b.startTime; t < b.endTime; t += 15) {
          slots.push(t);
        }
        return slots;
      });

      res.json({ bookedSlots });
    } catch (error) {
      next(error);
    }
  });

  // ==================== UPCOMING SCHEDULE ENDPOINTS ====================
  
  // Get upcoming schedule by date range
  app.get("/api/upcoming-schedule", async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      const schedule = await storage.getUpcomingSchedule(
        startDate as string, 
        endDate as string
      );
      res.json(schedule);
    } catch (error) {
      next(error);
    }
  });

  // Bulk upload upcoming schedule (admin/reception only)
  app.post("/api/upcoming-schedule/bulk", importLimiter, authenticateToken, requireRole("ADMIN", "RECEPTION"), async (req: AuthRequest, res, next) => {
    try {
      const { csvData } = z.object({ csvData: z.string() }).parse(req.body);
      
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      const results: any[] = [];

      for (const row of parsed.data as any[]) {
        try {
          const { date, hostess, startTime, endTime, service, notes } = row;
          
          if (!date || !hostess || !startTime || !endTime) {
            results.push({ row, success: false, error: "Missing required fields" });
            continue;
          }

          // Find hostess by display name
          const allHostesses = await storage.getHostesses();
          const foundHostess = allHostesses.find(h => 
            h.displayName.toLowerCase() === hostess.trim().toLowerCase()
          );

          if (!foundHostess) {
            results.push({ row, success: false, error: `Hostess not found: ${hostess}` });
            continue;
          }

          // Find service if provided
          let serviceId = null;
          if (service) {
            const allServices = await storage.getServices();
            const foundService = allServices.find(s => 
              s.name.toLowerCase() === service.trim().toLowerCase()
            );
            serviceId = foundService?.id || null;
          }

          // Parse times
          const start = parseTimeToMinutes(startTime.trim());
          const end = parseTimeToMinutes(endTime.trim());

          // Create schedule entry
          await storage.createUpcomingSchedule({
            date: date.trim(),
            startTime: start,
            endTime: end,
            hostessId: foundHostess.id,
            serviceId,
            notes: notes?.trim() || null,
            uploadedBy: req.user!.id,
          });

          results.push({ row, success: true, hostess: foundHostess.displayName });
        } catch (error: any) {
          results.push({ row, success: false, error: error.message });
        }

        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "IMPORT",
        entity: "upcoming_schedule",
        entityId: "bulk",
        meta: { results },
      });

      res.json({ results, total: results.length });
    } catch (error) {
      next(error);
    }
  });

  // Clear all upcoming schedule (admin/reception only)
  app.delete("/api/upcoming-schedule/clear", authenticateToken, requireRole("ADMIN", "RECEPTION"), async (req: AuthRequest, res, next) => {
    try {
      await storage.clearUpcomingSchedule();

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "DELETE",
        entity: "upcoming_schedule",
        entityId: "all",
        meta: {},
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Delete single upcoming schedule entry (admin/reception only)
  app.delete("/api/upcoming-schedule/:id", authenticateToken, requireRole("ADMIN", "RECEPTION"), async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      await storage.deleteUpcomingSchedule(id);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "DELETE",
        entity: "upcoming_schedule",
        entityId: id,
        meta: {},
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // ==================== MESSAGING ENDPOINTS ====================
  
  // Get conversations for current user (client or staff)
  app.get("/api/conversations", authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      next(error);
    }
  });

  // Get or create conversation between client and hostess
  app.post("/api/conversations", authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { hostessId } = z.object({ hostessId: z.string() }).parse(req.body);
      const userId = req.user!.id;
      const userRole = req.user!.role;

      let clientId: string;
      let actualHostessId: string;

      if (userRole === "CLIENT") {
        clientId = userId;
        actualHostessId = hostessId;
      } else if (userRole === "STAFF") {
        // Staff user messaging a client - hostessId is actually clientId
        const staffHostess = await storage.getHostessByUserId(userId);
        if (!staffHostess) {
          return res.status(403).json({ error: "Staff user not linked to hostess" });
        }
        actualHostessId = staffHostess.id;
        clientId = hostessId; // In this case, hostessId param is actually the client's ID
      } else {
        return res.status(403).json({ error: "Invalid role for messaging" });
      }

      const conversation = await storage.getOrCreateConversation(clientId, actualHostessId);
      res.json(conversation);
    } catch (error) {
      next(error);
    }
  });

  // Mark conversation as read
  app.post("/api/conversations/:conversationId/read", authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.id;
      
      await storage.markConversationAsRead(conversationId, userId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:conversationId/messages", authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.id;
      
      // Verify user is part of this conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Check if user is the client or the staff user linked to the hostess
      let isAuthorized = conversation.clientId === userId;
      if (!isAuthorized && req.user!.role === "STAFF") {
        const staffHostess = await storage.getHostessByUserId(userId);
        if (staffHostess && staffHostess.id === conversation.hostessId) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized && req.user!.role !== "ADMIN") {
        return res.status(403).json({ error: "Not authorized to view this conversation" });
      }

      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      next(error);
    }
  });

  // Send a message
  app.post("/api/messages", authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { conversationId, content } = z.object({
        conversationId: z.string(),
        content: z.string().min(1).max(5000),
      }).parse(req.body);

      const userId = req.user!.id;

      // Verify user is part of this conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      let isAuthorized = conversation.clientId === userId;
      if (!isAuthorized && req.user!.role === "STAFF") {
        const staffHostess = await storage.getHostessByUserId(userId);
        if (staffHostess && staffHostess.id === conversation.hostessId) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: "Not authorized to send messages in this conversation" });
      }

      // Create message
      const message = await storage.createMessage({
        conversationId,
        senderId: userId,
        content,
      });

      // Update conversation last message timestamp
      await storage.updateConversationLastMessage(conversationId);

      // Check for trigger words
      const triggerWords = await storage.getTriggerWords();
      const contentLower = content.toLowerCase();
      
      for (const tw of triggerWords) {
        if (contentLower.includes(tw.word.toLowerCase())) {
          // Flag the conversation
          await storage.createFlaggedConversation({
            conversationId,
            messageId: message.id,
            triggeredWord: tw.word,
          });
          break; // Only flag once per message
        }
      }

      res.json(message);
    } catch (error) {
      next(error);
    }
  });

  // ==================== ADMIN: TRIGGER WORDS MANAGEMENT ====================
  
  // Get all trigger words (admin only)
  app.get("/api/admin/trigger-words", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const triggerWords = await storage.getTriggerWordsWithDetails();
      res.json(triggerWords);
    } catch (error) {
      next(error);
    }
  });

  // Add trigger word (admin only)
  app.post("/api/admin/trigger-words", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { word } = z.object({ word: z.string().min(1).max(100) }).parse(req.body);
      
      const triggerWord = await storage.createTriggerWord({
        word: word.toLowerCase().trim(),
        addedBy: req.user!.id,
      });

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "CREATE",
        entity: "trigger_word",
        entityId: triggerWord.id,
        meta: { word: triggerWord.word },
      });

      res.json(triggerWord);
    } catch (error) {
      next(error);
    }
  });

  // Delete trigger word (admin only)
  app.delete("/api/admin/trigger-words/:id", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      await storage.deleteTriggerWord(id);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "DELETE",
        entity: "trigger_word",
        entityId: id,
        meta: {},
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // ==================== ADMIN: FLAGGED CONVERSATIONS ====================
  
  // Get flagged conversations (admin only)
  app.get("/api/admin/flagged-conversations", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { reviewed } = req.query;
      const flaggedConversations = await storage.getFlaggedConversations(
        reviewed === "true" ? true : reviewed === "false" ? false : undefined
      );
      res.json(flaggedConversations);
    } catch (error) {
      next(error);
    }
  });

  // Mark flagged conversation as reviewed (admin only)
  app.patch("/api/admin/flagged-conversations/:id/review", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      await storage.markFlaggedConversationAsReviewed(id, req.user!.id);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "UPDATE",
        entity: "flagged_conversation",
        entityId: id,
        meta: { reviewed: true },
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // ==================== REVIEWS ====================
  
  // Submit a review (CLIENT only, for completed bookings)
  app.post("/api/reviews", authenticateToken, requireRole("CLIENT"), async (req: AuthRequest, res, next) => {
    try {
      const parsed = req.body;
      
      // Verify client can review this booking
      const canReview = await storage.canClientReview(parsed.bookingId, req.user!.id);
      if (!canReview) {
        return res.status(403).json({ error: "You cannot review this booking (either it doesn't exist, doesn't belong to you, or you've already reviewed it)" });
      }

      // Create the review with PENDING status
      const review = await storage.createReview({
        ...parsed,
        clientId: req.user!.id,
      });

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "CREATE",
        entity: "review",
        entityId: review.id,
        meta: { bookingId: parsed.bookingId, rating: parsed.rating },
      });

      res.status(201).json(review);
    } catch (error) {
      next(error);
    }
  });

  // Get reviews for a specific hostess (approved reviews only for non-admins)
  app.get("/api/reviews/hostess/:hostessId", async (req: AuthRequest, res, next) => {
    try {
      const { hostessId } = req.params;
      const approvedOnly = !req.user || req.user.role !== "ADMIN";
      
      const reviews = await storage.getReviewsByHostess(hostessId, approvedOnly);
      res.json(reviews);
    } catch (error) {
      next(error);
    }
  });

  // Get hostess average rating and review count
  app.get("/api/hostesses/:id/rating", async (req, res, next) => {
    try {
      const { id } = req.params;
      const rating = await storage.getHostessAverageRating(id);
      res.json(rating);
    } catch (error) {
      next(error);
    }
  });

  // Get all pending reviews (ADMIN only)
  app.get("/api/admin/reviews/pending", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const reviews = await storage.getPendingReviews();
      res.json(reviews);
    } catch (error) {
      next(error);
    }
  });

  // Approve a review (ADMIN only)
  app.post("/api/admin/reviews/:id/approve", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const review = await storage.approveReview(id, req.user!.id);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "UPDATE",
        entity: "review",
        entityId: id,
        meta: { status: "APPROVED" },
      });

      res.json(review);
    } catch (error) {
      next(error);
    }
  });

  // Reject a review (ADMIN only)
  app.post("/api/admin/reviews/:id/reject", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const review = await storage.rejectReview(id, req.user!.id);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "UPDATE",
        entity: "review",
        entityId: id,
        meta: { status: "REJECTED" },
      });

      res.json(review);
    } catch (error) {
      next(error);
    }
  });

  // Get current user's reviews (CLIENT only)
  app.get("/api/reviews/my-reviews", authenticateToken, requireRole("CLIENT"), async (req: AuthRequest, res, next) => {
    try {
      const reviews = await storage.getReviewsByClient(req.user!.id);
      res.json(reviews);
    } catch (error) {
      next(error);
    }
  });
}
