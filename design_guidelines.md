# Base44 Booking Platform - Design Guidelines

## Design Approach
**Selected Framework:** Design System Approach (Carbon Design + Material Design hybrid)
**Rationale:** This is a utility-focused, data-dense scheduling platform requiring clarity, efficiency, and precise information hierarchy. The admin grid is the centerpiece requiring exceptional readability and interaction patterns for time-based data visualization.

---

## Core Design Principles
1. **Clarity Over Decoration** - Every visual element serves the functional goal of booking management
2. **Time-First Hierarchy** - Temporal data (slots, schedules, availability) takes visual priority
3. **Role-Appropriate Density** - Admin/reception interfaces are information-rich; client interfaces are spacious and welcoming
4. **Status-Driven Color** - Color communicates booking state, not aesthetics

---

## Color System

### Admin/Reception Interface (Dark Mode Primary)
**Background Layers:**
- Base: 220 15% 12%
- Surface: 220 14% 16%
- Surface Elevated: 220 13% 20%
- Surface Overlay: 220 12% 24%

**Status Colors (Semantic):**
- Available Slot: 145 55% 45% (muted teal)
- Booked Slot: 210 85% 55% (vibrant blue)
- Time-Off: 25 75% 55% (warm amber)
- Outside Schedule: 220 10% 18% (subtle gray, barely distinct from base)
- Conflict/Error: 0 75% 60% (clear red)
- Confirmed: 145 60% 50% (success green)
- Pending: 45 85% 60% (attention yellow)

**Interactive Elements:**
- Primary Action: 210 90% 55% (blue, matches booked slots for consistency)
- Primary Hover: 210 90% 60%
- Secondary: 220 12% 35%
- Text Primary: 220 10% 95%
- Text Secondary: 220 8% 70%

### Client-Facing Interface (Light Mode Primary)
**Background:**
- Base: 0 0% 100%
- Surface: 220 20% 98%
- Subtle: 220 15% 95%

**Brand Colors:**
- Primary: 210 90% 45% (sophisticated blue)
- Accent: 280 60% 55% (refined purple, used sparingly for CTAs)
- Success: 145 60% 45%
- Text: 220 25% 15%
- Text Muted: 220 15% 50%

---

## Typography

**Font Stack:**
- Primary: 'Inter', system-ui, -apple-system, sans-serif
- Monospace (for times): 'Roboto Mono', 'SF Mono', Consolas, monospace

**Scale (Admin/Reception):**
- Grid Headers: 13px, 600 weight, 1.1 line-height, uppercase tracking
- Time Labels: 12px, 500 weight, monospace
- Booking Cards: 14px, 400 weight
- Section Titles: 18px, 600 weight
- Dashboard Metrics: 32px, 700 weight

**Scale (Client-Facing):**
- Hero Headline: 48px, 700 weight, tight tracking
- Hostess Name: 24px, 600 weight
- Service Title: 16px, 500 weight
- Body Text: 15px, 400 weight, 1.6 line-height
- Time Slots: 14px, 500 weight, monospace

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 3, 4, 6, 8, 12, 16, 20 for consistent rhythm
- Micro spacing: 2, 3 (tight icon-text pairs, internal card padding)
- Component spacing: 4, 6 (between form fields, card elements)
- Section spacing: 8, 12, 16 (between dashboard cards, grid sections)
- Page margins: 20 (outer page containers)

**Grid Layouts:**
- Admin Daily Grid: Fixed-width time column (80px) + dynamic hostess columns (200px min-width) with horizontal scroll
- Dashboard Cards: 2-column on desktop (grid-cols-2), single column on mobile/tablet
- Hostess Discovery: 3-column on desktop (grid-cols-3), 2-column tablet (md:grid-cols-2), single mobile

**Containers:**
- Admin Interface: Full-width with inner max-w-[1800px] (accommodate 8+ hostess columns)
- Client Pages: max-w-7xl for content, max-w-5xl for forms

---

## Component Library

### Admin Daily Grid (Centerpiece)
**Structure:**
- Sticky time column (left): 80px fixed, dark surface (220 13% 18%), subtle border-right
- Sticky header row (top): 56px height, hostess cards with 40px circular photo, name truncated, location badge (D/W)
- Scrollable grid body: 15-min cells (48px height), thin borders (220 12% 25%)
- Cell states: 4px rounded corners, subtle hover lift (brightness +5%), clear status colors

**Interaction:**
- Click available cell → Quick Booking modal (centered overlay, 520px width, dark background with border)
- Hover shows tooltip with exact time range
- Drag selection disabled (prevents accidental multi-select)

