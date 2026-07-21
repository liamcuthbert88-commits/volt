import { Droplet, Minus, Plus } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useHydration } from '@/hooks/useHydration'

export function HydrationTracker() {
  const { count, target, increment, decrement } = useHydration()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Water</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Droplet aria-hidden="true" className="size-6 text-accent" />
            <span className="text-2xl text-foreground">
              {count} <span className="text-base text-muted-foreground">/ {target} glasses</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void decrement()}
              disabled={count === 0}
              aria-label="Remove one glass"
            >
              <Minus aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void increment()}
              aria-label="Add one glass"
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          A personal target, not a medical recommendation — {target} is just a starting point.
        </p>
      </CardContent>
    </Card>
  )
}
