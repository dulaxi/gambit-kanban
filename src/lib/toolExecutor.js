import { useBoardStore } from '../store/boardStore'
import { useNoteStore } from '../store/noteStore'
import { useWorkspacesStore } from '../store/workspacesStore'
import { LEGACY_ICON_REMAP } from '../components/board/DynamicIcon'

// Normalize an icon name from the model: trim, lowercase, accept only kebab-case-ish
// strings (letters/digits/hyphens), then apply the legacy lucide→Phosphor remap.
// Returns null for anything malformed so the card renders without an icon rather
// than crashing on a bad Phosphor name.
function normalizeIcon(name) {
  if (!name || typeof name !== 'string') return null
  const trimmed = name.trim().toLowerCase()
  if (!trimmed) return null
  if (!/^[a-z0-9-]+$/.test(trimmed)) return null
  return LEGACY_ICON_REMAP[trimmed] || trimmed
}

const TITLE_MAX = 200
const DESCRIPTION_MAX = 5000

// Capitalize the first letter of a title — but only when the first word looks
// like an accidental lowercase ("buy milk" from a fast-path paste), not when
// the case is intentional ("iPhone repair", "API rewrite", "macOS update").
// Heuristic: skip if any uppercase letter already appears in the first word.
function capitalizeFirstLetter(title) {
  if (!title) return title
  // Bail out if it doesn't start with a lowercase letter (number, emoji, etc.)
  if (!/^[a-z]/.test(title)) return title
  const firstSpace = title.search(/\s/)
  const firstWord = firstSpace >= 0 ? title.slice(0, firstSpace) : title
  // Intentional casing signal: any uppercase letter inside the first word
  if (/[A-Z]/.test(firstWord)) return title
  return title.charAt(0).toUpperCase() + title.slice(1)
}

function findBoardByName(name) {
  const boards = useBoardStore.getState().boards
  const lower = name.toLowerCase()
  return Object.values(boards).find((b) => b.name.toLowerCase() === lower)
}

function findColumnByName(boardId, name) {
  const columns = useBoardStore.getState().columns
  const lower = name.toLowerCase()
  return Object.values(columns).find(
    (c) => c.board_id === boardId && c.title.toLowerCase() === lower
  )
}

function findCardByTitle(title) {
  const cards = useBoardStore.getState().cards
  const lower = title.toLowerCase()
  return Object.values(cards).find((c) => c.title.toLowerCase() === lower)
}

function firstColumnOf(boardId) {
  const columns = useBoardStore.getState().columns
  return Object.values(columns)
    .filter((c) => c.board_id === boardId)
    .sort((a, b) => a.position - b.position)[0]
}

function lastColumnOf(boardId) {
  const columns = useBoardStore.getState().columns
  return Object.values(columns)
    .filter((c) => c.board_id === boardId)
    .sort((a, b) => a.position - b.position)
    .at(-1)
}

function findCards({ board, column, card_titles }) {
  const store = useBoardStore.getState()
  let cards = Object.values(store.cards)

  if (board) {
    const b = findBoardByName(board)
    if (!b) return []
    cards = cards.filter((c) => c.board_id === b.id)
  }

  if (column) {
    const boardId = board ? findBoardByName(board)?.id : null
    const cols = Object.values(store.columns)
    const lower = column.toLowerCase()
    const matchCol = cols.find(
      (c) => c.title.toLowerCase() === lower && (!boardId || c.board_id === boardId)
    )
    if (!matchCol) return []
    cards = cards.filter((c) => c.column_id === matchCol.id)
  }

  if (card_titles && card_titles.length > 0) {
    const lowerTitles = card_titles.map((t) => t.toLowerCase())
    cards = cards.filter((c) => lowerTitles.includes(c.title.toLowerCase()))
  }

  return cards
}

function findNoteByTitle(title) {
  const notes = useNoteStore.getState().notes
  const lower = title.toLowerCase()
  return Object.values(notes).find((n) => n.title.toLowerCase() === lower)
}

function findWorkspaceByName(name) {
  const workspaces = useWorkspacesStore.getState().workspaces
  const lower = name.toLowerCase()
  return Object.values(workspaces).find((w) => w.name.toLowerCase() === lower)
}

