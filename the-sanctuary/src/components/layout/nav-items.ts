import {
  BookHeart,
  Compass,
  Home,
  ListChecks,
  Settings,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/check-in', label: 'Check-in', icon: Compass },
  { to: '/quests', label: 'Quests', icon: ListChecks },
  { to: '/journal', label: 'Journal', icon: BookHeart },
  { to: '/insights', label: 'Insights', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
]
