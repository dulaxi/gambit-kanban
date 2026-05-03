import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

import { useSettingsStore } from '../../store/settingsStore'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useIsDesktop, useMediaQuery } from '../../hooks/useMediaQuery'
import { useBoardSharingStore } from '../../store/boardSharingStore'
import { useWorkspacesStore } from '../../store/workspacesStore'
import { Kanban, Plus } from '@phosphor-icons/react'
import ConfirmModal from '../board/ConfirmModal'
import SidebarNav from './SidebarNav'
import SidebarBoardItem from './SidebarBoardItem'
import SidebarBottom from './SidebarBottom'
import DynamicIcon from '../board/DynamicIcon'

function KolumnLogo({ size = 30 }) {
  return <Kanban size={size} weight="fill" className="shrink-0 text-[var(--color-logo)]" />
}

// Dispatches a "new board" event with a small retry to handle the case where
// BoardsPage hasn't mounted yet — used by the Plus buttons in section headers.
function dispatchCreateBoard(detail) {
  let attempts = 0
  let handled = false
  const onHandled = () => { handled = true }
  window.addEventListener('kolumn:create-board-ack', onHandled, { once: true })
  const tryDispatch = () => {
    if (handled) { window.removeEventListener('kolumn:create-board-ack', onHandled); return }
    window.dispatchEvent(new CustomEvent('kolumn:create-board', { detail }))
    if (++attempts < 10) setTimeout(tryDispatch, 100)
  }
  setTimeout(tryDispatch, 50)
}

function SectionHeader({ label, collapsed, onToggle, onPlusClick, plusTitle }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={!collapsed}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.() }
      }}
      className="flex items-center justify-between gap-2 px-4 mb-px group/sec cursor-pointer select-none"
      title={collapsed ? `Show ${label}` : `Hide ${label}`}
    >
      <span className="text-xs text-[var(--text-muted)] truncate">{label}</span>
      <span className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-[var(--text-faint)] opacity-0 group-hover/sec:opacity-75 transition-opacity">
          {collapsed ? 'Show' : 'Hide'}
        </span>
        {onPlusClick && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPlusClick() }}
            className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            title={plusTitle}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </span>
    </div>
  )
}

