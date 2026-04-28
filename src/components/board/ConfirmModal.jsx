import { useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from '../ui/Modal'

export default function ConfirmModal({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  const confirmRef = useRef(null)

  return (
    <Modal
      open
      onClose={onCancel}
      role="alertdialog"
      ariaLabelledBy="confirm-title"
      ariaDescribedBy="confirm-message"
      initialFocusRef={confirmRef}
    >
      <div
        className="bg-[var(--surface-card)] rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-bark-wash)] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-[var(--color-bark)]" />
          </div>
          <h3 id="confirm-title" className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        <p id="confirm-message" className="text-sm text-[var(--text-secondary)] mb-5 ml-12">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-bark)] hover:bg-[var(--color-bark-dark)] rounded-lg transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
