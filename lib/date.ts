import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  subDays,
  isToday,
  isSameDay,
  parseISO,
  addWeeks,
  subWeeks,
} from 'date-fns'

// Get the week days starting from Monday
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

// Get the start of week (Monday)
export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

// Get the end of week (Sunday)
export function getWeekEnd(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 })
}

// Get date range for fetching (14 days: 7 before + 7 after selected week)
export function getDateRange(selectedDate: Date): { start: string; end: string } {
  const weekStart = getWeekStart(selectedDate)
  const start = subDays(weekStart, 7)
  const end = addDays(weekStart, 13) // 7 days of week + 6 more

  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

// Format date for display in day headers
// Format: "Jan 27 · Today · Tuesday" or "Jan 28 · Wednesday"
export function formatDayHeader(date: Date): string {
  const monthDay = format(date, 'MMM d')
  const dayName = format(date, 'EEEE')

  if (isToday(date)) {
    return `${monthDay} · Today · ${dayName}`
  }

  return `${monthDay} · ${dayName}`
}

// Format date for API (ISO date string)
export function formatDateForApi(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

// Parse ISO date string to Date
export function parseDate(dateString: string): Date {
  return parseISO(dateString)
}

// Parse a date-only string (e.g. "2024-02-19") into a local-timezone Date.
// new Date("2024-02-19") treats it as UTC midnight, which shifts backward
// one day in western timezones. This function avoids that by constructing
// the date with local year/month/day components.
export function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Round time to nearest 5 minutes
export function roundToNearest5Minutes(date: Date = new Date()): string {
  const minutes = date.getMinutes()
  const roundedMinutes = Math.round(minutes / 5) * 5
  const hours = date.getHours() + (roundedMinutes === 60 ? 1 : 0)
  const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes

  return `${String(hours % 24).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`
}

// Format time for display (12-hour format)
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

// Check if two dates are the same day
export function isSameDayDate(date1: Date, date2: Date): boolean {
  return isSameDay(date1, date2)
}

// Navigate weeks
export function getNextWeek(date: Date): Date {
  return addWeeks(date, 1)
}

export function getPreviousWeek(date: Date): Date {
  return subWeeks(date, 1)
}

// Increment time by 5 minutes (for duplicate)
export function incrementTime(time: string, minutes: number = 5): string {
  const [hours, mins] = time.split(':').map(Number)
  const totalMinutes = hours * 60 + mins + minutes
  const newHours = Math.floor(totalMinutes / 60) % 24
  const newMins = totalMinutes % 60
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
}

// Get short day name (Mon, Tue, etc.)
export function getShortDayName(date: Date): string {
  return format(date, 'EEE')
}

// Get day number
export function getDayNumber(date: Date): number {
  return date.getDate()
}
