/**
 * TekaPoker — Chip Case helper.
 *
 * Stores your physical chip set (colours, value, quantity) in localStorage
 * and computes how to split the chips between players for a given buy-in.
 *
 * No database, no cost — purely local to the device/browser.
 */

const STORAGE_KEY = 'tekapoker_chipcase'

const DEFAULT_CHIPS = [
  { id: 'w', label: 'Blanca', color: '#e5e7eb', value: 0.05, count: 100 },
  { id: 'r', label: 'Roja',   color: '#f87171', value: 0.10, count: 100 },
  { id: 'b', label: 'Azul',   color: '#60a5fa', value: 0.25, count: 100 },
  { id: 'g', label: 'Verde',  color: '#4ade80', value: 0.50, count: 50  },
  { id: 'k', label: 'Negra',  color: '#1f2937', value: 1.00, count: 50  },
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
 * Split chips between `players` for a per-player buy-in of `buyIn` euros.
 *
 * Strategy: largest-denomination-first greedy. This uses the FEWEST chips
 * per player, which leaves the biggest reserve in the box — exactly what
 * you want so you don't run out when someone rebuys mid-game.
 *
 * @returns {{
 *   ok: boolean,
 *   exact: boolean,
 *   reason?: string,
 *   stack: Array,        // [{ id,label,color,value, perPlayer }]
 *   stackValue: number,  // euros per player actually allocated
 *   reserves: Array,     // [{ id,label,color, used, remaining }]
 * }}
 */
export function distributeChips(chips, buyIn, players) {
  const P = Math.floor(Number(players))
  const target = Math.round(Number(buyIn) * 100) // work in cents

  if (!P || P < 1) return { ok: false, reason: 'players' }
  if (!target || target <= 0) return { ok: false, reason: 'buyin' }

  const denoms = (chips || [])
    .map((c) => ({
      ...c,
      vc: Math.round(Number(c.value) * 100),
      maxPer: Math.floor(Number(c.count) / P),
    }))
    .filter((c) => c.vc > 0 && c.count > 0)
    .sort((a, b) => b.vc - a.vc) // largest first

  if (denoms.length === 0) return { ok: false, reason: 'config' }

  let remaining = target
  const perPlayer = {}
  for (const d of denoms) {
    const want = Math.floor(remaining / d.vc)
    const give = Math.min(want, d.maxPer)
    perPlayer[d.id] = give
    remaining -= give * d.vc
  }

  const exact = remaining === 0
  const stackValueCents = target - remaining

  const stack = denoms
    .map((d) => ({
      id: d.id,
      label: d.label,
      color: d.color,
      value: d.value,
      perPlayer: perPlayer[d.id] || 0,
    }))
    .sort((a, b) => a.value - b.value) // show small → large for readability

  const reserves = denoms
    .map((d) => {
      const used = (perPlayer[d.id] || 0) * P
      return {
        id: d.id,
        label: d.label,
        color: d.color,
        value: d.value,
        used,
        remaining: Number(d.count) - used,
      }
    })
    .sort((a, b) => a.value - b.value)

  return {
    ok: true,
    exact,
    stack,
    stackValue: stackValueCents / 100,
    shortfall: remaining / 100, // euros that couldn't be matched (0 if exact)
    reserves,
  }
}
