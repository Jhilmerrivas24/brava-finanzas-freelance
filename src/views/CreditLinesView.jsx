import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'
import { useDialog } from '../hooks/useDialog.js'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, hoverLift } from '../lib/animations.js'

const TIPO_LABEL = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', otro: 'Tarjeta' }
const TIPO_COLOR = { visa: '#1a1f71', mastercard: '#eb001b', amex: '#007bc1', otro: '#6b7280' }
const TIPO_BG    = { visa: '#e8eaf6', mastercard: '#fce4ec', amex: '#e1f5fe', otro: '#f3f4f6' }
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function periodLabel(yyyymm) {
  if (!yyyymm) return ''
  const [y, m] = yyyymm.split('-')
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`
}

function currentPeriod() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`
}

function computeAutoCharges(cardId, period, dailyExpenses, variableExpenses) {
  const [y, m] = period.split('-').map(Number)
  const isInPeriod = (dateStr) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    return d.getFullYear() === y && (d.getMonth() + 1) === m
  }
  const daily = (dailyExpenses || [])
    .filter(e => e.sourceType === 'credit' && e.sourceId === cardId && isInPeriod(e.date))
    .reduce((s, e) => s + (e.amount || 0), 0)
  const varr = (variableExpenses || [])
    .filter(e => e.paymentMethod?.type === 'tarjeta' && e.paymentMethod.creditLineId === cardId && isInPeriod(e.date))
    .reduce((s, e) => s + (e.amount || 0), 0)
  return daily + varr
}

function utilizationColor(pct) {
  if (pct < 0.3) return 'var(--good)'
  if (pct < 0.7) return 'var(--warn)'
  return 'var(--bad)'
}

