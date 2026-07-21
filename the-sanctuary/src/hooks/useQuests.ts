import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/db/db'
import type { Quest } from '@/types/schemas'

export function useQuests(): { quests: Quest[]; isLoading: boolean } {
  const quests = useLiveQuery(
    () => db.quests.toArray().then((all) => all.filter((quest) => !quest.isArchived)),
    [],
  )
  return { quests: quests ?? [], isLoading: quests === undefined }
}
