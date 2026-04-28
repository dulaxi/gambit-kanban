import { addDays, addMonths, format, isPast, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'

export function addRecurrenceInterval(date, interval, unit) {
  if (unit === 'months') return addMonths(date, interval)
  return addDays(date, interval)
}

export function groupCardsByDate(cards) {
  const map = {}
  Object.values(cards).forEach((card) => {
    if (!card.due_date) return
    const dateKey = format(parseISO(card.due_date), 'yyyy-MM-dd')
    if (!map[dateKey]) map[dateKey] = []
    map[dateKey].push(card)
  })
  return map
}

export function getCardsForDate(cardsByDate, day) {
  if (!day) return []
  const key = format(day, 'yyyy-MM-dd')
  return cardsByDate[key] || []
}

export function formatDueDateLabel(date, { long = false } = {}) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, long ? 'MMM d, yyyy' : 'MMM d')
}

export function dueDateColorClass(date) {
  if (!date) return 'text-[#57534e]'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isYesterday(d) || (isPast(d) && !isToday(d))) return 'text-[var(--color-copper)] font-medium'
  if (isToday(d)) return 'text-[var(--color-honey)] font-medium'
  if (isTomorrow(d)) return 'text-[var(--color-lime-dark)] font-medium'
  return 'text-[#57534e]'
}

export function dueDateBadgeClass(date) {
  if (!date) return 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isYesterday(d) || (isPast(d) && !isToday(d))) return 'bg-[var(--color-copper-wash)] text-[var(--color-copper)]'
  if (isToday(d)) return 'bg-[var(--color-honey-wash)] text-[var(--color-honey)]'
  return 'bg-[var(--color-lime-wash)] text-[var(--color-lime-dark)]'
}
