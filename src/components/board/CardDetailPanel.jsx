import { useState, useEffect, useRef, useCallback, memo } from 'react'

import { LABEL_COLORS, COLOR_DOT_CLASSES } from '../../constants/colors'
import { ArrowLeft, Bookmark, Calendar, Check, CheckCircle, Copy, DotsThreeVertical, Download, File, FileText, Flag, Image, Paperclip, Plus, Trash, Upload, User, X } from '@phosphor-icons/react'
import DynamicIcon from './DynamicIcon'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useMenuState } from '../../hooks/useMenuState'
import { useCardEditState } from '../../hooks/useCardEditState'
import { useBoardMemberNames } from '../../hooks/useBoardMemberNames'
import IconPicker from './IconPicker'
import { formatDueDateLabel, parseDueDate } from '../../utils/dateUtils'
import Avatar from '../ui/Avatar'
import Modal from '../ui/Modal'
import Popover from '../ui/Popover'
import Menu from '../ui/Menu'
import Tooltip from '../ui/Tooltip'
import AssigneePicker from './cardDetail/AssigneePicker'
import CardChecklist from './cardDetail/CardChecklist'
import CardFiles from './cardDetail/CardFiles'
import { showToast } from '../../utils/toast'
import { useTemplateStore } from '../../store/templateStore'

