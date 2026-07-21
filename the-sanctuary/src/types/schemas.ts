import { z } from 'zod'

/**
 * Zod schemas are the single source of truth for shape + runtime validation.
 * TypeScript types below are inferred from them so the two can never drift.
 *
 * Timestamps are stored as ISO 8601 strings (not Date objects) so records
 * serialize predictably and survive structured-clone round trips through
 * IndexedDB without ambiguity.
 */

export const questCategorySchema = z.enum(['care', 'movement', 'home', 'mind', 'joy'])
export type QuestCategory = z.infer<typeof questCategorySchema>

export const questEffortSchema = z.enum(['very-low', 'low', 'medium', 'high'])
export type QuestEffort = z.infer<typeof questEffortSchema>

export const fogLevelSchema = z.enum(['clear', 'misty', 'heavy-fog'])
export type FogLevel = z.infer<typeof fogLevelSchema>

/** 1 (lowest) through 5 (highest) — used for mood, energy, and overwhelm. */
export const scaleRatingSchema = z.number().int().min(1).max(5)

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected yyyy-MM-dd')
const isoDateTimeSchema = z.iso.datetime()
const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm')

export const userProfileSchema = z.object({
  id: z.string(),
  displayName: z.string().max(80).optional(),
  companionName: z.string().min(1).max(60),
  createdAt: isoDateTimeSchema,
})
export type UserProfile = z.infer<typeof userProfileSchema>

export const dailyCheckInSchema = z.object({
  id: z.string(),
  date: isoDateSchema,
  mood: scaleRatingSchema,
  energy: scaleRatingSchema,
  overwhelm: scaleRatingSchema,
  fogLevel: fogLevelSchema,
  note: z.string().max(2000).optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type DailyCheckIn = z.infer<typeof dailyCheckInSchema>

export const questSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(120),
  category: questCategorySchema,
  description: z.string().max(400).optional(),
  effort: questEffortSchema,
  estimatedMinutes: z.number().int().min(1).max(180),
  isCustom: z.boolean(),
  isArchived: z.boolean(),
  createdAt: isoDateTimeSchema,
})
export type Quest = z.infer<typeof questSchema>

export const questCompletionSchema = z.object({
  id: z.string(),
  questId: z.string(),
  date: isoDateSchema,
  completedAt: isoDateTimeSchema,
  note: z.string().max(500).optional(),
})
export type QuestCompletion = z.infer<typeof questCompletionSchema>

export const journalEntrySchema = z.object({
  id: z.string(),
  date: isoDateSchema,
  title: z.string().max(120).optional(),
  body: z.string().max(20000),
  mood: scaleRatingSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type JournalEntry = z.infer<typeof journalEntrySchema>

export const reminderSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(120),
  time: timeStringSchema,
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
  enabled: z.boolean(),
  createdAt: isoDateTimeSchema,
})
export type Reminder = z.infer<typeof reminderSchema>

/**
 * A gentle, non-punitive daily rollup. Deliberately has no concept of a
 * "streak" or "broken streak" — each day stands alone.
 */
export const sanctuaryProgressSchema = z.object({
  id: z.string(),
  date: isoDateSchema,
  questsCompleted: z.number().int().min(0),
  checkInCompleted: z.boolean(),
  journalCompleted: z.boolean(),
  candlesLit: z.number().int().min(0),
})
export type SanctuaryProgress = z.infer<typeof sanctuaryProgressSchema>

export const appSettingsSchema = z.object({
  id: z.string(),
  reduceMotion: z.boolean(),
  highContrast: z.boolean(),
  notificationsEnabled: z.boolean(),
  morningReminderTime: timeStringSchema.optional(),
  eveningReminderTime: timeStringSchema.optional(),
  onboardingCompleted: z.boolean(),
  updatedAt: isoDateTimeSchema,
})
export type AppSettings = z.infer<typeof appSettingsSchema>

/** A personal daily water target, not a medical recommendation. */
export const DEFAULT_HYDRATION_TARGET = 6

export const hydrationLogSchema = z.object({
  id: z.string(),
  date: isoDateSchema,
  count: z.number().int().min(0),
  target: z.number().int().min(1),
  updatedAt: isoDateTimeSchema,
})
export type HydrationLog = z.infer<typeof hydrationLogSchema>
