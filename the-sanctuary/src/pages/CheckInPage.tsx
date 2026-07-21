import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { db } from '@/db/db'
import { useTodayCheckIn } from '@/hooks/useTodayCheckIn'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScaleSelect } from '@/components/ui/scale-select'
import { cn } from '@/lib/utils'
import { ENERGY_OPTIONS, FOG_OPTIONS, MOOD_OPTIONS, OVERWHELM_OPTIONS } from '@/lib/check-in-options'
import { dailyCheckInSchema, type FogLevel } from '@/types/schemas'

export function CheckInPage() {
  const navigate = useNavigate()
  const { checkIn, dateKey } = useTodayCheckIn()

  const [mood, setMood] = useState<number>()
  const [energy, setEnergy] = useState<number>()
  const [overwhelm, setOverwhelm] = useState<number>()
  const [fogLevel, setFogLevel] = useState<FogLevel>('clear')
  const [note, setNote] = useState('')
  const [hydratedForDate, setHydratedForDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  // Load today's existing check-in into the form exactly once per day, the
  // moment it resolves. This is React's documented "adjust state while
  // rendering" pattern rather than an effect, so it settles within the same
  // render pass instead of stomping over fields you're actively editing.
  if (checkIn && hydratedForDate !== dateKey) {
    setMood(checkIn.mood)
    setEnergy(checkIn.energy)
    setOverwhelm(checkIn.overwhelm)
    setFogLevel(checkIn.fogLevel)
    setNote(checkIn.note ?? '')
    setHydratedForDate(dateKey)
  }

  const canSave = mood !== undefined && energy !== undefined && overwhelm !== undefined

  async function handleSave() {
    if (!canSave) return
    setError(null)
    setIsSaving(true)

    const now = new Date().toISOString()
    const record = {
      id: dateKey,
      date: dateKey,
      mood,
      energy,
      overwhelm,
      fogLevel,
      note: note.trim() ? note.trim() : undefined,
      createdAt: checkIn?.createdAt ?? now,
      updatedAt: now,
    }

    const parsed = dailyCheckInSchema.safeParse(record)
    if (!parsed.success) {
      setError('That check-in has an unexpected value in it — try adjusting a selection.')
      setIsSaving(false)
      return
    }

    try {
      await db.dailyCheckIns.put(parsed.data)
      setJustSaved(true)
      setTimeout(() => navigate('/home'), 1100)
    } catch {
      setError(
        "Something went wrong saving that. Your device's storage might be full or restricted — you can try again.",
      )
      setIsSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Check-in"
        description="A quick, low-pressure moment to note how you're doing. Nothing here is judged."
      />

      <Card>
        <CardContent className="flex flex-col gap-8 pt-5">
          <ScaleSelect label="Mood" name="mood" options={MOOD_OPTIONS} value={mood} onChange={setMood} />
          <ScaleSelect
            label="Energy"
            name="energy"
            options={ENERGY_OPTIONS}
            value={energy}
            onChange={setEnergy}
          />
          <ScaleSelect
            label="Overwhelm"
            name="overwhelm"
            options={OVERWHELM_OPTIONS}
            value={overwhelm}
            onChange={setOverwhelm}
          />

          <fieldset>
            <legend className="mb-3 text-lg text-foreground">Fog level</legend>
            <div role="radiogroup" aria-label="Fog level" className="grid grid-cols-3 gap-2.5">
              {FOG_OPTIONS.map(({ value, label, icon: Icon }) => {
                const selected = fogLevel === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setFogLevel(value)}
                    className={cn(
                      'flex min-h-[var(--tap-size)] flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-4 text-center transition-colors',
                      selected
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-border-soft bg-surface text-muted-foreground hover:bg-surface-raised hover:text-foreground',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-6" />
                    <span className="text-sm">{label}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="text-lg text-foreground">Anything you'd like to note?</span>
            <span className="text-sm text-muted-foreground">Optional — a sentence is plenty.</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              rows={3}
              className="mt-1 w-full resize-none rounded-md border border-border bg-surface px-4 py-3 text-base text-foreground outline-none placeholder:text-ink-faint focus-visible:border-accent"
              placeholder="Optional note"
            />
          </label>

          {error && <p className="text-sm text-notice">{error}</p>}
          {justSaved && (
            <p className="text-sm text-calm" role="status">
              Saved. Thank you for checking in with yourself.
            </p>
          )}

          <div className="flex justify-end">
            <Button type="button" onClick={handleSave} disabled={!canSave || isSaving} size="lg">
              {isSaving ? 'Saving…' : checkIn ? 'Update check-in' : 'Save check-in'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
