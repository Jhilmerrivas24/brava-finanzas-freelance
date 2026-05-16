import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Avatar from '../components/Avatar.jsx'
import Bar from '../components/Bar.jsx'
import { fmtPEN } from '../data.js'

const CLIENT_TYPES = [
  'Retainer mensual',
  'Retainer + proyectos',
  'Por proyecto',
  'Contrato fijo',
  'Ocasional',
  'Otro',
]

const COLORS = ['#c2410c','#15803d','#1d4ed8','#7c3aed','#0f766e','#a16207','#be185d','#0e7490']

function ClientModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ?? {
    name: '', type: 'Por proyecto', color: COLORS[0], notes: '', active: true,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.name.trim()

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Nuevo'} cliente</div>
            <h2 className="modal-title">{form.name || 'Nuevo cliente'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Nombre del cliente o empresa</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ej. Agencia Creativa XYZ" autoFocus/>
          </div>
          <div className="field">
            <label>Tipo de relación</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}>
              {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Color identificador</label>
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
          <div className="field">
            <label>Notas (opcional)</label>
            <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Industria, contacto, condiciones especiales…"/>
          </div>
          <div className="field">
            <label>Estado</label>
            <select value={form.active ? 'active' : 'inactive'} onChange={e => set('active', e.target.value === 'active')}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo / archivado</option>
            </select>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(form)}>
            <Icon name="check" size={14}/> {initial ? 'Guardar cambios' : 'Agregar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryModal({ client, invoices, onClose, onMarkPaid }) {
  const clientInvoices = invoices.filter(i =>
    i.clientId === client.id || i.client === client.name
  ).sort((a, b) => b.id?.localeCompare(a.id))

  const total = clientInvoices.reduce((s, i) => s + i.amount, 0)
  const paid  = clientInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={client.name} color={client.color} size={36}/>
            <div>
              <div className="eyebrow">Historial de facturas</div>
              <h2 className="modal-title">{client.name}</h2>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div className="kpi" style={{ flex: 1 }}>
              <div className="kpi-label">Total facturado</div>
              <div className="kpi-value" style={{ fontSize: 18 }}>{fmtPEN(total, { decimals: 0 })}</div>
            </div>
            <div className="kpi" style={{ flex: 1 }}>
              <div className="kpi-label">Cobrado</div>
              <div className="kpi-value" style={{ fontSize: 18 }}>{fmtPEN(paid, { decimals: 0 })}</div>
            </div>
            <div className="kpi" style={{ flex: 1 }}>
              <div className="kpi-label">Facturas</div>
              <div className="kpi-value" style={{ fontSize: 18 }}>{clientInvoices.length}</div>
            </div>
          </div>

          {clientInvoices.length === 0
            ? <div style={{ textAlign: 'center', color: 'var(--ink-mute)', padding: '24px 0', fontSize: 13 }}>
                Sin facturas registradas para este cliente.
              </div>
            : <table className="invoice-table invoice-table-full">
                <thead>
                  <tr>
                    <th>Factura</th><th>Concepto</th>
                    <th className="num-col">Monto</th><th>Vence</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {clientInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="mono ink-strong">{inv.id}</td>
                      <td className="ink-mute">{inv.project}</td>
                      <td className="num-col mono">{fmtPEN(inv.amount)}</td>
                      <td className="ink-mute mono">{inv.due}</td>
                      <td>
                        {inv.status === 'paid'
                          ? <span className="pill pill-good">Pagada</span>
                          : inv.status === 'overdue'
                          ? <span className="pill pill-bad">Vencida</span>
                          : <span className="pill pill-warn">Pendiente</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

export default function ClientsView({ clients, invoices, onAddClient, onEditClient, onDeleteClient, onNewInvoice }) {
  const [modal, setModal]     = useState(null) // null | 'new' | { client }
  const [history, setHistory] = useState(null) // client object

  const activeClients = (clients || []).filter(c => c.active)
  const totalYTD = (clients || []).reduce((s, c) => {
    return s + invoices.filter(i => i.clientId === c.id || i.client === c.name)
                       .reduce((a, i) => a + i.amount, 0)
  }, 0)

  function handleSave(data) {
    if (modal === 'new') onAddClient({ ...data, id: 'cl-' + Date.now() })
    else onEditClient({ ...modal.client, ...data })
    setModal(null)
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">{activeClients.length} clientes activos</div>
          <h1>Clientes y proyectos</h1>
          <p className="lede">
            {(clients || []).length > 0
              ? <>{(clients || []).length} cliente{(clients || []).length !== 1 ? 's' : ''} registrados · YTD {fmtPEN(totalYTD, { decimals: 0 })}</>
              : 'Agrega tus clientes para llevar el historial de facturas por cuenta.'}
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-ghost" onClick={onNewInvoice}>
            <Icon name="plus" size={14}/> Nueva factura
          </button>
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14}/> Agregar cliente
          </button>
        </div>
      </header>

      {(clients || []).length === 0
        ? <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="clients" size={22}/></div>
              <h3>Sin clientes registrados</h3>
              <p>Agrega tus clientes para ver el historial de facturas, montos y estado de cada cuenta.</p>
              <button className="btn btn-primary btn-xs" onClick={() => setModal('new')}>+ Agregar primer cliente</button>
            </div>
          </div>
        : <section className="client-grid">
            {(clients || []).map(c => {
              const clientInvoices = invoices.filter(i => i.clientId === c.id || i.client === c.name)
              const ytd  = clientInvoices.reduce((s, i) => s + i.amount, 0)
              const owed = clientInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0)
              const lastInv = clientInvoices[clientInvoices.length - 1]
              const ytdShare = totalYTD > 0 ? ytd / totalYTD : 0

              return (
                <div key={c.id} className="client-card" style={{ opacity: c.active ? 1 : 0.55 }}>
                  <div className="client-card-head">
                    <Avatar name={c.name} color={c.color} size={40}/>
                    <div className="client-card-meta">
                      <div className="ink-strong">{c.name}</div>
                      <div className="ink-mute">{c.type}</div>
                    </div>
                    {!c.active && (
                      <span className="pill pill-mute" style={{ fontSize: 10 }}>Inactivo</span>
                    )}
                  </div>

                  {c.notes && (
                    <div style={{ fontSize: 12, color: 'var(--ink-mute)', padding: '6px 0 2px' }}>{c.notes}</div>
                  )}

                  <div className="client-card-stats">
                    <div>
                      <div className="lbl">Facturado</div>
                      <div className="num mono">{fmtPEN(ytd, { decimals: 0 })}</div>
                    </div>
                    <div>
                      <div className="lbl">Últ. factura</div>
                      <div className="num mono">{lastInv?.issued || '—'}</div>
                    </div>
                    <div>
                      <div className="lbl">Por cobrar</div>
                      <div className={`num mono ${owed > 0 ? 'ink-warn' : 'ink-mute'}`}>
                        {owed > 0 ? fmtPEN(owed, { decimals: 0 }) : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="client-card-bar">
                    <Bar value={ytdShare} color={c.color}/>
                    <div className="ink-mute" style={{ marginTop: 6, fontSize: 11 }}>
                      {(ytdShare * 100).toFixed(0)}% del ingreso total · {clientInvoices.length} factura{clientInvoices.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="goal-card-actions" style={{ marginTop: 12 }}>
                    <button className="btn btn-soft btn-xs" onClick={() => setHistory(c)}>
                      <Icon name="invoice" size={12}/> Ver historial
                    </button>
                    <button className="btn btn-xs btn-ghost" onClick={() => setModal({ client: c })}>
                      <Icon name="settings" size={12}/> Editar
                    </button>
                    <button
                      className="btn btn-xs btn-quiet"
                      style={{ color: 'var(--bad)', marginLeft: 'auto' }}
                      onClick={() => { if (window.confirm(`¿Eliminar "${c.name}"?`)) onDeleteClient(c.id) }}
                    >
                      <Icon name="close" size={12}/>
                    </button>
                  </div>
                </div>
              )
            })}
          </section>
      }

      {modal && (
        <ClientModal
          initial={modal === 'new' ? null : modal.client}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {history && (
        <HistoryModal
          client={history}
          invoices={invoices}
          onClose={() => setHistory(null)}
          onMarkPaid={() => {}}
        />
      )}
    </div>
  )
}
