import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { energyLabel, fogLabel, moodLabel, overwhelmLabel } from '@/lib/check-in-options'
import type { DailyCheckIn } from '@/types/schemas'

interface CheckInSummaryCardProps {
  checkIn: DailyCheckIn | undefined
}

export function CheckInSummaryCard({ checkIn }: CheckInSummaryCardProps) {
  if (!checkIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's check-in</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="text-muted-foreground">
            No pressure — check in whenever feels right today.
          </p>
          <Link to="/check-in" className={cn(buttonVariants())}>
            Check in with yourself
          </Link>
        </CardContent>
      </Card>
    )
  }

  const stats: { label: string; value: string }[] = [
    { label: 'Mood', value: moodLabel(checkIn.mood) },
    { label: 'Energy', value: energyLabel(checkIn.energy) },
    { label: 'Overwhelm', value: overwhelmLabel(checkIn.overwhelm) },
    { label: 'Fog', value: fogLabel(checkIn.fogLevel) },
  ]

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Today's check-in</CardTitle>
        <Link
          to="/check-in"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <Pencil aria-hidden="true" className="size-4" />
          Edit
        </Link>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-base text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        {checkIn.note && (
          <p className="mt-4 border-t border-border-soft pt-4 text-sm text-muted-foreground">
            "{checkIn.note}"
          </p>
        )}
      </CardContent>
    </Card>
  )
}
