import { createContext, useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { liquidToastVariants, liquidToastMobileVariants } from '../../lib/animations.js'

export const ToastContext = createContext(null)

// ── Icons ─────────────────────────────────────────────────────────────────────
const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
      <circle cx="10" cy="10" r="9" fill="rgba(29,158,117,0.2)" stroke="#1D9E75" strokeWidth="1.5"/>
      <path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
      <circle cx="10" cy="10" r="9" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="1.5"/>
      <path d="M7 7l6 6M13 7l-6 6" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
      <path d="M10 2L18.5 17H1.5L10 2z" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 8v4M10 14.5v.5" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
      <circle cx="10" cy="10" r="9" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="1.5"/>
      <path d="M10 9v5M10 6.5v.5" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
}

const COLORS = {
  success: '#1D9E75',
  error:   '#ef4444',
  warning: '#f59e0b',
  info:    '#3b82f6',
}

const GLASS_CLASS = {
  success: 'liquid-glass-brand',
  error:   'liquid-glass-danger',
  warning: 'liquid-glass-warning',
  info:    'liquid-glass-info',
}

const DURATION = 4000 // ms before auto-dismiss

// ── Single Toast item ──────────────────────────────────────────────────────────
function ToastItem({ id, type, title, message, onDismiss, isMobile }) {
  const variants = isMobile ? liquidToastMobileVariants : liquidToastVariants
  const color = COLORS[type] || COLORS.info

  return (
    <motion.div
      layout
      key={id}
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 16,
        position: 'relative',
        overflow: 'hidden',
        minWidth: isMobile ? 'min(90vw, 340px)' : 320,
        maxWidth: isMobile ? 'min(90vw, 360px)' : 340,
        cursor: 'default',
      }}
      className={GLASS_CLASS[type] || 'liquid-glass'}
    >
      {/* Icon */}
      <div style={{ flexShrink: 0, marginTop: 1 }}>{ICONS[type]}</div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: 'var(--ink, #f1f5f9)',
          lineHeight: 1.35,
          marginBottom: message ? 2 : 0,
        }}>
          {title}
        </div>
        {message && (
          <div style={{ fontSize: 12.5, color: 'var(--ink-mute, #a8a29e)', lineHeight: 1.4 }}>
            {message}
          </div>
        )}
      </div>

      {/* Close */}
      <button
        onClick={() => onDismiss(id)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink-faint, #57534e)',
          padding: 2,
          lineHeight: 1,
          flexShrink: 0,
          marginTop: -1,
        }}
        aria-label="Cerrar"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Progress bar */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 0, left: 0,
          height: 2,
          background: color,
          opacity: 0.6,
          borderRadius: '0 0 0 16px',
        }}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: DURATION / 1000, ease: 'linear' }}
      />
    </motion.div>
  )
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const isMobileRef = useRef(false)

  // Detect mobile
  if (typeof window !== 'undefined') {
    isMobileRef.current = window.innerWidth < 768
  }

  const dismiss = useCallback((id) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((type, title, message) => {
    const id = Date.now() + Math.random()
    setToasts(ts => {
      // Max 3 toasts at once
      const trimmed = ts.length >= 3 ? ts.slice(1) : ts
      return [...trimmed, { id, type, title, message }]
    })
    setTimeout(() => dismiss(id), DURATION + 300)
  }, [dismiss])

  const toast = {
    success: (title, message) => addToast('success', title, message),
    error:   (title, message) => addToast('error',   title, message),
    warning: (title, message) => addToast('warning', title, message),
    info:    (title, message) => addToast('info',    title, message),
  }

  const isMobile = isMobileRef.current

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast container */}
      <div style={{
        position: 'fixed',
        zIndex: 9999,
        // Desktop: top-right. Mobile: bottom-center
        ...(isMobile
          ? { bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }
          : { top: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }
        ),
        pointerEvents: 'none',
      }}>
        <AnimatePresence mode="sync">
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <ToastItem
                {...t}
                onDismiss={dismiss}
                isMobile={isMobile}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
