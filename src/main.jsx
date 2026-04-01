import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/mona-sans'
import '@fontsource/spectral/400.css'
import '@fontsource/spectral/600.css'
import '@fontsource/spectral/700.css'
import './index.css'
import App from './App.jsx'
import { useAuthStore } from './store/authStore'

// Global error handlers — catch unhandled errors and rejections
window.addEventListener('error', (event) => {
  console.error('[Gambit] Unhandled error:', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Gambit] Unhandled promise rejection:', event.reason)
})

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// Initialize auth before rendering
useAuthStore.getState().initialize()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
