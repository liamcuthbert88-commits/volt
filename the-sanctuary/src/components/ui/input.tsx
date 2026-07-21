import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex min-h-[var(--tap-size)] w-full rounded-md border border-border bg-surface px-4 py-2.5 text-base text-foreground',
        'placeholder:text-ink-faint outline-none',
        'focus-visible:border-accent',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
