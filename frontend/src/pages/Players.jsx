import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, PlusCircle, ChevronRight } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import ConfirmDialog  from '../components/ConfirmDialog'
import Toast          from '../components/Toast'
import { getPlayers, createPlayer, deletePlayer } from '../services/database'

export default function Players() {
  const navigate = useNavigate()

  const [players,      setPlayers]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [newName,      setNewName]      = useState('')
  const [saving,       setSaving]       = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // player object to delete
  const [toast,        setToast]        = useState(null)

  const loadPlayers = useCallback(async () => {
    try {
      const data = await getPlayers()
      setPlayers(data)
    } catch (err) {
      setToast({ message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPlayers() }, [loadPlayers])

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await createPlayer(newName.trim())
      setNewName('')
      setShowForm(false)
      await loadPlayers()
      setToast({ message: 'Jugador añadido correctamente', type: 'success' })
    } catch (err) {
      setToast({ message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      await deletePlayer(deleteTarget.id)
      setDeleteTarget(null)
      await loadPlayers()
      setToast({ message: 'Jugador eliminado', type: 'success' })
    } catch (err) {
      setDeleteTarget(null)
      setToast({ message: err.message, type: 'error' })
    }
  }

  return (
    <div className="page">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ── Header ─────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">Jugadores</h1>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setShowForm(true); setNewName('') }}
        >
          <PlusCircle size={15} />
          Añadir
        </button>
      </div>

      {/* ── Inline add form ─────────────────────────────── */}
      {showForm && (
        <div className="card mb-4" style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
          <input
            className="input"
            style={{ flex: 1 }}
            type="text"
            placeholder="Nombre del jugador"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
            maxLength={40}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleCreate}
            disabled={saving || !newName.trim()}
          >
            {saving ? <LoadingSpinner size={16} /> : 'Añadir'}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowForm(false)}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Player list ─────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--s8)' }}>
          <LoadingSpinner size={28} />
        </div>
      ) : players.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <div className="empty-title">Sin jugadores todavía</div>
          <div className="empty-desc">
            Añade jugadores para llevar el registro entre partidas.
          </div>
        </div>
      ) : (
        players.map((player) => (
          <div key={player.id} className="players-list-item">
            {/* Avatar + info — tap to go to stats */}
            <button
              className="players-list-info"
              onClick={() => navigate(`/jugador/${player.id}`)}
            >
              <div
                className="avatar"
                style={{ background: player.avatar_color }}
              >
                {player.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="players-list-name">{player.name}</div>
                <div className="players-list-date">
                  Desde{' '}
                  {new Date(player.created_at).toLocaleDateString('es-ES', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-faint)', marginLeft: 'auto' }} />
            </button>

            {/* Delete button */}
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setDeleteTarget(player)}
              aria-label={`Eliminar ${player.name}`}
            >
              <Trash2 size={16} style={{ color: 'var(--red)' }} />
            </button>
          </div>
        ))
      )}

      {/* ── Confirm delete ──────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDialog
          title={`¿Eliminar a ${deleteTarget.name}?`}
          description="Si el jugador tiene partidas registradas no podrás eliminarlo. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
