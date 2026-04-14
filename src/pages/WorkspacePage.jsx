import { useState } from 'react'
import { Users, LayoutGrid, Plus } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useWorkspacesStore } from '../store/workspacesStore'
import WorkspaceCreateModal from '../components/workspace/WorkspaceCreateModal'
import WorkspaceDetailView from '../components/workspace/WorkspaceDetailView'

/**
 * WorkspacePage — routes between two views:
 *  - Landing (activeWorkspaceId === null): centered illustration + action cards
 *  - Detail (activeWorkspaceId set): members, invite form, danger zone
 */
export default function WorkspacePage() {
  const openWorkspaceSidebar = useSettingsStore((s) => s.openWorkspaceSidebar)
  const workspaces = useWorkspacesStore((s) => s.workspaces)
  const activeWorkspaceId = useWorkspacesStore((s) => s.activeWorkspaceId)
  const invitationsCount = useWorkspacesStore((s) => s.invitations.length)
  const [createOpen, setCreateOpen] = useState(false)

  // Detail view when a workspace is active (and still exists)
  if (activeWorkspaceId && workspaces[activeWorkspaceId]) {
    return <WorkspaceDetailView workspaceId={activeWorkspaceId} />
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-10 w-full" style={{ maxWidth: 530 }}>
          {/* Illustration + heading */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-3xl bg-[var(--surface-raised)] border-0.5 border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)]">
              <Users className="w-12 h-12" strokeWidth={1.25} />
            </div>
            <h1 className="font-heading text-center text-2xl text-[var(--text-primary)]">Your workspaces</h1>
            <p className="text-center text-sm text-[var(--text-muted)]">
              Workspaces group your team's boards, members, and invitations.
              {' '}You have {Object.keys(workspaces).length} workspace{Object.keys(workspaces).length !== 1 ? 's' : ''}
              {invitationsCount > 0 ? ` and ${invitationsCount} pending invitation${invitationsCount !== 1 ? 's' : ''}` : ''}.
            </p>
          </div>

          {/* Action cards */}
          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={openWorkspaceSidebar}
              className="flex w-full items-center gap-4 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 text-left shadow-sm transition-colors hover:bg-[var(--surface-raised)] cursor-pointer"
            >
              <div className="flex shrink-0 items-center rounded-full bg-[var(--surface-hover)] p-1.5">
                <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LayoutGrid className="w-5 h-5" />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Browse workspaces</span>
                <span className="text-sm text-[var(--text-muted)]">See all the workspaces you're a member of and jump into one.</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex w-full items-center gap-4 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 text-left shadow-sm transition-colors hover:bg-[var(--surface-raised)] cursor-pointer"
            >
              <div className="flex shrink-0 items-center rounded-full bg-[var(--surface-hover)] p-1.5">
                <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus className="w-5 h-5" />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Create a new workspace</span>
                <span className="text-sm text-[var(--text-muted)]">Start a team container, invite members, and share boards.</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <WorkspaceCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
