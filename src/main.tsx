import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PowerSyncContext } from '@powersync/react'
import { powersync } from './db/powersync'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PowerSyncContext.Provider value={powersync}>
      <App />
    </PowerSyncContext.Provider>
  </StrictMode>,
)
