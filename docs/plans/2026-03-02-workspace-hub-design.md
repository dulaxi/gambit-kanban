# Workspace Hub Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Workspace page as a personal collaboration hub where users see incoming board invitations (accept/decline) and boards shared with them.

**Architecture:** Reuse existing `board_invitations` table. Rework `BoardShareModal` to always create invitation rows (never bypass for existing users). New `workspaceStore.js` handles fetching invitations/shared boards and accept/decline actions. New `WorkspacePage.jsx` renders the UI. Sidebar + BottomTabBar get a new Workspace nav item with invitation count badge.

**Tech Stack:** React 19, Zustand, Supabase (Postgres RLS), Tailwind CSS v4, lucide-react

---

### Task 1: Update RLS — allow invitees to update their own invitations

The existing UPDATE policy on `board_invitations` lets board owners OR the invitee update. Checking the schema at `supabase/schema.sql:266-272`, the policy already includes `invited_email = (select email from auth.users where id = auth.uid())`. However, the invitee also needs to INSERT into `board_members` when accepting. The existing `board_members` INSERT policy only allows board owners. We need a migration to allow invitees to add themselves.

**Files:**
- Migration via Supabase MCP

**Step 1: Apply migration to allow invitees to insert themselves into board_members**

Run this SQL migration via `mcp__supabase__apply_migration`:

```sql
-- Allow invited users to add themselves as board members (for accepting invitations)
create policy "Invited users can join boards"
  on public.board_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'member'
    and board_id in (
      select board_id from public.board_invitations
      where invited_email = (select email from auth.users where id = auth.uid())
      and status = 'pending'
    )
  );
```

Migration name: `allow_invitee_join_board`

**Step 2: Verify the migration applied**

Run `mcp__supabase__list_migrations` and confirm `allow_invitee_join_board` appears.

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add RLS policy for invitees to join boards"
```

---

### Task 2: Create workspaceStore.js

**Files:**
- Create: `src/store/workspaceStore.js`

**Step 1: Write the store**

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { useBoardStore } from './boardStore'

export const useWorkspaceStore = create((set, get) => ({
  invitations: [],
  sharedBoards: [],
  loading: false,

  fetchInvitations: async () => {
    const profile = useAuthStore.getState().profile
    if (!profile?.email) return

    const { data } = await supabase
      .from('board_invitations')
      .select('*, boards(id, name, icon), inviter:profiles!board_invitations_invited_by_fkey(id, display_name, email, color)')
      .eq('invited_email', profile.email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    set({ invitations: data || [] })
  },

  fetchSharedBoards: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    const { data: memberships } = await supabase
      .from('board_members')
      .select('board_id, boards(id, name, icon, owner_id, created_at)')
      .eq('user_id', user.id)
      .neq('role', 'owner')

    // Enrich with owner profile and member count
    const boards = []
    for (const m of memberships || []) {
      if (!m.boards) continue
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('display_name, color')
        .eq('id', m.boards.owner_id)
        .single()

      const { count } = await supabase
        .from('board_members')
        .select('*', { count: 'exact', head: true })
        .eq('board_id', m.board_id)

      boards.push({
        ...m.boards,
        ownerName: ownerProfile?.display_name || 'Unknown',
        ownerColor: ownerProfile?.color || 'bg-gray-300',
        memberCount: count || 0,
      })
    }

    set({ sharedBoards: boards })
  },

  acceptInvitation: async (invitationId) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const invitation = get().invitations.find((inv) => inv.id === invitationId)
    if (!invitation) return

    // Insert into board_members
    const { error: memberError } = await supabase
      .from('board_members')
      .insert({ board_id: invitation.board_id, user_id: user.id, role: 'member' })

    if (memberError) {
      console.error('Failed to join board:', memberError)
      return
    }

    // Update invitation status
    await supabase
      .from('board_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId)

    // Refresh everything
    await get().fetchInvitations()
    await get().fetchSharedBoards()
    await useBoardStore.getState().fetchBoards()
  },

  declineInvitation: async (invitationId) => {
    await supabase
      .from('board_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId)

    await get().fetchInvitations()
  },
}))
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds (store is not imported anywhere yet, tree-shaken out)

**Step 3: Commit**

```bash
git add src/store/workspaceStore.js
git commit -m "feat: add workspaceStore for invitations and shared boards"
```

---

### Task 3: Rework BoardShareModal to always create invitations

**Files:**
- Modify: `src/components/board/BoardShareModal.jsx:62-99`

**Step 1: Replace the existing-user shortcut with always-create-invitation**

In `handleInvite`, replace lines 62-99 (the `setLoading(true)` through `setLoading(false)` block) with:

```js
    setLoading(true)

    // Always create an invitation row (whether user exists or not)
    const { error: invError } = await supabase
      .from('board_invitations')
      .insert({
        board_id: board.id,
        invited_email: trimmed,
        invited_by: user.id,
      })

    if (invError) {
      setError(invError.message)
    } else {
      await fetchInvitations()
      setEmail('')
    }

    setLoading(false)
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/board/BoardShareModal.jsx
git commit -m "refactor: always create invitation rows instead of direct board_members insert"
```

---

### Task 4: Create WorkspacePage.jsx

**Files:**
- Create: `src/pages/WorkspacePage.jsx`

**Step 1: Write the page component**

```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Kanban, Check, X, UserPlus } from 'lucide-react'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useBoardStore } from '../store/boardStore'
import DynamicIcon from '../components/board/DynamicIcon'
import { formatDistanceToNow } from 'date-fns'

