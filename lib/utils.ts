import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Block type display names
export const blockTypeLabels: Record<string, string> = {
  workout: 'Workout',
  habit: 'Habit',
  nutrition: 'Nutrition',
  checkin: 'Check-in',
  personal: 'Personal',
  challenge: 'Challenge',
}

// Block type colors for UI - distinct colors for each type
export const blockTypeColors: Record<string, string> = {
  workout: 'text-orange-400 bg-orange-400/10',
  habit: 'text-emerald-400 bg-emerald-400/10',
  nutrition: 'text-sky-400 bg-sky-400/10',
  checkin: 'text-violet-400 bg-violet-400/10',
  personal: 'text-rose-400 bg-rose-400/10',
  challenge: 'text-amber-400 bg-amber-400/10',
}

// Block type accent colors for buttons/selectors
export const blockTypeAccentColors: Record<string, { bg: string; border: string; text: string }> = {
  workout: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-400' },
  habit: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-400' },
  nutrition: { bg: 'bg-sky-500', border: 'border-sky-500', text: 'text-sky-400' },
  checkin: { bg: 'bg-violet-500', border: 'border-violet-500', text: 'text-violet-400' },
  personal: { bg: 'bg-rose-500', border: 'border-rose-500', text: 'text-rose-400' },
  challenge: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-400' },
}

// Meal type labels
export const mealTypeLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

// Repeat pattern labels
export const repeatPatternLabels: Record<string, string> = {
  none: 'None',
  daily: 'Daily',
  weekly: 'Weekly',
  custom: 'Custom',
}

// Weekday labels
export const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Calculate duration between two time strings (HH:MM format)
export function calculateDuration(startTime: string, endTime: string | null): number | null {
  if (!endTime || !startTime) return null

  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  // Handle cases where end time is before start time (crossed midnight)
  if (endMinutes < startMinutes) {
    return (24 * 60 - startMinutes) + endMinutes
  }

  return endMinutes - startMinutes
}
