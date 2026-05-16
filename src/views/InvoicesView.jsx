import { useState, useRef, useEffect, useMemo } from 'react'
import { useDialog } from '../hooks/useDialog.js'
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

// ── Collection Alerts panel ───────────────────────
// Computed as a function so it's always fresh (not stale if app left open overnight)
function getToday() {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return t
}

function daysDiff(dueDate) {
  const d = new Date(dueDate)
  d.setHours(0, 0, 0, 0)
  return Math.round((d - getToday()) / 86400000)
}

function whatsappMsg(inv) {
  const issuedDisplay = inv.issued || 'fecha de emisión'
  return `Hola ${inv.client}, te recuerdo que la factura por S/ ${(inv.amount || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })} del proyecto "${inv.project || 'sin concepto'}" está pendiente de pago desde ${issuedDisplay}. Quedo atento/a.`
}

function AlertRow({ inv, onMarkPaid }) {
  const [copied, setCopied] = useState(false)

  const days  = inv.dueDate ? daysDiff(inv.dueDate) : null
  const label = days === null
    ? 'Sin fecha de vencimiento'
    : days < 0
    ? `Vencida hace ${-days} día${-days !== 1 ? 's' : ''}`
    : days === 0
    ? 'Vence hoy'
    : `Vence en ${days} día${days !== 1 ? 's' : ''}`

  const labelColor = days === null
    ? 'var(--ink-mute)'
    : days <= 0
    ? 'var(--bad)'
    : 'var(--warn)'

  function handleCopy() {
    navigator.clipboard.writeText(whatsappMsg(inv)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }).catch(() => {
      // Fallback for environments without clipboard API
      const ta = document.createElement('textarea')
      ta.value = whatsappMsg(inv)
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '8px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="ink-strong">{inv.client}</span>
          <span className="mono ink-mute" style={{ fontSize: 12 }}>{inv.id}</span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
            {fmtPEN(inv.amount)}
          </span>
          {inv.project && (
            <span className="ink-mute" style={{ fontSize: 12 }}>· {inv.project}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: labelColor, marginTop: 2, fontWeight: 600 }}>
          {label}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          className="btn btn-xs"
          onClick={() => onMarkPaid(inv.id)}
        >
          <Icon name="check" size={12}/> Marcar cobrada
        </button>
        <button
          className="btn btn-xs btn-ghost"
          onClick={handleCopy}
          title="Copiar mensaje de WhatsApp al portapapeles"
        >
          {copied ? '✓ Copiado' : 'Enviar recordatorio'}
        </button>
      </div>
    </div>
  )
}

function CollectionAlerts({ invoices, onMarkPaid }) {
  const [open, setOpen] = useState(true)

  const overdue = useMemo(() => invoices.filter(i =>
    i.status === 'pending' && i.dueDate && daysDiff(i.dueDate) < 0
  ), [invoices])

  const dueSoon = useMemo(() => invoices.filter(i =>
    i.status === 'pending' && i.dueDate && daysDiff(i.dueDate) >= 0 && daysDiff(i.dueDate) <= 7
  ), [invoices])

  const noDate = useMemo(() => invoices.filter(i =>
    i.status === 'pending' && !i.dueDate && !i._fromTax
  ), [invoices])

  const hasAlerts = overdue.length > 0 || dueSoon.length > 0 || noDate.length > 0
  if (!hasAlerts) return null

  const overdueAmt  = overdue.reduce((s, i) => s + (i.amount || 0), 0)
  const dueSoonAmt  = dueSoon.reduce((s, i) => s + (i.amount || 0), 0)

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Overdue banner */}
      {overdue.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, var(--bad) 8%, var(--bg-elev))',
          border: '1px solid color-mix(in srgb, var(--bad) 35%, transparent)',
          borderRadius: 10, marginBottom: 8, overflow: 'hidden',
        }}>
          <button
            onClick={() => setOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔴</span>
              <span style={{ fontWeight: 600, color: 'var(--bad)', fontSize: 13 }}>
                {overdue.length} factura{overdue.length !== 1 ? 's' : ''} vencida{overdue.length !== 1 ? 's' : ''} — {fmtPEN(overdueAmt, { decimals: 0 })} sin cobrar
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
              {open ? 'Ocultar ↑' : 'Ver detalle ↓'}
            </span>
          </button>
          {open && (
            <div style={{ padding: '0 16px 12px' }}>
              {overdue.map(inv => (
                <AlertRow key={inv.id} inv={inv} onMarkPaid={onMarkPaid} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Due soon banner */}
      {dueSoon.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, var(--warn) 8%, var(--bg-elev))',
          border: '1px solid color-mix(in srgb, var(--warn) 35%, transparent)',
          borderRadius: 10, marginBottom: 8, overflow: 'hidden',
        }}>
          <button
            onClick={() => setOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🟡</span>
              <span style={{ fontWeight: 600, color: 'var(--warn)', fontSize: 13 }}>
                {dueSoon.length} factura{dueSoon.length !== 1 ? 's' : ''} vence{dueSoon.length !== 1 ? 'n' : ''} en los próximos 7 días — {fmtPEN(dueSoonAmt, { decimals: 0 })}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
              {open ? 'Ocultar ↑' : 'Ver detalle ↓'}
            </span>
          </button>
          {open && (
            <div style={{ padding: '0 16px 12px' }}>
              {dueSoon.map(inv => (
                <AlertRow key={inv.id} inv={inv} onMarkPaid={onMarkPaid} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* No date warning */}
      {noDate.length > 0 && (
        <div style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
          color: 'var(--ink-mute)',
        }}>
          <span>📋</span>
          <span>
            <strong>{noDate.length} factura{noDate.length !== 1 ? 's' : ''} pendiente{noDate.length !== 1 ? 's' : ''}</strong> no tienen fecha de vencimiento — considera agregarles una para poder recibir alertas.
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main view ─────────────────────────────────────
export default function InvoicesView({ invoices, onMarkPaid, onNewInvoice, onUndo, onDelete, settings, taxInvoices = [], taxRH = [] }) {
  const dialog = useDialog()
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
      status: ti.status === 'cobrada' ? 'paid' : ti.status === 'anulada' ? 'cancelled' : 'pending',
      docType: 'factura', margin: null,
    }))
  const taxOnlyRHs = (taxRH||[])
    .filter(r => !r.fromInvoiceId || !mainIds.has(r.fromInvoiceId))
    .map(r => ({
      id: r.id, _fromTax: true,
      client: r.clientName, clientColor: '#a8a29e',
      project: r.concept, amount: r.grossAmount || 0,
      issued: r.date, due: '—',
      status: r.status === 'cobrado' ? 'paid' : r.status === 'anulado' ? 'cancelled' : 'pending',
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

      {/* ── Payment alerts ── */}
      <CollectionAlerts invoices={allInvoices} onMarkPaid={onMarkPaid} />

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
                                onClick={() => dialog.danger({ itemName: inv.id, title: '¿Eliminar?' }).then(ok => ok && onDelete(inv.id))}
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