// ── CreditLine profile modal ──────────────────────────────────────────────────
function CreditLineModal({ initial, onSave, onClose }) {
  const defaults = {
    nombre:     initial?.nombre     ?? '',
    banco:      initial?.banco      ?? '',
    tipo:       initial?.tipo       ?? 'visa',
    limite:     String(initial?.limite   ?? ''),
    moneda:     initial?.moneda     ?? 'PEN',
    fechaCorte: String(initial?.fechaCorte ?? ''),
    fechaPago:  String(initial?.fechaPago  ?? ''),
    pagoMinimo: String(initial?.pagoMinimo ?? ''),
    activa:     initial?.activa     ?? true,
  }
  const [form, setForm] = useState(defaults)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.nombre.trim() && Number(form.limite) > 0

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
              <label>Pago mínimo mensual <span style={{ fontWeight:400, color:'var(--ink-mute)', fontSize:11 }}>(opcional)</span></label>
              <div className="amount-input">
                <span className="amount-prefix mono">{form.moneda === 'USD' ? 'US$' : 'S/'}</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={form.pagoMinimo} onChange={e => set('pagoMinimo', e.target.value)} placeholder="0.00"/>
              </div>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Día de corte</label>
              <input type="number" min={1} max={31} value={form.fechaCorte}
                onChange={e => set('fechaCorte', e.target.value)} placeholder="Ej. 26" />
            </div>
            <div className="field">
              <label>Día de pago</label>
              <input type="number" min={1} max={31} value={form.fechaPago}
                onChange={e => set('fechaPago', e.target.value)} placeholder="Ej. 20" />
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
              limite:     Number(form.limite) || 0,
              moneda:     form.moneda,
              fechaCorte: Number(form.fechaCorte) || null,
              fechaPago:  Number(form.fechaPago)  || null,
              pagoMinimo: Number(form.pagoMinimo) || null,
              activa:     form.activa,
            })}>
            <Icon name="check" size={14}/> {initial ? 'Guardar cambios' : 'Agregar tarjeta'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Payment modal ─────────────────────────────────────────────────────────────
function PayStatementModal({ cl, statement, autoCharges, accounts, onConfirm, onClose }) {
  const totalCharges = statement?.chargesManual ?? autoCharges
  const [amount, setAmount] = useState(String(totalCharges || ''))
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0])
  const [accountId, setAccountId] = useState('')
  const [notes, setNotes]   = useState('')
  const valid = Number(amount) > 0 && date

  const activeAccounts = (accounts || []).filter(a => a.activa !== false)
  const period = statement?.period ?? currentPeriod()

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{cl.nombre} · {periodLabel(period)}</div>
            <h2 className="modal-title">Registrar pago</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div style={{ padding: '10px 14px', background: 'var(--bg-sunk)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--ink-mute)' }}>Cargos del periodo</span>
              <span className="mono" style={{ fontWeight: 700 }}>{fmtPEN(totalCharges)}</span>
            </div>
            {statement?.chargesManual != null && (
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Monto manual registrado (estado de cuenta)</div>
            )}
          </div>
          <div className="field-row">
            <div className="field" style={{ flex: 2 }}>
              <label>Monto pagado</label>
              <div className="amount-input">
                <span className="amount-prefix mono">S/</span>
                <input type="text" inputMode="decimal" className="amount-field mono" autoFocus
                  value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/>
              </div>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Fecha de pago</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          {activeAccounts.length > 0 && (
            <div className="field">
              <label>Debitar de cuenta bancaria <span style={{ fontWeight:400, color:'var(--ink-faint)', fontSize:11 }}>(opcional)</span></label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)}>
                <option value="">— Sin asignar —</option>
                {activeAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre ?? a.bank} — {fmtPEN(a.saldo ?? a.balance ?? 0)}</option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label>Notas <span style={{ fontWeight:400, color:'var(--ink-faint)', fontSize:11 }}>(opcional)</span></label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej. Pago total, pago mínimo…" />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onConfirm({ amount: Number(amount), date, accountId: accountId || null, notes, period })}>
            <Icon name="check" size={14}/> Registrar pago
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit statement charges modal ──────────────────────────────────────────────
function EditChargesModal({ cl, statement, autoCharges, onSave, onClose }) {
  const [manual, setManual] = useState(
    statement?.chargesManual != null ? String(statement.chargesManual) : String(autoCharges || '')
  )
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{cl.nombre} · {periodLabel(statement?.period)}</div>
            <h2 className="modal-title">Ajustar cargos del mes</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 12 }}>
            Cargos calculados automáticamente: <strong>{fmtPEN(autoCharges)}</strong><br/>
            Puedes ingresar el monto real del estado de cuenta del banco si difiere (incluye intereses, comisiones, etc.).
          </div>
          <div className="field">
            <label>Monto real del estado de cuenta</label>
            <div className="amount-input">
              <span className="amount-prefix mono">S/</span>
              <input type="text" inputMode="decimal" className="amount-field mono" autoFocus
                value={manual} onChange={e => setManual(e.target.value)} placeholder={String(autoCharges || '0.00')}/>
            </div>
          </div>
          {Number(manual) !== autoCharges && Number(manual) > 0 && (
            <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 6 }}>
              Diferencia de {fmtPEN(Math.abs(Number(manual) - autoCharges))} vs. cargos automáticos
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          {statement?.chargesManual != null && (
            <button className="btn btn-ghost" onClick={() => onSave(null)} style={{ marginRight: 'auto' }}>
              Usar automático
            </button>
          )}
          <button className="btn btn-primary"
            onClick={() => onSave(Number(manual) || null)}>
            <Icon name="check" size={14}/> Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function CreditLinesView({
  creditLines = [],
  accounts = [],
  variableExpenses = [],
  dailyExpenses = [],
  creditStatements = [],
  onAddCreditLine,
  onEditCreditLine,
  onDeleteCreditLine,
  onUpdateCreditUsado,
  onAddAccountMovement,
  onAddVariableExpense,
  onAddCreditStatement,
  onEditCreditStatement,
}) {
  const dialog = useDialog()
  const [modal, setModal]             = useState(null) // null | 'new' | { cl }
  const [payModal, setPayModal]       = useState(null) // null | { cl, stmt, period }
  const [editChargesModal, setEditChargesModal] = useState(null) // null | { cl, stmt }
  const [manualPeriodCard, setManualPeriodCard] = useState(null) // cardId | null
  const [manualPeriodInput, setManualPeriodInput] = useState('')

  const active   = creditLines.filter(cl => cl.activa !== false)
  const inactive = creditLines.filter(cl => cl.activa === false)

  const totalLimite     = active.reduce((s, cl) => s + (cl.limite ?? 0), 0)
  const totalUsado      = active.reduce((s, cl) => s + (cl.usado  ?? 0), 0)
  const totalDisponible = Math.max(0, totalLimite - totalUsado)
  const utilizacion     = totalLimite > 0 ? totalUsado / totalLimite : 0

  const now = new Date()
  const cp  = currentPeriod()

  function getPeriodsForCard(cl) {
    const periods = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const p = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      periods.push(p)
    }
    return periods.filter(p => {
      const hasStmt   = creditStatements.some(s => s.cardId === cl.id && s.period === p)
      const hasCharge = computeAutoCharges(cl.id, p, dailyExpenses, variableExpenses) > 0
      return hasStmt || hasCharge || p === cp
    })
  }

  function handleSave(data) {
    if (modal === 'new') {
      onAddCreditLine({ ...data, id: 'cl-' + Date.now(), usado: 0, createdAt: new Date().toISOString() })
    } else {
      onEditCreditLine({ ...modal.cl, ...data })
    }
    setModal(null)
  }

  async function handleDelete(cl) {
    const ok = await dialog.danger({ title: 'Eliminar tarjeta', itemName: cl.nombre })
    if (ok) onDeleteCreditLine(cl.id)
  }

  function confirmPayment({ amount, date, accountId, notes, period }) {
    const { cl, stmt } = payModal

    if (stmt && stmt.id) {
      onEditCreditStatement({ ...stmt, isPaid: true, paidAmount: amount, paidDate: date, paidFromAccountId: accountId || null, notes })
    } else {
      onAddCreditStatement?.({
        id: 'cstmt-' + Date.now(),
        cardId: cl.id, period,
        chargesManual: null,
        isPaid: true, paidAmount: amount, paidDate: date,
        paidFromAccountId: accountId || null,
        notes,
        createdAt: new Date().toISOString(),
      })
    }

    if (onUpdateCreditUsado) onUpdateCreditUsado(cl.id, -amount)

    if (onAddVariableExpense) {
      onAddVariableExpense({
        id: 'vexp-cp-' + Date.now(),
        description: `Pago tarjeta: ${cl.nombre}`,
        amount,
        date,
        category: 'Tarjeta de crédito',
        deductible: false,
        notes: notes || `Pago de ${periodLabel(period)}`,
        isCreditPayment: true,
        creditLineId: cl.id,
        paymentMethod: accountId ? { type: 'cuenta', accountId } : { type: 'efectivo' },
      })
    }

    if (accountId && onAddAccountMovement) {
      onAddAccountMovement({
        id: 'mov-' + Date.now(),
        accountId,
        type: 'expense',
        description: `Pago tarjeta: ${cl.nombre} (${periodLabel(period)})`,
        amount,
        delta: -amount,
        date,
      })
    }
    setPayModal(null)
  }

  function handleEditCharges(newManual) {
    const { cl, stmt } = editChargesModal
    const period = stmt?.period ?? cp
    if (stmt && stmt.id) {
      onEditCreditStatement({ ...stmt, chargesManual: newManual })
    } else {
      onAddCreditStatement?.({
        id: 'cstmt-' + Date.now(),
        cardId: cl.id, period,
        chargesManual: newManual,
        isPaid: false, paidAmount: null, paidDate: null, paidFromAccountId: null,
        notes: '',
        createdAt: new Date().toISOString(),
      })
    }
    setEditChargesModal(null)
  }

  function handleAddManualPeriod(cl) {
    const period = manualPeriodInput.trim()
    if (!/^\d{4}-\d{2}$/.test(period)) return
    onAddCreditStatement?.({
      id: 'cstmt-' + Date.now(),
      cardId: cl.id, period,
      chargesManual: null, isPaid: false,
      paidAmount: null, paidDate: null, paidFromAccountId: null,
      notes: '', createdAt: new Date().toISOString(),
    })
    setManualPeriodCard(null)
    setManualPeriodInput('')
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Crédito rotativo</div>
          <h1>Tarjetas de crédito</h1>
          <p className="lede">
            Controla deuda, cargos mensuales y pagos. Los gastos cargados a tarjeta se sincronizan automáticamente.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14} /> Nueva tarjeta
          </button>
        </div>
      </header>

      {/* Summary KPIs */}
      {active.length > 0 && (
        <motion.section className="kpi-row" variants={staggerContainer} initial="hidden" animate="visible" style={{ marginBottom: 28 }}>
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
        </motion.section>
      )}

      {/* Cards */}
      {active.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
          <h3 style={{ marginBottom: 8 }}>Sin tarjetas de crédito</h3>
          <p style={{ color: 'var(--ink-mute)', marginBottom: 20 }}>
            Agrega tus tarjetas para controlar deuda, cargos y pagos mensuales.
          </p>
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14} /> Agregar primera tarjeta
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {active.map(cl => {
            const periods = getPeriodsForCard(cl)
            const usado    = cl.usado ?? 0
            const limite   = cl.limite ?? 0
            const pct      = limite > 0 ? Math.min(usado / limite, 1) : 0
            const uColor   = utilizationColor(pct)

            let daysUntilPay = null
            if (cl.fechaPago) {
              const target = new Date(now.getFullYear(), now.getMonth(), cl.fechaPago)
              target.setHours(0,0,0,0)
              const today = new Date(); today.setHours(0,0,0,0)
              if (target <= today) target.setMonth(target.getMonth() + 1)
              daysUntilPay = Math.round((target - today) / 86400000)
            }
            const urgente = daysUntilPay !== null && daysUntilPay <= 5 && usado > 0

            return (
              <motion.div key={cl.id} className="card" variants={staggerItem}
                style={{ border: urgente ? '2px solid var(--bad)' : '1px solid var(--border)', padding: 0, overflow: 'hidden' }}>

                {/* Card header */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                    background: TIPO_BG[cl.tipo] ?? TIPO_BG.otro,
                    color: TIPO_COLOR[cl.tipo] ?? TIPO_COLOR.otro,
                    letterSpacing: '0.04em', flexShrink: 0,
                  }}>
                    {TIPO_LABEL[cl.tipo] ?? 'Card'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{cl.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-mute)', display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                      {cl.banco && <span>{cl.banco}</span>}
                      <span>Límite: <strong>{fmtPEN(cl.limite ?? 0)}</strong></span>
                      {cl.fechaCorte && <span>Corte: día {cl.fechaCorte}</span>}
                      {cl.fechaPago && (
                        <span style={{ color: urgente ? 'var(--bad)' : undefined, fontWeight: urgente ? 700 : undefined }}>
                          {urgente ? `⚠ Pago en ${daysUntilPay}d` : `Pago: día ${cl.fechaPago}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="mono" style={{ fontWeight: 700, color: uColor, fontSize: 16 }}>{fmtPEN(usado)}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>saldo usado</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-xs btn-ghost" onClick={() => setModal({ cl })} title="Editar tarjeta">
                      <Icon name="edit" size={11} />
                    </button>
                    <button className="btn btn-xs btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => handleDelete(cl)} title="Eliminar">
                      <Icon name="trash" size={11} />
                    </button>
                  </div>
                </div>

                {/* Utilization bar */}
                <div style={{ height: 4, background: 'var(--border)' }}>
                  <div style={{ height: '100%', width: `${pct * 100}%`, background: uColor, transition: 'width .5s' }} />
                </div>

                {/* Statements list */}
                <div style={{ padding: '0 0 4px' }}>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px', gap: 8, padding: '10px 20px 6px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)' }}>
                    <span>Periodo</span>
                    <span style={{ textAlign: 'right' }}>Cargos</span>
                    <span style={{ textAlign: 'center' }}>Estado</span>
                    <span style={{ textAlign: 'center' }}>Acción</span>
                  </div>

                  {periods.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
                      Sin movimientos aún. Agrega gastos del día o variables con esta tarjeta.
                    </div>
                  ) : (
                    periods.map(period => {
                      const stmt       = creditStatements.find(s => s.cardId === cl.id && s.period === period)
                      const autoChg    = computeAutoCharges(cl.id, period, dailyExpenses, variableExpenses)
                      const totalChg   = stmt?.chargesManual ?? autoChg
                      const isCurrent  = period === cp
                      const isPaid     = stmt?.isPaid ?? false

                      const [py, pm]  = period.split('-').map(Number)
                      const dueDate   = cl.fechaPago
                        ? new Date(py, pm - 1 + (cl.fechaPago < (cl.fechaCorte || 0) ? 1 : 0), cl.fechaPago)
                        : null
                      const isOverdue = !isPaid && dueDate && dueDate < now && !isCurrent

                      return (
                        <div key={period} style={{
                          display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px',
                          gap: 8, padding: '10px 20px', alignItems: 'center',
                          borderBottom: '1px solid var(--border)',
                          background: isCurrent ? 'color-mix(in srgb, var(--accent) 4%, transparent)' : 'transparent',
                        }}>
                          <div>
                            <div style={{ fontWeight: isCurrent ? 700 : 500, fontSize: 13 }}>
                              {periodLabel(period)}
                              {isCurrent && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 6, fontWeight: 700 }}>ACTUAL</span>}
                            </div>
                            {isPaid && stmt?.paidDate && (
                              <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 1 }}>
                                Pagado el {stmt.paidDate}
                              </div>
                            )}
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span className="mono" style={{ fontWeight: 600, fontSize: 13, color: totalChg > 0 ? 'var(--bad)' : 'var(--ink-mute)' }}>
                              {totalChg > 0 ? fmtPEN(totalChg) : '—'}
                            </span>
                            {stmt?.chargesManual != null && (
                              <div style={{ fontSize: 9, color: 'var(--warn)', marginTop: 1 }}>manual</div>
                            )}
                            {totalChg > 0 && (
                              <button
                                onClick={() => setEditChargesModal({ cl, stmt: stmt ?? { cardId: cl.id, period } })}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: 'var(--ink-faint)' }}
                                title="Ajustar monto"
                              >
                                <Icon name="edit" size={10} />
                              </button>
                            )}
                          </div>

                          <div style={{ textAlign: 'center' }}>
                            {isPaid ? (
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: 'color-mix(in srgb, var(--good) 12%, transparent)', color: 'var(--good)', fontWeight: 700 }}>
                                ✓ Pagado
                              </span>
                            ) : isOverdue ? (
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: 'var(--bad-soft, color-mix(in srgb, var(--bad) 12%, transparent))', color: 'var(--bad)', fontWeight: 700 }}>
                                ⚠ Vencido
                              </span>
                            ) : totalChg > 0 ? (
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: 'color-mix(in srgb, var(--warn) 12%, transparent)', color: 'var(--warn)', fontWeight: 700 }}>
                                ⏳ Pendiente
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Sin cargos</span>
                            )}
                          </div>

                          <div style={{ textAlign: 'center' }}>
                            {!isPaid && totalChg > 0 ? (
                              <button
                                className="btn btn-xs btn-primary"
                                onClick={() => setPayModal({ cl, stmt: stmt ?? null, period })}
                              >
                                Pagar
                              </button>
                            ) : isPaid && stmt?.paidAmount ? (
                              <span className="mono" style={{ fontSize: 11, color: 'var(--good)' }}>{fmtPEN(stmt.paidAmount)}</span>
                            ) : null}
                          </div>
                        </div>
                      )
                    })
                  )}

                  {/* Manual period opener */}
                  <div style={{ padding: '10px 20px' }}>
                    {manualPeriodCard === cl.id ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={manualPeriodInput}
                          onChange={e => setManualPeriodInput(e.target.value)}
                          placeholder="YYYY-MM (ej. 2026-01)"
                          autoFocus
                          style={{ fontSize: 12, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-base)', color: 'var(--ink)', width: 160 }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddManualPeriod(cl)
                            if (e.key === 'Escape') { setManualPeriodCard(null); setManualPeriodInput('') }
                          }}
                        />
                        <button className="btn btn-xs btn-primary" onClick={() => handleAddManualPeriod(cl)}>
                          Agregar
                        </button>
                        <button className="btn btn-xs btn-ghost" onClick={() => { setManualPeriodCard(null); setManualPeriodInput('') }}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => { setManualPeriodCard(cl.id); setManualPeriodInput('') }}
                      >
                        + Abrir periodo manualmente
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Inactive cards */}
      {inactive.length > 0 && (
        <details style={{ marginTop: 20 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--ink-mute)', fontSize: 13, padding: '8px 0' }}>
            {inactive.length} tarjeta(s) archivada(s)
          </summary>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inactive.map(cl => (
              <div key={cl.id} className="card" style={{ opacity: 0.6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                <span style={{ fontSize: 13 }}>{cl.nombre}</span>
                <button className="btn btn-xs btn-ghost" onClick={() => onEditCreditLine({ ...cl, activa: true })}>Reactivar</button>
              </div>
            ))}
          </div>
        </details>
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
        <PayStatementModal
          cl={payModal.cl}
          statement={payModal.stmt ?? creditStatements.find(s => s.cardId === payModal.cl.id && s.period === (payModal.period ?? cp))}
          autoCharges={computeAutoCharges(payModal.cl.id, payModal.period ?? payModal.stmt?.period ?? cp, dailyExpenses, variableExpenses)}
          accounts={accounts}
          onConfirm={confirmPayment}
          onClose={() => setPayModal(null)}
        />
      )}
      {editChargesModal && (
        <EditChargesModal
          cl={editChargesModal.cl}
          statement={editChargesModal.stmt}
          autoCharges={computeAutoCharges(editChargesModal.cl.id, editChargesModal.stmt?.period ?? cp, dailyExpenses, variableExpenses)}
          onSave={handleEditCharges}
          onClose={() => setEditChargesModal(null)}
        />
      )}
    </div>
  )
}
