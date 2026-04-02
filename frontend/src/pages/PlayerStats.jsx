import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { ChevronLeft } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import ConfirmDialog  from '../components/ConfirmDialog'
import Toast          from '../components/Toast'
import { supabase }   from '../services/supabase'
import { getPlayerStats, deletePlayer } from '../services/database'

// Helper: format sign + euros
const fmtNet = (n) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}€${Math.abs(n).toFixed(2)}`

// Small stat card used in the 2-column grid
function StatCard({ icon, label, value, color }) {
  const colorMap = { green: 'var(--green)', red: 'var(--red)', neutral: 'var(--text-2)' }
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value" style={{ color: colorMap[color] ?? 'var(--text-2)', fontSize: '1.2rem' }}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

// Custom tooltip for recharts
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px', fontSize: '.85rem',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{d.dateLabel}</div>
      <div style={{ fontWeight: 700, color: d.net >= 0 ? 'var(--green)' : 'var(--red)' }}>
        {fmtNet(d.net)}
      </div>
    </div>
  )
}

export default function PlayerStats() {
  const { id }    = useParams()
  const navigate  = useNavigate()

  const [player,        setPlayer]        = useState(null)
  const [stats,         setStats]         = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toast,         setToast]         = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [{ data: playerData, error: pErr }, statsData] = await Promise.all([
          supabase.from('players').select('*').eq('id', id).single(),
          getPlayerStats(id),
        ])
        if (pErr) throw pErr
        setPlayer(playerData)
        setStats(statsData)
      } catch (err) {
        setToast({ message: err.message, type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleDelete() {
    try {
      await deletePlayer(id)
      navigate('/jugadores')
    } catch (err) {
      setToast({ message: err.message, type: 'error' })
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--s8)' }}>
          <LoadingSpinner size={32} />
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <div className="empty-title">Jugador no encontrado</div>
        </div>
      </div>
    )
  }

  // Determine chart line colour: green if total positive, red if negative
  const lineColor    = stats.totalNet >= 0 ? '#4ade80' : '#f87171'
  const winRateColor = stats.winRate >= 50  ? 'var(--green-dim)' : 'var(--red)'

  // Build chart data — oldest to newest
  const chartData = stats.history.map((h, i) => ({
    game:      i + 1,
    net:       h.net,
    dateLabel: new Date(h.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
  }))

  // Streak display
  let streakText, streakStyle
  if (stats.currentStreak > 0) {
    streakText  = `🔥 Racha de ${stats.currentStreak} victorias`
    streakStyle = 'streak-badge streak-badge--win'
  } else if (stats.currentStreak < 0) {
    streakText  = `❄️ Racha de ${Math.abs(stats.currentStreak)} derrotas`
    streakStyle = 'streak-badge streak-badge--loss'
  } else {
    streakText  = '— Sin racha activa'
    streakStyle = 'streak-badge streak-badge--neutral'
  }

  return (
    <div className="page">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ── Back button ────────────────────────────────── */}
      <button
        className="btn btn-ghost btn-sm mb-4"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => navigate(-1)}
      >
        <ChevronLeft size={18} />
        Volver
      </button>

      {/* ── Header ─────────────────────────────────────── */}
      <div className="player-stats-header">
        <div
          className="avatar avatar-lg"
          style={{ background: player.avatar_color }}
        >
          {player.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>{player.name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
            Jugando desde:{' '}
            {new Date(player.created_at).toLocaleDateString('es-ES', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* ── No games yet ───────────────────────────────── */}
      {stats.totalGames === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎲</div>
          <div className="empty-title">Sin partidas aún</div>
          <div className="empty-desc">
            Este jugador no ha participado en ninguna partida todavía.
          </div>
        </div>
      ) : (
        <>
          {/* ── Stats grid ─────────────────────────────── */}
          <div className="stats-grid mb-4">
            <StatCard icon="🎮" label="Partidas"      value={stats.totalGames} />
            <StatCard
              icon="💰" label="Ganancias"
              value={fmtNet(stats.totalNet)}
              color={stats.totalNet >= 0 ? 'green' : 'red'}
            />
            <StatCard
              icon="📈" label="Win rate"
              value={`${stats.winRate.toFixed(1)}%`}
              color={stats.winRate >= 50 ? 'green' : 'red'}
            />
            <StatCard
              icon="📊" label="Media/partida"
              value={fmtNet(stats.avgNet)}
              color={stats.avgNet >= 0 ? 'green' : 'red'}
            />
            <StatCard icon="🏆" label="Mejor partida" value={`+€${stats.bestGame.toFixed(2)}`}  color="green" />
            <StatCard icon="💀" label="Peor partida"   value={`−€${Math.abs(stats.worstGame).toFixed(2)}`} color="red" />
          </div>

          {/* ── Streak badge ───────────────────────────── */}
          <div className={streakStyle}>{streakText}</div>

          {/* ── Performance bar ────────────────────────── */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="section-label">Rendimiento</span>
              <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                {stats.totalWins}V / {stats.totalLosses}D
              </span>
            </div>
            <div className="performance-bar">
              <div
                className="performance-bar-fill"
                style={{ width: `${stats.winRate}%`, background: winRateColor }}
              />
            </div>
            <div className="flex justify-between" style={{ marginTop: 4, fontSize: '.75rem', color: 'var(--text-faint)' }}>
              <span>0%</span>
              <span>{stats.winRate.toFixed(1)}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* ── Evolution chart ────────────────────────── */}
          {chartData.length > 1 && (
            <div className="mb-6">
              <div className="section-label mb-3">Evolución de ganancias</div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="game"
                      stroke="var(--text-faint)"
                      tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                      label={{ value: 'Partida', position: 'insideBottom', offset: -2, fill: 'var(--text-faint)', fontSize: 11 }}
                    />
                    <YAxis
                      stroke="var(--text-faint)"
                      tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                      tickFormatter={(v) => `€${v}`}
                      width={48}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={0} stroke="var(--text-faint)" strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke={lineColor}
                      strokeWidth={2}
                      dot={{ fill: lineColor, r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Game history list ──────────────────────── */}
          <div className="section-label mb-3">Historial de partidas</div>
          {[...stats.history].reverse().map((h, i) => {
            const isWin  = h.net > 0.01
            const isLoss = h.net < -0.01
            return (
              <div key={i} className="player-history-row">
                <span style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
                  {new Date(h.date).toLocaleDateString('es-ES', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </span>
                <span style={{ fontSize: '.78rem', color: 'var(--text-faint)' }}>
                  €{h.buyIn} buy-in
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: isWin ? 'var(--green)' : isLoss ? 'var(--red)' : 'var(--neutral)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmtNet(h.net)}
                </span>
              </div>
            )
          })}
        </>
      )}

      {/* ── Delete player button ────────────────────────── */}
      <div style={{ marginTop: 'var(--s10)', paddingTop: 'var(--s6)', borderTop: '1px solid var(--border)' }}>
        {stats.totalGames > 0 ? (
          <>
            <button className="btn btn-danger btn-full" disabled>
              Eliminar jugador
            </button>
            <p style={{ fontSize: '.78rem', color: 'var(--text-faint)', textAlign: 'center', marginTop: 'var(--s2)' }}>
              No se puede eliminar un jugador con partidas registradas
            </p>
          </>
        ) : (
          <button
            className="btn btn-danger btn-full"
            onClick={() => setConfirmDelete(true)}
          >
            Eliminar jugador
          </button>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={`¿Eliminar a ${player.name}?`}
          description="Esta acción no se puede deshacer. El jugador será eliminado permanentemente."
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
