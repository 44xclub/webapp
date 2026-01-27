export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type BlockType = 'workout' | 'habit' | 'nutrition' | 'checkin' | 'personal'

export type RepeatPattern = 'none' | 'daily' | 'weekly' | 'custom'

export interface RepeatRule {
  pattern: RepeatPattern
  weekdays?: number[] // 0-6 for Sun-Sat (for weekly)
  interval?: number // every N days (for custom)
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          height_cm: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          height_cm?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          height_cm?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'block_media_block_id_fkey'
            columns: ['block_id']
            referencedRelation: 'blocks'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

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
  height_cm: number | null
  created_at: string
  updated_at: string
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
