import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useOnboardingGuard } from '@/hooks/useOnboardingGuard'
import { SanctuaryLoading } from '@/components/routing/SanctuaryLoading'

/** Already-onboarded users hitting /welcome get sent straight to /home. */
export function WelcomeGate({ children }: { children: ReactNode }) {
  const status = useOnboardingGuard()

  if (status === 'loading') return <SanctuaryLoading />
  if (status === 'ready') return <Navigate to="/home" replace />

  return children
}
