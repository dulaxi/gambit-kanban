function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

const VARIANTS = {
  block: 'rounded-md',
  line: 'rounded h-3.5',
  circle: 'rounded-full',
  pill: 'rounded-full h-6',
}

const TONES = {
  // Default subtle: surface-raised pulsing
  default: 'bg-[var(--surface-raised)] animate-pulse',
  // AI tone: lime/cream shimmer (matches the existing ai-skeleton-block)
  ai: 'ai-skeleton-block',
}

export default function Skeleton({
  variant = 'block',
  tone = 'default',
  width,
  height,
  className = '',
  style: styleProp,
  ...rest
}) {
  const style = {
    ...(width != null ? { width: typeof width === 'number' ? `${width}px` : width } : null),
    ...(height != null ? { height: typeof height === 'number' ? `${height}px` : height } : null),
    ...styleProp,
  }
  return (
    <span
      aria-hidden="true"
      className={mergeClassNames(
        'block',
        VARIANTS[variant] || VARIANTS.block,
        TONES[tone] || TONES.default,
        className,
      )}
      style={style}
      {...rest}
    />
  )
}
