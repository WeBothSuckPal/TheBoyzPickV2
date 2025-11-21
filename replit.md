# The Parlay-Vous Lounge

## Overview

The Parlay-Vous Lounge is a retro neon-lit digital speakeasy for tracking sports picks, chips, and trash talk among friends. It's a free, fun gambling pick-tracker where 4 players compete weekly by submitting three types of picks (LOCK, SIDE, LOTTO), with real-time features like "FADE" voting and consensus tracking. The application features a 1980s arcade aesthetic with electric blue and hot pink neon glows, dark mode backgrounds, and competitive energy through player rankings and chip counts.

## Recent Changes (November 2025)

### Auto Game Fetching & Carter Admin Access (Latest - Nov 21)
- **Automated Daily Game Fetches**: Implemented node-cron scheduler for daily game updates
  - Cron job runs every day at 6:00 AM EST
  - Automatically fetches games for all 5 sports (NCAAF, NFL, MLB, NCAAMB, NBA)
  - Server logs confirm: "Cron jobs scheduled: Daily game fetch at 6:00 AM EST"
  - Manual "Fetch Games" button retained in admin panel as backup
- **Carter Automatic Admin Access**: Simplified admin authentication for primary user
  - Carter receives admin privileges automatically upon login
  - No separate admin password required for Carter
  - Session flag `isAdminAuthenticated` set to true when Carter logs in
  - Admin panel immediately accessible without password dialog
  - Other players still require admin password for admin panel access
- **UI Improvements**: Enhanced header layout and week display
  - Login button moved to upper right corner for better visibility
  - Week display changed from "Week X" to "Week X Slate" format
  - Clean header with login/logout in upper right when authenticated
  - "Playing as: [Name]" displays when logged in

### Optional Login System (Nov 21)
- **Optional Authentication for Viewing**: Homepage accessible without login
  - Public can view leaderboard, picks, chat history without authentication
  - Login button in header directs to /login page
  - After login, redirected back to homepage
  - Header shows "Viewing as:" dropdown when not logged in, "Playing as: [Name]" when logged in
  - Logout button appears only when authenticated
- **Interactive Feature Gating**: All interactive features disabled when not authenticated
  - Submit Picks button: disabled with tooltip "Login required to submit picks"
  - Fade buttons: disabled (canFade checks authentication)
  - Chat input/button: disabled with placeholder "Login to chat..."
  - All handlers (submit picks, fade, send chat) show "Login required" toast if triggered without auth
- **Query Invalidation**: Login/logout invalidates all relevant queries (auth, players, picks, chat)
  - Ensures UI immediately reflects current authentication state
  - No stale data after auth state changes
- **Security**: GET /api/players filters out password fields, session-based auth with bcryptjs hashing

### Player Login System & NFL Week Tracking (Oct 28)
- **Player Authentication**: Implemented session-based login system
  - Each player has their own password (default: "password")
  - Password hashing using bcryptjs for security
  - Session-based authentication persists across page reloads
  - Authentication routes: POST /api/auth/login, GET /api/auth/status, POST /api/auth/logout
- **NFL Week Synchronization**: Weeks now sync with actual NFL schedule
  - Season starts Sept 4, 2025 (2025 NFL season kickoff)
  - Currently showing Week 8 (aligned with real NFL week)
  - Week calculation based on days since NFL season start
  - Configurable via SEASON_START_DATE environment variable
- **Player Auto-Initialization**: Database automatically seeds 4 default players with passwords
  - Carter, Chub, Perky, Jerry Fader - each with 1,000 starting chips
  - All players have hashed passwords (default: "password")
  - Automatic seeding on first server startup

### Multi-Sport Support
- Expanded from NCAAF-only to 5 sports: College Football, NFL, MLB, Men's College Basketball, NBA
- Admin panel sport selector dropdown for fetching games from different sports
- Sport-aware game deletion: fetching one sport doesn't erase games from other sports (deleteGamesByWeekAndSport)
- SportKey column added to picks table for persistent sport tracking
- Picks retain sport information even after games are refreshed/deleted
- Pick submission dialog includes sport filter dropdown (shows when multiple sports available)
- Each pick displays sport icon and label (Trophy/Shield/CircleDot/Activity with color coding)
- Backend stores sportKey from game at pick submission time for immutability
- Frontend sport filtering in game selection and pick display

### The Odds API Integration
- Integrated The Odds API for fetching live game data (spreads, totals, commence times)
- Admin panel "Fetch Games" button pulls current week's games for selected sport
- Games stored in PostgreSQL with spreads/totals from first available bookmaker
- Pick submission now game-based instead of free-form text entry
- Supports multiple sports via sportKey parameter in API calls

