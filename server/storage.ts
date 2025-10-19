import { db } from "./db";
import { eq, and, gte, lte, or, desc, asc } from "drizzle-orm";
import type {
  User,
  InsertUser,
  Hostess,
  InsertHostess,
  Service,
  InsertService,
  Booking,
  InsertBooking,
  BookingWithDetails,
  TimeOff,
  InsertTimeOff,
  WeeklySchedule,
  InsertWeeklySchedule,
  AuditLog,
  InsertAuditLog,
  HostessWithSchedule,
  PhotoUpload,
  InsertPhotoUpload,
  PhotoUploadWithDetails,
} from "@shared/schema";
import {
  users,
  hostesses,
  services,
  bookings,
  timeOff,
  weeklySchedule,
  auditLog,
  photoUploads,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Hostess operations
  getHostessById(id: string): Promise<Hostess | undefined>;
  getHostessBySlug(slug: string): Promise<Hostess | undefined>;
  getHostessWithSchedule(id: string): Promise<HostessWithSchedule | undefined>;
  getHostesses(location?: string): Promise<Hostess[]>;
  createHostess(hostess: InsertHostess): Promise<Hostess>;
  updateHostess(id: string, data: Partial<Hostess>): Promise<Hostess>;

  // Service operations
  getAllServices(): Promise<Service[]>;
  getServiceById(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, data: Partial<Service>): Promise<Service>;
  deleteService(id: string): Promise<void>;

  // Booking operations
  getBookingById(id: string): Promise<Booking | undefined>;
  getBookingWithDetails(id: string): Promise<BookingWithDetails | undefined>;
  getBookingsByDate(date: string, location?: string): Promise<BookingWithDetails[]>;
  getBookingsByDateRange(startDate: string, endDate: string, location?: string): Promise<BookingWithDetails[]>;
  getBookingsByClient(clientId: string): Promise<BookingWithDetails[]>;
  getUpcomingBookings(limit?: number): Promise<BookingWithDetails[]>;
  getAllBookings(): Promise<BookingWithDetails[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, data: Partial<Booking>): Promise<Booking>;

  // Time Off operations
  getTimeOffByHostess(hostessId: string, date?: string): Promise<TimeOff[]>;
  createTimeOff(data: InsertTimeOff): Promise<TimeOff>;

  // Weekly Schedule operations
  getWeeklyScheduleByHostess(hostessId: string): Promise<WeeklySchedule[]>;
  upsertWeeklySchedule(data: InsertWeeklySchedule): Promise<WeeklySchedule>;

  // Audit Log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { entity?: string; entityId?: string; userId?: string }): Promise<AuditLog[]>;

  // Photo Upload operations
  getPhotoUploadById(id: string): Promise<PhotoUpload | undefined>;
  getPhotoUploadWithDetails(id: string): Promise<PhotoUploadWithDetails | undefined>;
  getPendingPhotoUploads(): Promise<PhotoUploadWithDetails[]>;
  getPhotoUploadsByHostess(hostessId: string): Promise<PhotoUpload[]>;
  createPhotoUpload(data: InsertPhotoUpload): Promise<PhotoUpload>;
  approvePhotoUpload(id: string, reviewerId: string): Promise<PhotoUpload>;
  rejectPhotoUpload(id: string, reviewerId: string): Promise<PhotoUpload>;

  // Search operations
  searchClients(query: string): Promise<User[]>;
}

export class DbStorage implements IStorage {
  // User operations
  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Hostess operations
  async getHostessById(id: string): Promise<Hostess | undefined> {
    const result = await db.select().from(hostesses).where(eq(hostesses.id, id)).limit(1);
    return result[0];
  }

  async getHostessBySlug(slug: string): Promise<Hostess | undefined> {
    const result = await db.select().from(hostesses).where(eq(hostesses.slug, slug)).limit(1);
    return result[0];
  }

  async getHostessWithSchedule(id: string): Promise<HostessWithSchedule | undefined> {
    const hostess = await this.getHostessById(id);
    if (!hostess) return undefined;

    const schedule = await this.getWeeklyScheduleByHostess(id);
    const timeOffData = await this.getTimeOffByHostess(id);

    return {
      ...hostess,
      weeklySchedule: schedule,
      timeOff: timeOffData,
    };
  }

  async getHostesses(location?: string): Promise<Hostess[]> {
    if (location) {
      return await db.select().from(hostesses).where(eq(hostesses.location, location as any));
    }
    return await db.select().from(hostesses);
  }

  async createHostess(hostess: InsertHostess): Promise<Hostess> {
    const result = await db.insert(hostesses).values(hostess).returning();
    return result[0];
  }

  async updateHostess(id: string, data: Partial<Hostess>): Promise<Hostess> {
    const result = await db.update(hostesses).set(data).where(eq(hostesses.id, id)).returning();
    return result[0];
  }

