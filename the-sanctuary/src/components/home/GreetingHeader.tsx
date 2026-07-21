import { formatDisplayDate, getTimeOfDay } from '@/lib/date'

interface GreetingHeaderProps {
  preferredName: string | undefined
  companionMessage: string
}

const GREETING_BY_TIME_OF_DAY = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
} as const

export function GreetingHeader({ preferredName, companionMessage }: GreetingHeaderProps) {
  const greeting = GREETING_BY_TIME_OF_DAY[getTimeOfDay()]

  return (
    <header className="mb-6">
      <p className="text-sm text-muted-foreground">{formatDisplayDate()}</p>
      <h1 className="mt-1 text-3xl text-foreground sm:text-4xl">
        {greeting}
        {preferredName ? `, ${preferredName}` : ''}.
      </h1>
      <p className="mt-2 text-base text-accent">{companionMessage}</p>
    </header>
  )
}
