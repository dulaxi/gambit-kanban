import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import DynamicIcon, { getAllIconNames } from './DynamicIcon'

const ALL_ICONS = getAllIconNames()

// Categorize icons by keyword patterns in their names
const CATEGORIES = [
  { key: 'popular', label: 'Popular', icons: [
    'Home', 'Star', 'Heart', 'Settings', 'Search', 'User', 'Mail', 'Phone', 'Calendar',
    'Clock', 'Camera', 'Image', 'Video', 'Music', 'Mic', 'Volume2', 'Bell', 'Sun', 'Moon',
    'Cloud', 'Zap', 'Globe', 'Map', 'MapPin', 'Navigation', 'Compass', 'Flag',
    'Bookmark', 'Tag', 'Hash', 'AtSign', 'Link', 'Paperclip', 'Edit', 'Pencil',
    'FileText', 'Folder', 'Archive', 'Trash2', 'Download', 'Upload', 'Share2',
    'Send', 'MessageCircle', 'MessageSquare', 'ThumbsUp', 'ThumbsDown',
    'CheckCircle2', 'XCircle', 'AlertCircle', 'Info', 'HelpCircle',
    'Play', 'Pause', 'SkipForward', 'SkipBack', 'Repeat', 'Shuffle',
    'Eye', 'EyeOff', 'Lock', 'Unlock', 'Key', 'Shield', 'ShieldCheck',
    'Wifi', 'Bluetooth', 'Battery', 'Cpu', 'Monitor', 'Smartphone', 'Tablet',
    'Laptop', 'Watch', 'Printer', 'Save', 'Copy', 'Scissors', 'Clipboard',
    'LayoutGrid', 'LayoutList', 'Kanban', 'Table', 'Columns', 'Rows',
    'PieChart', 'BarChart3', 'TrendingUp', 'Activity', 'Target', 'Award',
    'Gift', 'ShoppingCart', 'ShoppingBag', 'CreditCard', 'DollarSign',
    'Briefcase', 'Building', 'Building2', 'Rocket', 'Plane', 'Car', 'Train',
    'Coffee', 'Utensils', 'Apple', 'Pizza', 'Cake', 'Wine',
    'Dog', 'Cat', 'Bird', 'Bug', 'Fish', 'Flower', 'TreePine',
    'Palette', 'Paintbrush', 'Pen', 'PenTool', 'Figma', 'Github', 'Code',
    'Terminal', 'Database', 'Server', 'HardDrive', 'Cog', 'Wrench', 'Hammer',
  ]},
  { key: 'arrows', label: 'Arrows', match: /^Arrow|^Move|^Undo|^Redo|^Corner|^Chevron|^Expand|^Shrink|^Maximize|^Minimize/ },
  { key: 'layout', label: 'Layout', match: /^Layout|^Grid|^Columns|^Rows|^Panel|^Sidebar|^Split|^Kanban|^Table|^Align|^Group/ },
  { key: 'files', label: 'Files & Folders', match: /^File|^Folder|^Document|^Archive|^Book|^Notebook|^Clipboard|^Note|^Sticky/ },
  { key: 'communication', label: 'Communication', match: /^Mail|^Message|^Phone|^Video|^Mic|^Volume|^Bell|^Send|^Share|^Inbox|^AtSign|^Contact|^Users/ },
  { key: 'media', label: 'Media', match: /^Image|^Camera|^Film|^Play|^Pause|^Music|^Radio|^Tv|^Screen|^Cast|^Disc|^Headphones|^Speaker/ },
  { key: 'shapes', label: 'Shapes', match: /^Circle|^Square|^Triangle|^Diamond|^Hexagon|^Octagon|^Pentagon|^Star|^Heart|^Shield|^Badge/ },
  { key: 'weather', label: 'Weather & Nature', match: /^Sun|^Moon|^Cloud|^Snowflake|^Wind|^Droplet|^Rainbow|^Umbrella|^Thermometer|^Flower|^Tree|^Leaf|^Mountain|^Wave/ },
  { key: 'travel', label: 'Travel & Transport', match: /^Plane|^Car|^Train|^Bus|^Bike|^Truck|^Ship|^Rocket|^Map|^Navigation|^Compass|^Globe|^Flag|^Tent|^Anchor/ },
  { key: 'food', label: 'Food & Drink', match: /^Coffee|^Cup|^Wine|^Beer|^Pizza|^Apple|^Cake|^Cookie|^Egg|^Utensils|^Cherry|^Grape|^Salad|^Soup/ },
  { key: 'tools', label: 'Tools & Dev', match: /^Wrench|^Hammer|^Cog|^Settings|^Terminal|^Code|^Database|^Server|^Cpu|^Bug|^Git|^Braces|^Binary|^Regex|^Variable|^Container/ },
  { key: 'people', label: 'People & Body', match: /^User|^Baby|^Person|^Hand|^Thumb|^Fingerprint|^Brain|^Bone|^Ear|^Eye|^Smile|^Frown|^Laugh|^Angry|^Annoyed|^Meh/ },
  { key: 'commerce', label: 'Commerce', match: /^Shopping|^Cart|^Store|^Credit|^Dollar|^Coins|^Banknote|^Wallet|^Receipt|^Percent|^Tag|^Barcode|^QrCode|^Package/ },
  { key: 'charts', label: 'Charts & Data', match: /^Chart|^Bar|^Pie|^Trending|^Activity|^Signal|^Gauge|^Timer|^Hourglass|^Calendar|^Clock/ },
  { key: 'security', label: 'Security', match: /^Lock|^Unlock|^Key|^Shield|^Fingerprint|^Scan|^Alert|^Siren|^Skull/ },
]

