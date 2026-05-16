import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'

const FREQUENCIES = [
  { value: 'monthly',    label: 'Mensual'   },
  { value: 'bimonthly',  label: 'Bimestral' },
  { value: 'quarterly',  label: 'Trimestral'},
  { value: 'annual',     label: 'Anual'     },
]

const FREQ_MONTHS = { monthly: 1, bimonthly: 2, quarterly: 3, annual: 12 }

const COLORS = ['#c2410c','#15803d','#1d4ed8','#7c3aed','#0f766e','#a16207','#be185d','#0e7490']

function annualAmount(amount, freq) {
  return (amount * 12) / (FREQ_MONTHS[freq] || 1)
}

function IncomeModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ?? {
    name: '', client: '', amount: '', frequency: 'monthly', color: COLORS[0], active: true,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.name.trim() && Number(form.amount) > 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Nuevo'} ingreso fijo</div>
            <h2 className="modal-title">{initial ? form.name : 'Agregar ingreso'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Nombre del ingreso</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ej. Retainer diseño, Alquiler local…"/>
          </div>
          <div className="field">
            <label>Cliente o fuente (opcional)</label>
            <input type="text" value={form.client} onChange={e => set('client', e.target.value)}
              placeholder="Ej. Lima Café Co."/>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Monto</label>
              <div className="amount-input">
                <span className="amount-prefix mono">S/</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00"/>
              </div>
            </div>
            <div className="field">
              <label>Frecuencia</label>
              <select value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => set('color', c)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
                  outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                  outlineOffset: 2, cursor: 'pointer',
                }}/>
              ))}
            </div>
          </div>
          {Number(form.amount) > 0 && (
            <div style={{ background: 'var(--bg-sunk)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="ink-mute">Equivalente mensual</span>
                <span className="mono ink-strong">{fmtPEN(Number(form.amount) / (FREQ_MONTHS[form.frequency] || 1))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span className="ink-mute">Equivalente anual</span>
                <span className="mono ink-mute">{fmtPEN(annualAmount(Number(form.amount), form.frequency), { decimals: 0 })}</span>
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave({
            ...form, amount: Number(form.amount),
          })}>
            <Icon name="check" size={14}/> {initial ? 'Guardar cambios' : 'Agregar ingreso'}
          </button>
        </div>
      </div>
    </div>
  )
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function IngresosView({ fixedIncome, onAddIncome, onEditIncome, onDeleteIncome, invoices = [], clients = [] }) {
  const [modal, setModal] = useState(null)

  const now = new Date()
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1) // 1-indexed

  const monthlyTotal = fixedIncome.reduce((s, i) => s + i.amount / (FREQ_MONTHS[i.frequency] || 1), 0)
  const annualTotal  = fixedIncome.reduce((s, i) => s + annualAmount(i.amount, i.frequency), 0)

  // Invoice income this selected month (paid invoices with issuedDate)
  const invoiceThisMonth = invoices.filter(inv => {
    if (inv.status !== 'paid' || !inv.issuedDate) return false
    const d = new Date(inv.issuedDate)
    return d.getFullYear() === selYear && (d.getMonth() + 1) === selMonth
  })

  // Group by clientId first (stable), fall back to name string
  const byClient = invoiceThisMonth.reduce((acc, inv) => {
    const key = inv.clientId || inv.client || 'Sin cliente'
    if (!acc[key]) acc[key] = { client: inv.client || 'Sin cliente', color: inv.clientColor || '#a8a29e', total: 0, count: 0 }
    acc[key].total += inv.amount
    acc[key].count++
    return acc
  }, {})
  const clientIncomes = Object.values(byClient).sort((a,b) => b.total - a.total)
  const invoiceMonthTotal = clientIncomes.reduce((s,c) => s + c.total, 0)

  // All-time totals per client (keyed by clientId for stability)
  const allTimeByClient = invoices.filter(i => i.status === 'paid').reduce((acc, inv) => {
    const key = inv.clientId || inv.client || 'Sin cliente'
    if (!acc[key]) acc[key] = { client: inv.client || 'Sin cliente', color: inv.clientColor || '#a8a29e', total: 0, count: 0 }
    acc[key].total += inv.amount
    acc[key].count++
    return acc
  }, {})
  const allTimeClients = Object.values(allTimeByClient).sort((a,b) => b.total - a.total)

  // Year options: current year and one year back
  const yearOptions = [now.getFullYear(), now.getFullYear() - 1]

  function handleSave(data) {
    if (modal === 'new') onAddIncome({ ...data, id: 'fi-' + Date.now() })
    else onEditIncome({ ...modal.income, ...data })
    setModal(null)
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Ingresos recurrentes</div>
          <h1>Ingresos fijos</h1>
          <p className="lede">
            {fixedIncome.length > 0
              ? <>{fixedIncome.length} fuente{fixedIncome.length !== 1 ? 's' : ''} de ingreso fijo · {fmtPEN(monthlyTotal, { decimals: 0 })}/mes · {fmtPEN(annualTotal, { decimals: 0 })}/año</>
              : 'Registra retainers, alquileres y cualquier ingreso que recibes regularmente.'}
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14}/> Agregar ingreso
          </button>
        </div>
      </header>

      {/* ── Ingresos por facturas cobradas ──────────────────────────────────── */}
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-eyebrow">Facturas cobradas</div>
            <h3 className="card-title">Ingresos por clientes</h3>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
              style={{ fontSize: 12, padding: '4px 8px' }}>
              {MONTHS_ES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
              style={{ fontSize: 12, padding: '4px 8px' }}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {invoiceThisMonth.length === 0
          ? <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-mute)', fontSize: 13 }}>
              Sin facturas cobradas en {MONTHS_ES[selMonth-1]} {selYear}
            </div>
          : <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, padding: '8px 12px', background: 'var(--bg-sunk)', borderRadius: 8, fontSize: 13 }}>
                <span className="ink-mute">{invoiceThisMonth.length} factura{invoiceThisMonth.length !== 1 ? 's' : ''} cobrada{invoiceThisMonth.length !== 1 ? 's' : ''}</span>
                <span className="mono ink-strong" style={{ fontWeight: 700 }}>{fmtPEN(invoiceMonthTotal)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {clientIncomes.map(c => {
                  const pct = invoiceMonthTotal > 0 ? (c.total / invoiceMonthTotal) * 100 : 0
                  return (
                    <div key={c.client} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 13 }}>
                          <span className="ink-strong">{c.client}</span>
                          <span className="mono">{fmtPEN(c.total)} <span className="ink-faint" style={{fontSize:11}}>({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div style={{ background: 'var(--bg-sunk)', borderRadius: 999, height: 5, overflow: 'hidden' }}>
                          <div style={{ background: c.color, width: `${pct}%`, height: '100%', borderRadius: 999 }}/>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{c.count} factura{c.count !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
        }

        {/* All-time ranking */}
        {allTimeClients.length > 0 && (
          <details style={{ marginTop: 16 }}>
            <summary style={{ fontSize: 12, color: 'var(--ink-mute)', cursor: 'pointer', userSelect: 'none' }}>
              Ver ranking histórico por cliente
            </summary>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allTimeClients.slice(0, 5).map((c, i) => (
                <div key={c.client} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 18, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 11 }}>#{i+1}</span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }}/>
                  <span className="ink-strong" style={{ flex: 1 }}>{c.client}</span>
                  <span className="mono">{fmtPEN(c.total, { decimals: 0 })}</span>
                  <span className="ink-faint" style={{ fontSize: 11 }}>{c.count} fact.</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {fixedIncome.length === 0
        ? <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="cashflow" size={22}/></div>
              <h3>Sin ingresos fijos registrados</h3>
              <p>Agrega retainers, pagos recurrentes o cualquier ingreso periódico.</p>
              <button className="btn btn-primary btn-xs" onClick={() => setModal('new')}>+ Agregar primer ingreso</button>
            </div>
          </div>
        : <>
            {/* Summary cards */}
            <section className="grid-three">
              <div className="kpi">
                <div className="kpi-label">Total mensual</div>
                <div className="kpi-value">{fmtPEN(monthlyTotal, { decimals: 0 })}</div>
                <div className="kpi-foot">{fixedIncome.length} fuente{fixedIncome.length !== 1 ? 's' : ''} activas</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Total anual proyectado</div>
                <div className="kpi-value">{fmtPEN(annualTotal, { decimals: 0 })}</div>
                <div className="kpi-foot">Si todos siguen activos</div>
              </div>
              <div className="kpi kpi-accent">
                <div className="kpi-label">Mayor fuente</div>
                <div className="kpi-value">
                  {fixedIncome.length > 0
                    ? fixedIncome.reduce((a, b) => a.amount > b.amount ? a : b).name
                    : '—'}
                </div>
              </div>
            </section>

            {/* Bars */}
            <div className="card" style={{ gap: 12 }}>
              <div className="card-head">
                <div>
                  <div className="card-eyebrow">Distribución</div>
                  <h3 className="card-title">Fuentes de ingreso fijo</h3>
                </div>
              </div>
              {fixedIncome.map(inc => {
                const monthly = inc.amount / (FREQ_MONTHS[inc.frequency] || 1)
                const pct = monthlyTotal > 0 ? (monthly / monthlyTotal) * 100 : 0
                const freqLabel = FREQUENCIES.find(f => f.value === inc.frequency)?.label || 'Mensual'
                return (
                  <div key={inc.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: inc.color, flexShrink: 0 }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                        <span className="ink-strong">{inc.name}</span>
                        <span className="mono ink-mute">{fmtPEN(monthly, { decimals: 0 })}/mes</span>
                      </div>
                      <div style={{ background: 'var(--bg-sunk)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                        <div style={{ background: inc.color, width: `${pct}%`, height: '100%', borderRadius: 999, transition: 'width .5s ease' }}/>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>
                        {inc.client && <span>{inc.client} · </span>}{freqLabel} · {pct.toFixed(0)}% del total
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Table */}
            <div className="card card-flat">
              <table className="invoice-table invoice-table-full">
                <thead>
                  <tr>
                    <th>Nombre</th><th>Cliente / fuente</th><th>Frecuencia</th>
                    <th className="num-col">Monto</th><th className="num-col">Mensual</th><th className="num-col">Anual</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {fixedIncome.map(inc => {
                    const monthly = inc.amount / (FREQ_MONTHS[inc.frequency] || 1)
                    const freqLabel = FREQUENCIES.find(f => f.value === inc.frequency)?.label || 'Mensual'
                    return (
                      <tr key={inc.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: inc.color, flexShrink: 0 }}/>
                            <span className="ink-strong">{inc.name}</span>
                          </div>
                        </td>
                        <td className="ink-mute">{inc.client || '—'}</td>
                        <td><span className="pill pill-mute">{freqLabel}</span></td>
                        <td className="num-col mono">{fmtPEN(inc.amount)}</td>
                        <td className="num-col mono">{fmtPEN(monthly, { decimals: 0 })}</td>
                        <td className="num-col mono ink-mute">{fmtPEN(annualAmount(inc.amount, inc.frequency), { decimals: 0 })}</td>
                        <td className="row-actions" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn btn-xs btn-ghost" onClick={() => setModal({ income: inc })}>
                            <Icon name="settings" size={12}/> Editar
                          </button>
                          <button
                            className="btn btn-xs btn-quiet"
                            style={{ color: 'var(--bad)' }}
                            onClick={() => { if (window.confirm(`¿Eliminar "${inc.name}"?`)) onDeleteIncome(inc.id) }}
                          >
                            <Icon name="close" size={12}/>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
      }

      {modal && (
        <IncomeModal
          initial={modal === 'new' ? null : modal.income}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
