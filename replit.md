# Club Alpha Booking Platform

## Overview
A production-ready multi-location hostess booking platform with advanced scheduling, role-based access control, and comprehensive admin tools. Built for managing appointments across Downtown and West End locations with real-time conflict detection and double-booking prevention.

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, TanStack Query, Wouter routing, Tailwind CSS, shadcn/ui
- **Backend**: Node.js 20, Express, Drizzle ORM, Zod validation
- **Database**: PostgreSQL (Supabase)
- **Auth**: JWT with role-based access (ADMIN, STAFF, RECEPTION, CLIENT)
- **Time Handling**: date-fns, date-fns-tz (America/Toronto timezone)

## Recent Changes
- 2025-10-17: **Homepage with login credentials** - Created landing page displaying demo credentials for ADMIN, RECEPTION, and CLIENT roles. Shows platform features with navigation to login or hostess browsing. E2E tests confirmed.
- 2025-10-17: **Role-based login redirects** - Implemented automatic redirects after login: ADMIN→/admin/dashboard, RECEPTION→/admin/calendar, STAFF→/staff/schedule, CLIENT→/hostesses. E2E tests confirmed all roles redirect correctly.
- 2025-10-17: **Client booking flow bug fixes** - Fixed critical bugs preventing client bookings: added /my-bookings route, fixed availability query URL construction, made clientId/status optional in validation (derived server-side), added explicit query refetch after booking creation. E2E tests passing.
- 2025-10-17: Analytics dashboard completed - revenue metrics, booking trends, cancellation rates with recharts visualization
- 2025-10-17: Client self-service features - add notes and request cancellation on bookings
- 2025-10-17: Photo upload for hostesses with multer integration
- 2025-10-17: Auth flow fixed - JWT tokens stored in localStorage with proper Authorization headers
- 2025-01-17: Initial project scaffold with complete schema and frontend components
- Complete database schema with users, hostesses, services, bookings, time-off, weekly schedules, and audit logs
- Authentication system with JWT and role-based access
- Admin daily grid with 15-minute slots (10:00-23:00) and quick booking modal
- Client-facing hostess discovery and booking interface
- Services CRUD management
- Database seed script with comprehensive sample data (10 services, 20 hostesses, 50 clients, bookings, schedules)

## User Roles & Permissions
### ADMIN
- Full access to all features
- User management and role assignments
- Hostess ↔ Staff linking
- Bulk client import
- Complete calendar view and booking management
- Import/export schedules
- Services CRUD
- Audit log viewing

### RECEPTION
- View calendar and create bookings
- Cancel future bookings (not past)
- Edit weekly schedules and block time-off
- Export schedules
- View only last 14 days of history
- Cannot delete entities or manage users

### STAFF
- View personal calendar filtered to their linked hostess profile
- See "Your Schedule Today" and upcoming appointments
- Simplified interface (no admin tools)

### CLIENT
- Browse hostesses by location
- View hostess profiles with bio, specialties, and schedule
- Book appointments with real-time availability
- View personal booking history

## Project Architecture
### Database Schema
- **users**: id, email, passwordHash, role, forcePasswordReset, createdAt
- **hostesses**: id, slug, displayName, bio, specialties[], location, photoUrl, active, userId (staff link)
- **services**: id, name, durationMin, priceCents
- **bookings**: id, date, startTime (minutes), endTime, hostessId, clientId, serviceId, status, notes
- **timeOff**: id, hostessId, date, startTime, endTime, reason
- **weeklySchedule**: id, hostessId, weekday (0-6), startTimeDay, endTimeDay, startTimeNight, endTimeNight
- **auditLog**: id, userId, action, entity, entityId, meta, createdAt

### Time System
- All times stored as **minutes from midnight** (0-1439)
- Display format: **24-hour (HH:mm)** in monospace font
- Default timezone: **America/Toronto**
- Grid operates: 10:00-23:00 in 15-minute increments
- Helpers: parseTimeToMinutes(), minutesToTime(), hasTimeConflict()

### Double-Booking Prevention
- Serializable transactions with advisory locks per (hostessId, date)
- Validates against existing bookings (excludes CANCELED)
- Prevents client overlaps across all hostesses
- Respects TimeOff blocks
- Enforces WeeklySchedule boundaries
- Returns clear conflict errors with time ranges

## Design System
### Admin/Reception (Dark Mode Primary)
- Background: hsl(220 15% 12%)
- Surface: hsl(220 14% 16%)
- Status colors:
  - Available: hsl(145 55% 45%) - muted teal
  - Booked: hsl(210 85% 55%) - vibrant blue
  - Time-Off: hsl(25 75% 55%) - warm amber
  - Conflict: hsl(0 75% 60%) - clear red

### Client-Facing (Light Mode Primary)
- Background: hsl(0 0% 100%)
- Surface: hsl(220 20% 98%)
- Primary: hsl(210 90% 45%) - sophisticated blue
- Generous whitespace, friendly micro-copy

### Typography
- Primary: Inter (400, 500, 600, 700)
- Monospace: Roboto Mono (for all time displays)
- Grid headers: 13px, 600, uppercase
- Time labels: 12px, 500, monospace
- Dashboard metrics: 32px, 700

### Layout Constants
- Spacing: 2, 3, 4, 6, 8, 12, 16, 20 (Tailwind units)
- Grid time column: 80px fixed
- Hostess columns: 200px min-width
- Cell height: 48px (15-min slots)
- Admin max-width: 1800px
- Client max-width: 1280px (max-w-7xl)

