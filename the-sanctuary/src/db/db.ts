import Dexie, { type EntityTable } from 'dexie'

import type {
  AppSettings,
  DailyCheckIn,
  HydrationLog,
  JournalEntry,
  Quest,
  QuestCompletion,
  Reminder,
  SanctuaryProgress,
  UserProfile,
} from '@/types/schemas'

class SanctuaryDatabase extends Dexie {
  userProfiles!: EntityTable<UserProfile, 'id'>
  dailyCheckIns!: EntityTable<DailyCheckIn, 'id'>
  quests!: EntityTable<Quest, 'id'>
  questCompletions!: EntityTable<QuestCompletion, 'id'>
  journalEntries!: EntityTable<JournalEntry, 'id'>
  reminders!: EntityTable<Reminder, 'id'>
  sanctuaryProgress!: EntityTable<SanctuaryProgress, 'id'>
  appSettings!: EntityTable<AppSettings, 'id'>
  hydration!: EntityTable<HydrationLog, 'id'>

  constructor() {
    super('sanctuary')

    this.version(1).stores({
      userProfiles: 'id',
      dailyCheckIns: 'id, date',
      quests: 'id, category, isArchived',
      questCompletions: 'id, questId, date',
      journalEntries: 'id, date',
      reminders: 'id, enabled',
      sanctuaryProgress: 'id, date',
      appSettings: 'id',
    })

    // v2: adds hydration tracking, a [questId+date] compound index to make
    // duplicate quest completions on the same day structurally preventable,
    // and quest effort/duration fields used by fog-aware suggestions. Stock
    // (non-custom) quests are cleared so seedDatabase() repopulates them
    // with the new fields — custom, user-authored quests are left alone.
    //
    // Boolean fields (isArchived, isCustom, enabled) are deliberately left
    // out of index lists: IndexedDB key paths don't support boolean values,
    // so entries would silently be dropped from the index. Those fields are
    // filtered in JS instead.
    this.version(2)
      .stores({
        userProfiles: 'id',
        dailyCheckIns: 'id, date',
        quests: 'id, category, effort',
        questCompletions: 'id, questId, date, [questId+date]',
        journalEntries: 'id, date',
        reminders: 'id',
        sanctuaryProgress: 'id, date',
        appSettings: 'id',
        hydration: 'id, date',
      })
      .upgrade(async (tx) => {
        await tx
          .table('quests')
          .filter((quest) => !quest.isCustom)
          .delete()
      })
  }
}

export const db = new SanctuaryDatabase()
