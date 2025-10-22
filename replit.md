# Club Alpha Booking Platform

## Overview
Club Alpha is a production-ready, multi-location hostess booking platform designed to manage appointments across Downtown and West End locations. It features advanced scheduling, real-time conflict detection, double-booking prevention, role-based access control, comprehensive admin tools, bulk client import, automatic privacy-focused cleanup of client booking history, and a complete staff portal with dashboard and weekly schedule views. Hostesses can work at multiple locations simultaneously (not mutually exclusive), providing flexibility in scheduling and service coverage across both venues. The platform aims to streamline booking operations, enhance client experience, and provide robust management capabilities for staff and administrators.

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
- **Database Schema**: Core entities include `users`, `hostesses`, `services`, `bookings`, `timeOff`, `weeklySchedule`, `photoUploads`, and `auditLog`. Hostesses use a `locations` text array field (not mutually exclusive) supporting "DOWNTOWN" and/or "WEST_END" values.
- **Username-Based Authentication**: The platform uses username-based login instead of email-based authentication. Usernames are automatically extracted from email addresses during user creation (the part before @). For example, "admin@clubalpha.ca" becomes username "admin". All login flows (home page, dedicated login page) accept username + password credentials. The `users` table has a unique, non-nullable `username` column alongside the existing `email` column for backward compatibility.
- **Automatic Data Cleanup**: Client booking history older than 2 weeks is automatically deleted every 24 hours to maintain privacy and database cleanliness. This cleanup runs on server startup and continues in the background.
- **Time System**: All times are stored as minutes from midnight (0-1439). The system operates on a 10:00-23:00 grid in 15-minute increments, with a default timezone of America/Toronto.
- **Double-Booking Prevention**: Utilizes serializable transactions with advisory locks per `(hostessId, date)`, validating against existing bookings, time-off blocks, and weekly schedules to prevent conflicts.
- **Admin Daily Grid**: Features sticky time and hostess headers, horizontal scrolling, color-coded cells, quick booking modal integration, and 3-level zoom controls.
- **Quick Booking Modal**: Dual-mode interface with tabs for creating bookings or marking time off. Booking mode: pre-fills details, offers client dropdown/autocomplete with all registered clients, service selection, notes field, and validates conflicts. Time Off mode: allows marking time slots as unavailable with duration selection (15min-4hrs) and reason, displayed as red blocks on the calendar.
- **Client Booking Flow**: Allows browsing hostesses by location, viewing profiles, selecting dates, choosing services, picking available time slots, adding notes, and confirming bookings. Service prices are prominently displayed on service cards and in the booking form dropdown.
- **Bulk Client Import**: High-performance batch processing system supports importing 14,000+ clients in 2-3 minutes. Processes clients in batches of 100 with 10ms delay between batches. Maximum 20,000 clients per import. Features username-based default passwords (username extracted from email is used as initial password), mandatory password change on first login (forcePasswordReset flag), comprehensive UI with template download (10 example emails), instructions, duplicate detection, indeterminate progress bar during import, success/failure counts display, failed accounts list with download option, and automatic cache invalidation for immediate updates.
- **Import/Export Schedules**: Supports CSV import and export of weekly schedules. Format: `id,hostess,monday,tuesday,wednesday,thursday,friday,saturday,sunday` with time ranges like "10:00-18:00". Idempotent upserts by (hostessId, weekday) with row-by-row error capture.
- **Role-Based Access Control**: Defines distinct permissions for ADMIN, RECEPTION, STAFF, and CLIENT roles, including specific dashboard views and functionalities.
- **Password Reset**: Admins and receptionists can reset passwords for any user (clients, staff/hostesses), requiring 8+ characters and bcrypt hashing, with all actions logged. Password reset buttons are available on both the Users and Clients management pages.
- **Photo Upload & Approval**: STAFF users can upload profile photos for their linked hostess via a secure endpoint. Uploads are stored with PENDING status in the `photoUploads` table. ADMIN users review pending uploads at `/admin/photo-approvals` and can approve or reject them. When approved, the photo is applied to the hostess profile and status changes to APPROVED. The system enforces ownership verification to ensure staff can only upload for their own linked hostess.
- **Service Pricing**: Services store prices as integer cents (priceCents) in the database and display as dollars with 2 decimal places. ADMIN users can easily create and edit service prices through the Services Management page. Prices are prominently displayed to clients on service cards (hostess profile page) and in the booking form dropdown.
- **Demo Login Credentials**: The home page displays demo credentials for all four user roles (ADMIN, RECEPTION, STAFF, CLIENT) to allow easy exploration of the platform. STAFF demo user is linked to the first hostess (Sophia) for testing staff features like photo uploads and schedule management.
- **Multi-Location Support**: Hostesses can work at multiple locations (Downtown and/or West End). Admin form uses checkboxes for location selection. Frontend displays multiple location badges. Backend filtering uses PostgreSQL array contains operator (`@>`) to include hostesses in location-specific queries. Analytics counts bookings where the hostess's locations array includes the specified location.
- **Staff Portal**: Comprehensive staff portal with two main pages: (1) Dashboard showing welcome message, stat cards for today's/tomorrow's appointments and today's time-off, and profile section with working days and photo; (2) Weekly Schedule view showing day-by-day breakdown with color-coded borders (purple for today, green for working days, gray for days off), "Today" badge, navigation between weeks, and display of bookings, time-off, or day-off status for each day.
- **Analytics Dashboard**: Provides revenue metrics, booking trends, and cancellation rates with `recharts` visualization.
- **Performance Optimizations**: The platform is optimized for speed and efficiency through several key improvements: (1) Combined `/api/staff/overview` endpoint that consolidates 6 separate API calls into 1 request using Promise.all() for parallel database queries; (2) React Query cache configuration with 2-minute staleTime and automatic refetch-on-window-focus for balanced freshness and performance; (3) Database indexes on `bookings(hostessId, date)` and `timeOff(hostessId, date)` for fast queries; (4) Efficient SQL joins in all booking queries to prevent N+1 query patterns; (5) Compact UI design throughout staff portal for efficient use of screen space.

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