import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl text-foreground sm:text-4xl">{title}</h1>
        {description && (
          <p className="max-w-prose text-base text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </header>
  )
}
