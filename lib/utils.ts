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

// Block type colors for UI
export const blockTypeColors: Record<string, string> = {
  workout: 'text-orange-400 bg-orange-400/10',
  habit: 'text-green-400 bg-green-400/10',
  nutrition: 'text-blue-400 bg-blue-400/10',
  checkin: 'text-purple-400 bg-purple-400/10',
  personal: 'text-pink-400 bg-pink-400/10',
  challenge: 'text-yellow-400 bg-yellow-400/10',
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
