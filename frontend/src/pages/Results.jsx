import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowUpCircle, ArrowDownCircle, MinusCircle, ArrowRight, Save, Clock } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import Toast          from '../components/Toast'
import { saveGame }   from '../services/database'

// Format euros with 2 decimal places
const fmt = (n) => `€${Math.abs(n).toFixed(2)}`

export default function Results() {
  const location = useLocation()
  const navigate  = useNavigate()

  // Data passed via router state from NewGame.jsx
  const { result, gameData } = location.state || {}

  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [toast,   setToast]   = useState(null)

  // Guard: user navigated here directly without data
  if (!result || !gameData) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">🃏</div>
          <div className="empty-title">Sin resultados</div>
          <div className="empty-desc">Empieza una nueva partida primero.</div>
          <Link to="/nueva" className="btn btn-primary mt-4" style={{ display: 'inline-flex' }}>
            Nueva partida
          </Link>
        </div>
      </div>
    )
  }

  const { balances, transactions } = result

  // Show winners first, then losers
  const sortedBalances = [...balances].sort((a, b) => b.net - a.net)

  const gameDate = new Date(gameData.date).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const totalPot = (gameData.buyIn * gameData.playersData.length).toFixed(2)

  // ── Save to Supabase ──────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      await saveGame({
        buyIn:        gameData.buyIn,
        playersData:  gameData.playersData, // [{ id, name, points, finalMoney, net }]
        transactions: result.transactions,   // [{ fromId, toId, amount }]
      })
      setSaved(true)
      setToast({ message: '¡Partida guardada correctamente!', type: 'success' })
    } catch (err) {
      setToast({ message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ── Game summary ───────────────────────────────── */}
      <div className="game-meta">
        <div className="game-meta-title">Resultados de la partida</div>
        <div className="game-meta-sub">
          {gameDate}
        </div>
        <div className="game-meta-sub" style={{ marginTop: 4 }}>
          {gameData.playersData.length} jugadores · €{gameData.buyIn} buy-in · €{totalPot} bote
        </div>
      </div>

      {/* ── Balances ───────────────────────────────────── */}
      <div className="section-label mb-3">Resultados por jugador</div>
      {sortedBalances.map((b) => {
        const isWin  = b.net > 0.01
        const isLoss = b.net < -0.01

        return (
          <div
            key={b.id}
            className={`balance-row ${isWin ? 'balance-row--win' : isLoss ? 'balance-row--lose' : 'balance-row--even'}`}
          >
            {/* Avatar */}
            <div
              className="avatar avatar-sm"
              style={{ background: b.avatarColor, flexShrink: 0 }}
            >
              {b.name.slice(0, 2).toUpperCase()}
            </div>

            {/* Name + points */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="balance-name">{b.name}</div>
              <div className="balance-points">{b.points} pts → €{b.finalMoney.toFixed(2)}</div>
            </div>

            {/* Direction icon */}
            {isWin  && <ArrowUpCircle   size={18} color="var(--green)" />}
            {isLoss && <ArrowDownCircle size={18} color="var(--red)"   />}
            {!isWin && !isLoss && <MinusCircle size={18} color="var(--neutral)" />}

            {/* Net */}
            <div className={`balance-net balance-net--${isWin ? 'win' : isLoss ? 'lose' : 'even'}`}>
              {isWin ? '+' : isLoss ? '−' : ''}{fmt(b.net)}
            </div>
          </div>
        )
      })}

      {/* ── Settlements ────────────────────────────────── */}
      {transactions.length > 0 ? (
        <>
          <div className="divider-text" style={{ marginTop: 'var(--s6)' }}>
            Quién paga a quién
          </div>
          {transactions.map((tx, i) => (
            <div key={i} className="transaction-row">
              <span className="tx-from">{tx.fromName}</span>
              <ArrowRight size={16} className="tx-arrow" />
              <span className="tx-to">{tx.toName}</span>
              <span className="tx-amount">€{tx.amount.toFixed(2)}</span>
            </div>
          ))}
        </>
      ) : (
        <div className="divider-text" style={{ marginTop: 'var(--s6)' }}>
          ¡Nadie debe nada — todos empataron!
        </div>
      )}

      {/* ── Actions ────────────────────────────────────── */}
      <div className="results-actions">
        {!saved ? (
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <LoadingSpinner size={16} /> : <Save size={16} />}
            Guardar partida
          </button>
        ) : (
          <button
            className="btn btn-secondary flex-1"
            onClick={() => navigate('/historial')}
          >
            <Clock size={16} />
            Ver historial
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/nueva')}
        >
          Nueva partida
        </button>
      </div>
    </div>
  )
}
