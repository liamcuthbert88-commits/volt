import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

import { db } from '@/db/db'
import { LOCAL_USER_ID } from '@/hooks/useUserProfile'
import { APP_SETTINGS_ID } from '@/hooks/useAppSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

const TOTAL_STEPS = 3

interface OnboardingState {
  preferredName: string
  companionName: string
  remindersEnabled: boolean
  morningReminderTime: string
  eveningReminderTime: string
  reduceMotion: boolean
  highContrast: boolean
}

const initialState: OnboardingState = {
  preferredName: '',
  companionName: 'Moth',
  remindersEnabled: false,
  morningReminderTime: '08:00',
  eveningReminderTime: '20:00',
  reduceMotion: false,
  highContrast: false,
}

export function WelcomePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [state, setState] = useState<OnboardingState>(initialState)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  const canContinue = step !== 0 || state.preferredName.trim().length > 0

  async function handleComplete() {
    setError(null)
    setIsSaving(true)
    const now = new Date().toISOString()

    try {
      await db.userProfiles.put({
        id: LOCAL_USER_ID,
        displayName: state.preferredName.trim(),
        companionName: state.companionName.trim() || 'Moth',
        createdAt: now,
      })

      await db.appSettings.put({
        id: APP_SETTINGS_ID,
        reduceMotion: state.reduceMotion,
        highContrast: state.highContrast,
        notificationsEnabled: state.remindersEnabled,
        morningReminderTime: state.remindersEnabled ? state.morningReminderTime : undefined,
        eveningReminderTime: state.remindersEnabled ? state.eveningReminderTime : undefined,
        onboardingCompleted: true,
        updatedAt: now,
      })

      navigate('/home', { replace: true })
    } catch {
      setError(
        "Something went wrong saving that. Your device's storage might be full or restricted — you can try again.",
      )
      setIsSaving(false)
    }
  }

  function handleContinue() {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1)
    } else {
      void handleComplete()
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-border-soft bg-surface shadow-[var(--shadow-candle)]">
            <span aria-hidden="true" className="text-2xl">
              🕯️
            </span>
          </div>
          <h1 className="text-3xl text-foreground">The Sanctuary</h1>
        </div>

        <div className="mb-6" aria-hidden="true">
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index <= step ? 'bg-accent' : 'bg-surface-overlay'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
        </div>

        <div className="rounded-xl border border-border-soft bg-card p-6 shadow-[var(--shadow-deep)]">
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl text-foreground">Let's get acquainted</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nothing here is shared anywhere — it just helps the space feel like
                  yours.
                </p>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">
                  What should we call you?
                </span>
                <Input
                  autoFocus
                  value={state.preferredName}
                  onChange={(e) => update('preferredName', e.target.value)}
                  placeholder="Preferred name"
                  maxLength={80}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">
                  What should your companion be called?
                </span>
                <Input
                  value={state.companionName}
                  onChange={(e) => update('companionName', e.target.value)}
                  placeholder="Moth"
                  maxLength={60}
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl text-foreground">Gentle reminders</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Entirely optional — quiet nudges, never alarms.
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border-soft bg-surface px-4 py-3.5">
                <label htmlFor="reminders-enabled" className="text-base text-foreground">
                  Enable reminders
                </label>
                <Switch
                  id="reminders-enabled"
                  checked={state.remindersEnabled}
                  onCheckedChange={(checked) => update('remindersEnabled', checked)}
                />
              </div>
              {state.remindersEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm text-muted-foreground">Morning</span>
                    <Input
                      type="time"
                      value={state.morningReminderTime}
                      onChange={(e) => update('morningReminderTime', e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm text-muted-foreground">Evening</span>
                    <Input
                      type="time"
                      value={state.eveningReminderTime}
                      onChange={(e) => update('eveningReminderTime', e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl text-foreground">Comfort</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You can change either of these anytime in Settings.
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border-soft bg-surface px-4 py-3.5">
                <label htmlFor="reduce-motion" className="text-base text-foreground">
                  Reduce motion
                </label>
                <Switch
                  id="reduce-motion"
                  checked={state.reduceMotion}
                  onCheckedChange={(checked) => update('reduceMotion', checked)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border-soft bg-surface px-4 py-3.5">
                <label htmlFor="high-contrast" className="text-base text-foreground">
                  High contrast
                </label>
                <Switch
                  id="high-contrast"
                  checked={state.highContrast}
                  onCheckedChange={(checked) => update('highContrast', checked)}
                />
              </div>
              {error && <p className="text-sm text-notice">{error}</p>}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || isSaving}
            className={step === 0 ? 'invisible' : ''}
          >
            <ChevronLeft aria-hidden="true" />
            Back
          </Button>
          <Button type="button" onClick={handleContinue} disabled={!canContinue || isSaving}>
            {step === TOTAL_STEPS - 1
              ? isSaving
                ? 'Entering…'
                : 'Enter the Sanctuary'
              : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
