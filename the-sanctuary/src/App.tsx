import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { RequireOnboarding } from '@/components/routing/RequireOnboarding'
import { WelcomeGate } from '@/components/routing/WelcomeGate'
import { WelcomePage } from '@/pages/WelcomePage'
import { HomePage } from '@/pages/HomePage'
import { CheckInPage } from '@/pages/CheckInPage'
import { QuestsPage } from '@/pages/QuestsPage'
import { JournalPage } from '@/pages/JournalPage'
import { InsightsPage } from '@/pages/InsightsPage'
import { SettingsPage } from '@/pages/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        <Route
          path="/welcome"
          element={
            <WelcomeGate>
              <WelcomePage />
            </WelcomeGate>
          }
        />

        <Route element={<RequireOnboarding />}>
          <Route element={<AppShell />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/check-in" element={<CheckInPage />} />
            <Route path="/quests" element={<QuestsPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
