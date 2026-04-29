import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, At, Bell, ChatCircle, UserPlus } from '@phosphor-icons/react'
import { useNotificationStore } from '../../store/notificationStore'
import { useBoardStore } from '../../store/boardStore'
import Popover from '../ui/Popover'

export default function NotificationBell({ placement = 'top' }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)

  const popoverPlacement = placement === 'top' ? 'top-start' : 'bottom-end'

  const panel = (
    <div className="w-80 -m-1 overflow-hidden rounded-[10px]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-cream-dark)]">
        <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 && (
          <p className="px-4 py-6 text-sm text-[var(--text-muted)] text-center">No notifications yet</p>
        )}
        {notifications.map((n) => {
          const icon = n.type === 'mention' ? <At className="w-3.5 h-3.5 text-[var(--color-lime-dark)]" />
            : n.type === 'assigned' ? <UserPlus className="w-3.5 h-3.5 text-[var(--color-lime-dark)]" />
            : n.type === 'moved' ? <ArrowRight className="w-3.5 h-3.5 text-[var(--color-mauve)]" />
            : <ChatCircle className="w-3.5 h-3.5 text-[var(--text-faint)]" />

          return (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                if (!n.read) markAsRead(n.id)
                if (n.card_id && n.board_id) {
                  setActiveBoard(n.board_id)
                  setOpen(false)
                  navigate('/boards')
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('kolumn:open-card', { detail: { cardId: n.card_id } }))
                  }, 100)
                }
              }}
              className={`flex items-start gap-2.5 w-full px-4 py-2.5 text-left hover:bg-[var(--surface-raised)] transition-colors ${!n.read ? 'bg-[var(--surface-raised)]' : ''}`}
            >
              <div className="mt-0.5 shrink-0">{icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[var(--text-secondary)]">
                  <span className="font-medium">{n.actor_name || 'Someone'}</span>{' '}
                  {n.title}
                </p>
                {n.body && <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{n.body}</p>}
                <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
              {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-[var(--color-lime)] shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen} placement={popoverPlacement} panel={panel} panelClassName="p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        title="Notifications"
        className="relative p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
      >
        <Bell size={18} weight={open ? 'fill' : 'regular'} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-[var(--color-copper)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </Popover>
  )
}
