import { useEffect, useMemo } from 'react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

/**
 * Wires keyboard navigation across cards on a board:
 *
 *   j / ArrowDown   — focus next card
 *   k / ArrowUp     — focus previous card
 *   Enter / e       — open the focused card
 *   x               — toggle complete on the focused card
 *   Delete / ⌫       — delete the focused card (caller decides confirm)
 *   ⌘D / Ctrl+D     — duplicate the focused card
 *   Esc             — clear focus
 *
 * Movement wraps at the start/end of the list. Movement implicitly
 * focuses the first card if nothing is focused yet.
 *
 * `enabled` should be false while a modal is open or while the user is
 * editing inline, so the shortcuts don't compete with focused inputs.
 */
export function useBoardKeyboardNav({
  orderedIds,
  focusedId,
  setFocusedId,
  onOpen,
  onComplete,
  onDelete,
  onDuplicate,
  enabled = true,
}) {
  const move = useMemo(() => (delta) => {
    if (!orderedIds.length) return
    const idx = focusedId ? orderedIds.indexOf(focusedId) : -1
    if (idx === -1) {
      setFocusedId(delta > 0 ? orderedIds[0] : orderedIds[orderedIds.length - 1])
      return
    }
    const next = (idx + delta + orderedIds.length) % orderedIds.length
    setFocusedId(orderedIds[next])
  }, [orderedIds, focusedId, setFocusedId])

  // If the focused card disappears (was deleted, filtered out, etc.),
  // clear focus so we don't show a stale ring.
  useEffect(() => {
    if (focusedId && !orderedIds.includes(focusedId)) setFocusedId(null)
  }, [focusedId, orderedIds, setFocusedId])

  const when = () => enabled

  const shortcuts = useMemo(() => [
    { key: 'j', when, handler: (e) => { e.preventDefault(); move(1) } },
    { key: 'ArrowDown', when, handler: (e) => { e.preventDefault(); move(1) } },
    { key: 'k', when, handler: (e) => { e.preventDefault(); move(-1) } },
    { key: 'ArrowUp', when, handler: (e) => { e.preventDefault(); move(-1) } },
    { key: 'Enter', when: () => enabled && !!focusedId, handler: (e) => { e.preventDefault(); onOpen?.(focusedId) } },
    { key: 'e', when: () => enabled && !!focusedId, handler: (e) => { e.preventDefault(); onOpen?.(focusedId) } },
    { key: 'x', when: () => enabled && !!focusedId, handler: (e) => { e.preventDefault(); onComplete?.(focusedId) } },
    { key: 'Delete', when: () => enabled && !!focusedId, handler: (e) => { e.preventDefault(); onDelete?.(focusedId) } },
    { key: 'Backspace', when: () => enabled && !!focusedId, handler: (e) => { e.preventDefault(); onDelete?.(focusedId) } },
    { key: 'd', mod: true, when: () => enabled && !!focusedId, handler: (e) => { e.preventDefault(); onDuplicate?.(focusedId) } },
    { key: 'Escape', when: () => enabled && !!focusedId, handler: () => setFocusedId(null) },
    // Note: deliberately no preventDefault on Escape — Modal also listens.
  ], [enabled, focusedId, move, onOpen, onComplete, onDelete, onDuplicate, setFocusedId])

  useKeyboardShortcuts(shortcuts)
}
