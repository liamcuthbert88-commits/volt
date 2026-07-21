import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Shape the Sanctuary around what you need."
      />
      <Card>
        <CardHeader>
          <CardTitle>What will live here</CardTitle>
          <CardDescription>
            This is a placeholder for profile, reminders, and app preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground">
          <p>
            You'll be able to set your display name, manage reminders,
            toggle reduced motion, and see exactly what's stored on this
            device. Everything here is local — no accounts, no cloud sync.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
