import { useEffect, useState } from 'react'

import { db } from '@/db/db'

export type OnboardingGuardStatus = 'loading' | 'needs-onboarding' | 'ready'

/**
 * Re-checks onboarding status fresh on every mount (not a live subscription)
 * — it only needs to be correct at the moment a guarded route is entered,
 * and re-mounts naturally on every navigation across the /welcome boundary.
 * IndexedDB errors are treated as "needs onboarding" rather than crashing.
 */
export function useOnboardingGuard(): OnboardingGuardStatus {
  const [status, setStatus] = useState<OnboardingGuardStatus>('loading')

  useEffect(() => {
    let cancelled = false

    db.appSettings
      .get('app-settings')
      .then((settings) => {
        if (cancelled) return
        setStatus(settings?.onboardingCompleted ? 'ready' : 'needs-onboarding')
      })
      .catch(() => {
        if (!cancelled) setStatus('needs-onboarding')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return status
}
