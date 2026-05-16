import { useState, useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem } from '../lib/animations.js'

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function daysUntil(dueDay, year, month) {
  if (!dueDay) return null
  const today = new Date()
  const due   = new Date(year, month - 1, dueDay)
  return Math.ceil((due - today) / 86400000)
}

function DayBadge({ dueDay, year, month, isChecked }) {
  if (!dueDay) return <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>—</span>
  if (isChecked) return <span style={{ fontSize: 11, color: 'var(--good)', fontWeight: 600 }}>✓ Pagado</span>

  const diff = daysUntil(dueDay, year, month)
  const now  = new Date()
  const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month

  if (!isCurrentMonth) {
    return <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Día {dueDay}</span>
  }

  let color = 'var(--ink-faint)'
  let text  = `Día ${dueDay}`
  if (diff < 0)       { color = 'var(--bad)';  text = 'Vencido'    }
  else if (diff === 0){ color = 'var(--bad)';  text = 'Hoy'        }
  else if (diff <= 3) { color = 'var(--bad)';  text = `${diff}d`   }
  else if (diff <= 7) { color = 'var(--warn)'; text = `${diff}d`   }

  return (
    <span style={{
      fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
      background: `color-mix(in srgb, ${color} 12%, var(--bg-elev))`,
      color,
    }}>
      {text}
    </span>
  )
}

