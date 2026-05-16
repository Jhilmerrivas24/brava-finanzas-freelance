import { useState, useMemo } from 'react'
import jsPDF from 'jspdf'
import Icon from '../components/Icon.jsx'
import Avatar from '../components/Avatar.jsx'
import StatusPill from '../components/StatusPill.jsx'
import { fmtPEN } from '../data.js'
import ConfigEmisor from '../components/cotizaciones/ConfigEmisor.jsx'
import { loadEmisor } from '../services/emisorService.js'

// ── Helpers ───────────────────────────────────────
function nextQuoteId(quotes) {
  const year = new Date().getFullYear()
  const nums = quotes
    .map(q => {
      const m = q.id?.match(/COT-\d{4}-(\d+)/)
      return m ? parseInt(m[1], 10) : 0
    })
    .filter(Boolean)
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `COT-${year}-${String(next).padStart(3, '0')}`
}

const EQUIPMENT_ITEMS = [
  { key: 'camera',    label: 'Cámara / equipo fotográfico', icon: '📷' },
  { key: 'lighting',  label: 'Iluminación',                 icon: '💡' },
  { key: 'transport', label: 'Transporte / movilidad',      icon: '🚗' },
  { key: 'drone',     label: 'Drone',                       icon: '🚁' },
  { key: 'location',  label: 'Locación / producción ext.',  icon: '🎬' },
]

const VALIDITY_OPTIONS = [
  { value: 7,  label: '7 días' },
  { value: 15, label: '15 días' },
  { value: 30, label: '30 días' },
]

const CLIENT_TYPES = ['Empresa/RUC', 'Persona natural', 'Extranjero']

const STATUS_LABELS = {
  pending:  'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  invoiced: 'Facturada',
}

function emptyItem() {
  return { id: Date.now() + Math.random(), concept: '', qty: 1, unitPrice: '', total: 0 }
}

function emptyEquipment() {
  return EQUIPMENT_ITEMS.reduce((acc, e) => {
    acc[e.key] = { enabled: false, amount: '' }
    return acc
  }, {})
}

