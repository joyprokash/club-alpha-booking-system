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
          const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
          
          for (let i = 0; i < days.length; i++) {
            const dayDay = row[`${days[i]}_day`]?.trim();
            const dayNight = row[`${days[i]}_night`]?.trim();

            const parseTimeSlot = (slot: string) => {
              if (!slot) return null;
              const match = slot.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
              if (!match) return null;
              const start = parseInt(match[1]) * 60 + parseInt(match[2]);
              const end = parseInt(match[3]) * 60 + parseInt(match[4]);
              return { start, end };
            };

            const daySlot = parseTimeSlot(dayDay);
            const nightSlot = parseTimeSlot(dayNight);

            await storage.upsertWeeklySchedule({
              hostessId: hostess.id,
              weekday: i,
              startTimeDay: daySlot?.start || null,
              endTimeDay: daySlot?.end || null,
              startTimeNight: nightSlot?.start || null,
              endTimeNight: nightSlot?.end || null,
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
      csvRows.push("id,hostess,mon_day,mon_night,tue_day,tue_night,wed_day,wed_night,thu_day,thu_night,fri_day,fri_night,sat_day,sat_night,sun_day,sun_night");

      for (const hostess of sorted) {
        const schedule = await storage.getWeeklyScheduleByHostess(hostess.id);
        const row: string[] = [hostess.id, hostess.displayName];

        const days = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
        for (const day of days) {
          const daySchedule = schedule.find(s => s.weekday === day);
          
          const formatSlot = (start: number | null, end: number | null, loc: string) => {
            if (!start || !end) return "";
            return `${minutesToTime(start)}-${minutesToTime(end)},${loc}`;
          };

          const locationCode = hostess.location === "DOWNTOWN" ? "D" : "W";
          row.push(formatSlot(daySchedule?.startTimeDay || null, daySchedule?.endTimeDay || null, locationCode));
          row.push(formatSlot(daySchedule?.startTimeNight || null, daySchedule?.endTimeNight || null, locationCode));
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
  
  app.post("/api/clients/bulk-import", importLimiter, authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { csvData } = z.object({ csvData: z.string() }).parse(req.body);
      
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      const results: any[] = [];
      const tempPassword = Math.random().toString(36).slice(-12);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      for (const row of parsed.data as any[]) {
        try {
          const email = row.email?.trim();
          if (!email || !email.includes("@")) {
            results.push({ row, success: false, error: "Invalid email" });
            continue;
          }

          // Check if exists
          const existing = await storage.getUserByEmail(email);
          if (existing) {
            results.push({ row, success: false, error: "User already exists" });
            continue;
          }

          await storage.createUser({
            email,
            passwordHash,
            role: "CLIENT",
            forcePasswordReset: true,
          });

          results.push({ row, success: true });
        } catch (error: any) {
          results.push({ row, success: false, error: error.message });
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "BULK_IMPORT",
        entity: "client",
        entityId: "bulk",
        meta: { results, count: results.filter(r => r.success).length },
      });

      res.json({ results, total: results.length, imported: results.filter(r => r.success).length });
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

          // Create user
          await storage.createUser({
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
}