### Navigation (Admin/Reception)
- Sidebar: 240px width, collapsible to 60px (icon-only), dark surface elevated
- Top bar: 64px height, contains user menu, location toggle, date picker
- Active nav item: left accent border (4px, primary blue), subtle background lift

### Forms & Inputs
**Booking Forms:**
- Grouped sections with 16px padding, subtle background surface
- Input fields: 44px height, 12px padding, rounded corners (6px)
- Autocomplete: Dropdown with 8px max-height scroll, keyboard navigation
- Date picker: Inline calendar widget, available dates highlighted, disabled dates grayed
- Service cards: Radio selection, 12px padding, border on select, display duration + price clearly

**Time Slot Picker:**
- 15-min buttons in grid (5 columns on desktop), monospace font
- Available: primary border, Available hover: filled
- Unavailable: disabled opacity (0.4), no interaction
- Selected: filled primary, white text

### Cards & Panels
**Dashboard Cards:**
- 16px padding, 8px rounded, subtle shadow (0 2px 8px rgba(0,0,0,0.15))
- Metric cards: Large number (32px), label below (12px muted), icon top-right
- List cards: 4px gap between items, hover highlight per row

**Hostess Profile Cards (Client):**
- 24px padding, clean white background, subtle border
- Photo: 120px circular, centered
- Bio: max 3 lines with ellipsis, "Read more" expands
- Specialties: Pill badges (6px padding, 12px rounded, subtle background)
- CTA button: Full-width, 48px height, primary color

### Modals & Overlays
**Quick Booking Modal:**
- 560px max-width, centered, dark background (admin) or light (client)
- Header: 20px padding, title + close button
- Body: 24px padding, form fields with 12px gap
- Footer: 16px padding, right-aligned actions, primary + cancel buttons

**Import/Export Modals:**
- Progress bar: 8px height, rounded, animated fill
- Row-by-row results: Green checkmark or red X icons, scrollable list
- Download button: Icon + text, secondary style

### Tables & Lists
**Booking Lists:**
- Alternating row backgrounds (subtle, 2% opacity difference)
- Row height: 56px, 12px horizontal padding
- Status badges: 6px rounded pill, 4px padding, status colors
- Actions column: Icon buttons (32px), subtle hover backgrounds

---

## Animations
**Minimal, Purposeful Motion:**
- Grid cell hover: 150ms ease-out brightness shift
- Modal entry: 200ms ease-out scale (0.95 → 1) + fade
- Button interactions: Built-in Tailwind transitions (150ms)
- Loading states: Subtle pulse on skeleton screens
- **No scroll-triggered animations, no parallax, no decorative motion**

---

## Images

### Client-Facing Pages
**Hostess Profiles:**
- Professional headshots: 400x400px minimum, circular crop on cards, full display on profile pages
- Background: Subtle gradient behind bio section (not distracting)

**Homepage/Marketing:**
- No large hero image - Start with location selector and immediate hostess grid
- Focus on functional entry point, not branding imagery

### Admin Interface
**Minimal imagery:**
- Small circular photos in grid headers (40px)
- User avatars in navigation (32px)
- No decorative or background images

---

## Accessibility & Responsiveness

**Dark Mode:**
- Consistent across admin/reception interfaces
- Sufficient contrast (WCAG AAA for text, AA for UI elements)
- Form inputs maintain dark backgrounds with lighter borders for visibility

**Mobile Adaptations:**
- Admin grid: Switch to list view on mobile (<768px), show one hostess schedule at a time with tabs
- Client booking: Stack form fields, enlarge touch targets to 48px minimum
- Navigation: Hamburger menu, full-screen overlay

**Keyboard Navigation:**
- Tab order follows logical flow (top→down, left→right)
- Grid cells focusable, Enter to trigger booking modal
- Escape closes modals
- Arrow keys navigate time slot picker

---

## Role-Specific Refinements

**CLIENT Interface:**
- Generous whitespace (24px between sections)
- Friendly micro-copy ("Find your perfect time", "Book instantly")
- Clear availability indicators (green badges)
- Simplified navigation (Hostesses → Profile → Book)

**RECEPTION Interface:**
- Information-dense but organized
- Quick actions always visible (sticky toolbar)
- 14-day history clearly marked with date range selector
- Restricted actions hidden (not just disabled)

**STAFF Interface:**
- Personal dashboard: "Your Schedule Today", upcoming appointments
- Filtered calendar showing only their bookings
- Simplified view (no admin tools, no other hostesses)

**ADMIN Interface:**
- Full control panel with metrics
- Bulk action warnings (confirmation modals)
- Audit log viewer (table with filters)
- Advanced tools clearly separated in dedicated sections