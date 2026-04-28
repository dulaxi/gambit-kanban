import { useEffect, useState, useMemo, useRef } from 'react'
import { Users, Mail, X, Trash2, LogOut, Pencil, Check } from 'lucide-react'
import { useWorkspacesStore } from '../../store/workspacesStore'
import { useAuthStore } from '../../store/authStore'
import DynamicIcon from '../board/DynamicIcon'
import IconPicker from '../board/IconPicker'
import { getAvatarColor, getAvatarTextColor, getInitials } from '../../utils/formatting'
import { supabase } from '../../lib/supabase'

// Stable empty-array reference — if put inline as `|| []` inside a Zustand selector,
// useSyncExternalStore sees a new reference every render and re-renders infinitely.
const EMPTY = []

/**
 * WorkspaceDetailView — shown inside /workspace when a workspace is active.
 * Matches Claude's settings/detail page style:
 *  - Header: icon + name (rename for owner) + description
 *  - Members section (list with roles, remove for owner)
 *  - Invite form (owner only)
 *  - Pending invitations (owner only)
 *  - Danger zone (leave / delete)
 */
export default function WorkspaceDetailView({ workspaceId }) {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  const workspace = useWorkspacesStore((s) => s.workspaces[workspaceId])
  const membersLoaded = useWorkspacesStore((s) => workspaceId in s.members)
  const members = useWorkspacesStore((s) => s.members[workspaceId]) || EMPTY
  const sentInvitations = useWorkspacesStore((s) => s.sentInvitations[workspaceId]) || EMPTY

  const fetchMembers = useWorkspacesStore((s) => s.fetchMembers)
  const fetchSentInvitations = useWorkspacesStore((s) => s.fetchSentInvitations)
  const renameWorkspace = useWorkspacesStore((s) => s.renameWorkspace)
  const inviteToWorkspace = useWorkspacesStore((s) => s.inviteToWorkspace)
  const cancelInvitation = useWorkspacesStore((s) => s.cancelInvitation)
  const removeMember = useWorkspacesStore((s) => s.removeMember)
  const deleteWorkspace = useWorkspacesStore((s) => s.deleteWorkspace)
  const leaveWorkspace = useWorkspacesStore((s) => s.leaveWorkspace)

  const isOwner = workspace && user && workspace.owner_id === user.id

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const nameInputRef = useRef(null)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  useEffect(() => {
    if (!workspaceId) return
    fetchMembers(workspaceId)
    fetchSentInvitations(workspaceId)

    // Live-refresh when membership or invitations change from other clients.
    // Without this, a member leaving / being removed / accepting an invite
    // would stay stale in the viewer's panel until the page remounted.
    const membersChannel = supabase
      .channel(`ws-members-${workspaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workspace_members',
        filter: `workspace_id=eq.${workspaceId}`,
      }, () => { fetchMembers(workspaceId) })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workspace_invitations',
        filter: `workspace_id=eq.${workspaceId}`,
      }, () => { fetchSentInvitations(workspaceId) })
      .subscribe()

    return () => { supabase.removeChannel(membersChannel) }
  }, [workspaceId, fetchMembers, fetchSentInvitations])

  useEffect(() => {
    if (editingName) setTimeout(() => nameInputRef.current?.focus(), 50)
  }, [editingName])

  const ownerMember = useMemo(
    () => members.find((m) => m.role === 'owner'),
    [members],
  )

  if (!workspace) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">Workspace not found.</p>
      </div>
    )
  }

  const startRename = () => {
    setNameDraft(workspace.name)
    setEditingName(true)
  }

  const saveRename = async () => {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== workspace.name) {
      await renameWorkspace(workspaceId, trimmed)
    }
    setEditingName(false)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return
    setInviting(true)
    await inviteToWorkspace(workspaceId, email)
    setInviting(false)
    setInviteEmail('')
  }

  const handleIconChange = async (name) => {
    setShowIconPicker(false)
    // renameWorkspace only handles name; do a direct update via store-ish pattern
    // We'll just reuse the underlying supabase call through workspacesStore if needed.
    // For now: patch via a minimal inline action.
    const { supabase } = await import('../../lib/supabase')
    const { error } = await supabase
      .from('workspaces')
      .update({ icon: name })
      .eq('id', workspaceId)
    if (!error) {
      useWorkspacesStore.setState((s) => ({
        workspaces: { ...s.workspaces, [workspaceId]: { ...s.workspaces[workspaceId], icon: name } },
      }))
    }
  }

  return (
    <div className="w-full">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => isOwner && setShowIconPicker(true)}
              disabled={!isOwner}
              className={`h-16 w-16 rounded-2xl border-0.5 border-[var(--border-default)] bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-secondary)] ${
                isOwner ? 'hover:border-[var(--color-mist)] cursor-pointer' : ''
              } transition-colors`}
              aria-label={isOwner ? 'Change workspace icon' : undefined}
            >
              {workspace.icon ? (
                <DynamicIcon name={workspace.icon} className="w-7 h-7" />
              ) : (
                <Users className="w-7 h-7" strokeWidth={1.5} />
              )}
            </button>
            {showIconPicker && (
              <IconPicker
                value={workspace.icon}
                onChange={handleIconChange}
                onClose={() => setShowIconPicker(false)}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {editingName ? (
                <input
                  ref={nameInputRef}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  maxLength={64}
                  className="font-heading text-2xl text-[var(--text-primary)] bg-transparent border-b border-[var(--border-default)] focus:outline-none focus:border-[var(--text-muted)] min-w-0 flex-1"
                />
              ) : (
                <>
                  <h1 className="font-heading text-2xl text-[var(--text-primary)] truncate">{workspace.name}</h1>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={startRename}
                      aria-label="Rename workspace"
                      className="h-7 w-7 rounded-md inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {members.length} member{members.length !== 1 ? 's' : ''}
              {ownerMember ? ` · owned by ${ownerMember.display_name}` : ''}
            </p>
          </div>
        </div>

        {/* Members */}
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Members</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Everyone in this workspace can see all its boards and be assigned to cards.</p>

          <div className="mt-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden">
            {!membersLoaded ? (
              <div className="p-4 text-sm text-[var(--text-muted)]">Loading members…</div>
            ) : members.length === 0 ? (
              <div className="p-4 text-sm text-[var(--text-muted)]">No members yet.</div>
            ) : (
              <ul className="divide-y divide-[var(--border-default)]">
                {members.map((m) => {
                  const isSelf = m.user_id === user?.id
                  const bg = m.color || getAvatarColor(m.display_name || 'User')
                  const textColor = getAvatarTextColor(bg)
                  return (
                    <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${bg} ${textColor}`}>
                        {m.icon ? (
                          <DynamicIcon name={m.icon} className="w-4 h-4" />
                        ) : (
                          <span className="text-xs font-medium">{getInitials(m.display_name || 'U')}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {m.display_name}{isSelf ? ' (you)' : ''}
                          </span>
                          {m.role === 'owner' && (
                            <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-muted)]">Owner</span>
                          )}
                        </div>
                        {m.email && (
                          <div className="text-xs text-[var(--text-muted)] truncate">{m.email}</div>
                        )}
                      </div>
                      {isOwner && m.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() => removeMember(workspaceId, m.user_id)}
                          aria-label={`Remove ${m.display_name}`}
                          className="h-8 w-8 rounded-md inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Invite (owner only) */}
        {isOwner && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Invite members</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Enter an email. They'll join the workspace next time they sign in.</p>

            <form onSubmit={handleInvite} className="mt-4 flex items-stretch gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="w-full h-9 pl-9 pr-3 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--color-mist)] focus:border-[var(--text-muted)] transition-colors placeholder:text-[var(--text-faint)] text-sm focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!inviteEmail.trim() || inviting}
                className="h-9 px-4 py-2 rounded-lg whitespace-nowrap bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] transition-colors text-sm font-medium disabled:opacity-50"
              >
                Send invite
              </button>
            </form>

            {sentInvitations.length > 0 && (
              <div className="mt-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden">
                <div className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] border-b border-[var(--border-default)]">
                  Pending invitations
                </div>
                <ul className="divide-y divide-[var(--border-default)]">
                  {sentInvitations.map((inv) => (
                    <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--surface-hover)] text-[var(--text-muted)]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[var(--text-primary)] truncate">{inv.invited_email}</div>
                        <div className="text-xs text-[var(--text-muted)]">Pending</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => cancelInvitation(inv.id, workspaceId)}
                        aria-label="Cancel invitation"
                        className="h-8 w-8 rounded-md inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Danger zone */}
        <section className="mt-12 mb-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Danger zone</h2>
          <div className="mt-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 flex items-center gap-4">
            {isOwner ? (
              <>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--text-primary)]">Delete workspace</div>
                  <div className="text-xs text-[var(--text-muted)]">This permanently removes the workspace and unlinks its boards. This cannot be undone.</div>
                </div>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="h-9 px-3 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteWorkspace(workspaceId)}
                      className="h-9 px-4 rounded-lg whitespace-nowrap bg-[var(--color-copper)] hover:bg-[var(--color-bark)] text-white transition-colors text-sm font-medium inline-flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Confirm delete
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="h-9 px-4 rounded-lg whitespace-nowrap border-0.5 border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--color-copper)] hover:bg-[var(--surface-hover)] transition-colors text-sm font-medium inline-flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete workspace
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--text-primary)]">Leave workspace</div>
                  <div className="text-xs text-[var(--text-muted)]">You'll lose access to all boards in this workspace.</div>
                </div>
                {confirmLeave ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmLeave(false)}
                      className="h-9 px-3 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => leaveWorkspace(workspaceId)}
                      className="h-9 px-4 rounded-lg whitespace-nowrap bg-[var(--color-copper)] hover:bg-[var(--color-bark)] text-white transition-colors text-sm font-medium inline-flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Confirm leave
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(true)}
                    className="h-9 px-4 rounded-lg whitespace-nowrap border-0.5 border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-sm font-medium inline-flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Leave workspace
                  </button>
                )}
              </>
            )}
          </div>
        </section>
    </div>
  )
}
