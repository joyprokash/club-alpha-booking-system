import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { storage } from "./storage";
import { authenticateToken, requireRole, generateToken, errorHandler, type AuthRequest } from "./middleware";
import { hasTimeConflict, getDayOfWeek, parseTimeToMinutes, minutesToTime, getCurrentDateToronto } from "../client/src/lib/time-utils";
import { insertUserSchema, insertHostessSchema, insertServiceSchema, insertBookingSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(express.json());

  // Configure multer for file uploads
  const uploadStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "attached_assets", "hostess-photos");
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error: any) {
        cb(error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `hostess-${uniqueSuffix}${ext}`);
    }
  });

  const upload = multer({
    storage: uploadStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed."));
      }
    }
  });

  // Rate limiters
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: { code: "RATE_LIMIT", message: "Too many attempts, please try again later" } },
    validate: { trustProxy: false },
  });

  const bookingLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: { code: "RATE_LIMIT", message: "Too many booking requests" } },
    validate: { trustProxy: false },
  });

  // ==================== AUTH ENDPOINTS ====================
  
  // Register (CLIENT only)
  app.post("/api/auth/register", authLimiter, async (req, res, next) => {
    try {
      const { email, password } = insertUserSchema.omit({ passwordHash: true, role: true }).extend({
        password: z.string().min(8),
      }).parse(req.body);

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: { code: "CONFLICT", message: "User already exists" } });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        passwordHash,
        role: "CLIENT",
        forcePasswordReset: false,
      });

      const token = generateToken(user.id);
      res.json({ token, user: { ...user, passwordHash: undefined } });
    } catch (error) {
      next(error);
    }
  });

  // Login
  app.post("/api/auth/login", authLimiter, async (req, res, next) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string(),
      }).parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });
      }

      // Check if user is banned
      if (user.banned) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Account has been suspended. Please contact support." } });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });
      }

      const token = generateToken(user.id);
      const userResponse = { ...user, passwordHash: undefined };

      if (user.forcePasswordReset) {
        return res.json({ token, user: userResponse, requiresPasswordReset: true });
      }

      res.json({ token, user: userResponse });
    } catch (error) {
      next(error);
    }
  });

  // Reset Password
  app.post("/api/auth/reset-password", authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { oldPassword, newPassword } = z.object({
        oldPassword: z.string(),
        newPassword: z.string().min(8),
      }).parse(req.body);

      if (!req.user) {
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
      }

      const validPassword = await bcrypt.compare(oldPassword, req.user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid current password" } });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      const updated = await storage.updateUser(req.user.id, { passwordHash, forcePasswordReset: false });

      res.json({ user: { ...updated, passwordHash: undefined } });
    } catch (error) {
      next(error);
    }
  });

  // Get current user
  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
    }
    res.json({ ...req.user, passwordHash: undefined });
  });

  // Alias for /api/auth/me (matches minimal endpoint map spec)
  app.get("/api/me", authenticateToken, async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
    }
    res.json({ ...req.user, passwordHash: undefined });
  });

  // Logout (client-side token removal)
  app.post("/api/auth/logout", (req, res) => {
    res.json({ success: true });
  });

  // ==================== HOSTESS ENDPOINTS ====================
  
  // Get all hostesses
  app.get("/api/hostesses", async (req, res, next) => {
    try {
      const { location, q } = req.query;
      const hostesses = await storage.getHostesses(location as string);
      
      let filtered = hostesses;
      if (q) {
        filtered = hostesses.filter(h => 
          h.displayName.toLowerCase().includes((q as string).toLowerCase())
        );
      }

      res.json(filtered);
    } catch (error) {
      next(error);
    }
  });

  // Get hostess by slug
  app.get("/api/hostesses/:slug", async (req, res, next) => {
    try {
      const { slug } = req.params;
      const hostess = await storage.getHostessBySlug(slug);
      
      if (!hostess) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Hostess not found" } });
      }

      const withSchedule = await storage.getHostessWithSchedule(hostess.id);
      res.json(withSchedule);
    } catch (error) {
      next(error);
    }
  });

  // Create hostess (admin only)
  app.post("/api/hostesses", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const schema = insertHostessSchema.extend({
        email: z.string().email(),
        password: z.string().min(8),
      });
      const { email, password, ...hostessData } = schema.parse(req.body);
      
      // Check for duplicate email first
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ 
          error: { 
            code: "DUPLICATE_EMAIL", 
            message: `A user with email ${email} already exists` 
          } 
        });
      }

      // Create the STAFF user
      const passwordHash = await bcrypt.hash(password, 10);
      let user;
      try {
        user = await storage.createUser({
          email,
          passwordHash,
          role: "STAFF",
        });
      } catch (error) {
        // Handle unique constraint violation on email (case-insensitive)
        if (error instanceof Error && error.message.toLowerCase().includes('unique')) {
          return res.status(409).json({ 
            error: { 
              code: "DUPLICATE_EMAIL", 
              message: `A user with email ${email} already exists` 
            } 
          });
        }
        throw error;
      }

      // Create the hostess linked to the user (with rollback on failure)
      let hostess;
      try {
        hostess = await storage.createHostess({
          ...hostessData,
          userId: user.id,
        });
      } catch (error) {
        // Rollback: delete the user if hostess creation fails
        await storage.deleteUser(user.id);
        throw error;
      }

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "CREATE",
        entity: "hostess",
        entityId: hostess.id,
        meta: { email, displayName: hostessData.displayName },
      });

      res.json(hostess);
    } catch (error) {
      next(error);
    }
  });

  // Update hostess (admin/reception)
  app.patch("/api/hostesses/:id", authenticateToken, requireRole("ADMIN", "RECEPTION"), async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const data = z.object({
        specialties: z.array(z.string()).optional(),
        active: z.boolean().optional(),
      }).parse(req.body);

      const hostess = await storage.updateHostess(id, data);

      if (!hostess) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Hostess not found" } });
      }

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "UPDATE",
        entity: "hostess",
        entityId: id,
        meta: { data },
      });

      res.json(hostess);
    } catch (error) {
      next(error);
    }
  });

  // Upload hostess photo (admin/reception)
  app.post("/api/hostesses/:id/photo", 
    authenticateToken, 
    requireRole("ADMIN", "RECEPTION"), 
    upload.single("photo"),
    async (req: AuthRequest, res, next) => {
      try {
        const { id } = req.params;
        
        if (!req.file) {
          return res.status(400).json({ error: { code: "BAD_REQUEST", message: "No file uploaded" } });
        }

        // Check if hostess exists before updating
        const existingHostess = await storage.getHostessById(id);
        if (!existingHostess) {
          // Clean up uploaded file if hostess doesn't exist
          await fs.unlink(req.file.path).catch(() => {});
          return res.status(404).json({ error: { code: "NOT_FOUND", message: "Hostess not found" } });
        }

        // Construct public URL for the photo
        const photoUrl = `/api/assets/hostess-photos/${req.file.filename}`;

        // Update hostess with new photo URL
        const hostess = await storage.updateHostess(id, { photoUrl });

        // Verify update succeeded
        if (!hostess) {
          await fs.unlink(req.file.path).catch(() => {});
          return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update hostess" } });
        }

        await storage.createAuditLog({
          userId: req.user?.id,
          action: "UPDATE",
          entity: "hostess",
          entityId: id,
          meta: { photoUrl },
        });

        res.json({ photoUrl, hostess });
      } catch (error) {
        // Clean up uploaded file if database update fails
        if (req.file) {
          await fs.unlink(req.file.path).catch(() => {});
        }
        next(error);
      }
    }
  );

  // Serve hostess photos
  app.use("/api/assets/hostess-photos", express.static(path.join(process.cwd(), "attached_assets", "hostess-photos")));

  // ==================== SERVICE ENDPOINTS ====================
  
  // Get all services
  app.get("/api/services", async (req, res, next) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      next(error);
    }
  });

  // Create service (admin only)
  app.post("/api/services", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const data = insertServiceSchema.parse(req.body);
      const service = await storage.createService(data);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "CREATE",
        entity: "service",
        entityId: service.id,
        meta: { data },
      });

      res.json(service);
    } catch (error) {
      next(error);
    }
  });

  // Update service
  app.patch("/api/services/:id", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const data = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(id, data);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "UPDATE",
        entity: "service",
        entityId: id,
        meta: { data },
      });

      res.json(service);
    } catch (error) {
      next(error);
    }
  });

  // Delete service
  app.delete("/api/services/:id", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      
      // Check if service is being used by any bookings
      const bookingsUsingService = await storage.getBookingsByService(id);
      if (bookingsUsingService.length > 0) {
        return res.status(400).json({ 
          error: { 
            code: "SERVICE_IN_USE", 
            message: `Cannot delete this service because it is used by ${bookingsUsingService.length} booking(s). Please delete or reassign those bookings first.` 
          } 
        });
      }

      await storage.deleteService(id);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "DELETE",
        entity: "service",
        entityId: id,
        meta: {},
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // ==================== BOOKING ENDPOINTS ====================
  
  // Helper: Enforce Reception 14-day history limit
  function enforceReceptionDateLimit(user: any, dateStr: string): boolean {
    if (user?.role !== "RECEPTION") return true;
    
    const requestedDate = new Date(dateStr);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);
    
    return requestedDate >= fourteenDaysAgo;
  }
  
  // Get bookings for a specific day
  app.get("/api/bookings/day", authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { date, location } = req.query;
      if (!date) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Date is required" } });
      }

      // Enforce Reception 14-day history limit
      if (!enforceReceptionDateLimit(req.user, date as string)) {
        return res.status(403).json({ 
          error: { 
            code: "FORBIDDEN", 
            message: "Reception users can only view bookings from the last 14 days" 
          } 
        });
      }

      const bookings = await storage.getBookingsByDate(date as string, location as string);
      res.json(bookings);
    } catch (error) {
      next(error);
    }
  });

  // Get bookings for a date range (for weekly view)
  app.get("/api/bookings/range", authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { startDate, endDate, location } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Start date and end date are required" } });
      }

      // Enforce Reception 14-day history limit for start date
      if (!enforceReceptionDateLimit(req.user, startDate as string)) {
        return res.status(403).json({ 
          error: { 
            code: "FORBIDDEN", 
            message: "Reception users can only view bookings from the last 14 days" 
          } 
        });
      }

      const bookings = await storage.getBookingsByDateRange(startDate as string, endDate as string, location as string);
      res.json(bookings);
    } catch (error) {
      next(error);
    }
  });

  // Get current user's bookings
  app.get("/api/bookings/my", authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
      }

      const bookings = await storage.getBookingsByClient(req.user.id);
      res.json(bookings);
    } catch (error) {
      next(error);
    }
  });

  // Get upcoming bookings
  app.get("/api/bookings/upcoming", authenticateToken, async (req, res, next) => {
    try {
      const bookings = await storage.getUpcomingBookings(10);
      res.json(bookings);
    } catch (error) {
      next(error);
    }
  });

  // Create booking with conflict detection
  app.post("/api/bookings", bookingLimiter, authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const schema = insertBookingSchema.extend({
        clientEmail: z.string().email().optional(),
        clientId: z.string().optional(), // Optional - derived from auth or clientEmail
        status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELED"]).optional(), // Optional - defaults to PENDING
      });
      const data = schema.parse(req.body);

      // Resolve client
      let clientId: string | undefined = data.clientId;
      if (data.clientEmail) {
        let client = await storage.getUserByEmail(data.clientEmail);
        if (!client) {
          // Auto-create client if admin/reception is booking
          if (req.user?.role === "ADMIN" || req.user?.role === "RECEPTION") {
            const tempPassword = Math.random().toString(36).slice(-10);
            const passwordHash = await bcrypt.hash(tempPassword, 10);
            client = await storage.createUser({
              email: data.clientEmail,
              passwordHash,
              role: "CLIENT",
              forcePasswordReset: true,
            });
          } else {
            return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Client not found" } });
          }
        }
        clientId = client.id;
      } else if (!clientId) {
        clientId = req.user?.id;
      }

      if (!clientId) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Client ID required" } });
      }

      // Check for conflicts
      const existingBookings = await storage.getBookingsByDate(data.date);
      const conflictingBooking = existingBookings.find(b => 
        b.status !== "CANCELED" &&
        ((b.hostessId === data.hostessId && hasTimeConflict(data.startTime, data.endTime, b.startTime, b.endTime)) ||
         (b.clientId === clientId && hasTimeConflict(data.startTime, data.endTime, b.startTime, b.endTime)))
      );

      if (conflictingBooking) {
        return res.status(409).json({
          error: {
            code: "CONFLICT",
            message: `Booking conflicts with existing appointment ${minutesToTime(conflictingBooking.startTime)}–${minutesToTime(conflictingBooking.endTime)}`,
          },
        });
      }

      const booking = await storage.createBooking({
        ...data,
        clientId,
        status: data.status || "PENDING",
      });

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "CREATE",
        entity: "booking",
        entityId: booking.id,
        meta: { data },
      });

      res.json(booking);
    } catch (error) {
      next(error);
    }
  });

  // Update booking notes (clients can update their own)
  app.patch("/api/bookings/:id/notes", authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const { notes } = z.object({ notes: z.string() }).parse(req.body);

      const booking = await storage.getBookingById(id);

      if (!booking) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking not found" } });
      }

      // Permission check - only client can update their own booking notes
      if (req.user?.role === "CLIENT" && booking.clientId !== req.user.id) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Cannot update others' bookings" } });
      }

      const updated = await storage.updateBooking(id, { notes });

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "UPDATE",
        entity: "booking",
        entityId: id,
        meta: { notes },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Reset all client bookings (ADMIN only)
  app.delete("/api/admin/bookings/reset-clients", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const deletedCount = await storage.deleteAllClientBookings();

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "DELETE",
        entity: "booking",
        entityId: "bulk",
        meta: { action: "reset_all_client_bookings", count: deletedCount },
      });

      res.json({ success: true, deletedCount });
    } catch (error) {
      next(error);
    }
  });

  // Cancel booking
  app.post("/api/bookings/:id/cancel", authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const booking = await storage.getBookingById(id);

      if (!booking) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking not found" } });
      }

      // Permission check
      if (req.user?.role === "CLIENT" && booking.clientId !== req.user.id) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Cannot cancel others' bookings" } });
      }

      const updated = await storage.updateBooking(id, { status: "CANCELED" });

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "CANCEL",
        entity: "booking",
        entityId: id,
        meta: {},
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // ==================== STAFF ENDPOINTS ====================
  
  // Get staff's linked hostess
  app.get("/api/staff/hostess", authenticateToken, requireRole("STAFF"), async (req: AuthRequest, res, next) => {
    try {
      const hostesses = await storage.getHostesses();
      const linkedHostess = hostesses.find(h => h.userId === req.user?.id);
      
      if (!linkedHostess) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "No linked hostess profile" } });
      }

      res.json(linkedHostess);
    } catch (error) {
      next(error);
    }
  });

  // Upload profile photo for staff's linked hostess (creates pending upload for admin approval)
  app.post("/api/staff/profile-photo", 
    authenticateToken, 
    requireRole("STAFF"), 
    upload.single("photo"),
    async (req: AuthRequest, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: { code: "BAD_REQUEST", message: "No file uploaded" } });
        }

        // Find the hostess linked to this staff user
        const hostesses = await storage.getHostesses();
        const hostess = hostesses.find(h => h.userId === req.user?.id);
        
        if (!hostess) {
          await fs.unlink(req.file.path).catch(() => {});
          return res.status(404).json({ error: { code: "NOT_FOUND", message: "No linked hostess profile found" } });
        }

        // Construct public URL for the photo
        const photoUrl = `/api/assets/hostess-photos/${req.file.filename}`;

        // Create a pending photo upload for admin approval
        const photoUpload = await storage.createPhotoUpload({
          hostessId: hostess.id,
          photoUrl,
          status: 'PENDING',
        });

        await storage.createAuditLog({
          userId: req.user?.id,
          action: "CREATE",
          entity: "photo_upload",
          entityId: photoUpload.id,
          meta: { photoUrl, hostessId: hostess.id, staffUpload: true },
        });

        res.json({ 
          message: "Photo uploaded successfully and pending admin approval",
          photoUpload,
          photoUrl
        });
      } catch (error) {
        // Clean up uploaded file if database insert fails
        if (req.file) {
          await fs.unlink(req.file.path).catch(() => {});
        }
        next(error);
      }
    }
  );
  
  // Get staff's today's bookings (for their linked hostess)
  app.get("/api/staff/bookings/today", authenticateToken, requireRole("STAFF"), async (req: AuthRequest, res, next) => {
    try {
      // Find staff's linked hostess
      const hostesses = await storage.getHostesses();
      const linkedHostess = hostesses.find(h => h.userId === req.user?.id);
      
      if (!linkedHostess) {
        return res.json([]);
      }

      const today = getCurrentDateToronto();
      const allBookings = await storage.getBookingsByDate(today);
      const staffBookings = allBookings.filter(b => 
        b.hostessId === linkedHostess.id && b.status !== "CANCELED"
      );

      res.json(staffBookings);
    } catch (error) {
      next(error);
    }
  });

  // Get staff's upcoming bookings (for their linked hostess)
  app.get("/api/staff/bookings/upcoming", authenticateToken, requireRole("STAFF"), async (req: AuthRequest, res, next) => {
    try {
      // Find staff's linked hostess
      const hostesses = await storage.getHostesses();
      const linkedHostess = hostesses.find(h => h.userId === req.user?.id);
      
      if (!linkedHostess) {
        return res.json([]);
      }

      const allBookings = await storage.getUpcomingBookings(30);
      const staffBookings = allBookings.filter(b => 
        b.hostessId === linkedHostess.id && b.status !== "CANCELED"
      );

      res.json(staffBookings.slice(0, 10));
    } catch (error) {
      next(error);
    }
  });

  // ==================== ANALYTICS ENDPOINTS ====================
  
  // Get revenue analytics
  app.get("/api/analytics/revenue", authenticateToken, requireRole("ADMIN"), async (req, res, next) => {
    try {
      const { startDate, endDate, groupBy = "hostess" } = req.query;
      
      const allBookings = await storage.getAllBookings();
      // Include all non-cancelled bookings (PENDING, CONFIRMED, COMPLETED)
      let filteredBookings = allBookings.filter(b => b.status !== "CANCELED");

      // Apply date filters if provided
      if (startDate) {
        filteredBookings = filteredBookings.filter(b => b.date >= (startDate as string));
      }
      if (endDate) {
        filteredBookings = filteredBookings.filter(b => b.date <= (endDate as string));
      }

      // Group revenue
      if (groupBy === "hostess") {
        const revenueByHostess = filteredBookings.reduce((acc, booking) => {
          const hostessName = booking.hostess.displayName;
          if (!acc[hostessName]) {
            acc[hostessName] = { name: hostessName, revenue: 0, bookings: 0 };
          }
          acc[hostessName].revenue += booking.service.priceCents;
          acc[hostessName].bookings += 1;
          return acc;
        }, {} as Record<string, { name: string; revenue: number; bookings: number }>);

        res.json(Object.values(revenueByHostess));
      } else if (groupBy === "location") {
        const revenueByLocation = filteredBookings.reduce((acc, booking) => {
          const location = booking.hostess.location;
          if (!acc[location]) {
            acc[location] = { name: location, revenue: 0, bookings: 0 };
          }
          acc[location].revenue += booking.service.priceCents;
          acc[location].bookings += 1;
          return acc;
        }, {} as Record<string, { name: string; revenue: number; bookings: number }>);

        res.json(Object.values(revenueByLocation));
      } else if (groupBy === "service") {
        const revenueByService = filteredBookings.reduce((acc, booking) => {
          const serviceName = booking.service.name;
          if (!acc[serviceName]) {
            acc[serviceName] = { name: serviceName, revenue: 0, bookings: 0 };
          }
          acc[serviceName].revenue += booking.service.priceCents;
          acc[serviceName].bookings += 1;
          return acc;
        }, {} as Record<string, { name: string; revenue: number; bookings: number }>);

        res.json(Object.values(revenueByService));
      }
    } catch (error) {
      next(error);
    }
  });

  // Get bookings trend over time
  app.get("/api/analytics/bookings-trend", authenticateToken, requireRole("ADMIN"), async (req, res, next) => {
    try {
      const { days = 30 } = req.query;
      const allBookings = await storage.getAllBookings();
      
      // Get bookings from last N days
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - Number(days));

      const trendData = allBookings
        .filter(b => new Date(b.date) >= startDate)
        .reduce((acc, booking) => {
          if (!acc[booking.date]) {
            acc[booking.date] = { date: booking.date, bookings: 0, confirmed: 0, cancelled: 0 };
          }
          acc[booking.date].bookings += 1;
          if (booking.status === "CONFIRMED" || booking.status === "COMPLETED") {
            acc[booking.date].confirmed += 1;
          } else if (booking.status === "CANCELED") {
            acc[booking.date].cancelled += 1;
          }
          return acc;
        }, {} as Record<string, { date: string; bookings: number; confirmed: number; cancelled: number }>);

      res.json(Object.values(trendData).sort((a, b) => a.date.localeCompare(b.date)));
    } catch (error) {
      next(error);
    }
  });

  // Get cancellation analytics
  app.get("/api/analytics/cancellations", authenticateToken, requireRole("ADMIN"), async (req, res, next) => {
    try {
      const allBookings = await storage.getAllBookings();
      
      const total = allBookings.length;
      const cancelled = allBookings.filter(b => b.status === "CANCELED").length;
      const confirmed = allBookings.filter(b => b.status === "CONFIRMED" || b.status === "COMPLETED").length;
      const pending = allBookings.filter(b => b.status === "PENDING").length;

      const cancellationRate = total > 0 ? ((cancelled / total) * 100).toFixed(2) : "0.00";

      res.json({
        total,
        cancelled,
        confirmed,
        pending,
        cancellationRate: parseFloat(cancellationRate),
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== ADMIN ENDPOINTS ====================
  
  // Get pending photo uploads (admin and reception)
  app.get("/api/admin/photo-uploads/pending", authenticateToken, requireRole("ADMIN", "RECEPTION"), async (req, res, next) => {
    try {
      const uploads = await storage.getPendingPhotoUploads();
      res.json(uploads);
    } catch (error) {
      next(error);
    }
  });

  // Approve photo upload (admin and reception)
  app.post("/api/admin/photo-uploads/:id/approve", authenticateToken, requireRole("ADMIN", "RECEPTION"), async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      
      const upload = await storage.approvePhotoUpload(id, req.user!.id);
      
      await storage.createAuditLog({
        userId: req.user?.id,
        action: "APPROVE",
        entity: "photo_upload",
        entityId: id,
        meta: { photoUrl: upload.photoUrl },
      });

      res.json({ message: "Photo approved successfully", upload });
    } catch (error) {
      next(error);
    }
  });

  // Reject photo upload (admin and reception)
  app.post("/api/admin/photo-uploads/:id/reject", authenticateToken, requireRole("ADMIN", "RECEPTION"), async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      
      const upload = await storage.rejectPhotoUpload(id, req.user!.id);
      
      await storage.createAuditLog({
        userId: req.user?.id,
        action: "REJECT",
        entity: "photo_upload",
        entityId: id,
        meta: { photoUrl: upload.photoUrl },
      });

      res.json({ message: "Photo rejected successfully", upload });
    } catch (error) {
      next(error);
    }
  });

  // Get all users (admin and reception)
  app.get("/api/admin/users", authenticateToken, requireRole("ADMIN", "RECEPTION"), async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(u => ({ ...u, passwordHash: undefined })));
    } catch (error) {
      next(error);
    }
  });

  // Update user role and hostess link
  app.patch("/api/admin/users/:id", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const { role, hostessId } = z.object({
        role: z.enum(["ADMIN", "STAFF", "RECEPTION", "CLIENT"]).optional(),
        hostessId: z.string().optional().nullable(),
      }).parse(req.body);

      const updates: any = {};
      if (role) updates.role = role;

      const user = await storage.updateUser(id, updates);

      // Update hostess link if provided
      if (hostessId !== undefined && role === "STAFF") {
        if (hostessId) {
          await storage.updateHostess(hostessId, { userId: user.id });
        }
      }

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "UPDATE",
        entity: "user",
        entityId: id,
        meta: { role, hostessId },
      });

      res.json({ ...user, passwordHash: undefined });
    } catch (error) {
      next(error);
    }
  });

  // Reset user password (admin only)
  app.post("/api/admin/users/:id/reset-password", authenticateToken, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const { password } = z.object({
        password: z.string().min(8, "Password must be at least 8 characters"),
      }).parse(req.body);

      const passwordHash = await bcrypt.hash(password, 10);
      await storage.updateUser(id, { passwordHash });

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "UPDATE",
        entity: "user",
        entityId: id,
        meta: { action: "password_reset" },
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Ban/Unban user (admin and reception)
  app.post("/api/admin/users/:id/ban", authenticateToken, requireRole("ADMIN", "RECEPTION"), async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const { banned } = z.object({
        banned: z.boolean(),
      }).parse(req.body);

      const user = await storage.updateUser(id, { banned });

      await storage.createAuditLog({
        userId: req.user?.id,
        action: "UPDATE",
        entity: "user",
        entityId: id,
        meta: { action: banned ? "banned" : "unbanned" },
      });

      res.json({ ...user, passwordHash: undefined });
    } catch (error) {
      next(error);
    }
  });

  // First-time password change (for users with forcePasswordReset)
  app.post("/api/auth/change-password", authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { newPassword } = z.object({
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      }).parse(req.body);

      if (!req.user) {
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
      }

      if (!req.user.forcePasswordReset) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Password change not required" } });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      const updated = await storage.updateUser(req.user.id, { passwordHash, forcePasswordReset: false });

      res.json({ user: { ...updated, passwordHash: undefined } });
    } catch (error) {
      next(error);
    }
  });

  // Search clients (or get all if no query)
  app.get("/api/clients", authenticateToken, async (req, res, next) => {
    try {
      const { q } = req.query;
      
      // If no query or query too short, return all clients
      const clients = q && (q as string).length >= 2 
        ? await storage.searchClients(q as string)
        : await storage.getAllClients();
        
      res.json(clients.map(c => ({ ...c, passwordHash: undefined })));
    } catch (error) {
      next(error);
    }
  });

  // Error handler
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
