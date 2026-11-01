import React from 'react'
import ReactDOM from 'react-dom/client'
import { PreferencesProvider } from './lib/preferences'
import { Home } from './pages/Home'
import './global/reset.css'
import './global/tokens.css'
import './global/site.css'

const container = document.getElementById('root')

if (!container) throw new Error('Elemento #root nao encontrado no index.html')

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <PreferencesProvider>
      <Home />
    </PreferencesProvider>
  </React.StrictMode>
)
