import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function QuestsPage() {
  return (
    <>
      <PageHeader
        title="Quests"
        description="Small, achievable actions across care, movement, home, mind, and joy."
      />
      <Card>
        <CardHeader>
          <CardTitle>What will live here</CardTitle>
          <CardDescription>
            This is a placeholder for the quest list and completion tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground">
          <p>
            You'll see a short list of gentle quests to choose from, mark as
            done at your own pace, and add your own. No streaks, no
            unfinished-list guilt — just what got picked up today.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
