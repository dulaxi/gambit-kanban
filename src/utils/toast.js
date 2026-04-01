import toast from 'react-hot-toast'
import { createElement } from 'react'

const BASE = {
  fontFamily: "'SF Mono', SFMono-Regular, Menlo, monospace",
  fontSize: '12px',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 4px 24px rgba(27,27,24,0.10)',
  width: '420px',
  maxWidth: '420px',
  border: '1px solid #1B1B18',
}

function materialIcon(name, color) {
  return createElement('span', {
    className: 'material-symbols-outlined',
    style: {
      fontSize: '18px',
      lineHeight: '18px',
      flexShrink: 0,
      fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24",
      color,
    },
  }, name)
}

function dismissBtn(id, color) {
  return createElement('button', {
    onClick: () => toast.dismiss(id),
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      marginLeft: 'auto',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      opacity: 0.7,
    },
    onMouseEnter: (e) => { e.currentTarget.style.opacity = 1 },
    onMouseLeave: (e) => { e.currentTarget.style.opacity = 0.7 },
  }, materialIcon('cancel', color))
}

function render(message, iconName, colors, t) {
  return createElement('div', {
    style: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%' },
  },
    materialIcon(iconName, colors.color),
    createElement('span', { style: { flex: 1, textAlign: 'left' } }, message),
    dismissBtn(t.id, colors.color),
  )
}

function make(iconName, bg, color, duration) {
  const colors = { color }
  return (message, opts) =>
    toast((t) => render(message, iconName, colors, t), {
      duration,
      ...opts,
      style: { ...BASE, background: bg, color },
    })
}

export const showToast = {
  success: make('check_circle', '#C2D64A', '#1B1B18', 3000),
  error:   make('error',        '#C27A4A', '#FAF8F6', 4000),
  delete:  make('delete',       '#C27A4A', '#FAF8F6', 5000),
  archive: make('archive',      '#A8969E', '#E8DDE2', 3000),
  restore: make('undo',         '#C2D64A', '#1B1B18', 3000),
  info:    make('info',         '#FAF8F6', '#5C5C57', 3000),
  warn:    make('warning',      '#D4A843', '#1B1B18', 4000),
  overdue: make('alarm',        '#C27A4A', '#FAF8F6', 5000),
}
