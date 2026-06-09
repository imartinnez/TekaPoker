/**
 * TekaPoker — Analytics Engine
 *
 * Pure functions that turn the raw games array (from database.getGames())
 * into rich, grouped statistics used by the Analytics page AND by the AI
 * chat (as grounding context, so the model never invents numbers).
 *
 * No network, no side effects — just maths over data we already have.
 */

const round2 = (n) => Math.round(n * 100) / 100

/**
 * Build the full analytics object from the list of games.
 *
 * @param {Array} games — as returned by getGames(): each has
 *   { id, played_at, buy_in, total_players,
 *     game_players: [{ points, final_money, net, player:{id,name,avatar_color} }] }
 * @returns {object} analytics
 */
export function buildAnalytics(games) {
  // Oldest → newest so cumulative curves and "recent form" make sense
  const ordered = [...(games || [])].sort(
    (a, b) => new Date(a.played_at) - new Date(b.played_at)
  )

  // ── Per-player accumulation ─────────────────────────────
  const map = {} // id -> player stats accumulator

  function ensure(p) {
    if (!map[p.id]) {
      map[p.id] = {
        id: p.id,
        name: p.name,
        avatarColor: p.avatar_color,
        nets: [],          // chronological list of nets
        cumulative: [],    // [{ date, value }]
        wins: 0,
        losses: 0,
        totalBuyIn: 0,
      }
    }
    return map[p.id]
  }

  // Head-to-head: hh[a][b] = { games, aheadCount, netDiff }
  const hh = {}
  function ensureHH(a, b) {
    if (!hh[a]) hh[a] = {}
    if (!hh[a][b]) hh[a][b] = { games: 0, aheadCount: 0, netDiff: 0 }
    return hh[a][b]
  }

  // Table-size aggregation
  const tableSizes = {} // size -> games count

  for (const game of ordered) {
    const gps = game.game_players || []
    const size = game.total_players || gps.length
    tableSizes[size] = (tableSizes[size] || 0) + 1

    // Per player in this game
    for (const gp of gps) {
      if (!gp.player) continue
      const acc = ensure(gp.player)
      const net = parseFloat(gp.net)
      acc.nets.push(net)
      const prev = acc.cumulative.length ? acc.cumulative[acc.cumulative.length - 1].value : 0
      acc.cumulative.push({ date: game.played_at, value: round2(prev + net) })
      if (net > 0.01) acc.wins++
      else if (net < -0.01) acc.losses++
      acc.totalBuyIn += parseFloat(game.buy_in || 0)
    }

    // Pairwise head-to-head within this game
    for (let i = 0; i < gps.length; i++) {
      for (let j = 0; j < gps.length; j++) {
        if (i === j) continue
        const a = gps[i].player, b = gps[j].player
        if (!a || !b) continue
        const rec = ensureHH(a.id, b.id)
        rec.games++
        const an = parseFloat(gps[i].net)
        const bn = parseFloat(gps[j].net)
        if (an > bn) rec.aheadCount++
        rec.netDiff = round2(rec.netDiff + (an - bn))
      }
    }
  }

  // ── Finalise per-player stats ───────────────────────────
  const players = Object.values(map).map((acc) => {
    const games = acc.nets.length
    const totalNet = acc.nets.reduce((s, n) => s + n, 0)
    const avgNet = games ? totalNet / games : 0
    // Population standard deviation of net = volatility
    const variance = games
      ? acc.nets.reduce((s, n) => s + (n - avgNet) ** 2, 0) / games
      : 0
    const volatility = Math.sqrt(variance)
    const best = games ? Math.max(...acc.nets) : 0
    const worst = games ? Math.min(...acc.nets) : 0
    const winRate = games ? (acc.wins / games) * 100 : 0

    const last5 = acc.nets.slice(-5)
    const last5Net = last5.reduce((s, n) => s + n, 0)
    const last5Avg = last5.length ? last5Net / last5.length : 0
    // Form: recent average vs overall average
    let form = 'flat'
    if (games >= 3) {
      if (last5Avg > avgNet + 0.5) form = 'up'
      else if (last5Avg < avgNet - 0.5) form = 'down'
    }

    return {
      id: acc.id,
      name: acc.name,
      avatarColor: acc.avatarColor,
      games,
      wins: acc.wins,
      losses: acc.losses,
      totalNet: round2(totalNet),
      avgNet: round2(avgNet),
      winRate: Math.round(winRate * 10) / 10,
      volatility: round2(volatility),
      best: round2(best),
      worst: round2(worst),
      last5: last5.map(round2),
      last5Net: round2(last5Net),
      last5Avg: round2(last5Avg),
      form,
      totalBuyIn: round2(acc.totalBuyIn),
      cumulative: acc.cumulative,
    }
  })

  // ── Rivalries (nemesis / victim) per player ─────────────
  const rivals = {}
  for (const a of players) {
    const opp = hh[a.id] || {}
    let nemesis = null, victim = null
    for (const bId of Object.keys(opp)) {
      const rec = opp[bId]
      if (rec.games < 1) continue
      const bName = map[bId]?.name ?? '?'
      // netDiff > 0  → a tends to beat b (b is a's victim)
      // netDiff < 0  → b tends to beat a (b is a's nemesis)
      if (victim === null || rec.netDiff > victim.netDiff) {
        victim = { id: bId, name: bName, netDiff: rec.netDiff, games: rec.games }
      }
      if (nemesis === null || rec.netDiff < nemesis.netDiff) {
        nemesis = { id: bId, name: bName, netDiff: rec.netDiff, games: rec.games }
      }
    }
    rivals[a.id] = {
      nemesis: nemesis && nemesis.netDiff < 0 ? nemesis : null,
      victim:  victim  && victim.netDiff  > 0 ? victim  : null,
    }
  }

  const totalMoneyMoved = round2(
    players.reduce((s, p) => s + Math.abs(p.totalNet), 0) / 2
  )

  return {
    players: players.sort((a, b) => b.totalNet - a.totalNet),
    headToHead: hh,
    rivals,
    tableSizes: Object.entries(tableSizes)
      .map(([size, count]) => ({ size: Number(size), games: count }))
      .sort((a, b) => a.size - b.size),
    totals: {
      totalGames: ordered.length,
      totalPlayers: players.length,
      totalMoneyMoved,
    },
  }
}