export default function Sidebar() {
  const boardInvitationCount = useBoardSharingStore((s) => s.invitations.length)
  const workspaceInvitationCount = useWorkspacesStore((s) => s.invitations.length)
  const invitationCount = boardInvitationCount + workspaceInvitationCount
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const toggle = useSettingsStore((s) => s.toggleSidebar)
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed)
  const mobileMenuOpen = useSettingsStore((s) => s.mobileMenuOpen)
  const closeMobileMenu = useSettingsStore((s) => s.closeMobileMenu)
  const toggleWorkspaceSidebar = useSettingsStore((s) => s.toggleWorkspaceSidebar)
  const workspaceSidebarOpen = useSettingsStore((s) => s.workspaceSidebarOpen)
  const isDesktop = useIsDesktop()
  const isWide = useMediaQuery('(min-width: 1280px)')

  // Auto-collapse on narrow desktop viewports (1024–1280px)
  // Skip when workspace sub-sidebar is open — it owns the collapsed state in that case.
  useEffect(() => {
    if (isDesktop && !workspaceSidebarOpen) setSidebarCollapsed(!isWide)
  }, [isDesktop, isWide, workspaceSidebarOpen, setSidebarCollapsed])

  // While mobile drawer is open: lock body scroll + Escape closes
  useEffect(() => {
    if (isDesktop || !mobileMenuOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e) => { if (e.key === 'Escape') closeMobileMenu() }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isDesktop, mobileMenuOpen, closeMobileMenu])

  const user = useAuthStore((s) => s.user)
  const allBoards = useBoardStore((s) => s.boards)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const deleteBoard = useBoardStore((s) => s.deleteBoard)
  const renameBoard = useBoardStore((s) => s.renameBoard)
  const updateBoardIcon = useBoardStore((s) => s.updateBoardIcon)
  const location = useLocation()
  const navigate = useNavigate()

  const sharedBoards = useBoardSharingStore((s) => s.sharedBoards)
  const [iconPickerBoardId, setIconPickerBoardId] = useState(null)
  const [renamingBoardId, setRenamingBoardId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteBoardId, setConfirmDeleteBoardId] = useState(null)

  // "Boards" section = personal boards only (owned by me, not tied to a workspace).
  // Workspace boards live under the Spaces section below.
  const workspaces = useWorkspacesStore((s) => s.workspaces)
  const collapsedSpaces = useSettingsStore((s) => s.collapsedSpaces)
  const toggleSpaceCollapsed = useSettingsStore((s) => s.toggleSpaceCollapsed)
  const boardsCollapsed = useSettingsStore((s) => s.boardsCollapsed)
  const toggleBoardsCollapsed = useSettingsStore((s) => s.toggleBoardsCollapsed)
  const sharedBoardsCollapsed = useSettingsStore((s) => s.sharedBoardsCollapsed)
  const toggleSharedBoardsCollapsed = useSettingsStore((s) => s.toggleSharedBoardsCollapsed)
  const personalBoards = Object.values(allBoards).filter(
    (b) => b.owner_id === user?.id && !b.workspace_id,
  )
  const workspaceList = Object.values(workspaces)

  const isBoardsActive = location.pathname.startsWith('/boards')

  const handleSelectBoard = (boardId) => {
    setActiveBoard(boardId)
    navigate('/boards')
    closeMobileMenu()
  }

  const handleStartRename = (board) => {
    setRenamingBoardId(board.id)
    setRenameValue(board.name)
  }

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && renamingBoardId) renameBoard(renamingBoardId, trimmed)
    setRenamingBoardId(null)
  }

  const cancelRename = () => setRenamingBoardId(null)

  // Per-row prop-builder so each row gets the right rename / icon-picker context
  const itemPropsFor = (board, { editable, deletable }) => ({
    board,
    active: isBoardsActive && activeBoardId === board.id,
    editable,
    deletable,
    onSelect: handleSelectBoard,
    onUpdateIcon: updateBoardIcon,
    onDelete: (id) => setConfirmDeleteBoardId(id),
    iconPickerOpen: iconPickerBoardId === board.id,
    onToggleIconPicker: (id) => setIconPickerBoardId(id ?? null),
    renaming: renamingBoardId === board.id,
    renameValue,
    onRenameChange: setRenameValue,
    onCommitRename: commitRename,
    onCancelRename: cancelRename,
    onStartRename: handleStartRename,
  })

  const showCollapsed = isDesktop && collapsed

  return (
    <>
      {!isDesktop && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 transition-opacity"
          onClick={closeMobileMenu}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-screen bg-[var(--surface-sidebar)] border-r border-[var(--border-default)] flex flex-col transition-all duration-200 z-40 ${
          isDesktop
            ? collapsed
              ? 'w-12'
              : 'w-[287px]'
            : `w-[287px] ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`
        }`}
      >
        {/* Logo — clicks to Home */}
        <div className={`flex items-center ${showCollapsed ? 'justify-center px-1 h-12' : 'gap-2 px-4 h-16'}`}>
          <button
            type="button"
            onClick={() => { closeMobileMenu(); navigate('/dashboard') }}
            aria-label="Go to Home"
            className="flex items-center gap-2 cursor-pointer"
          >
            <KolumnLogo size={showCollapsed ? 22 : 30} />
            {!showCollapsed && (
              <span className="text-[23px] font-[450] text-[var(--text-primary)] tracking-tight leading-none font-logo">
                Kolumn
              </span>
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className={`flex-1 pt-2 overflow-y-auto ${showCollapsed ? 'px-1' : 'px-2'}`}>
          <SidebarNav
            collapsed={showCollapsed}
            isDesktop={isDesktop}
            workspaceSidebarOpen={workspaceSidebarOpen}
            toggleWorkspaceSidebar={toggleWorkspaceSidebar}
            pathname={location.pathname}
            navigate={navigate}
            closeMobileMenu={closeMobileMenu}
            invitationCount={invitationCount}
          />

          {/* ── Boards section ── */}
          {!showCollapsed && (
            <div className="pt-4">
              <SectionHeader
                label="Boards"
                collapsed={boardsCollapsed}
                onToggle={toggleBoardsCollapsed}
                onPlusClick={() => { navigate('/boards'); dispatchCreateBoard(); closeMobileMenu() }}
                plusTitle="New board"
              />
              <div className={`flex flex-col gap-px ${boardsCollapsed ? 'hidden' : ''}`}>
                {personalBoards.map((board) => (
                  <SidebarBoardItem key={board.id} {...itemPropsFor(board, { editable: true, deletable: true })} />
                ))}
              </div>
            </div>
          )}

          {/* ── Workspaces: each workspace name is its own small subheading ── */}
          {!showCollapsed && workspaceList.map((ws) => {
            const wsBoards = Object.values(allBoards).filter((b) => b.workspace_id === ws.id)
            const isCollapsed = !!collapsedSpaces[ws.id]
            return (
              <div key={ws.id}>
                <div className="pt-4">
                  <SectionHeader
                    label={ws.name}
                    collapsed={isCollapsed}
                    onToggle={() => toggleSpaceCollapsed(ws.id)}
                    onPlusClick={() => { navigate('/boards'); dispatchCreateBoard({ workspaceId: ws.id }); closeMobileMenu() }}
                    plusTitle={`New board in ${ws.name}`}
                  />
                </div>
                <div className={`flex flex-col gap-px ${isCollapsed ? 'hidden' : ''}`}>
                  {wsBoards.map((board) => {
                    const canEdit = board.owner_id === user?.id
                    return (
                      <SidebarBoardItem
                        key={board.id}
                        {...itemPropsFor(board, { editable: canEdit, deletable: canEdit })}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* ── Shared with me ── */}
          {!showCollapsed && sharedBoards.length > 0 && (
            <div className="pt-4">
              <SectionHeader
                label="Shared with me"
                collapsed={sharedBoardsCollapsed}
                onToggle={toggleSharedBoardsCollapsed}
              />
              <div className={`flex flex-col gap-px ${sharedBoardsCollapsed ? 'hidden' : ''}`}>
                {sharedBoards.map((board) => (
                  <SidebarBoardItem key={board.id} {...itemPropsFor(board, { editable: false, deletable: false })} />
                ))}
              </div>
            </div>
          )}

          {/* Collapsed: show the active board's icon (last opened) — falls
              back to Kanban when no real board is active. '__all__' is the
              pseudo "All tasks" id and has no icon, so it falls through too. */}
          {showCollapsed && (() => {
            const activeBoard = activeBoardId && activeBoardId !== '__all__' ? allBoards[activeBoardId] : null
            return (
              <NavLink
                to="/boards"
                title={activeBoard?.name || 'Boards'}
                className={({ isActive }) =>
                  `flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`
                }
              >
                {({ isActive }) => (
                  activeBoard?.icon ? (
                    <DynamicIcon
                      name={activeBoard.icon}
                      weight={isActive ? 'fill' : 'regular'}
                      className="w-4 h-4 shrink-0"
                    />
                  ) : (
                    <Kanban className="w-4 h-4 shrink-0" weight={isActive ? 'fill' : 'regular'} />
                  )
                )}
              </NavLink>
            )
          })()}
        </nav>

        {isDesktop && (
          <SidebarBottom
            collapsed={collapsed}
            showCollapsed={showCollapsed}
            onToggle={toggle}
            workspaceSidebarOpen={workspaceSidebarOpen}
          />
        )}
      </aside>

      {confirmDeleteBoardId && (
        <ConfirmModal
          title="Delete board"
          message="This will permanently delete the board and all its tasks."
          onConfirm={() => {
            deleteBoard(confirmDeleteBoardId)
            setConfirmDeleteBoardId(null)
          }}
          onCancel={() => setConfirmDeleteBoardId(null)}
        />
      )}
    </>
  )
}
