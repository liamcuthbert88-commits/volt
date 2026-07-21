import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/db/db'
import { getLocalDateKey } from '@/lib/date'
import type { DailyCheckIn } from '@/types/schemas'

/**
 * Today's check-in record, if any. Records use their local date key as the
 * primary key (see dailyCheckInSchema / db.ts), so `get(dateKey)` doubles as
 * both the lookup and the guarantee of at most one record per day.
 */
export function useTodayCheckIn(): {
  checkIn: DailyCheckIn | undefined
  dateKey: string
  isLoading: boolean
} {
  const dateKey = getLocalDateKey()
  const checkIn = useLiveQuery(() => db.dailyCheckIns.get(dateKey), [dateKey])
  return { checkIn, dateKey, isLoading: checkIn === undefined }
}