// ── PDF Export ────────────────────────────────────
// Lee el emisor desde el service en el momento de exportar,
// así siempre usa los datos más recientes sin necesidad de
// pasar props. Cuando migremos a Supabase, solo cambia loadEmisor().
function exportQuotePDF(quote) {
  const emisor = loadEmisor()

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, pad = 18

  // ── Colores del header (verde teal corporativo) ───
  const BRAND  = [29, 158, 117]  // #1D9E75
  const BRAND_TAG  = [159, 225, 203] // #9FE1CB (rgb)
  const BRAND_META = [200, 240, 228] // #C8F0E4 (rgb)
  const INK    = [28, 25, 23]
  const MUTE   = [120, 113, 108]
  const LIGHT  = [250, 248, 244]
  const BORDER = [235, 231, 223]

  let y = 0

  // ── Header strip ─────────────────────────────────
  // Calculamos altura dinámica según datos disponibles del emisor
  const contactLine = [emisor.email, emisor.telefono].filter(Boolean).join(' · ')
  const metaLine    = [emisor.ruc && `RUC ${emisor.ruc}`, emisor.direccion, emisor.web].filter(Boolean).join(' · ')
  const headerH = 18 + (emisor.tagline ? 5 : 0) + (contactLine ? 5 : 0) + (metaLine ? 5 : 0)

  doc.setFillColor(...BRAND)
  doc.rect(0, 0, W, headerH, 'F')

  // Nombre de empresa
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text(emisor.nombre || 'Mi Empresa', pad, 13)

  let hy = 20
  if (emisor.tagline) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...BRAND_TAG)
    doc.text(emisor.tagline, pad, hy)
    hy += 5
  }
  if (contactLine) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...BRAND_META)
    doc.text(contactLine, pad, hy)
    hy += 5
  }
  if (metaLine) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND_META)
    doc.text(metaLine, pad, hy)
  }

  // Quote label (derecha)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND_TAG)
  doc.text('COTIZACIÓN', W - pad, 10, { align: 'right' })
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text(quote.id, W - pad, 18, { align: 'right' })

  y = headerH + 10

  // ── Client + meta block ───────────────────────────
  const clientBlockY = y
  // Left: client info
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...MUTE)
  doc.text('PARA', pad, y)
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...INK)
  doc.text(quote.clientName || '—', pad, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTE)
  if (quote.clientType) doc.text(quote.clientType, pad, y)

  // Right: dates
  const col2 = W - pad
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTE)
  doc.text(`Fecha de emisión: ${quote.issued}`, col2, clientBlockY, { align: 'right' })
  doc.text(`Vigencia: ${quote.validity} días`, col2, clientBlockY + 5, { align: 'right' })
  doc.text(`Proyecto: ${quote.project || '—'}`, col2, clientBlockY + 10, { align: 'right' })

  y += 12

  // Divider
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.4)
  doc.line(pad, y, W - pad, y)
  y += 8

  // ── Concepts table ────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...MUTE)
  doc.setFillColor(...LIGHT)
  doc.rect(pad, y - 4, W - pad * 2, 7, 'F')
  doc.text('CONCEPTO', pad + 2, y)
  doc.text('CANT.', 126, y, { align: 'right' })
  doc.text('P. UNIT.', 153, y, { align: 'right' })
  doc.text('TOTAL', W - pad - 2, y, { align: 'right' })
  y += 5

  doc.setLineWidth(0.3)
  doc.setDrawColor(...BORDER)
  doc.line(pad, y, W - pad, y)
  y += 5

  const validItems = (quote.items || []).filter(it => it.concept?.trim())
  validItems.forEach(item => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...INK)
    doc.text(item.concept, pad + 2, y)
    if (quote.showHourlyRate !== false) {
      doc.text(String(item.qty || 1), 126, y, { align: 'right' })
      doc.text(fmtPEN(Number(item.unitPrice) || 0), 153, y, { align: 'right' })
    }
    doc.text(fmtPEN(item.total || 0), W - pad - 2, y, { align: 'right' })
    y += 7

    if (y > 250) {
      doc.addPage()
      y = 20
    }
  })

  doc.setDrawColor(...BORDER)
  doc.line(pad, y, W - pad, y)
  y += 8

  // ── Equipment section ─────────────────────────────
  const activeEquip = EQUIPMENT_ITEMS.filter(e => quote.equipment?.[e.key]?.enabled && Number(quote.equipment[e.key].amount) > 0)
  if (activeEquip.length && quote.showEquipment !== false) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...MUTE)
    doc.setFillColor(...LIGHT)
    doc.rect(pad, y - 4, W - pad * 2, 7, 'F')
    doc.text('EQUIPOS Y LOGÍSTICA', pad + 2, y)
    doc.text('MONTO', W - pad - 2, y, { align: 'right' })
    y += 5
    doc.setDrawColor(...BORDER)
    doc.line(pad, y, W - pad, y)
    y += 5

    activeEquip.forEach(e => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...INK)
      doc.text(e.label, pad + 2, y)
      doc.text(fmtPEN(Number(quote.equipment[e.key].amount)), W - pad - 2, y, { align: 'right' })
      y += 7
    })

    doc.setDrawColor(...BORDER)
    doc.line(pad, y, W - pad, y)
    y += 8
  }

  // ── Totals block ──────────────────────────────────
  const totalX = 120
  const valX   = W - pad - 2

  function totalRow(label, value, bold = false, color = null) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 10 : 9)
    doc.setTextColor(...(color || (bold ? INK : MUTE)))
    doc.text(label, totalX, y)
    doc.text(fmtPEN(value), valX, y, { align: 'right' })
    y += 6
  }

  totalRow('Subtotal servicios', quote.subtotalServices || 0)
  if (activeEquip.length && quote.showEquipment !== false) {
    totalRow('Equipos y logística', quote.subtotalEquipment || 0)
  }
  if (quote.applyIGV) {
    totalRow('IGV (18%)', quote.igvAmount || 0, false, [120,113,108])
  }

  y += 2
  doc.setFillColor(...BRAND)
  doc.rect(totalX - 4, y - 5, W - pad - totalX + 4 + pad, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL', totalX, y + 1)
  doc.text(fmtPEN(quote.total || 0), valX, y + 1, { align: 'right' })
  y += 14

  // ── Notes ─────────────────────────────────────────
  if (quote.notes?.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...MUTE)
    doc.text('NOTAS Y CONDICIONES', pad, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...INK)
    const lines = doc.splitTextToSize(quote.notes, W - pad * 2)
    doc.text(lines, pad, y)
    y += lines.length * 5 + 4
  }

  // ── Footer ────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFillColor(...LIGHT)
  doc.rect(0, pageH - 16, W, 16, 'F')
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(0, pageH - 16, W, pageH - 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTE)
  doc.text(`Cotización válida por ${quote.validity} días desde la fecha de emisión.`, pad, pageH - 9)
  doc.text(quote.docType === 'factura' ? 'Se emitirá Factura' : 'Se emitirá Boleta', W - pad, pageH - 9, { align: 'right' })

  const stamp = new Date().toISOString().slice(0, 10)
  doc.save(`${quote.id}-${stamp}.pdf`)
}

