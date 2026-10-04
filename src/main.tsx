import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { FileWorkspaceProvider } from './lib/files'
import { OrganizerProvider } from './lib/organizer'
import { PreferencesProvider } from './lib/preferences'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import './global/reset.css'
import './global/tokens.css'
import './global/material.css'
import './global/material-light.css'

const container = document.getElementById('root')

if (!container) throw new Error('Elemento #root nao encontrado no index.html')

function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <PreferencesProvider>
        <FileWorkspaceProvider>
          <OrganizerProvider>
            <AppRoutes />
          </OrganizerProvider>
        </FileWorkspaceProvider>
      </PreferencesProvider>
    </BrowserRouter>
  </React.StrictMode>
)
