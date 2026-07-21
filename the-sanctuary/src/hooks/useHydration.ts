import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/db/db'
import { getLocalDateKey } from '@/lib/date'
import { DEFAULT_HYDRATION_TARGET } from '@/types/schemas'

export function useHydration(): {
  count: number
  target: number
  isLoading: boolean
  increment: () => Promise<void>
  decrement: () => Promise<void>
} {
  const dateKey = getLocalDateKey()
  const record = useLiveQuery(() => db.hydration.get(dateKey), [dateKey])

  async function adjust(delta: number) {
    const current = record?.count ?? 0
    const target = record?.target ?? DEFAULT_HYDRATION_TARGET
    const next = Math.max(0, current + delta)

    await db.hydration.put({
      id: dateKey,
      date: dateKey,
      count: next,
      target,
      updatedAt: new Date().toISOString(),
    })
  }

  return {
    count: record?.count ?? 0,
    target: record?.target ?? DEFAULT_HYDRATION_TARGET,
    isLoading: record === undefined,
    increment: () => adjust(1),
    decrement: () => adjust(-1),
  }
}
