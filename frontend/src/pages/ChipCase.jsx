import { useState, useEffect } from 'react'
import { PlusCircle, X, Save, Calculator, AlertCircle } from 'lucide-react'
import Toast from '../components/Toast'
import { loadChipCase, saveChipCase, newChipId, distributeChips } from '../services/chipCase'

const PALETTE = ['#e5e7eb', '#f87171', '#60a5fa', '#4ade80', '#fbbf24', '#a78bfa', '#fb923c', '#1f2937']

export default function ChipCase() {
  const [chips, setChips] = useState([])
  const [toast, setToast] = useState(null)

  // Distributor inputs
  const [buyIn,   setBuyIn]   = useState('10')
  const [players, setPlayers] = useState('5')

  useEffect(() => { setChips(loadChipCase()) }, [])

  function updateChip(id, field, value) {
    setChips((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }
  function addChip() {
    setChips((prev) => [
      ...prev,
      { id: newChipId(), label: 'Nueva', color: PALETTE[prev.length % PALETTE.length], value: 1, count: 50 },
    ])
  }
  function removeChip(id) {
    setChips((prev) => prev.filter((c) => c.id !== id))
  }
  function handleSave() {
    const clean = chips.map((c) => ({
      ...c,
      value: Number(c.value) || 0,
      count: Math.max(0, Math.floor(Number(c.count) || 0)),
      label: (c.label || '').trim() || 'Ficha',
    }))
    setChips(clean)
    saveChipCase(clean)
    setToast({ message: 'Caja de fichas guardada.', type: 'success' })
  }

  const result = distributeChips(chips, buyIn, players)

  return (
    <div className="page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1 className="page-title">Caja de fichas</h1>
      </div>

      <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: 'var(--s5)' }}>
        Las fichas valen <strong>puntos</strong>, no euros. Se reparten a partes iguales
        entre los jugadores y el buy-in determina cuánto vale cada punto.
      </p>

      {/* ── Chip configuration ─────────────────────────── */}
      <div className="section-label mb-3">Tus fichas (valor en puntos)</div>

      <div className="chip-config-head">
        <span style={{ flex: 1 }}>Color / nombre</span>
        <span style={{ width: 70, textAlign: 'right' }}>Puntos</span>
        <span style={{ width: 64, textAlign: 'right' }}>Cantidad</span>
        <span style={{ width: 32 }} />
      </div>

      {chips.map((c) => (
        <div key={c.id} className="chip-config-row">
          <div className="chip-color-wrap">
            <span className="chip-dot" style={{ background: c.color }} />
            <select
              className="chip-color-select"
              value={c.color}
              onChange={(e) => updateChip(c.id, 'color', e.target.value)}
              aria-label="Color"
            >
              {PALETTE.map((col) => <option key={col} value={col}>{col}</option>)}
            </select>
            <input
              className="input"
              type="text"
              value={c.label}
              onChange={(e) => updateChip(c.id, 'label', e.target.value)}
              maxLength={20}
              style={{ flex: 1 }}
            />
          </div>
          <input
            className="input chip-num"
            type="number"
            inputMode="numeric"
            value={c.value}
            onChange={(e) => updateChip(c.id, 'value', e.target.value)}
            min="0" step="1"
          />
          <input
            className="input chip-num"
            type="number"
            inputMode="numeric"
            value={c.count}
            onChange={(e) => updateChip(c.id, 'count', e.target.value)}
            min="0" step="1"
            style={{ width: 64 }}
          />
          <button className="btn-icon btn-ghost" onClick={() => removeChip(c.id)} aria-label="Eliminar">
            <X size={16} />
          </button>
        </div>
      ))}

      <button type="button" className="add-player-btn mt-2" onClick={addChip}>
        <PlusCircle size={16} /> Añadir tipo de ficha
      </button>

      <div className="flex justify-end mt-4">
        <button className="btn btn-primary btn-sm" onClick={handleSave}>
          <Save size={15} /> Guardar
        </button>
      </div>

      {/* ── Distributor ────────────────────────────────── */}
      <div className="divider" />
      <div className="section-label mb-3">
        <Calculator size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
        Reparto por jugador
      </div>

      <div className="flex" style={{ gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label className="field-label">Buy-in (€)</label>
          <input
            className="input" type="number" inputMode="decimal"
            value={buyIn} onChange={(e) => setBuyIn(e.target.value)} min="0" step="0.5"
          />
        </div>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label className="field-label">Nº jugadores</label>
          <input
            className="input" type="number" inputMode="numeric"
            value={players} onChange={(e) => setPlayers(e.target.value)} min="1" step="1"
          />
        </div>
      </div>

      {!result.ok ? (
        <div className="error-msg">
          <AlertCircle size={16} />
          {result.reason === 'config'
            ? 'Configura al menos una ficha con valor en puntos y cantidad.'
            : 'Introduce un buy-in y un número de jugadores válidos.'}
        </div>
      ) : (
        <>
          {/* Equivalence summary */}
          <div className="chip-summary mb-4">
            <div className="chip-summary-item">
              <div className="chip-summary-val">{result.pointsPerPlayer}</div>
              <div className="chip-summary-label">puntos / jugador</div>
            </div>
            <div className="chip-summary-item">
              <div className="chip-summary-val" style={{ color: 'var(--gold)' }}>
                €{result.valuePerPoint.toFixed(4)}
              </div>
              <div className="chip-summary-label">valor por punto</div>
            </div>
            <div className="chip-summary-item">
              <div className="chip-summary-val" style={{ color: 'var(--green)' }}>
                €{result.stackValue.toFixed(2)}
              </div>
              <div className="chip-summary-label">stack = buy-in</div>
            </div>
          </div>

          <div className="section-label mb-2" style={{ fontSize: '.65rem' }}>Cada jugador recibe</div>
          {result.rows.filter((r) => r.perPlayer > 0).map((r) => (
            <div key={r.id} className="chip-result-row">
              <span className="chip-dot" style={{ background: r.color }} />
              <span style={{ flex: 1, fontWeight: 600 }}>{r.label}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{r.value} pts c/u</span>
              <span className="chip-result-count">×{r.perPlayer}</span>
              <span style={{ fontSize: '.78rem', color: 'var(--text-faint)', minWidth: 56, textAlign: 'right' }}>
                {r.points} pts
              </span>
            </div>
          ))}

          {result.rows.every((r) => r.perPlayer === 0) && (
            <div className="error-msg">
              <AlertCircle size={16} />
              No hay fichas suficientes para repartir entre {players} jugadores. Añade más fichas o reduce jugadores.
            </div>
          )}

          <div className="section-label mb-2 mt-4" style={{ fontSize: '.65rem' }}>
            Reserva que queda en la caja (para recompras)
          </div>
          {result.rows.map((r) => (
            <div key={r.id} className="chip-reserve-row">
              <span className="chip-dot" style={{ background: r.color }} />
              <span style={{ flex: 1 }}>{r.label}</span>
              <span style={{
                fontWeight: 700,
                color: r.reserve === 0 ? 'var(--neutral)' : 'var(--green)',
              }}>
                {r.reserve}
              </span>
              <span style={{ fontSize: '.75rem', color: 'var(--text-faint)' }}>restantes</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
