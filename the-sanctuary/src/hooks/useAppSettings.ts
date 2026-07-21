import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/db/db'
import type { AppSettings } from '@/types/schemas'

const APP_SETTINGS_ID = 'app-settings'

export function useAppSettings(): { settings: AppSettings | undefined; isLoading: boolean } {
  const settings = useLiveQuery(() => db.appSettings.get(APP_SETTINGS_ID), [])
  return { settings, isLoading: settings === undefined }
}

export { APP_SETTINGS_ID }
