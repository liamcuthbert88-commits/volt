import type { FogLevel } from '@/types/schemas'

export interface CompanionMessageInput {
  hasCheckedIn: boolean
  fogLevel: FogLevel | null
  energy: number | null
  questsCompletedToday: number
  companionName: string
}

/**
 * Deterministic, fully local message selection — same inputs always produce
 * the same message. No randomness, no network, no AI service. Priority
 * order: whether they've checked in yet, then fog level, then what's been
 * completed, then energy. Never references a "streak" or being behind.
 */
export function getCompanionMessage(input: CompanionMessageInput): string {
  const { hasCheckedIn, fogLevel, energy, questsCompletedToday, companionName } = input

  if (!hasCheckedIn) {
    return 'The sanctuary is open. We can begin gently.'
  }

  if (fogLevel === 'heavy-fog') {
    return questsCompletedToday > 0
      ? `${companionName} noticed that you showed up. That's today's shape, and it's enough.`
      : 'Today can be small. One gentle action is enough.'
  }

  if (questsCompletedToday > 0) {
    return 'One completed thing still counts.'
  }

  if (energy !== null && energy <= 2) {
    return 'You do not need to finish everything.'
  }

  if (fogLevel === 'misty') {
    return `${companionName} suggests keeping today simple.`
  }

  return `${companionName} is glad you're here.`
}
