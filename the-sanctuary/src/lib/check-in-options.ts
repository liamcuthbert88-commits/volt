import { CloudDrizzle, CloudFog, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { ScaleOption } from '@/components/ui/scale-select'
import type { FogLevel } from '@/types/schemas'

export const MOOD_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Very low' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Steady' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Very good' },
]

export const ENERGY_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Empty' },
  { value: 2, label: 'Very low' },
  { value: 3, label: 'Limited' },
  { value: 4, label: 'Available' },
  { value: 5, label: 'Energised' },
]

export const OVERWHELM_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Calm' },
  { value: 2, label: 'Slightly stretched' },
  { value: 3, label: 'Busy' },
  { value: 4, label: 'Overwhelmed' },
  { value: 5, label: 'Maximum capacity' },
]

export interface FogOption {
  value: FogLevel
  label: string
  icon: LucideIcon
}

export const FOG_OPTIONS: FogOption[] = [
  { value: 'clear', label: 'Clear', icon: Sun },
  { value: 'misty', label: 'Misty', icon: CloudDrizzle },
  { value: 'heavy-fog', label: 'Heavy fog', icon: CloudFog },
]

function labelFor(options: ScaleOption[], value: number): string {
  return options.find((option) => option.value === value)?.label ?? String(value)
}

export const moodLabel = (value: number) => labelFor(MOOD_OPTIONS, value)
export const energyLabel = (value: number) => labelFor(ENERGY_OPTIONS, value)
export const overwhelmLabel = (value: number) => labelFor(OVERWHELM_OPTIONS, value)
export const fogLabel = (value: FogLevel) =>
  FOG_OPTIONS.find((option) => option.value === value)?.label ?? value
