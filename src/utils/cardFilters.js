import { isToday, isPast, isThisWeek, parseISO } from 'date-fns'

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export function sortCards(cards, sortBy) {
  if (!sortBy || sortBy === 'manual') return cards
  return [...cards].sort((a, b) => {
    if (sortBy === 'due_date') {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    }
    if (sortBy === 'priority') {
      return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
    }
    if (sortBy === 'created') {
      return (b.created_at || '').localeCompare(a.created_at || '')
    }
    if (sortBy === 'alpha') {
      return (a.title || '').localeCompare(b.title || '')
    }
    return 0
  })
}

export function filterCards(cards, filters) {
  if (!filters) return cards

  return cards.filter((card) => {
    if (filters.priority?.length && !filters.priority.includes(card.priority)) return false
    if (filters.assignee) {
      // Multi-assignee: card matches if any assignee name equals the filter.
      // Fall back to legacy single assignee_name for un-migrated cards.
      const names = (card.assignees && card.assignees.length)
        ? card.assignees
        : (card.assignee_name ? [card.assignee_name] : [])
      if (!names.some((n) => n === filters.assignee)) return false
    }
    if (filters.label?.length && !(card.labels || []).some((l) => filters.label.includes(l.text))) return false
    if (filters.due) {
      const d = card.due_date ? parseISO(card.due_date) : null
      if (filters.due === 'overdue' && !(d && isPast(d) && !isToday(d))) return false
      if (filters.due === 'today' && !(d && isToday(d))) return false
      if (filters.due === 'this_week' && !(d && isThisWeek(d))) return false
      if (filters.due === 'no_date' && d) return false
    }
    return true
  })
}
