import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

let openModalCount = 0
let savedBodyOverflow = ''
let savedBodyPaddingRight = ''

// Stack of currently-open modals (most-recent last). Only the topmost
// modal handles Escape and Tab focus-trap, so nested modals work correctly.
const modalStack = []

function lockBodyScroll() {
  if (openModalCount === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    savedBodyOverflow = document.body.style.overflow
    savedBodyPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      const current = parseInt(window.getComputedStyle(document.body).paddingRight, 10) || 0
      document.body.style.paddingRight = `${current + scrollbarWidth}px`
    }
    const root = document.getElementById('root')
    if (root) {
      root.setAttribute('inert', '')
      root.setAttribute('aria-hidden', 'true')
    }
  }
  openModalCount += 1
}

function unlockBodyScroll() {
  openModalCount = Math.max(0, openModalCount - 1)
  if (openModalCount === 0) {
    document.body.style.overflow = savedBodyOverflow
    document.body.style.paddingRight = savedBodyPaddingRight
    const root = document.getElementById('root')
    if (root) {
      root.removeAttribute('inert')
      root.removeAttribute('aria-hidden')
    }
  }
}

function getFocusables(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  )
}

export default function Modal({
  open,
  onClose,
  children,
  role = 'dialog',
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  lockScroll = true,
  trapFocus = true,
  dismissOnEscape = true,
  dismissOnOutside = true,
  initialFocusRef,
  backdropClassName = 'bg-[rgba(27,27,24,0.45)]',
  contentClassName = 'flex items-center justify-center',
  className = '',
  zIndex = 50,
}) {
  const contentRef = useRef(null)

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') onClose()
  }, [onClose])

  // Body scroll lock + inert root
  useEffect(() => {
    if (!open || !lockScroll) return
    lockBodyScroll()
    return () => unlockBodyScroll()
  }, [open, lockScroll])

  // Set initial focus inside the modal. We do NOT restore focus to the
  // trigger on close — restoring would surface a :focus-visible ring on the
  // trigger after Escape (keyboard modality), which the user does not want.
  useEffect(() => {
    if (!open) return
    const target =
      initialFocusRef?.current ||
      getFocusables(contentRef.current)[0] ||
      contentRef.current
    target?.focus?.()
  }, [open, initialFocusRef])

  // Escape + Tab focus trap — only the topmost modal in the stack responds,
  // so nested modals don't all close at once.
  useEffect(() => {
    if (!open) return
    const token = { contentRef }
    modalStack.push(token)

    const isTopmost = () => modalStack[modalStack.length - 1] === token

    const onKeyDown = (e) => {
      if (!isTopmost()) return
      if (e.key === 'Escape' && dismissOnEscape) {
        e.stopPropagation()
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        handleClose()
        return
      }
      if (e.key === 'Tab' && trapFocus) {
        const focusables = getFocusables(contentRef.current)
        if (focusables.length === 0) {
          e.preventDefault()
          contentRef.current?.focus?.()
          return
        }
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || !contentRef.current?.contains(active))) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && (active === last || !contentRef.current?.contains(active))) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      const idx = modalStack.indexOf(token)
      if (idx >= 0) modalStack.splice(idx, 1)
    }
  }, [open, dismissOnEscape, trapFocus, handleClose])

  if (!open) return null

  const onBackdropClick = (e) => {
    if (!dismissOnOutside) return
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return createPortal(
    <div
      className={`fixed inset-0 ${backdropClassName} ${contentClassName} ${className}`}
      style={{ zIndex }}
      onClick={onBackdropClick}
      data-modal-backdrop
    >
      <div
        ref={contentRef}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className="outline-none contents"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
