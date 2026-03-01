import { Search, User } from 'lucide-react'
import { useState } from 'react'

export default function Header({ title }) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search tasks, notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-gray-100 border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
        />
      </div>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
        <User className="w-5 h-5 text-gray-600" />
      </div>
    </header>
  )
}
