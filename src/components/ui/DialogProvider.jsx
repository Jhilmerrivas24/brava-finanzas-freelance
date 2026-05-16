import { createContext, useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { liquidModalVariants, liquidOverlayVariants } from '../../lib/animations.js'

export const DialogContext = createContext(null)

// ── Icon helpers ──────────────────────────────────────────────────────────────
function DangerIcon() {
  return (
    <div style={{
      width: 52, height: 52, borderRadius: '50%',
      background: 'rgba(239,68,68,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 16px',
    }}>
      <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
        <path d="M12 9v4M12 17h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          stroke="#ef4444" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

function WarningIcon() {
  return (
    <div style={{
      width: 52, height: 52, borderRadius: '50%',
      background: 'rgba(245,158,11,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 16px',
    }}>
      <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
        <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="1.8"/>
        <path d="M12 8v4M12 16h.01" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

function SuccessIcon() {
  return (
    <div style={{
      width: 52, height: 52, borderRadius: '50%',
      background: 'rgba(29,158,117,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 16px',
    }}>
      <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
        <motion.circle
          cx="12" cy="12" r="10"
          stroke="#1D9E75" strokeWidth="1.8"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4 }}
        />
        <motion.path
          d="M8 12l3 3 5-5"
          stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        />
      </svg>
    </div>
  )
}

function ErrorIcon() {
  return (
    <div style={{
      width: 52, height: 52, borderRadius: '50%',
      background: 'rgba(239,68,68,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 16px',
    }}>
      <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
        <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="1.8"/>
        <path d="M8 8l8 8M16 8l-8 8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

function InfoIcon() {
  return (
    <div style={{
      width: 52, height: 52, borderRadius: '50%',
      background: 'rgba(59,130,246,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 16px',
    }}>
      <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
        <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="1.8"/>
        <path d="M12 11v5M12 8h.01" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

const ICON_MAP = {
  danger:  <DangerIcon />,
  warning: <WarningIcon />,
  success: <SuccessIcon />,
  error:   <ErrorIcon />,
  info:    <InfoIcon />,
}

const GLASS_MAP = {
  danger:  'liquid-glass-danger',
  warning: 'liquid-glass-warning',
  success: 'liquid-glass-brand',
  error:   'liquid-glass-danger',
  info:    'liquid-glass-info',
}

// ── Danger dialog with countdown ─────────────────────────────────────────────
function DangerDialog({ dialog, onConfirm, onCancel, onShakeRef }) {
  const [countdown, setCountdown] = useState(2)
  const [shakeKey, setShakeKey] = useState(0)

  // expose shake to parent
  onShakeRef.current = () => setShakeKey(k => k + 1)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  return (
    <>
      {ICON_MAP.danger}
      <h3 style={titleStyle}>{dialog.title || `¿Eliminar ${dialog.itemName}?`}</h3>
      {dialog.message && <p style={bodyStyle}>{dialog.message}</p>}
      <div style={footStyle}>
        <button style={cancelBtnStyle} onClick={onCancel}>Cancelar</button>
        <motion.button
          key={shakeKey}
          style={{
            ...confirmBtnStyle,
            background: countdown > 0 ? 'rgba(239,68,68,0.4)' : '#ef4444',
            cursor: countdown > 0 ? 'not-allowed' : 'pointer',
          }}
          disabled={countdown > 0}
          onClick={onConfirm}
          animate={shakeKey > 0
            ? { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.3 } }
            : {}}
        >
          {countdown > 0 ? `Eliminar (${countdown}s)` : 'Eliminar'}
        </motion.button>
      </div>
    </>
  )
}

// ── Generic dialog ────────────────────────────────────────────────────────────
function GenericDialog({ dialog, onConfirm, onCancel, onShakeRef }) {
  const [shakeKey, setShakeKey] = useState(0)
  onShakeRef.current = () => setShakeKey(k => k + 1)

  const type = dialog.type || 'info'
  const isReadOnly = type === 'success' || type === 'error' || type === 'info'

  return (
    <>
      {ICON_MAP[type]}
      <h3 style={titleStyle}>{dialog.title}</h3>
      {dialog.message && <p style={bodyStyle}>{dialog.message}</p>}
      <div style={footStyle}>
        {!isReadOnly && (
          <button style={cancelBtnStyle} onClick={onCancel}>
            {dialog.cancelText || 'Cancelar'}
          </button>
        )}
        <button
          style={{
            ...confirmBtnStyle,
            background: type === 'warning' ? '#f59e0b'
              : type === 'success'  ? '#1D9E75'
              : type === 'error'    ? '#ef4444'
              : '#3b82f6',
          }}
          onClick={onConfirm}
        >
          {dialog.confirmText || 'Entendido'}
        </button>
      </div>
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const titleStyle = {
  margin: '0 0 8px',
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--ink, #f1f5f9)',
  textAlign: 'center',
  letterSpacing: '-0.02em',
}

const bodyStyle = {
  margin: '0 0 20px',
  fontSize: 14,
  color: 'var(--ink-mute, #a8a29e)',
  textAlign: 'center',
  lineHeight: 1.55,
}

const footStyle = {
  display: 'flex',
  gap: 10,
  justifyContent: 'center',
  flexWrap: 'wrap',
}

const cancelBtnStyle = {
  flex: 1,
  padding: '10px 18px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.07)',
  color: 'var(--ink-soft, #d6d3d1)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  minHeight: 42,
}

const confirmBtnStyle = {
  flex: 1,
  padding: '10px 18px',
  borderRadius: 10,
  border: 'none',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  minHeight: 42,
  transition: 'opacity .15s',
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const [shakeKey, setShakeKey] = useState(0)
  const onShakeRef = useRef(() => {})
  const resolveRef = useRef(null)

  const close = useCallback((result) => {
    resolveRef.current?.(result)
    resolveRef.current = null
    setDialog(null)
  }, [])

  const handleOverlayClick = useCallback(() => {
    // Shake the card instead of closing
    setShakeKey(k => k + 1)
    onShakeRef.current?.()
  }, [])

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Danger dialog — for destructive actions.
   * Returns a Promise<boolean>.
   */
  const danger = useCallback(({ title, message, itemName } = {}) => {
    return new Promise(resolve => {
      resolveRef.current = resolve
      setDialog({ variant: 'danger', title, message, itemName })
    })
  }, [])

  /**
   * Confirm dialog — for general confirmations.
   * Returns a Promise<boolean>.
   */
  const confirm = useCallback(({ title, message, confirmText, cancelText } = {}) => {
    return new Promise(resolve => {
      resolveRef.current = resolve
      setDialog({ variant: 'generic', type: 'warning', title, message, confirmText, cancelText })
    })
  }, [])

  /**
   * Alert-style dialogs — info / success / error.
   * Returns a Promise<void>.
   */
  const alert = useCallback(({ type = 'info', title, message, confirmText } = {}) => {
    return new Promise(resolve => {
      resolveRef.current = resolve
      setDialog({ variant: 'generic', type, title, message, confirmText })
    })
  }, [])

  const glassClass = dialog ? (GLASS_MAP[dialog.type] || GLASS_MAP[dialog.variant] || 'liquid-glass') : ''

  return (
    <DialogContext.Provider value={{ danger, confirm, alert }}>
      {children}

      <AnimatePresence>
        {dialog && (
          <>
            {/* Overlay */}
            <motion.div
              variants={liquidOverlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={handleOverlayClick}
              className="liquid-overlay"
              style={{
                position: 'fixed', inset: 0,
                zIndex: 8000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20,
              }}
            >
              {/* Card */}
              <motion.div
                key={shakeKey}
                variants={liquidModalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={e => e.stopPropagation()}
                className={glassClass}
                style={{
                  padding: '32px 28px 26px',
                  width: '100%',
                  maxWidth: 400,
                  borderRadius: 24,
                  fontFamily: 'inherit',
                }}
              >
                {dialog.variant === 'danger'
                  ? <DangerDialog
                      dialog={dialog}
                      onConfirm={() => close(true)}
                      onCancel={() => close(false)}
                      onShakeRef={onShakeRef}
                    />
                  : <GenericDialog
                      dialog={dialog}
                      onConfirm={() => close(true)}
                      onCancel={() => close(false)}
                      onShakeRef={onShakeRef}
                    />
                }
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  )
}
