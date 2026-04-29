import { useState, useRef, useCallback } from 'react'
import { Kanban, X } from '@phosphor-icons/react'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useBoardStore } from '../../store/boardStore'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Tooltip from '../ui/Tooltip'
import TemplatePicker from './createBoard/TemplatePicker'
import BoardSkeletonPreview from './createBoard/BoardSkeletonPreview'
import { TEMPLATES } from './createBoard/templates'

export default function CreateBoardModal({ onClose, workspaceId = null }) {
  const isMobile = useIsMobile()
  const addBoard = useBoardStore((s) => s.addBoard)

  const [name, setName] = useState('')
  const [icon, setIcon] = useState(null)
  // Once the user explicitly picks an icon, don't let a later template
  // selection silently overwrite it.
  const [iconManuallySet, setIconManuallySet] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('blank')
  const [creating, setCreating] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)

  const nameRef = useRef(null)

  const template = TEMPLATES.find((t) => t.key === selectedTemplate) || TEMPLATES[0]

  const handleTemplateSelect = useCallback((tpl) => {
    setSelectedTemplate(tpl.key)
    if (tpl.icon && !iconManuallySet) setIcon(tpl.icon)
  }, [iconManuallySet])

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed || creating) return
    setCreating(true)
    try {
      const id = await addBoard(trimmed, icon, template.columns, workspaceId)
      if (id) onClose()
    } finally {
      setCreating(false)
    }
  }, [name, icon, template, creating, addBoard, onClose, workspaceId])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreate()
    }
  }, [handleCreate])

  const canCreate = name.trim().length > 0 && !creating

  return (
    <>
      <Modal
        open
        onClose={onClose}
        contentClassName="flex items-center justify-center"
        initialFocusRef={nameRef}
      >
        <div
          className={`bg-[var(--surface-page)] shadow-2xl flex flex-col overflow-hidden ${
            isMobile ? 'fixed inset-0 rounded-none' : 'rounded-2xl w-[900px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-2">
              <Kanban className="w-4 h-4 text-[var(--text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">New Board</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className={`flex-1 overflow-y-auto ${isMobile ? 'flex flex-col' : 'flex'}`}>
            {/* Left side: inputs + templates */}
            <div className={`p-6 flex flex-col gap-5 ${
              isMobile ? 'w-full' : 'w-[340px] shrink-0 border-r border-[var(--border-default)]'
            }`}>
              {/* Board name + icon */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Board name</label>
                <div className="flex gap-2">
                  <Tooltip content="Choose icon" placement="top">
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(true)}
                      aria-label="Choose icon"
                      className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-raised)] transition-colors"
                    >
                      {icon ? (
                        <DynamicIcon name={icon} className="w-4 h-4 text-[var(--text-secondary)]" />
                      ) : (
                        <Kanban className="w-4 h-4 text-[var(--text-muted)]" />
                      )}
                    </button>
                  </Tooltip>
                  <Input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    maxLength={200}
                    placeholder="e.g. Product Roadmap"
                    className="flex-1"
                  />
                </div>
              </div>

              <TemplatePicker selectedKey={selectedTemplate} onSelect={handleTemplateSelect} />
            </div>

            {/* Right side: skeleton preview */}
            <div className={`flex-1 flex flex-col items-center justify-center p-6 ${
              isMobile ? 'border-t border-[var(--border-default)]' : ''
            }`}>
              <div className="text-[11px] font-medium text-[var(--text-muted)] mb-3 self-start">Preview</div>
              <div className="w-full">
                <BoardSkeletonPreview columns={template.columns} />
              </div>
              <div className="mt-3 text-[11px] text-[var(--text-muted)]">
                {template.columns.length} column{template.columns.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border-default)]">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!canCreate}
              loading={creating}
              loadingText="Creating"
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Icon picker overlay (separate Modal — stacks above) */}
      {showIconPicker && (
        <IconPicker
          value={icon}
          onChange={(newIcon) => { setIcon(newIcon); setIconManuallySet(true) }}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </>
  )
}
