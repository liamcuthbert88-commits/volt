import { format } from 'date-fns'

/**
 * Stable local-calendar-day key, e.g. "2026-07-18". Always derived from the
 * device's local time (date-fns `format` uses local time, never UTC), so a
 * check-in made at 11pm and one made the next morning at 1am land on
 * different days as the user actually experiences them.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDisplayDate(date: Date = new Date()): string {
  return format(date, 'EEEE, d MMMM')
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening'

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}
