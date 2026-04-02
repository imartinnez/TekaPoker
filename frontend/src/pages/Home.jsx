import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { supabase } from '../services/supabase'
import { getGlobalRanking } from '../services/database'

export default function Home() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        // Run all queries in parallel for speed
        const [
          { count: totalGames },
          { count: totalPlayers },
          ranking,
          { data: lastGameRows },
        ] = await Promise.all([
          supabase.from('games').select('id', { count: 'exact', head: true }),
          supabase.from('players').select('id', { count: 'exact', head: true }),
          getGlobalRanking(),
          supabase
            .from('games')
            .select('id, played_at, buy_in, total_players, game_players(player:players(name))')
            .order('played_at', { ascending: false })
            .limit(1),
        ])

        const lastGame  = lastGameRows?.[0] ?? null
        const topPlayer = ranking.find((p) => p.totalNet > 0) ?? null

        setStats({ totalGames, totalPlayers, topPlayer, lastGame })
      } catch (err) {
        console.error('Error cargando estadísticas:', err)
        setStats({ totalGames: 0, totalPlayers: 0, topPlayer: null, lastGame: null })
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="page">
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="home-hero">
        <div className="home-suits">♠ ♥ ♦ ♣</div>
        <h1 className="hero-title">TekaPoker</h1>
        <p className="hero-subtitle">Controla quién gana. Liquida deudas.</p>
      </div>

      {/* ── Live stats ───────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--s8)' }}>
          <LoadingSpinner size={28} />
        </div>
      ) : (
        <>
          {stats.totalGames > 0 && (
            <div className="stats-grid mb-6">
              <div className="stat-card">
                <div className="stat-icon">🃏</div>
                <div className="stat-value">{stats.totalGames}</div>
                <div className="stat-label">Partidas jugadas</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-value">{stats.totalPlayers}</div>
                <div className="stat-label">Jugadores</div>
              </div>
            </div>
          )}

          {/* Biggest winner */}
          {stats.topPlayer && (
            <div className="recent-winner mb-4">
              <span className="winner-icon">🏆</span>
              <div>
                <div className="winner-label">Mayor ganador</div>
                <div className="winner-name">
                  {stats.topPlayer.name} — +€{stats.topPlayer.totalNet.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Last game */}
          {stats.lastGame && (
            <div className="card mb-6" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
              <span style={{ fontSize: '1.4rem' }}>🕐</span>
              <div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Última partida
                </div>
                <div style={{ fontWeight: 600, fontSize: '.95rem' }}>
                  {new Date(stats.lastGame.played_at).toLocaleDateString('es-ES', {
                    weekday: 'long', day: 'numeric', month: 'short',
                  })}
                </div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                  {stats.lastGame.total_players} jugadores · €{stats.lastGame.buy_in} buy-in
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CTA ──────────────────────────────────────────── */}
      <Link to="/nueva" className="btn btn-primary btn-full btn-lg mb-3">
        <PlusCircle size={20} />
        Nueva partida →
      </Link>

      {!loading && stats?.totalGames > 0 && (
        <Link to="/historial" className="btn btn-secondary btn-full mb-6">
          Ver historial
        </Link>
      )}

      {/* ── Empty state ───────────────────────────────────── */}
      {!loading && stats?.totalGames === 0 && (
        <div className="empty-state" style={{ paddingTop: 'var(--s8)' }}>
          <div className="empty-icon">🎲</div>
          <div className="empty-title">Sin partidas todavía</div>
          <div className="empty-desc">
            Empieza una partida y lleva el registro de quién gana y quién paga.
          </div>
        </div>
      )}
    </div>
  )
}
