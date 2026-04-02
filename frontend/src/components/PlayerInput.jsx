import { Trash2 } from 'lucide-react'

/**
 * A single player row in the New Game form.
 * Shows name input, points input, and a delete button.
 */
export default function PlayerInput({ player, index, onChange, onRemove, canRemove }) {
  return (
    <div className="player-row">
      {/* Player number indicator */}
      <span style={{ color: 'var(--text-faint)', fontSize: '.8rem', fontWeight: 700, minWidth: 18 }}>
        {index + 1}
      </span>

      {/* Name */}
      <input
        className="input player-name-input"
        type="text"
        placeholder={`Player ${index + 1}`}
        value={player.name}
        onChange={(e) => onChange(player.id, 'name', e.target.value)}
        maxLength={30}
        autoComplete="off"
      />

      {/* Divider */}
      <div className="player-row-divider" />

      {/* Final points */}
      <input
        className="input player-points-input"
        type="number"
        placeholder="pts"
        value={player.points}
        onChange={(e) => onChange(player.id, 'points', e.target.value)}
        min="0"
        step="1"
        inputMode="numeric"
      />

      {/* Remove button */}
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        onClick={() => onRemove(player.id)}
        disabled={!canRemove}
        aria-label="Remove player"
        style={{ color: canRemove ? 'var(--red)' : 'var(--text-faint)', marginLeft: 4 }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
