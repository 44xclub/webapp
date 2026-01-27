import { z } from 'zod'

// Repeat rule schema
export const repeatRuleSchema = z.object({
  pattern: z.enum(['none', 'daily', 'weekly', 'custom']),
  weekdays: z.array(z.number().min(0).max(6)).optional(),
  interval: z.number().positive().optional(),
}).nullable()

// Exercise entry for workout
export const exerciseEntrySchema = z.object({
  exercise: z.string().min(1, 'Exercise name is required'),
  sets: z.number().min(0),
  reps: z.string(),
  weight: z.string(),
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

// Workout schema
export const workoutSchema = baseBlockSchema.extend({
  block_type: z.literal('workout'),
  title: z.string().min(1, 'Title is required'),
  payload: z.object({
    exercise_matrix: z.array(exerciseEntrySchema).min(1, 'At least one exercise is required'),
    duration: z.number().positive().optional(),
    rpe: z.number().min(1).max(10).optional(),
  }),
})

// Habit schema
export const habitSchema = baseBlockSchema.extend({
  block_type: z.literal('habit'),
  title: z.string().min(1, 'Title is required'),
  payload: z.object({}).optional(),
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
    weight: z.number().positive('Weight is required'),
    height: z.number().positive().optional(),
    body_fat_percent: z.number().min(0).max(100).optional(),
  }),
})

// Personal schema
export const personalSchema = baseBlockSchema.extend({
  block_type: z.literal('personal'),
  title: z.string().min(1, 'Title is required'),
  payload: z.object({}).optional(),
})

// Combined block schema (discriminated union)
export const blockSchema = z.discriminatedUnion('block_type', [
  workoutSchema,
  habitSchema,
  nutritionSchema,
  checkinSchema,
  personalSchema,
])

// Type exports
export type WorkoutFormData = z.infer<typeof workoutSchema>
export type HabitFormData = z.infer<typeof habitSchema>
export type NutritionFormData = z.infer<typeof nutritionSchema>
export type CheckinFormData = z.infer<typeof checkinSchema>
export type PersonalFormData = z.infer<typeof personalSchema>
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
