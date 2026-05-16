import { useState, useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import Bar from '../components/Bar.jsx'
import { fmtPEN } from '../data.js'
import { useDialog } from '../hooks/useDialog.js'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, hoverLift, tapScale } from '../lib/animations.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const TIPO_LABEL = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', otro: 'Tarjeta' }
const TIPO_COLOR = { visa: '#1a1f71', mastercard: '#eb001b', amex: '#007bc1', otro: '#6b7280' }
const TIPO_BG    = { visa: '#e8eaf6', mastercard: '#fce4ec', amex: '#e1f5fe', otro: '#f3f4f6' }

function utilizationColor(pct) {
  if (pct < 0.3) return 'var(--good)'
  if (pct < 0.7) return 'var(--warn)'
  return 'var(--bad)'
}

// ── Credit line CRUD modal ────────────────────────────────────────────────────
function CreditLineModal({ initial, onSave, onClose }) {
  const defaults = {
    nombre:     initial?.nombre     ?? '',
    banco:      initial?.banco      ?? '',
    tipo:       initial?.tipo       ?? 'visa',
    limite:     String(initial?.limite   ?? ''),
    usado:      String(initial?.usado    ?? '0'),
    moneda:     initial?.moneda     ?? 'PEN',
    fechaCorte: String(initial?.fechaCorte ?? ''),
    fechaPago:  String(initial?.fechaPago  ?? ''),
    activa:     initial?.activa     ?? true,
  }
  const [form, setForm] = useState(defaults)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.nombre.trim() && Number(form.limite) > 0

  const limite   = Number(form.limite)  || 0
  const usado    = Number(form.usado)   || 0
  const disponible = Math.max(0, limite - usado)
  const pct      = limite > 0 ? usado / limite : 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Agregar'} tarjeta</div>
            <h2 className="modal-title">{form.nombre || 'Nueva tarjeta'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <div className="field" style={{ flex: 2 }}>
              <label>Nombre de la tarjeta</label>
              <input type="text" value={form.nombre} autoFocus
                onChange={e => set('nombre', e.target.value)}
                placeholder="Ej. Visa BCP Gold, Mastercard Interbank…" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Banco</label>
              <input type="text" value={form.banco}
                onChange={e => set('banco', e.target.value)}
                placeholder="BCP, BBVA…" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Red de pago</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">American Express</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="field">
              <label>Moneda</label>
              <select value={form.moneda} onChange={e => set('moneda', e.target.value)}>
                <option value="PEN">Soles (PEN)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Límite de crédito</label>
              <div className="amount-input">
                <span className="amount-prefix mono">{form.moneda === 'USD' ? 'US$' : 'S/'}</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={form.limite} onChange={e => set('limite', e.target.value)} placeholder="0.00"/>
              </div>
            </div>
            <div className="field">
              <label>Saldo usado actual</label>
              <div className="amount-input">
                <span className="amount-prefix mono">{form.moneda === 'USD' ? 'US$' : 'S/'}</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={form.usado} onChange={e => set('usado', e.target.value)} placeholder="0.00"/>
              </div>
            </div>
          </div>

          {/* Preview bar */}
          {limite > 0 && (
            <div style={{
              padding: '12px 14px', background: 'var(--bg-sunk)', borderRadius: 8, marginBottom: 4,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-mute)', marginBottom: 8 }}>
                <span>Usado: {fmtPEN(usado)}</span>
                <span style={{ color: utilizationColor(pct), fontWeight: 700 }}>{(pct * 100).toFixed(0)}%</span>
                <span>Disponible: {fmtPEN(disponible)}</span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.min(pct * 100, 100)}%`,
                  background: utilizationColor(pct),
                  transition: 'width 0.3s ease',
                  borderRadius: 3,
                }} />
              </div>
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label>Día de corte</label>
              <input type="number" min={1} max={31} value={form.fechaCorte}
                onChange={e => set('fechaCorte', e.target.value)} placeholder="Ej. 15" />
            </div>
            <div className="field">
              <label>Día de pago</label>
              <input type="number" min={1} max={31} value={form.fechaPago}
                onChange={e => set('fechaPago', e.target.value)} placeholder="Ej. 25" />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.activa} onChange={e => set('activa', e.target.checked)} />
            <span>Tarjeta activa</span>
          </label>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onSave({
              nombre:     form.nombre,
              banco:      form.banco,
              tipo:       form.tipo,
              limite:     Number(form.limite)     || 0,
              usado:      Number(form.usado)      || 0,
              moneda:     form.moneda,
              fechaCorte: Number(form.fechaCorte) || null,
              fechaPago:  Number(form.fechaPago)  || null,
              activa:     form.activa,
            })}>
            <Icon name="check" size={14}/> {initial ? 'Guardar cambios' : 'Agregar tarjeta'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Payment registration modal ────────────────────────────────────────────────
function PaymentModal({ creditLine, accounts, onConfirm, onClose }) {
  const [amount, setAmount]       = useState('')
  const [accountId, setAccountId] = useState(null)
  const valid = Number(amount) > 0

  const activeAccounts = accounts.filter(a => a.activa !== false)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{creditLine.nombre} · Pago</div>
            <h2 className="modal-title">Registrar pago</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          {/* Current state */}
          <div style={{ padding: '10px 14px', background: 'var(--bg-elev)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--ink-mute)' }}>Saldo actual</span>
              <span className="mono" style={{ color: 'var(--bad)', fontWeight: 700 }}>{fmtPEN(creditLine.usado ?? 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-mute)' }}>Tras el pago</span>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--good)' }}>
                {fmtPEN(Math.max(0, (creditLine.usado ?? 0) - (Number(amount) || 0)))}
              </span>
            </div>
          </div>

          <div className="field">
            <label>Monto pagado</label>
            <div className="amount-input">
              <span className="amount-prefix mono">S/</span>
              <input type="text" inputMode="decimal" className="amount-field mono"
                value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" autoFocus />
            </div>
          </div>

          {activeAccounts.length > 0 && (
            <div className="field">
              <label>Debitar de cuenta (opcional)</label>
              <select value={accountId ?? ''} onChange={e => setAccountId(e.target.value || null)}>
                <option value="">— Sin asignar —</option>
                {activeAccounts.map(a => (
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
            <Icon name="check" size={14}/> Registrar pago
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card visual ───────────────────────────────────────────────────────────────
function CreditCard({ cl, onEdit, onDelete, onPay, variableExpenses }) {
  const usado     = cl.usado    ?? 0
  const limite    = cl.limite   ?? 0
  const disponible = Math.max(0, limite - usado)
  const pct       = limite > 0 ? Math.min(usado / limite, 1) : 0
  const uColor    = utilizationColor(pct)

  // Charges from variable expenses this month
  const now = new Date()
  const thisMonthCharges = (variableExpenses || [])
    .filter(e => {
      if (e.paymentMethod?.type !== 'tarjeta') return false
      if (e.paymentMethod.creditLineId !== cl.id) return false
      if (!e.date) return false
      const d = new Date(e.date)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((s, e) => s + (e.amount || 0), 0)

  // Days until payment due
  const today = now.getDate()
  let daysUntilPay = cl.fechaPago ? cl.fechaPago - today : null
  if (daysUntilPay !== null && daysUntilPay < 0) daysUntilPay += 30

  const urgente = daysUntilPay !== null && daysUntilPay <= 5 && usado > 0

  return (
    <motion.div
      className="card"
      variants={staggerItem}
      whileHover={hoverLift}
      whileTap={tapScale}
      style={{
        border: urgente ? '2px solid var(--bad)' : '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Urgency indicator */}
      {urgente && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 3, background: 'var(--bad)',
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800,
            background: TIPO_BG[cl.tipo] ?? TIPO_BG.otro,
            color: TIPO_COLOR[cl.tipo] ?? TIPO_COLOR.otro,
            letterSpacing: '0.04em',
          }}>
            {TIPO_LABEL[cl.tipo] ?? 'Card'}
          </div>
          {cl.banco && (
            <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{cl.banco}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-xs btn-ghost" onClick={() => onEdit(cl)} title="Editar">
            <Icon name="edit" size={11} />
          </button>
          <button className="btn btn-xs btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => onDelete(cl)} title="Eliminar">
            <Icon name="trash" size={11} />
          </button>
        </div>
      </div>

      {/* Name */}
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{cl.nombre}</div>
      {cl.moneda !== 'PEN' && (
        <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 8 }}>{cl.moneda}</div>
      )}

      {/* Amounts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-mute)', marginBottom: 6 }}>
        <span>Usado</span>
        <span>Límite</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="mono" style={{ fontWeight: 700, fontSize: 18, color: uColor }}>{fmtPEN(usado)}</span>
        <span className="mono" style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink-mute)' }}>{fmtPEN(limite)}</span>
      </div>

      {/* Utilization bar */}
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{
          height: '100%', width: `${pct * 100}%`, background: uColor,
          transition: 'width 0.5s ease', borderRadius: 3,
        }} />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-mute)', marginBottom: 14 }}>
        <span style={{ color: uColor, fontWeight: 600 }}>{(pct * 100).toFixed(0)}% utilización</span>
        <span>Disponible: <strong>{fmtPEN(disponible)}</strong></span>
      </div>

      {/* Meta row: corte / pago / cargos mes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {cl.fechaCorte && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-sunk)', color: 'var(--ink-mute)' }}>
            Corte: día {cl.fechaCorte}
          </span>
        )}
        {cl.fechaPago && (
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 4,
            background: urgente ? 'color-mix(in srgb, var(--bad) 15%, var(--bg-elev))' : 'var(--bg-sunk)',
            color: urgente ? 'var(--bad)' : 'var(--ink-mute)',
            fontWeight: urgente ? 700 : 400,
          }}>
            {urgente ? `⚠ Pago en ${daysUntilPay}d` : `Pago: día ${cl.fechaPago}`}
          </span>
        )}
        {thisMonthCharges > 0 && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'color-mix(in srgb, #8b5cf6 12%, var(--bg-elev))', color: '#8b5cf6' }}>
            Cargos mes: {fmtPEN(thisMonthCharges)}
          </span>
        )}
      </div>

      {/* Pay button */}
      {usado > 0 && (
        <button
          className="btn btn-soft btn-full"
          style={{ borderTop: '1px solid var(--border)', paddingTop: 10, borderRadius: 0, marginLeft: -16, marginRight: -16, marginBottom: -16, paddingBottom: 12 }}
          onClick={() => onPay(cl)}
        >
          <Icon name="check" size={13} /> Registrar pago
        </button>
      )}
    </motion.div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function CreditLinesView({
  creditLines = [],
  accounts = [],
  variableExpenses = [],
  onAddCreditLine,
  onEditCreditLine,
  onDeleteCreditLine,
  onUpdateCreditUsado,
  onAddAccountMovement,
}) {
  const dialog = useDialog()
  const [modal, setModal]       = useState(null) // null | 'new' | { cl }
  const [payModal, setPayModal] = useState(null) // null | { cl }

  const active   = creditLines.filter(cl => cl.activa !== false)
  const inactive = creditLines.filter(cl => cl.activa === false)

  const totalLimite    = active.reduce((s, cl) => s + (cl.limite ?? 0), 0)
  const totalUsado     = active.reduce((s, cl) => s + (cl.usado  ?? 0), 0)
  const totalDisponible = Math.max(0, totalLimite - totalUsado)
  const utilizacion    = totalLimite > 0 ? totalUsado / totalLimite : 0

  // Charges this month from variable expenses
  const now = new Date()
  const totalCargasMes = (variableExpenses || [])
    .filter(e => {
      if (e.paymentMethod?.type !== 'tarjeta') return false
      if (!e.date) return false
      const d = new Date(e.date)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((s, e) => s + (e.amount || 0), 0)

  function handleSave(data) {
    if (modal === 'new') {
      onAddCreditLine({ ...data, id: 'cl-' + Date.now(), createdAt: new Date().toISOString() })
    } else {
      onEditCreditLine({ ...modal.cl, ...data })
    }
    setModal(null)
  }

  async function handleDelete(cl) {
    const ok = await dialog.danger({ title: 'Eliminar tarjeta', itemName: cl.nombre })
    if (ok) onDeleteCreditLine(cl.id)
  }

  function handlePay(cl) {
    setPayModal({ cl })
  }

  function confirmPayment({ amount, accountId }) {
    const { cl } = payModal
    // Reduce credit line usado
    onUpdateCreditUsado(cl.id, -amount)
    // Optionally debit account
    if (accountId && onAddAccountMovement) {
      onAddAccountMovement({
        id:          'mov-' + Date.now(),
        accountId,
        type:        'expense',
        description: `Pago tarjeta: ${cl.nombre}`,
        amount,
        delta:       -amount,
        date:        new Date().toISOString().split('T')[0],
      })
    }
    setPayModal(null)
  }

  return (
    <div className="view">
      {/* Header */}
      <header className="view-header">
        <div>
          <div className="eyebrow">Crédito rotativo</div>
          <h1>Tarjetas de crédito</h1>
          <p className="lede">
            Controla tu deuda, utilización y fechas de pago. Los gastos cargados a tarjeta se sincronizan automáticamente.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14} /> Nueva tarjeta
          </button>
        </div>
      </header>

      {/* Summary KPIs */}
      <motion.section
        className="kpi-row"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        style={{ marginBottom: 28 }}
      >
        <motion.div className="kpi kpi-accent" variants={staggerItem} whileHover={hoverLift}>
          <div className="kpi-label">Total límite</div>
          <div className="kpi-value">{fmtPEN(totalLimite)}</div>
          <div className="kpi-foot">{active.length} tarjeta(s) activa(s)</div>
        </motion.div>
        <motion.div className="kpi" variants={staggerItem} whileHover={hoverLift}>
          <div className="kpi-label">Deuda total</div>
          <div className="kpi-value" style={{ color: totalUsado > 0 ? 'var(--bad)' : 'var(--ink-mute)' }}>
            {totalUsado > 0 ? fmtPEN(totalUsado) : '—'}
          </div>
          <div className="kpi-foot">{(utilizacion * 100).toFixed(0)}% utilización</div>
        </motion.div>
        <motion.div className="kpi" variants={staggerItem} whileHover={hoverLift}>
          <div className="kpi-label">Disponible</div>
          <div className="kpi-value" style={{ color: 'var(--good)' }}>{fmtPEN(totalDisponible)}</div>
          <div className="kpi-foot">Crédito sin usar</div>
        </motion.div>
        {totalCargasMes > 0 && (
          <motion.div className="kpi" variants={staggerItem} whileHover={hoverLift}>
            <div className="kpi-label">Cargos este mes</div>
            <div className="kpi-value">{fmtPEN(totalCargasMes)}</div>
            <div className="kpi-foot">En gastos variables</div>
          </motion.div>
        )}
      </motion.section>

      {/* Utilization summary bar */}
      {totalLimite > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-mute)', marginBottom: 6 }}>
            <span>Utilización global</span>
            <span style={{ color: utilizationColor(utilizacion), fontWeight: 700 }}>
              {(utilizacion * 100).toFixed(0)}%
              {utilizacion >= 0.7 ? ' ⚠ Alta' : utilizacion >= 0.3 ? ' · Moderada' : ' · Baja ✓'}
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${utilizacion * 100}%`,
              background: utilizationColor(utilizacion),
              transition: 'width 0.6s ease', borderRadius: 4,
            }} />
          </div>
        </div>
      )}

      {/* Credit cards grid */}
      {active.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
          <h3 style={{ marginBottom: 8 }}>Sin tarjetas de crédito</h3>
          <p style={{ color: 'var(--ink-mute)', marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
            Agrega tus tarjetas para controlar deuda, utilización y fechas de pago. Los gastos variables cargados a tarjeta se sincronizan automáticamente.
          </p>
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14} /> Agregar primera tarjeta
          </button>
        </div>
      ) : (
        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {active.map(cl => (
            <CreditCard
              key={cl.id}
              cl={cl}
              onEdit={cl => setModal({ cl })}
              onDelete={handleDelete}
              onPay={handlePay}
              variableExpenses={variableExpenses}
            />
          ))}
        </motion.div>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <div style={{ opacity: 0.6, marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-mute)', marginBottom: 8 }}>
            Tarjetas inactivas ({inactive.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {inactive.map(cl => (
              <div key={cl.id} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12,
                border: '1px solid var(--border)', background: 'var(--bg-elev)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Icon name="card" size={12} />
                <span>{cl.nombre}</span>
                <button className="btn btn-xs btn-ghost" onClick={() => onEditCreditLine({ ...cl, activa: true })}>↩</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent charges from variable expenses */}
      {totalCargasMes > 0 && (
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Gastos variables · este mes</div>
              <h3 className="card-title">Cargos a tarjeta</h3>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Tarjeta</th>
                  <th className="num-col">Monto</th>
                </tr>
              </thead>
              <tbody>
                {(variableExpenses || [])
                  .filter(e => {
                    if (e.paymentMethod?.type !== 'tarjeta') return false
                    if (!e.date) return false
                    const d = new Date(e.date)
                    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
                  })
                  .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
                  .map(e => {
                    const cl = creditLines.find(c => c.id === e.paymentMethod?.creditLineId)
                    return (
                      <tr key={e.id}>
                        <td className="ink-mute mono">{e.date}</td>
                        <td>{e.description}</td>
                        <td className="ink-mute" style={{ fontSize: 12 }}>{cl?.nombre ?? '—'}</td>
                        <td className="num-col mono" style={{ color: 'var(--bad)', fontWeight: 600 }}>
                          − {fmtPEN(e.amount)}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal && (
        <CreditLineModal
          initial={modal === 'new' ? null : modal.cl}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {payModal && (
        <PaymentModal
          creditLine={payModal.cl}
          accounts={accounts}
          onConfirm={confirmPayment}
          onClose={() => setPayModal(null)}
        />
      )}
    </div>
  )
}
