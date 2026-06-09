/**
 * TekaPoker — Chip Case helper.
 *
 * Stores your physical chip set in localStorage. Each chip colour has a
 * value in POINTS (not euros) — e.g. blanca=1, roja=2, verde=5, azul=10,
 * negra=20 by default, editable per game.
 *
 * The chips are split EQUALLY between players (everyone gets the same
 * stack). The buy-in then sets how much each point is worth in euros:
 *
 *     valorPorPunto (€) = buyIn / puntosPorJugador
 *
 * So the monetary value of a full starting stack always equals the buy-in.
 *
 * No database, no cost — purely local to the device/browser.
 */

const STORAGE_KEY = 'tekapoker_chipcase'

const DEFAULT_CHIPS = [
  { id: 'w', label: 'Blanca', color: '#e5e7eb', value: 1  , count: 100 },
  { id: 'r', label: 'Roja',   color: '#f87171', value: 2  , count: 100 },
  { id: 'g', label: 'Verde',  color: '#4ade80', value: 5  , count: 100 },
  { id: 'b', label: 'Azul',   color: '#60a5fa', value: 10 , count: 50  },
  { id: 'k', label: 'Negra',  color: '#1f2937', value: 20 , count: 50  },
]

export function loadChipCase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CHIPS.map((c) => ({ ...c }))
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_CHIPS.map((c) => ({ ...c }))
    }
    return parsed
  } catch {
    return DEFAULT_CHIPS.map((c) => ({ ...c }))
  }
}

export function saveChipCase(chips) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chips))
}

let idCounter = 0
export function newChipId() {
  return `c${Date.now()}_${idCounter++}`
}

/**
 * Split the chip case equally between `players` and work out the money
 * value of each point from the `buyIn`.
 *
 * Strategy: each player receives the same number of every colour —
 * floor(cantidad / jugadores) — leaving the remainder as reserve in the
 * box (handy for rebuys). The starting stack (in points) is the same for
 * everyone, so valorPorPunto = buyIn / puntosPorJugador.
 *
 * @returns {{
 *   ok: boolean,
 *   reason?: string,
 *   rows: Array,           // [{ id,label,color,value, perPlayer, points, reserve }]
 *   pointsPerPlayer: number,
 *   valuePerPoint: number, // euros per point
 *   stackValue: number,    // euros per player (== buyIn)
 * }}
 */
export function distributeChips(chips, buyIn, players) {
  const P = Math.floor(Number(players))
  const buy = Number(buyIn)

  if (!P || P < 1) return { ok: false, reason: 'players' }
  if (!buy || buy <= 0) return { ok: false, reason: 'buyin' }

  const valid = (chips || []).filter(
    (c) => Number(c.value) > 0 && Number(c.count) > 0
  )
  if (valid.length === 0) return { ok: false, reason: 'config' }

  const rows = valid
    .map((c) => {
      const perPlayer = Math.floor(Number(c.count) / P)
      const points = perPlayer * Number(c.value)
      const reserve = Number(c.count) - perPlayer * P
      return {
        id: c.id,
        label: c.label,
        color: c.color,
        value: Number(c.value),
        perPlayer,
        points,
        reserve,
      }
    })
    .sort((a, b) => a.value - b.value)

  const pointsPerPlayer = rows.reduce((s, r) => s + r.points, 0)
  const valuePerPoint = pointsPerPlayer > 0 ? buy / pointsPerPlayer : 0

  return {
    ok: true,
    rows,
    pointsPerPlayer,
    valuePerPoint,
    stackValue: buy,
    enoughChips: pointsPerPlayer > 0,
  }
}
