import { useEffect } from 'react'

/**
 * Bind a list of keyboard shortcuts to document keydown.
 *
 * Each shortcut accepts:
 *   key            — the KeyboardEvent.key to match (case-insensitive)
 *   mod            — require ⌘ on macOS / Ctrl elsewhere
 *   shift          — require Shift
 *   alt            — require Alt
 *   when           — optional () => boolean predicate; if returns false, skip
 *   allowInInput   — when true, the shortcut still fires while typing
 *                    in inputs/textareas/contenteditable; default false
 *   handler        — (e) => void; called with the original event
 *
 * The hook automatically suppresses shortcuts while the user is typing
 * unless `allowInInput` is set. It does NOT preventDefault — handlers
 * should do that themselves so callers can choose.
 */
export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    if (!shortcuts || shortcuts.length === 0) return

    const onKeyDown = (e) => {
      const target = e.target
      const isInput =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
      const modPressed = isMac ? e.metaKey : e.ctrlKey

      for (const s of shortcuts) {
        if (!s || typeof s.handler !== 'function') continue

        const keyMatches = e.key.toLowerCase() === String(s.key).toLowerCase()
        if (!keyMatches) continue

        const wantMod = !!s.mod
        const wantShift = !!s.shift
        const wantAlt = !!s.alt
        if (wantMod !== modPressed) continue
        if (wantShift !== e.shiftKey) continue
        if (wantAlt !== e.altKey) continue

        if (isInput && !s.allowInInput) continue
        if (typeof s.when === 'function' && !s.when()) continue

        s.handler(e)
        // Stop here so two shortcuts don't both fire on the same key
        return
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [shortcuts])
}
