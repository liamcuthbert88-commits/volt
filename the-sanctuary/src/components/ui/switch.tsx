import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
  disabled?: boolean
  'aria-label'?: string
}

function Switch({ checked, onCheckedChange, id, disabled, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-border-soft transition-colors',
        'disabled:pointer-events-none disabled:opacity-40',
        checked ? 'bg-primary' : 'bg-surface-overlay',
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block size-6 translate-x-1 rounded-full bg-ink shadow-[var(--shadow-deep)] transition-transform',
          checked && 'translate-x-7',
        )}
      />
    </button>
  )
}

export { Switch }
