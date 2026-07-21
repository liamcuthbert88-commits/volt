import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function JournalPage() {
  return (
    <>
      <PageHeader
        title="Journal"
        description="A private space for whatever's on your mind."
      />
      <Card>
        <CardHeader>
          <CardTitle>What will live here</CardTitle>
          <CardDescription>
            This is a placeholder for free-form journal entries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground">
          <p>
            You'll be able to write short or long entries, tag them with a
            mood, and look back over past ones. Everything stays on this
            device.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
