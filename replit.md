# 44Club Blocks

## Overview
A Next.js 14 application with Supabase integration for authentication and data storage. Uses TypeScript and Tailwind CSS for styling. Features a stoic, energetic dark UI with greys, blacks, and dark blues.

## Project Structure
- `app/` - Next.js App Router pages and layouts
- `components/` - Reusable React components
  - `ui/` - Core UI components (Button, Input, Modal)
  - `blocks/` - Block scheduling components
  - `structure/` - Discipline/training page components
  - `shared/` - Shared components (HeaderStrip, BottomNav)
- `lib/` - Utility functions, hooks, and Supabase client
- `supabase/` - Supabase configuration files
- `public/` - Static assets

## Tech Stack
- Next.js 14.1.0
- React 18
- TypeScript
- Tailwind CSS (custom design system)
- Supabase (Authentication & Database)

## Design System
- **Colors**: Deep black (#0a0a0a), neutral grey (#262626), accent navy blue (#021959)
- **Components**: Glass cards, glow effects, gradient backgrounds
- **Typography**: SF Pro Display/Inter, hierarchical type scale
- **Logo**: 44 Club logo displayed on login page

## Development
- Run: `npm run dev` (port 5000)
- Build: `npm run build`
- Start: `npm start`

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

## Recent Changes
- Feb 2, 2026: Updated color scheme to #0a0a0a (background), #262626 (cards), #021959 (accent)
- Feb 2, 2026: Added 44 Club logo to login page
- Feb 2, 2026: Redesigned block modal with two-step flow (quick entry + details)
- Feb 2, 2026: Added duration quick-select chips (15m, 30m, 45m, 1h, 1.5h, 2h)
- Feb 2, 2026: Added progress bar to HeaderStrip showing level-up progress with score breakdown
- Feb 2, 2026: Redesigned streak section with gradient card, professional typography
- Feb 2, 2026: Added overdue detection (red tint + "Overdue" label) for past-time blocks
- Feb 2, 2026: Added distinct colors to block type selector (orange/emerald/sky/violet/rose)
- Feb 2, 2026: Auto-calculate duration when start/end times entered in block modal
- Feb 2, 2026: Updated entire UI with energetic stoic styling - greys, blacks, dark blues
- Feb 2, 2026: Redesigned ProfileCard, HeaderStrip, BottomNav, Button components
- Feb 2, 2026: Added custom Tailwind color palette and utility classes
- Feb 2, 2026: Configured for Replit environment (port 5000, dev server settings)
