import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function InsightsPage() {
  return (
    <>
      <PageHeader
        title="Insights"
        description="Gentle patterns over time, for noticing rather than judging."
      />
      <Card>
        <CardHeader>
          <CardTitle>What will live here</CardTitle>
          <CardDescription>
            This is a placeholder for mood, energy, and quest trends.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground">
          <p>
            You'll see simple charts of mood and energy over time and which
            quest categories you've reached for. The goal is gentle
            awareness, never a scorecard.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
