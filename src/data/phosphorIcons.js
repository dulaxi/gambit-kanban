// Sources Phosphor's full icon metadata (~1,500 icons with tags +
// categories) from `@phosphor-icons/core`. The CDN-loaded
// `@phosphor-icons/web` CSS classes (`ph ph-{name}`) render every one of
// these names, so DynamicIcon Just Works™ — this file only exists to
// power the IconPicker.
import { icons as RAW_ICONS, IconCategory } from '@phosphor-icons/core'

// Friendly labels for the IconCategory values (which are lowercase
// human strings like 'maps & travel'). Order is the chip-row order.
const CATEGORY_LABEL = {
  [IconCategory.ARROWS]: 'Arrows',
  [IconCategory.SYSTEM]: 'System',
  [IconCategory.COMMUNICATION]: 'Communication',
  [IconCategory.OFFICE]: 'Office',
  [IconCategory.EDITOR]: 'Editor',
  [IconCategory.DESIGN]: 'Design',
  [IconCategory.MEDIA]: 'Media',
  [IconCategory.PEOPLE]: 'People',
  [IconCategory.OBJECTS]: 'Objects',
  [IconCategory.COMMERCE]: 'Commerce',
  [IconCategory.FINANCE]: 'Finance',
  [IconCategory.MAP]: 'Maps',
  [IconCategory.NATURE]: 'Nature',
  [IconCategory.WEATHER]: 'Weather',
  [IconCategory.HEALTH]: 'Health',
  [IconCategory.DEVELOPMENT]: 'Development',
  [IconCategory.GAMES]: 'Games',
  [IconCategory.BRAND]: 'Brands',
}
const CATEGORY_ORDER = Object.keys(CATEGORY_LABEL)

// Hand-picked "Popular" — surfaces the icons people reach for most so
// the default grid feels useful without scrolling.
const POPULAR_NAMES = [
  'house', 'star', 'heart', 'gear', 'magnifying-glass', 'user', 'envelope', 'phone',
  'calendar-blank', 'clock', 'camera', 'image', 'video-camera', 'music-note',
  'microphone', 'speaker-high', 'bell', 'sun', 'moon', 'cloud', 'lightning',
  'globe', 'map-pin', 'compass', 'flag', 'bookmark', 'tag',
  'hash', 'at', 'link', 'paperclip', 'pencil-simple', 'file-text', 'folder',
  'archive', 'trash', 'download', 'upload', 'share-network', 'paper-plane-tilt',
  'chat-circle', 'chat-text', 'thumbs-up', 'thumbs-down', 'check-circle', 'x-circle',
  'warning-circle', 'info', 'question', 'play', 'pause', 'eye', 'lock', 'key',
  'shield', 'wifi-high', 'cpu', 'monitor', 'device-mobile', 'laptop', 'printer',
  'floppy-disk', 'copy', 'clipboard', 'squares-four', 'list', 'kanban', 'table',
  'chart-pie', 'chart-bar', 'trend-up', 'target', 'trophy', 'gift', 'shopping-cart',
  'credit-card', 'currency-dollar', 'briefcase', 'buildings', 'rocket', 'airplane',
  'car', 'coffee', 'fork-knife', 'cake', 'wine', 'dog', 'cat', 'bird', 'bug',
  'flower', 'tree', 'palette', 'paint-brush', 'pen', 'pen-nib', 'figma-logo',
  'github-logo', 'code', 'terminal', 'database', 'hard-drives', 'wrench', 'hammer',
  'sparkle', 'fire', 'robot', 'brain', 'lightbulb', 'crown', 'diamond',
  'push-pin', 'smiley', 'hand-waving', 'strategy', 'notebook', 'book-open',
]

// Build category groups. Each icon may belong to multiple categories;
// we list it under each (matches phosphor.com behavior).
const CATEGORY_GROUPS = CATEGORY_ORDER.map((catKey) => ({
  key: catKey,
  label: CATEGORY_LABEL[catKey],
  icons: RAW_ICONS
    .filter((ic) => ic.categories.includes(catKey))
    .map((ic) => ic.name),
}))

export const PHOSPHOR_CATEGORIES = [
  { key: 'popular', label: 'Popular', icons: POPULAR_NAMES },
  ...CATEGORY_GROUPS,
]

export const ALL_PHOSPHOR_ICONS = RAW_ICONS.map((ic) => ic.name)

// Pre-built lower-case haystack per icon for tag-aware search:
//   "trash"  matches Trash + Bin (alias)
//   "delete" matches Trash via tag
//   "send"   matches PaperPlane via tag
// Done once at module load — search itself is then a tight string scan.
export const PHOSPHOR_SEARCH_INDEX = RAW_ICONS.map((ic) => ({
  name: ic.name,
  haystack: [
    ic.name,
    ic.pascal_name,
    ...(ic.alias ? [ic.alias.name] : []),
    ...ic.tags,
  ].join(' ').toLowerCase(),
}))

export function searchPhosphor(query) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  // Multi-token AND: "send mail" matches icons whose haystack has both.
  const tokens = q.split(/\s+/)
  return PHOSPHOR_SEARCH_INDEX
    .filter(({ haystack }) => tokens.every((t) => haystack.includes(t)))
    .map(({ name }) => name)
}
