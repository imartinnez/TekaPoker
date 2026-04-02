import { useEffect } from 'react'

/**
 * Toast notification — auto-dismisses after 3 seconds.
 *
 * Props:
 *   message  {string}  — text to display
 *   type     {string}  — 'success' | 'error'
 *   onClose  {fn}      — called when the toast should be removed
 */
export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`toast toast-${type}`} role="alert" aria-live="polite">
      <span>{type === 'success' ? '✓' : '✕'}</span>
      {message}
    </div>
  )
}
