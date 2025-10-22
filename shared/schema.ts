import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  pgEnum,
  boolean,
  integer,
  date,
  jsonb,
  index,
  unique
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'STAFF', 'RECEPTION', 'CLIENT']);
export const locationEnum = pgEnum('location', ['DOWNTOWN', 'WEST_END']);
export const bookingStatusEnum = pgEnum('booking_status', ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED']);
export const photoUploadStatusEnum = pgEnum('photo_upload_status', ['PENDING', 'APPROVED', 'REJECTED']);

// Users Table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default('CLIENT'),
  forcePasswordReset: boolean("force_password_reset").notNull().default(false),
  banned: boolean("banned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Hostesses Table
export const hostesses = pgTable("hostesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  specialties: text("specialties").array(),
  locations: text("locations").array().notNull().default(sql`ARRAY[]::text[]`),
  photoUrl: text("photo_url"),
  active: boolean("active").notNull().default(true),
  userId: varchar("user_id").references(() => users.id), // Link to staff user
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Services Table
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  durationMin: integer("duration_min").notNull(),
  priceCents: integer("price_cents").notNull(),
});

// Bookings Table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: date("date").notNull(),
  startTime: integer("start_time").notNull(), // minutes from midnight
  endTime: integer("end_time").notNull(), // minutes from midnight
  hostessId: varchar("hostess_id").notNull().references(() => hostesses.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  serviceId: varchar("service_id").notNull().references(() => services.id),
  status: bookingStatusEnum("status").notNull().default('PENDING'),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  hostessDateIdx: index("bookings_hostess_date_idx").on(table.hostessId, table.date),
  clientDateIdx: index("bookings_client_date_idx").on(table.clientId, table.date),
  uniqueSlot: unique("unique_booking_slot").on(table.hostessId, table.date, table.startTime),
}));

// Time Off Table
export const timeOff = pgTable("time_off", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostessId: varchar("hostess_id").notNull().references(() => hostesses.id),
  date: date("date").notNull(),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  hostessDateIdx: index("timeoff_hostess_date_idx").on(table.hostessId, table.date),
}));

// Weekly Schedule Table
export const weeklySchedule = pgTable("weekly_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostessId: varchar("hostess_id").notNull().references(() => hostesses.id),
  weekday: integer("weekday").notNull(), // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: integer("start_time"), // Shift start (minutes from midnight)
  endTime: integer("end_time"), // Shift end (minutes from midnight)
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueHostessWeekday: unique("unique_hostess_weekday").on(table.hostessId, table.weekday),
}));

// Audit Log Table
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  createdAtIdx: index("audit_log_created_at_idx").on(table.createdAt),
  entityIdx: index("audit_log_entity_idx").on(table.entity, table.entityId),
}));

// Photo Uploads Table
export const photoUploads = pgTable("photo_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostessId: varchar("hostess_id").notNull().references(() => hostesses.id),
  photoUrl: text("photo_url").notNull(),
  status: photoUploadStatusEnum("status").notNull().default('PENDING'),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => ({
  hostessIdx: index("photo_uploads_hostess_idx").on(table.hostessId),
  statusIdx: index("photo_uploads_status_idx").on(table.status),
}));

// Upcoming Schedule Table (Preview-only schedule for clients to view)
export const upcomingSchedule = pgTable("upcoming_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: date("date").notNull(),
  startTime: integer("start_time").notNull(), // minutes from midnight
  endTime: integer("end_time").notNull(), // minutes from midnight
  hostessId: varchar("hostess_id").notNull().references(() => hostesses.id),
  serviceId: varchar("service_id").references(() => services.id), // Optional service indicator
  notes: text("notes"), // Optional display note
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  hostessDateIdx: index("upcoming_schedule_hostess_date_idx").on(table.hostessId, table.date),
  dateIdx: index("upcoming_schedule_date_idx").on(table.date),
}));

// Conversations Table (messaging between clients and hostesses)
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  hostessId: varchar("hostess_id").notNull().references(() => hostesses.id),
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  clientLastReadAt: timestamp("client_last_read_at"),
  hostessLastReadAt: timestamp("hostess_last_read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  clientIdx: index("conversations_client_idx").on(table.clientId),
  hostessIdx: index("conversations_hostess_idx").on(table.hostessId),
  uniqueClientHostess: unique("unique_client_hostess").on(table.clientId, table.hostessId),
}));

// Messages Table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  conversationIdx: index("messages_conversation_idx").on(table.conversationId),
  createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
}));

// Trigger Words Table (admin-managed words for monitoring)
export const triggerWords = pgTable("trigger_words", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  word: text("word").notNull().unique(),
  addedBy: varchar("added_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  wordIdx: index("trigger_words_word_idx").on(table.word),
}));

