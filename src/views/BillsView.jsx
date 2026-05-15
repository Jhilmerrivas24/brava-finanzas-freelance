import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'

const CATEGORIES = ['Software','Espacio','Servicios','Salud','Transporte','Marketing','Educación','Otro']

function BillModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial ?? { name: '', amount: '', day: '1', category: 'Software' }
  )
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.name.trim() && Number(form.amount) > 0

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
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej. Spotify, Internet, Coworking…"/>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Monto mensual</label>
              <input type="number" min="0" step="1" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0"/>
            </div>
            <div className="field">
              <label>Día del mes</label>
              <input type="number" min="1" max="31" value={form.day} onChange={e => set('day', e.target.value)} placeholder="1"/>
            </div>
          </div>
          <div className="field">
            <label>Categoría</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave({ ...form, amount: Number(form.amount), day: Number(form.day) })}>
            <Icon name="check" size={14}/> {initial ? 'Guardar cambios' : 'Agregar gasto'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BillsView({ bills, onAddBill, onEditBill, onDeleteBill }) {
  const [modal, setModal] = useState(null) // null | 'new' | { bill }

  const total = bills.reduce((s, b) => s + b.amount, 0)

  function handleSave(data) {
    if (modal === 'new') {
      onAddBill({ ...data, id: 'b-' + Date.now() })
    } else {
      onEditBill({ ...modal.bill, ...data })
    }
    setModal(null)
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Gastos recurrentes</div>
          <h1>Suscripciones y gastos fijos</h1>
          <p className="lede">
            {bills.length} cargo{bills.length !== 1 ? 's' : ''} automático{bills.length !== 1 ? 's' : ''}
            {bills.length > 0 && <> · {fmtPEN(total)} mensual · {fmtPEN(total * 12, { decimals: 0 })} al año</>}
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14}/> Agregar gasto
          </button>
        </div>
      </header>

      {bills.length === 0
        ? <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="bills" size={22}/></div>
              <h3>Sin gastos fijos registrados</h3>
              <p>Agrega tus suscripciones y gastos mensuales para llevar el control.</p>
              <button className="btn btn-primary btn-xs" onClick={() => setModal('new')}>+ Agregar primer gasto</button>
            </div>
          </div>
        : <div className="card card-flat">
            <table className="invoice-table invoice-table-full">
              <thead>
                <tr>
                  <th>Servicio</th><th>Categoría</th><th>Día del mes</th>
                  <th className="num-col">Monto</th><th className="num-col">Anual</th><th></th>
                </tr>
              </thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b.id}>
                    <td className="ink-strong">{b.name}</td>
                    <td><span className="pill pill-mute">{b.category}</span></td>
                    <td className="ink-mute mono">Día {b.day}</td>
                    <td className="num-col mono">{fmtPEN(b.amount)}</td>
                    <td className="num-col mono ink-mute">{fmtPEN(b.amount * 12, { decimals: 0 })}</td>
                    <td className="row-actions" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-xs btn-ghost" onClick={() => setModal({ bill: b })}>
                        <Icon name="settings" size={12}/> Editar
                      </button>
                      <button
                        className="btn btn-xs btn-quiet"
                        style={{ color: 'var(--bad)' }}
                        onClick={() => { if (window.confirm(`¿Eliminar "${b.name}"?`)) onDeleteBill(b.id) }}
                      >
                        <Icon name="close" size={12}/>
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="row-total">
                  <td colSpan={3} className="ink-strong">Total mensual</td>
                  <td className="num-col mono ink-strong">{fmtPEN(total)}</td>
                  <td className="num-col mono ink-strong">{fmtPEN(total * 12, { decimals: 0 })}</td>
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
