import { useState, useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import CashflowChart from '../components/CashflowChart.jsx'
import { fmtPEN } from '../data.js'

const MONTHS       = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']
const FREQ_DIV     = { monthly:1, bimonthly:2, quarterly:3, annual:12 }

// ── Auto-compute inc / exp from real data per month ───────────────────────────
function computeAutoData(invoices, fixedIncome, bills, variableExpenses) {
  const fixedMonthly = (fixedIncome||[]).reduce(
    (s, inc) => s + (inc.amount||0) / (FREQ_DIV[inc.frequency]||1), 0
  )
  const billsMonthly = (bills||[])
    .filter(b => b.active !== false)
    .reduce((s, b) => s + (b.amount||0), 0)

  const map = {}
  const ensure = (year, month) => {
    const key = `${year}-${month}`
    if (!map[key]) map[key] = { year, month, invInc:0, varExp:0 }
    return key
  }

  // Paid invoices → inc (per issuedDate month)
  ;(invoices||[]).forEach(inv => {
    if (inv.status !== 'paid' || !inv.issuedDate) return
    const d = new Date(inv.issuedDate)
    const k = ensure(d.getFullYear(), d.getMonth())
    map[k].invInc += inv.amount || 0
  })

  // Variable expenses → exp (per date month)
  ;(variableExpenses||[]).forEach(exp => {
    if (!exp.date) return
    const d = new Date(exp.date)
    const k = ensure(d.getFullYear(), d.getMonth())
    map[k].varExp += exp.amount || 0
  })

  // Always cover last 12 months when there is recurring data
  if (fixedMonthly > 0 || billsMonthly > 0) {
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      ensure(d.getFullYear(), d.getMonth())
    }
  }

  // Stamp total auto inc/exp per month (recurring + variable)
  Object.values(map).forEach(m => {
    m.autoInc = m.invInc + fixedMonthly
    m.autoExp = m.varExp + billsMonthly
  })

  return map
}

