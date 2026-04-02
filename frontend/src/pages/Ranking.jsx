import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import Toast          from '../components/Toast'
import { getGlobalRanking } from '../services/database'

export default function Ranking() {
  const navigate = useNavigate()

  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getGlobalRanking()
        setRanking(data)
      } catch (err) {
        setToast({ message: err.message, type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Ranking</h1>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--s8)' }}>
          <LoadingSpinner size={28} />
        </div>
      </div>
    )
  }

  // Only players who have played at least one game
  const playersWithGames = ranking.filter((p) => p.totalGames > 0)

  return (
    <div className="page">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="page-header">
        <h1 className="page-title">Ranking</h1>
        {playersWithGames.length > 0 && (
          <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
            {playersWithGames.length} jugadores
          </span>
        )}
      </div>

      {playersWithGames.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <div className="empty-title">No hay datos aún</div>
          <div className="empty-desc">
            Guarda partidas completadas y el ranking aparecerá aquí.
          </div>
        </div>
      ) : (
        <>
          {/* ── Podium (top 3) ─────────────────────────── */}
          {playersWithGames.length >= 2 && (
            <div className="podium mb-6">
              {/* 2nd — left */}
              {playersWithGames[1] && (
                <PodiumItem player={playersWithGames[1]} rank={2} onClick={() => navigate(`/jugador/${playersWithGames[1].id}`)} />
              )}
              {/* 1st — centre (tallest) */}
              {playersWithGames[0] && (
                <PodiumItem player={playersWithGames[0]} rank={1} onClick={() => navigate(`/jugador/${playersWithGames[0].id}`)} />
              )}
              {/* 3rd — right */}
              {playersWithGames[2] && (
                <PodiumItem player={playersWithGames[2]} rank={3} onClick={() => navigate(`/jugador/${playersWithGames[2].id}`)} />
              )}
            </div>
          )}

          {/* ── Full leaderboard ───────────────────────── */}
          <div className="section-label mb-3">Clasificación completa</div>

          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr 52px 52px 60px',
              gap: '8px',
              padding: '0 var(--s4) var(--s2)',
              fontSize: '.68rem',
              color: 'var(--text-faint)',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
            }}
          >
            <span>#</span>
            <span>Jugador</span>
            <span style={{ textAlign: 'center' }}>PJ</span>
            <span style={{ textAlign: 'center' }}>Win%</span>
            <span style={{ textAlign: 'right' }}>Total</span>
          </div>

          {playersWithGames.map((player, index) => (
            <button
              key={player.id}
              className="rank-row rank-row--clickable"
              onClick={() => navigate(`/jugador/${player.id}`)}
            >
              {/* Position */}
              <span className="rank-pos">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </span>

              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flex: 1, minWidth: 0 }}>
                <div
                  className="avatar avatar-sm"
                  style={{ background: player.avatarColor, flexShrink: 0 }}
                >
                  {player.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="rank-name">{player.name}</div>
                  <div className="rank-games">
                    Ø €{player.avgNet >= 0 ? '+' : ''}{player.avgNet.toFixed(2)}/partida
                  </div>
                </div>
              </div>

              {/* Games played */}
              <span style={{ textAlign: 'center', fontSize: '.85rem', color: 'var(--text-muted)', width: 52 }}>
                {player.totalGames}
              </span>

              {/* Win rate */}
              <span style={{ textAlign: 'center', fontSize: '.85rem', color: 'var(--text-muted)', width: 52 }}>
                {player.winRate.toFixed(0)}%
              </span>

              {/* Net */}
              <span
                className="rank-net"
                style={{
                  color:  player.totalNet > 0 ? 'var(--green)'
                        : player.totalNet < 0 ? 'var(--red)'
                        : 'var(--neutral)',
                  width: 60,
                  textAlign: 'right',
                }}
              >
                {player.totalNet > 0 ? '+' : ''}€{player.totalNet.toFixed(2)}
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}

// ── Podium item ────────────────────────────────────────────
function PodiumItem({ player, rank, onClick }) {
  const isFirst = rank === 1
  return (
    <div className="podium-item" style={{ cursor: 'pointer' }} onClick={onClick}>
      {isFirst && <span style={{ fontSize: '1.1rem', marginBottom: 2 }}>👑</span>}
      <div
        className={`podium-avatar podium-avatar--${rank}`}
        style={{ background: `${player.avatarColor}22`, borderColor: player.avatarColor, color: player.avatarColor }}
      >
        {player.name.slice(0, 2).toUpperCase()}
      </div>
      <span className="podium-name" style={{ maxWidth: 72, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {player.name.split(' ')[0]}
      </span>
      <span className={`podium-net podium-net--${rank}`}>
        {player.totalNet > 0 ? '+' : ''}€{player.totalNet.toFixed(2)}
      </span>
      <div className={`podium-block podium-block--${rank}`} />
    </div>
  )
}
