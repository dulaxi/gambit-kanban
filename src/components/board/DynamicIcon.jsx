import { icons } from 'lucide-react'
import { MATERIAL_ICON_NAMES } from '../../data/materialSymbolsIcons'

const materialSet = new Set(MATERIAL_ICON_NAMES)
const lucideNames = Object.keys(icons)

export default function DynamicIcon({ name, className = 'w-4 h-4', ...props }) {
  if (!name) return null

  // Try lucide first
  const IconComponent = icons[name]
  if (IconComponent) return <IconComponent className={className} {...props} />

  // Try material symbols
  if (materialSet.has(name)) {
    const sizeMatch = className.match(/w-(\d+(?:\.\d+)?)/)
    const sizePx = sizeMatch ? parseFloat(sizeMatch[1]) * 4 : 16
    return (
      <span
        className={`material-symbols-outlined ${className}`}
        style={{
          fontSize: `${sizePx}px`,
          lineHeight: `${sizePx}px`,
          display: 'block',
          textAlign: 'center',
          flexShrink: 0,
          fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' ${sizePx}`,
          overflow: 'hidden',
        }}
        {...props}
      >
        {name}
      </span>
    )
  }

  return null
}

export function getAllIconNames(library = 'all') {
  if (library === 'lucide') return lucideNames
  if (library === 'material') return MATERIAL_ICON_NAMES
  return [...lucideNames, ...MATERIAL_ICON_NAMES]
}
