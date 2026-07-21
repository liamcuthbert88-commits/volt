import { db } from '@/db/db'
import type { Quest } from '@/types/schemas'

type SeedQuest = Pick<
  Quest,
  'title' | 'category' | 'description' | 'effort' | 'estimatedMinutes'
>

/**
 * A small starting set, a few per category, spanning effort levels. Every
 * category has at least one "very-low" entry so heavy-fog suggestions never
 * run dry — see questSuggestionService.
 */
export const seedQuestData: SeedQuest[] = [
  {
    title: 'Drink a glass of water',
    category: 'care',
    description: 'A small glass, nothing fancy.',
    effort: 'very-low',
    estimatedMinutes: 1,
  },
  {
    title: 'Take your medication',
    category: 'care',
    description: 'Whatever is due right now.',
    effort: 'very-low',
    estimatedMinutes: 1,
  },
  {
    title: 'Wash your face',
    category: 'care',
    description: 'Just water is enough.',
    effort: 'low',
    estimatedMinutes: 3,
  },

  {
    title: 'Roll your shoulders',
    category: 'movement',
    description: 'A few slow circles, seated or standing.',
    effort: 'very-low',
    estimatedMinutes: 1,
  },
  {
    title: 'Stretch for two minutes',
    category: 'movement',
    description: 'Whatever feels good to loosen up.',
    effort: 'low',
    estimatedMinutes: 2,
  },
  {
    title: 'Take the dogs for a short walk',
    category: 'movement',
    description: 'Just around the block is enough.',
    effort: 'medium',
    estimatedMinutes: 15,
  },

  {
    title: 'Put away five items',
    category: 'home',
    description: 'Five things back where they belong.',
    effort: 'very-low',
    estimatedMinutes: 3,
  },
  {
    title: 'Clear one small surface',
    category: 'home',
    description: 'A corner of a table or a single shelf.',
    effort: 'low',
    estimatedMinutes: 5,
  },

  {
    title: 'Name three things you can see',
    category: 'mind',
    description: 'A quiet grounding moment, right where you are.',
    effort: 'very-low',
    estimatedMinutes: 1,
  },
  {
    title: 'Write down one thought',
    category: 'mind',
    description: "Doesn't need to be tidy or complete.",
    effort: 'very-low',
    estimatedMinutes: 2,
  },

  {
    title: 'Step outside for fresh air',
    category: 'joy',
    description: 'Even just the doorway counts.',
    effort: 'very-low',
    estimatedMinutes: 2,
  },
  {
    title: 'Listen to one favourite song',
    category: 'joy',
    description: 'Something that feels good right now.',
    effort: 'low',
    estimatedMinutes: 4,
  },
]

export async function seedDatabase(): Promise<void> {
  const existingQuestCount = await db.quests.count()

  if (existingQuestCount === 0) {
    const now = new Date().toISOString()
    await db.quests.bulkAdd(
      seedQuestData.map((quest) => ({
        id: crypto.randomUUID(),
        ...quest,
        isCustom: false,
        isArchived: false,
        createdAt: now,
      })),
    )
  }
}
