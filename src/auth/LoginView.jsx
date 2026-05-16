import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase.js'

const ACCENT = '#1D9E75'

export default function LoginView({ onGoRegister, onGoForgot }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [shakeKey, setShakeKey] = useState(0)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      setShakeKey(k => k + 1) // remount shake animation
    }
    // On success, AuthContext listener redirects automatically
  }

  return (
    <div style={styles.page}>
      <motion.div
        key={shakeKey}
        style={styles.card}
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={shakeKey > 0
          ? { opacity: 1, scale: 1, y: 0, x: [0, -10, 10, -8, 8, -4, 4, 0] }
          : { opacity: 1, scale: 1, y: 0 }
        }
        transition={shakeKey > 0
          ? { duration: 0.45, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 280, damping: 24 }
        }
      >
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

        <h2 style={styles.title}>Inicia sesión</h2>
        <p style={styles.sub}>Accede a tu panel financiero</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        <div style={styles.links}>
          <button style={styles.link} onClick={onGoForgot}>
            Olvidé mi contraseña
          </button>
          <span style={{ color: '#94a3b8' }}>·</span>
          <button style={styles.link} onClick={onGoRegister}>
            ¿No tienes cuenta? <strong>Regístrate</strong>
          </button>
        </div>
      </motion.div>
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
    flexWrap: 'wrap',
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
