import { icons } from 'lucide-react'

export default function DynamicIcon({ name, className = 'w-4 h-4', ...props }) {
  const IconComponent = icons[name]
  if (!IconComponent) return null
  return <IconComponent className={className} {...props} />
}

export function getAllIconNames() {
  return Object.keys(icons)
}
