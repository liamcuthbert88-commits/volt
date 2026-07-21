import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { questCategories } from '@/lib/quest-categories'
import type { Quest, QuestCompletion } from '@/types/schemas'

interface CategoryProgressProps {
  quests: Quest[]
  completionsToday: QuestCompletion[]
}

export function CategoryProgress({ quests, completionsToday }: CategoryProgressProps) {
  const questCategoryById = new Map(quests.map((quest) => [quest.id, quest.category]))
  const completedCategories = new Set(
    completionsToday
      .map((completion) => questCategoryById.get(completion.questId))
      .filter((category) => category !== undefined),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's categories</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {questCategories.map(({ value, label, icon: Icon }) => {
            const done = completedCategories.has(value)
            return (
              <div key={value} className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex size-12 items-center justify-center rounded-full border transition-colors',
                    done
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-border-soft bg-surface text-ink-faint',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Anything completed is progress — none of these need to fill up.
        </p>
      </CardContent>
    </Card>
  )
}
