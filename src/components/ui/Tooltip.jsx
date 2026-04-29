import { useState, useRef, useEffect, cloneElement, isValidElement } from 'react'

const PLACEMENT = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

const ARROW_PLACEMENT = {
  top: 'top-full left-1/2 -translate-x-1/2 -mt-px border-t-[var(--color-ink)]',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-px rotate-180 border-t-[var(--color-ink)]',
  left: 'left-full top-1/2 -translate-y-1/2 -rotate-90 -ml-1 border-t-[var(--color-ink)]',
  right: 'right-full top-1/2 -translate-y-1/2 rotate-90 -mr-1 border-t-[var(--color-ink)]',
}

export default function Tooltip({
  content,
  placement = 'top',
  delay = 300,
  disabled = false,
  children,
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  if (!content || disabled) return children

  const show = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(true), delay)
  }
  const hide = () => {
    clearTimeout(timer.current)
    setOpen(false)
  }

  const triggerProps = {
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  }

  const trigger = isValidElement(children)
    ? cloneElement(children, {
        ...triggerProps,
        onMouseEnter: (e) => { children.props.onMouseEnter?.(e); show() },
        onMouseLeave: (e) => { children.props.onMouseLeave?.(e); hide() },
        onFocus: (e) => { children.props.onFocus?.(e); show() },
        onBlur: (e) => { children.props.onBlur?.(e); hide() },
      })
    : <span {...triggerProps}>{children}</span>

  return (
    <span className="relative inline-flex">
      {trigger}
      {open && (
        <span
          role="tooltip"
          className={`absolute z-50 px-2 py-1 text-[11px] font-medium text-white bg-[var(--color-ink)] rounded-md whitespace-nowrap pointer-events-none animate-dropdown ${PLACEMENT[placement] || PLACEMENT.top}`}
        >
          {content}
          <span
            aria-hidden="true"
            className={`absolute w-0 h-0 border-4 border-transparent ${ARROW_PLACEMENT[placement] || ARROW_PLACEMENT.top}`}
          />
        </span>
      )}
    </span>
  )
}
