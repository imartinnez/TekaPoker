import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Check, AlertCircle } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import Toast          from '../components/Toast'
import { getPlayers, createPlayer } from '../services/database'
import { calculateSettlements }     from '../services/calculator'

export default function NewGame() {
  const navigate = useNavigate()

  // ── State ───────────────────────────────────────────────
  const [allPlayers,    setAllPlayers]    = useState([])      // players from DB
  const [selectedIds,   setSelectedIds]   = useState(new Set()) // selected UUIDs
  const [pointsMap,     setPointsMap]     = useState({})      // { [playerId]: string }
  const [buyIn,         setBuyIn]         = useState('')
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [calculating,   setCalculating]   = useState(false)
  const [error,         setError]         = useState('')
  const [toast,         setToast]         = useState(null)

  // Add-player inline form
  const [showAddForm,   setShowAddForm]   = useState(false)
  const [newName,       setNewName]       = useState('')
  const [addingSaving,  setAddingSaving]  = useState(false)

  // ── Load players on mount ────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const data = await getPlayers()
        setAllPlayers(data)
      } catch (err) {
        setToast({ message: err.message, type: 'error' })
      } finally {
        setLoadingPlayers(false)
      }
    }
    load()
  }, [])

  // ── Toggle player selection ──────────────────────────────
  function togglePlayer(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        // Also clear their points when deselected
        setPointsMap((pm) => { const n = { ...pm }; delete n[id]; return n })
      } else {
        next.add(id)
      }
      return next
    })
    setError('')
  }

  // ── Update a player's points ─────────────────────────────
  function setPoints(id, value) {
    setPointsMap((prev) => ({ ...prev, [id]: value }))
    setError('')
  }

  // ── Add a brand-new player inline ───────────────────────
  async function handleAddPlayer() {
    if (!newName.trim()) return
    setAddingSaving(true)
    try {
      const created = await createPlayer(newName.trim())
      setAllPlayers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedIds((prev) => new Set([...prev, created.id]))
      setNewName('')
      setShowAddForm(false)
    } catch (err) {
      setToast({ message: err.message, type: 'error' })
    } finally {
      setAddingSaving(false)
    }
  }

  // ── Validation ──────────────────────────────────────────
  function validate() {
    if (!buyIn || Number(buyIn) <= 0) {
      return 'El buy-in debe ser mayor que 0.'
    }
    if (selectedIds.size < 2) {
      return 'Selecciona al menos 2 jugadores.'
    }
    for (const id of selectedIds) {
      const val = pointsMap[id]
      if (val === '' || val === undefined || isNaN(Number(val)) || Number(val) < 0) {
        const p = allPlayers.find((p) => p.id === id)
        return `Introduce los puntos finales de ${p?.name ?? 'un jugador'}.`
      }
    }
    return null
  }

  // ── Calculate and navigate to Results ───────────────────
  async function handleCalculate() {
    setError('')
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setCalculating(true)
    try {
      const selectedPlayers = allPlayers
        .filter((p) => selectedIds.has(p.id))
        .map((p) => ({ ...p, points: Number(pointsMap[p.id]) }))

      const result = calculateSettlements(selectedPlayers, Number(buyIn))

      navigate('/resultados', {
        state: {
          result,
          gameData: {
            date:        new Date().toISOString(),
            buyIn:       Number(buyIn),
            playersData: result.balances, // [{ id, name, points, finalMoney, net, avatarColor }]
          },
        },
      })
    } catch (err) {
      setError(err.message || 'Error calculando. Comprueba los datos.')
    } finally {
      setCalculating(false)
    }
  }

  const selectedList = allPlayers.filter((p) => selectedIds.has(p.id))

  return (
    <div className="page">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ── Header ─────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">Nueva partida</h1>
      </div>

      {/* ── Buy-in ────────────────────────────────────── */}
      <div className="field">
        <label className="field-label">Buy-in por jugador</label>
        <div className="input-wrap">
          <span className="input-prefix">€</span>
          <input
            className="input input-xl"
            type="number"
            inputMode="decimal"
            placeholder="10"
            value={buyIn}
            onChange={(e) => { setBuyIn(e.target.value); setError('') }}
            min="0.01"
            step="0.01"
          />
        </div>
      </div>

      {/* ── Player chips ──────────────────────────────── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="section-label">Jugadores</span>
          <span style={{ fontSize: '.75rem', color: 'var(--text-faint)' }}>
            {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
        </div>

        {loadingPlayers ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--s6)' }}>
            <LoadingSpinner size={24} />
          </div>
        ) : (
          <div className="player-chips-grid">
            {allPlayers.map((player) => {
              const isSelected = selectedIds.has(player.id)
              return (
                <button
                  key={player.id}
                  type="button"
                  className={`player-chip${isSelected ? ' selected' : ''}`}
                  onClick={() => togglePlayer(player.id)}
                >
                  <div
                    className="chip-avatar"
                    style={{ background: player.avatar_color }}
                  >
                    {player.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="chip-name">{player.name}</span>
                  {isSelected && (
                    <div className="chip-check">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Add new player inline */}
        {showAddForm ? (
          <div className="add-player-form mt-3">
            <input
              className="input"
              type="text"
              placeholder="Nombre del jugador"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              autoFocus
              maxLength={40}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddPlayer}
              disabled={addingSaving || !newName.trim()}
            >
              {addingSaving ? <LoadingSpinner size={14} /> : 'Añadir'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setShowAddForm(false); setNewName('') }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="add-player-btn mt-3"
            onClick={() => setShowAddForm(true)}
          >
            <PlusCircle size={16} />
            Añadir nuevo jugador
          </button>
        )}
      </div>

      {/* ── Points inputs for selected players ────────── */}
      {selectedList.length > 0 && (
        <div className="mb-4">
          <div className="section-label mb-3">Fichas finales</div>
          {selectedList.map((player) => (
            <div key={player.id} className="player-points-row">
              <div
                className="avatar avatar-sm"
                style={{ background: player.avatar_color, flexShrink: 0 }}
              >
                {player.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="player-points-name">{player.name}</span>
              <input
                className="input player-points-input"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={pointsMap[player.id] ?? ''}
                onChange={(e) => setPoints(player.id, e.target.value)}
                min="0"
                step="0.5"
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Error ─────────────────────────────────────── */}
      {error && (
        <div className="error-msg">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ── Sticky Calcular button ────────────────────── */}
      <div className="sticky-bar">
        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleCalculate}
          disabled={calculating}
        >
          {calculating ? (
            <>
              <LoadingSpinner size={20} />
              Calculando…
            </>
          ) : (
            'Calcular'
          )}
        </button>
      </div>
    </div>
  )
}
