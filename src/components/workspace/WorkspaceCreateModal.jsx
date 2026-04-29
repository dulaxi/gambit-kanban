import { useState, useEffect, useRef } from 'react'
import { Users, X } from '@phosphor-icons/react'
import { useWorkspacesStore } from '../../store/workspacesStore'
import DynamicIcon from '../board/DynamicIcon'
import IconPicker from '../board/IconPicker'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'

/**
 * WorkspaceCreateModal — Claude-style centered dialog.
 * Layout matches the "Write skill instructions" modal:
 *  - Header (title + close X)
 *  - Name input
 *  - Description textarea (optional — used when listing workspaces)
 *  - Cancel / Create footer buttons
 */
export default function WorkspaceCreateModal({ open, onClose, onCreated }) {
  const createWorkspace = useWorkspacesStore((s) => s.createWorkspace)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState(null)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setIcon(null)
      setShowIconPicker(false)
      setSubmitting(false)
    }
  }, [open])

  const canSubmit = name.trim().length > 0 && !submitting

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!canSubmit) return
    setSubmitting(true)
    const id = await createWorkspace(name.trim(), icon)
    setSubmitting(false)
    if (id && onCreated) onCreated(id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      contentClassName="grid items-center justify-items-center overflow-y-auto md:p-10 p-4"
      initialFocusRef={nameRef}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col text-left shadow-xl border-0.5 border-[var(--border-default)] rounded-2xl md:p-6 p-4 bg-[var(--surface-page)] w-full max-w-xl"
      >
        {/* Header */}
        <div className="flex items-center gap-4 justify-between">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] flex w-full min-w-0 items-center leading-6 break-words">
            <span className="[overflow-wrap:anywhere]">New workspace</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors -mx-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 mt-3">
          {/* Name + icon */}
          <div className="flex flex-col gap-2">
            <label htmlFor="ws-name" className="text-sm font-medium text-[var(--text-secondary)]">Workspace name</label>
            <div className="flex items-stretch gap-2">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  aria-label="Choose icon"
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-mist)] transition-colors cursor-pointer"
                >
                  {icon ? (
                    <DynamicIcon name={icon} className="w-4 h-4 text-[var(--text-primary)]" />
                  ) : (
                    <Users className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                </button>
                {showIconPicker && (
                  <IconPicker
                    value={icon}
                    onChange={(name) => { setIcon(name); setShowIconPicker(false) }}
                    onClose={() => setShowIconPicker(false)}
                  />
                )}
              </div>
              <Input
                id="ws-name"
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Design team"
                maxLength={64}
                className="flex-1"
              />
            </div>
          </div>

          {/* Description (Claude's auto-sizing textarea pattern) */}
          <div className="flex flex-col gap-2">
            <label htmlFor="ws-desc" className="text-sm font-medium text-[var(--text-secondary)]">Description <span className="text-[var(--text-faint)] font-normal">(optional)</span></label>
            <div className="grid">
              <div
                aria-hidden="true"
                className="bg-[var(--surface-card)] border border-[var(--border-default)] p-3 leading-5 rounded-[0.6rem] whitespace-pre-wrap resize-none row-start-1 row-end-2 col-start-1 col-end-2 min-w-0 break-words text-sm max-h-[124px] overflow-y-auto pointer-events-none invisible"
              >{description || ' '}</div>
              <textarea
                id="ws-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="What this workspace is for. Who's in it. What gets worked on here."
                className="bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--color-mist)] focus:border-[var(--text-muted)] transition-colors placeholder:text-[var(--text-faint)] p-3 leading-5 rounded-[0.6rem] whitespace-pre-wrap resize-none row-start-1 row-end-2 col-start-1 col-end-2 min-w-0 break-words text-sm max-h-[124px] overflow-y-auto focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row justify-end">
          <Button variant="secondary" onClick={onClose} className="min-w-[5rem]">Cancel</Button>
          <Button type="submit" disabled={!canSubmit} className="min-w-[5rem]">Create</Button>
        </div>
      </form>
    </Modal>
  )
}
