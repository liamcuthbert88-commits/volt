import { Brain, Footprints, HeartPulse, House, Smile } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { QuestCategory } from '@/types/schemas'

export interface QuestCategoryMeta {
  value: QuestCategory
  label: string
  icon: LucideIcon
}

export const questCategories: QuestCategoryMeta[] = [
  { value: 'care', label: 'Care', icon: HeartPulse },
  { value: 'movement', label: 'Movement', icon: Footprints },
  { value: 'home', label: 'Home', icon: House },
  { value: 'mind', label: 'Mind', icon: Brain },
  { value: 'joy', label: 'Joy', icon: Smile },
]
