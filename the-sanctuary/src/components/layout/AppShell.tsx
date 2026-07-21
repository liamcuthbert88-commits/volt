import { Outlet } from 'react-router-dom'

import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'

export function AppShell() {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 px-4 pt-8 pb-24 sm:px-8 md:pb-8">
        <div className="mx-auto w-full max-w-3xl">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