// ── Month edit modal ──────────────────────────────────────────────────────────
function EntryModal({ initial, autoRow, onSave, onClose }) {
  const now = new Date()
  const [form, setForm] = useState({
    month: initial?.month ?? autoRow?.month ?? now.getMonth(),
    year:  initial?.year  ?? autoRow?.year  ?? now.getFullYear(),
    inc:   initial?.inc != null ? String(initial.inc) : autoRow ? String(Math.round(autoRow.autoInc)) : '',
    exp:   initial?.exp != null ? String(initial.exp) : autoRow ? String(Math.round(autoRow.autoExp)) : '',
  })
  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = Number(form.inc) >= 0 && Number(form.exp) >= 0
  const incN  = Number(form.inc) || 0
  const expN  = Number(form.exp) || 0
  const net   = incN - expN

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar ajuste' : 'Nuevo ajuste manual'}</div>
            <h2 className="modal-title">{MONTHS[form.month]} {form.year}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>

        <div className="modal-body">
          {/* Auto reference */}
          {autoRow && (
            <div style={{ background:'var(--bg-sunk)', borderRadius:8, padding:'10px 14px', fontSize:12,
              color:'var(--ink-mute)', marginBottom:4, display:'flex', gap:20 }}>
              <span>Calculado automático:</span>
              <span className="mono">Inc {fmtPEN(autoRow.autoInc, {decimals:0})}</span>
              <span className="mono">Exp {fmtPEN(autoRow.autoExp, {decimals:0})}</span>
              <button type="button" className="btn btn-xs btn-ghost" style={{ marginLeft:'auto', fontSize:11 }}
                onClick={() => { set('inc', String(Math.round(autoRow.autoInc))); set('exp', String(Math.round(autoRow.autoExp))) }}>
                Usar calculado
              </button>
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label>Mes</label>
              <select value={form.month} onChange={e => set('month', Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Año</label>
              <input type="number" min="2020" max="2099" value={form.year}
                onChange={e => set('year', Number(e.target.value))}/>
            </div>
          </div>

          <div className="field">
            <label>Ingresos ajustados</label>
            <div className="amount-input">
              <span className="amount-prefix mono">S/</span>
              <input type="text" inputMode="decimal" className="amount-field mono"
                value={form.inc} onChange={e => set('inc', e.target.value)} placeholder="0.00"/>
            </div>
          </div>
          <div className="field">
            <label>Egresos ajustados</label>
            <div className="amount-input">
              <span className="amount-prefix mono">S/</span>
              <input type="text" inputMode="decimal" className="amount-field mono"
                value={form.exp} onChange={e => set('exp', e.target.value)} placeholder="0.00"/>
            </div>
          </div>

          {incN > 0 && expN > 0 && (
            <div style={{ background:'var(--bg-sunk)', borderRadius:8, padding:'10px 14px', fontSize:13 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span className="ink-mute">Neto</span>
                <span className={`mono ${net >= 0 ? 'ink-good' : 'ink-bad'}`}>
                  {fmtPEN(net, { sign:true })}
                </span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <span className="ink-mute">Margen</span>
                <span className="mono ink-mute">
                  {((net/incN)*100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onSave({
              ...form,
              m:   MONTHS_SHORT[form.month],
              inc: Number(form.inc) || 0,
              exp: Number(form.exp) || 0,
            })}>
            <Icon name="check" size={14}/> {initial ? 'Guardar ajuste' : 'Guardar'}
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

// ── Main view ─────────────────────────────────────────────────────────────────
export default function CashflowView({
  cashflow, onAddCashflow, onEditCashflow, onDeleteCashflow,
  invoices = [], fixedIncome = [], bills = [], variableExpenses = [],
}) {
  const [modal, setModal] = useState(null)  // null | 'new' | { entry, autoRow? }

  // ── Computed auto data ────────────────────────────────────────────────────
  const autoData = useMemo(
    () => computeAutoData(invoices, fixedIncome, bills, variableExpenses),
    [invoices, fixedIncome, bills, variableExpenses]
  )

  // ── Merge: all months from auto OR stored cashflow ────────────────────────
  const mergedRows = useMemo(() => {
    const keys = new Set()

    // From stored cashflow
    ;(cashflow||[]).forEach(r => { if (r.year != null && r.month != null) keys.add(`${r.year}-${r.month}`) })

    // From auto data
    Object.keys(autoData).forEach(k => keys.add(k))

    return [...keys]
      .map(key => {
        const [year, month] = key.split('-').map(Number)
        const auto    = autoData[key]
        const manual  = (cashflow||[]).find(r => r.year === year && r.month === month)
        const effInc  = manual != null ? manual.inc  : (auto?.autoInc ?? 0)
        const effExp  = manual != null ? manual.exp  : (auto?.autoExp ?? 0)
        const source  = manual && auto ? 'adjusted'
                      : manual         ? 'manual'
                      :                  'auto'
        return { key, year, month, auto, manual, effInc, effExp, source }
      })
      .filter(r => r.effInc > 0 || r.effExp > 0 || r.manual)
      .sort((a, b) => (b.year - a.year) || (b.month - a.month))
  }, [cashflow, autoData])

  // ── Chart data (last 6 effective months, asc) ─────────────────────────────
  const chartData = useMemo(() => [...mergedRows]
    .sort((a, b) => (a.year - b.year) || (a.month - b.month))
    .slice(-6)
    .map(r => ({ month: MONTHS_SHORT[r.month], inc: r.effInc, exp: r.effExp })),
    [mergedRows]
  )

  // ── KPI totals (effective) ────────────────────────────────────────────────
  const totalIn  = mergedRows.reduce((s, r) => s + r.effInc, 0)
  const totalOut = mergedRows.reduce((s, r) => s + r.effExp, 0)
  const margin   = totalIn > 0 ? ((totalIn - totalOut) / totalIn) * 100 : 0

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleSave(data) {
    if (modal === 'new') {
      onAddCashflow({ ...data, id: 'cf-' + Date.now() })
    } else if (modal?.entry) {
      onEditCashflow({ ...modal.entry, ...data })
    } else {
      // Creating from auto (sync)
      onAddCashflow({ ...data, id: 'cf-' + Date.now() })
    }
    setModal(null)
  }

  function syncRow(row) {
    if (!row.auto) return
    const data = {
      month: row.month, year: row.year,
      m: MONTHS_SHORT[row.month],
      inc: Math.round(row.auto.autoInc * 100) / 100,
      exp: Math.round(row.auto.autoExp * 100) / 100,
    }
    if (row.manual) {
      onEditCashflow({ ...row.manual, ...data })
    } else {
      onAddCashflow({ ...data, id: 'cf-' + Date.now() })
    }
  }

  function syncAll() {
    const toSync = mergedRows.filter(r => r.auto && !r.manual)
    if (toSync.length === 0) {
      alert('Todos los meses con datos calculados ya tienen ajuste manual.')
      return
    }
    if (!window.confirm(`¿Guardar ${toSync.length} mes(es) con valores calculados automáticamente?`)) return
    toSync.forEach(row => syncRow(row))
  }

  function removeOverride(row) {
    if (!row.manual) return
    if (!window.confirm(`¿Eliminar el ajuste manual de ${MONTHS[row.month]} ${row.year}? Se usarán los valores calculados.`)) return
    onDeleteCashflow(row.manual.id)
  }

  const autoCount    = mergedRows.filter(r => r.source === 'auto').length
  const adjustedCount = mergedRows.filter(r => r.source === 'adjusted').length
  const manualCount  = mergedRows.filter(r => r.source === 'manual').length

  // Source badge helper
  const sourcePill = (source) => ({
    auto:     <span className="pill pill-mute" style={{fontSize:10}}>Auto</span>,
    adjusted: <span className="pill pill-warn" style={{fontSize:10}}>Ajustado</span>,
    manual:   <span className="pill" style={{fontSize:10, background:'var(--bg-sunk)', color:'var(--ink-mute)'}}>Manual</span>,
  })[source]

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Historial de flujo</div>
          <h1>Flujo de caja</h1>
          <p className="lede">
            {mergedRows.length > 0
              ? <>
                  Ingresos {fmtPEN(totalIn, {decimals:0})} ·
                  Egresos {fmtPEN(totalOut, {decimals:0})} ·
                  Margen {margin.toFixed(0)}%
                  {autoCount > 0 && <> · <span className="ink-mute">{autoCount} auto, {adjustedCount} ajustados{manualCount > 0 ? `, ${manualCount} manuales` : ''}</span></>}
                </>
              : 'Los datos se calculan automáticamente desde tus facturas y gastos.'}
          </p>
        </div>
        <div className="view-header-actions">
          {autoCount > 0 && (
            <button className="btn btn-ghost" onClick={syncAll} title="Guardar valores calculados como entradas manuales">
              <Icon name="check" size={13}/> Sincronizar auto
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14}/> Ajuste manual
          </button>
        </div>
      </header>

      {/* Legend */}
      {mergedRows.length > 0 && (
        <div style={{ display:'flex', gap:12, marginBottom:16, fontSize:12, color:'var(--ink-mute)', alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span className="pill pill-mute" style={{fontSize:10}}>Auto</span>
            Calculado desde facturas + ingresos fijos − gastos
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span className="pill pill-warn" style={{fontSize:10}}>Ajustado</span>
            Valor calculado con corrección manual
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span className="pill" style={{fontSize:10, background:'var(--bg-sunk)', color:'var(--ink-mute)'}}>Manual</span>
            Entrada sin datos automáticos
          </span>
        </div>
      )}

      {/* KPIs */}
      {mergedRows.length > 0 && (
        <section className="kpi-row">
          <KpiCard label="Ingreso promedio"
            value={fmtPEN(totalIn / mergedRows.length)}
            foot={`${mergedRows.length} meses`}/>
          <KpiCard label="Egreso promedio"
            value={fmtPEN(totalOut / mergedRows.length)}
            foot="Burn rate mensual"/>
          <KpiCard label="Mejor mes"
            value={mergedRows.reduce((a, b) => a.effInc > b.effInc ? a : b, mergedRows[0] ?? {effInc:0,month:0}).month != null
              ? MONTHS_SHORT[mergedRows.reduce((a,b) => a.effInc > b.effInc ? a : b).month]
              : '—'}
            foot={mergedRows.length > 0 ? fmtPEN(Math.max(...mergedRows.map(r => r.effInc))) : '—'}
            accent/>
          <KpiCard label="Margen promedio"
            value={`${margin.toFixed(0)}%`}
            foot={totalIn - totalOut > 0
              ? fmtPEN(totalIn - totalOut, {decimals:0}) + ' acumulado'
              : 'Período en negativo'}/>
        </section>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card card-chart">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Últimos {chartData.length} meses (valores efectivos)</div>
              <h3 className="card-title">Ingresos vs egresos</h3>
            </div>
            <div className="legend">
              <span className="legend-item"><i className="dot dot-ink"/> Ingresos</span>
              <span className="legend-item"><i className="dot dot-accent"/> Egresos</span>
            </div>
          </div>
          <CashflowChart data={chartData} height={240}/>
        </div>
      )}

      {/* Table */}
      <div className="card card-flat">
        {mergedRows.length === 0
          ? <div className="empty-state">
              <div className="empty-state-icon"><Icon name="cashflow" size={22}/></div>
              <h3>Sin datos de flujo de caja</h3>
              <p>Los datos se calculan solos cuando registres facturas cobradas, gastos fijos o variables. También puedes ingresar ajustes manuales.</p>
              <button className="btn btn-primary btn-xs" onClick={() => setModal('new')}>
                + Agregar ajuste manual
              </button>
            </div>
          : <table className="invoice-table invoice-table-full">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th className="num-col">Inc. calculado</th>
                  <th className="num-col">Inc. ajustado</th>
                  <th className="num-col">Exp. calculado</th>
                  <th className="num-col">Exp. ajustado</th>
                  <th className="num-col">Neto efectivo</th>
                  <th>Fuente</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mergedRows.map(row => {
                  const net = row.effInc - row.effExp
                  const m   = row.effInc > 0 ? (net / row.effInc) * 100 : 0
                  return (
                    <tr key={row.key}>
                      <td className="ink-strong">
                        {MONTHS_SHORT[row.month]} {row.year}
                      </td>
                      {/* Calculated inc */}
                      <td className="num-col mono ink-mute">
                        {row.auto ? fmtPEN(row.auto.autoInc, {decimals:0}) : '—'}
                      </td>
                      {/* Adjusted inc */}
                      <td className="num-col mono" style={{fontWeight: row.manual ? 700 : 400}}>
                        {row.manual != null ? fmtPEN(row.manual.inc, {decimals:0}) : '—'}
                      </td>
                      {/* Calculated exp */}
                      <td className="num-col mono ink-mute">
                        {row.auto ? fmtPEN(row.auto.autoExp, {decimals:0}) : '—'}
                      </td>
                      {/* Adjusted exp */}
                      <td className="num-col mono" style={{fontWeight: row.manual ? 700 : 400}}>
                        {row.manual != null ? fmtPEN(row.manual.exp, {decimals:0}) : '—'}
                      </td>
                      {/* Net */}
                      <td className={`num-col mono ${net >= 0 ? 'ink-good' : 'ink-bad'}`} style={{fontWeight:600}}>
                        {fmtPEN(net, {sign:true, decimals:0})}
                        <div style={{ fontSize:10, fontWeight:400, color:'var(--ink-faint)' }}>
                          {m.toFixed(0)}% margen
                        </div>
                      </td>
                      {/* Source */}
                      <td>{sourcePill(row.source)}</td>
                      {/* Actions */}
                      <td className="row-actions" style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                        <button className="btn btn-xs btn-ghost"
                          title="Editar ajuste manual"
                          onClick={() => setModal({ entry: row.manual, autoRow: row.auto ? { ...row.auto, month: row.month, year: row.year } : null })}>
                          <Icon name="settings" size={12}/>
                        </button>
                        {row.auto && (
                          <button className="btn btn-xs btn-ghost"
                            title={row.manual ? 'Resetear a valor calculado' : 'Guardar valor calculado'}
                            onClick={() => row.manual ? removeOverride(row) : syncRow(row)}>
                            {row.manual ? '↺' : '⟳'}
                          </button>
                        )}
                        {row.manual && (
                          <button className="btn btn-xs btn-quiet" style={{ color:'var(--bad)' }}
                            onClick={() => { if (window.confirm(`¿Eliminar entrada de ${MONTHS[row.month]} ${row.year}?`)) onDeleteCashflow(row.manual.id) }}>
                            <Icon name="close" size={12}/>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        }
      </div>

      {/* Modal */}
      {modal && (
        <EntryModal
          initial={modal === 'new' ? null : (modal.entry ?? null)}
          autoRow={modal === 'new' ? null : (modal.autoRow ?? null)}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