const DESTRUCTIVE_ACTIONS = ['delete_card', 'delete_board', 'delete_column', 'remove_member']

const aiBuildingCards = new Set()
export function isAIBuilding(cardId) { return aiBuildingCards.has(cardId) }

const AI_CARDS_KEY = 'kolumn-ai-cards'
function getAICards() { try { return new Set(JSON.parse(localStorage.getItem(AI_CARDS_KEY) || '[]')) } catch { return new Set() } }
function saveAICard(id) { const s = getAICards(); s.add(id); localStorage.setItem(AI_CARDS_KEY, JSON.stringify([...s].slice(-200))) }
export function isAICreated(cardId) { return getAICards().has(cardId) }

export function isDestructive(action) {
  return DESTRUCTIVE_ACTIONS.includes(action)
}

export async function executeTool(action, params) {
  console.log('[toolExecutor]', action, params)
  const store = useBoardStore.getState()

  if (action === 'create_card') {
    // Title: required, trimmed, 1–200 chars. Capitalize the first letter so
    // the fast path (which ships raw user paste) produces presentable cards
    // — e.g. "buy milk" → "Buy milk". See `capitalizeFirstLetter` for the
    // intentional-casing heuristic that preserves "iPhone repair" etc.
    const titleTrimmed = (params.title || '').trim()
    if (!titleTrimmed) return { ok: false, error: 'Card title is required' }
    if (titleTrimmed.length > TITLE_MAX) {
      return { ok: false, error: `Card title is too long (max ${TITLE_MAX} chars)` }
    }
    const title = capitalizeFirstLetter(titleTrimmed)

    // Description: truncate silently at DESCRIPTION_MAX, flag in result
    const descRaw = params.description || ''
    const truncated = descRaw.length > DESCRIPTION_MAX
    const description = truncated ? descRaw.slice(0, DESCRIPTION_MAX) : descRaw

    // Board: prefer boardId (pill injects this), fall back to board name for
    // future surfaces that may not have a pinned board.
    let board = null
    if (params.boardId) {
      board = store.boards[params.boardId] || null
    } else if (params.board) {
      board = findBoardByName(params.board)
    }
    if (!board) {
      if (params.boardId) return { ok: false, error: 'Board not found for the given boardId' }
      if (params.board) return { ok: false, error: `Board "${params.board}" not found` }
      return { ok: false, error: 'No board context — caller must provide boardId' }
    }

    // Column: provided name → match; otherwise first by position
    let column
    if (params.column) {
      column = findColumnByName(board.id, params.column)
      if (!column) {
        const available = Object.values(store.columns)
          .filter((c) => c.board_id === board.id)
          .sort((a, b) => a.position - b.position)
          .map((c) => c.title)
          .join(', ')
        return { ok: false, error: `Column "${params.column}" not found on "${board.name}". Available: ${available}` }
      }
    } else {
      column = firstColumnOf(board.id)
      if (!column) return { ok: false, error: `Board "${board.name}" has no columns` }
    }

    // Defaults enforced in executor (not just prompt) so the pill's fast path
    // and LLM path produce identical cards. Conservative principle: do NOT
    // auto-attribute user-facing fields like assignee — leave null unless the
    // user explicitly named someone. See memory:
    // feedback_ai_tool_defaults_conservative.
    const appliedDefaults = []

    const priority = params.priority || 'medium'
    if (!params.priority) appliedDefaults.push('priority')

    const assignee = params.assignee || null

    const icon = normalizeIcon(params.icon)
    const checklist = (params.checklist || []).map((text) => ({ text, done: false }))

    // boardStore.addCard reads `cardData.assignee` (not `assignee_name`) and
    // `cardData.dueDate` (not `due_date`). This camelCase quirk is intentional
    // — see CLAUDE.md → Key Data Shapes. The store maps to the snake_case
    // DB columns internally. Do not "fix" by renaming here.
    const tempId = await store.addCard(board.id, column.id, {
      title,
      description,
      priority,
      icon,
      labels: params.labels || [],
      checklist,
      assignee,
      dueDate: params.due_date || null,
    })
    if (!tempId) return { ok: false, error: 'Failed to create card' }
    aiBuildingCards.add(tempId)

    // Capture task_number from the optimistic card (set by boardStore.addCard)
    const taskNumber = useBoardStore.getState().cards[tempId]?.task_number ?? null

    let cardId = tempId
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200))
      const realId = useBoardStore.getState()._tempIdMap[tempId]
      if (realId) {
        aiBuildingCards.add(realId)
        saveAICard(realId)
        cardId = realId
        break
      }
    }
    setTimeout(() => { aiBuildingCards.delete(tempId); aiBuildingCards.delete(cardId) }, 3000)

    return {
      ok: true,
      cardId,
      task_number: taskNumber,
      resolved: {
        board: { id: board.id, name: board.name },
        column: { id: column.id, title: column.title },
      },
      applied_defaults: appliedDefaults,
      ...(truncated ? { truncated: true } : {}),
    }
  }

  if (action === 'move_card') {
    // Source card resolution. Order of precedence:
    //   1. params.cardId (forward-compat; the model can't fabricate one today
    //      because IDs aren't in the prompt, but the field is wired for when
    //      they are).
    //   2. params.card_title scoped to params.boardId (pill's host board) —
    //      this is the common path. Strict scope: no cross-board source.
    //   3. Defensive global fallback when boardId is absent (future
    //      non-pill surface, e.g. a chat read-only summarize that needs to
    //      identify cards).
    let card = null
    let sourceBoard = null
    let scopeName = '' // used in the not-found error

    if (params.cardId) {
      const candidate = store.cards[params.cardId] || null
      // Enforce pill scope: cardId must point to a card on the pill's board
      if (candidate && params.boardId && candidate.board_id !== params.boardId) {
        return { ok: false, error: 'Card is not on the current board' }
      }
      if (candidate) {
        card = candidate
        sourceBoard = store.boards[card.board_id] || null
      }
    } else if (params.card_title) {
      const lowerTitle = params.card_title.toLowerCase()
      if (params.boardId) {
        sourceBoard = store.boards[params.boardId] || null
        if (!sourceBoard) {
          return { ok: false, error: 'Board not found for the given boardId' }
        }
        scopeName = `board "${sourceBoard.name}"`
        const matches = Object.values(store.cards).filter(
          (c) => c.board_id === sourceBoard.id && c.title.toLowerCase() === lowerTitle,
        )
        if (matches.length > 1) {
          const hints = matches
            .map((m) => `"${m.title}" in ${store.columns[m.column_id]?.title || 'unknown column'}`)
            .join(', ')
          return {
            ok: false,
            error: `Multiple cards titled "${params.card_title}" on ${scopeName} (${hints}). Be more specific.`,
          }
        }
        card = matches[0] || null
      } else {
        // Defensive global search
        scopeName = 'any board'
        const matches = Object.values(store.cards).filter(
          (c) => c.title.toLowerCase() === lowerTitle,
        )
        if (matches.length > 1) {
          const hints = matches
            .map((m) => `${store.boards[m.board_id]?.name || '?'}/${store.columns[m.column_id]?.title || '?'}`)
            .join(', ')
          return {
            ok: false,
            error: `Multiple cards titled "${params.card_title}" across boards (${hints}). Be more specific.`,
          }
        }
        card = matches[0] || null
        if (card) sourceBoard = store.boards[card.board_id] || null
      }
    }

    if (!card) {
      return {
        ok: false,
        error: `Card "${params.card_title || params.cardId}" not found on ${scopeName || 'any board'}`,
      }
    }
    if (!sourceBoard) {
      return { ok: false, error: 'Source board for the card could not be resolved' }
    }
    const sourceColumn = store.columns[card.column_id] || null

    // Target board is always the source board. Cross-board moves are off
    // — the pill is a single-board action surface, and to_board/to_board_id
    // have been removed from the schema. If the model still emits them
    // (stale prompt cache, etc.), we silently ignore.
    const targetBoard = sourceBoard

    // Target column resolution — must exist on target board
    const targetColumn = findColumnByName(targetBoard.id, params.to_column)
    if (!targetColumn) {
      const available = Object.values(store.columns)
        .filter((c) => c.board_id === targetBoard.id)
        .sort((a, b) => a.position - b.position)
        .map((c) => c.title)
        .join(', ')
      return {
        ok: false,
        error: `Column "${params.to_column}" not found on "${targetBoard.name}". Available: ${available}`,
      }
    }

    const result = {
      ok: true,
      cardId: card.id,
      card: { id: card.id, title: card.title, task_number: card.task_number },
      from: {
        board: { id: sourceBoard.id, name: sourceBoard.name },
        column: sourceColumn
          ? { id: sourceColumn.id, title: sourceColumn.title }
          : null,
      },
      to: {
        board: { id: targetBoard.id, name: targetBoard.name },
        column: { id: targetColumn.id, title: targetColumn.title },
      },
    }

    // No-op detection: card already in target column on target board
    if (card.column_id === targetColumn.id && card.board_id === targetBoard.id) {
      return { ...result, noop: true }
    }

    await store.updateCard(card.id, { column_id: targetColumn.id, board_id: targetBoard.id })
    return result
  }

  if (action === 'update_card') {
    const card = findCardByTitle(params.card_title)
    if (!card) return { ok: false, error: `Card "${params.card_title}" not found` }

    const updates = { ...params.updates }
    if (updates.checklist) {
      updates.checklist = updates.checklist.map((text) =>
        typeof text === 'string' ? { text, done: false } : text
      )
    }
    if (updates.assignee) {
      updates.assignee_name = updates.assignee
      delete updates.assignee
    }

    await store.updateCard(card.id, updates)
    return { ok: true }
  }

  if (action === 'delete_card') {
    const card = findCardByTitle(params.card_title)
    if (!card) return { ok: false, error: `Card "${params.card_title}" not found` }
    await store.deleteCard(card.id)
    return { ok: true }
  }

  if (action === 'create_board') {
    const columns = params.columns || ['To Do', 'In Progress', 'Done']
    const boardId = await store.addBoard(params.name, params.icon || null, columns)
    if (boardId) {
      store.setActiveBoard(boardId)
      window.dispatchEvent(new CustomEvent('kolumn:ai-navigate-board'))
    }
    return { ok: true, boardId }
  }

  if (action === 'move_cards') {
    if (!params.from_column && (!params.card_titles || params.card_titles.length === 0)) {
      return { ok: false, error: 'Provide from_column or card_titles to filter which cards to move' }
    }
    const board = findBoardByName(params.board)
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }

    const toCol = findColumnByName(board.id, params.to_column)
    if (!toCol) return { ok: false, error: `Column "${params.to_column}" not found` }

    const cards = findCards({ board: params.board, column: params.from_column, card_titles: params.card_titles })
    if (cards.length === 0) return { ok: false, error: 'No matching cards found' }

    for (const card of cards) {
      await store.updateCard(card.id, { column_id: toCol.id })
    }
    return { ok: true, moved: cards.length }
  }

  if (action === 'update_cards') {
    if (!params.board && !params.column && (!params.card_titles || params.card_titles.length === 0)) {
      return { ok: false, error: 'Provide at least one filter (board, column, or card_titles)' }
    }

    const cards = findCards({ board: params.board, column: params.column, card_titles: params.card_titles })
    if (cards.length === 0) return { ok: false, error: 'No matching cards found' }

    const updates = { ...params.updates }
    if (updates.assignee) {
      updates.assignee_name = updates.assignee
      delete updates.assignee
    }
    if (updates.checklist) {
      updates.checklist = updates.checklist.map((text) =>
        typeof text === 'string' ? { text, done: false } : text
      )
    }

    for (const card of cards) {
      await store.updateCard(card.id, updates)
    }
    return { ok: true, updated: cards.length }
  }

  if (action === 'complete_cards') {
    if (!params.board && !params.column && (!params.card_titles || params.card_titles.length === 0)) {
      return { ok: false, error: 'Provide at least one filter (board, column, or card_titles)' }
    }

    const cards = findCards({ board: params.board, column: params.column, card_titles: params.card_titles })
    if (cards.length === 0) return { ok: false, error: 'No matching cards found' }

    for (const card of cards) {
      const lastCol = lastColumnOf(card.board_id)
      await store.updateCard(card.id, { completed: true, column_id: lastCol?.id || card.column_id })
    }
    return { ok: true, completed: cards.length }
  }

  if (action === 'duplicate_card') {
    const card = findCardByTitle(params.card_title)
    if (!card) return { ok: false, error: `Card "${params.card_title}" not found` }

    const newId = await store.duplicateCard(card.id)
    if (!newId) return { ok: false, error: 'Failed to duplicate card' }

    if (params.to_board || params.to_column) {
      const targetBoardId = params.to_board ? findBoardByName(params.to_board)?.id : card.board_id
      if (!targetBoardId) return { ok: false, error: `Board "${params.to_board}" not found` }

      const targetCol = params.to_column
        ? findColumnByName(targetBoardId, params.to_column)
        : firstColumnOf(targetBoardId)
      if (targetCol) {
        await store.updateCard(newId, { column_id: targetCol.id, board_id: targetBoardId })
      }
    }

    return { ok: true, cardId: newId }
  }

  if (action === 'toggle_checklist') {
    const card = findCardByTitle(params.card_title)
    if (!card) return { ok: false, error: `Card "${params.card_title}" not found` }
    if (!card.checklist || card.checklist.length === 0) {
      return { ok: false, error: `Card "${params.card_title}" has no checklist` }
    }

    const updated = card.checklist.map((item, i) =>
      params.items.includes(i) ? { ...item, done: params.done } : item
    )
    await store.updateCard(card.id, { checklist: updated })
    return { ok: true }
  }

  if (action === 'update_board') {
    const board = findBoardByName(params.board)
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }

    if (params.name) await store.renameBoard(board.id, params.name)
    if (params.icon) await store.updateBoardIcon(board.id, params.icon)
    return { ok: true }
  }

  if (action === 'delete_board') {
    const board = findBoardByName(params.board)
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }

    await store.deleteBoard(board.id)
    return { ok: true }
  }

  if (action === 'add_column') {
    const board = findBoardByName(params.board)
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }

    await store.addColumn(board.id, params.title)
    return { ok: true }
  }

  if (action === 'delete_column') {
    const board = findBoardByName(params.board)
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }

    const column = findColumnByName(board.id, params.column)
    if (!column) return { ok: false, error: `Column "${params.column}" not found in "${params.board}"` }

    await store.deleteColumn(board.id, column.id)
    return { ok: true }
  }

  if (action === 'invite_member') {
    const workspace = findWorkspaceByName(params.workspace)
    if (!workspace) return { ok: false, error: `Workspace "${params.workspace}" not found` }

    await useWorkspacesStore.getState().inviteToWorkspace(workspace.id, params.email)
    return { ok: true }
  }

  if (action === 'remove_member') {
    const workspace = findWorkspaceByName(params.workspace)
    if (!workspace) return { ok: false, error: `Workspace "${params.workspace}" not found` }

    const wsStore = useWorkspacesStore.getState()
    if (!wsStore.members[workspace.id]) {
      await wsStore.fetchMembers(workspace.id)
    }

    const members = useWorkspacesStore.getState().members[workspace.id] || []
    const lower = (params.display_name || '').toLowerCase()
    const member = members.find((m) => m.display_name.toLowerCase() === lower)
    if (!member) return { ok: false, error: `Member "${params.display_name}" not found in "${params.workspace}"` }

    await useWorkspacesStore.getState().removeMember(workspace.id, member.user_id)
    return { ok: true }
  }

  if (action === 'create_note') {
    const noteStore = useNoteStore.getState()
    const noteId = await noteStore.addNote(params.title)
    if (!noteId) return { ok: false, error: 'Failed to create note' }

    if (params.content) {
      await useNoteStore.getState().updateNote(noteId, { content: params.content })
    }
    return { ok: true, noteId }
  }

  if (action === 'update_note') {
    const note = findNoteByTitle(params.title)
    if (!note) return { ok: false, error: `Note "${params.title}" not found` }

    if (params.append) {
      const existing = note.content || ''
      const separator = existing.endsWith('\n') || existing === '' ? '' : '\n\n'
      await useNoteStore.getState().updateNote(note.id, { content: existing + separator + params.append })
    } else if (params.content !== undefined) {
      await useNoteStore.getState().updateNote(note.id, { content: params.content })
    }
    return { ok: true }
  }

  if (action === 'search_cards' || action === 'summarize_board') {
    return { ok: true, readOnly: true }
  }

  return { ok: false, error: `Unknown action: ${action}` }
}