  // Service operations
  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services).orderBy(asc(services.durationMin));
  }

  async getServiceById(id: string): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
    return result[0];
  }

  async createService(service: InsertService): Promise<Service> {
    const result = await db.insert(services).values(service).returning();
    return result[0];
  }

  async updateService(id: string, data: Partial<Service>): Promise<Service> {
    const result = await db.update(services).set(data).where(eq(services.id, id)).returning();
    return result[0];
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  // Booking operations
  async getBookingById(id: string): Promise<Booking | undefined> {
    const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return result[0];
  }

  async getBookingWithDetails(id: string): Promise<BookingWithDetails | undefined> {
    const result = await db
      .select()
      .from(bookings)
      .leftJoin(hostesses, eq(bookings.hostessId, hostesses.id))
      .leftJoin(users, eq(bookings.clientId, users.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!result[0] || !result[0].hostesses || !result[0].users || !result[0].services) {
      return undefined;
    }

    return {
      ...result[0].bookings,
      hostess: result[0].hostesses,
      client: result[0].users,
      service: result[0].services,
    };
  }

  async getBookingsByDate(date: string, location?: string): Promise<BookingWithDetails[]> {
    let query = db
      .select()
      .from(bookings)
      .leftJoin(hostesses, eq(bookings.hostessId, hostesses.id))
      .leftJoin(users, eq(bookings.clientId, users.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(eq(bookings.date, date));

    const result = await query;

    return result
      .filter(r => r.hostesses && r.users && r.services)
      .filter(r => !location || r.hostesses?.location === location)
      .map(r => ({
        ...r.bookings,
        hostess: r.hostesses!,
        client: r.users!,
        service: r.services!,
      }));
  }

  async getBookingsByDateRange(startDate: string, endDate: string, location?: string): Promise<BookingWithDetails[]> {
    const result = await db
      .select()
      .from(bookings)
      .leftJoin(hostesses, eq(bookings.hostessId, hostesses.id))
      .leftJoin(users, eq(bookings.clientId, users.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(and(gte(bookings.date, startDate), lte(bookings.date, endDate)));

    return result
      .filter(r => r.hostesses && r.users && r.services)
      .filter(r => !location || r.hostesses?.location === location)
      .map(r => ({
        ...r.bookings,
        hostess: r.hostesses!,
        client: r.users!,
        service: r.services!,
      }));
  }

  async getBookingsByClient(clientId: string): Promise<BookingWithDetails[]> {
    const result = await db
      .select()
      .from(bookings)
      .leftJoin(hostesses, eq(bookings.hostessId, hostesses.id))
      .leftJoin(users, eq(bookings.clientId, users.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(eq(bookings.clientId, clientId))
      .orderBy(desc(bookings.date));

    return result
      .filter(r => r.hostesses && r.users && r.services)
      .map(r => ({
        ...r.bookings,
        hostess: r.hostesses!,
        client: r.users!,
        service: r.services!,
      }));
  }

  async getUpcomingBookings(limit: number = 10): Promise<BookingWithDetails[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db
      .select()
      .from(bookings)
      .leftJoin(hostesses, eq(bookings.hostessId, hostesses.id))
      .leftJoin(users, eq(bookings.clientId, users.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(gte(bookings.date, today))
      .orderBy(asc(bookings.date), asc(bookings.startTime))
      .limit(limit);

    return result
      .filter(r => r.hostesses && r.users && r.services)
      .map(r => ({
        ...r.bookings,
        hostess: r.hostesses!,
        client: r.users!,
        service: r.services!,
      }));
  }

  async getAllBookings(): Promise<BookingWithDetails[]> {
    const result = await db
      .select()
      .from(bookings)
      .leftJoin(hostesses, eq(bookings.hostessId, hostesses.id))
      .leftJoin(users, eq(bookings.clientId, users.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .orderBy(asc(bookings.date), asc(bookings.startTime));

    return result
      .filter(r => r.hostesses && r.users && r.services)
      .map(r => ({
        ...r.bookings,
        hostess: r.hostesses!,
        client: r.users!,
        service: r.services!,
      }));
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const result = await db.insert(bookings).values(booking).returning();
    return result[0];
  }

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    const result = await db.update(bookings).set(data).where(eq(bookings.id, id)).returning();
    return result[0];
  }

  // Time Off operations
  async getTimeOffByHostess(hostessId: string, date?: string): Promise<TimeOff[]> {
    if (date) {
      return await db
        .select()
        .from(timeOff)
        .where(and(eq(timeOff.hostessId, hostessId), eq(timeOff.date, date)));
    }
    return await db.select().from(timeOff).where(eq(timeOff.hostessId, hostessId));
  }

  async createTimeOff(data: InsertTimeOff): Promise<TimeOff> {
    const result = await db.insert(timeOff).values(data).returning();
    return result[0];
  }

  // Weekly Schedule operations
  async getWeeklyScheduleByHostess(hostessId: string): Promise<WeeklySchedule[]> {
    return await db
      .select()
      .from(weeklySchedule)
      .where(eq(weeklySchedule.hostessId, hostessId))
      .orderBy(asc(weeklySchedule.weekday));
  }

  async upsertWeeklySchedule(data: InsertWeeklySchedule): Promise<WeeklySchedule> {
    const existing = await db
      .select()
      .from(weeklySchedule)
      .where(
        and(
          eq(weeklySchedule.hostessId, data.hostessId),
          eq(weeklySchedule.weekday, data.weekday)
        )
      )
      .limit(1);

    if (existing[0]) {
      const result = await db
        .update(weeklySchedule)
        .set(data)
        .where(eq(weeklySchedule.id, existing[0].id))
        .returning();
      return result[0];
    }

    const result = await db.insert(weeklySchedule).values(data).returning();
    return result[0];
  }

  // Audit Log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLog).values(log).returning();
    return result[0];
  }

  async getAuditLogs(filters?: { entity?: string; entityId?: string; userId?: string }): Promise<AuditLog[]> {
    let query = db.select().from(auditLog);

    const conditions = [];
    if (filters?.entity) conditions.push(eq(auditLog.entity, filters.entity));
    if (filters?.entityId) conditions.push(eq(auditLog.entityId, filters.entityId));
    if (filters?.userId) conditions.push(eq(auditLog.userId, filters.userId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(auditLog.createdAt));
  }

  // Photo Upload operations
  async getPhotoUploadById(id: string): Promise<PhotoUpload | undefined> {
    const result = await db.select().from(photoUploads).where(eq(photoUploads.id, id)).limit(1);
    return result[0];
  }

  async getPhotoUploadWithDetails(id: string): Promise<PhotoUploadWithDetails | undefined> {
    const result = await db
      .select()
      .from(photoUploads)
      .leftJoin(hostesses, eq(photoUploads.hostessId, hostesses.id))
      .leftJoin(users, eq(photoUploads.reviewedBy, users.id))
      .where(eq(photoUploads.id, id))
      .limit(1);
    
    if (!result[0] || !result[0].hostesses) return undefined;
    
    return {
      ...result[0].photo_uploads,
      hostess: result[0].hostesses,
      reviewer: result[0].users || undefined,
    };
  }

  async getPendingPhotoUploads(): Promise<PhotoUploadWithDetails[]> {
    const results = await db
      .select()
      .from(photoUploads)
      .leftJoin(hostesses, eq(photoUploads.hostessId, hostesses.id))
      .leftJoin(users, eq(photoUploads.reviewedBy, users.id))
      .where(eq(photoUploads.status, 'PENDING'))
      .orderBy(desc(photoUploads.uploadedAt));
    
    return results
      .filter(r => r.hostesses)
      .map(r => ({
        ...r.photo_uploads,
        hostess: r.hostesses!,
        reviewer: r.users || undefined,
      }));
  }

  async getPhotoUploadsByHostess(hostessId: string): Promise<PhotoUpload[]> {
    return await db
      .select()
      .from(photoUploads)
      .where(eq(photoUploads.hostessId, hostessId))
      .orderBy(desc(photoUploads.uploadedAt));
  }

  async createPhotoUpload(data: InsertPhotoUpload): Promise<PhotoUpload> {
    const result = await db.insert(photoUploads).values(data).returning();
    return result[0];
  }

  async approvePhotoUpload(id: string, reviewerId: string): Promise<PhotoUpload> {
    // Get the upload
    const upload = await this.getPhotoUploadById(id);
    if (!upload) {
      throw new Error('Photo upload not found');
    }

    // Update the upload status
    const updatedUpload = await db
      .update(photoUploads)
      .set({ 
        status: 'APPROVED', 
        reviewedBy: reviewerId, 
        reviewedAt: new Date() 
      })
      .where(eq(photoUploads.id, id))
      .returning();

    // Update the hostess photoUrl
    await db
      .update(hostesses)
      .set({ photoUrl: upload.photoUrl })
      .where(eq(hostesses.id, upload.hostessId));

    return updatedUpload[0];
  }

  async rejectPhotoUpload(id: string, reviewerId: string): Promise<PhotoUpload> {
    const result = await db
      .update(photoUploads)
      .set({ 
        status: 'REJECTED', 
        reviewedBy: reviewerId, 
        reviewedAt: new Date() 
      })
      .where(eq(photoUploads.id, id))
      .returning();
    
    return result[0];
  }

  // Search operations
  async searchClients(query: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.role, 'CLIENT'), eq(users.email, query)))
      .limit(10);
  }
}

export const storage = new DbStorage();
