import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useSettingsStore } from '../../store/settingsStore'

const pageTitles = {
  '/': 'Dashboard',
  '/boards': 'Boards',
  '/calendar': 'Calendar',
  '/notes': 'Notes',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

export default function AppLayout() {
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const location = useLocation()

  // Match the base path for title
  const basePath = '/' + (location.pathname.split('/')[1] || '')
  const title = pageTitles[basePath] || 'Gambit'

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div
        className={`transition-all duration-200 ${
          collapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <Header title={title} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
