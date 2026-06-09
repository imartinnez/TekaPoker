import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import { Sparkles, Send, TrendingUp, TrendingDown, Minus, Swords } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import Toast          from '../components/Toast'
import { getGames }   from '../services/database'
import { buildAnalytics, headToHeadFor, buildAiPayload } from '../services/analytics'
import { askAI }      from '../services/ai'

const fmtNet = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}€${Math.abs(n).toFixed(2)}`

const SUGGESTIONS = [
  '¿Cómo voy comparado con el resto del grupo?',
  '¿Quién es mi rival más difícil?',
  '¿Quién es el jugador más consistente?',
  '¿Estoy en racha últimamente?',
]

export default function Analytics() {
  const [games,    setGames]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [toast,    setToast]    = useState(null)
  const [viewerId, setViewerId] = useState('')

  // AI chat
  const [question,   setQuestion]   = useState('')
  const [chat,       setChat]       = useState([]) // [{ role, text }]
  const [asking,     setAsking]     = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getGames()
        setGames(data)
      } catch (err) {
        setToast({ message: err.message, type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const analytics = useMemo(() => buildAnalytics(games), [games])
  const viewer = analytics.players.find((p) => p.id === viewerId) || null
  const h2h = viewerId ? headToHeadFor(analytics, viewerId) : []

  // Build aligned cumulative chart data across all games
  const chartData = useMemo(() => buildCumulativeSeries(games), [games])

  async function handleAsk(q) {
    const text = (q ?? question).trim()
    if (!text || asking) return
    setChat((c) => [...c, { role: 'user', text }])
    setQuestion('')
    setAsking(true)
    try {
      const payload = buildAiPayload(analytics, viewer?.name || 'desconocido')
      const answer = await askAI({ question: text, viewerName: viewer?.name || 'desconocido', payload })
      setChat((c) => [...c, { role: 'ai', text: answer }])
    } catch (err) {
      setChat((c) => [...c, { role: 'ai', text: `⚠️ ${err.message}`, error: true }])
    } finally {
      setAsking(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Análisis</h1></div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--s8)' }}>
          <LoadingSpinner size={28} />
        </div>
      </div>
    )
  }

  if (analytics.totals.totalGames === 0) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Análisis</h1></div>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-title">Sin datos todavía</div>
          <div className="empty-desc">Guarda algunas partidas y aquí verás el análisis.</div>
        </div>
      </div>
    )
  }

  const players = analytics.players
  const mostConsistent = [...players].filter((p) => p.games >= 2).sort((a, b) => a.volatility - b.volatility)
  const colorById = Object.fromEntries(players.map((p) => [p.id, p.avatarColor]))

  return (
    <div className="page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header"><h1 className="page-title">Análisis</h1></div>

      {/* ── Perspective selector ───────────────────────── */}
      <div className="field">
        <label className="field-label">¿Quién eres? (para personalizar el análisis y el chat)</label>
        <select className="input" value={viewerId} onChange={(e) => setViewerId(e.target.value)}>
          <option value="">— Vista del grupo —</option>
          {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* ── Viewer summary ─────────────────────────────── */}
      {viewer && (
        <div className="card mb-4" style={{ borderColor: `${viewer.avatarColor}55` }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="avatar" style={{ background: viewer.avatarColor }}>
              {viewer.name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{viewer.name}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                {viewer.games} partidas · {viewer.wins}V / {viewer.losses}D
              </div>
            </div>
            <FormBadge form={viewer.form} />
          </div>
          <div className="analytics-mini-grid">
            <Mini label="Neto total"   value={fmtNet(viewer.totalNet)} pos={viewer.totalNet} />
            <Mini label="Media/partida" value={fmtNet(viewer.avgNet)}  pos={viewer.avgNet} />
            <Mini label="Win rate"     value={`${viewer.winRate}%`}    pos={viewer.winRate - 50} />
            <Mini label="Volatilidad"  value={`€${viewer.volatility}`} neutral />
            <Mini label="Mejor"        value={fmtNet(viewer.best)}     pos={viewer.best} />
            <Mini label="Peor"         value={fmtNet(viewer.worst)}    pos={viewer.worst} />
          </div>
        </div>
      )}

      {/* ── AI analyst ─────────────────────────────────── */}
      <div className="ai-box mb-6">
        <div className="ai-box-head">
          <Sparkles size={16} color="var(--gold)" />
          <span>Analista IA</span>
          <span className="ai-box-sub">pregunta sobre tus datos</span>
        </div>

        <div className="ai-chat">
          {chat.length === 0 && (
            <div className="ai-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="ai-suggestion" onClick={() => handleAsk(s)} disabled={asking}>
                  {s}
                </button>
              ))}
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} className={`ai-msg ai-msg--${m.role}${m.error ? ' ai-msg--error' : ''}`}>
              {m.text}
            </div>
          ))}
          {asking && (
            <div className="ai-msg ai-msg--ai">
              <LoadingSpinner size={14} /> Analizando…
            </div>
          )}
        </div>

        <div className="ai-input-row">
          <input
            className="input"
            type="text"
            placeholder={viewer ? `Pregunta como ${viewer.name}…` : 'Escribe tu pregunta…'}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            maxLength={500}
            disabled={asking}
          />
          <button className="btn btn-primary btn-icon" onClick={() => handleAsk()} disabled={asking || !question.trim()}>
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* ── Cumulative evolution ───────────────────────── */}
      {chartData.points.length > 1 && (
        <div className="mb-6">
          <div className="section-label mb-3">Evolución del neto acumulado</div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="game" stroke="var(--text-faint)" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                <YAxis stroke="var(--text-faint)" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} tickFormatter={(v) => `€${v}`} width={48} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '.8rem' }}
                  formatter={(v, name) => [`€${Number(v).toFixed(2)}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '.7rem' }} />
                <ReferenceLine y={0} stroke="var(--text-faint)" strokeDasharray="4 4" />
                {chartData.keys.map((k) => (
                  <Line
                    key={k.id}
                    type="monotone"
                    dataKey={k.name}
                    stroke={colorById[k.id] || '#4ade80'}
                    strokeWidth={viewerId === k.id ? 3 : 1.5}
                    opacity={!viewerId || viewerId === k.id ? 1 : 0.35}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Head-to-head for viewer ────────────────────── */}
      {viewer && h2h.length > 0 && (
        <div className="mb-6">
          <div className="section-label mb-3">
            <Swords size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            {viewer.name} cara a cara
          </div>
          {h2h.map((r) => (
            <div key={r.id} className="h2h-row">
              <div className="avatar avatar-sm" style={{ background: r.avatarColor }}>
                {r.name.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ flex: 1, fontWeight: 600 }}>{r.name}</span>
              <span style={{ fontSize: '.75rem', color: 'var(--text-faint)' }}>
                {r.aheadCount}/{r.games} por delante
              </span>
              <span style={{
                fontWeight: 700, minWidth: 70, textAlign: 'right',
                color: r.netDiff > 0.01 ? 'var(--green)' : r.netDiff < -0.01 ? 'var(--red)' : 'var(--neutral)',
              }}>
                {fmtNet(r.netDiff)}
              </span>
            </div>
          ))}
          <p style={{ fontSize: '.72rem', color: 'var(--text-faint)', marginTop: 'var(--s2)' }}>
            Diferencia de neto acumulada en las partidas que jugasteis juntos. Verde = le ganas dinero.
          </p>
        </div>
      )}

      {/* ── Consistency ranking ────────────────────────── */}
      {mostConsistent.length > 1 && (
        <div className="mb-6">
          <div className="section-label mb-3">Quién es más consistente</div>
          {mostConsistent.map((p, i) => (
            <div key={p.id} className="h2h-row">
              <span className="rank-pos">{i + 1}</span>
              <div className="avatar avatar-sm" style={{ background: p.avatarColor }}>
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                ±€{p.volatility}
              </span>
            </div>
          ))}
          <p style={{ fontSize: '.72rem', color: 'var(--text-faint)', marginTop: 'var(--s2)' }}>
            Menor variación = resultados más estables partida a partida.
          </p>
        </div>
      )}

      {/* ── Table sizes ────────────────────────────────── */}
      {analytics.tableSizes.length > 0 && (
        <div className="mb-4">
          <div className="section-label mb-3">Partidas por nº de jugadores</div>
          <div className="flex" style={{ gap: 'var(--s2)', flexWrap: 'wrap' }}>
            {analytics.tableSizes.map((t) => (
              <div key={t.size} className="table-size-chip">
                <strong>{t.size}</strong> jug.
                <span style={{ color: 'var(--text-faint)' }}> · {t.games} partidas</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────
function FormBadge({ form }) {
  if (form === 'up')   return <span className="badge badge-green"><TrendingUp size={12} /> En alza</span>
  if (form === 'down') return <span className="badge badge-red"><TrendingDown size={12} /> En baja</span>
  return <span className="badge badge-neutral"><Minus size={12} /> Estable</span>
}

function Mini({ label, value, pos, neutral }) {
  const color = neutral ? 'var(--text-2)' : pos > 0.01 ? 'var(--green)' : pos < -0.01 ? 'var(--red)' : 'var(--neutral)'
  return (
    <div className="analytics-mini">
      <div className="analytics-mini-val" style={{ color }}>{value}</div>
      <div className="analytics-mini-label">{label}</div>
    </div>
  )
}

/**
 * Build aligned multi-series cumulative data: x = game index over time,
 * each player's running cumulative net carried forward.
 */
function buildCumulativeSeries(games) {
  const ordered = [...(games || [])].sort((a, b) => new Date(a.played_at) - new Date(b.played_at))
  const cum = {}        // playerId -> running total
  const names = {}      // playerId -> name
  const points = []

  ordered.forEach((game, idx) => {
    for (const gp of game.game_players || []) {
      if (!gp.player) continue
      names[gp.player.id] = gp.player.name
      cum[gp.player.id] = Math.round(((cum[gp.player.id] || 0) + parseFloat(gp.net)) * 100) / 100
    }
    const point = { game: idx + 1 }
    for (const pid of Object.keys(names)) {
      point[names[pid]] = cum[pid] ?? null
    }
    points.push(point)
  })

  const keys = Object.keys(names).map((id) => ({ id, name: names[id] }))
  return { points, keys }
}
