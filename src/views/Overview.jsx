import Icon from '../components/Icon.jsx'
import Avatar from '../components/Avatar.jsx'
import Bar from '../components/Bar.jsx'
import Ring from '../components/Ring.jsx'
import StatusPill from '../components/StatusPill.jsx'
import CashflowChart from '../components/CashflowChart.jsx'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useDialog } from '../hooks/useDialog.js'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, hoverLift, tapScale } from '../lib/animations.js'
import { fmtPEN } from '../data.js'
import { loadData, KEYS } from '../lib/storage.js'

// ── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    const start = performance.now()
    const from = 0
    cancelAnimationFrame(rafRef.current)
    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(from + (target - from) * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])
  return value
}

const ACCOUNT_TYPES = ['Cuenta corriente', 'Cuenta de ahorros', 'Cuenta negocio', 'Billetera digital', 'Otro']

function AccountModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ?? { bank: '', last4: '', balance: '', type: 'Cuenta corriente' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.bank.trim() && Number(form.balance) >= 0
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Agregar'} cuenta</div>
            <h2 className="modal-title">{form.bank || 'Nueva cuenta'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <div className="field">
              <label>Banco o entidad</label>
              <input type="text" value={form.bank} onChange={e => set('bank', e.target.value)}
                placeholder="Ej. BCP, BBVA, Yape…" autoFocus/>
            </div>
            <div className="field">
              <label>Últimos 4 dígitos (opcional)</label>
              <input type="text" maxLength={4} value={form.last4} onChange={e => set('last4', e.target.value)} placeholder="4421"/>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Saldo actual</label>
              <div className="amount-input">
                <span className="amount-prefix mono">S/</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={form.balance} onChange={e => set('balance', e.target.value)} placeholder="0.00"/>
              </div>
            </div>
            <div className="field">
              <label>Tipo</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onSave({ ...form, balance: Number(form.balance) || 0 })}>
            <Icon name="check" size={14}/> {initial ? 'Guardar' : 'Agregar cuenta'}
          </button>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, delta, deltaPositive, foot, accent, rawValue }) {
  // Count-up: only if rawValue (number) provided
  const counted = useCountUp(rawValue ?? 0)
  const displayValue = rawValue != null
    ? value.replace(/[\d,]+\.?\d*/, fmtPEN(counted).replace('S/ ', ''))
    : value

  return (
    <motion.div
      className={`kpi ${accent ? 'kpi-accent' : ''}`}
      variants={staggerItem}
      whileHover={hoverLift}
      whileTap={tapScale}
      style={{ cursor: 'default' }}
    >
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{rawValue != null ? fmtPEN(counted) : value}</div>
      {delta && (
        <div className={`kpi-delta ${deltaPositive ? 'is-pos' : 'is-neg'}`}>
          <Icon name={deltaPositive ? 'arrowUp' : 'arrowDown'} size={12} />
          {delta}
        </div>
      )}
      {foot && <div className="kpi-foot">{foot}</div>}
    </motion.div>
  )
}

function EmptyCard({ icon, title, desc, action, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon name={icon} size={22} /></div>
      <h3>{title}</h3>
      <p>{desc}</p>
      {action && <button className="btn btn-primary btn-xs" onClick={onAction}>{action}</button>}
    </div>
  )
}

// Current month label
const NOW = new Date()
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const CURRENT_MONTH = `${MONTHS_ES[NOW.getMonth()]} ${NOW.getFullYear()}`

