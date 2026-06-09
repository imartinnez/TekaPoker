import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Check, AlertCircle, ArrowRight, X } from 'lucide-react'
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
  const [buyInMap,      setBuyInMap]      = useState({})      // { [playerId]: string }
  const [buyIn,         setBuyIn]         = useState('')      // default buy-in
  const [rebuys,        setRebuys]        = useState([])      // [{ buyerId, sellerId, amount }]
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
        setPointsMap((pm) => { const n = { ...pm }; delete n[id]; return n })
        setBuyInMap((bm) => { const n = { ...bm }; delete n[id]; return n })
        // Drop any rebuy that involves this player
        setRebuys((rb) => rb.filter((r) => r.buyerId !== id && r.sellerId !== id))
      } else {
        next.add(id)
        // Pre-fill with current default buy-in
        setBuyInMap((bm) => ({ ...bm, [id]: buyIn }))
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

  // ── Update a player's individual buy-in ─────────────────
  function setPlayerBuyIn(id, value) {
    setBuyInMap((prev) => ({ ...prev, [id]: value }))
    setError('')
  }

  // ── Rebuys between players ──────────────────────────────
  function addRebuy() {
    setRebuys((prev) => [...prev, { buyerId: '', sellerId: '', amount: '' }])
    setError('')
  }
  function updateRebuy(index, field, value) {
    setRebuys((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
    setError('')
  }
  function removeRebuy(index) {
    setRebuys((prev) => prev.filter((_, i) => i !== index))
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
    if (selectedIds.size < 2) {
      return 'Selecciona al menos 2 jugadores.'
    }
    for (const id of selectedIds) {
      const p   = allPlayers.find((p) => p.id === id)
      const bv  = buyInMap[id]
      if (bv === '' || bv === undefined || isNaN(Number(bv)) || Number(bv) <= 0) {
        return `El buy-in de ${p?.name ?? 'un jugador'} debe ser mayor que 0.`
      }
      const val = pointsMap[id]
      if (val === '' || val === undefined || isNaN(Number(val)) || Number(val) < 0) {
        return `Introduce los puntos finales de ${p?.name ?? 'un jugador'}.`
      }
    }
    for (const r of rebuys) {
      if (!r.buyerId || !r.sellerId) {
        return 'Completa el comprador y el vendedor en cada recompra.'
      }
      if (r.buyerId === r.sellerId) {
        return 'En una recompra, comprador y vendedor deben ser distintos.'
      }
      if (r.amount === '' || isNaN(Number(r.amount)) || Number(r.amount) <= 0) {
        return 'El importe de cada recompra debe ser mayor que 0.'
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
        .map((p) => ({
          ...p,
          points: Number(pointsMap[p.id]),
          buyIn:  Number(buyInMap[p.id]),
        }))

      const cleanRebuys = rebuys.map((r) => ({
        buyerId:  r.buyerId,
        sellerId: r.sellerId,
        amount:   Number(r.amount),
      }))

      const result = calculateSettlements(selectedPlayers, cleanRebuys)

      // Attach readable names to each rebuy for the Results screen
      const rebuysDetailed = cleanRebuys.map((r) => ({
        ...r,
        buyerName:  allPlayers.find((p) => p.id === r.buyerId)?.name ?? '',
        sellerName: allPlayers.find((p) => p.id === r.sellerId)?.name ?? '',
      }))

      navigate('/resultados', {
        state: {
          result,
          gameData: {
            date:        new Date().toISOString(),
            buyIn:       Number(buyIn) || Number(buyInMap[selectedPlayers[0]?.id]) || 0,
            playersData: result.balances, // [{ id, name, points, buyIn, finalMoney, net, avatarColor }]
            rebuys:      rebuysDetailed,
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

      {/* ── Buy-in por defecto ──────────────────────── */}
      <div className="field">
        <label className="field-label">Buy-in por defecto</label>
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
        <span style={{ fontSize: '.75rem', color: 'var(--text-faint)' }}>
          Se aplica a los jugadores al seleccionarlos. Puedes cambiarlo individualmente abajo.
        </span>
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

      {/* ── Points + buy-in inputs for selected players ── */}
      {selectedList.length > 0 && (
        <div className="mb-4">
          <div className="section-label mb-3">Fichas finales</div>
          {selectedList.map((player) => (
            <div key={player.id} className="player-points-row" style={{ alignItems: 'flex-start' }}>
              <div
                className="avatar avatar-sm"
                style={{ background: player.avatar_color, flexShrink: 0, marginTop: 6 }}
              >
                {player.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                <span className="player-points-name">{player.name}</span>
                <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.68rem', color: 'var(--text-faint)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.05em' }}>Buy-in</div>
                    <div className="input-wrap">
                      <span className="input-prefix" style={{ fontSize: '.85rem' }}>€</span>
                      <input
                        className="input"
                        type="number"
                        inputMode="decimal"
                        placeholder={buyIn || '0'}
                        value={buyInMap[player.id] ?? ''}
                        onChange={(e) => setPlayerBuyIn(player.id, e.target.value)}
                        min="0.01"
                        step="0.01"
                        style={{ fontSize: '.9rem', padding: '6px 6px 6px 1.8rem', textAlign: 'right' }}
                      />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.68rem', color: 'var(--text-faint)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.05em' }}>Fichas</div>
                    <input
                      className="input"
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={pointsMap[player.id] ?? ''}
                      onChange={(e) => setPoints(player.id, e.target.value)}
                      min="0"
                      step="0.5"
                      style={{ fontSize: '.9rem', padding: '6px', textAlign: 'right', fontWeight: 700 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Recompras entre jugadores ─────────────────── */}
      {selectedList.length >= 2 && (
        <div className="mb-4">
          <div className="section-label mb-2">Recompras entre jugadores</div>
          <p style={{ fontSize: '.75rem', color: 'var(--text-faint)', marginBottom: 'var(--s3)' }}>
            Cuando alguien compra fichas a otro jugador (porque se acabaron las de
            la caja) y se lo paga al liquidar. No metas aquí las recompras a la
            caja: esas van como buy-in normal.
          </p>

          {rebuys.map((r, i) => (
            <div key={i} className="rebuy-row">
              <select
                className="input rebuy-select"
                value={r.buyerId}
                onChange={(e) => updateRebuy(i, 'buyerId', e.target.value)}
              >
                <option value="">Comprador…</option>
                {selectedList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

              <select
                className="input rebuy-select"
                value={r.sellerId}
                onChange={(e) => updateRebuy(i, 'sellerId', e.target.value)}
              >
                <option value="">Vendedor…</option>
                {selectedList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <div className="input-wrap rebuy-amount">
                <span className="input-prefix" style={{ fontSize: '.85rem' }}>€</span>
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={r.amount}
                  onChange={(e) => updateRebuy(i, 'amount', e.target.value)}
                  min="0.01"
                  step="0.01"
                  style={{ paddingLeft: '1.6rem', textAlign: 'right' }}
                />
              </div>

              <button
                type="button"
                className="btn-icon btn-ghost"
                onClick={() => removeRebuy(i)}
                aria-label="Eliminar recompra"
              >
                <X size={16} />
              </button>
            </div>
          ))}

          <button type="button" className="add-player-btn mt-2" onClick={addRebuy}>
            <PlusCircle size={16} />
            Añadir recompra entre jugadores
          </button>
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
