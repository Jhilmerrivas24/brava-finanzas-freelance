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

// ── French amortization schedule computer ────────────────────────────────────
function computeSchedule(monto, tcea, nCuotas, fechaPrimerPago) {
  if (!monto || !tcea || !nCuotas) return null
  const r = Math.pow(1 + tcea / 100, 1 / 12) - 1
  if (r <= 0) return null
  const cuotaFija = monto * r * Math.pow(1 + r, nCuotas) / (Math.pow(1 + r, nCuotas) - 1)

  let saldo = monto
  const schedule = []
  let fecha = fechaPrimerPago ? new Date(fechaPrimerPago) : null

  for (let n = 1; n <= nCuotas; n++) {
    const interes  = Math.round(saldo * r * 100) / 100
    const isLast   = n === nCuotas
    const capital  = isLast ? Math.round(saldo * 100) / 100 : Math.round((cuotaFija - interes) * 100) / 100
    const total    = Math.round((capital + interes) * 100) / 100
    saldo          = Math.round(Math.max(0, saldo - capital) * 100) / 100

    schedule.push({
      n,
      fecha: fecha ? fecha.toISOString().split('T')[0] : null,
      capital,
      interes,
      total,
    })

    if (fecha) {
      fecha = new Date(fecha)
      fecha.setMonth(fecha.getMonth() + 1)
    }
  }
  return { cuotaFija: Math.round(cuotaFija * 100) / 100, schedule }
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
    tcea:            String(initial?.tcea ?? initial?.tasaAnual ?? ''),
    fechaPrimerPago: initial?.fechaPrimerPago ?? '',
    diaPago:         String(initial?.diaPago  ?? ''),
    moneda:          initial?.moneda          ?? 'PEN',
    activo:          initial?.activo          ?? true,
  }
  const [form, setForm]         = useState(defaults)
  const [schedule, setSchedule] = useState(initial?.schedule ?? null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const monto   = Number(form.montoOriginal) || 0
  const nCuotas = Number(form.totalCuotas)   || 0
  const tcea    = Number(form.tcea)           || 0
  const yaP     = Number(form.cuotasYaPagadas) || 0

  const cuotaFija = schedule ? schedule[0]?.total : null
  const saldoFromSchedule = schedule
    ? Math.round(schedule.slice(yaP).reduce((s, r) => s + r.capital, 0) * 100) / 100
    : null
  const saldoFinal = saldoFromSchedule ?? monto
  const pct = monto > 0 && saldoFinal <= monto ? (monto - saldoFinal) / monto : 0

  const canCompute = monto > 0 && tcea > 0 && nCuotas > 0
  const valid = form.nombre.trim() && monto > 0
  const curr  = form.moneda === 'USD' ? 'US$' : 'S/'

  function handleAutoCompute() {
    const result = computeSchedule(monto, tcea, nCuotas, form.fechaPrimerPago || null)
    if (result) setSchedule(result.schedule)
  }

  function updateScheduleRow(i, field, rawVal) {
    setSchedule(prev => prev.map((r, idx) => {
      if (idx !== i) return r
      const updated = { ...r, [field]: field === 'fecha' ? rawVal : (Number(rawVal) || 0) }
      if (field !== 'fecha') updated.total = Math.round((updated.capital + updated.interes) * 100) / 100
      return updated
    }))
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Registrar'} préstamo</div>
            <h2 className="modal-title">{form.nombre || 'Nuevo préstamo'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* ── Step 1: Identificación ── */}
          <div className="field-row">
            <div className="field" style={{ flex: 2 }}>
              <label>Nombre del préstamo</label>
              <input type="text" value={form.nombre} autoFocus
                onChange={e => set('nombre', e.target.value)}
                placeholder="Ej. Préstamo MIBANCO MYPE…"/>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Banco</label>
              <input type="text" value={form.banco}
                onChange={e => set('banco', e.target.value)} placeholder="MIBANCO, BCP…"/>
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
            <div className="field" style={{ flex: '0 0 auto', minWidth: 100 }}>
              <label>Día de pago</label>
              <input type="number" min={1} max={31} value={form.diaPago}
                onChange={e => set('diaPago', e.target.value)} placeholder="19"/>
            </div>
          </div>

          {/* ── Step 2: Datos del cronograma ── */}
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 12px', paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)', marginBottom: 10 }}>
              Datos del cronograma
            </div>
            <div className="field-row">
              <div className="field">
                <label>Monto neto desembolsado</label>
                <div className="amount-input">
                  <span className="amount-prefix mono">{curr}</span>
                  <input type="text" inputMode="decimal" className="amount-field mono"
                    value={form.montoOriginal} onChange={e => set('montoOriginal', e.target.value)} placeholder="0.00"/>
                </div>
              </div>
              <div className="field">
                <label>TCEA <span style={{ fontWeight:400, color:'var(--ink-faint)', fontSize:11 }}>(%)</span></label>
                <input type="text" inputMode="decimal" value={form.tcea}
                  onChange={e => set('tcea', e.target.value)} placeholder="Ej. 77.15"/>
              </div>
              <div className="field">
                <label>N° de cuotas</label>
                <input type="number" min={1} value={form.totalCuotas}
                  onChange={e => set('totalCuotas', e.target.value)} placeholder="12"/>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Fecha del primer pago</label>
                <input type="date" value={form.fechaPrimerPago}
                  onChange={e => set('fechaPrimerPago', e.target.value)}/>
              </div>
              <div className="field">
                <label>
                  Cuotas ya pagadas{' '}
                  <span style={{ fontWeight:400, color:'var(--ink-faint)', fontSize:11 }}>(si es préstamo histórico)</span>
                </label>
                <input type="number" min={0} max={nCuotas || 999} value={form.cuotasYaPagadas}
                  onChange={e => set('cuotasYaPagadas', e.target.value)} placeholder="0"/>
              </div>
            </div>
          </div>

          {/* ── Step 3: Cronograma ── */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)' }}>
                Cronograma de pagos
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {schedule && (
                  <button type="button" className="btn btn-ghost btn-xs" style={{ color: 'var(--bad)' }}
                    onClick={() => setSchedule(null)}>
                    Borrar
                  </button>
                )}
                <button type="button" className="btn btn-soft" style={{ fontSize: 12 }}
                  disabled={!canCompute}
                  onClick={handleAutoCompute}
                  title={!canCompute ? 'Completa monto, TCEA y cuotas primero' : ''}
                >
                  ⚡ {schedule ? 'Recalcular' : 'Auto-calcular'}
                </button>
              </div>
            </div>

            {!schedule && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13, background: 'var(--bg-sunk)', borderRadius: 8 }}>
                {canCompute
                  ? 'Pulsa ⚡ Auto-calcular para generar el cronograma completo'
                  : 'Ingresa monto, TCEA y N° de cuotas para calcular'}
              </div>
            )}

            {schedule && (
              <>
                {/* Summary strip */}
                <div style={{ display: 'flex', gap: 16, padding: '8px 12px', background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-elev))', borderRadius: 8, fontSize: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span>Cuota fija: <strong className="mono" style={{ color: 'var(--accent)' }}>{fmtPEN(cuotaFija)}</strong></span>
                  <span>Total intereses: <strong className="mono">{fmtPEN(schedule.reduce((s,r) => s+r.interes, 0))}</strong></span>
                  {yaP > 0 && <span>Saldo pendiente: <strong className="mono" style={{ color: 'var(--bad)' }}>{fmtPEN(saldoFinal)}</strong></span>}
                  <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>Puedes editar cualquier celda para ajustar al estado de cuenta del banco</span>
                </div>

                {/* Progress */}
                {yaP > 0 && monto > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct*100}%`, background: 'var(--accent)', borderRadius: 2 }}/>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-faint)', marginTop: 2 }}>
                      <span>✓ {yaP} de {nCuotas} pagadas ({(pct*100).toFixed(0)}%)</span>
                      <span>{fmtPEN(saldoFinal)} pendiente</span>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr style={{ background: 'var(--bg-sunk)' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--ink-mute)', fontSize: 10, width: 32 }}>N°</th>
                          <th style={{ padding: '6px 8px', fontWeight: 700, color: 'var(--ink-mute)', fontSize: 10 }}>Fecha</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--ink-mute)', fontSize: 10 }}>Capital</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--ink-mute)', fontSize: 10 }}>Interés</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--accent)', fontSize: 10 }}>Cuota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.map((row, i) => {
                          const isPaid   = i < yaP
                          const isCurr   = i === yaP
                          return (
                            <tr key={i} style={{
                              background: isPaid ? 'color-mix(in srgb, var(--good) 5%, transparent)'
                                : isCurr ? 'color-mix(in srgb, var(--accent) 6%, transparent)'
                                : 'transparent',
                              borderBottom: '1px solid var(--border)',
                            }}>
                              <td style={{ padding: '4px 8px', textAlign: 'center', fontSize: 11,
                                color: isPaid ? 'var(--good)' : isCurr ? 'var(--accent)' : 'var(--ink-faint)',
                                fontWeight: isPaid || isCurr ? 700 : 400 }}>
                                {isPaid ? '✓' : isCurr ? '▶' : row.n}
                              </td>
                              <td style={{ padding: '3px 6px' }}>
                                <input type="date" value={row.fecha ?? ''}
                                  style={{ fontSize: 11, padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', color: 'var(--ink)', width: 118 }}
                                  onChange={e => updateScheduleRow(i, 'fecha', e.target.value)}/>
                              </td>
                              <td style={{ padding: '3px 5px' }}>
                                <input type="text" inputMode="decimal" value={row.capital}
                                  style={{ fontSize: 12, padding: '2px 5px', border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', color: 'var(--ink)', width: 70, textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                                  onChange={e => updateScheduleRow(i, 'capital', e.target.value)}/>
                              </td>
                              <td style={{ padding: '3px 5px' }}>
                                <input type="text" inputMode="decimal" value={row.interes}
                                  style={{ fontSize: 12, padding: '2px 5px', border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', color: 'var(--ink)', width: 70, textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                                  onChange={e => updateScheduleRow(i, 'interes', e.target.value)}/>
                              </td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                color: isCurr ? 'var(--accent)' : isPaid ? 'var(--good)' : 'var(--ink)' }}>
                                {fmtPEN(row.total)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-sunk)' }}>
                          <td colSpan={2} style={{ padding: '5px 8px', fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)' }}>Total</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12 }}>
                            {fmtPEN(schedule.reduce((s,r) => s+r.capital, 0))}
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--ink-mute)' }}>
                            {fmtPEN(schedule.reduce((s,r) => s+r.interes, 0))}
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>
                            {fmtPEN(schedule.reduce((s,r) => s+r.total, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
            <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)}/>
            <span>Préstamo activo</span>
          </label>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => {
              const totC = Number(form.totalCuotas)     || 0
              const yaP2 = Number(form.cuotasYaPagadas) || 0
              const cuota = schedule ? (schedule[0]?.total ?? 0) : 0
              const saldo = schedule
                ? Math.round(schedule.slice(yaP2).reduce((s, r) => s + r.capital, 0) * 100) / 100
                : monto
              // Derive fechaFin from schedule last row or compute
              const fechaFin = schedule
                ? (schedule[schedule.length - 1]?.fecha ?? null)
                : null
              onSave({
                nombre:          form.nombre,
                banco:           form.banco,
                tipo:            form.tipo,
                montoOriginal:   monto,
                saldoPendiente:  saldo,
                totalCuotas:     totC,
                cuotasYaPagadas: yaP2,
                cuota,
                tcea:            Number(form.tcea) || 0,
                tasaAnual:       Number(form.tcea) || 0,
                fechaPrimerPago: form.fechaPrimerPago || null,
                fechaInicio:     form.fechaPrimerPago || null,
                fechaFin,
                diaPago:         Number(form.diaPago) || null,
                moneda:          form.moneda,
                activo:          form.activo,
                schedule:        schedule ?? null,
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
  // Look up this cuota's specific amounts from the schedule
  const schedRow = loan.schedule ? loan.schedule[cuotaNum - 1] : null
  const capDef   = schedRow ? String(schedRow.capital) : ''
  const intDef   = schedRow ? String(schedRow.interes) : ''
  const dateDef  = schedRow?.fecha ?? new Date().toISOString().split('T')[0]

  const [capital,   setCapital]   = useState(capDef)
  const [interes,   setInteres]   = useState(intDef)
  const [date,      setDate]      = useState(dateDef)
  const [notes,     setNotes]     = useState('')
  const [accountId, setAccountId] = useState(null)

  const capNum = Number(capital) || 0
  const intNum = Number(interes) || 0
  const total  = capNum + intNum || Number(loan.cuota ?? 0)
  const newSaldo = Math.max(0, (loan.saldoPendiente ?? 0) - capNum)
  const valid    = total > 0
  const curr     = loan.moneda === 'USD' ? 'US$' : 'S/'
  const activeAccounts = (accounts || []).filter(a => a.activa !== false)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
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
          {/* Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 14px', background: 'var(--bg-sunk)', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
            <div>
              <div style={{ color: 'var(--ink-faint)', fontSize: 11, marginBottom: 2 }}>Saldo actual</div>
              <div className="mono" style={{ fontWeight: 700, color: 'var(--bad)' }}>{fmtPEN(loan.saldoPendiente ?? 0)}</div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-faint)', fontSize: 11, marginBottom: 2 }}>Saldo tras este pago</div>
              <div className="mono" style={{ fontWeight: 700, color: 'var(--good)' }}>{fmtPEN(newSaldo)}</div>
            </div>
          </div>

          {/* Cuota desglose — from schedule */}
          <div style={{ background: 'var(--bg-sunk)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)', marginBottom: 10 }}>
              Desglose — Cuota {cuotaNum}{loan.totalCuotas ? ` de ${loan.totalCuotas}` : ''}
              {schedRow && <span style={{ color: 'var(--good)', marginLeft: 6 }}>· del cronograma</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Capital amortizado</label>
                <div className="amount-input">
                  <span className="amount-prefix mono">{curr}</span>
                  <input type="text" inputMode="decimal" className="amount-field mono" autoFocus
                    value={capital} onChange={e => setCapital(e.target.value)} placeholder="0.00"/>
                </div>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Interés</label>
                <div className="amount-input">
                  <span className="amount-prefix mono">{curr}</span>
                  <input type="text" inputMode="decimal" className="amount-field mono"
                    value={interes} onChange={e => setInteres(e.target.value)} placeholder="0.00"/>
                </div>
              </div>
              <div className="field" style={{ margin: 0, minWidth: 110 }}>
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
            onClick={() => onConfirm({ loanId: loan.id, amount: total, capital: capNum || total, interes: intNum, date, notes, accountId })}>
            <Icon name="check" size={14}/> Registrar cuota {cuotaNum}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Loan card ─────────────────────────────────────────────────────────────────
function LoanCard({ loan, payments, onEdit, onDelete, onPay }) {
  const [showHistory, setShowHistory] = useState(false)
  const [showSched,   setShowSched]   = useState(false)

  const saldo    = loan.saldoPendiente ?? loan.montoOriginal ?? 0
  const original = loan.montoOriginal  ?? saldo
  const pagado   = Math.max(0, original - saldo)
  const pct      = original > 0 ? Math.min(pagado / original, 1) : 0
  const tipo     = loan.tipo ?? 'personal'

  const myPayments = (payments || [])
    .filter(p => p.loanId === loan.id)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  const cuotasPagadas = (loan.cuotasYaPagadas || 0) + myPayments.length
  const totalCuotas   = loan.totalCuotas || 0
  const cuotaActual   = cuotasPagadas + 1
  const cuotasRestantes = totalCuotas > 0 ? Math.max(0, totalCuotas - cuotasPagadas) : null

  // Next cuota data from schedule
  const nextSchedRow = loan.schedule ? loan.schedule[cuotasPagadas] : null

  const daysLeft = daysUntilPayment(loan.diaPago)
  const urgente  = daysLeft !== null && daysLeft <= 5 && saldo > 0
  const isPaid   = saldo === 0
  const curr     = loan.moneda === 'USD' ? 'US$' : 'S/'

  return (
    <motion.div className="card" variants={staggerItem} whileHover={hoverLift}
      style={{ border: urgente ? '2px solid var(--warn)' : isPaid ? '2px solid var(--good)' : '1px solid var(--border)', position: 'relative', overflow: 'hidden', padding: 0 }}>
      {urgente && !isPaid && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--warn)' }} />
      )}
      <div style={{ padding: '16px 18px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 4, marginBottom: 5,
              background: `color-mix(in srgb, ${TIPO_COLOR[tipo]} 15%, var(--bg-elev))`, color: TIPO_COLOR[tipo],
            }}>
              {TIPO_LABEL[tipo] ?? tipo}{loan.banco && ` · ${loan.banco}`}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{loan.nombre}</div>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {isPaid && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'color-mix(in srgb, var(--good) 18%, var(--bg-elev))', color: 'var(--good)' }}>✓ PAGADO</span>}
            <button className="btn btn-xs btn-ghost" onClick={() => onEdit(loan)}><Icon name="edit" size={11}/></button>
            <button className="btn btn-xs btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => onDelete(loan)}><Icon name="trash" size={11}/></button>
          </div>
        </div>

        {/* Amounts */}
        {(() => {
          const totalIntereses = loan.schedule ? Math.round(loan.schedule.reduce((s, r) => s + r.interes, 0) * 100) / 100 : null
          const costoTotal     = totalIntereses != null ? Math.round((original + totalIntereses) * 100) / 100 : null
          return (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 8px', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink-mute)' }}>Saldo pendiente</div>
                  <div className="mono" style={{ fontWeight: 700, fontSize: 16, color: isPaid ? 'var(--good)' : 'var(--bad)' }}>{fmtPEN(saldo)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink-mute)' }}>Monto original</div>
                  <div className="mono" style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-mute)' }}>{fmtPEN(original)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink-mute)' }}>Cuota mensual</div>
                  <div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{loan.cuota > 0 ? fmtPEN(loan.cuota) : '—'}</div>
                </div>
              </div>
              {(totalIntereses != null) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', marginBottom: 10, padding: '7px 10px', background: 'color-mix(in srgb, var(--bad) 5%, var(--bg-elev))', borderRadius: 7 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--ink-mute)' }}>Total intereses 💸</div>
                    <div className="mono" style={{ fontWeight: 700, fontSize: 14, color: 'var(--warn)' }}>{fmtPEN(totalIntereses)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--ink-mute)' }}>Pagarás en total</div>
                    <div className="mono" style={{ fontWeight: 700, fontSize: 14, color: 'var(--bad)' }}>{fmtPEN(costoTotal)}</div>
                  </div>
                </div>
              )}
            </>
          )
        })()}

        {/* Next cuota breakdown from schedule */}
        {nextSchedRow && !isPaid && (
          <div style={{
            display: 'flex', gap: 12, fontSize: 11, padding: '7px 10px',
            background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-elev))',
            borderRadius: 7, marginBottom: 10, flexWrap: 'wrap',
          }}>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Cuota {cuotaActual}:</span>
            <span>Capital <strong className="mono">{fmtPEN(nextSchedRow.capital)}</strong></span>
            <span style={{ color: 'var(--border)' }}>+</span>
            <span>Interés <strong className="mono">{fmtPEN(nextSchedRow.interes)}</strong></span>
            <span style={{ color: 'var(--border)' }}>＝</span>
            <span style={{ fontWeight: 700 }}><strong className="mono">{fmtPEN(nextSchedRow.total)}</strong></span>
            {nextSchedRow.fecha && <span style={{ color: 'var(--ink-faint)', marginLeft: 'auto' }}>📅 {nextSchedRow.fecha}</span>}
          </div>
        )}

        {/* Progress */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct * 100}%`, background: isPaid ? 'var(--good)' : 'var(--accent)', borderRadius: 4, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-faint)', marginTop: 3 }}>
            <span>Pagado {(pct * 100).toFixed(0)}% · {fmtPEN(pagado)}</span>
            <span>{fmtPEN(saldo)} pendiente</span>
          </div>
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {totalCuotas > 0 && (
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, fontWeight: 600, background: 'color-mix(in srgb, var(--accent) 12%, var(--bg-elev))', color: 'var(--accent)' }}>
              Cuota {isPaid ? totalCuotas : cuotasPagadas}/{totalCuotas}
              {!isPaid && cuotasRestantes !== null && ` · ${cuotasRestantes} restante${cuotasRestantes !== 1 ? 's' : ''}`}
            </span>
          )}
          {loan.tcea > 0 && (
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-sunk)', color: 'var(--ink-mute)' }}>TCEA {loan.tcea}%</span>
          )}
          {loan.diaPago && !isPaid && (
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: urgente ? 'color-mix(in srgb, var(--warn) 15%, var(--bg-elev))' : 'var(--bg-sunk)', color: urgente ? 'var(--warn)' : 'var(--ink-mute)', fontWeight: urgente ? 700 : 400 }}>
              {urgente ? `⚠ Pago en ${daysLeft}d` : `Día de pago: ${loan.diaPago}`}
            </span>
          )}
          {loan.schedule && (
            <button className="btn-link" style={{ fontSize: 10, padding: '2px 4px' }}
              onClick={() => setShowSched(v => !v)}>
              📋 Ver cronograma {showSched ? '▲' : '▼'}
            </button>
          )}
          {myPayments.length > 0 && (
            <button className="btn-link" style={{ fontSize: 10, padding: '2px 4px' }}
              onClick={() => setShowHistory(v => !v)}>
              {myPayments.length} pago{myPayments.length !== 1 ? 's' : ''} {showHistory ? '▲' : '▼'}
            </button>
          )}
        </div>

        {/* Schedule preview */}
        {showSched && loan.schedule && (
          <div style={{ background: 'var(--bg-sunk)', borderRadius: 8, marginBottom: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-sunk)' }}>
                    {['N°','Fecha','Capital','Interés','Cuota'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--ink-faint)', fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loan.schedule.map((row, i) => {
                    const isPaidRow = i < cuotasPagadas
                    const isCurrent = i === cuotasPagadas
                    return (
                      <tr key={i} style={{ background: isPaidRow ? 'color-mix(in srgb, var(--good) 6%, transparent)' : isCurrent ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '4px 8px', textAlign: 'right', color: isPaidRow ? 'var(--good)' : isCurrent ? 'var(--accent)' : 'var(--ink-faint)', fontWeight: isPaidRow || isCurrent ? 700 : 400 }}>
                          {isPaidRow ? '✓' : isCurrent ? '▶' : row.n}
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--ink-mute)' }}>{row.fecha ?? '—'}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmtPEN(row.capital)}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)' }}>{fmtPEN(row.interes)}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isCurrent ? 'var(--accent)' : 'var(--ink)' }}>{fmtPEN(row.total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment history */}
        {showHistory && myPayments.length > 0 && (
          <div style={{ background: 'var(--bg-sunk)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)', marginBottom: 8 }}>Historial de pagos</div>
            {myPayments.slice(0, 12).map((p, i) => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '5px 0', borderBottom: i < myPayments.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                <span style={{ color: 'var(--ink-mute)' }}>{p.date || '—'}{p.notes ? ` · ${p.notes}` : ''}</span>
                {p.capital > 0 && p.interes > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>K {fmtPEN(p.capital)} + I {fmtPEN(p.interes)}</span>
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
          style={{ borderTop: '1px solid var(--border)', borderRadius: 0, margin: 0, padding: '11px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => onPay(loan, cuotaActual)}
        >
          <Icon name="check" size={13}/>
          Registrar cuota {totalCuotas > 0 ? `${cuotaActual} de ${totalCuotas}` : ''}
          {nextSchedRow
            ? <span className="mono" style={{ fontWeight: 700 }}>{fmtPEN(nextSchedRow.total)}</span>
            : loan.cuota > 0 ? <span className="mono" style={{ fontWeight: 700 }}>{fmtPEN(loan.cuota)}</span>
            : null}
        </button>
      )}
    </motion.div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function LoansView({ loans = [], loanPayments = [], accounts = [], onAddLoan, onEditLoan, onDeleteLoan, onRegisterLoanPayment }) {
  const dialog = useDialog()
  const [modal, setModal]       = useState(null)
  const [payModal, setPayModal] = useState(null)

  const active   = loans.filter(l => l.activo !== false && (l.saldoPendiente ?? l.montoOriginal ?? 1) > 0)
  const pagados  = loans.filter(l => l.activo !== false && (l.saldoPendiente ?? 1) === 0)
  const inactive = loans.filter(l => l.activo === false)

  const totalDeuda     = active.reduce((s, l) => s + (l.saldoPendiente ?? 0), 0)
  const totalCuota     = active.reduce((s, l) => s + (l.cuota ?? 0), 0)
  const totalPagado    = loanPayments.reduce((s, p) => s + (p.amount ?? 0), 0)
  const totalIntereses = loans.filter(l => l.activo !== false && l.schedule)
    .reduce((s, l) => s + l.schedule.reduce((si, r) => si + r.interes, 0), 0)
  const totalCostoTotal = loans.filter(l => l.activo !== false && l.montoOriginal)
    .reduce((s, l) => {
      const intereses = l.schedule ? l.schedule.reduce((si, r) => si + r.interes, 0) : 0
      return s + (l.montoOriginal ?? 0) + intereses
    }, 0)

  const urgentLoans = active.filter(l => { const d = daysUntilPayment(l.diaPago); return d !== null && d <= 7 })
    .sort((a, b) => daysUntilPayment(a.diaPago) - daysUntilPayment(b.diaPago))

  function handleSave(data) {
    if (modal === 'new') onAddLoan({ ...data, id: 'loan-' + Date.now(), createdAt: new Date().toISOString() })
    else onEditLoan({ ...modal.loan, ...data })
    setModal(null)
  }

  async function handleDelete(loan) {
    const ok = await dialog.danger({ title: 'Eliminar préstamo', itemName: loan.nombre })
    if (ok) onDeleteLoan(loan.id)
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Deuda a largo plazo</div>
          <h1>Préstamos</h1>
          <p className="lede">
            Sistema francés: cuota fija, capital e interés variables mes a mes. Cronograma completo desde el primer registro.
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
          <div className="kpi-value" style={{ color: 'var(--good)' }}>{totalPagado > 0 ? fmtPEN(totalPagado) : '—'}</div>
          <div className="kpi-foot">{loanPayments.length} pago{loanPayments.length !== 1 ? 's' : ''} registrado{loanPayments.length !== 1 ? 's' : ''}</div>
        </motion.div>
        {totalIntereses > 0 && (
          <motion.div className="kpi" variants={staggerItem} whileHover={hoverLift}>
            <div className="kpi-label">Total intereses 💸</div>
            <div className="kpi-value" style={{ color: 'var(--warn)' }}>{fmtPEN(totalIntereses)}</div>
            <div className="kpi-foot">Costo total: <span className="mono" style={{ color: 'var(--bad)', fontWeight: 700 }}>{fmtPEN(totalCostoTotal)}</span></div>
          </motion.div>
        )}
        {pagados.length > 0 && (
          <motion.div className="kpi" variants={staggerItem} whileHover={hoverLift}>
            <div className="kpi-label">Cancelados</div>
            <div className="kpi-value" style={{ color: 'var(--good)' }}>{pagados.length}</div>
            <div className="kpi-foot">Liquidado{pagados.length !== 1 ? 's' : ''} ✓</div>
          </motion.div>
        )}
      </motion.section>

      {/* Upcoming alert */}
      {urgentLoans.length > 0 && (
        <div style={{ background: 'color-mix(in srgb, var(--warn) 10%, var(--bg-elev))', border: '1px solid color-mix(in srgb, var(--warn) 35%, transparent)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
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

      {/* Cards */}
      {loans.filter(l => l.activo !== false).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
          <h3 style={{ marginBottom: 8 }}>Sin préstamos registrados</h3>
          <p style={{ color: 'var(--ink-mute)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
            Registra tu préstamo, pega el TCEA y el número de cuotas, y la app calcula automáticamente el cronograma con capital e interés por cada cuota.
          </p>
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14}/> Registrar primer préstamo
          </button>
        </div>
      ) : (
        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 32 }} variants={staggerContainer} initial="hidden" animate="visible">
          {[...active, ...pagados].map(loan => (
            <LoanCard key={loan.id} loan={loan} payments={loanPayments}
              onEdit={l => setModal({ loan: l })}
              onDelete={handleDelete}
              onPay={(l, n) => setPayModal({ loan: l, cuotaNum: n })}
            />
          ))}
        </motion.div>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <div style={{ opacity: 0.6, marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-mute)', marginBottom: 8 }}>Inactivos ({inactive.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {inactive.map(l => (
              <div key={l.id} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="wallet" size={12}/>
                <span>{l.nombre}</span>
                <button className="btn btn-xs btn-ghost" onClick={() => onEditLoan({ ...l, activo: true })}>↩ Reactivar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && <LoanModal initial={modal === 'new' ? null : modal.loan} onSave={handleSave} onClose={() => setModal(null)} />}
      {payModal && <PaymentModal loan={payModal.loan} cuotaNum={payModal.cuotaNum} accounts={accounts} onConfirm={data => { onRegisterLoanPayment(data); setPayModal(null) }} onClose={() => setPayModal(null)} />}
    </div>
  )
}
