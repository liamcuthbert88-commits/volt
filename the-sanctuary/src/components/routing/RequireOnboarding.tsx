import { Navigate, Outlet } from 'react-router-dom'

import { useOnboardingGuard } from '@/hooks/useOnboardingGuard'
import { SanctuaryLoading } from '@/components/routing/SanctuaryLoading'

/** Guards every non-/welcome route — new/incomplete users get sent to onboard. */
export function RequireOnboarding() {
  const status = useOnboardingGuard()

  if (status === 'loading') return <SanctuaryLoading />
  if (status === 'needs-onboarding') return <Navigate to="/welcome" replace />

  return <Outlet />
}
