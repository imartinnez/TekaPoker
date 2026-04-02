/**
 * Inline loading spinner.
 * Pass `size` in px; defaults to 20.
 */
export default function LoadingSpinner({ size = 20 }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  )
}
