import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import CashflowChart from '../components/CashflowChart.jsx'
import { fmtPEN } from '../data.js'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']

function EntryModal({ initial, onSave, onClose }) {
  const now = new Date()
  const [form, setForm] = useState(initial ?? {
    month: now.getMonth(),
    year: now.getFullYear(),
    inc: '',
    exp: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = Number(form.inc) >= 0 && Number(form.exp) >= 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Nuevo'} mes</div>
            <h2 className="modal-title">Flujo de {MONTHS[form.month]} {form.year}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <div className="field">
              <label>Mes</label>
              <select value={form.month} onChange={e => set('month', Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Año</label>
              <input type="number" min="2020" max="2099" value={form.year} onChange={e => set('year', Number(e.target.value))}/>
            </div>
          </div>
          <div className="field">
            <label>Ingresos del mes</label>
            <div className="amount-input">
              <span className="amount-prefix mono">S/</span>
              <input type="text" inputMode="decimal" className="amount-field mono" value={form.inc}
                onChange={e => set('inc', e.target.value)} placeholder="0.00"/>
            </div>
          </div>
          <div className="field">
            <label>Egresos del mes</label>
            <div className="amount-input">
              <span className="amount-prefix mono">S/</span>
              <input type="text" inputMode="decimal" className="amount-field mono" value={form.exp}
                onChange={e => set('exp', e.target.value)} placeholder="0.00"/>
            </div>
          </div>
          {Number(form.inc) > 0 && Number(form.exp) > 0 && (
            <div style={{ background: 'var(--bg-sunk)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="ink-mute">Neto</span>
                <span className={`mono ${Number(form.inc)-Number(form.exp) >= 0 ? 'ink-good' : 'ink-bad'}`}>
                  {fmtPEN(Number(form.inc) - Number(form.exp), { sign: true })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span className="ink-mute">Margen</span>
                <span className="mono ink-mute">
                  {(((Number(form.inc) - Number(form.exp)) / Number(form.inc)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave({
            ...form,
            m: MONTHS_SHORT[form.month],
            inc: Number(form.inc) || 0,
            exp: Number(form.exp) || 0,
          })}>
            <Icon name="check" size={14}/> {initial ? 'Guardar' : 'Agregar mes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, foot, accent }) {
  return (
    <div className={`kpi ${accent ? 'kpi-accent' : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  )
}

export default function CashflowView({ cashflow, onAddCashflow, onEditCashflow, onDeleteCashflow }) {
  const [modal, setModal] = useState(null)

  const totalIn  = cashflow.reduce((s, r) => s + r.inc, 0)
  const totalOut = cashflow.reduce((s, r) => s + r.exp, 0)
  const margin   = totalIn > 0 ? ((totalIn - totalOut) / totalIn) * 100 : 0

  function handleSave(data) {
    if (modal === 'new') onAddCashflow({ ...data, id: 'cf-' + Date.now() })
    else onEditCashflow({ ...modal.entry, ...data })
    setModal(null)
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Historial de flujo</div>
          <h1>Flujo de caja</h1>
          <p className="lede">
            {cashflow.length > 0
              ? <>Ingresos {fmtPEN(totalIn)} · Egresos {fmtPEN(totalOut)} · Margen {margin.toFixed(0)}%</>
              : 'Registra tus ingresos y egresos por mes para visualizar tu tendencia.'}
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14}/> Agregar mes
          </button>
        </div>
      </header>

      {cashflow.length > 0 && (
        <section className="kpi-row">
          <KpiCard label="Ingreso promedio" value={fmtPEN(totalIn / cashflow.length)} foot={`${cashflow.length} meses registrados`}/>
          <KpiCard label="Egreso promedio"  value={fmtPEN(totalOut / cashflow.length)} foot="Burn rate mensual"/>
          <KpiCard label="Mejor mes" value={cashflow.reduce((a,b)=>a.inc>b.inc?a:b).m} foot={fmtPEN(Math.max(...cashflow.map(r=>r.inc)))} accent/>
          <KpiCard label="Margen promedio" value={`${margin.toFixed(0)}%`} foot={totalIn - totalOut > 0 ? fmtPEN(totalIn - totalOut) + ' acumulado' : 'Período en negativo'}/>
        </section>
      )}

      {cashflow.length > 0 && (
        <div className="card card-chart">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Evolución mensual</div>
              <h3 className="card-title">Ingresos vs egresos</h3>
            </div>
            <div className="legend">
              <span className="legend-item"><i className="dot dot-ink"/> Ingresos</span>
              <span className="legend-item"><i className="dot dot-accent"/> Egresos</span>
            </div>
          </div>
          <CashflowChart data={cashflow} height={240}/>
        </div>
      )}

      <div className="card card-flat">
        {cashflow.length === 0
          ? <div className="empty-state">
              <div className="empty-state-icon"><Icon name="cashflow" size={22}/></div>
              <h3>Sin datos de flujo de caja</h3>
              <p>Agrega los ingresos y egresos de cada mes para ver tu historial.</p>
              <button className="btn btn-primary btn-xs" onClick={() => setModal('new')}>+ Agregar primer mes</button>
            </div>
          : <table className="invoice-table invoice-table-full">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th className="num-col">Ingresos</th>
                  <th className="num-col">Egresos</th>
                  <th className="num-col">Neto</th>
                  <th>Margen</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cashflow.map(r => {
                  const net = r.inc - r.exp
                  const m   = r.inc > 0 ? (net / r.inc) * 100 : 0
                  return (
                    <tr key={r.id}>
                      <td className="ink-strong">{r.m} {r.year}</td>
                      <td className="num-col mono">{fmtPEN(r.inc)}</td>
                      <td className="num-col mono">{fmtPEN(r.exp)}</td>
                      <td className={`num-col mono ${net >= 0 ? 'ink-good' : 'ink-bad'}`}>{fmtPEN(net, { sign: true })}</td>
                      <td><span className={`pill ${m >= 0 ? 'pill-good' : 'pill-bad'}`}>{m.toFixed(0)}%</span></td>
                      <td className="row-actions" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-xs btn-ghost" onClick={() => setModal({ entry: r })}>
                          <Icon name="settings" size={12}/> Editar
                        </button>
                        <button
                          className="btn btn-xs btn-quiet"
                          style={{ color: 'var(--bad)' }}
                          onClick={() => { if (window.confirm(`¿Eliminar ${r.m} ${r.year}?`)) onDeleteCashflow(r.id) }}
                        >
                          <Icon name="close" size={12}/>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        }
      </div>

      {modal && (
        <EntryModal
          initial={modal === 'new' ? null : modal.entry}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