/**
 * Head-to-head record of `playerId` against every opponent, sorted by netDiff.
 * Positive netDiff = player tends to win money against that rival.
 */
export function headToHeadFor(analytics, playerId) {
  const opp = analytics.headToHead[playerId] || {}
  const byId = Object.fromEntries(analytics.players.map((p) => [p.id, p]))
  return Object.keys(opp)
    .map((bId) => ({
      id: bId,
      name: byId[bId]?.name ?? '?',
      avatarColor: byId[bId]?.avatarColor,
      games: opp[bId].games,
      aheadCount: opp[bId].aheadCount,
      netDiff: opp[bId].netDiff,
    }))
    .sort((a, b) => b.netDiff - a.netDiff)
}

/**
 * Build a COMPACT grounding payload for the AI. Only plain numbers,
 * no chart arrays. `viewerName` is the player the user claims to be.
 */
export function buildAiPayload(analytics, viewerName) {
  return {
    viewer: viewerName,
    groupTotals: analytics.totals,
    tableSizes: analytics.tableSizes,
    players: analytics.players.map((p) => ({
      name: p.name,
      partidas: p.games,
      victorias: p.wins,
      derrotas: p.losses,
      netoTotal: p.totalNet,
      netoMedio: p.avgNet,
      winRatePct: p.winRate,
      volatilidad: p.volatility,
      mejorPartida: p.best,
      peorPartida: p.worst,
      ultimas5Neto: p.last5Net,
      tendencia: p.form, // up | down | flat
      rivalDuro: analytics.rivals[p.id]?.nemesis
        ? `${analytics.rivals[p.id].nemesis.name} (${analytics.rivals[p.id].nemesis.netDiff}€)`
        : null,
      victimaFavorita: analytics.rivals[p.id]?.victim
        ? `${analytics.rivals[p.id].victim.name} (+${analytics.rivals[p.id].victim.netDiff}€)`
        : null,
    })),
  }
}
