import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'

const CATEGORIES = ['Software','Espacio','Servicios','Salud','Transporte','Marketing','Educación','Otro']

// ── Modal ──────────────────────────────────────────────────────────────────────
function BillModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial ?? { name: '', amount: '', day: '1', category: 'Software', active: true, hasIGV: false }
  )
  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.name.trim() && Number(form.amount) > 0
  const amt   = Number(form.amount) || 0
  const igvAmt = form.hasIGV ? amt - amt / 1.18 : 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Nuevo'} gasto fijo</div>
            <h2 className="modal-title">{initial ? form.name : 'Agregar gasto'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>Nombre del servicio</label>
            <input type="text" value={form.name} autoFocus
              onChange={e => set('name', e.target.value)}
              placeholder="Ej. Spotify, Internet, Coworking…"/>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Monto mensual</label>
              <div className="amount-input">
                <span className="amount-prefix mono">S/</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00"/>
              </div>
            </div>
            <div className="field" style={{ maxWidth: 110 }}>
              <label>Día del mes</label>
              <input type="number" min="1" max="31"
                value={form.day} onChange={e => set('day', e.target.value)}/>
            </div>
          </div>

          <div className="field">
            <label>Categoría</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* IGV toggle */}
          <div style={{ background:'var(--bg-sunk)', borderRadius:10, padding:'12px 14px', display:'flex', gap:14, alignItems:'center' }}>
            <label style={{ display:'flex', alignItems:'flex-start', gap:8, cursor:'pointer', flex:1 }}>
              <input type="checkbox" checked={form.hasIGV}
                onChange={e => set('hasIGV', e.target.checked)}
                style={{ width:15, height:15, accentColor:'var(--accent)', marginTop:2 }}/>
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>Incluye IGV</div>
                <div style={{ fontSize:11, color:'var(--ink-mute)' }}>
                  El monto ya contiene 18% de IGV (crédito fiscal deducible)
                </div>
              </div>
            </label>
            {form.hasIGV && amt > 0 && (
              <div style={{ fontSize:12, textAlign:'right', color:'var(--ink-mute)', flexShrink:0 }}>
                <div>IGV <span className="mono ink-good">S/ {igvAmt.toFixed(2)}</span></div>
                <div>Base <span className="mono">S/ {(amt - igvAmt).toFixed(2)}</span></div>
              </div>
            )}
          </div>

          {/* Active toggle */}
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, marginTop:4 }}>
            <input type="checkbox" checked={form.active !== false}
              onChange={e => set('active', e.target.checked)}
              style={{ width:15, height:15, accentColor:'var(--accent)' }}/>
            <span style={{ color: form.active !== false ? 'var(--ink)' : 'var(--ink-mute)' }}>
              {form.active !== false ? 'Activo — se suma al total mensual' : 'Pausado — excluido del total'}
            </span>
          </label>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onSave({ ...form, amount: Number(form.amount), day: Number(form.day) })}>
            <Icon name="check" size={14}/> {initial ? 'Guardar cambios' : 'Agregar gasto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Panel (usado dentro de GastosView) ────────────────────────────────────────
export default function BillsView({ bills, onAddBill, onEditBill, onDeleteBill }) {
  const [modal, setModal] = useState(null)

  const activeBills = (bills || []).filter(b => b.active !== false)
  const pausedBills = (bills || []).filter(b => b.active === false)
  const total    = activeBills.reduce((s, b) => s + b.amount, 0)
  const igvTotal = activeBills
    .filter(b => b.hasIGV)
    .reduce((s, b) => s + (b.amount - b.amount / 1.18), 0)

  function handleSave(data) {
    if (modal === 'new') onAddBill({ ...data, id: 'b-' + Date.now() })
    else                 onEditBill({ ...modal.bill, ...data })
    setModal(null)
  }

  function toggleActive(bill) {
    onEditBill({ ...bill, active: bill.active === false })
  }

  const renderRow = (b) => (
    <tr key={b.id} style={{ opacity: b.active === false ? 0.5 : 1 }}>
      <td>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <span className="ink-strong">{b.name}</span>
          {b.active === false && (
            <span className="pill pill-mute" style={{ fontSize:10 }}>Pausado</span>
          )}
          {b.hasIGV && (
            <span className="pill pill-good" style={{ fontSize:10 }}>IGV</span>
          )}
        </div>
      </td>
      <td><span className="pill pill-mute">{b.category}</span></td>
      <td className="ink-mute mono">Día {b.day}</td>
      <td className="num-col mono">{fmtPEN(b.amount)}</td>
      <td className="num-col mono ink-mute">{fmtPEN(b.amount * 12, { decimals:0 })}</td>
      <td className="row-actions" style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
        <button className="btn btn-xs btn-ghost" title={b.active === false ? 'Reactivar' : 'Pausar'}
          onClick={() => toggleActive(b)} style={{ fontSize:12 }}>
          {b.active === false ? '▶' : '⏸'}
        </button>
        <button className="btn btn-xs btn-ghost" onClick={() => setModal({ bill: b })}>
          <Icon name="settings" size={12}/>
        </button>
        <button className="btn btn-xs btn-quiet" style={{ color:'var(--bad)' }}
          onClick={() => { if (window.confirm(`¿Eliminar "${b.name}"?`)) onDeleteBill(b.id) }}>
          <Icon name="close" size={12}/>
        </button>
      </td>
    </tr>
  )

  return (
    <div>
      {/* KPIs */}
      <section className="grid-three" style={{ marginBottom:20 }}>
        <div className="kpi">
          <div className="kpi-label">Total activo / mes</div>
          <div className="kpi-value">{fmtPEN(total, { decimals:0 })}</div>
          <div className="kpi-foot">
            {activeBills.length} activo{activeBills.length !== 1 ? 's' : ''}
            {pausedBills.length > 0 && ` · ${pausedBills.length} pausado${pausedBills.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Total activo / año</div>
          <div className="kpi-value">{fmtPEN(total * 12, { decimals:0 })}</div>
          <div className="kpi-foot">{(bills || []).length} gasto{(bills || []).length !== 1 ? 's' : ''} registrados</div>
        </div>
        {igvTotal > 0
          ? <div className="kpi kpi-accent">
              <div className="kpi-label">Crédito fiscal IGV / mes</div>
              <div className="kpi-value">{fmtPEN(igvTotal, { decimals:2 })}</div>
              <div className="kpi-foot">Deducible en impuestos</div>
            </div>
          : <div className="kpi">
              <div className="kpi-label">Crédito fiscal IGV</div>
              <div className="kpi-value ink-mute">—</div>
              <div className="kpi-foot">Marca gastos que incluyen IGV</div>
            </div>
        }
      </section>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <Icon name="plus" size={14}/> Agregar gasto fijo
        </button>
      </div>

      {(bills || []).length === 0
        ? <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="bills" size={22}/></div>
              <h3>Sin gastos fijos registrados</h3>
              <p>Agrega suscripciones y pagos mensuales recurrentes.</p>
              <button className="btn btn-primary btn-xs" onClick={() => setModal('new')}>
                + Agregar primer gasto
              </button>
            </div>
          </div>
        : <div className="card card-flat">
            <table className="invoice-table invoice-table-full">
              <thead>
                <tr>
                  <th>Servicio</th><th>Categoría</th><th>Día</th>
                  <th className="num-col">Mensual</th><th className="num-col">Anual</th><th></th>
                </tr>
              </thead>
              <tbody>
                {activeBills.map(renderRow)}
                {pausedBills.length > 0 && <>
                  <tr>
                    <td colSpan={6} style={{ padding:'6px 12px', fontSize:11,
                      color:'var(--ink-faint)', background:'var(--bg-sunk)' }}>
                      Pausados
                    </td>
                  </tr>
                  {pausedBills.map(renderRow)}
                </>}
                <tr className="row-total">
                  <td colSpan={3} className="ink-strong">Total mensual activo</td>
                  <td className="num-col mono ink-strong">{fmtPEN(total)}</td>
                  <td className="num-col mono ink-strong">{fmtPEN(total * 12, { decimals:0 })}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
      }

      {modal && (
        <BillModal
          initial={modal === 'new' ? null : modal.bill}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