export default function WorkspacePage() {
  const invitations = useWorkspaceStore((s) => s.invitations)
  const sharedBoards = useWorkspaceStore((s) => s.sharedBoards)
  const loading = useWorkspaceStore((s) => s.loading)
  const fetchInvitations = useWorkspaceStore((s) => s.fetchInvitations)
  const fetchSharedBoards = useWorkspaceStore((s) => s.fetchSharedBoards)
  const acceptInvitation = useWorkspaceStore((s) => s.acceptInvitation)
  const declineInvitation = useWorkspaceStore((s) => s.declineInvitation)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const navigate = useNavigate()

  useEffect(() => {
    fetchInvitations()
    fetchSharedBoards()
  }, [])

  const handleAccept = async (id) => {
    await acceptInvitation(id)
  }

  const handleDecline = async (id) => {
    await declineInvitation(id)
  }

  const handleBoardClick = (boardId) => {
    setActiveBoard(boardId)
    navigate('/boards')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Pending Invitations */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Invitations</h2>
          {invitations.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {invitations.length}
            </span>
          )}
        </div>

        {invitations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <UserPlus className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No pending invitations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    {inv.boards?.icon ? (
                      <DynamicIcon name={inv.boards.icon} className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Kanban className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {inv.boards?.name || 'Unknown Board'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      Invited by{' '}
                      <span className="text-gray-600 font-medium">
                        {inv.inviter?.display_name || inv.inviter?.email || 'someone'}
                      </span>
                      {' \u00b7 '}
                      {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDecline(inv.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </button>
                  <button
                    onClick={() => handleAccept(inv.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Shared With Me */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Shared with me</h2>
        </div>

        {sharedBoards.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No shared boards yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sharedBoards.map((board) => (
              <div
                key={board.id}
                onClick={() => handleBoardClick(board.id)}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                    {board.icon ? (
                      <DynamicIcon name={board.icon} className="w-4.5 h-4.5 text-gray-500" />
                    ) : (
                      <Kanban className="w-4.5 h-4.5 text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{board.name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ${board.ownerColor}`}>
                      {board.ownerName[0].toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-400">{board.ownerName}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {board.memberCount} member{board.memberCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/pages/WorkspacePage.jsx
git commit -m "feat: add WorkspacePage with invitations and shared boards"
```

---

### Task 5: Add route and wire up navigation

**Files:**
- Modify: `src/App.jsx` — add `/workspace` route
- Modify: `src/components/layout/Sidebar.jsx` — add Workspace nav item with badge
- Modify: `src/components/layout/BottomTabBar.jsx` — add Workspace tab
- Modify: `src/components/layout/AppLayout.jsx` — add `'/workspace': 'Workspace'` to pageTitles, fetch workspace data on auth

**Step 1: Add route to App.jsx**

Add import at top:
```js
import WorkspacePage from './pages/WorkspacePage'
```

Add route inside the ProtectedRoute group (after `boards/*`, before `calendar`):
```jsx
<Route path="workspace" element={<WorkspacePage />} />
```

**Step 2: Add Workspace nav item to Sidebar.jsx**

Import `Users` icon (already imported from lucide-react, used in BoardShareModal but not Sidebar). Add to the lucide imports:
```js
import { ..., Users } from 'lucide-react'
```

Import the workspace store:
```js
import { useWorkspaceStore } from '../../store/workspaceStore'
```

Inside the component, add:
```js
const invitationCount = useWorkspaceStore((s) => s.invitations.length)
```

Add a Workspace NavLink between Calendar and Notes (after `navItems.slice(1)` loop). Insert it as a new NavLink right before the other nav items loop, or add it to `navItems` array. The cleanest approach: add a dedicated NavLink block after the Calendar NavLink and before the Notes NavLink. Since `navItems` currently renders Calendar and Notes via `navItems.slice(1)`, we should restructure: put Workspace between them. Update `navItems` to include Workspace:

```js
const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/workspace', icon: Users, label: 'Workspace', badge: true },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
]
```

Then update the nav rendering loop (`navItems.slice(1).map(...)`) to show a badge for the Workspace item:

```jsx
{navItems.slice(1).map(({ to, icon: Icon, label, badge }) => (
  <NavLink
    key={to}
    to={to}
    onClick={closeMobileMenu}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-50 text-gray-900'
          : 'text-gray-600 hover:bg-gray-100'
      } ${showCollapsed ? 'justify-center' : ''}`
    }
  >
    <span className="relative">
      <Icon className="w-5 h-5 shrink-0" />
      {badge && invitationCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {invitationCount > 9 ? '9+' : invitationCount}
        </span>
      )}
    </span>
    {!showCollapsed && <span>{label}</span>}
  </NavLink>
))}
```

**Step 3: Add Workspace tab to BottomTabBar.jsx**

Import `Users` and add the tab:

```js
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Columns3, Calendar, StickyNote, Settings, Users } from 'lucide-react'

const tabs = [
  { to: '/boards', icon: Columns3, label: 'Board' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/workspace', icon: Users, label: 'Workspace' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
]
```

Remove Settings tab since we now have 5 main items (Settings is accessible from sidebar). Or keep it — but 6 tabs is tight on mobile. Remove Settings since it's less frequently used and accessible from sidebar.

**Step 4: Add to AppLayout pageTitles and fetch workspace on auth**

In `src/components/layout/AppLayout.jsx`:

Add import:
```js
import { useWorkspaceStore } from '../../store/workspaceStore'
```

Add to pageTitles:
```js
'/workspace': 'Workspace',
```

Add fetches inside the `useEffect` that runs when `user` is set:
```js
const fetchInvitations = useWorkspaceStore((s) => s.fetchInvitations)
const fetchSharedBoards = useWorkspaceStore((s) => s.fetchSharedBoards)
```

Inside the `if (user)` block:
```js
fetchInvitations()
fetchSharedBoards()
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/App.jsx src/components/layout/Sidebar.jsx src/components/layout/BottomTabBar.jsx src/components/layout/AppLayout.jsx
git commit -m "feat: wire up Workspace route, sidebar nav with badge, and bottom tab"
```

---

### Task 6: Manual verification

**Step 1: Test invitation flow**

1. Open app, create a board, click Share, invite an email
2. Verify invitation row created (no direct board_members insert)
3. Log in as the invited user
4. Navigate to Workspace page
5. Verify invitation card appears with board name, inviter, timestamp
6. Click Accept — verify board appears in sidebar and Shared With Me section
7. Click Decline on another invitation — verify it disappears

**Step 2: Test empty states**

1. Log in as a user with no invitations
2. Navigate to Workspace
3. Verify "No pending invitations" and "No shared boards yet" empty states render

**Step 3: Test notification badge**

1. Log in as user with pending invitations
2. Verify badge shows on Workspace icon in sidebar
3. Accept all invitations
4. Verify badge disappears

**Step 4: Final build check**

Run: `npm run build`
Expected: Build succeeds with no warnings
