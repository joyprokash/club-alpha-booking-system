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

// Users Table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default('CLIENT'),
  forcePasswordReset: boolean("force_password_reset").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Hostesses Table
export const hostesses = pgTable("hostesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  specialties: text("specialties").array(),
  location: locationEnum("location").notNull(),
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
  startTimeDay: integer("start_time_day"), // Day shift start (minutes from midnight)
  endTimeDay: integer("end_time_day"), // Day shift end
  startTimeNight: integer("start_time_night"), // Night shift start
  endTimeNight: integer("end_time_night"), // Night shift end
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

// Zod Schemas for Validation
export const insertUserSchema = createInsertSchema(users, {
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
