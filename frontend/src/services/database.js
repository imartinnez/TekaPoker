/**
 * TekaPoker — Database Service Layer
 * All interactions with Supabase go through these functions.
 * Every function uses async/await and try/catch for error handling.
 */

import { supabase } from './supabase'

// ── Avatar colour palette ─────────────────────────────────────
const AVATAR_COLORS = [
  '#4ade80', '#60a5fa', '#f472b6', '#fb923c',
  '#a78bfa', '#34d399', '#fbbf24', '#f87171',
]

function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

// ══════════════════════════════════════════════════════════════
// PLAYERS
// ══════════════════════════════════════════════════════════════

/**
 * Returns all players ordered alphabetically by name.
 */
export async function getPlayers() {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name')

    if (error) throw error
    return data
  } catch (err) {
    throw new Error(`Error cargando jugadores: ${err.message}`)
  }
}

/**
 * Creates a new player with a random avatar colour from the preset palette.
 * @param {string} name
 */
export async function createPlayer(name) {
  try {
    const { data, error } = await supabase
      .from('players')
      .insert({ name: name.trim(), avatar_color: randomColor() })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    // Supabase returns a unique-constraint error code 23505
    if (err.code === '23505' || err.message?.includes('unique')) {
      throw new Error(`Ya existe un jugador llamado "${name}".`)
    }
    throw new Error(`Error creando jugador: ${err.message}`)
  }
}

/**
 * Deletes a player — only if they have no games registered.
 * Throws a user-friendly Spanish error if they do.
 * @param {string} id  — player UUID
 */
export async function deletePlayer(id) {
  try {
    // Check if the player has any game_players records
    const { count, error: countError } = await supabase
      .from('game_players')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', id)

    if (countError) throw countError

    if (count > 0) {
      throw new Error('Este jugador tiene partidas registradas. No se puede eliminar.')
    }

    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) throw error
  } catch (err) {
    throw err // re-throw so the UI can show the message
  }
}

// ══════════════════════════════════════════════════════════════
// GAMES
// ══════════════════════════════════════════════════════════════

/**
 * Saves a completed game to the database in three steps:
 *   1. Insert the game record
 *   2. Insert all game_players rows (one per participating player)
 *   3. Insert all transaction rows (payments to settle debts)
 *
 * @param {object} params
 * @param {number}   params.buyIn        — buy-in amount per player
 * @param {Array}    params.playersData  — [{ id, name, points, finalMoney, net }]
 * @param {Array}    params.transactions — [{ fromId, toId, amount }]
 * @returns {object} The saved game record
 */
export async function saveGame({ buyIn, playersData, transactions }) {
  try {
    // 1. Insert the game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        buy_in:        buyIn,
        total_players: playersData.length,
      })
      .select()
      .single()

    if (gameError) throw gameError

    // 2. Insert one row per player
    const gpRows = playersData.map((p) => ({
      game_id:     game.id,
      player_id:   p.id,
      points:      p.points,
      final_money: p.finalMoney,
      net:         p.net,
    }))

    const { error: gpError } = await supabase.from('game_players').insert(gpRows)
    if (gpError) throw gpError

    // 3. Insert transactions (may be empty if everyone broke even)
    if (transactions.length > 0) {
      const txRows = transactions.map((tx) => ({
        game_id:        game.id,
        from_player_id: tx.fromId,
        to_player_id:   tx.toId,
        amount:         tx.amount,
      }))

      const { error: txError } = await supabase.from('transactions').insert(txRows)
      if (txError) throw txError
    }

    return game
  } catch (err) {
    throw new Error(`Error guardando partida: ${err.message}`)
  }
}

/**
 * Returns all games with full detail (players + transactions), newest first.
 */
export async function getGames() {
  try {
    const { data, error } = await supabase
      .from('games')
      .select(`
        id,
        played_at,
        buy_in,
        total_players,
        notes,
        game_players (
          id,
          points,
          final_money,
          net,
          player:players ( id, name, avatar_color )
        ),
        transactions (
          id,
          amount,
          from_player:from_player_id ( id, name ),
          to_player:to_player_id ( id, name )
        )
      `)
      .order('played_at', { ascending: false })

    if (error) throw error
    return data
  } catch (err) {
    throw new Error(`Error cargando partidas: ${err.message}`)
  }
}

/**
 * Returns a single game with full detail.
 * @param {string} id — game UUID
 */
