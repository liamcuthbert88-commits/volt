import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/db/db'
import { getLocalDateKey } from '@/lib/date'
import type { QuestCompletion } from '@/types/schemas'

export function useTodayQuestCompletions(): {
  completions: QuestCompletion[]
  dateKey: string
  isLoading: boolean
} {
  const dateKey = getLocalDateKey()
  const completions = useLiveQuery(
    () => db.questCompletions.where('date').equals(dateKey).toArray(),
    [dateKey],
  )
  return { completions: completions ?? [], dateKey, isLoading: completions === undefined }
}

/**
 * Records a completion for a quest today, guarding against duplicates via
 * the [questId+date] compound index — if one already exists, this is a
 * no-op rather than a second row.
 */
export async function completeQuestForToday(questId: string): Promise<void> {
  const dateKey = getLocalDateKey()
  const existing = await db.questCompletions
    .where('[questId+date]')
    .equals([questId, dateKey])
    .first()

  if (existing) return

  await db.questCompletions.add({
    id: crypto.randomUUID(),
    questId,
    date: dateKey,
    completedAt: new Date().toISOString(),
  })
}
