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
          height_cm: number | null
          discipline_score: number
          timezone: string
          is_paused: boolean
          committed_at: string
          display_name: string | null
          avatar_path: string | null
          birth_date: string | null
          weight_kg: number | null
          current_streak: number
          best_streak: number
          last_resolved_date: string | null
          badge_tier: string
          badge_locked: boolean
          badge_locked_reasons: Json
          badge_last_evaluated_at: string | null
          whop_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          height_cm?: number | null
          discipline_score?: number
          timezone?: string
          is_paused?: boolean
          committed_at?: string
          display_name?: string | null
          avatar_path?: string | null
          birth_date?: string | null
          weight_kg?: number | null
          current_streak?: number
          best_streak?: number
          last_resolved_date?: string | null
          badge_tier?: string
          badge_locked?: boolean
          badge_locked_reasons?: Json
          badge_last_evaluated_at?: string | null
          whop_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          height_cm?: number | null
          discipline_score?: number
          timezone?: string
          is_paused?: boolean
          committed_at?: string
          display_name?: string | null
          avatar_path?: string | null
          birth_date?: string | null
          weight_kg?: number | null
          current_streak?: number
          best_streak?: number
          last_resolved_date?: string | null
          badge_tier?: string
          badge_locked?: boolean
          badge_locked_reasons?: Json
          badge_last_evaluated_at?: string | null
          whop_user_id?: string | null
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
          is_planned: boolean
          performed_at: string | null
          is_backfilled: boolean
          backfilled_at: string | null
          challenge_id: string | null
          programme_template_id: string | null
          programme_session_id: string | null
          shared_to_feed: boolean
          chat_message_sent_at: string | null
          chat_dispatch_status: 'pending' | 'sent' | 'failed' | null
          chat_dispatch_error: string | null
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
          is_planned?: boolean
          performed_at?: string | null
          is_backfilled?: boolean
          backfilled_at?: string | null
          challenge_id?: string | null
          programme_template_id?: string | null
          programme_session_id?: string | null
          shared_to_feed?: boolean
          chat_message_sent_at?: string | null
          chat_dispatch_status?: 'pending' | 'sent' | 'failed' | null
          chat_dispatch_error?: string | null
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
          is_planned?: boolean
          performed_at?: string | null
          is_backfilled?: boolean
          backfilled_at?: string | null
          challenge_id?: string | null
          programme_template_id?: string | null
          programme_session_id?: string | null
          shared_to_feed?: boolean
          chat_message_sent_at?: string | null
          chat_dispatch_status?: 'pending' | 'sent' | 'failed' | null
          chat_dispatch_error?: string | null
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
          sort_order: number
          slot: 'generic' | 'front' | 'side' | 'back' | null
          meta: Json
          created_at: string
        }
        Insert: {
          id?: string
          block_id: string
          user_id: string
          storage_path: string
          media_type: 'image' | 'video'
          sort_order?: number
          slot?: 'generic' | 'front' | 'side' | 'back' | null
          meta?: Json
          created_at?: string
        }
        Update: {
          id?: string
          block_id?: string
          user_id?: string
          storage_path?: string
          media_type?: 'image' | 'video'
          sort_order?: number
          slot?: 'generic' | 'front' | 'side' | 'back' | null
          meta?: Json
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
          card_image_path: string | null
          hero_image_path: string | null
          cover_image_path: string | null
          is_published: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          start_date: string
          end_date: string
          card_image_path?: string | null
          hero_image_path?: string | null
          cover_image_path?: string | null
          is_published?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string
          card_image_path?: string | null
          hero_image_path?: string | null
          cover_image_path?: string | null
          is_published?: boolean
          sort_order?: number
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
          image_path: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          criteria?: Json
          image_path?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          criteria?: Json
          image_path?: string | null
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
          hero_image_path: string | null
          tags: string[]
          is_active: boolean
          days_per_week: number | null
          duration_weeks: number | null
          programme_type: string | null
          equipment_tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          overview?: string | null
          structure?: string | null
          equipment?: string | null
          hero_image_path?: string | null
          tags?: string[]
          is_active?: boolean
          days_per_week?: number | null
          duration_weeks?: number | null
          programme_type?: string | null
          equipment_tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          overview?: string | null
          structure?: string | null
          equipment?: string | null
          hero_image_path?: string | null
          tags?: string[]
          is_active?: boolean
          days_per_week?: number | null
          duration_weeks?: number | null
          programme_type?: string | null
          equipment_tags?: string[] | null
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
      programme_runs: {
        Row: {
          id: string
          user_id: string
          programme_template_id: string
          status: string
          started_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          programme_template_id: string
          status?: string
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          programme_template_id?: string
          status?: string
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      programme_session_instances: {
        Row: {
          id: string
          programme_run_id: string
          programme_session_id: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          programme_run_id: string
          programme_session_id: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          programme_run_id?: string
          programme_session_id?: string
          completed_at?: string | null
          created_at?: string
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
      daily_framework_items: {
        Row: {
          user_id: string
          date: string
          framework_template_id: string
          criteria_key: string
          checked: boolean
          checked_at: string | null
        }
        Insert: {
          user_id: string
          date: string
          framework_template_id: string
          criteria_key: string
          checked?: boolean
          checked_at?: string | null
        }
        Update: {
          user_id?: string
          date?: string
          framework_template_id?: string
          criteria_key?: string
          checked?: boolean
          checked_at?: string | null
        }
      }
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
          team_id: string
          user_id: string
          role: 'captain' | 'member'
          joined_at: string
          left_at: string | null
        }
        Insert: {
          team_id: string
          user_id: string
          role?: 'captain' | 'member'
          joined_at?: string
          left_at?: string | null
        }
        Update: {
          team_id?: string
          user_id?: string
          role?: 'captain' | 'member'
          joined_at?: string
          left_at?: string | null
        }
      }
      team_daily_overviews: {
        Row: {
          id: string
          team_id: string
          date: string
          cutoff_at: string
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          date: string
          cutoff_at: string
          payload?: Json
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          date?: string
          cutoff_at?: string
          payload?: Json
          created_at?: string
        }
      }
      daily_user_activity: {
        Row: {
          user_id: string
          date: string
          last_activity_at: string
          activity_types: string[]
          block_count: number
        }
        Insert: {
          user_id: string
          date: string
          last_activity_at?: string
          activity_types?: string[]
          block_count?: number
        }
        Update: {
          user_id?: string
          date?: string
          last_activity_at?: string
          activity_types?: string[]
          block_count?: number
        }
      }
      daily_user_metrics: {
        Row: {
          user_id: string
          date: string
          timezone: string
          planned_blocks: number
          completed_blocks: number
          execution_rate: number
          framework_checked: number
          base_points: number
          penalties: number
          multiplier: number
          gated: boolean
          delta: number
          created_at: string
        }
        Insert: {
          user_id: string
          date: string
          timezone: string
          planned_blocks?: number
          completed_blocks?: number
          execution_rate?: number
          framework_checked?: number
          base_points?: number
          penalties?: number
          multiplier?: number
          gated?: boolean
          delta?: number
          created_at?: string
        }
        Update: {
          user_id?: string
          date?: string
          timezone?: string
          planned_blocks?: number
          completed_blocks?: number
          execution_rate?: number
          framework_checked?: number
          base_points?: number
          penalties?: number
          multiplier?: number
          gated?: boolean
          delta?: number
          created_at?: string
        }
      }
      feed_posts: {
        Row: {
          id: string
          user_id: string
          block_id: string | null
          title: string
          body: string | null
          media_path: string | null
          payload: Json
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          block_id?: string | null
          title: string
          body?: string | null
          media_path?: string | null
          payload?: Json
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          block_id?: string | null
          title?: string
          body?: string | null
          media_path?: string | null
          payload?: Json
          created_at?: string
          deleted_at?: string | null
        }
      }
      feed_respects: {
        Row: {
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }
      reflection_cycles: {
        Row: {
          id: string
          start_date: string
          end_date: string
          label: string
          created_at: string
        }
        Insert: {
          id?: string
          start_date: string
          end_date: string
          label: string
          created_at?: string
        }
        Update: {
          id?: string
          start_date?: string
          end_date?: string
          label?: string
          created_at?: string
        }
      }
      voice_commands_log: {
        Row: {
          id: string
          user_id: string
          raw_transcript: string | null
          proposed_action: Json
          approved_action: Json | null
          confidence: number | null
          needs_clarification: string[]
          status: 'proposed' | 'executed' | 'failed' | 'cancelled'
          block_id: string | null
          error_message: string | null
          executed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          raw_transcript?: string | null
          proposed_action?: Json
          approved_action?: Json | null
          confidence?: number | null
          needs_clarification?: string[]
          status?: 'proposed' | 'executed' | 'failed' | 'cancelled'
          block_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          raw_transcript?: string | null
          proposed_action?: Json
          approved_action?: Json | null
          confidence?: number | null
          needs_clarification?: string[]
          status?: 'proposed' | 'executed' | 'failed' | 'cancelled'
          block_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reflection_entries: {
        Row: {
          id: string
          user_id: string
          cycle_id: string
          answers: Json
          status: 'draft' | 'submitted'
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cycle_id: string
          answers?: Json
          status?: 'draft' | 'submitted'
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cycle_id?: string
          answers?: Json
          status?: 'draft' | 'submitted'
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
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
  is_planned: boolean
  performed_at: string | null
  chat_message_sent_at: string | null
  chat_dispatch_status: 'pending' | 'sent' | 'failed' | null
  chat_dispatch_error: string | null
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
  sort_order: number
  slot?: 'generic' | 'front' | 'side' | 'back' | null
  meta?: Record<string, unknown>
  created_at: string
}

export interface Profile {
  id: string
  height_cm: number | null
  discipline_score: number
  timezone: string
  is_paused: boolean
  committed_at: string
  display_name: string | null
  avatar_path: string | null
  birth_date: string | null
  weight_kg: number | null
  current_streak: number
  best_streak: number
  last_resolved_date: string | null
  badge_tier: string
  badge_locked: boolean
  badge_locked_reasons: Json
  badge_last_evaluated_at: string | null
  whop_user_id: string | null
  created_at: string
  updated_at: string
}

// Daily User Activity (streak source of truth)
export interface DailyUserActivity {
  user_id: string
  date: string
  last_activity_at: string
  activity_types: string[]
  block_count: number
}

// Daily User Metrics (reconciliation audit row)
export interface DailyUserMetrics {
  user_id: string
  date: string
  timezone: string
  planned_blocks: number
  completed_blocks: number
  execution_rate: number
  framework_checked: number
  base_points: number
  penalties: number
  multiplier: number
  gated: boolean
  delta: number
  created_at: string
}

// Community Challenge
export interface CommunityChallenge {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  card_image_path: string | null
  hero_image_path: string | null
  cover_image_path: string | null
  is_published: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Framework Template
export interface FrameworkTemplate {
  id: string
  title: string
  description: string | null
  criteria: FrameworkCriteria
  image_path: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FrameworkCriteria {
  items?: FrameworkCriteriaItem[]
}

export interface FrameworkCriteriaItem {
  key: string
  label: string
  description?: string
  type?: 'boolean' | 'number'
  target?: number
  unit?: string
  required?: boolean
  category?: string
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
  hero_image_path: string | null
  tags: string[]
  is_active: boolean
  days_per_week: number | null
  duration_weeks: number | null
  programme_type: string | null
  equipment_tags: string[] | null
  created_at: string
  updated_at: string
  sessions?: ProgrammeSession[]
}

// Programme Run
export interface ProgrammeRun {
  id: string
  user_id: string
  programme_template_id: string
  status: string
  started_at: string
  completed_at: string | null
  created_at: string
}

// Programme Session Instance
export interface ProgrammeSessionInstance {
  id: string
  programme_run_id: string
  programme_session_id: string
  completed_at: string | null
  created_at: string
}

// Programme Progress
export interface ProgrammeProgress {
  totalSessions: number
  completedSessions: number
  percent: number
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
export type WorkoutSubtype = 'programme' | 'custom'
export type WorkoutCategory = 'weight_lifting' | 'hyrox' | 'hybrid' | 'running' | 'sport' | 'other'

export interface ExerciseSet {
  set: number
  reps: number | string
  weight: number | string
  completed?: boolean
}

export interface ExerciseEntry {
  exercise: string
  sets: ExerciseSet[]
  notes?: string
}

// Legacy flat format (pre-v4) for backward compat in display
export interface LegacyExerciseEntry {
  exercise: string
  sets: number
  reps: string
  weight: string
  notes?: string
}

export interface WorkoutPayload {
  subtype?: WorkoutSubtype
  category?: WorkoutCategory
  exercise_matrix?: ExerciseEntry[]
  description?: string
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

export interface TaskItem {
  id: string
  text: string
  done: boolean
  sort_order: number
  created_at: string
  completed_at: string | null
}

export interface PersonalPayload {
  tasks?: TaskItem[]
}

export interface ChallengePayload {
  challenge_id: string
}

// ============================================
// V3 Types - Teams, Feed, Framework Items
// ============================================

// Daily Framework Item (live ticking)
export interface DailyFrameworkItem {
  user_id: string
  date: string
  framework_template_id: string
  criteria_key: string
  checked: boolean
  checked_at: string | null
}

// Team
export interface Team {
  id: string
  team_number: number
  created_at: string
}

// Team Member
export interface TeamMember {
  team_id: string
  user_id: string
  role: 'captain' | 'member'
  joined_at: string
  left_at: string | null
  profiles?: Profile
  teams?: Team
}

// Team Daily Overview (snapshot)
export interface TeamDailyOverview {
  id: string
  team_id: string
  date: string
  cutoff_at: string
  payload: TeamSnapshot
  created_at: string
}

export interface TeamSnapshot {
  date: string
  team_number: number
  summary: {
    executed: string            // e.g. "5/8"
    avg_execution: number       // 0-1
    team_delta: number
  }
  highlights: TeamSnapshotHighlight[]
  flags: TeamSnapshotFlag[]
  // Legacy compat fields
  members: TeamMemberSnapshot[]
  total_score: number
  avg_score: number
}

export interface TeamSnapshotHighlight {
  user_id: string
  name: string
  delta: number
  execution: number
}

export interface TeamSnapshotFlag {
  user_id: string
  name: string
  reason: string
}

export interface TeamMemberSnapshot {
  user_id: string
  display_name: string | null
  avatar_path: string | null
  discipline_score: number
  daily_delta: number
  execution_rate: number
  planned_blocks: number
  completed_blocks: number
  framework_status: FrameworkSubmissionStatus | null
}

// Feed Post
export interface FeedPost {
  id: string
  user_id: string
  block_id: string | null
  title: string
  body: string | null
  media_path: string | null
  payload: FeedPostPayload
  created_at: string
  deleted_at: string | null
  // Joined data
  user_profile?: Profile
  respect_count?: number
  has_respected?: boolean
  block?: Block
}

export interface FeedPostPayload {
  workout_matrix?: ExerciseEntry[]
  duration?: number
  rpe?: number
}

// Feed Respect
export interface FeedRespect {
  post_id: string
  user_id: string
  created_at: string
}

// ============================================
// Personal Programmes
// ============================================

export type ProgrammeFocus = 'strength' | 'hypertrophy' | 'conditioning' | 'hybrid'
export type PersonalProgrammeStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export interface PersonalProgramme {
  id: string
  user_id: string
  title: string
  days_per_week: number
  focus: ProgrammeFocus
  status: PersonalProgrammeStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Joined data
  days?: PersonalProgrammeDay[]
}

export interface PersonalProgrammeDay {
  id: string
  programme_id: string
  day_index: number
  title: string
  created_at: string
  updated_at: string
  // Joined data
  exercises?: PersonalProgrammeExercise[]
}

export interface PersonalProgrammeExercise {
  id: string
  programme_day_id: string
  sort_order: number
  exercise_name: string
  sets: number | null
  reps: string | null
  notes: string | null
  created_at: string
}

// Snapshot stored in block payload when scheduling
export interface ProgrammeBlockPayload {
  source: 'personal_programme'
  programme_id: string
  programme_day_id: string
  programme_title: string
  day_title: string
  exercises: {
    name: string
    sets: number | null
    reps: string | null
    notes: string | null
  }[]
}

// ============================================
// Personal Discipline Framework
// ============================================

export type FrameworkVisibility = 'global' | 'personal'

// Extended FrameworkTemplate with personal fields
export interface PersonalFrameworkTemplate extends FrameworkTemplate {
  visibility: FrameworkVisibility
  owner_user_id: string | null
}

// ============================================
// Admin Review Queue
// ============================================

export type ReviewEntityType = 'programme' | 'framework'
export type ReviewStatus = 'open' | 'reviewed' | 'dismissed'

export interface AdminReviewEntry {
  id: string
  entity_type: ReviewEntityType
  entity_id: string
  user_id: string
  status: ReviewStatus
  notes: string | null
  created_at: string
  reviewed_at: string | null
}

// ============================================
// Discipline Score & Badge System
// Based on 44CLUB Discipline Score Spec
// ============================================

/**
 * Badge tiers based on LIFETIME DISCIPLINE SCORE (not level)
 * 8 badges total for long-term progression
 */
export type DisciplineBadge =
  | 'Initiated'    // 0-100
  | 'Aligned'      // 101-250
  | 'Committed'    // 251-450
  | 'Disciplined'  // 451-700
  | 'Elite'        // 701-1200
  | 'Forged'       // 1201-2000
  | 'Vanguard'     // 2001-3200
  | '44 Pro'       // 3201+

/**
 * Badge thresholds - score ranges for each badge
 */
export const BADGE_THRESHOLDS: { badge: DisciplineBadge; min: number; max: number }[] = [
  { badge: 'Initiated', min: 0, max: 100 },
  { badge: 'Aligned', min: 101, max: 250 },
  { badge: 'Committed', min: 251, max: 450 },
  { badge: 'Disciplined', min: 451, max: 700 },
  { badge: 'Elite', min: 701, max: 1200 },
  { badge: 'Forged', min: 1201, max: 2000 },
  { badge: 'Vanguard', min: 2001, max: 3200 },
  { badge: '44 Pro', min: 3201, max: Infinity },
]

/**
 * Discipline level info derived from lifetime score
 * Each badge has 5 internal levels (1-5)
 */
export interface DisciplineLevel {
  badge: DisciplineBadge
  badgeLevel: number            // 1-5 within the badge
  lifetimeScore: number         // Total accumulated score
  progressInBadge: number       // 0-100 percentage within current badge
  scoreInBadge: number          // Points earned within this badge tier
  toNextBadge: number           // Points needed for next badge (0 if max)
}

/**
 * Badge wear eligibility - determines if badge can be displayed
 * Based on recent 7-day behavior
 */
export interface BadgeEligibility {
  canWearBadge: boolean
  executedDays: number          // Days with execution >= 60% (need >= 4 of 7)
  avgExecution: number          // Average execution % over 7 days (need >= 70%)
  zeroPlanDays: number          // Days with 0 planned blocks in last 5 (need 0)
  reason?: string               // Reason if ineligible
}

/**
 * Complete discipline info for a user
 */
export interface DisciplineInfo {
  level: DisciplineLevel
  eligibility: BadgeEligibility
}

// v_profiles_rank view response (DB-provided rank data)
export interface ProfileRank {
  user_id: string
  display_name: string | null
  avatar_path: string | null
  discipline_score: number
  badge: DisciplineBadge
  badge_level: number           // 1-5 within badge
  badge_progress_pct: number    // 0-100 progress within badge
  can_wear_badge: boolean
  current_streak: number
  best_streak: number
  is_paused: boolean
  // Eligibility details (optional)
  executed_days_7d?: number
  avg_execution_7d?: number
  zero_plan_days_5d?: number
}

/**
 * Get badge from lifetime discipline score
 */
export function getBadgeFromScore(score: number): DisciplineBadge {
  const s = Math.max(score, 0)
  for (const t of BADGE_THRESHOLDS) {
    if (s >= t.min && s <= t.max) return t.badge
  }
  return '44 Pro'
}

/**
 * Get badge threshold info
 */
export function getBadgeThreshold(badge: DisciplineBadge): { min: number; max: number } {
  const threshold = BADGE_THRESHOLDS.find(t => t.badge === badge)
  return threshold || { min: 0, max: 100 }
}

/**
 * Calculate discipline level from lifetime score
 * Badge determined by score range, badge level (1-5) determined by progress within badge
 */
export function calculateDisciplineLevel(score: number): DisciplineLevel {
  const s = Math.max(score, 0)
  const badge = getBadgeFromScore(s)
  const threshold = getBadgeThreshold(badge)

  // Calculate progress within badge
  const badgeRange = threshold.max === Infinity ? 1000 : threshold.max - threshold.min + 1
  const scoreInBadge = s - threshold.min
  const progressInBadge = threshold.max === Infinity
    ? Math.min((scoreInBadge / 1000) * 100, 100)
    : (scoreInBadge / badgeRange) * 100

  // Calculate badge level (1-5) based on progress
  // Each level represents 20% of the badge range
  let badgeLevel = Math.floor(progressInBadge / 20) + 1
  badgeLevel = Math.min(badgeLevel, 5)

  // Points to next badge
  const toNextBadge = threshold.max === Infinity ? 0 : threshold.max - s + 1

  return {
    badge,
    badgeLevel,
    lifetimeScore: s,
    progressInBadge: Math.min(progressInBadge, 100),
    scoreInBadge,
    toNextBadge: Math.max(toNextBadge, 0),
  }
}

/**
 * Calculate badge eligibility from recent daily scores
 * Requirements:
 * - >= 4 executed days in last 7 (execution >= 60%)
 * - Average execution >= 70% over last 7 days
 * - No days with 0 planned blocks in last 5 days
 */
export function calculateBadgeEligibility(
  dailyScores: Array<{ date: string; planned: number; completed: number }>
): BadgeEligibility {
  if (dailyScores.length === 0) {
    return {
      canWearBadge: false,
      executedDays: 0,
      avgExecution: 0,
      zeroPlanDays: 0,
      reason: 'No recent activity data',
    }
  }

  // Sort by date descending
  const sorted = [...dailyScores].sort((a, b) => b.date.localeCompare(a.date))
  const last7 = sorted.slice(0, 7)
  const last5 = sorted.slice(0, 5)

  // Count executed days (planned > 0 AND execution >= 60%)
  let executedDays = 0
  let totalExecution = 0
  let daysWithPlanned = 0

  for (const day of last7) {
    if (day.planned > 0) {
      daysWithPlanned++
      const execRate = day.completed / day.planned
      totalExecution += execRate
      if (execRate >= 0.6) executedDays++
    }
  }

  const avgExecution = daysWithPlanned > 0 ? (totalExecution / daysWithPlanned) * 100 : 0

  // Count zero-plan days in last 5
  const zeroPlanDays = last5.filter(d => d.planned === 0).length

  // Check eligibility
  const reasons: string[] = []
  if (executedDays < 4) reasons.push(`Only ${executedDays}/4 executed days`)
  if (avgExecution < 70) reasons.push(`Avg execution ${avgExecution.toFixed(0)}% (need 70%)`)
  if (zeroPlanDays > 0) reasons.push(`${zeroPlanDays} day(s) with no plans`)

  return {
    canWearBadge: reasons.length === 0,
    executedDays,
    avgExecution,
    zeroPlanDays,
    reason: reasons.length > 0 ? reasons.join(', ') : undefined,
  }
}

/**
 * Scoring constants per the spec
 */
export const SCORING = {
  // Base points (completed only)
  WORKOUT: 2,
  HABIT: 1,
  NUTRITION: 1,
  CHALLENGE: 3,
  FRAMEWORK_ITEM: 1,  // Per checked item

  // Penalties (daily only, never reduce lifetime)
  MISSED_BLOCK: -2,
  MISSED_BLOCK_CAP: -8,
  PLANNED_ZERO_COMPLETED: -5,
  FRAMEWORK_ZERO_PROGRESS: -3,

  // Execution multipliers
  MULTIPLIER_100: 1.5,
  MULTIPLIER_80_99: 1.2,
  MULTIPLIER_60_79: 1.0,
  MULTIPLIER_40_59: 0.5,
  MULTIPLIER_BELOW_40: 0,
} as const

/**
 * Get execution multiplier from rate
 */
export function getExecutionMultiplier(executionRate: number): number {
  if (executionRate >= 1.0) return SCORING.MULTIPLIER_100
  if (executionRate >= 0.8) return SCORING.MULTIPLIER_80_99
  if (executionRate >= 0.6) return SCORING.MULTIPLIER_60_79
  if (executionRate >= 0.4) return SCORING.MULTIPLIER_40_59
  return SCORING.MULTIPLIER_BELOW_40
}

// ============================================
// Notifications
// ============================================

export type NotificationType =
  | 'programme_approved'
  | 'programme_rejected'
  | 'framework_approved'
  | 'framework_rejected'
  | 'streak_milestone'
  | 'badge_earned'
  | 'challenge_complete'
  | 'reflection_reminder'
  | 'team_update'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  payload: Json
  read_at: string | null
  created_at: string
}

// ============================================
// Reflection & Planning Types
// ============================================

export type ReflectionStatus = 'not_started' | 'draft' | 'submitted'

export interface ReflectionCycle {
  id: string
  start_date: string
  end_date: string
  label: string
  created_at: string
}

export interface ReflectionAnswers {
  q1?: string // What went well?
  q2?: string // What didn't go as planned?
  q3?: string // What did I learn?
  q4?: string // What will I do differently?
  q5?: string // What am I grateful for?
  q6?: string // What are my priorities for next cycle?
  q7?: string // What support do I need?
  q8?: string // One word to describe how I feel
}

export interface ReflectionEntry {
  id: string
  user_id: string
  cycle_id: string
  answers: ReflectionAnswers
  status: 'draft' | 'submitted'
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface ReflectionCycleWithEntry extends ReflectionCycle {
  entry?: ReflectionEntry | null
  displayStatus: ReflectionStatus
}

// ============================================
// Voice Commands Log (Voice Scheduling v1)
// ============================================

export type VoiceCommandStatus = 'proposed' | 'executed' | 'failed' | 'cancelled'

export interface VoiceCommandLog {
  id: string
  user_id: string
  raw_transcript: string | null
  proposed_action: Json
  approved_action: Json | null
  confidence: number | null
  needs_clarification: string[]
  status: VoiceCommandStatus
  block_id: string | null
  error_message: string | null
  executed_at: string | null
  created_at: string
  updated_at: string
}
