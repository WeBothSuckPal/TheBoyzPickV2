# Design Guidelines: The Parlay-Vous Lounge

## Design Approach
**Reference-Based**: Retro arcade aesthetic inspired by 1980s neon-lit arcade machines and digital speakeasy culture. Think Tron meets Las Vegas meets your favorite retro gaming lounge.

## Core Design Principles
1. **Neon Nostalgia**: Everything glows with electric intensity
2. **High-Contrast Drama**: Dark backgrounds make neon accents pop
3. **Arcade Boldness**: Chunky, readable typography and oversized interactive elements
4. **Competitive Energy**: Visual hierarchy emphasizes wins, losses, and player rivalry

## Color System
- **Background**: Charcoal/Navy (#1a1a1a) - deep, rich darkness
- **Primary Neon**: Electric Blue (#00FFFF) - for headers, winning states, primary actions
- **Secondary Neon**: Hot Pink (#FF00FF) - for accents, special features, highlights
- **Neutral**: Gray-700 to Gray-800 for card backgrounds and secondary text
- **Success**: Bright green neon (#00FF00) for wins
- **Danger**: Red neon (#FF0066) for losses
- **Warning**: Yellow neon (#FFFF00) for pending/alerts

## Typography
- **Headers**: Bebas Neue or Orbitron from Google Fonts (uppercase, bold, blocky arcade style)
  - H1: 4xl to 6xl with neon glow effect
  - H2: 3xl to 4xl 
  - H3: 2xl to 3xl
- **Body**: Inter (clean, readable, modern)
  - Base: 16px (text-base)
  - Small: 14px (text-sm)
  - Large: 18px (text-lg)
- **Emojis**: Use liberally for player status (👑 crown, 🤡 clown, 🥶 fade, 🤝 consensus)

## Layout System
**Spacing Scale**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- Component padding: p-6 to p-8
- Section spacing: py-12 to py-16
- Card gaps: gap-4 to gap-6
- Button padding: px-6 py-3

**Responsive Grid**:
- Mobile: Single column stack
- Tablet: 2-column grids where appropriate
- Desktop: 4-column for leaderboard, 2-3 columns for picks grid

## Component Library

### A. Player Profile Cards (Leaderboard)
- **Structure**: 4-column grid on desktop, stacked on mobile
- **Card Design**: Dark background (bg-gray-900) with thick neon border (2-3px) in electric blue
- **Elements**: 
  - Large custom SVG avatar (brain, crystal ball, dollar sign, broken mirror) - 64x64px minimum
  - Nickname in arcade font, uppercase, neon glow
  - Chip count in huge numbers with coin emoji 🪙
  - Status indicator (👑 for 1st, 🤡 for last)
- **Visual Treatment**: Subtle box-shadow with neon glow effect, slight hover lift

### B. Pick Cards
- **Card Style**: Dark card (bg-gray-800) with left border accent (4px) - blue for LOCK, pink for SIDE, yellow for LOTTO
- **Layout**: Stacked information hierarchy
  - Pick type badge at top (uppercase, small text)
  - Pick details in medium body text
  - Chip amount at bottom in bold with emoji
- **Special States**:
  - Faded picks: Add 🥶 badge and semi-transparent overlay
  - Consensus: Flashing animated border in both neon colors
  - Won: Green neon glow border
  - Lost: Red dimmed state

### C. Consensus Banner
- **Treatment**: Full-width attention grabber
- **Design**: Animated gradient background (electric blue to hot pink)
- **Text**: "🤝 HOUSE IS SHAKING 🤝" in huge arcade font with pulsing animation
- **Placement**: Above the picks grid when triggered

### D. Interactive Buttons
- **FADE Button**: 
  - Default: Dark with hot pink border and text
  - Hover: Filled hot pink with white text
  - Disabled: Gray with reduced opacity
  - Icon: 🥶 emoji integrated
- **Submit/Action Buttons**: 
  - Large, chunky rectangular buttons
  - Electric blue background with darker blue border
  - White bold text in uppercase
  - Slight shadow and glow effect
  - Active state: Pressed/inset appearance

### E. Pick Submission Form
- **Layout**: Modal or dedicated section with dark overlay
- **Form Fields**: 
  - Dark inputs (bg-gray-900) with neon blue focus border
  - Labels in uppercase arcade font, small size
  - Three distinct sections for LOCK/SIDE/LOTTO with chip amounts shown
  - Player dropdown at top with avatar preview
- **Visual Separation**: Each pick tier gets its own bordered container

### F. Locker Room Chat
- **Container**: Fixed height scrollable section (400-500px)
- **Message Bubbles**: 
  - Different player nicknames color-coded in neon palette
  - Dark bubble backgrounds with subtle borders
  - Timestamps in small gray text
  - Avatar icons next to each message
- **Input**: Bottom-pinned input bar with send button in hot pink

### G. Admin Panel
- **Style**: Utilitarian but on-brand
- **Pick List**: Table or grid format with clear WIN/LOSS action buttons
- **Buttons**: Green for WIN, red for LOSS, full width on mobile
- **Access**: Collapsible section or separate route with password protection

## Visual Effects
- **Neon Glow**: CSS text-shadow and box-shadow with color blur (3-5px spread)
- **Scan Lines**: Optional subtle overlay giving CRT monitor effect
- **Grain Texture**: Very light noise texture on dark backgrounds for depth
- **Hover States**: Lift effect (translateY -2px) with increased glow intensity
- **Loading States**: Retro pixel-style loading animation or pulsing neon bars

## Responsive Behavior
- **Mobile**: 
  - Stack all grids to single column
  - Larger touch targets (min 44x44px)
  - Chat takes bottom 40% of viewport
  - Fixed header with app name
- **Tablet**: 
  - 2-column leaderboard
  - Side-by-side pick submission
- **Desktop**: 
  - Full 4-column leaderboard glory
  - Chat sidebar on right (30% width)
  - Picks in 2-3 column masonry layout

## Images
**No hero image** - This is a dashboard/app interface, not a marketing page. Focus on data visualization and interactive components.

**Avatar SVGs**: Four distinct inline SVG icons (brain, crystal ball, dollar sign, broken mirror) - simple, iconic, monochromatic with neon stroke colors

## Animation Strategy
Use sparingly but impactfully:
- Consensus banner: Pulsing scale and color shift
- Winning picks: Celebratory glow pulse
- Fade button: Shake animation on click
- Chat messages: Slide-in from bottom
- Chip count changes: Number counter animation