import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/db/db'
import type { UserProfile } from '@/types/schemas'

const LOCAL_USER_ID = 'local-user'

export function useUserProfile(): { profile: UserProfile | undefined; isLoading: boolean } {
  const profile = useLiveQuery(() => db.userProfiles.get(LOCAL_USER_ID), [])
  return { profile, isLoading: profile === undefined }
}

export { LOCAL_USER_ID }
