import { cn } from '@/lib/utils'

export interface ScaleOption {
  value: number
  label: string
}

interface ScaleSelectProps {
  label: string
  options: ScaleOption[]
  value: number | undefined
  onChange: (value: number) => void
  name: string
}

/**
 * Five large, clearly-labelled buttons standing in for a 1-5 rating — never
 * a native range slider, which is fiddly to land precisely on with a
 * touchscreen or a shaky hand.
 */
function ScaleSelect({ label, options, value, onChange, name }: ScaleSelectProps) {
  return (
    <fieldset>
      <legend className="mb-3 text-lg text-foreground">{label}</legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-5 sm:gap-2"
      >
        {options.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              name={name}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex min-h-[var(--tap-size)] flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-3 text-center transition-colors',
                selected
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border-soft bg-surface text-muted-foreground hover:bg-surface-raised hover:text-foreground',
              )}
            >
              <span className="text-lg leading-none font-semibold">{option.value}</span>
              <span className="text-xs leading-tight">{option.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export { ScaleSelect }
