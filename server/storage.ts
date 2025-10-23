import { db } from "./db";
import { eq, and, gte, lte, or, desc, asc, inArray, sql } from "drizzle-orm";
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
  UpcomingSchedule,
  InsertUpcomingSchedule,
  UpcomingScheduleWithDetails,
  Conversation,
  InsertConversation,
  ConversationWithDetails,
  Message,
  InsertMessage,
  MessageWithSender,
  TriggerWord,
  InsertTriggerWord,
  TriggerWordWithDetails,
  FlaggedConversation,
  InsertFlaggedConversation,
  FlaggedConversationWithDetails,
  Review,
  InsertReview,
  ReviewWithDetails,
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
  upcomingSchedule,
  conversations,
  messages,
  triggerWords,
  flaggedConversations,
  reviews,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
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
  getBookingsByService(serviceId: string): Promise<Booking[]>;

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
  deleteAllClientBookings(): Promise<number>;

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
  getAllClients(): Promise<User[]>;
  searchClients(query: string): Promise<User[]>;

  // Upcoming Schedule operations
  getUpcomingSchedule(startDate: string, endDate: string): Promise<UpcomingScheduleWithDetails[]>;
  createUpcomingSchedule(data: InsertUpcomingSchedule): Promise<UpcomingSchedule>;
  deleteUpcomingSchedule(id: string): Promise<void>;
  clearUpcomingSchedule(): Promise<void>;
  getServices(): Promise<Service[]>;

  // Hostess lookup by userId
  getHostessByUserId(userId: string): Promise<Hostess | undefined>;

  // Messaging operations
  getConversations(userId: string): Promise<ConversationWithDetails[]>;
  getConversationById(id: string): Promise<Conversation | undefined>;
  getOrCreateConversation(clientId: string, hostessId: string): Promise<ConversationWithDetails>;
  updateConversationLastMessage(id: string): Promise<void>;
  markConversationAsRead(conversationId: string, userId: string): Promise<void>;
  
  getMessages(conversationId: string): Promise<MessageWithSender[]>;
  createMessage(data: InsertMessage): Promise<Message>;

  // Trigger Words operations (admin)
  getTriggerWords(): Promise<TriggerWord[]>;
  getTriggerWordsWithDetails(): Promise<TriggerWordWithDetails[]>;
  createTriggerWord(data: InsertTriggerWord): Promise<TriggerWord>;
  deleteTriggerWord(id: string): Promise<void>;

  // Flagged Conversations operations (admin)
  getFlaggedConversations(reviewed?: boolean): Promise<FlaggedConversationWithDetails[]>;
  createFlaggedConversation(data: InsertFlaggedConversation): Promise<FlaggedConversation>;
  markFlaggedConversationAsReviewed(id: string, reviewerId: string): Promise<void>;

  // Review operations
  getReviewsByHostess(hostessId: string, approvedOnly?: boolean): Promise<ReviewWithDetails[]>;
  getReviewsByClient(clientId: string): Promise<ReviewWithDetails[]>;
  getReviewById(id: string): Promise<ReviewWithDetails | undefined>;
  canClientReview(bookingId: string, clientId: string): Promise<boolean>;
  createReview(data: InsertReview): Promise<Review>;
  getPendingReviews(): Promise<ReviewWithDetails[]>;
  approveReview(id: string, reviewerId: string): Promise<Review>;
  rejectReview(id: string, reviewerId: string): Promise<Review>;
  getHostessAverageRating(hostessId: string): Promise<{ average: number; count: number }>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
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

  async deleteUser(id: string): Promise<void> {
    // Delete all related records first to avoid foreign key constraint violations
    
    // Delete user's bookings (as client)
    await db.delete(bookings).where(eq(bookings.clientId, id));
    
    // Delete user's messages (as sender)
    await db.delete(messages).where(eq(messages.senderId, id));
    
    // Delete user's conversations (as client)
    await db.delete(conversations).where(eq(conversations.clientId, id));
    
    // Delete user's trigger words (as adder)
    await db.delete(triggerWords).where(eq(triggerWords.addedBy, id));
    
    // Delete user's reviews (as client)
    await db.delete(reviews).where(eq(reviews.clientId, id));
    
    // Update flagged conversations to remove reviewer reference
    await db.update(flaggedConversations)
      .set({ reviewedBy: null })
      .where(eq(flaggedConversations.reviewedBy, id));
    
    // Update photo uploads to remove reviewer reference
    await db.update(photoUploads)
      .set({ reviewedBy: null })
      .where(eq(photoUploads.reviewedBy, id));
    
    // If user is linked to a hostess, unlink it
    await db.update(hostesses)
      .set({ userId: null })
      .where(eq(hostesses.userId, id));
    
    // Finally, delete the user
    await db.delete(users).where(eq(users.id, id));
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
      return await db.select().from(hostesses).where(sql`${hostesses.locations} @> ARRAY[${location}]::text[]`);
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

  async getBookingsByService(serviceId: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.serviceId, serviceId));
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
      .filter(r => !location || r.hostesses?.locations?.includes(location))
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
      .filter(r => !location || r.hostesses?.locations?.includes(location))
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

  async deleteAllClientBookings(): Promise<number> {
    // Get all CLIENT user IDs
    const clientUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, "CLIENT"));
    const clientIds = clientUsers.map(u => u.id);
    
    if (clientIds.length === 0) {
      return 0;
    }
    
    // Delete all bookings made by CLIENT users
    const result = await db.delete(bookings).where(
      inArray(bookings.clientId, clientIds)
    ).returning();
    
    return result.length;
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
  async getAllClients(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, 'CLIENT'))
      .orderBy(users.email);
  }

  async searchClients(query: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.role, 'CLIENT'), eq(users.email, query)))
      .limit(10);
  }

  // Upcoming Schedule operations
  async getUpcomingSchedule(startDate: string, endDate: string): Promise<UpcomingScheduleWithDetails[]> {
    const results = await db
      .select()
      .from(upcomingSchedule)
      .leftJoin(hostesses, eq(upcomingSchedule.hostessId, hostesses.id))
      .leftJoin(services, eq(upcomingSchedule.serviceId, services.id))
      .leftJoin(users, eq(upcomingSchedule.uploadedBy, users.id))
      .where(and(
        gte(upcomingSchedule.date, startDate),
        lte(upcomingSchedule.date, endDate)
      ))
      .orderBy(upcomingSchedule.date, upcomingSchedule.startTime);

    return results.map(row => ({
      ...row.upcoming_schedule!,
      hostess: row.hostesses!,
      service: row.services || undefined,
      uploader: row.users!,
    }));
  }

  async createUpcomingSchedule(data: InsertUpcomingSchedule): Promise<UpcomingSchedule> {
    const result = await db.insert(upcomingSchedule).values(data).returning();
    return result[0];
  }

  async deleteUpcomingSchedule(id: string): Promise<void> {
    await db.delete(upcomingSchedule).where(eq(upcomingSchedule.id, id));
  }

  async clearUpcomingSchedule(): Promise<void> {
    await db.delete(upcomingSchedule);
  }

  async getServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  // Hostess lookup by userId
  async getHostessByUserId(userId: string): Promise<Hostess | undefined> {
    const result = await db
      .select()
      .from(hostesses)
      .where(eq(hostesses.userId, userId))
      .limit(1);
    return result[0];
  }

  // Messaging operations
  async getConversations(userId: string): Promise<ConversationWithDetails[]> {
    // Get conversations where user is either the client or the hostess (via staff userId)
    const staffHostess = await this.getHostessByUserId(userId);
    
    const results = await db
      .select()
      .from(conversations)
      .leftJoin(users, eq(conversations.clientId, users.id))
      .leftJoin(hostesses, eq(conversations.hostessId, hostesses.id))
      .where(
        staffHostess 
          ? or(eq(conversations.clientId, userId), eq(conversations.hostessId, staffHostess.id))!
          : eq(conversations.clientId, userId)
      )
      .orderBy(desc(conversations.lastMessageAt));

    // Get last message and unread count for each conversation
    const conversationsWithDetails: ConversationWithDetails[] = [];
    
    for (const row of results) {
      const conversation = row.conversations;
      
      // Get last message
      const lastMessageResult = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // Calculate unread count
      const isClient = conversation.clientId === userId;
      const lastReadAt = isClient ? conversation.clientLastReadAt : conversation.hostessLastReadAt;
      
      let unreadCount = 0;
      if (lastReadAt) {
        const unreadResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(and(
            eq(messages.conversationId, conversation.id),
            gte(messages.createdAt, lastReadAt)
          ));
        unreadCount = Number(unreadResult[0]?.count || 0);
      } else {
        // If never read, count all messages not sent by this user
        const unreadResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(and(
            eq(messages.conversationId, conversation.id),
            sql`${messages.senderId} != ${userId}`
          ));
        unreadCount = Number(unreadResult[0]?.count || 0);
      }

      conversationsWithDetails.push({
        ...conversation,
        client: row.users!,
        hostess: row.hostesses!,
        lastMessage: lastMessageResult[0] || undefined,
        unreadCount,
      });
    }

    return conversationsWithDetails;
  }

  async getConversationById(id: string): Promise<Conversation | undefined> {
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    return result[0];
  }

  async getOrCreateConversation(clientId: string, hostessId: string): Promise<ConversationWithDetails> {
    // Try to find existing conversation
    const existingResults = await db
      .select()
      .from(conversations)
      .leftJoin(users, eq(conversations.clientId, users.id))
      .leftJoin(hostesses, eq(conversations.hostessId, hostesses.id))
      .where(and(
        eq(conversations.clientId, clientId),
        eq(conversations.hostessId, hostessId)
      ))
      .limit(1);

    if (existingResults.length > 0) {
      const row = existingResults[0];
      return {
        ...row.conversations,
        client: row.users!,
        hostess: row.hostesses!,
      };
    }

    // Create new conversation
    const newConvResult = await db
      .insert(conversations)
      .values({ clientId, hostessId })
      .returning();

    const newConv = newConvResult[0];

    // Fetch client and hostess data
    const client = await this.getUserById(clientId);
    const hostess = await this.getHostessById(hostessId);

    return {
      ...newConv,
      client: client!,
      hostess: hostess!,
    };
  }

  async updateConversationLastMessage(id: string): Promise<void> {
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, id));
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    // Check if user is the client or hostess (via staff userId)
    const conversation = await this.getConversationById(conversationId);
    if (!conversation) return;

    const staffHostess = await this.getHostessByUserId(userId);
    const isClient = conversation.clientId === userId;
    const isHostess = staffHostess && conversation.hostessId === staffHostess.id;

    if (!isClient && !isHostess) return;

    // Update the appropriate lastReadAt timestamp using SQL NOW() to avoid Date serialization issues
    await db
      .update(conversations)
      .set(isClient ? { clientLastReadAt: sql`NOW()` } : { hostessLastReadAt: sql`NOW()` })
      .where(eq(conversations.id, conversationId));
  }

  async getMessages(conversationId: string): Promise<MessageWithSender[]> {
    const results = await db
      .select()
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    return results.map(row => ({
      ...row.messages,
      sender: row.users!,
    }));
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(data).returning();
    return result[0];
  }

  // Trigger Words operations
  async getTriggerWords(): Promise<TriggerWord[]> {
    return await db.select().from(triggerWords).orderBy(triggerWords.word);
  }

  async getTriggerWordsWithDetails(): Promise<TriggerWordWithDetails[]> {
    const results = await db
      .select()
      .from(triggerWords)
      .leftJoin(users, eq(triggerWords.addedBy, users.id))
      .orderBy(triggerWords.word);

    return results.map(row => ({
      ...row.trigger_words,
      addedByUser: row.users!,
    }));
  }

  async createTriggerWord(data: InsertTriggerWord): Promise<TriggerWord> {
    const result = await db.insert(triggerWords).values(data).returning();
    return result[0];
  }

  async deleteTriggerWord(id: string): Promise<void> {
    await db.delete(triggerWords).where(eq(triggerWords.id, id));
  }

  // Flagged Conversations operations
  async getFlaggedConversations(reviewed?: boolean): Promise<FlaggedConversationWithDetails[]> {
    const conditions = reviewed !== undefined ? eq(flaggedConversations.reviewed, reviewed) : undefined;

    const results = await db
      .select()
      .from(flaggedConversations)
      .leftJoin(conversations, eq(flaggedConversations.conversationId, conversations.id))
      .leftJoin(messages, eq(flaggedConversations.messageId, messages.id))
      .leftJoin(users, eq(flaggedConversations.reviewedBy, users.id))
      .where(conditions)
      .orderBy(desc(flaggedConversations.flaggedAt));

    // Enrich conversations with client and hostess data
    const enriched: FlaggedConversationWithDetails[] = [];

    for (const row of results) {
      const client = await this.getUserById(row.conversations!.clientId);
      const hostess = await this.getHostessById(row.conversations!.hostessId);

      enriched.push({
        ...row.flagged_conversations,
        conversation: {
          ...row.conversations!,
          client: client!,
          hostess: hostess!,
        },
        message: row.messages!,
        reviewer: row.users || undefined,
      });
    }

    return enriched;
  }

  async createFlaggedConversation(data: InsertFlaggedConversation): Promise<FlaggedConversation> {
    const result = await db.insert(flaggedConversations).values(data).returning();
    return result[0];
  }

  async markFlaggedConversationAsReviewed(id: string, reviewerId: string): Promise<void> {
    await db
      .update(flaggedConversations)
      .set({ 
        reviewed: true, 
        reviewedBy: reviewerId, 
        reviewedAt: new Date() 
      })
      .where(eq(flaggedConversations.id, id));
  }

  // Review operations
  async getReviewsByHostess(hostessId: string, approvedOnly: boolean = false): Promise<ReviewWithDetails[]> {
    const conditions = approvedOnly 
      ? and(eq(reviews.hostessId, hostessId), eq(reviews.status, 'APPROVED'))
      : eq(reviews.hostessId, hostessId);

    const results = await db
      .select()
      .from(reviews)
      .leftJoin(users, eq(reviews.clientId, users.id))
      .leftJoin(hostesses, eq(reviews.hostessId, hostesses.id))
      .leftJoin(bookings, eq(reviews.bookingId, bookings.id))
      .where(conditions)
      .orderBy(desc(reviews.createdAt));

    return results.map(row => ({
      ...row.reviews,
      client: row.users!,
      hostess: row.hostesses!,
      booking: row.bookings!,
      reviewer: undefined,
    }));
  }

  async getReviewsByClient(clientId: string): Promise<ReviewWithDetails[]> {
    const results = await db
      .select()
      .from(reviews)
      .leftJoin(users, eq(reviews.clientId, users.id))
      .leftJoin(hostesses, eq(reviews.hostessId, hostesses.id))
      .leftJoin(bookings, eq(reviews.bookingId, bookings.id))
      .where(eq(reviews.clientId, clientId))
      .orderBy(desc(reviews.createdAt));

    return results.map(row => ({
      ...row.reviews,
      client: row.users!,
      hostess: row.hostesses!,
      booking: row.bookings!,
      reviewer: undefined,
    }));
  }

  async getReviewById(id: string): Promise<ReviewWithDetails | undefined> {
    const results = await db
      .select()
      .from(reviews)
      .leftJoin(users, eq(reviews.clientId, users.id))
      .leftJoin(hostesses, eq(reviews.hostessId, hostesses.id))
      .leftJoin(bookings, eq(reviews.bookingId, bookings.id))
      .where(eq(reviews.id, id))
      .limit(1);

    if (results.length === 0) return undefined;

    const row = results[0];
    return {
      ...row.reviews,
      client: row.users!,
      hostess: row.hostesses!,
      booking: row.bookings!,
      reviewer: undefined,
    };
  }

  async canClientReview(bookingId: string, clientId: string): Promise<boolean> {
    // Check if booking exists and belongs to client
    const booking = await db.select().from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.clientId, clientId)))
      .limit(1);

    if (booking.length === 0) return false;

    // Check if review already exists for this booking
    const existingReview = await db.select().from(reviews)
      .where(eq(reviews.bookingId, bookingId))
      .limit(1);

    return existingReview.length === 0;
  }

  async createReview(data: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values(data).returning();
    return result[0];
  }

  async getPendingReviews(): Promise<ReviewWithDetails[]> {
    const results = await db
      .select()
      .from(reviews)
      .leftJoin(users, eq(reviews.clientId, users.id))
      .leftJoin(hostesses, eq(reviews.hostessId, hostesses.id))
      .leftJoin(bookings, eq(reviews.bookingId, bookings.id))
      .where(eq(reviews.status, 'PENDING'))
      .orderBy(desc(reviews.createdAt));

    return results.map(row => ({
      ...row.reviews,
      client: row.users!,
      hostess: row.hostesses!,
      booking: row.bookings!,
      reviewer: undefined,
    }));
  }

  async approveReview(id: string, reviewerId: string): Promise<Review> {
    const result = await db
      .update(reviews)
      .set({ 
        status: 'APPROVED', 
        reviewedBy: reviewerId, 
        reviewedAt: sql`NOW()` 
      })
      .where(eq(reviews.id, id))
      .returning();
    
    return result[0];
  }

  async rejectReview(id: string, reviewerId: string): Promise<Review> {
    const result = await db
      .update(reviews)
      .set({ 
        status: 'REJECTED', 
        reviewedBy: reviewerId, 
        reviewedAt: sql`NOW()` 
      })
      .where(eq(reviews.id, id))
      .returning();
    
    return result[0];
  }

  async getHostessAverageRating(hostessId: string): Promise<{ average: number; count: number }> {
    const result = await db
      .select({
        average: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(and(
        eq(reviews.hostessId, hostessId),
        eq(reviews.status, 'APPROVED')
      ));

    return {
      average: Number(result[0]?.average || 0),
      count: Number(result[0]?.count || 0),
    };
  }
}

export const storage = new DbStorage();
