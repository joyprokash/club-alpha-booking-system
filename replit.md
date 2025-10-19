# Club Alpha Booking Platform

## Overview
Club Alpha is a production-ready, multi-location hostess booking platform designed to manage appointments across Downtown and West End locations. It features advanced scheduling, real-time conflict detection, double-booking prevention, role-based access control, and comprehensive admin tools. The platform aims to streamline booking operations, enhance client experience, and provide robust management capabilities for staff and administrators.

## User Preferences
I want the agent to use simple language.
I want iterative development.
I want detailed explanations.
Ask before making major changes.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

## System Architecture
The platform is built with a React 18, TypeScript, Vite frontend using TanStack Query, Wouter routing, Tailwind CSS, and shadcn/ui. The backend is a Node.js 20 Express application with Drizzle ORM and Zod validation, connecting to a PostgreSQL database (Supabase). Authentication is handled via JWT with role-based access for ADMIN, STAFF, RECEPTION, and CLIENT. Time management consistently uses `date-fns` and `date-fns-tz` (America/Toronto timezone), storing all times as minutes from midnight.

### UI/UX Decisions
- **Admin/Reception Interface**: Primarily dark mode with a background of `hsl(220 15% 12%)` and surface `hsl(220 14% 16%)`. Status colors are muted teal for available, vibrant blue for booked, warm amber for time-off, and clear red for conflicts.
- **Client-Facing Interface**: Primarily light mode with a background of `hsl(0 0% 100%)` and surface `hsl(220 20% 98%)`. Features a sophisticated blue as the primary color (`hsl(210 90% 45%)`), generous whitespace, and friendly micro-copy.
- **Typography**: Uses Inter for primary text and Roboto Mono for all time displays.
- **Layout**: Consistent spacing with Tailwind units, fixed grid time column (80px), hostess columns with a minimum width of 200px, and cell height of 48px for 15-minute slots. Max width for admin is 1800px and client is 1280px.

### Technical Implementations
- **Database Schema**: Core entities include `users`, `hostesses`, `services`, `bookings`, `timeOff`, `weeklySchedule`, `photoUploads`, and `auditLog`.
- **Time System**: All times are stored as minutes from midnight (0-1439). The system operates on a 10:00-23:00 grid in 15-minute increments, with a default timezone of America/Toronto.
- **Double-Booking Prevention**: Utilizes serializable transactions with advisory locks per `(hostessId, date)`, validating against existing bookings, time-off blocks, and weekly schedules to prevent conflicts.
- **Admin Daily Grid**: Features sticky time and hostess headers, horizontal scrolling, color-coded cells, quick booking modal integration, and 3-level zoom controls.
- **Quick Booking Modal**: Pre-fills booking details, offers client autocomplete, service selection, notes field, and validates conflicts.
- **Client Booking Flow**: Allows browsing hostesses by location, viewing profiles, selecting dates, choosing services, picking available time slots, adding notes, and confirming bookings.
- **Import/Export Schedules**: Supports CSV import and export of weekly schedules. Format: `id,hostess,monday,tuesday,wednesday,thursday,friday,saturday,sunday` with time ranges like "10:00-18:00". Idempotent upserts by (hostessId, weekday) with row-by-row error capture.
- **Role-Based Access Control**: Defines distinct permissions for ADMIN, RECEPTION, STAFF, and CLIENT roles, including specific dashboard views and functionalities.
- **Password Reset**: Admins can reset any user's password, requiring 8+ characters and bcrypt hashing, with all actions logged.
- **Photo Upload & Approval**: STAFF users can upload profile photos for their linked hostess via a secure endpoint. Uploads are stored with PENDING status in the `photoUploads` table. ADMIN users review pending uploads at `/admin/photo-approvals` and can approve or reject them. When approved, the photo is applied to the hostess profile and status changes to APPROVED. The system enforces ownership verification to ensure staff can only upload for their own linked hostess.
- **Analytics Dashboard**: Provides revenue metrics, booking trends, and cancellation rates with `recharts` visualization.

## External Dependencies
- **PostgreSQL**: Used as the primary database, managed via Supabase.
- **Node.js/Express**: Backend framework.
- **React/Vite**: Frontend framework and build tool.
- **Drizzle ORM**: Object-Relational Mapper for database interactions.
- **Zod**: Schema declaration and validation library.
- **JWT**: For secure authentication and authorization.
- **date-fns / date-fns-tz**: For robust date and time manipulation and timezone handling.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: UI component library.
- **TanStack Query**: For data fetching, caching, and state management.
- **Wouter**: For client-side routing.
- **Multer**: For handling `multipart/form-data`, primarily for file uploads (hostess photos).
- **bcrypt**: For password hashing.
- **recharts**: For data visualization in the analytics dashboard.
- **Resend/SendGrid**: Email notification services (integration ready, requires API keys).
- **Twilio**: SMS notification service (integration ready, requires API credentials).