// ── Quick-pay modal for loans / credit lines ──────────────────────────────────
function QuickPayModal({ item, accounts, onConfirm, onClose }) {
  const [amount,    setAmount]    = useState(String(item.defaultAmount ?? ''))
  const [accountId, setAccountId] = useState(null)
  const valid = Number(amount) > 0
  const active = accounts.filter(a => a.activa !== false)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{item.tipoLabel} · Confirmar</div>
            <h2 className="modal-title">{item.nombre}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          {item.saldo != null && (
            <div style={{ padding: '8px 12px', background: 'var(--bg-elev)', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-mute)' }}>Saldo actual</span>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--bad)' }}>{fmtPEN(item.saldo)}</span>
              </div>
              {Number(amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: 'var(--ink-mute)' }}>Tras el pago</span>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--good)' }}>
                    {fmtPEN(Math.max(0, item.saldo - Number(amount)))}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="field">
            <label>Monto pagado</label>
            <div className="amount-input">
              <span className="amount-prefix mono">S/</span>
              <input
                type="text" inputMode="decimal" className="amount-field mono"
                value={amount} onChange={e => setAmount(e.target.value)}
                autoFocus placeholder="0.00"
              />
            </div>
          </div>

          {active.length > 0 && (
            <div className="field">
              <label>Debitar de cuenta (opcional)</label>
              <select value={accountId ?? ''} onChange={e => setAccountId(e.target.value || null)}>
                <option value="">— Sin asignar —</option>
                {active.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nombre ?? a.bank} — {fmtPEN(a.saldo ?? a.balance ?? 0)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onConfirm({ amount: Number(amount), accountId })}>
            <Icon name="check" size={14}/> Confirmar pago
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Payment row ───────────────────────────────────────────────────────────────
function PayRow({ item, isChecked, onCheck, onUncheck, year, month }) {
  const bg = isChecked ? 'color-mix(in srgb, var(--good) 5%, var(--bg))' : 'var(--bg)'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        background: bg,
        transition: 'background 0.2s',
        opacity: isChecked ? 0.7 : 1,
      }}
    >
      {/* Checkbox */}
      <button
        style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          border: `2px solid ${isChecked ? 'var(--good)' : 'var(--border)'}`,
          background: isChecked ? 'var(--good)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onClick={isChecked ? onUncheck : onCheck}
        title={isChecked ? 'Marcar como pendiente' : 'Marcar como pagado'}
      >
        {isChecked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <path d="M5 12l5 5L20 7"/>
          </svg>
        )}
      </button>

      {/* Type dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: item.color,
      }} />

      {/* Name + category */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: isChecked ? 400 : 600, fontSize: 13,
          textDecoration: isChecked ? 'line-through' : 'none',
          color: isChecked ? 'var(--ink-mute)' : 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.nombre}
        </div>
        {item.sub && (
          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{item.sub}</div>
        )}
      </div>

      {/* Due date badge */}
      <DayBadge dueDay={item.dueDay} year={year} month={month} isChecked={isChecked} />

      {/* Amount */}
      <div className="mono" style={{
        fontSize: 13, fontWeight: 700, textAlign: 'right', minWidth: 90,
        color: isChecked ? 'var(--ink-mute)' : item.amountColor ?? 'var(--ink)',
        textDecoration: isChecked ? 'line-through' : 'none',
      }}>
        {fmtPEN(item.amount)}
      </div>
    </motion.div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, icon, color, items, checks, year, month, onCheck, onUncheck }) {
  const [open, setOpen] = useState(true)
  if (items.length === 0) return null

  const paidCount = items.filter(it => checks[`${it.type}-${it.id}-${year}-${String(month).padStart(2,'0')}`]).length

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        style={{
          width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center',
          gap: 8, padding: '8px 16px', background: 'var(--bg-elev)',
          border: 'none', cursor: 'pointer',
          borderTop: '1px solid var(--border)', borderBottom: open ? 'none' : '1px solid var(--border)',
          borderRadius: open ? '10px 10px 0 0' : 10,
        }}
        onClick={() => setOpen(v => !v)}
      >
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 13, color }}>{title}</span>
        <span style={{
          fontSize: 11, padding: '1px 6px', borderRadius: 4,
          background: `color-mix(in srgb, ${color} 15%, var(--bg-elev))`,
          color, fontWeight: 600,
        }}>
          {paidCount}/{items.length}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
          {fmtPEN(items.reduce((s, it) => s + it.amount, 0))}
        </span>
        <Icon name="chevron" size={12} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              overflow: 'hidden',
              border: '1px solid var(--border)',
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
            }}
          >
            {items.map(item => {
              const ym  = `${year}-${String(month).padStart(2, '0')}`
              const key = `${item.type}-${item.id}-${ym}`
              return (
                <PayRow
                  key={item.id}
                  item={item}
                  isChecked={!!checks[key]}
                  year={year}
                  month={month}
                  onCheck={() => onCheck(item)}
                  onUncheck={() => onUncheck(item.type, item.id, ym)}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function PaymentsView({
  bills        = [],
  loans        = [],
  creditLines  = [],
  accounts     = [],
  monthlyChecks = {},
  onToggleMonthlyCheck,
  onRegisterLoanPayment,
  onUpdateCreditUsado,
  onAddAccountMovement,
}) {
  const now = new Date()
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [quickPay, setQuickPay] = useState(null) // null | item

  const ym = `${selYear}-${String(selMonth).padStart(2, '0')}`

  function prevMonth() {
    if (selMonth === 1) { setSelYear(y => y - 1); setSelMonth(12) }
    else setSelMonth(m => m - 1)
  }
  function nextMonth() {
    if (selMonth === 12) { setSelYear(y => y + 1); setSelMonth(1) }
    else setSelMonth(m => m + 1)
  }
  const isCurrentMonth = selYear === now.getFullYear() && selMonth === (now.getMonth() + 1)

  // ── Build item lists ────────────────────────────────────────────────────────
  const billItems = useMemo(() => bills
    .filter(b => b.active !== false)
    .map(b => ({
      type:    'bill',
      id:      b.id,
      nombre:  b.name ?? b.nombre ?? '(sin nombre)',
      sub:     b.category ?? null,
      amount:  b.amount ?? 0,
      dueDay:  b.dueDay ?? null,
      color:   '#3b82f6',
    }))
    .sort((a, b) => (a.dueDay ?? 99) - (b.dueDay ?? 99)),
  [bills])

  const loanItems = useMemo(() => loans
    .filter(l => l.activo !== false && (l.saldoPendiente ?? 1) > 0)
    .map(l => ({
      type:         'loan',
      id:           l.id,
      nombre:       l.nombre,
      sub:          l.banco ? `${l.banco} · Cuota mensual` : 'Cuota mensual',
      amount:       l.cuota ?? 0,
      dueDay:       l.diaPago ?? null,
      color:        '#f59e0b',
      tipoLabel:    'Préstamo',
      saldo:        l.saldoPendiente ?? 0,
      defaultAmount: l.cuota ?? 0,
      // Extra for quick-pay
      _raw: l,
    }))
    .sort((a, b) => (a.dueDay ?? 99) - (b.dueDay ?? 99)),
  [loans])

  const creditItems = useMemo(() => creditLines
    .filter(cl => cl.activa !== false && (cl.usado ?? 0) > 0)
    .map(cl => ({
      type:         'credit',
      id:           cl.id,
      nombre:       cl.nombre,
      sub:          cl.banco ? `${cl.banco} · Saldo actual` : 'Saldo actual',
      amount:       cl.usado ?? 0,
      amountColor:  'var(--bad)',
      dueDay:       cl.fechaPago ?? null,
      color:        '#ef4444',
      tipoLabel:    'Tarjeta',
      saldo:        cl.usado ?? 0,
      defaultAmount: cl.usado ?? 0,
      _raw: cl,
    }))
    .sort((a, b) => (a.dueDay ?? 99) - (b.dueDay ?? 99)),
  [creditLines])

  const allItems = [...billItems, ...loanItems, ...creditItems]
  const total    = allItems.reduce((s, it) => s + it.amount, 0)
  const paidItems = allItems.filter(it => monthlyChecks[`${it.type}-${it.id}-${ym}`])
  const paidTotal = paidItems.reduce((s, it) => s + it.amount, 0)
  const pending   = total - paidTotal
  const pct       = total > 0 ? paidTotal / total : 0

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleCheck(item) {
    if (item.type === 'bill') {
      // Simple toggle — no financial sync for recurring bills
      onToggleMonthlyCheck('bill', item.id, ym, true)
    } else {
      // Loans / credit lines → open quick-pay modal
      setQuickPay(item)
    }
  }

  function handleUncheck(type, itemId, ym) {
    onToggleMonthlyCheck(type, itemId, ym, false)
  }

  function handleQuickPayConfirm({ amount, accountId }) {
    const item = quickPay
    if (item.type === 'loan') {
      onRegisterLoanPayment({
        loanId:    item.id,
        amount,
        capital:   amount,
        interes:   0,
        date:      new Date().toISOString().split('T')[0],
        accountId,
      })
    } else if (item.type === 'credit') {
      onUpdateCreditUsado(item.id, -amount)
      if (accountId && onAddAccountMovement) {
        onAddAccountMovement({
          id:          'mov-' + Date.now(),
          accountId,
          type:        'expense',
          description: `Pago tarjeta: ${item.nombre}`,
          amount,
          delta:       -amount,
          date:        new Date().toISOString().split('T')[0],
        })
      }
    }
    // Mark as paid in checklist
    onToggleMonthlyCheck(item.type, item.id, ym, true)
    setQuickPay(null)
  }

  // Alerts: items due within 5 days, not yet paid
  const urgent = isCurrentMonth
    ? allItems.filter(it => {
        if (monthlyChecks[`${it.type}-${it.id}-${ym}`]) return false
        const d = daysUntil(it.dueDay, selYear, selMonth)
        return d !== null && d >= 0 && d <= 5
      })
    : []

  return (
    <div className="view">
      {/* Header */}
      <header className="view-header">
        <div>
          <div className="eyebrow">Checklist financiero</div>
          <h1>Pagos del mes</h1>
          <p className="lede">
            Todos tus compromisos en un solo lugar — gastos fijos, cuotas y tarjetas.
          </p>
        </div>
      </header>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-xs" onClick={prevMonth}>← Anterior</button>
        <div style={{ fontWeight: 700, fontSize: 16, minWidth: 140, textAlign: 'center' }}>
          {MONTHS_ES[selMonth - 1]} {selYear}
          {isCurrentMonth && (
            <span style={{
              marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 4,
              background: 'color-mix(in srgb, var(--accent) 15%, var(--bg-elev))',
              color: 'var(--accent)', fontWeight: 600,
            }}>Este mes</span>
          )}
        </div>
        <button className="btn btn-ghost btn-xs" onClick={nextMonth}>Siguiente →</button>
      </div>

      {/* Urgency alert */}
      {urgent.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, var(--bad) 10%, var(--bg-elev))',
          border: '1px solid color-mix(in srgb, var(--bad) 30%, transparent)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13,
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--bad)', marginBottom: 4 }}>
              {urgent.length} pago{urgent.length > 1 ? 's' : ''} próximo{urgent.length > 1 ? 's' : ''}
            </div>
            {urgent.map(it => {
              const d = daysUntil(it.dueDay, selYear, selMonth)
              return (
                <div key={it.id} style={{ color: 'var(--ink-mute)' }}>
                  <strong style={{ color: 'var(--ink)' }}>{it.nombre}</strong>
                  <span className="mono"> {fmtPEN(it.amount)}</span>
                  <span> — {d === 0 ? 'hoy' : `en ${d} día${d !== 1 ? 's' : ''}`}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Progress summary */}
      {allItems.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>
              <strong style={{ color: 'var(--ink)', fontSize: 15 }}>{paidItems.length}</strong> de {allItems.length} pagos completados
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: pct >= 1 ? 'var(--good)' : 'var(--ink)' }}>
              {(pct * 100).toFixed(0)}%
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden', marginBottom: 14 }}>
            <motion.div
              style={{ height: '100%', background: pct >= 1 ? 'var(--good)' : 'var(--accent)', borderRadius: 5 }}
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>

          {/* Amounts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {[
              { label: 'Total del mes', value: total,    color: 'var(--ink)' },
              { label: 'Pagado',        value: paidTotal, color: 'var(--good)' },
              { label: 'Pendiente',     value: pending,   color: pending > 0 ? 'var(--bad)' : 'var(--ink-faint)' },
            ].map((col, i) => (
              <div key={col.label} style={{ padding: '10px 14px', borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 4 }}>{col.label}</div>
                <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: col.color }}>
                  {fmtPEN(col.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allItems.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <h3 style={{ marginBottom: 8 }}>Sin pagos este mes</h3>
          <p style={{ color: 'var(--ink-mute)', maxWidth: 340, margin: '0 auto 0' }}>
            Cuando tengas gastos fijos, préstamos o tarjetas registradas, aparecerán aquí como un checklist mensual.
          </p>
        </div>
      )}

      {/* Sections */}
      <Section
        title="Gastos fijos"
        icon="🔵"
        color="#3b82f6"
        items={billItems}
        checks={monthlyChecks}
        year={selYear}
        month={selMonth}
        onCheck={handleCheck}
        onUncheck={handleUncheck}
      />
      <Section
        title="Préstamos"
        icon="🟡"
        color="#f59e0b"
        items={loanItems}
        checks={monthlyChecks}
        year={selYear}
        month={selMonth}
        onCheck={handleCheck}
        onUncheck={handleUncheck}
      />
      <Section
        title="Tarjetas de crédito"
        icon="🔴"
        color="#ef4444"
        items={creditItems}
        checks={monthlyChecks}
        year={selYear}
        month={selMonth}
        onCheck={handleCheck}
        onUncheck={handleUncheck}
      />

      {/* Quick-pay modal */}
      {quickPay && (
        <QuickPayModal
          item={quickPay}
          accounts={accounts}
          onConfirm={handleQuickPayConfirm}
          onClose={() => setQuickPay(null)}
        />
      )}
    </div>
  )
}