// Flagged Conversations Table
export const flaggedConversations = pgTable("flagged_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  messageId: varchar("message_id").notNull().references(() => messages.id, { onDelete: 'cascade' }),
  triggeredWord: text("triggered_word").notNull(),
  reviewed: boolean("reviewed").notNull().default(false),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  flaggedAt: timestamp("flagged_at").notNull().defaultNow(),
}, (table) => ({
  conversationIdx: index("flagged_conversations_conversation_idx").on(table.conversationId),
  reviewedIdx: index("flagged_conversations_reviewed_idx").on(table.reviewed),
}));

// Zod Schemas for Validation
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(1),
  email: z.string().email(),
  passwordHash: z.string().min(1),
  role: z.enum(['ADMIN', 'STAFF', 'RECEPTION', 'CLIENT']),
}).omit({ id: true, createdAt: true });

export const insertHostessSchema = createInsertSchema(hostesses, {
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1),
  locations: z.array(z.enum(['DOWNTOWN', 'WEST_END'])).min(1, "At least one location is required"),
}).omit({ id: true, createdAt: true });

export const insertServiceSchema = createInsertSchema(services, {
  name: z.string().min(1),
  durationMin: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
}).omit({ id: true });

export const insertBookingSchema = createInsertSchema(bookings, {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.number().int().min(0).max(1439),
  endTime: z.number().int().min(0).max(1439),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED']),
}).omit({ id: true, createdAt: true });

export const insertTimeOffSchema = createInsertSchema(timeOff, {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.number().int().min(0).max(1439),
  endTime: z.number().int().min(0).max(1439),
}).omit({ id: true, createdAt: true });

export const insertWeeklyScheduleSchema = createInsertSchema(weeklySchedule, {
  weekday: z.number().int().min(0).max(6),
}).omit({ id: true, createdAt: true });

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, createdAt: true });

export const insertPhotoUploadSchema = createInsertSchema(photoUploads, {
  photoUrl: z.string().url(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
}).omit({ id: true, uploadedAt: true, reviewedBy: true, reviewedAt: true });

export const insertUpcomingScheduleSchema = createInsertSchema(upcomingSchedule, {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.number().int().min(0).max(1439),
  endTime: z.number().int().min(0).max(1439),
}).omit({ id: true, createdAt: true });

export const insertConversationSchema = createInsertSchema(conversations).omit({ 
  id: true, 
  createdAt: true, 
  lastMessageAt: true,
  clientLastReadAt: true,
  hostessLastReadAt: true
});

export const insertMessageSchema = createInsertSchema(messages, {
  content: z.string().min(1).max(5000),
}).omit({ id: true, createdAt: true });

export const insertTriggerWordSchema = createInsertSchema(triggerWords, {
  word: z.string().min(1).max(100).toLowerCase(),
}).omit({ id: true, createdAt: true });

export const insertFlaggedConversationSchema = createInsertSchema(flaggedConversations).omit({ 
  id: true, 
  flaggedAt: true,
  reviewed: true,
  reviewedBy: true,
  reviewedAt: true
});

// TypeScript Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Hostess = typeof hostesses.$inferSelect;
export type InsertHostess = z.infer<typeof insertHostessSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type TimeOff = typeof timeOff.$inferSelect;
export type InsertTimeOff = z.infer<typeof insertTimeOffSchema>;

export type WeeklySchedule = typeof weeklySchedule.$inferSelect;
export type InsertWeeklySchedule = z.infer<typeof insertWeeklyScheduleSchema>;

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type PhotoUpload = typeof photoUploads.$inferSelect;
export type InsertPhotoUpload = z.infer<typeof insertPhotoUploadSchema>;

export type UpcomingSchedule = typeof upcomingSchedule.$inferSelect;
export type InsertUpcomingSchedule = z.infer<typeof insertUpcomingScheduleSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type TriggerWord = typeof triggerWords.$inferSelect;
export type InsertTriggerWord = z.infer<typeof insertTriggerWordSchema>;

export type FlaggedConversation = typeof flaggedConversations.$inferSelect;
export type InsertFlaggedConversation = z.infer<typeof insertFlaggedConversationSchema>;

// Additional types for API responses
export type BookingWithDetails = Booking & {
  hostess: Hostess;
  client: User;
  service: Service;
};

export type HostessWithSchedule = Hostess & {
  weeklySchedule: WeeklySchedule[];
  timeOff: TimeOff[];
};

export type PhotoUploadWithDetails = PhotoUpload & {
  hostess: Hostess;
  reviewer?: User;
};

export type UpcomingScheduleWithDetails = UpcomingSchedule & {
  hostess: Hostess;
  service?: Service;
  uploader: User;
};

export type ConversationWithDetails = Conversation & {
  client: User;
  hostess: Hostess;
  lastMessage?: Message;
  unreadCount?: number;
};

export type MessageWithSender = Message & {
  sender: User;
};

export type TriggerWordWithDetails = TriggerWord & {
  addedByUser: User;
};

export type FlaggedConversationWithDetails = FlaggedConversation & {
  conversation: ConversationWithDetails;
  message: Message;
  reviewer?: User;
};