// ── Quote Form ────────────────────────────────────
function QuoteForm({ quote, clients, settings, onSave, onCancel }) {
  const isEdit = !!quote

  const [clientId,    setClientId]    = useState(quote?.clientId    || '')
  const [clientName,  setClientName]  = useState(quote?.clientName  || '')
  const [clientType,  setClientType]  = useState(quote?.clientType  || 'Empresa/RUC')
  const [project,     setProject]     = useState(quote?.project     || '')
  const [validity,    setValidity]    = useState(quote?.validity    || 15)
  const [notes,       setNotes]       = useState(quote?.notes       || '')
  const [items,       setItems]       = useState(quote?.items?.length ? quote.items : [emptyItem()])
  const [equipment,   setEquipment]   = useState(quote?.equipment   || emptyEquipment())
  const [docType,     setDocType]     = useState(quote?.docType     || 'factura')
  const [applyIGV,    setApplyIGV]    = useState(quote?.applyIGV    ?? false)
  const [showEquipment, setShowEquipment] = useState(quote?.showEquipment ?? true)
  const [showHourlyRate, setShowHourlyRate] = useState(quote?.showHourlyRate ?? true)

  // Select client from list → auto-fill name
  function handleClientSelect(id) {
    setClientId(id)
    if (id) {
      const c = (clients || []).find(c => c.id === id)
      if (c) setClientName(c.name)
    }
  }

  // Items
  function updateItem(idx, field, val) {
    setItems(items => {
      const next = [...items]
      next[idx] = { ...next[idx], [field]: val }
      if (field === 'qty' || field === 'unitPrice') {
        const qty  = field === 'qty'       ? Number(val) : Number(next[idx].qty)
        const unit = field === 'unitPrice' ? Number(val) : Number(next[idx].unitPrice)
        next[idx].total = isNaN(qty * unit) ? 0 : qty * unit
      }
      return next
    })
  }

  function addItem()        { setItems(i => [...i, emptyItem()]) }
  function removeItem(idx)  { setItems(i => i.filter((_, j) => j !== idx)) }

  // Equipment
  function updateEquip(key, field, val) {
    setEquipment(eq => ({ ...eq, [key]: { ...eq[key], [field]: val } }))
  }

  // Totals
  const subtotalServices  = items.reduce((s, it) => s + (it.total || 0), 0)
  const subtotalEquipment = EQUIPMENT_ITEMS.reduce((s, e) => {
    const eq = equipment[e.key]
    return s + (eq.enabled ? (Number(eq.amount) || 0) : 0)
  }, 0)
  const subtotal  = subtotalServices + subtotalEquipment
  const igvAmount = applyIGV ? subtotal * 0.18 : 0
  const total     = subtotal + igvAmount

  function handleSave() {
    const today = new Date()
    const issued = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`
    onSave({
      ...(quote || {}),
      clientId, clientName, clientType, project, validity, notes,
      items, equipment, docType, applyIGV, showEquipment, showHourlyRate,
      issued: quote?.issued || issued,
      status: quote?.status || 'pending',
      subtotalServices, subtotalEquipment, igvAmount, total,
    })
  }

  const canSave = clientName.trim() && project.trim() && subtotalServices > 0

  return (
    <div className="quote-form">
      {/* ── Client & meta ── */}
      <div className="quote-form-section">
        <div className="quote-form-section-title">Cliente y proyecto</div>
        <div className="quote-form-grid2">
          <div className="field">
            <label>Cliente (de tu lista)</label>
            <select value={clientId} onChange={e => handleClientSelect(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {(clients || []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Nombre del cliente</label>
            <input
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="O escribe el nombre"
            />
          </div>
          <div className="field">
            <label>Tipo de cliente</label>
            <select value={clientType} onChange={e => setClientType(e.target.value)}>
              {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Nombre del proyecto</label>
            <input
              value={project}
              onChange={e => setProject(e.target.value)}
              placeholder="Ej: Campaña de verano"
            />
          </div>
          <div className="field">
            <label>Vigencia</label>
            <select value={validity} onChange={e => setValidity(Number(e.target.value))}>
              {VALIDITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Concepts table ── */}
      <div className="quote-form-section">
        <div className="quote-form-section-title">Conceptos / servicios</div>
        <div className="quote-items-table">
          <div className="quote-items-head">
            <span style={{ flex: 3 }}>Concepto</span>
            <span style={{ width: 70, textAlign: 'right' }}>Horas/Cant.</span>
            <span style={{ width: 110, textAlign: 'right' }}>Precio unit.</span>
            <span style={{ width: 110, textAlign: 'right' }}>Total</span>
            <span style={{ width: 28 }} />
          </div>
          {items.map((item, idx) => (
            <div key={item.id} className="quote-items-row">
              <input
                style={{ flex: 3 }}
                placeholder="Descripción del servicio"
                value={item.concept}
                onChange={e => updateItem(idx, 'concept', e.target.value)}
              />
              <input
                style={{ width: 70, textAlign: 'right' }}
                type="number" min={0} step={0.5}
                value={item.qty}
                onChange={e => updateItem(idx, 'qty', e.target.value)}
              />
              <input
                style={{ width: 110, textAlign: 'right' }}
                type="number" min={0} step={10}
                placeholder="0.00"
                value={item.unitPrice}
                onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
              />
              <div style={{ width: 110, textAlign: 'right', fontWeight: 600, fontSize: 13, padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                {fmtPEN(item.total || 0)}
              </div>
              <button
                className="btn btn-xs btn-quiet"
                style={{ width: 28, color: 'var(--bad)', padding: 0 }}
                onClick={() => removeItem(idx)}
                disabled={items.length === 1}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost btn-xs" onClick={addItem} style={{ marginTop: 8 }}>
          <Icon name="plus" size={12} /> Agregar fila
        </button>
      </div>

      {/* ── Equipment ── */}
      <div className="quote-form-section">
        <div className="quote-form-section-title">Equipos y logística</div>
        <div className="quote-equipment-grid">
          {EQUIPMENT_ITEMS.map(e => {
            const eq = equipment[e.key]
            return (
              <label key={e.key} className={`quote-equip-row ${eq.enabled ? 'is-active' : ''}`}>
                <input
                  type="checkbox"
                  checked={eq.enabled}
                  onChange={v => updateEquip(e.key, 'enabled', v.target.checked)}
                />
                <span className="quote-equip-icon">{e.icon}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{e.label}</span>
                <input
                  type="number" min={0} step={50}
                  placeholder="S/ 0"
                  value={eq.amount}
                  disabled={!eq.enabled}
                  onChange={v => updateEquip(e.key, 'amount', v.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 100, textAlign: 'right', opacity: eq.enabled ? 1 : 0.3 }}
                />
              </label>
            )
          })}
        </div>
      </div>

      {/* ── Toggles ── */}
      <div className="quote-form-section">
        <div className="quote-form-section-title">Configuración del comprobante</div>
        <div className="quote-toggles">
          <label className="quote-toggle-row">
            <span>Tipo de comprobante</span>
            <div className="toggle-group">
              <button
                className={`toggle-opt ${docType === 'factura' ? 'is-on' : ''}`}
                onClick={() => setDocType('factura')}
              >Factura</button>
              <button
                className={`toggle-opt ${docType === 'boleta' ? 'is-on' : ''}`}
                onClick={() => setDocType('boleta')}
              >Boleta</button>
            </div>
          </label>
          <label className="quote-toggle-row">
            <span>Aplicar IGV 18%</span>
            <button
              className={`toggle-switch ${applyIGV ? 'is-on' : ''}`}
              onClick={() => setApplyIGV(v => !v)}
            >
              <span className="toggle-thumb" />
            </button>
          </label>
          <label className="quote-toggle-row">
            <span>Incluir equipos en PDF</span>
            <button
              className={`toggle-switch ${showEquipment ? 'is-on' : ''}`}
              onClick={() => setShowEquipment(v => !v)}
            >
              <span className="toggle-thumb" />
            </button>
          </label>
          <label className="quote-toggle-row">
            <span>Mostrar precio por hora en PDF</span>
            <button
              className={`toggle-switch ${showHourlyRate ? 'is-on' : ''}`}
              onClick={() => setShowHourlyRate(v => !v)}
            >
              <span className="toggle-thumb" />
            </button>
          </label>
        </div>
      </div>

      {/* ── Notes ── */}
      <div className="quote-form-section">
        <div className="quote-form-section-title">Notas y condiciones</div>
        <textarea
          className="quote-notes"
          rows={3}
          placeholder="Condiciones de pago, entregables incluidos, revisiones, etc."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {/* ── Totals ── */}
      <div className="quote-totals">
        <div className="quote-totals-inner">
          <div className="quote-total-row">
            <span>Subtotal servicios</span>
            <span>{fmtPEN(subtotalServices)}</span>
          </div>
          {subtotalEquipment > 0 && (
            <div className="quote-total-row">
              <span>Equipos y logística</span>
              <span>{fmtPEN(subtotalEquipment)}</span>
            </div>
          )}
          {applyIGV && (
            <div className="quote-total-row ink-mute">
              <span>IGV 18%</span>
              <span>{fmtPEN(igvAmount)}</span>
            </div>
          )}
          <div className="quote-total-row quote-total-grand">
            <span>TOTAL</span>
            <span>{fmtPEN(total)}</span>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
          <Icon name="check" size={14} /> {isEdit ? 'Guardar cambios' : 'Crear cotización'}
        </button>
      </div>
    </div>
  )
}

// ── History panel ─────────────────────────────────
function HistoryPanel({ quotes, onSelect, onChangeStatus, onDelete, selectedId }) {
  if (quotes.length === 0) {
    return (
      <div className="quote-history-empty">
        <Icon name="quote" size={20} />
        <p>Sin cotizaciones aún</p>
      </div>
    )
  }

  return (
    <div className="quote-history-list">
      {quotes.map(q => (
        <div
          key={q.id}
          className={`quote-history-item ${selectedId === q.id ? 'is-selected' : ''}`}
          onClick={() => onSelect(q)}
        >
          <div className="quote-history-top">
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{q.id}</span>
            <QuoteStatusBadge status={q.status} />
          </div>
          <div className="quote-history-client">{q.clientName || '—'}</div>
          <div className="quote-history-meta">
            <span className="ink-mute">{q.project}</span>
            <span className="mono ink-strong">{fmtPEN(q.total || 0)}</span>
          </div>
          <div className="quote-history-foot">
            <span className="ink-faint" style={{ fontSize: 11 }}>{q.issued}</span>
            <div className="quote-history-actions" onClick={e => e.stopPropagation()}>
              <select
                className="quote-status-select"
                value={q.status}
                onChange={e => onChangeStatus(q.id, e.target.value)}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <button
                className="btn btn-xs btn-quiet"
                style={{ color: 'var(--bad)', padding: '0 4px' }}
                onClick={() => { if (window.confirm(`¿Eliminar ${q.id}?`)) onDelete(q.id) }}
              >
                <Icon name="trash" size={11} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function QuoteStatusBadge({ status }) {
  const map = {
    pending:  { label: 'Pendiente',  cls: 'pill-warn' },
    accepted: { label: 'Aceptada',   cls: 'pill-good' },
    rejected: { label: 'Rechazada',  cls: 'pill-bad'  },
    invoiced: { label: 'Facturada',  cls: 'pill-mute' },
  }
  const s = map[status] || map.pending
  return <span className={`pill ${s.cls}`} style={{ fontSize: 10 }}>{s.label}</span>
}

// ── Range reference ───────────────────────────────
function RangePanel({ quotes }) {
  if (quotes.length < 2) return null

  const amounts = quotes.map(q => q.total || 0).sort((a, b) => a - b)
  const min = amounts[0]
  const max = amounts[amounts.length - 1]
  const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length

  return (
    <div className="quote-range-panel">
      <div className="quote-form-section-title" style={{ marginBottom: 10 }}>Rangos de tu historial</div>
      <div className="quote-range-row">
        <span className="ink-mute">Mínimo</span>
        <span className="mono">{fmtPEN(min)}</span>
      </div>
      <div className="quote-range-row">
        <span className="ink-mute">Promedio</span>
        <span className="mono ink-strong">{fmtPEN(avg)}</span>
      </div>
      <div className="quote-range-row">
        <span className="ink-mute">Máximo</span>
        <span className="mono" style={{ color: 'var(--good)' }}>{fmtPEN(max)}</span>
      </div>
      <div className="quote-range-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
        <span className="ink-mute">Cotizaciones</span>
        <span className="mono">{quotes.length}</span>
      </div>
      <div className="quote-range-row">
        <span className="ink-mute">Aceptadas</span>
        <span className="mono" style={{ color: 'var(--good)' }}>
          {quotes.filter(q => q.status === 'accepted' || q.status === 'invoiced').length}
        </span>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────
export default function QuotesView({ quotes = [], onAddQuote, onEditQuote, onDeleteQuote, onChangeStatus, onConvertToInvoice, onGoto, clients = [], settings }) {
  const [mode, setMode]                 = useState('list')   // 'list' | 'new' | 'edit'
  const [editingQuote, setEditingQuote] = useState(null)
  const [selectedId, setSelectedId]     = useState(null)
  const [showConfig, setShowConfig]     = useState(false)
  const [converting, setConverting]     = useState(false)

  const selectedQuote = useMemo(() => quotes.find(q => q.id === selectedId), [quotes, selectedId])

  function handleSave(data) {
    if (editingQuote) {
      onEditQuote({ ...editingQuote, ...data })
    } else {
      onAddQuote({ ...data, id: nextQuoteId(quotes) })
    }
    setMode('list')
    setEditingQuote(null)
  }

  function handleEdit(q) {
    setEditingQuote(q)
    setMode('edit')
    setSelectedId(q.id)
  }

  function handleCancel() {
    setMode('list')
    setEditingQuote(null)
  }

  function handleConvert(q) {
    if (!window.confirm(
      `¿Convertir la cotización ${q.id} en factura?\n\nSe creará una factura pendiente de cobro y la cotización quedará marcada como "Facturada".`
    )) return
    onConvertToInvoice(q)
    // onConvertToInvoice navigates to invoices automatically via App.jsx
  }

  // KPIs
  const totalAll      = quotes.reduce((s, q) => s + (q.total || 0), 0)
  const totalAccepted = quotes.filter(q => q.status === 'accepted' || q.status === 'invoiced').reduce((s, q) => s + (q.total || 0), 0)
  const countPending  = quotes.filter(q => q.status === 'pending').length

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">{new Date().getFullYear()}</div>
          <h1>Cotizaciones</h1>
          <p className="lede">
            {quotes.length} cotización{quotes.length !== 1 ? 'es' : ''} ·{' '}
            {fmtPEN(totalAccepted)} aceptado
            {countPending > 0 && <> · <span style={{ color: 'var(--warn)' }}>{countPending} pendiente{countPending !== 1 ? 's' : ''}</span></>}
          </p>
        </div>
        <div className="view-header-actions">
          {mode !== 'list' && (
            <button className="btn btn-ghost" onClick={handleCancel}>
              ← Volver al listado
            </button>
          )}
          {/* Engranaje — siempre visible, discreto */}
          <button
            className="btn btn-ghost"
            onClick={() => setShowConfig(true)}
            title="Configurar datos del emisor"
            style={{ padding: '7px 10px' }}
          >
            <Icon name="settings" size={14} />
            <span style={{ fontSize: 12, marginLeft: 4 }}>Emisor</span>
          </button>
          {mode === 'list' && (
            <button className="btn btn-primary" onClick={() => { setMode('new'); setEditingQuote(null) }}>
              <Icon name="plus" size={14} /> Nueva cotización
            </button>
          )}
        </div>
      </header>

      {/* KPI row */}
      <section className="kpi-row">
        <div className="kpi">
          <div className="kpi-label">Total emitido</div>
          <div className="kpi-value">{fmtPEN(totalAll)}</div>
          <div className="kpi-foot">{quotes.length} cotizaciones</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Aceptadas / Facturadas</div>
          <div className="kpi-value">{fmtPEN(totalAccepted)}</div>
          <div className="kpi-foot">{quotes.filter(q => q.status === 'accepted' || q.status === 'invoiced').length} aprobadas</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Pendientes</div>
          <div className="kpi-value" style={{ color: countPending > 0 ? 'var(--warn)' : undefined }}>
            {countPending}
          </div>
          <div className="kpi-foot">en espera</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Tasa de cierre</div>
          <div className="kpi-value">
            {quotes.length > 0
              ? `${Math.round((quotes.filter(q => q.status === 'accepted' || q.status === 'invoiced').length / quotes.length) * 100)}%`
              : '—'
            }
          </div>
          <div className="kpi-foot">del total enviado</div>
        </div>
      </section>

      {(mode === 'new' || mode === 'edit') ? (
        /* ── Form layout ── */
        <div className="quote-layout-form">
          <div className="card" style={{ flex: 1, minWidth: 0 }}>
            <QuoteForm
              quote={editingQuote}
              clients={clients}
              settings={settings}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </div>
      ) : (
        /* ── List layout ── */
        <div className="quote-layout">
          {/* History + range */}
          <div className="quote-sidebar-panel">
            <RangePanel quotes={quotes} />
            <HistoryPanel
              quotes={quotes}
              selectedId={selectedId}
              onSelect={q => setSelectedId(q.id)}
              onChangeStatus={onChangeStatus}
              onDelete={onDeleteQuote}
            />
          </div>

          {/* Detail / empty */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {selectedQuote ? (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div className="mono ink-mute" style={{ fontSize: 11 }}>{selectedQuote.id}</div>
                      <QuoteStatusBadge status={selectedQuote.status} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedQuote.clientName}</div>
                    <div className="ink-mute">{selectedQuote.project}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={() => exportQuotePDF(selectedQuote)}>
                      <Icon name="download" size={14} /> Exportar PDF
                    </button>
                    <button className="btn btn-ghost" onClick={() => handleEdit(selectedQuote)}>
                      Editar
                    </button>
                    {selectedQuote.status === 'accepted' && onConvertToInvoice && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleConvert(selectedQuote)}
                        title="Crear una factura pendiente a partir de esta cotización"
                      >
                        <Icon name="invoice" size={14} /> Convertir a factura
                      </button>
                    )}
                    {selectedQuote.status === 'invoiced' && (
                      <button
                        className="btn btn-soft"
                        onClick={() => onGoto?.('invoices')}
                        style={{ color: 'var(--good)' }}
                      >
                        <Icon name="check" size={13} /> Ver factura generada
                      </button>
                    )}
                  </div>
                </div>

                {/* Items preview */}
                <div className="card-flat" style={{ marginBottom: 16 }}>
                  <table className="invoice-table invoice-table-full">
                    <thead>
                      <tr>
                        <th>Concepto</th>
                        <th className="num-col">Cant.</th>
                        <th className="num-col">P. Unit.</th>
                        <th className="num-col">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedQuote.items || []).filter(it => it.concept?.trim()).map(item => (
                        <tr key={item.id}>
                          <td>{item.concept}</td>
                          <td className="num-col mono">{item.qty}</td>
                          <td className="num-col mono">{fmtPEN(Number(item.unitPrice) || 0)}</td>
                          <td className="num-col mono ink-strong">{fmtPEN(item.total || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Equipment preview */}
                {EQUIPMENT_ITEMS.some(e => selectedQuote.equipment?.[e.key]?.enabled) && (
                  <div style={{ marginBottom: 16 }}>
                    <div className="quote-form-section-title" style={{ marginBottom: 8 }}>Equipos y logística</div>
                    {EQUIPMENT_ITEMS.filter(e => selectedQuote.equipment?.[e.key]?.enabled).map(e => (
                      <div key={e.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <span>{e.icon} {e.label}</span>
                        <span className="mono">{fmtPEN(Number(selectedQuote.equipment[e.key].amount) || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                <div className="quote-totals">
                  <div className="quote-totals-inner">
                    <div className="quote-total-row">
                      <span>Subtotal servicios</span>
                      <span>{fmtPEN(selectedQuote.subtotalServices || 0)}</span>
                    </div>
                    {(selectedQuote.subtotalEquipment || 0) > 0 && (
                      <div className="quote-total-row">
                        <span>Equipos</span>
                        <span>{fmtPEN(selectedQuote.subtotalEquipment)}</span>
                      </div>
                    )}
                    {selectedQuote.applyIGV && (
                      <div className="quote-total-row ink-mute">
                        <span>IGV 18%</span>
                        <span>{fmtPEN(selectedQuote.igvAmount || 0)}</span>
                      </div>
                    )}
                    <div className="quote-total-row quote-total-grand">
                      <span>TOTAL</span>
                      <span>{fmtPEN(selectedQuote.total || 0)}</span>
                    </div>
                  </div>
                </div>

                {selectedQuote.notes && (
                  <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-sunk)', borderRadius: 8, fontSize: 13 }}>
                    <div className="ink-mute" style={{ fontSize: 11, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notas y condiciones</div>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{selectedQuote.notes}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 12, color: 'var(--ink-mute)' }}>
                  <span>Emitida: {selectedQuote.issued}</span>
                  <span>Vigencia: {selectedQuote.validity} días</span>
                  <span>Comprobante: {selectedQuote.docType === 'factura' ? 'Factura' : 'Boleta'}</span>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon"><Icon name="quote" size={22} /></div>
                  <h3>{quotes.length === 0 ? 'Sin cotizaciones aún' : 'Selecciona una cotización'}</h3>
                  <p>{quotes.length === 0
                    ? 'Crea tu primera cotización con el botón de arriba.'
                    : 'Haz clic en una cotización del panel izquierdo para ver su detalle.'
                  }</p>
                  {quotes.length === 0 && (
                    <button className="btn btn-primary" onClick={() => setMode('new')}>
                      <Icon name="plus" size={14} /> Nueva cotización
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Panel de configuración del emisor ── */}
      {showConfig && (
        <ConfigEmisor onClose={() => setShowConfig(false)} />
      )}
    </div>
  )
}
