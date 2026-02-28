import { useState, useRef } from 'react'
import { Download, Upload, Trash2, AlertTriangle } from 'lucide-react'

export default function SettingsPage() {
  const fileInputRef = useRef(null)
  const [importMessage, setImportMessage] = useState(null)
  const [confirmingClear, setConfirmingClear] = useState(false)

  const handleExport = () => {
    const data = {}
    const keys = ['gambit-boards', 'gambit-notes', 'gambit-settings']
    keys.forEach((key) => {
      const value = localStorage.getItem(key)
      if (value) {
        data[key] = JSON.parse(value)
      }
    })

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gambit-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        const validKeys = ['gambit-boards', 'gambit-notes', 'gambit-settings']
        let imported = 0

        validKeys.forEach((key) => {
          if (data[key]) {
            localStorage.setItem(key, JSON.stringify(data[key]))
            imported++
          }
        })

        if (imported === 0) {
          setImportMessage({ type: 'error', text: 'No valid data found in file.' })
          return
        }

        setImportMessage({
          type: 'success',
          text: `Imported ${imported} data key(s). Reloading...`,
        })
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        setImportMessage({
          type: 'error',
          text: 'Invalid JSON file. Please check the file format.',
        })
      }
    }
    reader.readAsText(file)

    // Reset file input so the same file can be selected again
    e.target.value = ''
  }

  const handleClearData = () => {
    localStorage.removeItem('gambit-boards')
    localStorage.removeItem('gambit-notes')
    localStorage.removeItem('gambit-settings')
    window.location.reload()
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your data and preferences
        </p>
      </div>

      {/* Export Data */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          Export Data
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Download all your boards, notes, and settings as a JSON backup file.
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 cursor-pointer transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Backup
        </button>
      </div>

      {/* Import Data */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          Import Data
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Restore from a previously exported JSON backup. This will replace your
          current data.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import Backup
        </button>

        {importMessage && (
          <div
            className={`mt-3 text-sm px-3 py-2 rounded-lg ${
              importMessage.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {importMessage.text}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border-2 border-red-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete all your boards, notes, and settings. This action
          cannot be undone.
        </p>

        {!confirmingClear ? (
          <button
            onClick={() => setConfirmingClear(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearData}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 cursor-pointer transition-colors"
            >
              Yes, delete everything
            </button>
            <button
              onClick={() => setConfirmingClear(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
