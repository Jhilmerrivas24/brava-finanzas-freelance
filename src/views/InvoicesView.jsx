import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import Icon from '../components/Icon.jsx'
import Avatar from '../components/Avatar.jsx'
import StatusPill from '../components/StatusPill.jsx'
import { fmtPEN } from '../data.js'

function KpiCard({ label, value, foot, accent }) {
  return (
    <div className={`kpi ${accent ? 'kpi-accent' : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  )
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

// ── Filter panel ─────────────────────────────────
function FilterPanel({ invoices, filters, onChange, onClose }) {
  const clients = [...new Set(invoices.map(i => i.client))].sort()
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 20,
        background: 'var(--bg-elev)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 16, width: 280,
        boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 13 }}>Filtros</div>

      <div className="field">
        <label>Cliente</label>
        <select
          value={filters.client}
          onChange={e => onChange({ ...filters, client: e.target.value })}
        >
          <option value="">Todos</option>
          {clients.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="field">
        <label>Monto mínimo</label>
        <input
          type="number" min={0} step={100}
          placeholder="0"
          value={filters.minAmount}
          onChange={e => onChange({ ...filters, minAmount: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Monto máximo</label>
        <input
          type="number" min={0} step={100}
          placeholder="Sin límite"
          value={filters.maxAmount}
          onChange={e => onChange({ ...filters, maxAmount: e.target.value })}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button
          className="btn btn-xs btn-ghost"
          onClick={() => onChange({ client: '', minAmount: '', maxAmount: '' })}
        >
          Limpiar
        </button>
        <button className="btn btn-xs btn-primary" onClick={onClose}>
          Aplicar
        </button>
      </div>
    </div>
  )
}

// ── Export to Excel ───────────────────────────────
function exportToExcel(invoices, settings) {
  const rows = invoices.map(inv => ({
    'Factura':     inv.id,
    'Cliente':     inv.client,
    'Concepto':    inv.project,
    'Emitida':     inv.issued,
    'Vence':       inv.due,
    'Monto':       inv.amount,
    'Estado':      inv.status === 'paid' ? 'Pagada' : inv.status === 'pending' ? 'Pendiente' : 'Vencida',
  }))

  const totals = {
    'Factura': 'TOTALES',
    'Cliente': '',
    'Concepto': '',
    'Emitida': '',
    'Vence': '',
    'Monto': invoices.reduce((s, i) => s + i.amount, 0),
    'Estado': '',
  }

  const ws = XLSX.utils.json_to_sheet([...rows, totals])

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 22 }, { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas')

  const now = new Date()
  const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  XLSX.writeFile(wb, `facturas-${stamp}.xlsx`)
}

// ── Main view ─────────────────────────────────────
export default function InvoicesView({ invoices, onMarkPaid, onNewInvoice, onUndo, onDelete, settings, taxInvoices = [], taxRH = [] }) {
  const [tab, setTab] = useState('all')
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState({ client: '', minAmount: '', maxAmount: '' })

  // Merge: main invoices + tax-only entries (added directly in TaxesView, not linked to a main invoice)
  const mainIds = new Set(invoices.map(i => i.id))
  const taxOnlyFaturas = (taxInvoices||[])
    .filter(ti => !ti.fromInvoiceId || !mainIds.has(ti.fromInvoiceId))
    .map(ti => ({
      id: ti.id, _fromTax: true,
      client: ti.clientName, clientColor: '#a8a29e',
      project: ti.concept, amount: ti.subtotal || ti.amount,
      issued: ti.date, due: '—',
      status: ti.status === 'cobrada' ? 'paid' : ti.status === 'anulada' ? 'overdue' : 'pending',
      docType: 'factura', margin: null,
    }))
  const taxOnlyRHs = (taxRH||[])
    .filter(r => !r.fromInvoiceId || !mainIds.has(r.fromInvoiceId))
    .map(r => ({
      id: r.id, _fromTax: true,
      client: r.clientName, clientColor: '#a8a29e',
      project: r.concept, amount: r.grossAmount || 0,
      issued: r.date, due: '—',
      status: r.status === 'cobrado' ? 'paid' : r.status === 'anulado' ? 'overdue' : 'pending',
      docType: 'rh', margin: null,
    }))
  const allInvoices = [...invoices, ...taxOnlyFaturas, ...taxOnlyRHs]

  const tabs = [
    { id: 'all',     label: 'Todas',      count: allInvoices.length },
    { id: 'overdue', label: 'Vencidas',   count: allInvoices.filter(i => i.status === 'overdue').length },
    { id: 'pending', label: 'Pendientes', count: allInvoices.filter(i => i.status === 'pending').length },
    { id: 'paid',    label: 'Pagadas',    count: allInvoices.filter(i => i.status === 'paid').length },
  ]

  // Apply tab + filters
  const filtered = allInvoices
    .filter(i => tab === 'all' || i.status === tab)
    .filter(i => !filters.client || i.client === filters.client)
    .filter(i => !filters.minAmount || i.amount >= Number(filters.minAmount))
    .filter(i => !filters.maxAmount || i.amount <= Number(filters.maxAmount))

  const hasActiveFilters = filters.client || filters.minAmount || filters.maxAmount

  const totalAll     = allInvoices.reduce((s, i) => s + i.amount, 0)
  const totalPaid    = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalPending = allInvoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const totalOverdue = allInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">{new Date().getFullYear()}</div>
          <h1>Facturas</h1>
          <p className="lede">
            {allInvoices.length} comprobante{allInvoices.length !== 1 ? 's' : ''} ·{' '}
            {fmtPEN(totalPaid)} cobrado{totalOverdue > 0 && <> · <span className="ink-bad">{fmtPEN(totalOverdue)} vencido</span></>}
          </p>
        </div>
        <div className="view-header-actions">
          {/* Filter */}
          <div style={{ position: 'relative' }}>
            <button
              className={`btn btn-ghost ${hasActiveFilters ? 'btn-soft' : ''}`}
              onClick={() => setShowFilter(v => !v)}
            >
              <Icon name="filter" size={14} />
              Filtrar
              {hasActiveFilters && (
                <span style={{
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  padding: '1px 5px', borderRadius: 999,
                }}>
                  activo
                </span>
              )}
            </button>
            {showFilter && (
              <FilterPanel
                invoices={invoices}
                filters={filters}
                onChange={setFilters}
                onClose={() => setShowFilter(false)}
              />
            )}
          </div>

          {/* Export */}
          <button
            className="btn btn-ghost"
            onClick={() => exportToExcel(invoices, settings)}
            disabled={invoices.length === 0}
            title={invoices.length === 0 ? 'No hay facturas para exportar' : 'Exportar a Excel'}
          >
            <Icon name="download" size={14} /> Exportar Excel
          </button>

          <button className="btn btn-primary" onClick={onNewInvoice}>
            <Icon name="plus" size={14} /> Nueva factura
          </button>
        </div>
      </header>

      <section className="kpi-row">
        <KpiCard label="Total emitido"  value={fmtPEN(totalAll)}     foot={`${invoices.length} facturas`} />
        <KpiCard label="Cobrado"        value={fmtPEN(totalPaid)}    foot={totalAll > 0 ? `${((totalPaid / totalAll) * 100).toFixed(0)}% del total` : '0%'} />
        <KpiCard label="Pendiente"      value={fmtPEN(totalPending)} foot={`${invoices.filter(i => i.status === 'pending').length} en plazo`} />
        <KpiCard label="Vencido"        value={fmtPEN(totalOverdue)} foot={`${invoices.filter(i => i.status === 'overdue').length} a cobrar ya`} accent />
      </section>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label} <span className="tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0
        ? <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="invoice" size={22} /></div>
              <h3>{hasActiveFilters ? 'Sin resultados con ese filtro' : 'Sin facturas aquí'}</h3>
              <p>{hasActiveFilters ? 'Prueba cambiando o limpiando los filtros.' : 'Crea tu primera factura con el botón de arriba.'}</p>
            </div>
          </div>
        : <div className="card card-flat">
            <table className="invoice-table invoice-table-full">
              <thead>
                <tr>
                  <th>Factura</th><th>Tipo</th><th>Cliente</th><th>Concepto</th>
                  <th>Emitida</th><th>Vence</th>
                  <th className="num-col">Monto</th><th className="num-col">Margen</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const color = inv.clientColor || '#a8a29e'
                  return (
                    <tr key={inv.id}>
                      <td className="mono ink-strong">{inv.id}</td>
                      <td>
                        {inv.docType === 'rh'
                          ? <span className="pill pill-mute" style={{fontSize:10}}>RH</span>
                          : inv.docType === 'sin_declarar'
                          ? <span className="pill pill-bad" style={{fontSize:10}}>Sin declarar</span>
                          : <span className="pill pill-good" style={{fontSize:10}}>Factura</span>
                        }
                      </td>
                      <td>
                        <div className="cell-client">
                          <Avatar name={inv.client} color={color} size={26} />
                          <span className="ink-strong">{inv.client}</span>
                        </div>
                      </td>
                      <td className="ink-mute">{inv.project}</td>
                      <td className="ink-mute mono">{inv.issued}</td>
                      <td className="ink-mute mono">{inv.due}</td>
                      <td className="num-col mono ink-strong">{fmtPEN(inv.amount)}</td>
                      <td className="num-col mono">
                        {inv.margin != null
                          ? <span style={{ color: inv.margin >= 40 ? 'var(--good)' : inv.margin >= 20 ? 'var(--warn)' : 'var(--bad)', fontWeight: 600 }}>
                              {inv.margin}%
                            </span>
                          : <span className="ink-faint">—</span>
                        }
                      </td>
                      <td><StatusPill status={inv.status} /></td>
                      <td className="row-actions" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {inv._fromTax
                          ? <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontStyle: 'italic' }}>Gestionar en Impuestos</span>
                          : <>
                              {inv.status !== 'paid'
                                ? <button className="btn btn-xs" onClick={() => onMarkPaid(inv.id)}>
                                    <Icon name="check" size={12} /> Marcar pagada
                                  </button>
                                : <button className="btn btn-xs btn-quiet" onClick={() => onUndo(inv.id)}>
                                    Deshacer
                                  </button>
                              }
                              <button
                                className="btn btn-xs btn-quiet"
                                style={{ color: 'var(--bad)' }}
                                onClick={() => { if (window.confirm(`¿Eliminar ${inv.id}?`)) onDelete(inv.id) }}
                                title="Eliminar"
                              >
                                <Icon name="close" size={12} />
                              </button>
                            </>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
      }
    </div>
  )
}
