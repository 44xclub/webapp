# 44CLUB Blocks MVP

A responsive web + PWA application for tracking workouts, habits, nutrition, check-ins, and personal blocks.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Backend**: Supabase (Auth + Postgres + Storage)
- **Forms**: React Hook Form + Zod validation
- **PWA**: Service Worker + Web App Manifest

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

### 2. Run Database Schema

1. Go to your Supabase Dashboard > SQL Editor
2. Copy and run the contents of `supabase/schema.sql`
3. This creates:
   - `profiles` table
   - `blocks` table
   - `block_media` table
   - All indexes for performance
   - RLS policies for security
   - Triggers for `updated_at`

### 3. Create Storage Bucket

1. Go to Supabase Dashboard > Storage
2. Create a new bucket named `block-media`
3. Set it to **private** (not public)
4. Go to SQL Editor and run `supabase/storage-policies.sql` to set up storage policies

### 4. Configure Authentication

1. Go to Authentication > Providers
2. Ensure Email provider is enabled
3. For MVP, you may want to disable email confirmation:
   - Go to Authentication > Settings
   - Turn off "Enable email confirmations"

### 5. Set Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 6. Install Dependencies

```bash
npm install
```

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 8. Generate PWA Icons (Optional)

For production, generate proper icons at these sizes:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

Place them in `/public/icons/` with names like `icon-192.png`.

## Project Structure

```
/app
  /layout.tsx        # Root layout with PWA meta tags
  /page.tsx          # Redirects to /app or /login
  /login/page.tsx    # Auth page (login/signup)
  /app/page.tsx      # Main weekly view
  /globals.css       # Tailwind + custom styles

/components
  /ui/               # Reusable UI components
    Button.tsx
    Input.tsx
    Modal.tsx
    Checkbox.tsx
    Select.tsx
    Textarea.tsx
  /blocks/           # Block-specific components
    WeekStrip.tsx
    DaySection.tsx
    BlockRow.tsx
    BlockModal.tsx
    MediaUploader.tsx
    /forms/          # Type-specific forms
      WorkoutForm.tsx
      HabitForm.tsx
      NutritionForm.tsx
      CheckinForm.tsx
      PersonalForm.tsx
  PWARegister.tsx    # Service worker registration

/lib
  /supabase/         # Supabase client setup
    client.ts        # Browser client
    server.ts        # Server client
    middleware.ts    # Auth middleware
  /hooks/            # Custom React hooks
    useBlocks.ts     # Block CRUD operations
    useProfile.ts    # Profile operations
  /types/            # TypeScript definitions
    database.ts      # Supabase types
  date.ts            # Date utilities
  schemas.ts         # Zod validation schemas
  utils.ts           # Utility functions

/public
  manifest.json      # PWA manifest
  sw.js              # Service worker
  offline.html       # Offline fallback
  /icons/            # PWA icons

/supabase
  schema.sql         # Database schema
  storage-policies.sql # Storage bucket policies
```

## Block Types

### Workout
- Title (required)
- Exercise matrix (exercises with sets, reps, weight)
- Duration (optional)
- RPE 1-10 (optional)

### Habit
- Title (required)
- Repeat pattern (none/daily/weekly/custom)

### Nutrition
- Meal type (breakfast/lunch/dinner/snack)
- Meal name (required)
- Macros: calories, protein, carbs, fat (optional)
- Repeat pattern (optional)

### Check-in
- Weight (required)
- Height (required if not in profile)
- Body fat % (optional)
- Images (front/back/side)

### Personal
- Title (required)
- Repeat pattern (optional)

## Features

- **Week Strip Navigation**: Navigate between weeks, jump to today
- **Day Sections**: Blocks grouped by day, sorted by time
- **Block CRUD**: Create, edit, duplicate, soft-delete blocks
- **Completion Toggle**: Mark blocks as completed with timestamp
- **Media Upload**: Upload images/videos to blocks
- **Optimistic UI**: Instant feedback on completion toggle
- **PWA**: Installable, works offline (cached pages)
- **Responsive**: Works on desktop and mobile viewports
- **Dark Theme**: Clean, minimal dark-first design

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Storage policies restrict media access to owners
- Auth middleware protects /app routes

## Performance

- 14-day date range fetch for weekly view
- Indexed queries on (user_id, date)
- Optimistic updates for completion toggle
- Service worker caching for offline support
