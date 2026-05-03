import { useEffect } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'

function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

const PLACEMENT = {
  'bottom-start': 'top-full left-0 mt-1.5 origin-top-left',
  'bottom-end':   'top-full right-0 mt-1.5 origin-top-right',
  'top-start':    'bottom-full left-0 mb-1.5 origin-bottom-left',
  'top-end':      'bottom-full right-0 mb-1.5 origin-bottom-right',
}

const PANEL_BASE =
  'absolute z-50 min-w-[200px] p-1 ' +
  'bg-[var(--surface-card)] border border-[var(--color-mist)] rounded-[10px] ' +
  'shadow-[0_10px_30px_rgba(27,27,24,0.10),0_2px_6px_rgba(27,27,24,0.04)] ' +
  'animate-dropdown'

export default function Popover({
  open,
  onOpenChange,
  placement = 'bottom-start',
  panel,
  panelClassName = '',
  closeOnEscape = true,
  closeOnOutsideClick = true,
  className = '',
  children,
}) {
  const ref = useClickOutside(() => {
    if (closeOnOutsideClick && open) onOpenChange?.(false)
  })

  useEffect(() => {
    if (!open || !closeOnEscape) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        // Blur whatever is focused (typically the trigger button) so the
        // keyboard-modality flip from Escape doesn't surface a :focus-visible
        // ring on the trigger after the popover closes.
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        onOpenChange?.(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeOnEscape, onOpenChange])

  return (
    <div ref={ref} data-menu-root className={mergeClassNames('relative', className)}>
      {children}
      {open && (
        <div
          role="dialog"
          className={mergeClassNames(PANEL_BASE, PLACEMENT[placement] || PLACEMENT['bottom-start'], panelClassName)}
        >
          {panel}
        </div>
      )}
    </div>
  )
}