// Defense-in-depth: drop duplicate labels by (text|color) key before they
// land in state. Same text + same color = same label; multiple instances
// are never the user's intent and are usually a bug symptom (e.g. the
// Enter+blur double-fire in the new-label input).
function dedupLabels(arr) {
  if (!Array.isArray(arr)) return arr
  const seen = new Set()
  const out = []
  for (const l of arr) {
    if (!l || typeof l.text !== 'string') continue
    const key = `${l.text.toLowerCase()}|${l.color || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(l)
  }
  return out
}

export default memo(function CardDetailPanel({ cardId, onClose }) {
  const card = useBoardStore((s) => s.cards[cardId])
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const duplicateCard = useBoardStore((s) => s.duplicateCard)
  const addTemplate = useTemplateStore((s) => s.addTemplate)
  const boardName = useBoardStore((s) => s.boards[s.cards[cardId]?.board_id]?.name || '—')
  const statusName = useBoardStore((s) => s.columns[s.cards[cardId]?.column_id]?.title || '—')
  const attachmentItems = useBoardStore((s) => s.attachments[cardId])
  const fetchAttachments = useBoardStore((s) => s.fetchAttachments)
  const uploadAttachment = useBoardStore((s) => s.uploadAttachment)
  const deleteAttachment = useBoardStore((s) => s.deleteAttachment)
  const getAttachmentUrl = useBoardStore((s) => s.getAttachmentUrl)
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const isMobile = useIsMobile()

  const {
    title, setTitle,
    description, setDescription,
    checklist, setChecklist,
    priority, setPriority,
    dueDate, setDueDate,
    labels, setLabels,
    assignees, setAssignees,
  } = useCardEditState(card)
  const [editingDescription, setEditingDescription] = useState(false)

  // Notion-style description: contentEditable div, NOT a textarea. View
  // and edit modes share the same DOM element so box dimensions are
  // guaranteed identical — no size jump when the user clicks to edit.
  // We set innerText via ref on mount instead of via children prop,
  // because React would otherwise reconcile and overwrite the user's
  // typing on any re-render mid-edit.
  useEffect(() => {
    if (!editingDescription || !descriptionRef.current) return
    const el = descriptionRef.current
    el.innerText = description || ''
    // Place caret at end of content
    const range = document.createRange()
    const sel = window.getSelection()
    range.selectNodeContents(el)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
    el.focus()
  }, [editingDescription]) // eslint-disable-line react-hooks/exhaustive-deps
  const [newCheckItem, setNewCheckItem] = useState('')
  // Single openMenu value: 'menu' | 'priority' | 'due' | 'assignee' | 'icon' | null
  const [openMenu, setOpenMenu, toggleMenu] = useMenuState()
  const titleRef = useRef(null)
  const descriptionRef = useRef(null)
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [newLabelText, setNewLabelText] = useState('')
  // Suppresses the label input's onBlur from re-firing the add/edit action
  // after Enter (or Escape) already handled it. The DOM input gets removed
  // when showLabelForm/editingLabelIdx flips, which triggers blur — but the
  // blur handler's closure captures the OLD newLabelText, leading to a
  // duplicate add. Setting this ref synchronously in onKeyDown lets onBlur
  // bail out before re-executing.
  const labelSubmittedRef = useRef(false)
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [editingLabelIdx, setEditingLabelIdx] = useState(null)
  const [editingLabelText, setEditingLabelText] = useState('')
  // Legacy assignee fallback preserved — formDataRef initialization below still needs this local
  const initialAssignees = card?.assignees?.length
    ? card.assignees
    : (card?.assignee_name ? [card.assignee_name] : [])
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const boardMemberNames = useBoardMemberNames(card)

  const isDirtyRef = useRef(false)
  const autoSaveTimerRef = useRef(null)
  const formDataRef = useRef({ title: card?.title || '', description: card?.description || '', labels: card?.labels ? [...card.labels] : [], assignees: [...initialAssignees], dueDate: card?.due_date || '', checklist: card?.checklist ? card.checklist.map((item) => ({ ...item })) : [], priority: card?.priority || 'medium' })

  useEffect(() => {
    if (card) fetchAttachments(cardId)
  }, [cardId])

  // Re-sync local form state when the card is updated externally (AI tool
  // call, realtime broadcast from another client, etc.) and the user has no
  // pending unsaved edits. Without this, useCardEditState's lazy initializers
  // freeze the form at mount-time values and AI updates only show after a
  // page reload. Gating on isDirtyRef.current prevents clobbering in-progress
  // edits — if the user is mid-type, their unsaved changes win until autosave
  // fires (which resets isDirtyRef and lets the next external update through).
  useEffect(() => {
    if (!card) return
    if (isDirtyRef.current) return
    setTitle(card.title || '')
    setDescription(card.description || '')
    setPriority(card.priority || 'medium')
    setDueDate(card.due_date || '')
    setLabels(card.labels ? card.labels.map((l) => ({ ...l })) : [])
    setAssignees(
      card.assignees?.length
        ? [...card.assignees]
        : (card.assignee_name ? [card.assignee_name] : [])
    )
    setChecklist(card.checklist ? card.checklist.map((i) => ({ ...i })) : [])
  }, [card?.updated_at, card?.id])

  const scheduleSave = useCallback(() => {
    isDirtyRef.current = true
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      if (cardId && formDataRef.current) {
        const d = formDataRef.current
        useBoardStore.getState().updateCard(cardId, {
          title: d.title.trim() || card?.title || 'Untitled task',
          description: d.description,
          labels: d.labels,
          assignees: d.assignees,
          due_date: d.dueDate || null,
          checklist: d.checklist,
          priority: d.priority,
        })
        isDirtyRef.current = false
      }
    }, 1000)
  }, [cardId, card?.title])

  useEffect(() => {
    formDataRef.current = { title, description, labels, assignees, dueDate, checklist, priority }
  })

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      if (isDirtyRef.current && formDataRef.current && cardId) {
        // Bail if the card was deleted while the panel was open — otherwise
        // the optimistic spread in updateCard re-inserts a corrupt card row
        // (no id/board_id/column_id) and the user sees it "come back".
        if (!useBoardStore.getState().cards[cardId]) return
        const d = formDataRef.current
        useBoardStore.getState().updateCard(cardId, {
          title: d.title.trim() || 'Untitled task',
          description: d.description,
          labels: d.labels,
          assignees: d.assignees,
          due_date: d.dueDate || null,
          checklist: d.checklist,
          priority: d.priority,
        })
      }
    }
  }, [cardId])

  if (!card) return null

  const handleSave = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    isDirtyRef.current = false
    updateCard(cardId, { title: title.trim() || card.title, description, labels, assignees, due_date: dueDate || null, checklist, priority })
  }

  const handleSaveAndClose = () => { handleSave(); onClose() }

  const priColor = priority === 'high' ? '#C27A4A' : priority === 'low' ? '#A8BA32' : '#D4A843'

  return (
    <Modal
      open
      onClose={handleSaveAndClose}
      contentClassName="grid items-center justify-items-center overflow-y-auto overflow-x-hidden md:p-10 p-4"
      // Open in view-only mode — no element gets initial focus. The
      // previous fallback (first focusable = "All cards" back button)
      // showed a stray :focus-visible ring whenever the panel was opened
      // by keyboard (Enter from search). Tab still reaches everything
      // inside; we just don't pre-select anything.
      disableInitialFocus
    >
      <div
        className="flex flex-col text-left shadow-xl border-0.5 border-[var(--border-default)] rounded-2xl md:p-6 p-4 bg-[var(--surface-page)] w-full max-w-3xl min-h-[50vh] max-h-[90vh] overflow-hidden"
      >
        {/* Top bar — back + labels + actions. Labels sit between the
            back button and the right-aligned action buttons so they live
            in the same horizontal slab as calendar/attach/menu, left of
            those — semantic grouping with the rest of the metadata. */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="shrink-0 flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            All cards
          </button>
          {/* Labels — moved out of the title row so the heading stays
              clean and labels live next to the other metadata. */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
            {labels.map((label, idx) => (
              editingLabelIdx === idx ? (
                <span key={`${label.text}-${label.color}-edit`} className="relative inline-flex items-center align-middle leading-tight flex-shrink-0 bg-[var(--surface-hover)] text-[var(--text-secondary)] h-6 rounded-lg text-xs lowercase border border-[var(--border-default)]">
                  <span className="invisible px-2">/{editingLabelText || label.text}</span>
                  <input value={editingLabelText} onChange={(e) => setEditingLabelText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        labelSubmittedRef.current = true
                        const t = editingLabelText.trim()
                        if (t) {
                          setLabels(dedupLabels(labels.map((l, i) => i === idx ? { ...l, text: t } : l)))
                          scheduleSave()
                        }
                        setEditingLabelIdx(null)
                      } else if (e.key === 'Escape') {
                        labelSubmittedRef.current = true
                        setEditingLabelIdx(null)
                      }
                    }}
                    onBlur={() => {
                      if (labelSubmittedRef.current) { labelSubmittedRef.current = false; return }
                      const t = editingLabelText.trim()
                      if (t) {
                        setLabels(dedupLabels(labels.map((l, i) => i === idx ? { ...l, text: t } : l)))
                        scheduleSave()
                      }
                      setEditingLabelIdx(null)
                    }}
                    autoFocus className="absolute inset-0 h-full bg-transparent text-xs text-[var(--text-secondary)] px-2 rounded-lg focus:outline-none lowercase" style={{ width: '100%' }} />
                </span>
              ) : (
                <span key={`${label.text}-${label.color}`} className="relative inline-flex items-center align-middle leading-tight flex-shrink-0 bg-[var(--surface-hover)] text-[var(--text-secondary)] h-6 px-2 rounded-lg text-xs lowercase group/label cursor-pointer" onClick={() => { setEditingLabelIdx(idx); setEditingLabelText(label.text) }}>
                  /{label.text}
                  <button type="button" onClick={(e) => { e.stopPropagation(); setLabels(labels.filter((_, i) => i !== idx)); scheduleSave() }} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--surface-card)] border-0.5 border-[var(--border-default)] flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] opacity-0 group-hover/label:opacity-100 transition-all">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )
            ))}
            {showLabelForm ? (
              <span className="inline-flex items-center align-middle leading-tight flex-shrink-0 bg-[var(--surface-hover)] text-[var(--text-secondary)] h-6 rounded-lg text-xs lowercase border border-[var(--border-default)]">
                <input value={newLabelText} onChange={(e) => setNewLabelText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      labelSubmittedRef.current = true
                      const t = newLabelText.trim()
                      if (t) {
                        setLabels(dedupLabels([...labels, { text: t, color: newLabelColor }]))
                        setNewLabelText('')
                        setShowLabelForm(false)
                        scheduleSave()
                      }
                    } else if (e.key === 'Escape') {
                      labelSubmittedRef.current = true
                      setShowLabelForm(false)
                      setNewLabelText('')
                    }
                  }}
                  onBlur={() => {
                    if (labelSubmittedRef.current) { labelSubmittedRef.current = false; return }
                    const t = newLabelText.trim()
                    if (t) {
                      setLabels(dedupLabels([...labels, { text: t, color: newLabelColor }]))
                      setNewLabelText('')
                      scheduleSave()
                    }
                    setShowLabelForm(false)
                  }}
                  autoFocus placeholder="/label" className="h-full bg-transparent text-xs text-[var(--text-secondary)] px-2 rounded-lg focus:outline-none lowercase w-16" />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowLabelForm(true)}
                className={`inline-flex items-center flex-shrink-0 h-6 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors ${
                  /* Empty state: show "+ Labels" so the affordance reads.
                     Otherwise just the plus icon — labels are already
                     visible so the meaning is implicit. */
                  labels.length === 0 ? 'gap-1 px-2 text-xs' : 'justify-center w-6'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                {labels.length === 0 && <span>Labels</span>}
              </button>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1">
            {/* Due date */}
            <div className="relative" data-menu-root>
              {(() => {
                let dateLabel = null
                let dateColor = 'text-[var(--text-muted)]'
                if (dueDate) {
                  const d = parseDueDate(dueDate)
                  const today = new Date()
                  dateLabel = formatDueDateLabel(d)
                  if (dateLabel === 'Today') dateColor = 'text-[var(--color-honey)]'
                  else if (dateLabel === 'Tomorrow') dateColor = 'text-[var(--color-lime-dark)]'
                  else if (dateLabel === 'Yesterday') dateColor = 'text-[var(--color-copper)]'
                  else if (d < today) dateColor = 'text-[var(--color-copper)]'
                  else dateColor = 'text-[var(--text-secondary)]'
                }
                return (
                  <Popover
                    open={openMenu === 'due'}
                    onOpenChange={(next) => setOpenMenu(next ? 'due' : null)}
                    placement="bottom-end"
                    panel={
                      <input
                        type="date"
                        value={dueDate ? dueDate.split('T')[0] : ''}
                        onChange={(e) => {
                          setDueDate(e.target.value ? `${e.target.value}T23:59:59` : '')
                          setOpenMenu(null)
                          scheduleSave()
                        }}
                        autoFocus
                        className="text-sm text-[var(--text-primary)] bg-transparent border border-[var(--border-default)] rounded-lg px-2 py-1.5 focus:border-[var(--border-focus)] focus:outline-none"
                      />
                    }
                  >
                    <Tooltip
                      content={dueDate ? `Due: ${parseDueDate(dueDate).toLocaleDateString()}` : 'Set due date'}
                      placement="bottom"
                    >
                      <button
                        type="button"
                        onClick={() => toggleMenu('due')}
                        aria-label={dueDate ? 'Change due date' : 'Set due date'}
                        className={`h-8 rounded-md flex items-center gap-1.5 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ${dueDate ? 'px-2' : 'w-8 justify-center'} ${dateColor}`}
                      >
                        <Calendar className="w-4 h-4" />
                        {dateLabel && <span className="text-xs font-medium">{dateLabel}</span>}
                      </button>
                    </Tooltip>
                  </Popover>
                )
              })()}
            </div>
            {/* Attach file */}
            <Tooltip content="Attach files" placement="bottom">
            <label
              className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              aria-label="Attach files"
            >
              <Paperclip className="w-4 h-4" />
              <input
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || [])
                  for (const file of files) {
                    try {
                      await uploadAttachment(cardId, file, user?.id)
                    } catch (err) {
                      showToast.error(`Failed to upload ${file.name}`)
                    }
                  }
                  e.target.value = ''
                }}
              />
            </label>
            </Tooltip>
            {/* 3-dot menu — Delete pulled out so it's directly clickable.
                Duplicate + Template stay here as secondary actions. */}
            <Menu
              open={openMenu === 'menu'}
              onOpenChange={(next) => setOpenMenu(next ? 'menu' : null)}
              placement="bottom-end"
              panelClassName="w-44"
              panel={
                <>
                  <Menu.Item
                    icon={<Copy size={14} />}
                    onSelect={() => { duplicateCard(cardId); showToast.success('Duplicated'); setOpenMenu(null) }}
                  >
                    Duplicate
                  </Menu.Item>
                  <Menu.Item
                    icon={<Bookmark size={14} />}
                    onSelect={() => {
                      addTemplate({
                        name: card.title,
                        title: card.title,
                        description: card.description || '',
                        priority: card.priority || 'medium',
                        labels: card.labels || [],
                        checklist: (card.checklist || []).map((item) => ({ text: item.text, done: false })),
                      })
                      showToast.success('Saved as template')
                      setOpenMenu(null)
                    }}
                  >
                    Template
                  </Menu.Item>
                </>
              }
            >
              <button
                type="button"
                onClick={() => toggleMenu('menu')}
                aria-label="More options"
                className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <DotsThreeVertical className="w-5 h-5" />
              </button>
            </Menu>
            {/* Delete — promoted out of the 3-dot menu so it's a direct
                one-click action. Copper tint flags it as destructive. */}
            <Tooltip content="Delete card" placement="bottom">
              <button
                type="button"
                onClick={() => {
                  // Clear dirty flag first so the cleanup effect skips the
                  // save-on-unmount and doesn't fight the optimistic delete.
                  isDirtyRef.current = false
                  deleteCard(cardId)
                  onClose()
                }}
                aria-label="Delete card"
                className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--color-copper)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <Trash className="w-4 h-4" />
              </button>
            </Tooltip>
            {/* Priority flag */}
            <Menu
              open={openMenu === 'priority'}
              onOpenChange={(next) => setOpenMenu(next ? 'priority' : null)}
              placement="bottom-end"
              panelClassName="w-36"
              panel={
                <>
                  {[
                    { value: 'low', label: 'Low', color: '#A8BA32' },
                    { value: 'medium', label: 'Medium', color: '#D4A843' },
                    { value: 'high', label: 'High', color: '#C27A4A' },
                  ].map((opt) => (
                    <Menu.Item
                      key={opt.value}
                      selected={priority === opt.value}
                      onSelect={() => { setPriority(opt.value); setOpenMenu(null); scheduleSave() }}
                      icon={<Flag className="w-3.5 h-3.5" fill={opt.color} style={{ color: opt.color }} />}
                    >
                      {opt.label}
                    </Menu.Item>
                  ))}
                </>
              }
            >
              <button
                type="button"
                onClick={() => toggleMenu('priority')}
                aria-label="Set priority"
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <Flag className="w-4 h-4" fill={priColor} style={{ color: priColor }} />
              </button>
            </Menu>
          </div>
        </div>

        {/* Icon + Title + Labels + Assignee */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="relative" data-menu-root>
              <button
                type="button"
                onClick={() => toggleMenu('icon')}
                className="flex w-10 h-10 shrink-0 items-center justify-center rounded-lg border-0.5 border-[var(--border-default)] bg-[var(--surface-raised)] hover:border-[var(--color-mist)] transition-colors cursor-pointer"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  {card.icon ? <DynamicIcon name={card.icon} className="w-5 h-5 text-[var(--text-primary)]" /> : <FileText size={20} weight="regular" className="text-[var(--text-muted)]" />}
                </div>
              </button>
              {openMenu === 'icon' && (
                <IconPicker value={card.icon} onChange={(icon) => { updateCard(cardId, { icon }); setOpenMenu(null) }} onClose={() => setOpenMenu(null)} />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0 flex-1">
              <span
                ref={titleRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setTitle(e.currentTarget.textContent || '')}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
                onBlur={() => scheduleSave()}
                // Notion-style inline edit — no border, no padding, no
                // focus box. Same visual whether viewing or editing; the
                // contentEditable + cursor-text affordance signals that
                // it's editable without chrome.
                className="font-heading font-light text-[var(--text-primary)] text-left text-[22px] cursor-text focus:outline-none break-words min-w-0 flex-1"
              >
                {card?.title || 'Untitled task'}
              </span>
              {/* Labels relocated to the action row above so the title
                  stays clean and uncrowded. */}
            </div>
          </div>
          <AssigneePicker
            assignees={assignees}
            setAssignees={setAssignees}
            boardMemberNames={boardMemberNames}
            profile={profile}
            scheduleSave={scheduleSave}
            open={openMenu === 'assignee'}
            onOpenChange={(next) => setOpenMenu(next === 'assignee' ? 'assignee' : null)}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Description — same DOM element across view + edit modes
              so box dimensions never shift on click. Read-only divs and
              the contentEditable share the exact `text-sm leading-relaxed
              py-1 whitespace-pre-wrap` footprint. */}
          {editingDescription ? (
            <div
              ref={descriptionRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                setDescription(e.currentTarget.innerText.trim())
                setEditingDescription(false)
                scheduleSave()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  e.currentTarget.blur()
                }
              }}
              className="text-sm text-[var(--text-secondary)] leading-relaxed cursor-text whitespace-pre-wrap py-1 focus:outline-none"
            />
          ) : description ? (
            <div
              className="text-sm text-[var(--text-secondary)] leading-relaxed cursor-text whitespace-pre-wrap py-1 hover:text-[var(--text-primary)] transition-colors"
              onClick={() => setEditingDescription(true)}
            >
              {description}
            </div>
          ) : (
            <div
              className="text-sm text-[var(--text-faint)] leading-relaxed cursor-text whitespace-pre-wrap py-1 hover:text-[var(--text-muted)] transition-colors"
              onClick={() => setEditingDescription(true)}
            >
              Add a description…
            </div>
          )}

          <CardChecklist
            checklist={checklist}
            setChecklist={setChecklist}
            scheduleSave={scheduleSave}
          />

          <CardFiles
            cardId={cardId}
            attachmentItems={attachmentItems}
            getAttachmentUrl={getAttachmentUrl}
            deleteAttachment={deleteAttachment}
          />
        </div>
      </div>
    </Modal>
  )
})
