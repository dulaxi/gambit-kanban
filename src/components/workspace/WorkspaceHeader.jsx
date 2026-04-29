import { useEffect, useRef, useState } from 'react'
import { Pencil, Users } from '@phosphor-icons/react'
import DynamicIcon from '../board/DynamicIcon'
import IconPicker from '../board/IconPicker'

export default function WorkspaceHeader({
  workspace,
  isOwner,
  memberCount,
  ownerName,
  onRename,
  onIconChange,
}) {
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editingName) setTimeout(() => inputRef.current?.focus(), 50)
  }, [editingName])

  const startRename = () => {
    setNameDraft(workspace.name)
    setEditingName(true)
  }

  const saveRename = async () => {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== workspace.name) await onRename(trimmed)
    setEditingName(false)
  }

  const handleIcon = async (name) => {
    setShowIconPicker(false)
    await onIconChange(name)
  }

  return (
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
            onChange={handleIcon}
            onClose={() => setShowIconPicker(false)}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {editingName ? (
            <input
              ref={inputRef}
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
          {memberCount} member{memberCount !== 1 ? 's' : ''}
          {ownerName ? ` · owned by ${ownerName}` : ''}
        </p>
      </div>
    </div>
  )
}