export async function getGameById(id) {
  try {
    const { data, error } = await supabase
      .from('games')
      .select(`
        id,
        played_at,
        buy_in,
        total_players,
        notes,
        game_players (
          id,
          points,
          final_money,
          net,
          player:players ( id, name, avatar_color )
        ),
        transactions (
          id,
          amount,
          from_player:from_player_id ( id, name ),
          to_player:to_player_id ( id, name )
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    throw new Error(`Error cargando partida: ${err.message}`)
  }
}

/**
 * Deletes a game. game_players and transactions cascade automatically.
 * @param {string} id — game UUID
 */
export async function deleteGame(id) {
  try {
    const { error } = await supabase.from('games').delete().eq('id', id)
    if (error) throw error
  } catch (err) {
    throw new Error(`Error eliminando partida: ${err.message}`)
  }
}

// ══════════════════════════════════════════════════════════════
// STATISTICS
// ══════════════════════════════════════════════════════════════

/**
 * Returns detailed stats for a single player.
 *
 * @param {string} playerId
 * @returns {object} Stats object with totals, streaks, and history array
 */
export async function getPlayerStats(playerId) {
  try {
    const { data, error } = await supabase
      .from('game_players')
      .select(`
        net,
        points,
        final_money,
        game:games ( id, played_at, buy_in )
      `)
      .eq('player_id', playerId)

    if (error) throw error

    // Sort oldest → newest for streak/chart calculations
    const history = (data || [])
      .sort((a, b) => new Date(a.game.played_at) - new Date(b.game.played_at))

    const totalGames = history.length

    // Return zeroed stats if the player has never played
    if (totalGames === 0) {
      return {
        totalGames: 0, totalNet: 0, bestGame: 0, worstGame: 0,
        winRate: 0, avgNet: 0, biggestWin: 0, biggestLoss: 0,
        currentStreak: 0, longestWinStreak: 0,
        totalWins: 0, totalLosses: 0, history: [],
      }
    }

    const nets = history.map((h) => parseFloat(h.net))

    const totalNet   = nets.reduce((s, n) => s + n, 0)
    const bestGame   = Math.max(...nets)
    const worstGame  = Math.min(...nets)
    const totalWins  = nets.filter((n) => n > 0.01).length
    const totalLosses = nets.filter((n) => n < -0.01).length
    const winRate    = (totalWins / totalGames) * 100
    const avgNet     = totalNet / totalGames
    const positives  = nets.filter((n) => n > 0)
    const negatives  = nets.filter((n) => n < 0)
    const biggestWin  = positives.length > 0 ? Math.max(...positives) : 0
    const biggestLoss = negatives.length > 0 ? Math.min(...negatives) : 0

    // Current streak: count consecutive wins (+) or losses (−) from end
    let currentStreak = 0
    for (let i = nets.length - 1; i >= 0; i--) {
      const isWin  = nets[i] > 0.01
      const isLoss = nets[i] < -0.01
      if (i === nets.length - 1) {
        // Seed the streak direction from the last game
        currentStreak = isWin ? 1 : isLoss ? -1 : 0
      } else {
        if (currentStreak > 0 && isWin)  currentStreak++
        else if (currentStreak < 0 && isLoss) currentStreak--
        else break
      }
    }

    // Longest win streak ever
    let longestWinStreak = 0
    let runningWin = 0
    for (const n of nets) {
      if (n > 0.01) { runningWin++; longestWinStreak = Math.max(longestWinStreak, runningWin) }
      else           { runningWin = 0 }
    }

    const round2 = (n) => Math.round(n * 100) / 100

    return {
      totalGames,
      totalNet:        round2(totalNet),
      bestGame:        round2(bestGame),
      worstGame:       round2(worstGame),
      winRate:         Math.round(winRate * 10) / 10,
      avgNet:          round2(avgNet),
      biggestWin:      round2(biggestWin),
      biggestLoss:     round2(biggestLoss),
      currentStreak,
      longestWinStreak,
      totalWins,
      totalLosses,
      history: history.map((h) => ({
        date:   h.game.played_at,
        net:    parseFloat(h.net),
        buyIn:  parseFloat(h.game.buy_in),
        gameId: h.game.id,
      })),
    }
  } catch (err) {
    throw new Error(`Error cargando estadísticas: ${err.message}`)
  }
}

/**
 * Returns all players with aggregated stats, sorted by totalNet descending.
 */
export async function getGlobalRanking() {
  try {
    // Fetch players and all game_players in two parallel queries
    const [{ data: players, error: pErr }, { data: gamePlayers, error: gpErr }] =
      await Promise.all([
        supabase.from('players').select('*'),
        supabase.from('game_players').select('player_id, net'),
      ])

    if (pErr)  throw pErr
    if (gpErr) throw gpErr

    // Aggregate per player
    const stats = (players || []).map((player) => {
      const rows = (gamePlayers || []).filter((gp) => gp.player_id === player.id)
      const nets = rows.map((gp) => parseFloat(gp.net))
      const totalGames = rows.length
      const totalNet   = nets.reduce((s, n) => s + n, 0)
      const totalWins  = nets.filter((n) => n > 0.01).length
      const winRate    = totalGames > 0 ? (totalWins / totalGames) * 100 : 0
      const avgNet     = totalGames > 0 ? totalNet / totalGames : 0
      const round2 = (n) => Math.round(n * 100) / 100

      return {
        id:          player.id,
        name:        player.name,
        avatarColor: player.avatar_color,
        createdAt:   player.created_at,
        totalGames,
        totalNet:    round2(totalNet),
        totalWins,
        winRate:     Math.round(winRate * 10) / 10,
        avgNet:      round2(avgNet),
      }
    })

    // Sort by totalNet descending (biggest winner first)
    return stats.sort((a, b) => b.totalNet - a.totalNet)
  } catch (err) {
    throw new Error(`Error cargando ranking: ${err.message}`)
  }
}
