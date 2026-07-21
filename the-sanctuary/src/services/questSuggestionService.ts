import type { FogLevel, Quest, QuestCompletion, QuestEffort } from '@/types/schemas'

const EFFORT_RANK: Record<QuestEffort, number> = {
  'very-low': 0,
  low: 1,
  medium: 2,
  high: 3,
}

/** How much effort feels reachable at a given energy level, on a clear day. */
function maxEffortRankForEnergy(energy: number): number {
  if (energy <= 2) return EFFORT_RANK.low
  if (energy === 3) return EFFORT_RANK.medium
  return EFFORT_RANK.high
}

/**
 * Fog level caps effort regardless of energy — heavy fog means "very small"
 * even on a high-energy day. Clear days defer entirely to energy.
 */
function maxEffortRank(fogLevel: FogLevel, energy: number): number {
  if (fogLevel === 'heavy-fog') return EFFORT_RANK['very-low']
  if (fogLevel === 'misty') return EFFORT_RANK.low
  return maxEffortRankForEnergy(energy)
}

/**
 * Quests that are live candidates right now: not archived, not already
 * completed today, and within the effort ceiling for the current fog level
 * and energy.
 */
export function getEligibleQuests(
  quests: Quest[],
  completionsToday: QuestCompletion[],
  fogLevel: FogLevel,
  energy: number,
): Quest[] {
  const completedQuestIds = new Set(completionsToday.map((c) => c.questId))
  const ceiling = maxEffortRank(fogLevel, energy)

  return quests.filter(
    (quest) =>
      !quest.isArchived &&
      !completedQuestIds.has(quest.id) &&
      EFFORT_RANK[quest.effort] <= ceiling,
  )
}

/** Picks one eligible quest, optionally avoiding a specific id ("choose another"). */
export function pickSuggestedQuest(
  eligibleQuests: Quest[],
  excludeId?: string,
): Quest | null {
  const pool = excludeId
    ? eligibleQuests.filter((quest) => quest.id !== excludeId)
    : eligibleQuests
  const candidates = pool.length > 0 ? pool : eligibleQuests

  if (candidates.length === 0) return null

  const index = Math.floor(Math.random() * candidates.length)
  return candidates[index] ?? null
}
