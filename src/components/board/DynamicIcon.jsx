import { memo } from 'react'

// Convert legacy PascalCase lucide names (e.g. "MapPin") to kebab-case ("map-pin")
// so existing board/card icons stored in Supabase still render via Phosphor.
function toKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/\d+$/, '') // strip trailing digits: Trash2 → trash, Building2 → building
}

function isKebab(name) {
  return name.includes('-') || name === name.toLowerCase()
}

export default memo(function DynamicIcon({ name, className = 'w-4 h-4', ...props }) {
  if (!name) return null

  // Normalize: if PascalCase (legacy lucide/material name), convert to kebab
  const iconName = isKebab(name) ? name : toKebab(name)

  // Parse Tailwind size class to px (w-4 = 16px, w-5 = 20px, etc.)
  const sizeMatch = className.match(/w-(\d+(?:\.\d+)?)/)
  const sizePx = sizeMatch ? parseFloat(sizeMatch[1]) * 4 : 16

  return (
    <i
      className={`ph ph-${iconName}`}
      style={{
        fontSize: `${sizePx}px`,
        lineHeight: `${sizePx}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        flexShrink: 0,
      }}
      {...props}
    />
  )
})
