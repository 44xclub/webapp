import { z } from 'zod'

// Repeat rule schema
export const repeatRuleSchema = z.object({
  pattern: z.enum(['none', 'daily', 'weekly', 'custom']),
  weekdays: z.array(z.number().min(0).max(6)).optional(),
  interval: z.number().positive().optional(),
}).nullable()

// Individual set within an exercise
export const exerciseSetSchema = z.object({
  set: z.number(),
  reps: z.union([z.number(), z.string()]).default(''),
  weight: z.union([z.number(), z.string()]).default(''),
  completed: z.boolean().optional(),
})

// Exercise entry for workout (set-level logging)
export const exerciseEntrySchema = z.object({
  exercise: z.string().min(1, 'Exercise name is required'),
  sets: z.array(exerciseSetSchema).min(1, 'At least one set is required'),
  notes: z.string().optional(),
})

// Base block schema (universal fields)
export const baseBlockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format'),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format').nullable().optional(),
  notes: z.string().optional().nullable(),
  repeat_rule: repeatRuleSchema.optional(),
})

// Workout schema (supports programme + custom subtypes with category-conditional fields)
export const workoutSchema = baseBlockSchema.extend({
  block_type: z.literal('workout'),
  title: z.string().min(1, 'Title is required'),
  payload: z.object({
    subtype: z.enum(['programme', 'custom']).optional(),
    category: z.enum(['weight_lifting', 'hyrox', 'hybrid', 'running', 'sport', 'other']).optional(),
    exercise_matrix: z.array(exerciseEntrySchema).optional(),
    description: z.string().optional(),
    duration: z.number().positive().optional(),
    rpe: z.number().min(1).max(10).optional(),
    // Programme reference fields
    programme_template_id: z.string().optional(),
    programme_session_id: z.string().optional(),
    session_title: z.string().optional(), // Snapshot of session title at time of creation
    // Running/Sport/Other specific fields
    distance_km: z.number().positive().optional(),
    pace: z.string().optional(), // e.g., "4:45/km"
  }),
  shared_to_feed: z.boolean().optional(),
})

// Habit schema
export const habitSchema = baseBlockSchema.extend({
  block_type: z.literal('habit'),
  title: z.string().min(1, 'Title is required'),
  payload: z.object({}).optional(),
  shared_to_feed: z.boolean().optional(),
})

// Nutrition schema
export const nutritionSchema = baseBlockSchema.extend({
  block_type: z.literal('nutrition'),
  title: z.string().optional().nullable(),
  payload: z.object({
    meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    meal_name: z.string().min(1, 'Meal name is required'),
    calories: z.number().nonnegative().optional(),
    protein: z.number().nonnegative().optional(),
    carbs: z.number().nonnegative().optional(),
    fat: z.number().nonnegative().optional(),
  }),
})

// Check-in schema
export const checkinSchema = baseBlockSchema.extend({
  block_type: z.literal('checkin'),
  title: z.string().optional().nullable(),
  payload: z.object({
    weight: z.number({
      required_error: 'Weight is required',
      invalid_type_error: 'Weight is required',
    }).positive('Weight must be greater than 0'),
    height: z.number().positive().optional(),
    body_fat_percent: z.number().min(0).max(100).optional(),
  }),
  shared_to_feed: z.boolean().optional(),
})

// Task item schema for personal blocks
export const taskItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(120),
  done: z.boolean(),
  sort_order: z.number(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
})

export type TaskItem = z.infer<typeof taskItemSchema>

// Personal schema
export const personalSchema = baseBlockSchema.extend({
  block_type: z.literal('personal'),
  title: z.string().min(1, 'Title is required'),
  payload: z.object({
    tasks: z.array(taskItemSchema).max(30).optional(),
  }).optional(),
})

// Challenge schema (share forced ON)
export const challengeSchema = baseBlockSchema.extend({
  block_type: z.literal('challenge'),
  title: z.string().min(1, 'Title is required'),
  payload: z.object({
    challenge_id: z.string().optional(),
  }).optional(),
  shared_to_feed: z.boolean().optional(),
})

// Combined block schema (discriminated union)
export const blockSchema = z.discriminatedUnion('block_type', [
  workoutSchema,
  habitSchema,
  nutritionSchema,
  checkinSchema,
  personalSchema,
  challengeSchema,
])

// Type exports
export type WorkoutFormData = z.infer<typeof workoutSchema>
export type HabitFormData = z.infer<typeof habitSchema>
export type NutritionFormData = z.infer<typeof nutritionSchema>
export type CheckinFormData = z.infer<typeof checkinSchema>
export type PersonalFormData = z.infer<typeof personalSchema>
export type ChallengeFormData = z.infer<typeof challengeSchema>
export type BlockFormData = z.infer<typeof blockSchema>

// Helper to validate block data
export function validateBlock(data: unknown): BlockFormData {
  return blockSchema.parse(data)
}

// Helper schemas for partial updates
export const updateBlockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  payload: z.record(z.any()).optional(),
  repeat_rule: repeatRuleSchema.optional(),
  completed_at: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
})

export type UpdateBlockData = z.infer<typeof updateBlockSchema>
