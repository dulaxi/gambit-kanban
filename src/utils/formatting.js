export const LABEL_BG = {
  red: 'bg-[#F2D9C7] text-[#8B5A33]',
  blue: 'bg-[#DAE0F0] text-[#4A5578]',
  green: 'bg-[#EEF2D6] text-[#6B7A12]',
  yellow: 'bg-[#F5EDCF] text-[#8B7322]',
  purple: 'bg-[#E8DDE2] text-[#6E5A65]',
  pink: 'bg-[#F0E0D2] text-[#7A5C44]',
  gray: 'bg-[#E8E2DB] text-[#5C5C57]',
}

export const PRIORITY_DOT = {
  low: 'bg-[#A8BA32]',
  medium: 'bg-[#D4A843]',
  high: 'bg-[#C27A4A]',
}

export const AVATAR_COLORS = [
  'bg-[#E8E2DB]',
  'bg-[#EEF2D6]',
  'bg-[#E8DDE2]',
  'bg-[#F2D9C7]',
  'bg-[#F5EDCF]',
  'bg-[#DAE0F0]',
  'bg-[#D6E8E0]',
]

export function getAvatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
