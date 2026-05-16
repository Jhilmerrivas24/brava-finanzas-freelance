import { useState, useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'
import { useDialog } from '../hooks/useDialog.js'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, hoverLift, tapScale } from '../lib/animations.js'

// ── Helpers ───────────────────────────────────────────────────────────────────
const TIPO_LABEL = { personal: 'Personal', hipotecario: 'Hipotecario', vehicular: 'Vehicular', negocio: 'Negocio', otro: 'Otro' }
const TIPO_COLOR = { personal: '#3b82f6', hipotecario: '#10b981', vehicular: '#f59e0b', negocio: '#8b5cf6', otro: '#6b7280' }

function daysUntilPayment(diaPago) {
  if (!diaPago) return null
  const today = new Date()
  const current = today.getDate()
  let days = diaPago - current
  if (days < 0) days += 30 // approximate next month
  return days
}

function monthsRemaining(fechaFin) {
  if (!fechaFin) return null
  const now = new Date()
  const end = new Date(fechaFin)
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
  return Math.max(0, months)
}

// ── Loan CRUD modal ───────────────────────────────────────────────────────────
function LoanModal({ initial, onSave, onClose }) {
  const defaults = {
    nombre:        initial?.nombre        ?? '',
    banco:         initial?.banco         ?? '',
    tipo:          initial?.tipo          ?? 'personal',
    montoOriginal: String(initial?.montoOriginal ?? ''),
    saldoPendiente:String(initial?.saldoPendiente ?? initial?.montoOriginal ?? ''),
    cuota:         String(initial?.cuota  ?? ''),
    tasaAnual:     String(initial?.tasaAnual ?? ''),
    fechaInicio:   initial?.fechaInicio   ?? '',
    fechaFin:      initial?.fechaFin      ?? '',
    diaPago:       String(initial?.diaPago ?? ''),
    moneda:        initial?.moneda        ?? 'PEN',
    activo:        initial?.activo        ?? true,
  }
  const [form, setForm] = useState(defaults)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const montoOrig = Number(form.montoOriginal) || 0
  const saldo     = Number(form.saldoPendiente) || 0
  const pagado    = Math.max(0, montoOrig - saldo)
  const pct       = montoOrig > 0 ? pagado / montoOrig : 0
  const valid     = form.nombre.trim() && Number(form.montoOriginal) > 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Registrar'} préstamo</div>
            <h2 className="modal-title">{form.nombre || 'Nuevo préstamo'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <div className="field" style={{ flex: 2 }}>
              <label>Nombre del préstamo</label>
              <input type="text" value={form.nombre} autoFocus
                onChange={e => set('nombre', e.target.value)}
                placeholder="Ej. Préstamo BCP, Crédito Efectivo…"/>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Banco / Entidad</label>
              <input type="text" value={form.banco}
                onChange={e => set('banco', e.target.value)} placeholder="BCP, BBVA…"/>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="personal">Personal</option>
                <option value="hipotecario">Hipotecario</option>
                <option value="vehicular">Vehicular</option>
                <option value="negocio">Negocio</option>
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
              <label>Monto original</label>
              <div className="amount-input">
                <span className="amount-prefix mono">{form.moneda === 'USD' ? 'US$' : 'S/'}</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={form.montoOriginal} onChange={e => set('montoOriginal', e.target.value)} placeholder="0.00"/>
              </div>
            </div>
            <div className="field">
              <label>Saldo pendiente</label>
              <div className="amount-input">
                <span className="amount-prefix mono">{form.moneda === 'USD' ? 'US$' : 'S/'}</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={form.saldoPendiente} onChange={e => set('saldoPendiente', e.target.value)} placeholder="0.00"/>
              </div>
            </div>
          </div>

          {/* Progress preview */}
          {montoOrig > 0 && (
            <div style={{ padding: '10px 14px', background: 'var(--bg-sunk)', borderRadius: 8, marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-mute)', marginBottom: 6 }}>
                <span>Pagado: {fmtPEN(pagado)}</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{(pct * 100).toFixed(0)}%</span>
                <span>Pendiente: {fmtPEN(saldo)}</span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct * 100}%`,
                  background: 'var(--accent)', transition: 'width 0.3s', borderRadius: 3,
                }} />
              </div>
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label>Cuota mensual</label>
              <div className="amount-input">
                <span className="amount-prefix mono">{form.moneda === 'USD' ? 'US$' : 'S/'}</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={form.cuota} onChange={e => set('cuota', e.target.value)} placeholder="0.00"/>
              </div>
            </div>
            <div className="field">
              <label>Tasa anual (%)</label>
              <input type="text" inputMode="decimal"
                value={form.tasaAnual} onChange={e => set('tasaAnual', e.target.value)} placeholder="15.00"/>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Fecha inicio</label>
              <input type="date" value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)}/>
            </div>
            <div className="field">
              <label>Fecha fin</label>
              <input type="date" value={form.fechaFin} onChange={e => set('fechaFin', e.target.value)}/>
            </div>
            <div className="field">
              <label>Día de pago</label>
              <input type="number" min={1} max={31}
                value={form.diaPago} onChange={e => set('diaPago', e.target.value)} placeholder="15"/>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)}/>
            <span>Préstamo activo</span>
          </label>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onSave({
              nombre:         form.nombre,
              banco:          form.banco,
              tipo:           form.tipo,
              montoOriginal:  Number(form.montoOriginal)  || 0,
              saldoPendiente: Number(form.saldoPendiente) || Number(form.montoOriginal) || 0,
              cuota:          Number(form.cuota)          || 0,
              tasaAnual:      Number(form.tasaAnual)      || 0,
              fechaInicio:    form.fechaInicio || null,
              fechaFin:       form.fechaFin   || null,
              diaPago:        Number(form.diaPago) || null,
              moneda:         form.moneda,
              activo:         form.activo,
            })}>
            <Icon name="check" size={14}/> {initial ? 'Guardar cambios' : 'Registrar préstamo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Payment modal ─────────────────────────────────────────────────────────────
function PaymentModal({ loan, accounts, onConfirm, onClose }) {
  const [amount,    setAmount]    = useState(String(loan.cuota ?? ''))
  const [capital,   setCapital]   = useState('')
  const [interes,   setInteres]   = useState('')
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0])
  const [notes,     setNotes]     = useState('')
  const [accountId, setAccountId] = useState(null)
  const [showBreak, setShowBreak] = useState(false)

  const valid = Number(amount) > 0
  const activeAccounts = accounts.filter(a => a.activa !== false)

  const newSaldo = Math.max(0, (loan.saldoPendiente ?? 0) - (Number(capital || amount) || 0))

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{loan.nombre} · Pago</div>
            <h2 className="modal-title">Registrar cuota</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          {/* Current status */}
          <div style={{ padding: '10px 14px', background: 'var(--bg-elev)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--ink-mute)' }}>Saldo actual</span>
              <span className="mono" style={{ fontWeight: 700, color: 'var(--bad)' }}>{fmtPEN(loan.saldoPendiente ?? 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-mute)' }}>Saldo tras pago</span>
              <span className="mono" style={{ fontWeight: 700, color: 'var(--good)' }}>{fmtPEN(newSaldo)}</span>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Monto total pagado</label>
              <div className="amount-input">
                <span className="amount-prefix mono">S/</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={amount} onChange={e => setAmount(e.target.value)} autoFocus placeholder="0.00"/>
              </div>
            </div>
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}/>
            </div>
          </div>

          {/* Capital/interest breakdown (optional) */}
          <button
            className="btn-link"
            style={{ fontSize: 12, marginBottom: showBreak ? 8 : 0 }}
            onClick={() => setShowBreak(v => !v)}
          >
            {showBreak ? '▲ Ocultar' : '▼ Desglosar'} capital + interés
          </button>
          {showBreak && (
            <div className="field-row" style={{ marginTop: 8 }}>
              <div className="field">
                <label>Capital amortizado</label>
                <div className="amount-input">
                  <span className="amount-prefix mono">S/</span>
                  <input type="text" inputMode="decimal" className="amount-field mono"
                    value={capital} onChange={e => setCapital(e.target.value)} placeholder="0.00"/>
                </div>
              </div>
              <div className="field">
                <label>Intereses</label>
                <div className="amount-input">
                  <span className="amount-prefix mono">S/</span>
                  <input type="text" inputMode="decimal" className="amount-field mono"
                    value={interes} onChange={e => setInteres(e.target.value)} placeholder="0.00"/>
                </div>
              </div>
            </div>
          )}

          {activeAccounts.length > 0 && (
            <div className="field" style={{ marginTop: 8 }}>
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

          <div className="field">
            <label>Notas (opcional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Referencia, cuota N°…"/>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onConfirm({
              loanId:   loan.id,
              amount:   Number(amount),
              capital:  capital ? Number(capital) : Number(amount),
              interes:  interes ? Number(interes) : 0,
              date, notes, accountId,
            })}>
            <Icon name="check" size={14}/> Registrar pago
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Loan card ─────────────────────────────────────────────────────────────────
function LoanCard({ loan, payments, onEdit, onDelete, onPay }) {
  const [showHistory, setShowHistory] = useState(false)

  const saldo    = loan.saldoPendiente ?? loan.montoOriginal ?? 0
  const original = loan.montoOriginal  ?? saldo
  const pagado   = Math.max(0, original - saldo)
  const pct      = original > 0 ? Math.min(pagado / original, 1) : 0
  const tipo     = loan.tipo ?? 'personal'

  const daysLeft = daysUntilPayment(loan.diaPago)
  const urgente  = daysLeft !== null && daysLeft <= 5 && saldo > 0
  const mesesLeft = monthsRemaining(loan.fechaFin)
  const isPaid   = saldo === 0

  const myPayments = (payments || []).filter(p => p.loanId === loan.id)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  return (
    <motion.div
      className="card"
      variants={staggerItem}
      whileHover={hoverLift}
      style={{
        border: urgente ? '2px solid var(--warn)' : isPaid ? '2px solid var(--good)' : '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Paid badge */}
      {isPaid && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'color-mix(in srgb, var(--good) 20%, var(--bg-elev))',
          color: 'var(--good)', fontSize: 10, fontWeight: 700,
          padding: '2px 8px', borderRadius: 4,
        }}>✓ PAGADO</div>
      )}
      {urgente && !isPaid && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--warn)' }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, padding: '2px 8px', borderRadius: 4,
            background: `color-mix(in srgb, ${TIPO_COLOR[tipo]} 15%, var(--bg-elev))`,
            color: TIPO_COLOR[tipo], marginBottom: 6,
          }}>
            {TIPO_LABEL[tipo] ?? tipo}
            {loan.banco && ` · ${loan.banco}`}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{loan.nombre}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
          <button className="btn btn-xs btn-ghost" onClick={() => onEdit(loan)}><Icon name="edit" size={11}/></button>
          <button className="btn btn-xs btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => onDelete(loan)}>
            <Icon name="trash" size={11}/>
          </button>
        </div>
      </div>

      {/* Amounts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Saldo pendiente</div>
          <div className="mono" style={{ fontWeight: 700, fontSize: 17, color: isPaid ? 'var(--good)' : 'var(--bad)' }}>
            {fmtPEN(saldo)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Monto original</div>
          <div className="mono" style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-mute)' }}>
            {fmtPEN(original)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-mute)', marginBottom: 4 }}>
          <span>Pagado {(pct * 100).toFixed(0)}%</span>
          <span>{fmtPEN(pagado)}</span>
        </div>
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct * 100}%`,
            background: isPaid ? 'var(--good)' : 'var(--accent)',
            borderRadius: 4, transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Meta pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14, marginTop: 10 }}>
        {loan.cuota > 0 && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-sunk)', color: 'var(--ink-mute)' }}>
            Cuota: {fmtPEN(loan.cuota)}
          </span>
        )}
        {loan.tasaAnual > 0 && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-sunk)', color: 'var(--ink-mute)' }}>
            TEA {loan.tasaAnual}%
          </span>
        )}
        {mesesLeft !== null && !isPaid && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-sunk)', color: 'var(--ink-mute)' }}>
            {mesesLeft} mes{mesesLeft !== 1 ? 'es' : ''} restante{mesesLeft !== 1 ? 's' : ''}
          </span>
        )}
        {loan.diaPago && !isPaid && (
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 4,
            background: urgente ? 'color-mix(in srgb, var(--warn) 15%, var(--bg-elev))' : 'var(--bg-sunk)',
            color: urgente ? 'var(--warn)' : 'var(--ink-mute)',
            fontWeight: urgente ? 700 : 400,
          }}>
            {urgente ? `⚠ Pago en ${daysLeft}d` : `Día de pago: ${loan.diaPago}`}
          </span>
        )}
        {myPayments.length > 0 && (
          <button
            className="btn-link"
            style={{ fontSize: 10, padding: '2px 4px' }}
            onClick={() => setShowHistory(v => !v)}
          >
            {myPayments.length} pago(s) {showHistory ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Payment history (expanded) */}
      {showHistory && myPayments.length > 0 && (
        <div style={{
          background: 'var(--bg-sunk)', borderRadius: 8,
          padding: '10px 12px', marginBottom: 12, fontSize: 12,
        }}>
          <div style={{ fontWeight: 600, color: 'var(--ink-mute)', marginBottom: 8 }}>Historial de pagos</div>
          {myPayments.slice(0, 10).map(p => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '4px 0', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ color: 'var(--ink-mute)' }}>{p.date || '—'}</span>
              <span className="mono" style={{ fontWeight: 600 }}>{fmtPEN(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pay button */}
      {!isPaid && (
        <button
          className="btn btn-soft btn-full"
          style={{ borderTop: '1px solid var(--border)', paddingTop: 10, borderRadius: 0, marginLeft: -16, marginRight: -16, marginBottom: -16, paddingBottom: 12 }}
          onClick={() => onPay(loan)}
        >
          <Icon name="check" size={13}/> Registrar cuota
        </button>
      )}
    </motion.div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function LoansView({
  loans = [],
  loanPayments = [],
  accounts = [],
  onAddLoan,
  onEditLoan,
  onDeleteLoan,
  onRegisterLoanPayment,
}) {
  const dialog = useDialog()
  const [modal, setModal]       = useState(null)  // null | 'new' | { loan }
  const [payModal, setPayModal] = useState(null)  // null | { loan }

  const active    = loans.filter(l => l.activo !== false && (l.saldoPendiente ?? l.montoOriginal ?? 1) > 0)
  const pagados   = loans.filter(l => l.activo !== false && (l.saldoPendiente ?? 1) === 0)
  const inactive  = loans.filter(l => l.activo === false)

  const totalDeuda     = active.reduce((s, l) => s + (l.saldoPendiente ?? 0), 0)
  const totalCuota     = active.reduce((s, l) => s + (l.cuota ?? 0), 0)

  function handleSave(data) {
    if (modal === 'new') {
      onAddLoan({ ...data, id: 'loan-' + Date.now(), createdAt: new Date().toISOString() })
    } else {
      onEditLoan({ ...modal.loan, ...data })
    }
    setModal(null)
  }

  async function handleDelete(loan) {
    const ok = await dialog.danger({ title: 'Eliminar préstamo', itemName: loan.nombre })
    if (ok) onDeleteLoan(loan.id)
  }

  function handlePay(loan) { setPayModal({ loan }) }

  function confirmPayment(data) {
    onRegisterLoanPayment(data)
    setPayModal(null)
  }

  return (
    <div className="view">
      {/* Header */}
      <header className="view-header">
        <div>
          <div className="eyebrow">Deuda a largo plazo</div>
          <h1>Préstamos</h1>
          <p className="lede">
            Registra tus préstamos, controla el saldo pendiente y rastrea cada cuota pagada.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14}/> Nuevo préstamo
          </button>
        </div>
      </header>

      {/* KPIs */}
      <motion.section
        className="kpi-row"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        style={{ marginBottom: 28 }}
      >
        <motion.div className="kpi kpi-accent" variants={staggerItem} whileHover={hoverLift}>
          <div className="kpi-label">Deuda total</div>
          <div className="kpi-value" style={{ color: totalDeuda > 0 ? 'var(--bad)' : 'var(--ink-mute)' }}>
            {totalDeuda > 0 ? fmtPEN(totalDeuda) : '—'}
          </div>
          <div className="kpi-foot">{active.length} préstamo(s) activo(s)</div>
        </motion.div>
        <motion.div className="kpi" variants={staggerItem} whileHover={hoverLift}>
          <div className="kpi-label">Cuota mensual total</div>
          <div className="kpi-value">{totalCuota > 0 ? fmtPEN(totalCuota) : '—'}</div>
          <div className="kpi-foot">Compromiso mensual</div>
        </motion.div>
        <motion.div className="kpi" variants={staggerItem} whileHover={hoverLift}>
          <div className="kpi-label">Total pagado</div>
          <div className="kpi-value" style={{ color: 'var(--good)' }}>
            {loanPayments.length > 0 ? fmtPEN(loanPayments.reduce((s, p) => s + (p.amount ?? 0), 0)) : '—'}
          </div>
          <div className="kpi-foot">{loanPayments.length} pago(s) registrado(s)</div>
        </motion.div>
        {pagados.length > 0 && (
          <motion.div className="kpi" variants={staggerItem} whileHover={hoverLift}>
            <div className="kpi-label">Cancelados</div>
            <div className="kpi-value" style={{ color: 'var(--good)' }}>{pagados.length}</div>
            <div className="kpi-foot">Préstamo(s) pagado(s) ✓</div>
          </motion.div>
        )}
      </motion.section>

      {/* Upcoming payment alerts */}
      {active.some(l => {
        const d = daysUntilPayment(l.diaPago)
        return d !== null && d <= 7
      }) && (
        <div style={{
          background: 'color-mix(in srgb, var(--warn) 10%, var(--bg-elev))',
          border: '1px solid color-mix(in srgb, var(--warn) 35%, transparent)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--warn)', marginBottom: 4 }}>
              Pagos próximos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {active
                .filter(l => { const d = daysUntilPayment(l.diaPago); return d !== null && d <= 7 })
                .sort((a, b) => daysUntilPayment(a.diaPago) - daysUntilPayment(b.diaPago))
                .map(l => {
                  const d = daysUntilPayment(l.diaPago)
                  return (
                    <div key={l.id} style={{ fontSize: 13 }}>
                      <strong>{l.nombre}</strong>
                      {l.cuota > 0 && <span className="mono"> {fmtPEN(l.cuota)}</span>}
                      <span style={{ color: 'var(--ink-mute)' }}>
                        {' — '}{d === 0 ? 'hoy' : `en ${d} día${d !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                  )
                })
              }
            </div>
          </div>
        </div>
      )}

      {/* Loan cards */}
      {loans.filter(l => l.activo !== false).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
          <h3 style={{ marginBottom: 8 }}>Sin préstamos registrados</h3>
          <p style={{ color: 'var(--ink-mute)', marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
            Registra tus préstamos activos para rastrear saldo pendiente, cuotas y avance hacia la cancelación.
          </p>
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14}/> Registrar primer préstamo
          </button>
        </div>
      ) : (
        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Active first */}
          {[...active, ...pagados].map(loan => (
            <LoanCard
              key={loan.id}
              loan={loan}
              payments={loanPayments}
              onEdit={l => setModal({ loan: l })}
              onDelete={handleDelete}
              onPay={handlePay}
            />
          ))}
        </motion.div>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <div style={{ opacity: 0.6, marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-mute)', marginBottom: 8 }}>
            Inactivos ({inactive.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {inactive.map(l => (
              <div key={l.id} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12,
                border: '1px solid var(--border)', background: 'var(--bg-elev)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Icon name="wallet" size={12}/>
                <span>{l.nombre}</span>
                <button className="btn btn-xs btn-ghost" onClick={() => onEditLoan({ ...l, activo: true })}>↩</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {modal && (
        <LoanModal
          initial={modal === 'new' ? null : modal.loan}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {payModal && (
        <PaymentModal
          loan={payModal.loan}
          accounts={accounts}
          onConfirm={confirmPayment}
          onClose={() => setPayModal(null)}
        />
      )}
    </div>
  )
}
