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
- **Colors**: Deep black (#07090d), surfaces use semi-transparent white overlays, accent blue (#3b82f6)
- **Text**: Primary (#eef2ff), Secondary (rgba(238,242,255,0.72)), Muted (rgba(238,242,255,0.52))
- **Components**: Solid cards (#0d1014), subtle borders, soft shadows
- **Typography**: Montserrat font, bold weights (700-900), tight letter-spacing
- **Logo**: 44 Club logo displayed on login page
- **Style**: Stoic modern theme - dark backgrounds, light readable text, blue accents

## Development
- Run: `npm run dev` (port 5000)
- Build: `npm run build`
- Start: `npm start`

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

## Recent Changes
- Feb 3, 2026: ProgrammeCatalogue optimized to match Framework card style (image backgrounds, title overlay, 4-column grid)
- Feb 3, 2026: Programme detail modal with day tabs (Day 1, Day 2, etc.) and session/exercise breakdown
- Feb 3, 2026: Block type selector highlights with each type's color (workout=orange, habit=green, etc.)
- Feb 3, 2026: Time section cleaned up in NewBlock modal
- Feb 3, 2026: Framework items now filter by active framework_template_id on fetch and activation
- Feb 2, 2026: Structure page optimization - reordered Discipline tab (Challenge → Active Framework → Available Frameworks)
- Feb 2, 2026: New ActiveFrameworkCard component with image background, gradient overlay, and progress bar
- Feb 2, 2026: Compact ActiveFrameworkCard added to Home page below day selector
- Feb 2, 2026: Updated FrameworkChecklistModal with dark theme styling (emerald/amber/rose status colors)
- Feb 2, 2026: Framework catalogue cards: 4-column grid, 180px height, image backgrounds
- Feb 2, 2026: Edge case handling: "No framework activated" state with CTA link
- Feb 2, 2026: Complete UI overhaul to match landing page stoic modern theme
- Feb 2, 2026: Updated colors: #07090d background, semi-transparent surfaces, #3b82f6 accent
- Feb 2, 2026: Changed font to Montserrat with semibold weights throughout
- Feb 2, 2026: Solid non-transparent cards (#0d1014) for blocks and modals
- Feb 2, 2026: Light text colors (#eef2ff) for visibility on dark backgrounds
