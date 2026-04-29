import { forwardRef } from 'react'

function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

const BASE =
  'w-full text-[13px] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] ' +
  'border border-[var(--border-default)] rounded-lg ' +
  'px-3 py-2 leading-relaxed ' +
  'transition-colors duration-100 outline-none ' +
  'hover:border-[var(--color-mist)] focus:border-[var(--color-ink)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

const ERROR =
  'border-[var(--color-copper)] hover:border-[var(--color-copper)] focus:border-[var(--color-copper)]'

const Textarea = forwardRef(function Textarea(
  { error = false, className = '', rows = 3, ...rest },
  ref,
) {
  const classes = mergeClassNames(BASE, error ? ERROR : '', className)
  return <textarea ref={ref} rows={rows} className={classes} {...rest} />
})

export default Textarea
