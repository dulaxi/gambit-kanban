import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'default',
      font: 'mona-sans',
      mobileMenuOpen: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
      closeMobileMenu: () => set({ mobileMenuOpen: false }),
      setTheme: (theme) => set({ theme }),
      setFont: (font) => set({ font }),
    }),
    {
      name: 'gambit-settings',
    }
  )
)
