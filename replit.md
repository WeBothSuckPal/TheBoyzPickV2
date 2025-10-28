# The Parlay-Vous Lounge

## Overview

The Parlay-Vous Lounge is a retro neon-lit digital speakeasy for tracking sports picks, chips, and trash talk among friends. It's a free, fun gambling pick-tracker where 4 players compete weekly by submitting three types of picks (LOCK, SIDE, LOTTO), with real-time features like "FADE" voting and consensus tracking. The application features a 1980s arcade aesthetic with electric blue and hot pink neon glows, dark mode backgrounds, and competitive energy through player rankings and chip counts.

## Recent Changes (October 2025)

### The Odds API Integration
- Integrated The Odds API for fetching live NCAAF game data (spreads, totals, commence times)
- Admin panel "Fetch Games" button pulls current week's games from americanfootball_ncaaf sport
- Games stored in PostgreSQL with spreads/totals from first available bookmaker
- Pick submission now game-based instead of free-form text entry

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

**Current Implementation**: No authentication system implemented. The application assumes a closed group of 4 known players. Player selection is handled client-side through a dropdown/state variable.

**Design Decision**: Intentionally simplified for small friend groups, trading security for ease of use. All players can see and interact with all data.

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

**Session Management**: connect-pg-simple for PostgreSQL session store (configured but authentication not actively used)

**Utility Libraries**:
- clsx and class-variance-authority for conditional CSS classes
- tailwind-merge for Tailwind class merging
- nanoid for ID generation