## Key Components
### Admin Daily Grid (`/admin/calendar`)
- Sticky time column (left) and hostess headers (top)
- Horizontal scroll for 8+ hostesses
- Color-coded cells: available (green), booked (blue), time-off (amber)
- Click available cell → Quick Booking modal
- Real-time conflict detection

### Quick Booking Modal
- Pre-filled date, time, hostess, location
- Client autocomplete (search by email)
- Service selection with duration/price
- Notes field
- Validates conflicts before submission

### Client Booking Flow
1. Browse hostesses (`/hostesses`) with location filter
2. View profile (`/hostess/:slug`) with bio, specialties, weekly schedule
3. Select date from calendar
4. Choose service (sorted by duration ascending)
5. Pick available time slot (15-min grid)
6. Add optional notes
7. Confirm booking

### Import/Export Schedules
**Import CSV Format:**
```
id,hostess,mon_day,mon_night,tue_day,tue_night,...
1,Jane-D,10:00-18:00,W,12:00-20:00,D,...
```
- Idempotent upsert by (hostessId, weekday)
- Sequential processing with ETA
- Row-by-row error capture
- Progress UI with success/fail indicators

**Export CSV Format:**
- Alphabetical by hostess name
- HH:mm-HH:mm format (24-hour)
- Append ,D (Downtown) or ,W (West End)
- Null-safe (empty cells for off days)

## API Endpoints
### Auth
- POST /api/auth/register (CLIENT only)
- POST /api/auth/login (returns JWT + requiresPasswordReset flag)
- POST /api/auth/reset-password
- GET /api/auth/me

### Hostesses
- GET /api/hostesses?location=&q=
- GET /api/hostesses/:slug
- POST /api/hostesses/:id/photo (admin/reception)

### Bookings
- GET /api/bookings/day?date=YYYY-MM-DD&location=
- GET /api/bookings/my (current user)
- GET /api/bookings/upcoming
- POST /api/bookings (full validation + conflict check)
- POST /api/bookings/:id/cancel (role-based rules)
- PATCH /api/bookings/:id/notes (client can add notes to their bookings)

### Services
- GET /api/services (sorted asc by durationMin)
- POST /api/services (admin)
- PATCH /api/services/:id
- DELETE /api/services/:id

### Admin
- GET /api/clients?q= (autocomplete)
- POST /api/clients/bulk-import (rate-limited, chunked)
- GET /api/admin/users
- PATCH /api/admin/users/:id (role + hostess link)
- POST /api/schedule/import
- GET /api/schedule/export?location=

### Analytics (Admin-Only)
- GET /api/analytics/revenue?groupBy=hostess|location|service - Revenue breakdown by specified dimension
- GET /api/analytics/bookings-trend?days=7|30|90 - Booking trends over time period
- GET /api/analytics/cancellations - Status distribution and cancellation metrics

## Environment Variables
- `DATABASE_URL`: Supabase PostgreSQL connection string (transaction pooler)
- `JWT_SECRET`: Secret key for JWT signing/verification
- `APP_TZ`: America/Toronto (default timezone)

## Development Workflow
```bash
# Install dependencies
npm install

# Push schema to database
npm run db:push

# Seed database with sample data (run once)
NODE_ENV=development tsx server/seed.ts

# Run dev servers (Express + Vite)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Seed Data
The database can be seeded with comprehensive sample data using `server/seed.ts`:
- **Admin user**: admin@base44.com / admin123
- **Reception user**: reception@base44.com / reception123
- **10 Services**: Ranging from 15-min Express Session ($30) to 6-hour Full Day Experience ($600)
- **20 Hostesses**: 10 Downtown, 10 West End with unique bios and specialties
- **120 Weekly Schedules**: Mon-Fri 10:00-18:00 (day) + 19:00-23:00 (night), Sat 12:00-20:00 (day only)
- **50 Client users**: client1@example.com - client50@example.com / client123
- **30 Sample Bookings**: Spread across today and next 2 days
- **5 Time-Off Blocks**: Sample unavailability for next week

Note: Seed script is idempotent and will skip if data already exists.

## Implemented Features
- ✅ Advanced analytics dashboard with revenue, trends, and cancellation metrics
- ✅ Photo upload for hostesses (multer integration, file storage in attached_assets/hostess-photos/)
- ✅ Client self-service: add notes to bookings, request cancellations
- ✅ Database seed script with comprehensive sample data
- ✅ Role-based access control (ADMIN, STAFF, RECEPTION, CLIENT)
- ✅ Double-booking prevention with transaction locks
- ✅ CSV import/export for weekly schedules
- ✅ Bulk client import with rate limiting

## Next Phase Features (Not Yet Implemented)
- Email notifications (booking confirmations, reminders) - Resend/SendGrid integration ready, requires API keys
- SMS notifications (confirmations, reminders) - Twilio integration ready, requires API credentials
- Recurring bookings
- Client feedback/ratings
- Multi-language support

**Note on Notifications:** Email and SMS notification infrastructure is documented and ready for implementation. When ready to enable:
- Email: Set up Resend (https://resend.com) or SendGrid API keys
- SMS: Set up Twilio account with Account SID, Auth Token, and Phone Number
- Integration connectors available via `search_integrations` tool
