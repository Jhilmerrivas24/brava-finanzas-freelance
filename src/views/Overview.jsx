import Icon from '../components/Icon.jsx'
import Avatar from '../components/Avatar.jsx'
import Bar from '../components/Bar.jsx'
import Ring from '../components/Ring.jsx'
import StatusPill from '../components/StatusPill.jsx'
import CashflowChart from '../components/CashflowChart.jsx'
import { useState } from 'react'
import { fmtPEN } from '../data.js'

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

function KpiCard({ label, value, delta, deltaPositive, foot, accent }) {
  return (
    <div className={`kpi ${accent ? 'kpi-accent' : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {delta && (
        <div className={`kpi-delta ${deltaPositive ? 'is-pos' : 'is-neg'}`}>
          <Icon name={deltaPositive ? 'arrowUp' : 'arrowDown'} size={12} />
          {delta}
        </div>
      )}
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
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

export default function Overview({ data, invoices, bills, goals, accounts, clients, fixedIncome, onMarkPaid, onNewInvoice, onGoto, settings, onAddAccount, onEditAccount, onDeleteAccount }) {
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

      <section className="kpi-row">
        <KpiCard
          label="Disponible para gastar"
          value={fmtPEN(data.cashAvailable)}
          foot={runwayMonths > 0 ? `Runway: ~${runwayMonths.toFixed(1)} meses` : 'Configura tus cuentas'}
          accent
        />
        <KpiCard
          label="Ingresos del mes"
          value={fmtPEN(data.inThisMonth)}
          foot={
            data.projectedIncome > 0
              ? `${invoices.filter(i => i.status === 'paid').length} cobradas · +${fmtPEN(data.projectedIncome, { decimals: 0 })} proyectado`
              : `${invoices.filter(i => i.status === 'paid').length} facturas cobradas`
          }
        />
        <KpiCard
          label="Egresos del mes"
          value={fmtPEN(data.outThisMonth)}
          foot={`${(bills || []).length} gasto${(bills||[]).length !== 1 ? 's' : ''} fijo${(bills||[]).length !== 1 ? 's' : ''} activo${(bills||[]).length !== 1 ? 's' : ''}`}
        />
        <KpiCard
          label="Neto"
          value={fmtPEN(net, { sign: data.inThisMonth > 0 || data.outThisMonth > 0 })}
          foot={data.inThisMonth > 0 ? `Margen ${((net / data.inThisMonth) * 100).toFixed(0)}%` : 'Sin movimientos aún'}
          deltaPositive={net >= 0}
        />
      </section>

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
                <div className="tax-cap">de lo necesario</div>
              </div>
            </div>
          </div>
          <div className="tax-numbers">
            <div>
              <div className="lbl">Apartado</div>
              <div className="num">{fmtPEN(data.taxSetAside)}</div>
            </div>
            <div>
              <div className="lbl">Faltante</div>
              <div className="num ink-warn">{fmtPEN(Math.max(0, data.taxTarget - data.taxSetAside))}</div>
            </div>
          </div>
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
                        onClick={e => { e.stopPropagation(); if (window.confirm(`¿Eliminar "${a.bank}"?`)) onDeleteAccount(a.id) }}
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
