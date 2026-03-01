import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/mona-sans'
import './index.css'
import App from './App.jsx'
import { useBoardStore } from './store/boardStore'

// One-time reset of task counters
useBoardStore.getState().resetTaskCounters()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
