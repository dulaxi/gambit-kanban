import { Kanban, Trash } from '@phosphor-icons/react'
import DynamicIcon from '../board/DynamicIcon'
import IconPicker from '../board/IconPicker'
import Tooltip from '../ui/Tooltip'

/**
 * Single board row used inside the sidebar lists.
 *
 * - Personal boards & workspace boards (owned): editable=true, deletable=true
 * - Workspace boards (non-owner): editable=false (static icon glyph)
 * - Shared boards: editable=false, deletable=false
 */
export default function SidebarBoardItem({
  board,
  active,
  editable = false,
  deletable = false,
  onSelect,
  onRename,
  onUpdateIcon,
  onDelete,
  iconPickerOpen,
  onToggleIconPicker,
  renaming,
  renameValue,
  onRenameChange,
  onCommitRename,
  onCancelRename,
  onStartRename,
}) {
  const iconColor = active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
  const iconWeight = active ? 'fill' : 'regular'

  const iconGlyph = board.icon ? (
    <DynamicIcon name={board.icon} weight={iconWeight} className={`w-4 h-4 ${iconColor}`} />
  ) : (
    <Kanban weight={iconWeight} className={`w-4 h-4 ${iconColor}`} />
  )

  return (
    <div
      onClick={() => onSelect?.(board.id)}
      className={`flex items-center justify-between w-full h-8 py-1.5 px-4 rounded-lg text-sm transition-colors duration-75 group cursor-pointer overflow-hidden relative ${
        active
          ? 'text-[var(--text-primary)] bg-[var(--color-mauve-cream)]'
          : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)]'
      }`}
    >
      <span className="flex items-center gap-3 truncate">
        {editable ? (
          <Tooltip content="Change icon" placement="right">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleIconPicker?.(board.id)
              }}
              aria-label="Change icon"
              className="shrink-0 hover:bg-[var(--border-default)] rounded p-0.5 transition-colors flex items-center justify-center"
              style={{ width: 16, height: 16 }}
            >
              {iconGlyph}
            </button>
          </Tooltip>
        ) : (
          <span className="flex items-center justify-center shrink-0" style={{ width: 16, height: 16 }}>
            {iconGlyph}
          </span>
        )}

        {renaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitRename?.()
              else if (e.key === 'Escape') onCancelRename?.()
            }}
            onBlur={onCommitRename}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm bg-[var(--surface-card)] border border-[var(--border-default)] rounded px-1.5 py-0.5 focus:outline-none focus:border-[var(--text-primary)] min-w-0"
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              if (!editable) return
              e.stopPropagation()
              onStartRename?.(board)
            }}
            className="truncate"
          >
            {board.name}
          </span>
        )}
      </span>

      {deletable && (
        <span className="flex items-center gap-0.5 shrink-0">
          <Trash
            role="button"
            aria-label={`Delete board ${board.name}`}
            className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--color-copper)] opacity-0 group-hover:opacity-100 shrink-0"
            onClick={(e) => { e.stopPropagation(); onDelete?.(board.id) }}
          />
        </span>
      )}

      {iconPickerOpen && (
        <div className="absolute left-0 top-full z-40" onClick={(e) => e.stopPropagation()}>
          <IconPicker
            value={board.icon}
            onChange={(icon) => onUpdateIcon?.(board.id, icon)}
            onClose={() => onToggleIconPicker?.(null)}
          />
        </div>
      )}
    </div>
  )
}
