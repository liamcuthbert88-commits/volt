import { useMemo, useState } from 'react'
import { Shuffle } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getEligibleQuests, pickSuggestedQuest } from '@/services/questSuggestionService'
import { questCategories } from '@/lib/quest-categories'
import { completeQuestForToday } from '@/hooks/useTodayQuestCompletions'
import type { FogLevel, Quest, QuestCompletion } from '@/types/schemas'

interface NextGentleActionProps {
  quests: Quest[]
  completionsToday: QuestCompletion[]
  fogLevel: FogLevel
  energy: number
}

const FOG_INTRO: Record<FogLevel, string | null> = {
  clear: null,
  misty: 'Keeping things simple.',
  'heavy-fog': 'Today can be small. One gentle action is enough.',
}

export function NextGentleAction({
  quests,
  completionsToday,
  fogLevel,
  energy,
}: NextGentleActionProps) {
  const eligible = useMemo(
    () => getEligibleQuests(quests, completionsToday, fogLevel, energy),
    [quests, completionsToday, fogLevel, energy],
  )

  const [shownId, setShownId] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  // Adjust the shown suggestion while rendering (React's documented pattern
  // for "reset state when a computed value changes") rather than in an
  // effect. The fallback pick is deterministic (first eligible quest, not
  // random) so this stays pure across repeated render attempts — the
  // randomised pick is reserved for the explicit "Choose another" click.
  const stillEligible = shownId !== null && eligible.some((quest) => quest.id === shownId)
  if (!stillEligible) {
    const fallbackId = eligible[0]?.id ?? null
    if (fallbackId !== shownId) {
      setShownId(fallbackId)
    }
  }

  const shownQuest = eligible.find((quest) => quest.id === shownId) ?? null
  const categoryMeta = shownQuest
    ? questCategories.find((c) => c.value === shownQuest.category)
    : undefined

  async function handleComplete() {
    if (!shownQuest) return
    setIsCompleting(true)
    try {
      await completeQuestForToday(shownQuest.id)
    } finally {
      setIsCompleting(false)
    }
  }

  function handleChooseAnother() {
    setShownId(pickSuggestedQuest(eligible, shownId ?? undefined)?.id ?? null)
  }

  const intro = FOG_INTRO[fogLevel]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next gentle action</CardTitle>
      </CardHeader>
      <CardContent>
        {intro && <p className="mb-4 text-sm text-accent">{intro}</p>}

        {!shownQuest && (
          <p className="text-muted-foreground">
            Nothing left to suggest for right now — that's alright, today already counts.
          </p>
        )}

        {shownQuest && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase">
                {categoryMeta && <categoryMeta.icon aria-hidden="true" className="size-3.5" />}
                {categoryMeta?.label}
                <span aria-hidden="true">·</span>
                <span>~{shownQuest.estimatedMinutes} min</span>
              </div>
              <h3 className="mt-1.5 text-xl text-foreground">{shownQuest.title}</h3>
              {shownQuest.description && (
                <p className="mt-1 text-muted-foreground">{shownQuest.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={handleComplete} disabled={isCompleting}>
                {isCompleting ? 'Marking done…' : 'Complete'}
              </Button>
              <Button type="button" variant="outline" onClick={handleChooseAnother}>
                <Shuffle aria-hidden="true" />
                Choose another
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
