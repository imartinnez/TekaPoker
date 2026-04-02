/**
 * TekaPoker — Storage Service
 * All localStorage operations in one place.
 *
 * Data shape stored under 'tekapoker_games':
 * [
 *   {
 *     id:           string (timestamp),
 *     name:         string,
 *     date:         ISO string,
 *     buy_in:       number,
 *     players:      [{name, points}],
 *     balances:     [{name, points, final_money, net}],
 *     transactions: [{from, to, amount}],
 *   },
 *   ...
 * ]
 */

const KEY = 'tekapoker_games'

/** Read all saved games (newest first). */
export function getGames() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Save a new game and return the full updated list. */
export function saveGame({ name, date, buy_in, players, balances, transactions }) {
  const games = getGames()
  const newGame = {
    id:           String(Date.now()),
    name:         name || formatDefaultName(date),
    date:         date || new Date().toISOString(),
    buy_in,
    players,
    balances,
    transactions,
  }
  const updated = [newGame, ...games]
  localStorage.setItem(KEY, JSON.stringify(updated))
  return updated
}

/** Delete a game by id and return the updated list. */
export function deleteGame(id) {
  const updated = getGames().filter((g) => g.id !== id)
  localStorage.setItem(KEY, JSON.stringify(updated))
  return updated
}

/**
 * Build ranking data from all saved games.
 * Returns one entry per unique player name, sorted by total net (desc).
 *
 * @returns {Array<{name: string, net: number, games: number, wins: number}>}
 */
export function getRanking() {
  const games = getGames()
  const map = {}

  for (const game of games) {
    for (const balance of game.balances) {
      if (!map[balance.name]) {
        map[balance.name] = { name: balance.name, net: 0, games: 0, wins: 0 }
      }
      map[balance.name].net   += balance.net
      map[balance.name].games += 1
      if (balance.net > 0) map[balance.name].wins += 1
    }
  }

  return Object.values(map)
    .sort((a, b) => b.net - a.net)
    .map((p) => ({ ...p, net: round2(p.net) }))
}

// ── Helpers ────────────────────────────────────────────────
function round2(n) {
  return Math.round(n * 100) / 100
}

function formatDefaultName(isoDate) {
  try {
    const d = new Date(isoDate || Date.now())
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
  } catch {
    return 'Poker Night'
  }
}