// ── "Tu sueldo real" breakdown card ───────────────────────────────────────────
function RealSalaryCard({ data, bills = [], settings = {}, invoices = [] }) {
  // Read variable expenses from localStorage (self-contained)
  const variableExpenses = useMemo(() => loadData(KEYS.variableExpenses, []), [])

  const now      = new Date()
  const thisYear = now.getFullYear()
  const thisMon  = now.getMonth()

  // Ingresos brutos = facturas pagadas este mes
  const ingresosBrutos = invoices
    .filter(i => {
      if (i.status !== 'paid' || !i.issuedDate) return false
      const d = new Date(i.issuedDate)
      return d.getFullYear() === thisYear && d.getMonth() === thisMon
    })
    .reduce((s, i) => s + (i.amount || 0), 0)

  // Impuestos apartados = taxRate % de ingresos brutos
  const taxRate = (settings.taxRate || 30) / 100
  const impuestos = ingresosBrutos * taxRate

  // Gastos de negocio = bills activos + gastos variables deducibles del mes
  const billsTotal = bills.filter(b => b.active !== false).reduce((s, b) => s + (b.amount || 0), 0)
  const varDeducible = variableExpenses
    .filter(e => {
      if (!e.deductible) return false
      if (!e.date) return false
      const d = new Date(e.date)
      return d.getFullYear() === thisYear && d.getMonth() === thisMon
    })
    .reduce((s, e) => s + (e.amount || 0), 0)
  const gastoNegocio = billsTotal + varDeducible

  // Sueldo real
  const sueldoReal = ingresosBrutos - impuestos - gastoNegocio

  // Personal expenses = variable expenses NOT deductible this month
  const gastosPersonales = variableExpenses
    .filter(e => {
      if (e.deductible) return false
      if (!e.date) return false
      const d = new Date(e.date)
      return d.getFullYear() === thisYear && d.getMonth() === thisMon
    })
    .reduce((s, e) => s + (e.amount || 0), 0)

  // Contextual message
  let contextMsg = null
  if (gastosPersonales > 0 && sueldoReal < gastosPersonales) {
    contextMsg = { icon: '⚠️', text: 'Este mes gastaste más de lo que te quedó', color: 'var(--bad)' }
  } else if (gastosPersonales > 0 && sueldoReal > gastosPersonales * 1.3) {
    contextMsg = { icon: '✅', text: 'Buen mes, considera aportar al fondo de emergencia', color: 'var(--good)' }
  } else if (ingresosBrutos > 0) {
    const pct = ((sueldoReal / ingresosBrutos) * 100).toFixed(0)
    contextMsg = { icon: '📊', text: `Tu sueldo real representa el ${pct}% de tus ingresos brutos`, color: 'var(--ink-mute)' }
  }

  if (ingresosBrutos === 0 && billsTotal === 0) return null

  const cols = [
    {
      label:    'Ing. brutos',
      value:    ingresosBrutos,
      sub:      'Facturas cobradas',
      color:    'var(--good)',
      prefix:   '',
    },
    {
      label:    '− Impuestos',
      value:    impuestos,
      sub:      `${(settings.taxRate || 30)}% reserva`,
      color:    '#ef4444',
      prefix:   '−',
    },
    {
      label:    '− Gastos negocio',
      value:    gastoNegocio,
      sub:      `Fijos + variables deducibles`,
      color:    '#f97316',
      prefix:   '−',
    },
    {
      label:    '= Sueldo real',
      value:    Math.max(sueldoReal, 0),
      sub:      'Lo que queda para vivir',
      color:    sueldoReal >= 0 ? '#16a34a' : 'var(--bad)',
      prefix:   sueldoReal < 0 ? '−' : '',
      highlight: true,
    },
  ]

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-head" style={{ marginBottom: 14 }}>
        <div>
          <div className="card-eyebrow">Este mes · separación negocio / personal</div>
          <h3 className="card-title">Tu sueldo real</h3>
        </div>
      </div>

      {/* 4-column breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0,
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 12,
      }}>
        {cols.map((col, i) => (
          <div
            key={col.label}
            style={{
              padding: '14px 16px',
              borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
              background: col.highlight
                ? `color-mix(in srgb, ${col.color} 8%, var(--bg-elev))`
                : 'var(--bg-elev)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 6, fontWeight: 500 }}>
              {col.label}
            </div>
            <div
              className="mono"
              style={{ fontSize: 17, fontWeight: col.highlight ? 800 : 600, color: col.color }}
            >
              {col.prefix}{fmtPEN(Math.abs(col.value), { decimals: 0 })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>{col.sub}</div>
          </div>
        ))}
      </div>

      {/* Context message */}
      {contextMsg && (
        <div style={{ fontSize: 13, color: contextMsg.color, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{contextMsg.icon}</span>
          <span>{contextMsg.text}</span>
        </div>
      )}
    </div>
  )
}

export default function Overview({ data, invoices, bills, goals, accounts, clients, fixedIncome, onMarkPaid, onNewInvoice, onGoto, settings, onAddAccount, onEditAccount, onDeleteAccount }) {
  const dialog = useDialog()
  const [accModal, setAccModal] = useState(null) // null | 'new' | { account }

  function handleAccSave(data) {
    if (accModal === 'new') onAddAccount({ ...data, id: 'acc-' + Date.now() })
    else onEditAccount({ ...accModal.account, ...data })
    setAccModal(null)
  }
  const net = data.inThisMonth - data.outThisMonth
  const taxPct = data.taxTarget > 0 ? data.taxSetAside / data.taxTarget : 0
  const hoursPct = data.hoursBilled > 0 ? data.hoursPaid / data.hoursBilled : 0
  const overdue = invoices.filter(i => i.status === 'overdue')
  const pending = invoices.filter(i => i.status === 'pending')
  const avgBurn = data.cashflow.length > 0
    ? data.cashflow.reduce((s, r) => s + r.exp, 0) / data.cashflow.length
    : 0
  const runwayMonths = avgBurn > 0 ? data.cashAvailable / avgBurn : 0

  const firstName = settings?.name ? settings.name.split(' ')[0] : 'aquí'
  const hasInvoices = invoices.length > 0
  const hasCashflow = data.cashflow.length > 0

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">{CURRENT_MONTH}</div>
          <h1>Hola, {firstName} — esto es <span className="ink-accent">lo que vale tu mes</span>.</h1>
          <p className="lede">
            {hasInvoices
              ? <>Tienes {invoices.length} factura(s) · {overdue.length > 0
                  ? <strong className="ink-bad">{overdue.length} vencida(s)</strong>
                  : 'todo al día'}.</>
              : 'Empieza creando tu primera factura para ver el resumen aquí.'}
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-ghost"><Icon name="download" size={14} /> Exportar</button>
          <button className="btn btn-primary" onClick={onNewInvoice}><Icon name="plus" size={14} /> Nueva factura</button>
        </div>
      </header>

      <motion.section
        className="kpi-row"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <KpiCard
          label="Disponible para gastar"
          value={fmtPEN(data.cashAvailable)}
          rawValue={data.cashAvailable}
          foot={runwayMonths > 0 ? `Runway: ~${runwayMonths.toFixed(1)} meses` : 'Configura tus cuentas'}
          accent
        />
        <KpiCard
          label="Ingresos del mes"
          value={fmtPEN(data.inThisMonth)}
          rawValue={data.inThisMonth}
          foot={
            data.projectedIncome > 0
              ? `${invoices.filter(i => i.status === 'paid').length} cobradas · +${fmtPEN(data.projectedIncome, { decimals: 0 })} proyectado`
              : `${invoices.filter(i => i.status === 'paid').length} facturas cobradas`
          }
        />
        <KpiCard
          label="Egresos del mes"
          value={fmtPEN(data.outThisMonth)}
          rawValue={data.outThisMonth}
          foot={`${(bills || []).length} gasto${(bills||[]).length !== 1 ? 's' : ''} fijo${(bills||[]).length !== 1 ? 's' : ''} activo${(bills||[]).length !== 1 ? 's' : ''}`}
        />
        <KpiCard
          label="Neto"
          value={fmtPEN(net, { sign: data.inThisMonth > 0 || data.outThisMonth > 0 })}
          rawValue={net}
          foot={data.inThisMonth > 0 ? `Margen ${((net / data.inThisMonth) * 100).toFixed(0)}%` : 'Sin movimientos aún'}
          deltaPositive={net >= 0}
        />
      </motion.section>

      {/* Projected income notice — cotizaciones aceptadas sin factura */}
      {data.projectedIncome > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'color-mix(in srgb, var(--accent) 10%, var(--bg-elev))',
          border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="invoice" size={15} />
            <span>
              <strong>{fmtPEN(data.projectedIncome, { decimals: 0 })}</strong> en cotizaciones aceptadas pendientes de facturar
            </span>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={() => onGoto('quotes')}>
            Ver cotizaciones <Icon name="arrowRight" size={11} />
          </button>
        </div>
      )}

      {/* ── Tu sueldo real ── */}
      <RealSalaryCard data={data} bills={bills} settings={settings} invoices={invoices} />

      <section className="grid-main">
        <div className="card card-chart">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Últimos meses</div>
              <h3 className="card-title">Flujo de caja</h3>
            </div>
            {hasCashflow && (
              <div className="legend">
                <span className="legend-item"><i className="dot dot-ink" /> Ingresos</span>
                <span className="legend-item"><i className="dot dot-accent" /> Egresos</span>
                <button className="btn-link" onClick={() => onGoto('cashflow')}>Ver detalle <Icon name="arrowRight" size={12} /></button>
              </div>
            )}
          </div>
          {hasCashflow
            ? <>
                <CashflowChart data={data.cashflow} />
                <div className="chart-footnotes">
                  <div>
                    <span className="num">{fmtPEN(data.cashflow.reduce((s, r) => s + r.inc, 0))}</span>
                    <span className="lbl">Ingresos</span>
                  </div>
                  <div>
                    <span className="num">{fmtPEN(data.cashflow.reduce((s, r) => s + r.exp, 0))}</span>
                    <span className="lbl">Egresos</span>
                  </div>
                  <div>
                    <span className="num">{fmtPEN(avgBurn)}</span>
                    <span className="lbl">Burn promedio</span>
                  </div>
                </div>
              </>
            : <EmptyCard icon="cashflow" title="Sin historial aún" desc="Los datos aparecerán aquí conforme registres facturas cobradas y gastos." />
          }
        </div>

        <div className="card card-tax">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Reserva impuestos</div>
              <h3 className="card-title">Impuestos al día</h3>
            </div>
          </div>
          <div className="tax-ring">
            <div className="tax-ring-svg">
              <Ring value={taxPct} size={140} stroke={12} />
              <div className="tax-ring-center">
                <div className="tax-pct">{(taxPct * 100).toFixed(0)}%</div>
                <div className="tax-cap">renta cubierta</div>
              </div>
            </div>
          </div>
          <div className="tax-numbers">
            <div>
              <div className="lbl">Renta apartada</div>
              <div className="num">{fmtPEN(data.taxSetAside)}</div>
            </div>
            <div>
              <div className="lbl">Faltante renta</div>
              <div className="num ink-warn">{fmtPEN(Math.max(0, data.taxTarget - data.taxSetAside))}</div>
            </div>
          </div>

          {/* ── Desglose IGV + Retención del mes ── */}
          {(data.igvThisMonth > 0 || data.retentionThisMonth > 0) && (
            <div style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--ink-mute)', marginBottom: 2 }}>
                Obligaciones del mes
              </div>
              {data.igvThisMonth > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--ink-mute)' }}>IGV facturas</span>
                  <span className="mono" style={{ color: 'var(--bad)', fontWeight: 600 }}>
                    {fmtPEN(data.igvThisMonth)}
                  </span>
                </div>
              )}
              {data.retentionThisMonth > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--ink-mute)' }}>Retención RH</span>
                  <span className="mono" style={{ color: 'var(--warn)', fontWeight: 600 }}>
                    {fmtPEN(data.retentionThisMonth)}
                  </span>
                </div>
              )}
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 13,
                borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2,
              }}>
                <span style={{ fontWeight: 600, color: 'var(--ink-soft)' }}>Total a reservar</span>
                <span className="mono" style={{ fontWeight: 700 }}>
                  {fmtPEN(data.igvThisMonth + data.retentionThisMonth)}
                </span>
              </div>
            </div>
          )}

          {/* Zero-tax month — boletas only */}
          {data.igvThisMonth === 0 && data.retentionThisMonth === 0 && data.inThisMonth > 0 && (
            <div style={{
              borderTop: '1px solid var(--border)', paddingTop: 10,
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5,
              color: 'var(--good)',
            }}>
              <span>✓</span>
              <span>Sin IGV ni retención este mes — ingresos 100% líquidos</span>
            </div>
          )}

          <button className="btn btn-soft btn-full" onClick={() => onGoto('taxes')}>
            Ver detalle de impuestos <Icon name="arrowRight" size={12} />
          </button>
        </div>
      </section>

      <section className="grid-two">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Por cobrar</div>
              <h3 className="card-title">Facturas pendientes</h3>
            </div>
            <button className="btn-link" onClick={() => onGoto('invoices')}>Ver todas <Icon name="arrowRight" size={12} /></button>
          </div>
          {[...overdue, ...pending].length > 0
            ? <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Cliente</th><th>Concepto</th><th className="num-col">Monto</th>
                    <th>Vence</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...overdue, ...pending].slice(0, 5).map(inv => {
                    const c = (clients||[]).find(x => x.name === inv.client || x.id === inv.client)
                    return (
                      <tr key={inv.id}>
                        <td>
                          <div className="cell-client">
                            <Avatar name={inv.client} color={c?.color || inv.clientColor || '#a8a29e'} size={26} />
                            <div>
                              <div className="ink-strong">{inv.client}</div>
                              <div className="ink-mute">{inv.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="ink-mute">{inv.project}</td>
                        <td className="num-col mono">{fmtPEN(inv.amount)}</td>
                        <td className="ink-mute">{inv.due}</td>
                        <td><StatusPill status={inv.status} /></td>
                        <td>
                          <button className="btn btn-xs" onClick={() => onMarkPaid(inv.id)}>
                            <Icon name="check" size={12} /> Marcar pagada
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            : <EmptyCard
                icon="invoice"
                title="Sin facturas pendientes"
                desc="Cuando crees una factura aparecerá aquí hasta que esté cobrada."
                action="+ Nueva factura"
                onAction={onNewInvoice}
              />
          }
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Liquidez</div>
              <h3 className="card-title">Cuentas y tarjetas</h3>
            </div>
            <button className="btn-link" onClick={() => setAccModal('new')}>
              <Icon name="plus" size={12} /> Agregar
            </button>
          </div>
          {(accounts || []).length === 0
            ? <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-mute)', fontSize: 13 }}>
                <div style={{ marginBottom: 8 }}>Sin cuentas registradas</div>
                <button className="btn btn-xs btn-ghost" onClick={() => setAccModal('new')}>+ Agregar cuenta</button>
              </div>
            : <ul className="account-list">
                {(accounts || []).map(a => (
                  <li key={a.id} style={{ cursor: 'pointer' }} onClick={() => setAccModal({ account: a })}>
                    <div className="account-icon"><Icon name="bank" size={16} /></div>
                    <div className="account-meta">
                      <div className="ink-strong">{a.bank}</div>
                      <div className="ink-mute mono">{a.last4 ? `···· ${a.last4}` : a.type}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="account-amount mono">{fmtPEN(a.balance)}</div>
                      <button
                        className="btn btn-xs btn-quiet"
                        style={{ color: 'var(--bad)', padding: '2px 4px' }}
                        onClick={e => { e.stopPropagation(); dialog.danger({ itemName: a.bank, title: '¿Eliminar?' }).then(ok => ok && onDeleteAccount(a.id)) }}
                      >
                        <Icon name="close" size={10}/>
                      </button>
                    </div>
                  </li>
                ))}
                <li className="account-total">
                  <div className="ink-mute">Total disponible</div>
                  <div className="mono ink-strong">{fmtPEN((accounts || []).reduce((s, a) => s + a.balance, 0))}</div>
                </li>
              </ul>
          }
        </div>
      </section>

      <section className="grid-three">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Horas facturadas vs cobradas</div>
              <h3 className="card-title">Time-to-money</h3>
            </div>
          </div>
          {data.hoursBilled > 0
            ? <>
                <div className="hours-stack">
                  <div className="hours-row">
                    <div className="hours-label">Facturadas</div>
                    <div className="hours-bar"><div className="hours-fill" style={{ width: '100%', background: 'var(--ink)' }} /></div>
                    <div className="hours-num mono">{data.hoursBilled}h</div>
                  </div>
                  <div className="hours-row">
                    <div className="hours-label">Cobradas</div>
                    <div className="hours-bar"><div className="hours-fill" style={{ width: `${hoursPct * 100}%`, background: 'var(--accent)' }} /></div>
                    <div className="hours-num mono">{data.hoursPaid}h</div>
                  </div>
                </div>
                <div className="hours-foot">
                  <div>
                    <div className="lbl">Tarifa hora</div>
                    <div className="num mono">{fmtPEN(settings?.hourlyRate || 0, { decimals: 0 })}</div>
                  </div>
                  <div>
                    <div className="lbl">Por cobrar</div>
                    <div className="num mono">{fmtPEN((data.hoursBilled - data.hoursPaid) * (settings?.hourlyRate || 0), { decimals: 0 })}</div>
                  </div>
                </div>
              </>
            : <EmptyCard icon="clock" title="Sin horas registradas" desc="Configura tu tarifa en Ajustes y registra horas desde las facturas." />
          }
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">{(goals || []).length} metas activas</div>
              <h3 className="card-title">Metas de ahorro</h3>
            </div>
            <button className="btn-link" onClick={() => onGoto('goals')}>Gestionar <Icon name="arrowRight" size={12} /></button>
          </div>
          {(goals || []).length > 0
            ? <ul className="goals-list">
                {(goals || []).slice(0, 3).map(g => {
                  const p = Math.min(g.current / g.target, 1)
                  return (
                    <li key={g.id}>
                      <div className="goal-line">
                        <div className="ink-strong">{g.name}</div>
                        <div className="mono ink-mute">
                          {fmtPEN(g.current, { decimals: 0 })} <span className="ink-faint">/ {fmtPEN(g.target, { decimals: 0 })}</span>
                        </div>
                      </div>
                      <Bar value={p} color={g.color} />
                      <div className="goal-foot">
                        <span className="ink-mute">{(p * 100).toFixed(0)}% completo</span>
                        {g.eta && <span className="ink-mute">ETA · {g.eta}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            : <EmptyCard icon="goals" title="Sin metas aún" desc="Crea metas de ahorro para ver tu progreso aquí." action="+ Nueva meta" onAction={() => onGoto('goals')} />
          }
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Movimientos recientes</div>
              <h3 className="card-title">Actividad</h3>
            </div>
          </div>
          {hasInvoices
            ? <ul className="activity-list">
                {invoices.filter(i => i.status === 'paid').slice(0, 5).map((inv, i) => (
                  <li key={i}>
                    <div className="activity-icon is-in">
                      <Icon name="arrowDown" size={12} />
                    </div>
                    <div className="activity-meta">
                      <div className="ink-strong">Pago — {inv.client}</div>
                      <div className="ink-mute">{inv.id}</div>
                    </div>
                    <div className="activity-amount mono is-in">
                      + {fmtPEN(inv.amount, { decimals: 0 })}
                    </div>
                  </li>
                ))}
              </ul>
            : <EmptyCard icon="dashboard" title="Sin actividad" desc="Las facturas cobradas y los pagos aparecerán aquí." />
          }
        </div>
      </section>

      {accModal && (
        <AccountModal
          initial={accModal === 'new' ? null : accModal.account}
          onSave={handleAccSave}
          onClose={() => setAccModal(null)}
        />
      )}
    </div>
  )
}
