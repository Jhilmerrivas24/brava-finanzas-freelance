import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

const ACCENT = '#1D9E75'

export default function RegisterView({ onGoLogin }) {
  const [nombre,    setNombre]    = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <h2 style={{ ...styles.title, marginBottom: 8 }}>Revisa tu email</h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Te enviamos un enlace de confirmación a <strong style={{ color: 'var(--ink, #f1f5f9)' }}>{email}</strong>.
              Haz clic en el enlace para activar tu cuenta.
            </p>
            <button style={styles.btn} onClick={onGoLogin}>
              Ir a iniciar sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoMark}>
            <svg viewBox="0 0 24 24" width="32" height="32">
              <rect x="2" y="2" width="20" height="20" rx="6" fill={ACCENT} />
              <path d="M8 16V8h4.2c1.7 0 2.8.9 2.8 2.3 0 1-.6 1.7-1.5 1.9 1.1.2 1.8 1 1.8 2.1 0 1.5-1.1 2.4-2.9 2.4H8zm2-4.8h1.8c.7 0 1.2-.3 1.2-1s-.5-1-1.2-1H10v2zm0 3.2h1.9c.8 0 1.3-.4 1.3-1.1s-.5-1.1-1.3-1.1H10v2.2z" fill="#fff" />
            </svg>
          </div>
          <div>
            <div style={styles.brandName}>Brava</div>
            <div style={styles.brandSub}>Finanzas freelance</div>
          </div>
        </div>

        <h2 style={styles.title}>Crea tu cuenta</h2>
        <p style={styles.sub}>Gratis para siempre en el plan básico</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Nombre completo</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Ana García"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirmar contraseña</label>
            <input
              type="password"
              style={styles.input}
              placeholder="Repite tu contraseña"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={styles.error}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <div style={styles.links}>
          <button style={styles.link} onClick={onGoLogin}>
            ¿Ya tienes cuenta? <strong>Inicia sesión</strong>
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg, #0f172a)',
    padding: 16,
  },
  card: {
    background: 'var(--bg-elev, #1e293b)',
    border: '1px solid var(--border, #334155)',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 25px 50px rgba(0,0,0,.4)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  logoMark: { flexShrink: 0 },
  brandName: { fontWeight: 800, fontSize: 20, color: 'var(--ink, #f1f5f9)', lineHeight: 1 },
  brandSub:  { fontSize: 11, color: '#64748b', marginTop: 2 },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--ink, #f1f5f9)',
    margin: '0 0 4px',
  },
  sub: {
    fontSize: 13,
    color: '#64748b',
    margin: '0 0 24px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--ink, #f1f5f9)' },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1.5px solid var(--border, #334155)',
    background: 'var(--bg-sunk, #0f172a)',
    color: 'var(--ink, #f1f5f9)',
    fontSize: 14,
    outline: 'none',
  },
  error: {
    background: 'rgba(239,68,68,.12)',
    border: '1px solid rgba(239,68,68,.3)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    color: '#f87171',
  },
  btn: {
    padding: '11px',
    borderRadius: 8,
    border: 'none',
    background: ACCENT,
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    marginTop: 4,
    transition: 'opacity .15s',
  },
  links: {
    marginTop: 20,
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    fontSize: 13,
    color: '#64748b',
  },
  link: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    fontSize: 13,
    padding: 0,
  },
}
