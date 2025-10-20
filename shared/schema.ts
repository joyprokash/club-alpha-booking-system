import { sql } from "drizzle-orm";
import { 
  mysqlTable, 
  text, 
  varchar, 
  timestamp, 
  mysqlEnum,
  boolean,
  int,
  date,
  json,
  index,
  unique
} from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: varchar("username", { length: 191 }).notNull().unique(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: mysqlEnum("role", ['ADMIN', 'STAFF', 'RECEPTION', 'CLIENT']).notNull().default('CLIENT'),
  forcePasswordReset: boolean("force_password_reset").notNull().default(false),
  banned: boolean("banned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Hostesses Table
export const hostesses = mysqlTable("hostesses", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: varchar("slug", { length: 191 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  bio: text("bio"),
  specialties: json("specialties").$type<string[]>(),
  location: mysqlEnum("location", ['DOWNTOWN', 'WEST_END']).notNull(),
  photoUrl: text("photo_url"),
  active: boolean("active").notNull().default(true),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Services Table
export const services = mysqlTable("services", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  durationMin: int("duration_min").notNull(),
  priceCents: int("price_cents").notNull(),
});

// Bookings Table
export const bookings = mysqlTable("bookings", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: date("date").notNull(),
  startTime: int("start_time").notNull(),
  endTime: int("end_time").notNull(),
  hostessId: varchar("hostess_id", { length: 36 }).notNull().references(() => hostesses.id),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => users.id),
  serviceId: varchar("service_id", { length: 36 }).notNull().references(() => services.id),
  status: mysqlEnum("status", ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED']).notNull().default('PENDING'),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  hostessDateIdx: index("bookings_hostess_date_idx").on(table.hostessId, table.date),
  clientDateIdx: index("bookings_client_date_idx").on(table.clientId, table.date),
  uniqueSlot: unique("unique_booking_slot").on(table.hostessId, table.date, table.startTime),
}));

// Time Off Table
export const timeOff = mysqlTable("time_off", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  hostessId: varchar("hostess_id", { length: 36 }).notNull().references(() => hostesses.id),
  date: date("date").notNull(),
  startTime: int("start_time").notNull(),
  endTime: int("end_time").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  hostessDateIdx: index("timeoff_hostess_date_idx").on(table.hostessId, table.date),
}));

// Weekly Schedule Table
export const weeklySchedule = mysqlTable("weekly_schedule", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  hostessId: varchar("hostess_id", { length: 36 }).notNull().references(() => hostesses.id),
  weekday: int("weekday").notNull(),
  startTime: int("start_time"),
  endTime: int("end_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueHostessWeekday: unique("unique_hostess_weekday").on(table.hostessId, table.weekday),
}));

// Audit Log Table
export const auditLog = mysqlTable("audit_log", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  meta: json("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  createdAtIdx: index("audit_log_created_at_idx").on(table.createdAt),
  entityIdx: index("audit_log_entity_idx").on(table.entity, table.entityId),
}));

// Photo Uploads Table
export const photoUploads = mysqlTable("photo_uploads", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  hostessId: varchar("hostess_id", { length: 36 }).notNull().references(() => hostesses.id),
  photoUrl: text("photo_url").notNull(),
  status: mysqlEnum("status", ['PENDING', 'APPROVED', 'REJECTED']).notNull().default('PENDING'),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => ({
  hostessIdx: index("photo_uploads_hostess_idx").on(table.hostessId),
  statusIdx: index("photo_uploads_status_idx").on(table.status),
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
  location: z.enum(['DOWNTOWN', 'WEST_END']),
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
