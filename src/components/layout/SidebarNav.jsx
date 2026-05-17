import { NavLink } from 'react-router-dom'
import { ChatsCircle, MagnifyingGlass, UsersThree } from '@phosphor-icons/react'
import { useWorkspacesStore } from '../../store/workspacesStore'

const ROW_BASE = 'flex items-center h-8 rounded-lg text-sm transition-colors duration-75 overflow-hidden'

function activeClasses(isActive) {
  return isActive
    ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]'
    : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)] active:bg-[var(--surface-raised)]'
}

function layoutClasses(collapsed) {
  return collapsed ? 'justify-center px-2' : 'gap-3 py-1.5 px-2'
}

function IconSlot({ children, badge }) {
  return (
    <span className="relative flex items-center justify-center" style={{ width: 20, height: 20 }}>
      {children}
      {badge}
    </span>
  )
}

function NavLinkRow({ to, end, icon: Icon, label, collapsed, onNavigate, badge, badgeCollapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) => `${ROW_BASE} ${activeClasses(isActive)} ${layoutClasses(collapsed)}`}
    >
      {({ isActive }) => (
        <>
          <IconSlot badge={collapsed ? badgeCollapsed : null}>
            <Icon className="w-5 h-5 shrink-0" weight={isActive ? 'fill' : 'light'} />
          </IconSlot>
          {!collapsed && (
            <>
              <span className="truncate flex-1">{label}</span>
              {badge}
            </>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function SidebarNav({
  collapsed,
  isDesktop,
  workspaceSidebarOpen,
  toggleWorkspaceSidebar,
  pathname,
  navigate,
  closeMobileMenu,
  invitationCount = 0,
}) {
  const wsActive = workspaceSidebarOpen || pathname === '/workspace'

  const invBadge = invitationCount > 0 ? (
    <span className="text-[10px] font-semibold bg-[var(--surface-hover)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded-full">
      {invitationCount}
    </span>
  ) : null

  const invBadgeCollapsed = invitationCount > 0 ? (
    <span className="absolute -top-1.5 -right-1.5 bg-[var(--color-lime)] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
      {invitationCount > 9 ? '9+' : invitationCount}
    </span>
  ) : null

  return (
    <div className="flex flex-col gap-px">
      {/* Search — fires global event, no route */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('kolumn:focus-search'))}
        title={collapsed ? 'Search' : undefined}
        className={`${ROW_BASE} ${activeClasses(false)} ${layoutClasses(collapsed)}`}
      >
        <IconSlot>
          <MagnifyingGlass size={20} weight="light" className="shrink-0" />
        </IconSlot>
        {!collapsed && <span className="truncate flex-1 text-left">Search</span>}
      </button>

      <NavLinkRow to="/chat" end icon={ChatsCircle} label="Chats" collapsed={collapsed} onNavigate={closeMobileMenu} />
      {/* Calendar + Notes removed — see App.jsx note. */}

      {/* Workspace — desktop button toggles sub-sidebar; mobile is a plain NavLink */}
      {isDesktop ? (
        <button
          type="button"
          onClick={() => {
            toggleWorkspaceSidebar()
            if (!workspaceSidebarOpen) {
              useWorkspacesStore.getState().setActiveWorkspace(null)
              navigate('/workspace')
            }
          }}
          title={collapsed ? 'Workspace' : undefined}
          className={`${ROW_BASE} ${activeClasses(wsActive)} ${layoutClasses(collapsed)} w-full`}
        >
          <IconSlot badge={collapsed ? invBadgeCollapsed : null}>
            <UsersThree className="w-5 h-5 shrink-0" weight={wsActive ? 'fill' : 'light'} />
          </IconSlot>
          {!collapsed && (
            <>
              <span className="truncate flex-1 text-left">Workspace</span>
              {invBadge}
            </>
          )}
        </button>
      ) : (
        <NavLinkRow
          to="/workspace"
          icon={UsersThree}
          label="Workspace"
          collapsed={false}
          onNavigate={closeMobileMenu}
          badge={invBadge}
        />
      )}
    </div>
  )
}
