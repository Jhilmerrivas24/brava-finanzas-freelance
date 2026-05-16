import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'

const CATEGORIES = [
  'Software','Servicios','Transporte','Alimentación',
  'Marketing','Educación','Material','Equipamiento','Salud','Otro',
]

const MONTHS_ES    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']

// ── Modal ──────────────────────────────────────────────────────────────────────
function ExpenseModal({ initial, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState(initial ?? {
    description: '', amount: '', date: today,
    category: 'Software', hasIGV: false, deductible: true, notes: '',
  })
  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid  = form.description.trim() && Number(form.amount) > 0 && form.date
  const amt    = Number(form.amount) || 0
  const igvAmt = form.hasIGV ? amt - amt / 1.18 : 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Nuevo'} gasto variable</div>
            <h2 className="modal-title">{initial ? form.description : 'Registrar gasto'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>Descripción</label>
            <input type="text" value={form.description} autoFocus
              onChange={e => set('description', e.target.value)}
              placeholder="Ej. Dominio anual, cámara, plugin…"/>
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
              <label>Fecha</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}/>
            </div>
          </div>

          <div className="field">
            <label>Categoría</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* IGV + Deductible toggles */}
          <div style={{ display:'flex', gap:10, background:'var(--bg-sunk)', borderRadius:10, padding:'12px 14px' }}>
            <label style={{ display:'flex', alignItems:'flex-start', gap:8, cursor:'pointer', flex:1, fontSize:13 }}>
              <input type="checkbox" checked={form.hasIGV}
                onChange={e => set('hasIGV', e.target.checked)}
                style={{ width:15, height:15, accentColor:'var(--accent)', marginTop:2 }}/>
              <div>
                <div style={{ fontWeight:600 }}>Incluye IGV</div>
                {form.hasIGV && amt > 0
                  ? <div style={{ fontSize:11, color:'var(--ink-mute)' }}>
                      Crédito: <span className="mono ink-good">S/ {igvAmt.toFixed(2)}</span>
                    </div>
                  : <div style={{ fontSize:11, color:'var(--ink-mute)' }}>18% crédito fiscal</div>
                }
              </div>
            </label>
            <label style={{ display:'flex', alignItems:'flex-start', gap:8, cursor:'pointer', flex:1, fontSize:13 }}>
              <input type="checkbox" checked={form.deductible}
                onChange={e => set('deductible', e.target.checked)}
                style={{ width:15, height:15, accentColor:'var(--accent)', marginTop:2 }}/>
              <div>
                <div style={{ fontWeight:600 }}>Deducible</div>
                <div style={{ fontSize:11, color:'var(--ink-mute)' }}>Gasto de negocio</div>
              </div>
            </label>
          </div>

          <div className="field">
            <label>Notas (opcional)</label>
            <input type="text" value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Número de factura, proveedor, referencia…"/>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onSave({ ...form, amount: Number(form.amount) })}>
            <Icon name="check" size={14}/> {initial ? 'Guardar cambios' : 'Registrar gasto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Panel ──────────────────────────────────────────────────────────────────────
export default function VariableExpensesView({ expenses = [], onAdd, onEdit, onDelete }) {
  const [modal, setModal] = useState(null)
  const now = new Date()
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)

  const yearOptions = [now.getFullYear(), now.getFullYear() - 1]

  const filtered = [...(expenses || [])]
    .filter(e => {
      if (!e.date) return true
      const d = new Date(e.date)
      return d.getFullYear() === selYear && (d.getMonth() + 1) === selMonth
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const totalMonth = filtered.reduce((s, e) => s + e.amount, 0)
  const igvMonth   = filtered.filter(e => e.hasIGV)
    .reduce((s, e) => s + (e.amount - e.amount / 1.18), 0)
  const dedMonth   = filtered.filter(e => e.deductible).reduce((s, e) => s + e.amount, 0)
  const totalAll   = (expenses || []).reduce((s, e) => s + e.amount, 0)

  function handleSave(data) {
    if (modal === 'new') onAdd({ ...data, id: 've-' + Date.now() })
    else                 onEdit({ ...modal.expense, ...data })
    setModal(null)
  }

  return (
    <div>
      {/* Month picker + add button */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ display:'flex', gap:6 }}>
          <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
            style={{ fontSize:12, padding:'4px 8px' }}>
            {MONTHS_ES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
            style={{ fontSize:12, padding:'4px 8px' }}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <Icon name="plus" size={14}/> Registrar gasto
        </button>
      </div>

      {/* KPIs */}
      <section className="grid-three" style={{ marginBottom:20 }}>
        <div className="kpi">
          <div className="kpi-label">{MONTHS_SHORT[selMonth-1]} {selYear}</div>
          <div className="kpi-value">{fmtPEN(totalMonth, { decimals:0 })}</div>
          <div className="kpi-foot">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className={`kpi ${igvMonth > 0 ? 'kpi-accent' : ''}`}>
          <div className="kpi-label">Crédito fiscal IGV</div>
          <div className="kpi-value">{igvMonth > 0 ? fmtPEN(igvMonth, { decimals:2 }) : '—'}</div>
          <div className="kpi-foot">
            {igvMonth > 0 ? 'Deducible de impuestos' : 'Sin gastos con IGV este mes'}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Deducibles del mes</div>
          <div className="kpi-value">{dedMonth > 0 ? fmtPEN(dedMonth, { decimals:0 }) : '—'}</div>
          <div className="kpi-foot">Acumulado total: {fmtPEN(totalAll, { decimals:0 })}</div>
        </div>
      </section>

      {(expenses || []).length === 0
        ? <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="bills" size={22}/></div>
              <h3>Sin gastos variables registrados</h3>
              <p>Registra gastos puntuales: dominios, herramientas anuales, materiales, equipamiento.</p>
              <button className="btn btn-primary btn-xs" onClick={() => setModal('new')}>
                + Registrar primer gasto
              </button>
            </div>
          </div>
        : filtered.length === 0
        ? <div className="card">
            <div style={{ textAlign:'center', padding:'24px 0', color:'var(--ink-mute)', fontSize:13 }}>
              Sin gastos registrados en {MONTHS_ES[selMonth-1]} {selYear}
            </div>
          </div>
        : <div className="card card-flat">
            <table className="invoice-table invoice-table-full">
              <thead>
                <tr>
                  <th>Descripción</th><th>Categoría</th><th>Fecha</th>
                  <th className="num-col">Monto</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span className="ink-strong">{e.description}</span>
                        {e.hasIGV && (
                          <span className="pill pill-good" style={{ fontSize:10 }}>IGV</span>
                        )}
                        {e.deductible && (
                          <span className="pill pill-mute" style={{ fontSize:10 }}>Deducible</span>
                        )}
                      </div>
                      {e.notes && (
                        <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>{e.notes}</div>
                      )}
                    </td>
                    <td><span className="pill pill-mute">{e.category}</span></td>
                    <td className="ink-mute mono">{e.date || '—'}</td>
                    <td className="num-col mono">{fmtPEN(e.amount)}</td>
                    <td className="row-actions" style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                      <button className="btn btn-xs btn-ghost" onClick={() => setModal({ expense: e })}>
                        <Icon name="settings" size={12}/>
                      </button>
                      <button className="btn btn-xs btn-quiet" style={{ color:'var(--bad)' }}
                        onClick={() => { if (window.confirm(`¿Eliminar "${e.description}"?`)) onDelete(e.id) }}>
                        <Icon name="close" size={12}/>
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="row-total">
                  <td colSpan={3} className="ink-strong">Total del mes</td>
                  <td className="num-col mono ink-strong">{fmtPEN(totalMonth)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
      }

      {modal && (
        <ExpenseModal
          initial={modal === 'new' ? null : modal.expense}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