### Pick Deadlines
- Implemented automatic pick deadlines based on game commence times
- Backend validation prevents submitting picks after any game has started
- Frontend filters out started games from selection dropdown
- Dialog shows earliest game deadline with warning message
- All gameIds are required and validated server-side to prevent deadline bypass
- Pick-game association tracked via gameId column in picks table

### Admin Authentication
- Password-protected admin panel using session-based authentication
- Admin password stored as ADMIN_PASSWORD environment secret
- Session persists across page reloads using HttpOnly cookies
- Only authenticated admins can fetch games and manage week settings

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**UI Component System**: Built with shadcn/ui components (Radix UI primitives) providing a comprehensive set of accessible, customizable components. The design system uses a "New York" style variant with Tailwind CSS for styling.

**Styling Approach**: 
- Tailwind CSS with custom configuration for the retro arcade theme
- CSS variables for theming with dark mode as default
- Custom neon color palette (cyan, magenta, yellow, green) for arcade aesthetic
- Typography using Google Fonts: Bebas Neue/Orbitron for headers (arcade style), Inter for body text
- Design guidelines emphasize high-contrast neon elements against dark backgrounds

**State Management**: 
- TanStack Query (React Query) for server state management and caching
- Local React state for UI interactions
- Custom hooks for WebSocket message handling

**Routing**: wouter for lightweight client-side routing (single-page application with minimal routes)

**Real-time Communication**: WebSocket connection for live updates including chat messages, pick submissions, and fade votes. Custom WebSocket utility with automatic reconnection logic.

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript

**API Design**: RESTful API endpoints under `/api` prefix for:
- Player management (profiles, chip counts)
- Week management (tracking active betting weeks)
- Pick submission and status updates
- Fade voting system
- Chat messages

**Development Setup**: Vite middleware mode for hot module replacement during development, with production builds serving static assets.

**WebSocket Server**: ws library integrated with HTTP server for bidirectional real-time communication, broadcasting updates to all connected clients.

### Data Storage Solutions

**ORM**: Drizzle ORM for type-safe database operations with schema defined in TypeScript

**Database**: PostgreSQL (configured via Neon serverless driver) with schema including:
- `players` table: User profiles with chips, avatars, names
- `weeks` table: Betting week tracking with active status
- `picks` table: Three pick types per player per week (LOCK/SIDE/LOTTO) with status tracking and gameId linking to games table
- `fades` table: Player votes against other players' LOCK picks
- `chat_messages` table: Real-time chat history
- `games` table: NCAAF games fetched from The Odds API with spreads, totals, and commence times
- `users` table: Admin user credentials for password-protected admin panel

**In-Memory Fallback**: MemStorage class implementation for development/testing without database

**Schema Design Philosophy**: 
- Week-based organization for picks and fades
- Status tracking for picks (pending/win/loss)
- Relational structure linking picks to players and weeks
- Chat messages linked to players with timestamps

### Authentication and Authorization

**Current Implementation**: Optional session-based authentication system. Public can view all content, but login required for interactive features.

**Authentication Flow**:
- Homepage accessible without login (read-only mode)
- Login via /login page redirects back to homepage after success
- Session persists across page reloads using connect-pg-simple PostgreSQL session store
- Interactive features (Submit Picks, Fade, Chat) disabled when not authenticated
- UI-level gating with visual feedback (disabled buttons, tooltips, placeholder text)

**Design Decision**: Intentionally simplified for small friend groups. Backend routes do not enforce authentication - security relies on UI-level gating. This maintains ease of use while providing optional login for tracking who submitted picks/fades/messages.

### External Dependencies

**UI Component Library**: 
- Radix UI primitives for accessible component foundations
- shadcn/ui component patterns and styling

**Styling & Design**:
- Tailwind CSS for utility-first styling
- PostCSS with Autoprefixer
- Google Fonts (Bebas Neue, Orbitron, Inter)

**Database & ORM**:
- Neon Serverless PostgreSQL driver
- Drizzle ORM with Drizzle Kit for migrations
- Zod for schema validation

**Real-time Communication**:
- ws (WebSocket library)
- Custom WebSocket client with reconnection

**Build & Development Tools**:
- Vite for bundling and dev server
- esbuild for production server bundling
- TypeScript for type safety
- Replit-specific plugins for development experience

**Form Handling**:
- React Hook Form with Hookform Resolvers
- Zod for validation schemas

**Date Handling**: date-fns for timestamp formatting

**Task Scheduling**: node-cron for automated daily game fetching (runs at 6:00 AM EST)

**Session Management**: connect-pg-simple for PostgreSQL session store (configured but authentication not actively used)

**Utility Libraries**:
- clsx and class-variance-authority for conditional CSS classes
- tailwind-merge for Tailwind class merging
- nanoid for ID generation