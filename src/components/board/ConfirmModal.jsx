import { useRef } from 'react'
import { Warning } from '@phosphor-icons/react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

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
          <div className="w-9 h-9 rounded-full bg-[var(--color-copper-wash)] flex items-center justify-center shrink-0">
            <Warning className="w-5 h-5 text-[var(--color-copper)]" />
          </div>
          <h3 id="confirm-title" className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        <p id="confirm-message" className="text-sm text-[var(--text-secondary)] mb-5 ml-12">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button ref={confirmRef} variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  )
}
