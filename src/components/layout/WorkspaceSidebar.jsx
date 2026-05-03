import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Users } from '@phosphor-icons/react'
import { useSettingsStore } from '../../store/settingsStore'
import { useWorkspacesStore } from '../../store/workspacesStore'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import WorkspaceCreateModal from '../workspace/WorkspaceCreateModal'
import DynamicIcon from '../board/DynamicIcon'

/**
 * WorkspaceSidebar — Claude skills/connectors style list of workspaces.
 * Each item: icon + name, click to set active, hover & active states.
 * "Personal" is always first and is the default (activeWorkspaceId === null).
 */
export default function WorkspaceSidebar() {
  const open = useSettingsStore((s) => s.workspaceSidebarOpen)
  const close = useSettingsStore((s) => s.closeWorkspaceSidebar)
  const isDesktop = useIsDesktop()

  const workspaces = useWorkspacesStore((s) => s.workspaces)
  const activeWorkspaceId = useWorkspacesStore((s) => s.activeWorkspaceId)
  const fetchWorkspaces = useWorkspacesStore((s) => s.fetchWorkspaces)
  const setActiveWorkspace = useWorkspacesStore((s) => s.setActiveWorkspace)
  const location = useLocation()
  const navigate = useNavigate()

  const [createModalOpen, setCreateModalOpen] = useState(false)

  useEffect(() => {
    if (open) fetchWorkspaces()
  }, [open])

  // Auto-close on real navigation (not initial mount or first render with stale path)
  const prevPathRef = useRef(location.pathname)
  useEffect(() => {
    const prev = prevPathRef.current
    prevPathRef.current = location.pathname
    if (prev !== location.pathname && open && location.pathname !== '/workspace') {
      close()
    }
  }, [location.pathname, open, close])

  if (!open || !isDesktop) return null

  const workspaceList = Object.values(workspaces)

  return (
    <>
    <aside className="fixed top-0 left-12 h-screen w-[280px] bg-[var(--surface-sidebar)] border-r border-0.5 border-[var(--border-default)] flex flex-col z-30 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-2 py-3 px-4">
        <button
          type="button"
          onClick={() => { close(); navigate('/dashboard') }}
          aria-label="Back to dashboard"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-base font-semibold text-[var(--text-primary)] flex-1">Workspaces</span>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          aria-label="Create workspace"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable list — Claude skills/connectors pattern */}
      <div className="flex flex-col gap-px flex-1 overflow-y-auto p-2">
        {/* Workspace list */}
        {workspaceList.map((ws) => {
          const isActive = activeWorkspaceId === ws.id
          const iconWeight = isActive ? 'fill' : 'regular'
          const iconColor = isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
          return (
            <button
              key={ws.id}
              type="button"
              onClick={() => {
                setActiveWorkspace(ws.id)
                if (location.pathname !== '/workspace') navigate('/workspace')
              }}
              className={`flex items-center rounded-lg text-sm transition-colors duration-75 gap-3 px-4 py-1.5 ${
                isActive
                  ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <span className="flex size-5 items-center justify-center">
                {ws.icon ? (
                  <DynamicIcon name={ws.icon} weight={iconWeight} className={`w-4 h-4 ${iconColor}`} />
                ) : (
                  <Users weight={iconWeight} className={`w-4 h-4 ${iconColor}`} />
                )}
              </span>
              <span className="truncate text-left flex-1">{ws.name}</span>
            </button>
          )
        })}

        {/* Empty state hint for first-time users (when no workspaces yet) */}
        {workspaceList.length === 0 && (
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-[var(--text-faint)]">No workspaces yet.</p>
            <p className="text-xs text-[var(--text-faint)] mt-1">Create one from the header.</p>
          </div>
        )}
      </div>
    </aside>

    <WorkspaceCreateModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </>
  )
}
