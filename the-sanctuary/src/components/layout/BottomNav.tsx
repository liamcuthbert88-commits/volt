import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { navItems } from '@/components/layout/nav-items'

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border-soft bg-surface/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch justify-around">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[var(--tap-size)] flex-col items-center justify-center gap-1 py-2 text-xs transition-colors',
                  isActive
                    ? 'text-accent'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <Icon aria-hidden="true" className="size-6 shrink-0" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
