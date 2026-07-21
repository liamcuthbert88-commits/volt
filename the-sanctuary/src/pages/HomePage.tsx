import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { useUserProfile } from '@/hooks/useUserProfile'
import { useTodayCheckIn } from '@/hooks/useTodayCheckIn'
import { useTodayQuestCompletions } from '@/hooks/useTodayQuestCompletions'
import { useQuests } from '@/hooks/useQuests'
import { getCompanionMessage } from '@/services/companionMessageService'
import { GreetingHeader } from '@/components/home/GreetingHeader'
import { CheckInSummaryCard } from '@/components/home/CheckInSummaryCard'
import { NextGentleAction } from '@/components/home/NextGentleAction'
import { CategoryProgress } from '@/components/home/CategoryProgress'
import { HydrationTracker } from '@/components/home/HydrationTracker'
import { Button } from '@/components/ui/button'

const NEUTRAL_ENERGY = 3

export function HomePage() {
  const { profile } = useUserProfile()
  const { checkIn } = useTodayCheckIn()
  const { completions } = useTodayQuestCompletions()
  const { quests } = useQuests()
  const [showMore, setShowMore] = useState(false)

  const companionName = profile?.companionName ?? 'Moth'
  const fogLevel = checkIn?.fogLevel ?? 'clear'
  const energy = checkIn?.energy ?? NEUTRAL_ENERGY

  const companionMessage = getCompanionMessage({
    hasCheckedIn: Boolean(checkIn),
    fogLevel: checkIn?.fogLevel ?? null,
    energy: checkIn?.energy ?? null,
    questsCompletedToday: completions.length,
    companionName,
  })

  const isHeavyFog = fogLevel === 'heavy-fog'
  const showSecondarySections = !isHeavyFog || showMore

  return (
    <>
      <GreetingHeader preferredName={profile?.displayName} companionMessage={companionMessage} />

      <div className="flex flex-col gap-5">
        <CheckInSummaryCard checkIn={checkIn} />

        <NextGentleAction
          quests={quests}
          completionsToday={completions}
          fogLevel={fogLevel}
          energy={energy}
        />

        {isHeavyFog && !showMore && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowMore(true)}
            className="self-start"
          >
            <ChevronDown aria-hidden="true" />
            Show more
          </Button>
        )}

        {showSecondarySections && (
          <>
            <CategoryProgress quests={quests} completionsToday={completions} />
            <HydrationTracker />
          </>
        )}
      </div>
    </>
  )
}
