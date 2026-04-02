import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Trash2, ArrowRight } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import ConfirmDialog  from '../components/ConfirmDialog'
import Toast          from '../components/Toast'
import { getGames, deleteGame } from '../services/database'

export default function History() {
  const [games,        setGames]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [expanded,     setExpanded]     = useState(null)  // id of expanded game
  const [deleteTarget, setDeleteTarget] = useState(null)  // id of game to delete
  const [toast,        setToast]        = useState(null)

  useEffect(() => { loadGames() }, [])

  async function loadGames() {
    try {
      const data = await getGames()
      setGames(data)
    } catch (err) {
      setToast({ message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteConfirm() {
    try {
      await deleteGame(deleteTarget)
      setGames((prev) => prev.filter((g) => g.id !== deleteTarget))
      if (expanded === deleteTarget) setExpanded(null)
      setDeleteTarget(null)
      setToast({ message: 'Partida eliminada', type: 'success' })
    } catch (err) {
      setDeleteTarget(null)
      setToast({ message: err.message, type: 'error' })
    }
  }

  function toggleExpand(id) {
    setExpanded((prev) => (prev === id ? null : id))
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Historial</h1>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--s8)' }}>
          <LoadingSpinner size={28} />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ── Header ─────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">Historial</h1>
        {games.length > 0 && (
          <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
            {games.length} {games.length === 1 ? 'partida' : 'partidas'}
          </span>
        )}
      </div>

      {/* ── Empty state ─────────────────────────────────── */}
      {games.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📖</div>
          <div className="empty-title">No hay partidas aún</div>
          <div className="empty-desc">
            Después de calcular los resultados, pulsa "Guardar partida" para que aparezcan aquí.
          </div>
        </div>
      ) : (
        games.map((game) => {
          const isOpen  = expanded === game.id
          const date    = new Date(game.played_at).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'short', year: 'numeric',
          })
          const pot = (game.buy_in * game.total_players).toFixed(0)

          // Sort game_players by net descending
          const sortedGP = [...(game.game_players || [])].sort(
            (a, b) => parseFloat(b.net) - parseFloat(a.net)
          )

          return (
            <div key={game.id} className="history-card">
              {/* ── Header row ─────────────────────────── */}
              <div
                className="history-card-header"
                onClick={() => toggleExpand(game.id)}
                role="button"
                aria-expanded={isOpen}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="history-card-title">
                    {date}
                  </div>
                  <div className="history-card-meta">
                    {game.total_players} jugadores · €{game.buy_in} buy-in · €{pot} bote
                  </div>
                </div>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </div>

              {/* ── Expanded detail ─────────────────────── */}
              {isOpen && (
                <div className="history-card-body">
                  {/* Balances */}
                  <div className="section-label mb-3">Resultados</div>
                  {sortedGP.map((gp) => {
                    const net    = parseFloat(gp.net)
                    const isWin  = net > 0.01
                    const isLoss = net < -0.01
                    return (
                      <div
                        key={gp.id}
                        className={`balance-row ${isWin ? 'balance-row--win' : isLoss ? 'balance-row--lose' : 'balance-row--even'}`}
                      >
                        <div
                          className="avatar avatar-sm"
                          style={{ background: gp.player?.avatar_color || '#4ade80', flexShrink: 0 }}
                        >
                          {(gp.player?.name ?? '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="balance-name" style={{ flex: 1 }}>
                          {gp.player?.name ?? '—'}
                        </div>
                        <div className={`balance-net balance-net--${isWin ? 'win' : isLoss ? 'lose' : 'even'}`}>
                          {isWin ? '+' : isLoss ? '−' : ''}€{Math.abs(net).toFixed(2)}
                        </div>
                      </div>
                    )
                  })}

                  {/* Transactions */}
                  {game.transactions?.length > 0 && (
                    <>
                      <div className="divider-text">Pagos</div>
                      {game.transactions.map((tx) => (
                        <div key={tx.id} className="transaction-row">
                          <span className="tx-from">{tx.from_player?.name ?? '—'}</span>
                          <ArrowRight size={14} className="tx-arrow" />
                          <span className="tx-to">{tx.to_player?.name ?? '—'}</span>
                          <span className="tx-amount">€{parseFloat(tx.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Delete action */}
                  <div className="history-actions">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteTarget(game.id)}
                    >
                      <Trash2 size={14} />
                      Eliminar partida
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}

      {/* ── Confirm delete ──────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDialog
          title="¿Eliminar esta partida?"
          description="¿Seguro que quieres eliminar esta partida? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
