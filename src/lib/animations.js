/**
 * animations.js — reusable Framer Motion variants for Brava.
 *
 * Import the variant you need and apply it to <motion.X>:
 *   <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" />
 *
 * All durations respect prefers-reduced-motion via the `transition` field
 * on each variant — wrap with <MotionConfig reducedMotion="user"> in main.jsx
 * to automatically honour the OS setting.
 */

// ── Basic ────────────────────────────────────────────────────────────────────

export const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
}

export const slideUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, y: 8,  transition: { duration: 0.15, ease: 'easeIn' } },
}

export const slideDown = {
  hidden:  { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8,  transition: { duration: 0.15, ease: 'easeIn' } },
}

export const slideLeft = {
  hidden:  { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, x: -12, transition: { duration: 0.15, ease: 'easeIn' } },
}

export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.34, 1.56, 0.64, 1] } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: 'easeIn' } },
}

// ── Stagger container / items ────────────────────────────────────────────────

export const staggerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

export const staggerItem = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.22, ease: 'easeOut' } },
}

// ── View transition (page-level) ─────────────────────────────────────────────

export const viewTransition = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
}

// ── Liquid Glass modals ──────────────────────────────────────────────────────

export const liquidModalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.88,
    y: 20,
    filter: 'blur(8px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 320,
      damping: 26,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 10,
    filter: 'blur(4px)',
    transition: { duration: 0.18, ease: 'easeIn' },
  },
}

export const liquidOverlayVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
}

// ── Toasts ───────────────────────────────────────────────────────────────────

export const liquidToastVariants = {
  hidden:  { opacity: 0, x: 64, scale: 0.9, filter: 'blur(4px)' },
  visible: {
    opacity: 1, x: 0, scale: 1, filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 420, damping: 30 },
  },
  exit: {
    opacity: 0, x: 64, scale: 0.95, filter: 'blur(4px)',
    transition: { duration: 0.18, ease: 'easeIn' },
  },
}

export const liquidToastMobileVariants = {
  hidden:  { opacity: 0, y: 64, scale: 0.9 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 420, damping: 30 },
  },
  exit: {
    opacity: 0, y: 40, scale: 0.95,
    transition: { duration: 0.18 },
  },
}

// ── Auth card ────────────────────────────────────────────────────────────────

export const authCardVariants = {
  hidden:  { opacity: 0, scale: 0.92, y: 16 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 24 },
  },
}

export const shakeVariants = {
  shake: {
    x: [0, -10, 10, -8, 8, -4, 4, 0],
    transition: { duration: 0.5, ease: 'easeInOut' },
  },
}

// ── Drawer (mobile sidebar) ──────────────────────────────────────────────────

export const drawerVariants = {
  hidden:  { x: '-100%' },
  visible: {
    x: 0,
    transition: { type: 'spring', stiffness: 340, damping: 32, mass: 0.9 },
  },
  exit: {
    x: '-100%',
    transition: { type: 'spring', stiffness: 340, damping: 32, mass: 0.9 },
  },
}

// ── Table rows ───────────────────────────────────────────────────────────────

export const rowAppear = {
  hidden:  { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto', transition: { duration: 0.22 } },
  exit:    { opacity: 0, height: 0,      transition: { duration: 0.18 } },
}

// ── Buttons ──────────────────────────────────────────────────────────────────
// Use as whileTap / whileHover props directly on <motion.button>:
//   <motion.button whileTap={tapScale} whileHover={hoverBrighter}>

export const tapScale  = { scale: 0.97, transition: { duration: 0.1 } }
export const hoverLift = { scale: 1.02, transition: { duration: 0.15 } }

// ── Progress bar (animate width from 0 → target) ────────────────────────────
// Use animate={{ width: `${pct}%` }} transition={progressTransition}

export const progressTransition = {
  duration: 0.85,
  ease: [0.34, 1.0, 0.64, 1],
  delay: 0.1,
}
