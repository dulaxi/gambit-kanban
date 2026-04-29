import { useState } from 'react'
import { MagnifyingGlass, SquaresFour } from '@phosphor-icons/react'
import { useSettingsStore } from '../../store/settingsStore'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import Button from '../ui/Button'
import MobileSearchOverlay from './MobileSearchOverlay'
import MobileUserMenu from './MobileUserMenu'

export default function Header({ title }) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const isDesktop = useIsDesktop()
  const toggleMobileMenu = useSettingsStore((s) => s.toggleMobileMenu)

  // On desktop, the header's contents have moved into the sidebar (avatar, bell)
  // and SearchDialog (⌘K). The header just keeps the page-level title row on mobile.
  return (
    <header className="relative h-16 bg-[var(--surface-page)] flex items-center justify-between px-4 sm:px-6">
      {!isDesktop && mobileSearchOpen ? (
        <MobileSearchOverlay onClose={() => setMobileSearchOpen(false)} />
      ) : (
        <div className="flex items-center gap-2.5 min-w-0">
          {!isDesktop && (
            <Button variant="ghost" size="icon-sm" onClick={toggleMobileMenu} aria-label="Toggle menu" className="-ml-1.5">
              <SquaresFour className="w-[18px] h-[18px]" />
            </Button>
          )}
          {!isDesktop && (
            <span className="text-sm font-medium text-[var(--text-secondary)] truncate">{title}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1">
        {!isDesktop && !mobileSearchOpen && (
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileSearchOpen(true)} aria-label="Search">
            <MagnifyingGlass className="w-[18px] h-[18px]" />
          </Button>
        )}
        {!isDesktop && <MobileUserMenu />}
      </div>
    </header>
  )
}
