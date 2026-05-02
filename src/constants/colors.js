// Centralized color constants — single source of truth for the design system.
// All components should import from here instead of defining local copies.

// Label color names used for card labels
export const LABEL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gray']

// Tailwind background classes for each label color (used in pickers/dots)
export const COLOR_DOT_CLASSES = {
  red: 'bg-[var(--label-red-bg)]',
  blue: 'bg-[var(--label-blue-bg)]',
  green: 'bg-[var(--label-green-bg)]',
  yellow: 'bg-[var(--label-yellow-bg)]',
  purple: 'bg-[var(--label-purple-bg)]',
  pink: 'bg-[var(--color-bark-wash)]',
  gray: 'bg-[var(--label-gray-bg)]',
}

// Priority options for card detail fields and inline editor
export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', dot: 'bg-[var(--color-lime-dark)]' },
  { value: 'medium', label: 'Medium', dot: 'bg-[var(--color-honey)]' },
  { value: 'high', label: 'High', dot: 'bg-[var(--color-copper)]' },
]

// Profile avatar color choices (settings page).
// `value` is the legacy stored format ("bg-[#XXXXXX]") — kept stable so existing
// rows in `profiles.color` continue to match the picker's current selection.
// `token` references the theme-aware CSS variable (`--profile-N`); use
// resolveProfileColor() below to map any stored value to a {bgClass, fgClass}.
export const PROFILE_COLORS = [
  { value: 'bg-[#C2D64A]', hex: '#C2D64A', token: '--profile-1' },
  { value: 'bg-[#A8BA32]', hex: '#A8BA32', token: '--profile-2' },
  { value: 'bg-[#D4A843]', hex: '#D4A843', token: '--profile-3' },
  { value: 'bg-[#C27A4A]', hex: '#C27A4A', token: '--profile-4' },
  { value: 'bg-[#A8969E]', hex: '#A8969E', token: '--profile-5' },
  { value: 'bg-[#8B7355]', hex: '#8B7355', token: '--profile-6' },
  { value: 'bg-[#7A5C44]', hex: '#7A5C44', token: '--profile-7' },
  { value: 'bg-[#E0DBD5]', hex: '#E0DBD5', token: '--profile-8' },
  { value: 'bg-[#E8E2DB]', hex: '#E8E2DB', token: '--profile-9' },
  { value: 'bg-[#8E8E89]', hex: '#8E8E89', token: '--profile-10' },
  { value: 'bg-[#5C5C57]', hex: '#5C5C57', token: '--profile-11' },
  { value: 'bg-[#1B1B18]', hex: '#1B1B18', token: '--profile-12' },
]

const PROFILE_VALUE_TO_TOKEN = new Map(PROFILE_COLORS.map((p) => [p.value, p.token]))

// Resolve a stored `profile.color` string to theme-aware Tailwind classes.
// Falls back to a neutral surface-hover swatch when no profile color is set
// or the stored value isn't in the palette (e.g. a removed legacy color).
export function resolveProfileColor(stored) {
  if (!stored) {
    return { bgClass: 'bg-[var(--surface-hover)]', fgClass: 'text-[var(--text-primary)]' }
  }
  const token = PROFILE_VALUE_TO_TOKEN.get(stored)
  if (!token) {
    return { bgClass: stored, fgClass: 'text-[var(--text-primary)]' }
  }
  return {
    bgClass: `bg-[var(${token})]`,
    fgClass: `text-[var(${token}-fg)]`,
  }
}

// Chart segment colors (dashboard pie/donut charts).
// Order encodes "lightest → darkest" — preserved across themes so legend
// position stays meaningful. SEGMENT_COLORS keeps the light palette as a
// default export for back-compat; call getSegmentColors(theme) when
// rendering charts so dark consumers get values tuned for dark surfaces.
const SEGMENT_LIGHT = ['#d2d6c5', '#a4b55b', '#8BA32E', '#7A5C44', '#5C5C57', '#3c402b', '#1B1B18']
const SEGMENT_DARK  = ['#3A4030', '#A4B55B', '#8BA32E', '#C49878', '#9C9A95', '#7A8A50', '#E8E5E0']

export const SEGMENT_COLORS = SEGMENT_LIGHT

export function getSegmentColors(theme = 'light') {
  return theme === 'dark' ? SEGMENT_DARK : SEGMENT_LIGHT
}

// Calendar priority dot colors
export const DOT_COLORS = {
  high: 'bg-[var(--color-bark)]',
  medium: 'bg-[var(--color-lime)]',
  low: 'bg-[var(--color-lime-dark)]',
}

// Calendar event left-border accent by priority
export const EVENT_ACCENT = {
  high: 'border-l-[var(--color-bark)]',
  medium: 'border-l-[var(--color-lime)]',
  low: 'border-l-[var(--color-lime-dark)]',
}
