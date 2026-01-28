export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          height_cm: number | null
          discipline_score: number
          timezone: string
          is_paused: boolean
          committed_at: string
          current_streak: number
          best_streak: number
          last_resolved_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          height_cm?: number | null
          discipline_score?: number
          timezone?: string
          is_paused?: boolean
          committed_at?: string
          current_streak?: number
          best_streak?: number
          last_resolved_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          height_cm?: number | null
          discipline_score?: number
          timezone?: string
          is_paused?: boolean
          committed_at?: string
          current_streak?: number
          best_streak?: number
          last_resolved_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      blocks: {
        Row: {
          id: string
          user_id: string
          date: string
          start_time: string
          end_time: string | null
          block_type: BlockType
          title: string | null
          notes: string | null
          payload: Json
          repeat_rule: RepeatRule | null
          completed_at: string | null
          locked_at: string | null
          is_backfilled: boolean
          backfilled_at: string | null
          challenge_id: string | null
          programme_template_id: string | null
          programme_session_id: string | null
          shared_to_feed: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          start_time: string
          end_time?: string | null
          block_type: BlockType
          title?: string | null
          notes?: string | null
          payload?: Json
          repeat_rule?: RepeatRule | null
          completed_at?: string | null
          locked_at?: string | null
          is_backfilled?: boolean
          backfilled_at?: string | null
          challenge_id?: string | null
          programme_template_id?: string | null
          programme_session_id?: string | null
          shared_to_feed?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          start_time?: string
          end_time?: string | null
          block_type?: BlockType
          title?: string | null
          notes?: string | null
          payload?: Json
          repeat_rule?: RepeatRule | null
          completed_at?: string | null
          locked_at?: string | null
          is_backfilled?: boolean
          backfilled_at?: string | null
          challenge_id?: string | null
          programme_template_id?: string | null
          programme_session_id?: string | null
          shared_to_feed?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      block_media: {
        Row: {
          id: string
          block_id: string
          user_id: string
          storage_path: string
          media_type: 'image' | 'video'
          created_at: string
        }
        Insert: {
          id?: string
          block_id: string
          user_id: string
          storage_path: string
          media_type: 'image' | 'video'
          created_at?: string
        }
        Update: {
          id?: string
          block_id?: string
          user_id?: string
          storage_path?: string
          media_type?: 'image' | 'video'
          created_at?: string
        }
      }
      community_challenges: {
        Row: {
          id: string
          title: string
          description: string | null
          start_date: string
          end_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          start_date: string
          end_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      framework_templates: {
        Row: {
          id: string
          title: string
          description: string | null
          criteria: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          criteria?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          criteria?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_frameworks: {
        Row: {
          user_id: string
          framework_template_id: string
          activated_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          framework_template_id: string
          activated_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          framework_template_id?: string
          activated_at?: string
          updated_at?: string
        }
      }
      daily_framework_submissions: {
        Row: {
          id: string
          user_id: string
          date: string
          status: FrameworkSubmissionStatus
          submitted_at: string
          locked_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          status: FrameworkSubmissionStatus
          submitted_at?: string
          locked_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          status?: FrameworkSubmissionStatus
          submitted_at?: string
          locked_at?: string | null
        }
      }
      programme_templates: {
        Row: {
          id: string
          title: string
          overview: string | null
          structure: string | null
          equipment: string | null
          tags: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          overview?: string | null
          structure?: string | null
          equipment?: string | null
          tags?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          overview?: string | null
          structure?: string | null
          equipment?: string | null
          tags?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      programme_sessions: {
        Row: {
          id: string
          programme_template_id: string
          week: number
          day_index: number
          title: string
          payload: Json
        }
        Insert: {
          id?: string
          programme_template_id: string
          week: number
          day_index: number
          title: string
          payload?: Json
        }
        Update: {
          id?: string
          programme_template_id?: string
          week?: number
          day_index?: number
          title?: string
          payload?: Json
        }
      }
      user_programmes: {
        Row: {
          user_id: string
          programme_template_id: string
          activated_at: string
          deactivated_at: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          programme_template_id: string
          activated_at?: string
          deactivated_at?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          programme_template_id?: string
          activated_at?: string
          deactivated_at?: string | null
          updated_at?: string
        }
      }
      daily_scores: {
        Row: {
          id: string
          user_id: string
          date: string
          delta: number
          breakdown: Json
          cutoff_at: string
          resolved_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          delta: number
          breakdown?: Json
          cutoff_at: string
          resolved_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          delta?: number
          breakdown?: Json
          cutoff_at?: string
          resolved_at?: string
        }
      }
      // V3 Tables
      teams: {
        Row: {
          id: string
          team_number: number
          created_at: string
        }
        Insert: {
          id?: string
          team_number: number
          created_at?: string
        }
        Update: {
          id?: string
          team_number?: number
          created_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          joined_at?: string
        }
      }
      team_daily_overviews: {
        Row: {
          id: string
          team_id: string
          date: string
          payload: Json
          generated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          date: string
          payload: Json
          generated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          date?: string
          payload?: Json
          generated_at?: string
        }
      }
      feed_posts: {
        Row: {
          id: string
          user_id: string
          block_id: string | null
          title: string
          body: string | null
          image_url: string | null
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          block_id?: string | null
          title: string
          body?: string | null
          image_url?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          block_id?: string | null
          title?: string
          body?: string | null
          image_url?: string | null
          created_at?: string
          deleted_at?: string | null
        }
      }
      feed_respects: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }
      daily_framework_items: {
        Row: {
          id: string
          user_id: string
          date: string
          criteria_id: string
          completed: boolean
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          criteria_id: string
          completed?: boolean
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          criteria_id?: string
          completed?: boolean
          completed_at?: string | null
        }
      }
    }
  }
}

// Block types - V2 includes 'challenge'
export type BlockType = 'workout' | 'habit' | 'nutrition' | 'checkin' | 'personal' | 'challenge'

export type RepeatPattern = 'none' | 'daily' | 'weekly' | 'custom'

export interface RepeatRule {
  pattern: RepeatPattern
  weekdays?: number[] // 0-6 for Sun-Sat (for weekly)
  interval?: number // every N days (for custom)
}

// Framework submission status
export type FrameworkSubmissionStatus = 'complete' | 'partial' | 'zero'

// Block type with media relations
export interface Block {
  id: string
  user_id: string
  date: string
  start_time: string
  end_time: string | null
  block_type: BlockType
  title: string | null
  notes: string | null
  payload: Json
  repeat_rule: RepeatRule | null
  completed_at: string | null
  locked_at: string | null
  is_backfilled: boolean
  backfilled_at: string | null
  challenge_id: string | null
  programme_template_id: string | null
  programme_session_id: string | null
  shared_to_feed: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  block_media?: BlockMedia[]
}

export interface BlockMedia {
  id: string
  block_id: string
  user_id: string
  storage_path: string
  media_type: 'image' | 'video'
  created_at: string
}

export interface Profile {
  id: string
  display_name: string | null
  height_cm: number | null
  discipline_score: number
  timezone: string
  is_paused: boolean
  committed_at: string
  current_streak: number
  best_streak: number
  last_resolved_date: string | null
  created_at: string
  updated_at: string
}

// Community Challenge
export interface CommunityChallenge {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
}

// Framework Template
export interface FrameworkTemplate {
  id: string
  title: string
  description: string | null
  criteria: FrameworkCriteria
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FrameworkCriteria {
  items: FrameworkCriteriaItem[]
}

export interface FrameworkCriteriaItem {
  id: string
  label: string
  description?: string
}

// User Framework (active framework)
export interface UserFramework {
  user_id: string
  framework_template_id: string
  activated_at: string
  updated_at: string
  framework_template?: FrameworkTemplate
}

// Daily Framework Submission
export interface DailyFrameworkSubmission {
  id: string
  user_id: string
  date: string
  status: FrameworkSubmissionStatus
  submitted_at: string
  locked_at: string | null
}

// Programme Template
export interface ProgrammeTemplate {
  id: string
  title: string
  overview: string | null
  structure: string | null
  equipment: string | null
  tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  sessions?: ProgrammeSession[]
}

// Programme Session
export interface ProgrammeSession {
  id: string
  programme_template_id: string
  week: number
  day_index: number
  title: string
  payload: Json
}

// User Programme (active programme)
export interface UserProgramme {
  user_id: string
  programme_template_id: string
  activated_at: string
  deactivated_at: string | null
  updated_at: string
  programme_template?: ProgrammeTemplate
}

// Daily Score
export interface DailyScore {
  id: string
  user_id: string
  date: string
  delta: number
  breakdown: ScoreBreakdown
  cutoff_at: string
  resolved_at: string
}

export interface ScoreBreakdown {
  completed_blocks: number
  challenge_bonus: number
  framework_points: number
  full_day_bonus: number
  missed_penalty: number
  no_plan_penalty: number
}

// Payload types for each block type
export interface ExerciseEntry {
  exercise: string
  sets: number
  reps: string
  weight: string
  notes?: string
}

export interface WorkoutPayload {
  exercise_matrix: ExerciseEntry[]
  duration?: number
  rpe?: number
}

export interface HabitPayload {
  // No additional required fields
}

export interface NutritionPayload {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  meal_name: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
}

export interface CheckinPayload {
  weight: number
  height?: number
  body_fat_percent?: number
}

export interface PersonalPayload {
  // No additional required fields
}

export interface ChallengePayload {
  challenge_id: string
}

// ============================================
// V3 Types - Teams, Feed, Framework Items
// ============================================

// Team
export interface Team {
  id: string
  team_number: number
  created_at: string
  members?: TeamMember[]
}

// Team Member
export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  joined_at: string
  profile?: Profile
}

// Team Daily Overview
export interface TeamDailyOverview {
  id: string
  team_id: string
  date: string
  payload: TeamOverviewPayload
  generated_at: string
}

export interface TeamOverviewPayload {
  members: TeamMemberOverview[]
}

export interface TeamMemberOverview {
  user_id: string
  display_name: string
  planned: number
  completed: number
  missed: number
  daily_delta: number
}

// Feed Post
export interface FeedPost {
  id: string
  user_id: string
  block_id: string | null
  title: string
  body: string | null
  image_url: string | null
  created_at: string
  deleted_at: string | null
  // Joined data
  profile?: Profile
  block?: Block
  respects_count?: number
  user_has_respected?: boolean
}

// Feed Respect
export interface FeedRespect {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

// Daily Framework Item (V3 - individual criteria tracking)
export interface DailyFrameworkItem {
  id: string
  user_id: string
  date: string
  criteria_id: string
  completed: boolean
  completed_at: string | null
}

// ============================================
// Discipline Score Helpers (derived, no table)
// ============================================

export interface DisciplineLevel {
  level: number
  badge: DisciplineBadge
  progress: number // 0-100 percentage to next level
  scoreIntoLevel: number
  toNextLevel: number
}

export type DisciplineBadge = 'Initiated' | 'Committed' | 'Elite' | 'Forged' | '44-Pro'

/**
 * Calculate discipline level from score
 * Formula: level = floor( (-1 + sqrt(1 + 4*S)) / 2 ), capped at 44
 */
export function calculateDisciplineLevel(score: number): DisciplineLevel {
  const S = Math.max(score, 0)
  let level = Math.floor((-1 + Math.sqrt(1 + 4 * S)) / 2)
  level = Math.min(level, 44)

  let progress = 100
  let scoreIntoLevel = 0
  let toNextLevel = 0

  if (level < 44) {
    const levelMin = level * (level + 1)
    scoreIntoLevel = S - levelMin
    toNextLevel = 2 * (level + 1)
    progress = (scoreIntoLevel / toNextLevel) * 100
  }

  const badge = getBadgeForLevel(level)

  return { level, badge, progress, scoreIntoLevel, toNextLevel }
}

/**
 * Get badge tier from level
 * 0-3: Initiated, 4-13: Committed, 14-23: Elite, 24-33: Forged, 34-44: 44-Pro
 */
export function getBadgeForLevel(level: number): DisciplineBadge {
  if (level <= 3) return 'Initiated'
  if (level <= 13) return 'Committed'
  if (level <= 23) return 'Elite'
  if (level <= 33) return 'Forged'
  return '44-Pro'
}
