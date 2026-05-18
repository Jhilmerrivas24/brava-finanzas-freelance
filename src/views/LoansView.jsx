import { useState, useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'
import { useDialog } from '../hooks/useDialog.js'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, hoverLift } from '../lib/animations.js'

const TIPO_LABEL = { personal: 'Personal', hipotecario: 'Hipotecario', vehicular: 'Vehicular', negocio: 'Negocio', otro: 'Otro' }
const TIPO_COLOR = { personal: '#3b82f6', hipotecario: '#10b981', vehicular: '#f59e0b', negocio: '#8b5cf6', otro: '#6b7280' }

function daysUntilPayment(diaPago) {
  if (!diaPago) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(today.getFullYear(), today.getMonth(), diaPago)
  target.setHours(0, 0, 0, 0)
  if (target <= today) target.setMonth(target.getMonth() + 1)
  return Math.round((target - today) / 86400000)
}

// ── Loan CRUD modal ───────────────────────────────────────────────────────────
function LoanModal({ initial, onSave, onClose }) {
  const defaults = {
    nombre:          initial?.nombre          ?? '',
    banco:           initial?.banco           ?? '',
    tipo:            initial?.tipo            ?? 'personal',
    montoOriginal:   String(initial?.montoOriginal   ?? ''),
    totalCuotas:     String(initial?.totalCuotas     ?? ''),
    cuotasYaPagadas: String(initial?.cuotasYaPagadas ?? ''),
    capitalPorCuota: String(initial?.capitalPorCuota ?? ''),
    interesPorCuota: String(initial?.interesPorCuota ?? ''),
    tasaAnual:       String(initial?.tasaAnual       ?? ''),
    fechaInicio:     initial?.fechaInicio     ?? '',
    fechaFin:        initial?.fechaFin        ?? '',
    diaPago:         String(initial?.diaPago  ?? ''),
    moneda:          initial?.moneda          ?? 'PEN',
    activo:          initial?.activo          ?? true,
  }
  const [form, setForm] = useState(defaults)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const capital  = Number(form.capitalPorCuota) || 0
  const interes  = Number(form.interesPorCuota) || 0
  const cuotaTotal = capital + interes

  const totalCuotas     = Number(form.totalCuotas)     || 0
  const cuotasYaPagadas = Number(form.cuotasYaPagadas) || 0
  const cuotasRestantes = Math.max(0, totalCuotas - cuotasYaPagadas)

  // Auto-compute saldo from capital data if available
  const saldoAuto = capital > 0 && cuotasRestantes > 0 ? capital * cuotasRestantes : null
  const montoOrig = Number(form.montoOriginal) || 0
  const saldoFinal = saldoAuto ?? montoOrig

  const pct = montoOrig > 0 && saldoFinal <= montoOrig
    ? (montoOrig - saldoFinal) / montoOrig
    : 0

  const valid = form.nombre.trim() && montoOrig > 0

  const curr = form.moneda === 'USD' ? 'US$' : 'S/'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Registrar'} préstamo</div>
            <h2 className="modal-title">{form.nombre || 'Nuevo préstamo'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          {/* Name + bank */}
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

          {/* Type + currency */}
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

          {/* Monto + TEA */}
          <div className="field-row">
            <div className="field">
              <label>Monto original del préstamo</label>
              <div className="amount-input">
                <span className="amount-prefix mono">{curr}</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={form.montoOriginal} onChange={e => set('montoOriginal', e.target.value)} placeholder="0.00"/>
              </div>
            </div>
            <div className="field">
              <label>Tasa anual — TEA (%)</label>
              <input type="text" inputMode="decimal"
                value={form.tasaAnual} onChange={e => set('tasaAnual', e.target.value)} placeholder="15.00"/>
            </div>
          </div>

          {/* Cuota breakdown — always visible */}
          <div style={{ background: 'var(--bg-sunk)', borderRadius: 10, padding: '14px 16px', marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)', marginBottom: 12 }}>
              Desglose de la cuota mensual
            </div>
            <div className="field-row" style={{ marginBottom: 0 }}>
              <div className="field">
                <label>Capital por cuota</label>
                <div className="amount-input">
                  <span className="amount-prefix mono">{curr}</span>
                  <input type="text" inputMode="decimal" className="amount-field mono"
                    value={form.capitalPorCuota}
                    onChange={e => set('capitalPorCuota', e.target.value)}
                    placeholder="0.00"/>
                </div>
              </div>
              <div className="field">
                <label>Interés por cuota</label>
                <div className="amount-input">
                  <span className="amount-prefix mono">{curr}</span>
                  <input type="text" inputMode="decimal" className="amount-field mono"
                    value={form.interesPorCuota}
                    onChange={e => set('interesPorCuota', e.target.value)}
                    placeholder="0.00"/>
                </div>
              </div>
              <div className="field" style={{ flex: '0 0 auto', minWidth: 110 }}>
                <label style={{ color: 'var(--accent)' }}>Cuota total</label>
                <div className="amount-input" style={{ background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-elev))' }}>
                  <span className="amount-prefix mono" style={{ color: 'var(--accent)' }}>{curr}</span>
                  <span className="amount-field mono" style={{ color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                    {cuotaTotal > 0 ? cuotaTotal.toFixed(2) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Total cuotas + ya pagadas */}
          <div className="field-row">
            <div className="field">
              <label>Total de cuotas pactadas</label>
              <input type="number" min={1} value={form.totalCuotas}
                onChange={e => set('totalCuotas', e.target.value)} placeholder="Ej. 12"/>
            </div>
            <div className="field">
              <label>
                ¿Cuántas ya pagaste?{' '}
                <span style={{ fontWeight: 400, color: 'var(--ink-faint)', fontSize: 11 }}>
                  (para préstamos históricos)
                </span>
              </label>
              <input type="number" min={0} value={form.cuotasYaPagadas}
                onChange={e => set('cuotasYaPagadas', e.target.value)} placeholder="0"/>
            </div>
          </div>

          {/* Auto-computed summary */}
          {totalCuotas > 0 && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 4, fontSize: 12,
              background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-elev))',
              border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
            }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <span>Cuotas pagadas: <strong style={{ color: 'var(--good)' }}>{cuotasYaPagadas}</strong></span>
                <span>Cuotas restantes: <strong style={{ color: 'var(--bad)' }}>{cuotasRestantes}</strong></span>
                {saldoAuto != null && (
                  <span>Saldo estimado: <strong className="mono">{fmtPEN(saldoAuto)}</strong></span>
                )}
              </div>
              {saldoAuto != null && montoOrig > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct * 100}%`, background: 'var(--accent)', borderRadius: 2 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, color: 'var(--ink-faint)', fontSize: 10 }}>
                    <span>Pagado {(pct*100).toFixed(0)}%</span>
                    <span>{fmtPEN(montoOrig - saldoFinal)} de {fmtPEN(montoOrig)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dates + pay day */}
          <div className="field-row">
            <div className="field">
              <label>Fecha inicio</label>
              <input type="date" value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)}/>
            </div>
            <div className="field">
              <label>Fecha fin</label>
              <input type="date" value={form.fechaFin} onChange={e => set('fechaFin', e.target.value)}/>
            </div>
            <div className="field" style={{ flex: '0 0 auto', minWidth: 100 }}>
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
            onClick={() => {
              const capQ   = Number(form.capitalPorCuota) || 0
              const intQ   = Number(form.interesPorCuota) || 0
              const totC   = Number(form.totalCuotas)     || 0
              const yaP    = Number(form.cuotasYaPagadas) || 0
              const restantes = Math.max(0, totC - yaP)
              const saldoCalc = capQ > 0 && restantes > 0
                ? capQ * restantes
                : Number(form.montoOriginal) || 0
              onSave({
                nombre:          form.nombre,
                banco:           form.banco,
                tipo:            form.tipo,
                montoOriginal:   Number(form.montoOriginal)   || 0,
                saldoPendiente:  saldoCalc,
                totalCuotas:     totC,
                cuotasYaPagadas: yaP,
                capitalPorCuota: capQ,
                interesPorCuota: intQ,
                cuota:           capQ + intQ,
                tasaAnual:       Number(form.tasaAnual)       || 0,
                fechaInicio:     form.fechaInicio || null,
                fechaFin:        form.fechaFin   || null,
                diaPago:         Number(form.diaPago) || null,
                moneda:          form.moneda,
                activo:          form.activo,
              })
            }}>
            <Icon name="check" size={14}/> {initial ? 'Guardar cambios' : 'Registrar préstamo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Payment modal ─────────────────────────────────────────────────────────────
function PaymentModal({ loan, cuotaNum, accounts, onConfirm, onClose }) {
  const capDef = String(loan.capitalPorCuota ?? '')
  const intDef = String(loan.interesPorCuota ?? '')
  const [capital,   setCapital]   = useState(capDef)
  const [interes,   setInteres]   = useState(intDef)
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0])
  const [notes,     setNotes]     = useState('')
  const [accountId, setAccountId] = useState(null)

  const capNum = Number(capital)  || 0
  const intNum = Number(interes) || 0
  const total  = capNum + intNum || Number(loan.cuota ?? 0)

  const newSaldo = Math.max(0, (loan.saldoPendiente ?? 0) - capNum)
  const valid    = total > 0

  const activeAccounts = (accounts || []).filter(a => a.activa !== false)
  const curr = loan.moneda === 'USD' ? 'US$' : 'S/'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              {loan.nombre}
              {loan.totalCuotas > 0 && (
                <span style={{ color: 'var(--accent)', marginLeft: 6 }}>· Cuota {cuotaNum} de {loan.totalCuotas}</span>
              )}
            </div>
            <h2 className="modal-title">Registrar pago de cuota</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          {/* Status summary */}
          <div style={{ padding: '10px 14px', background: 'var(--bg-sunk)', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div>
              <div style={{ color: 'var(--ink-faint)', fontSize: 11, marginBottom: 2 }}>Saldo actual</div>
              <div className="mono" style={{ fontWeight: 700, color: 'var(--bad)' }}>{fmtPEN(loan.saldoPendiente ?? 0)}</div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-faint)', fontSize: 11, marginBottom: 2 }}>Saldo tras este pago</div>
              <div className="mono" style={{ fontWeight: 700, color: 'var(--good)' }}>{fmtPEN(newSaldo)}</div>
            </div>
          </div>

          {/* Capital + interest — always visible */}
          <div style={{ background: 'var(--bg-sunk)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)', marginBottom: 10 }}>
              Desglose de la cuota
            </div>
            <div className="field-row" style={{ marginBottom: 0 }}>
              <div className="field">
                <label>Capital amortizado</label>
                <div className="amount-input">
                  <span className="amount-prefix mono">{curr}</span>
                  <input type="text" inputMode="decimal" className="amount-field mono" autoFocus
                    value={capital} onChange={e => setCapital(e.target.value)} placeholder="0.00"/>
                </div>
              </div>
              <div className="field">
                <label>Interés</label>
                <div className="amount-input">
                  <span className="amount-prefix mono">{curr}</span>
                  <input type="text" inputMode="decimal" className="amount-field mono"
                    value={interes} onChange={e => setInteres(e.target.value)} placeholder="0.00"/>
                </div>
              </div>
              <div className="field" style={{ flex: '0 0 auto', minWidth: 110 }}>
                <label style={{ color: 'var(--accent)' }}>Total a pagar</label>
                <div className="amount-input" style={{ background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-elev))' }}>
                  <span className="amount-prefix mono" style={{ color: 'var(--accent)' }}>{curr}</span>
                  <span className="amount-field mono" style={{ color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                    {total > 0 ? total.toFixed(2) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Fecha de pago</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}/>
            </div>
            {activeAccounts.length > 0 && (
              <div className="field" style={{ flex: 2 }}>
                <label>Debitar de cuenta <span style={{ fontWeight:400, color:'var(--ink-faint)', fontSize:11 }}>(opcional)</span></label>
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

          <div className="field">
            <label>Notas <span style={{ fontWeight:400, color:'var(--ink-faint)', fontSize:11 }}>(opcional)</span></label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={`Cuota ${cuotaNum}${loan.totalCuotas ? ` de ${loan.totalCuotas}` : ''}…`}/>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onConfirm({
              loanId:   loan.id,
              amount:   total,
              capital:  capNum || total,
              interes:  intNum,
              date, notes, accountId,
            })}>
            <Icon name="check" size={14}/> Registrar cuota {cuotaNum > 0 ? `#${cuotaNum}` : ''}
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

  const myPayments = (payments || [])
    .filter(p => p.loanId === loan.id)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  // Cuotas counter: initial historical + registered payments
  const cuotasPagadas = (loan.cuotasYaPagadas || 0) + myPayments.length
  const totalCuotas   = loan.totalCuotas || 0
  const cuotaActual   = cuotasPagadas + 1  // next cuota to pay
  const cuotasRestantes = totalCuotas > 0 ? Math.max(0, totalCuotas - cuotasPagadas) : null

  const daysLeft = daysUntilPayment(loan.diaPago)
  const urgente  = daysLeft !== null && daysLeft <= 5 && saldo > 0
  const isPaid   = saldo === 0

  const curr = loan.moneda === 'USD' ? 'US$' : 'S/'

  return (
    <motion.div
      className="card"
      variants={staggerItem}
      whileHover={hoverLift}
      style={{
        border: urgente ? '2px solid var(--warn)' : isPaid ? '2px solid var(--good)' : '1px solid var(--border)',
        position: 'relative', overflow: 'hidden', padding: 0,
      }}
    >
      {/* Urgency stripe */}
      {urgente && !isPaid && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--warn)' }} />
      )}

      <div style={{ padding: '16px 18px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, padding: '2px 8px', borderRadius: 4, marginBottom: 5,
              background: `color-mix(in srgb, ${TIPO_COLOR[tipo]} 15%, var(--bg-elev))`,
              color: TIPO_COLOR[tipo],
            }}>
              {TIPO_LABEL[tipo] ?? tipo}{loan.banco && ` · ${loan.banco}`}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{loan.nombre}</div>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {isPaid && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'color-mix(in srgb, var(--good) 18%, var(--bg-elev))', color: 'var(--good)' }}>
                ✓ PAGADO
              </span>
            )}
            <button className="btn btn-xs btn-ghost" onClick={() => onEdit(loan)}><Icon name="edit" size={11}/></button>
            <button className="btn btn-xs btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => onDelete(loan)}>
              <Icon name="trash" size={11}/>
            </button>
          </div>
        </div>

        {/* Amounts grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 8px', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--ink-mute)' }}>Saldo pendiente</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 16, color: isPaid ? 'var(--good)' : 'var(--bad)' }}>
              {fmtPEN(saldo)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--ink-mute)' }}>Monto original</div>
            <div className="mono" style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-mute)' }}>
              {fmtPEN(original)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--ink-mute)' }}>Cuota mensual</div>
            <div className="mono" style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
              {loan.cuota > 0 ? fmtPEN(loan.cuota) : '—'}
            </div>
          </div>
        </div>

        {/* Cuota breakdown */}
        {(loan.capitalPorCuota > 0 || loan.interesPorCuota > 0) && (
          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--ink-mute)', marginBottom: 8 }}>
            <span>Capital: <strong className="mono">{fmtPEN(loan.capitalPorCuota ?? 0)}</strong></span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>Interés: <strong className="mono">{fmtPEN(loan.interesPorCuota ?? 0)}</strong></span>
          </div>
        )}

        {/* Progress bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct * 100}%`,
              background: isPaid ? 'var(--good)' : 'var(--accent)',
              borderRadius: 4, transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-faint)', marginTop: 3 }}>
            <span>Pagado {(pct * 100).toFixed(0)}% · {fmtPEN(pagado)}</span>
            <span>{fmtPEN(saldo)} restante</span>
          </div>
        </div>

        {/* Meta pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {totalCuotas > 0 && (
            <span style={{
              fontSize: 11, padding: '3px 9px', borderRadius: 6, fontWeight: 600,
              background: 'color-mix(in srgb, var(--accent) 12%, var(--bg-elev))',
              color: 'var(--accent)',
            }}>
              Cuota {isPaid ? totalCuotas : cuotasPagadas} / {totalCuotas}
              {!isPaid && cuotasRestantes !== null && ` · ${cuotasRestantes} restante${cuotasRestantes !== 1 ? 's' : ''}`}
            </span>
          )}
          {loan.tasaAnual > 0 && (
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-sunk)', color: 'var(--ink-mute)' }}>
              TEA {loan.tasaAnual}%
            </span>
          )}
          {loan.diaPago && !isPaid && (
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 4,
              background: urgente ? 'color-mix(in srgb, var(--warn) 15%, var(--bg-elev))' : 'var(--bg-sunk)',
              color: urgente ? 'var(--warn)' : 'var(--ink-mute)', fontWeight: urgente ? 700 : 400,
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
              {myPayments.length} pago{myPayments.length !== 1 ? 's' : ''} registrado{myPayments.length !== 1 ? 's' : ''} {showHistory ? '▲' : '▼'}
            </button>
          )}
        </div>

        {/* Payment history */}
        {showHistory && myPayments.length > 0 && (
          <div style={{ background: 'var(--bg-sunk)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)', marginBottom: 8 }}>
              Historial de pagos
            </div>
            {myPayments.slice(0, 12).map((p, i) => (
              <div key={p.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8,
                padding: '5px 0', borderBottom: i < myPayments.length - 1 ? '1px solid var(--border)' : 'none',
                fontSize: 12,
              }}>
                <span style={{ color: 'var(--ink-mute)' }}>{p.date || '—'}{p.notes ? ` · ${p.notes}` : ''}</span>
                {p.capital > 0 && p.interes > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    K {fmtPEN(p.capital)} + I {fmtPEN(p.interes)}
                  </span>
                )}
                <span className="mono" style={{ fontWeight: 600 }}>{fmtPEN(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pay button */}
      {!isPaid && (
        <button
          className="btn btn-soft btn-full"
          style={{
            borderTop: '1px solid var(--border)', borderRadius: 0,
            margin: 0, padding: '11px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          onClick={() => onPay(loan, cuotaActual)}
        >
          <Icon name="check" size={13}/>
          Registrar cuota {totalCuotas > 0 ? `${cuotaActual} de ${totalCuotas}` : ''}
          {loan.cuota > 0 && <span className="mono" style={{ fontWeight: 700 }}>{fmtPEN(loan.cuota)}</span>}
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
  const [payModal, setPayModal] = useState(null)  // null | { loan, cuotaNum }

  const active   = loans.filter(l => l.activo !== false && (l.saldoPendiente ?? l.montoOriginal ?? 1) > 0)
  const pagados  = loans.filter(l => l.activo !== false && (l.saldoPendiente ?? 1) === 0)
  const inactive = loans.filter(l => l.activo === false)

  const totalDeuda  = active.reduce((s, l) => s + (l.saldoPendiente ?? 0), 0)
  const totalCuota  = active.reduce((s, l) => s + (l.cuota ?? 0), 0)
  const totalPagado = loanPayments.reduce((s, p) => s + (p.amount ?? 0), 0)

  // Next payment urgency
  const urgentLoans = active.filter(l => {
    const d = daysUntilPayment(l.diaPago)
    return d !== null && d <= 7
  }).sort((a, b) => daysUntilPayment(a.diaPago) - daysUntilPayment(b.diaPago))

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

  function handlePay(loan, cuotaNum) {
    setPayModal({ loan, cuotaNum })
  }

  function confirmPayment(data) {
    onRegisterLoanPayment(data)
    setPayModal(null)
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Deuda a largo plazo</div>
          <h1>Préstamos</h1>
          <p className="lede">
            Registra capital, interés y cuotas. Cada cuota pagada reduce el saldo y actualiza el progreso.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14}/> Nuevo préstamo
          </button>
        </div>
      </header>

      {/* KPIs */}
      <motion.section className="kpi-row" variants={staggerContainer} initial="hidden" animate="visible" style={{ marginBottom: 28 }}>
        <motion.div className="kpi kpi-accent" variants={staggerItem} whileHover={hoverLift}>
          <div className="kpi-label">Deuda total</div>
          <div className="kpi-value" style={{ color: totalDeuda > 0 ? 'var(--bad)' : 'var(--ink-mute)' }}>
            {totalDeuda > 0 ? fmtPEN(totalDeuda) : '—'}
          </div>
          <div className="kpi-foot">{active.length} préstamo{active.length !== 1 ? 's' : ''} activo{active.length !== 1 ? 's' : ''}</div>
        </motion.div>
        <motion.div className="kpi" variants={staggerItem} whileHover={hoverLift}>
          <div className="kpi-label">Cuota mensual total</div>
          <div className="kpi-value">{totalCuota > 0 ? fmtPEN(totalCuota) : '—'}</div>
          <div className="kpi-foot">Gasto fijo mensual</div>
        </motion.div>
        <motion.div className="kpi" variants={staggerItem} whileHover={hoverLift}>
          <div className="kpi-label">Total amortizado</div>
          <div className="kpi-value" style={{ color: 'var(--good)' }}>
            {totalPagado > 0 ? fmtPEN(totalPagado) : '—'}
          </div>
          <div className="kpi-foot">{loanPayments.length} pago{loanPayments.length !== 1 ? 's' : ''} registrado{loanPayments.length !== 1 ? 's' : ''}</div>
        </motion.div>
        {pagados.length > 0 && (
          <motion.div className="kpi" variants={staggerItem} whileHover={hoverLift}>
            <div className="kpi-label">Cancelados</div>
            <div className="kpi-value" style={{ color: 'var(--good)' }}>{pagados.length}</div>
            <div className="kpi-foot">Préstamo{pagados.length !== 1 ? 's' : ''} liquidado{pagados.length !== 1 ? 's' : ''} ✓</div>
          </motion.div>
        )}
      </motion.section>

      {/* Upcoming payment alert */}
      {urgentLoans.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, var(--warn) 10%, var(--bg-elev))',
          border: '1px solid color-mix(in srgb, var(--warn) 35%, transparent)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--warn)', marginBottom: 4 }}>Pagos próximos</div>
            {urgentLoans.map(l => {
              const d = daysUntilPayment(l.diaPago)
              const myP = loanPayments.filter(p => p.loanId === l.id)
              const cuotaN = (l.cuotasYaPagadas || 0) + myP.length + 1
              return (
                <div key={l.id} style={{ fontSize: 13 }}>
                  <strong>{l.nombre}</strong>
                  {l.totalCuotas > 0 && <span style={{ color: 'var(--ink-mute)', fontSize: 11 }}> (cuota {cuotaN}/{l.totalCuotas})</span>}
                  {l.cuota > 0 && <span className="mono"> {fmtPEN(l.cuota)}</span>}
                  <span style={{ color: 'var(--ink-mute)' }}>{' — '}{d === 0 ? 'hoy' : `en ${d} día${d !== 1 ? 's' : ''}`}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Loan cards */}
      {loans.filter(l => l.activo !== false).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
          <h3 style={{ marginBottom: 8 }}>Sin préstamos registrados</h3>
          <p style={{ color: 'var(--ink-mute)', marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
            Registra tus préstamos activos. Incluye capital, interés y cuántas cuotas ya pagaste para arrancar con el saldo correcto.
          </p>
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14}/> Registrar primer préstamo
          </button>
        </div>
      ) : (
        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 32 }}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
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
                <button className="btn btn-xs btn-ghost" onClick={() => onEditLoan({ ...l, activo: true })}>↩ Reactivar</button>
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
          cuotaNum={payModal.cuotaNum}
          accounts={accounts}
          onConfirm={confirmPayment}
          onClose={() => setPayModal(null)}
        />
      )}
    </div>
  )
}