function categorizeIcons() {
  const used = new Set()
  const result = []

  for (const cat of CATEGORIES) {
    let iconNames
    if (cat.icons) {
      iconNames = cat.icons.filter((n) => ALL_ICONS.includes(n))
    } else {
      iconNames = ALL_ICONS.filter((n) => cat.match.test(n) && !used.has(n))
    }
    iconNames.forEach((n) => used.add(n))
    if (iconNames.length > 0) {
      result.push({ ...cat, icons: iconNames })
    }
  }

  const remaining = ALL_ICONS.filter((n) => !used.has(n))
  if (remaining.length > 0) {
    result.push({ key: 'other', label: 'Other', icons: remaining })
  }

  return result
}

const CATEGORIZED = categorizeIcons()

export default function IconPicker({ value, onChange, onClose }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('popular')
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const searchResults = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    return ALL_ICONS.filter((name) => name.toLowerCase().includes(q))
  }, [search])

  const currentCategory = CATEGORIZED.find((c) => c.key === activeCategory)

  const displayIcons = searchResults || (currentCategory ? currentCategory.icons : [])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Choose an icon</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all icons..."
            className="flex-1 text-sm bg-transparent border-none focus:outline-none placeholder-gray-300"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Category sidebar */}
          {!searchResults && (
            <div className="w-40 shrink-0 border-r border-gray-100 overflow-y-auto py-2">
              {CATEGORIZED.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`w-full text-left px-4 py-1.5 text-xs transition-colors ${
                    activeCategory === cat.key
                      ? 'text-gray-900 font-medium bg-gray-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {cat.label}
                  <span className="text-gray-300 ml-1">({cat.icons.length})</span>
                </button>
              ))}
            </div>
          )}

          {/* Icons grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {searchResults && (
              <p className="text-xs text-gray-400 mb-3">{searchResults.length} results for "{search}"</p>
            )}

            {/* Remove icon option */}
            {value && (
              <button
                type="button"
                onClick={() => { onChange(null); onClose() }}
                className="mb-3 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Remove icon
              </button>
            )}

            <div className="grid grid-cols-10 gap-1">
              {displayIcons.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onChange(name); onClose() }}
                  title={name}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
                    value === name
                      ? 'bg-blue-50 text-blue-500 ring-1 ring-blue-200'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <DynamicIcon name={name} className="w-5 h-5" />
                </button>
              ))}
            </div>

            {displayIcons.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No icons found</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-300">{ALL_ICONS.length} icons available</span>
          <button type="button" onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-100">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
