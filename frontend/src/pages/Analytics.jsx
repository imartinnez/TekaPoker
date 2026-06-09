import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import { Sparkles, Send, TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import Toast          from '../components/Toast'
import { getGames }   from '../services/database'
import { buildAnalytics, buildAiPayload } from '../services/analytics'
import { askAI }      from '../services/ai'

const fmtNet = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}€${Math.abs(n).toFixed(2)}`

const SUGGESTIONS = [
  '¿Cómo voy comparado con el resto del grupo?',
  '¿Quién es mi rival más difícil?',
  '¿Quién es el jugador más consistente?',
  '¿Estoy en racha últimamente?',
]

// Metrics available in the comparator
const METRICS = [
  { key: 'totalNet',   label: 'Neto total (€)',        fmt: (v) => fmtNet(v),            signed: true },
  { key: 'avgNet',     label: 'Media por partida (€)', fmt: (v) => fmtNet(v),            signed: true },
  { key: 'winRate',    label: 'Win-rate (%)',          fmt: (v) => `${v}%`,              signed: false },
  { key: 'volatility', label: 'Volatilidad (€)',       fmt: (v) => `±€${v.toFixed(2)}`,  signed: false },
  { key: 'games',      label: 'Partidas jugadas',      fmt: (v) => `${v}`,               signed: false },
]

export default function Analytics() {
  const [games,    setGames]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [toast,    setToast]    = useState(null)
  const [viewerId, setViewerId] = useState('')
  const [metric,   setMetric]   = useState('totalNet')

  // AI chat
  const [question, setQuestion] = useState('')
  const [chat,     setChat]     = useState([])
  const [asking,   setAsking]   = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setGames(await getGames())
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

  // Comparator data for the selected metric
  const metricDef = METRICS.find((m) => m.key === metric)
  const comparatorData = [...players]
    .map((p) => ({ name: p.name, value: p[metric], color: p.avatarColor, id: p.id }))
    .sort((a, b) => b.value - a.value)
  const comparatorHeight = Math.max(140, comparatorData.length * 38 + 24)

  return (
    <div className="page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header"><h1 className="page-title">Análisis</h1></div>

      {/* ── Perspective selector ───────────────────────── */}
      <div className="field">
        <label className="field-label">¿Quién eres? (personaliza el análisis y el chat)</label>
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
            <Mini label="Neto total"    value={fmtNet(viewer.totalNet)} pos={viewer.totalNet} />
            <Mini label="Media/partida" value={fmtNet(viewer.avgNet)}   pos={viewer.avgNet} />
            <Mini label="Win rate"      value={`${viewer.winRate}%`}    pos={viewer.winRate - 50} />
            <Mini label="Volatilidad"   value={`€${viewer.volatility}`} neutral />
            <Mini label="Mejor"         value={fmtNet(viewer.best)}     pos={viewer.best} />
            <Mini label="Peor"          value={fmtNet(viewer.worst)}    pos={viewer.worst} />
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
          <div className="section-label mb-1">Evolución del dinero acumulado</div>
          <p style={{ fontSize: '.74rem', color: 'var(--text-faint)', marginBottom: 'var(--s3)' }}>
            {viewer
              ? `Línea resaltada: ${viewer.name}. Cada punto es una partida jugada.`
              : 'Elige un jugador arriba para resaltar su línea. Cada punto es una partida.'}
          </p>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.points} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="game"
                  stroke="var(--text-faint)"
                  tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                  tickLine={false}
                  label={{ value: 'Partida nº', position: 'insideBottom', offset: -2, fill: 'var(--text-faint)', fontSize: 10 }}
                />
                <YAxis
                  stroke="var(--text-faint)"
                  tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
                  tickFormatter={(v) => `${v >= 0 ? '' : '−'}€${Math.abs(v)}`}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<CumulativeTooltip viewerName={viewer?.name} colorByName={chartData.colorByName} />} />
                <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={1} />
                {chartData.keys.map((k) => {
                  const focused = !viewerId || viewer?.name === k.name
                  return (
                    <Line
                      key={k.id}
                      type="monotone"
                      dataKey={k.name}
                      stroke={chartData.colorByName[k.name] || '#4ade80'}
                      strokeWidth={viewer?.name === k.name ? 3.5 : 2}
                      opacity={focused ? 1 : 0.18}
                      dot={viewer?.name === k.name ? { r: 3, strokeWidth: 0 } : false}
                      activeDot={focused ? { r: 5, strokeWidth: 0 } : false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Player comparator ──────────────────────────── */}
      <div className="mb-6">
        <div className="section-label mb-2">
          <BarChart2 size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
          Comparador de jugadores
        </div>
        <select className="input mb-3" value={metric} onChange={(e) => setMetric(e.target.value)}>
          {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <div className="chart-wrapper" style={{ padding: 'var(--s4) var(--s3) var(--s4) 0' }}>
          <ResponsiveContainer width="100%" height={comparatorHeight}>
            <BarChart data={comparatorData} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={88}
                tick={{ fontSize: 12, fill: 'var(--text-2)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,.04)' }}
                content={<ComparatorTooltip metricDef={metricDef} />}
              />
              <ReferenceLine x={0} stroke="var(--text-muted)" />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} label={<BarLabel metricDef={metricDef} />}>
                {comparatorData.map((d) => {
                  const color = metricDef.signed
                    ? (d.value > 0.01 ? 'var(--green-dim)' : d.value < -0.01 ? 'var(--red)' : 'var(--neutral)')
                    : d.color
                  return <Cell key={d.id} fill={color} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

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
              <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>±€{p.volatility}</span>
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

// Tooltip for the cumulative chart — lists every player at that game, sorted
function CumulativeTooltip({ active, payload, label, viewerName, colorByName }) {
  if (!active || !payload?.length) return null
  const rows = payload
    .filter((p) => p.value != null)
    .sort((a, b) => b.value - a.value)
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '.8rem', maxWidth: 220 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Partida {label}</div>
      {rows.map((r) => (
        <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontWeight: r.name === viewerName ? 800 : 500 }}>
          <span style={{ color: colorByName[r.name] || 'var(--text)' }}>{r.name}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: r.value >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {r.value >= 0 ? '+' : '−'}€{Math.abs(r.value).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}

function ComparatorTooltip({ active, payload, metricDef }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '.85rem' }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.name}</div>
      <div style={{ color: 'var(--text-muted)' }}>{metricDef.fmt(d.value)}</div>
    </div>
  )
}

// Value label drawn at the end of each comparator bar
function BarLabel({ x, y, width, height, value, metricDef }) {
  if (value == null) return null
  const txt = metricDef.fmt(value)
  return (
    <text x={x + width + 6} y={y + height / 2} dy={4} fill="var(--text-2)" fontSize={11} fontWeight={700}>
      {txt}
    </text>
  )
}

/**
 * Build aligned multi-series cumulative data: x = game index over time,
 * each player's running cumulative net carried forward.
 */
function buildCumulativeSeries(games) {
  const ordered = [...(games || [])].sort((a, b) => new Date(a.played_at) - new Date(b.played_at))
  const cum = {}, names = {}, colors = {}
  const points = []

  ordered.forEach((game, idx) => {
    for (const gp of game.game_players || []) {
      if (!gp.player) continue
      names[gp.player.id] = gp.player.name
      colors[gp.player.name] = gp.player.avatar_color
      cum[gp.player.id] = Math.round(((cum[gp.player.id] || 0) + parseFloat(gp.net)) * 100) / 100
    }
    const point = { game: idx + 1 }
    for (const pid of Object.keys(names)) point[names[pid]] = cum[pid] ?? null
    points.push(point)
  })

  const keys = Object.keys(names).map((id) => ({ id, name: names[id] }))
  return { points, keys, colorByName: colors }
}
