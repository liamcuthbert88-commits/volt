import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { navItems } from '@/components/layout/nav-items'

export function Sidebar() {
  return (
    <nav
      aria-label="Primary"
      className="hidden w-64 shrink-0 flex-col gap-1 border-r border-border-soft bg-surface/60 px-4 py-8 md:flex"
    >
      <div className="mb-6 px-3">
        <p className="text-xl text-foreground">The Sanctuary</p>
        <p className="text-sm text-muted-foreground">A gentle place to land</p>
      </div>

      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex min-h-[var(--tap-size)] items-center gap-3 rounded-lg px-3 text-base transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-surface-raised hover:text-foreground',
            )
          }
        >
          <Icon aria-hidden="true" className="size-5 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
