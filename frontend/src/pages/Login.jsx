import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'

export default function Login() {
  const navigate  = useNavigate()
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')

  if (localStorage.getItem('tekapoker_auth') === 'true') {
    return <Navigate to="/" replace />
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (password === 'tekapoker') {
      localStorage.setItem('tekapoker_auth', 'true')
      navigate('/', { replace: true })
    } else {
      setError('Contraseña incorrecta')
      setPassword('')
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--s6)',
      background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--s8)' }}>
        <div style={{
          fontSize: '1.6rem',
          letterSpacing: '.6rem',
          marginBottom: 'var(--s4)',
          opacity: .5,
        }}>
          ♠ ♣ ♥ ♦
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '3rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, var(--green) 0%, var(--text) 60%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.1,
          marginBottom: 'var(--s3)',
        }}>
          TekaPoker
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '.95rem' }}>
          Introduce la contraseña para continuar
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: '340px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s3)',
        }}
      >
        <input
          className="input"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError('') }}
          autoFocus
          autoComplete="current-password"
          style={{ textAlign: 'center', fontSize: '1.1rem', padding: 'var(--s4)' }}
        />

        {error && (
          <div style={{
            padding: 'var(--s3) var(--s4)',
            background: 'rgba(248,113,113,.1)',
            border: '1px solid rgba(248,113,113,.3)',
            borderRadius: 'var(--r-sm)',
            color: 'var(--red)',
            fontSize: '.9rem',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-full btn-lg">
          Entrar
        </button>
      </form>
    </div>
  )
}
