import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'
import { useDialog } from '../hooks/useDialog.js'

const CATEGORIES = [
  'Software','Servicios','Transporte','Alimentación',
  'Marketing','Educación','Material','Equipamiento','Salud','Otro',
]

const CAT_COLORS = {
  Software:     '#6366f1',
  Servicios:    '#3b82f6',
  Transporte:   '#f59e0b',
  Alimentación: '#10b981',
  Marketing:    '#ec4899',
  Educación:    '#8b5cf6',
  Material:     '#14b8a6',
  Equipamiento: '#f97316',
  Salud:        '#ef4444',
  Otro:         '#6b7280',
}

const MONTHS_ES    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']
const DAYS_ES      = ['dom','lun','mar','mié','jue','vie','sáb']

// ── Expense Modal ──────────────────────────────────────────────────────────────
function ExpenseModal({ initial, onSave, onClose, accounts = [], creditLines = [] }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState(initial ?? {
    description: '', amount: '', date: today,
    category: 'Software', hasIGV: false, deductible: true, notes: '',
    paymentMethod: { type: 'efectivo' },
  })
  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setpm = (k, v) => setForm(f => ({ ...f, paymentMethod: { ...f.paymentMethod, [k]: v } }))
  const valid = form.description.trim() && Number(form.amount) > 0 && form.date
  const amt   = Number(form.amount) || 0
  const igvAmt = form.hasIGV ? amt - amt / 1.18 : 0

  const pmType          = form.paymentMethod?.type ?? 'efectivo'
  const activeAccounts  = accounts.filter(a => a.activa !== false)
  const activeCreditLines = creditLines.filter(cl => cl.activa !== false)

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

          <div className="field-row">
            <div className="field">
              <label>Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Payment method */}
          <div className="field">
            <label>Método de pago</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[
                { id: 'efectivo', label: '💵 Efectivo' },
                ...(activeAccounts.length > 0    ? [{ id: 'cuenta',  label: '🏦 Cuenta' }]  : []),
                ...(activeCreditLines.length > 0  ? [{ id: 'tarjeta', label: '💳 Tarjeta' }] : []),
              ].map(opt => (
                <button key={opt.id}
                  style={{
                    flex:1, padding:'7px 10px', borderRadius:8, cursor:'pointer', fontSize:12,
                    border:`2px solid ${pmType === opt.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: pmType === opt.id ? 'color-mix(in srgb,var(--accent) 12%,var(--bg-elev))' : 'var(--bg-elev)',
                    fontWeight: pmType === opt.id ? 700 : 400,
                    color: pmType === opt.id ? 'var(--accent)' : 'var(--ink-mute)',
                    transition:'all 0.15s',
                  }}
                  onClick={() => set('paymentMethod', { type: opt.id })}
                >{opt.label}</button>
              ))}
            </div>
            {pmType === 'cuenta' && activeAccounts.length > 0 && (
              <select value={form.paymentMethod?.accountId ?? ''}
                onChange={e => setpm('accountId', e.target.value)} style={{ marginTop:0 }}>
                <option value="">— Seleccionar cuenta —</option>
                {activeAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre ?? a.bank} ({a.moneda ?? 'PEN'})</option>
                ))}
              </select>
            )}
            {pmType === 'tarjeta' && activeCreditLines.length > 0 && (
              <select value={form.paymentMethod?.creditLineId ?? ''}
                onChange={e => setpm('creditLineId', e.target.value)} style={{ marginTop:0 }}>
                <option value="">— Seleccionar tarjeta —</option>
                {activeCreditLines.map(cl => (
                  <option key={cl.id} value={cl.id}>
                    {cl.nombre} — disponible: S/ {Math.max(0, (cl.limite ?? 0) - (cl.usado ?? 0)).toLocaleString('es-PE')}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* IGV + Deductible */}
          <div style={{ display:'flex', gap:10, background:'var(--bg-sunk)', borderRadius:10, padding:'12px 14px' }}>
            <label style={{ display:'flex', alignItems:'flex-start', gap:8, cursor:'pointer', flex:1, fontSize:13 }}>
              <input type="checkbox" checked={form.hasIGV}
                onChange={e => set('hasIGV', e.target.checked)}
                style={{ width:15, height:15, accentColor:'var(--accent)', marginTop:2 }}/>
              <div>
                <div style={{ fontWeight:600 }}>Incluye IGV</div>
                {form.hasIGV && amt > 0
                  ? <div style={{ fontSize:11, color:'var(--ink-mute)' }}>Crédito: <span className="mono ink-good">S/ {igvAmt.toFixed(2)}</span></div>
                  : <div style={{ fontSize:11, color:'var(--ink-mute)' }}>18% crédito fiscal</div>}
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

// ── Payment method badge ───────────────────────────────────────────────────────
function PmBadge({ pm, accounts = [], creditLines = [] }) {
  if (!pm || pm.type === 'efectivo') return null
  if (pm.type === 'cuenta') {
    const acc = accounts.find(a => a.id === pm.accountId)
    return (
      <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:'color-mix(in srgb,#3b82f6 15%,var(--bg-elev))', color:'#3b82f6', marginLeft:4 }}>
        🏦 {acc ? (acc.nombre ?? acc.bank) : 'Cuenta'}
      </span>
    )
  }
  if (pm.type === 'tarjeta') {
    const cl = creditLines.find(c => c.id === pm.creditLineId)
    return (
      <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:'color-mix(in srgb,#8b5cf6 15%,var(--bg-elev))', color:'#8b5cf6', marginLeft:4 }}>
        💳 {cl ? cl.nombre : 'Tarjeta'}
      </span>
    )
  }
  return null
}

// ── Quick-add bar ──────────────────────────────────────────────────────────────
function QuickAdd({ onAdd }) {
  const [desc, setDesc] = useState('')
  const [amt,  setAmt]  = useState('')
  const [cat,  setCat]  = useState('Software')
  const today = new Date().toISOString().split('T')[0]
  const valid = desc.trim() && Number(amt) > 0

  function submit(e) {
    e.preventDefault()
    if (!valid) return
    onAdd({
      id: 've-' + Date.now(),
      description: desc.trim(),
      amount: Number(amt),
      date: today,
      category: cat,
      hasIGV: false,
      deductible: true,
      notes: '',
      paymentMethod: { type: 'efectivo' },
    })
    setDesc('')
    setAmt('')
  }

  return (
    <form onSubmit={submit} style={{
      display:'flex', gap:8, alignItems:'center',
      padding:'10px 14px', background:'var(--bg-sunk)',
      borderRadius:10, marginBottom:8,
    }}>
      <input
        type="text" value={desc} onChange={e => setDesc(e.target.value)}
        placeholder="Añadir gasto rápido…"
        style={{ flex:2, fontSize:13 }}
      />
      <div className="amount-input" style={{ flex:'0 0 110px' }}>
        <span className="amount-prefix mono">S/</span>
        <input type="text" inputMode="decimal" className="amount-field mono"
          value={amt} onChange={e => setAmt(e.target.value)} placeholder="0.00"
          style={{ fontSize:13 }}/>
      </div>
      <select value={cat} onChange={e => setCat(e.target.value)}
        style={{ fontSize:12, padding:'6px 8px', flex:'0 0 120px' }}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="submit" className="btn btn-primary btn-xs" disabled={!valid}
        style={{ whiteSpace:'nowrap', flexShrink:0 }}>
        <Icon name="plus" size={12}/> Añadir
      </button>
    </form>
  )
}

// ── Category breakdown bar ─────────────────────────────────────────────────────
function CategoryBar({ expenses }) {
  if (!expenses.length) return null
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  if (!total) return null

  const bycat = {}
  expenses.forEach(e => { bycat[e.category] = (bycat[e.category] || 0) + e.amount })
  const sorted = Object.entries(bycat).sort((a, b) => b[1] - a[1])

  return (
    <div className="card" style={{ padding:'14px 16px', marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-mute)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
        Distribución por categoría
      </div>
      {/* Stacked bar */}
      <div style={{ height:8, borderRadius:999, overflow:'hidden', display:'flex', marginBottom:12 }}>
        {sorted.map(([cat, amt]) => (
          <div key={cat}
            style={{ width:`${(amt/total)*100}%`, background: CAT_COLORS[cat] ?? '#6b7280', transition:'width .4s' }}
            title={`${cat}: ${fmtPEN(amt)}`}/>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 14px' }}>
        {sorted.map(([cat, amt]) => (
          <div key={cat} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11 }}>
            <div style={{ width:8, height:8, borderRadius:2, background: CAT_COLORS[cat] ?? '#6b7280', flexShrink:0 }}/>
            <span style={{ color:'var(--ink-mute)' }}>{cat}</span>
            <span className="mono" style={{ color:'var(--ink-strong)', fontWeight:700 }}>
              {Math.round((amt/total)*100)}%
            </span>
            <span className="mono" style={{ color:'var(--ink-faint)', fontSize:10 }}>
              {fmtPEN(amt, { decimals:0 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Day label helper ───────────────────────────────────────────────────────────
function formatDayLabel(dateStr) {
  if (!dateStr || dateStr === 'sin-fecha') return 'Sin fecha'
  const todayDate = new Date(); todayDate.setHours(0,0,0,0)
  const d    = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((todayDate - d) / 86400000)
  const dow  = DAYS_ES[d.getDay()]
  const day  = d.getDate()
  const mon  = MONTHS_SHORT[d.getMonth()]
  const yr   = d.getFullYear() !== todayDate.getFullYear() ? ` ${d.getFullYear()}` : ''
  if (diff === 0) return `Hoy · ${day} ${mon}`
  if (diff === 1) return `Ayer · ${day} ${mon}`
  if (diff > 1 && diff < 7) return `${dow} · ${day} ${mon}`
  return `${day} ${mon}${yr}`
}

// ── Day Group ──────────────────────────────────────────────────────────────────
function DayGroup({ dateStr, expenses, isToday, onEdit, onDelete, onAddQuick, onOpenModal, accounts, creditLines, showQuickAdd }) {
  const [open, setOpen] = useState(true)
  const dayTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const label    = formatDayLabel(dateStr)

  return (
    <div style={{ marginBottom:10 }}>
      {/* Day header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:8,
          background:'none', border:'none', cursor:'pointer',
          padding:'6px 2px', marginBottom: open ? 4 : 0,
        }}
      >
        <div style={{
          width:7, height:7, borderRadius:'50%', flexShrink:0,
          background: isToday ? 'var(--accent)' : 'var(--border)',
        }}/>
        <span style={{
          fontSize:11, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase',
          color: isToday ? 'var(--accent)' : 'var(--ink-mute)',
        }}>{label}</span>
        {dayTotal > 0 && (
          <span className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginLeft:'auto' }}>
            {fmtPEN(dayTotal, { decimals:0 })}
          </span>
        )}
        <span style={{
          display:'inline-flex', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition:'transform .15s',
          color:'var(--ink-faint)', marginLeft: dayTotal > 0 ? 4 : 'auto',
        }}>
          <Icon name="chevron" size={12}/>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity:0, height:0 }}
            animate={{ opacity:1, height:'auto' }}
            exit={{ opacity:0, height:0 }}
            style={{ overflow:'hidden' }}
          >
            {/* Quick-add bar (today only, current month) */}
            {isToday && showQuickAdd && (
              <QuickAdd onAdd={onAddQuick}/>
            )}

            {expenses.length === 0 ? (
              isToday ? (
                <div style={{
                  padding:'12px 16px', color:'var(--ink-faint)', fontSize:12, textAlign:'center',
                  background:'var(--bg-sunk)', borderRadius:10,
                }}>
                  Sin gastos registrados hoy — usa el formulario de arriba o{' '}
                  <button onClick={onOpenModal}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent)', fontSize:12, padding:0, textDecoration:'underline' }}>
                    regístralo completo
                  </button>
                </div>
              ) : null
            ) : (
              <div className="card card-flat" style={{ padding:0, overflow:'hidden' }}>
                <table className="invoice-table invoice-table-full" style={{ marginBottom:0 }}>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                            <div style={{
                              width:8, height:8, borderRadius:2, flexShrink:0,
                              background: CAT_COLORS[e.category] ?? '#6b7280',
                            }}/>
                            <span className="ink-strong" style={{ fontSize:13 }}>{e.description}</span>
                            {e.hasIGV    && <span className="pill pill-good" style={{ fontSize:9 }}>IGV</span>}
                            {e.deductible && <span className="pill pill-mute" style={{ fontSize:9 }}>Ded.</span>}
                            <PmBadge pm={e.paymentMethod} accounts={accounts} creditLines={creditLines}/>
                          </div>
                          {e.notes && (
                            <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:1, paddingLeft:14 }}>{e.notes}</div>
                          )}
                        </td>
                        <td><span className="pill pill-mute" style={{ fontSize:10 }}>{e.category}</span></td>
                        <td className="num-col mono" style={{ fontWeight:700 }}>{fmtPEN(e.amount)}</td>
                        <td className="row-actions" style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                          <button className="btn btn-xs btn-ghost" onClick={() => onEdit(e)}>
                            <Icon name="settings" size={12}/>
                          </button>
                          <button className="btn btn-xs btn-quiet" style={{ color:'var(--bad)' }} onClick={() => onDelete(e)}>
                            <Icon name="close" size={12}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main View ──────────────────────────────────────────────────────────────────
export default function VariableExpensesView({ expenses = [], onAdd, onEdit, onDelete, accounts = [], creditLines = [] }) {
  const dialog = useDialog()
  const [modal, setModal] = useState(null)
  const now  = new Date()
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)

  const yearOptions   = [now.getFullYear(), now.getFullYear() - 1]
  const isCurrentMonth = selYear === now.getFullYear() && selMonth === (now.getMonth() + 1)
  const today          = now.toISOString().split('T')[0]

  const filtered = useMemo(() =>
    [...(expenses || [])]
      .filter(e => {
        if (!e.date) return true
        const d = new Date(e.date)
        return d.getFullYear() === selYear && (d.getMonth() + 1) === selMonth
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  , [expenses, selYear, selMonth])

  const totalMonth = filtered.reduce((s, e) => s + e.amount, 0)
  const igvMonth   = filtered.filter(e => e.hasIGV).reduce((s, e) => s + (e.amount - e.amount / 1.18), 0)
  const dedMonth   = filtered.filter(e => e.deductible).reduce((s, e) => s + e.amount, 0)
  const totalAll   = (expenses || []).reduce((s, e) => s + e.amount, 0)

  const pmBreakdown = useMemo(() => {
    const ef = filtered.filter(e => !e.paymentMethod || e.paymentMethod.type === 'efectivo').reduce((s,e) => s+e.amount, 0)
    const cu = filtered.filter(e => e.paymentMethod?.type === 'cuenta').reduce((s,e) => s+e.amount, 0)
    const ta = filtered.filter(e => e.paymentMethod?.type === 'tarjeta').reduce((s,e) => s+e.amount, 0)
    return { efectivo:ef, cuenta:cu, tarjeta:ta }
  }, [filtered])

  // Group by date
  const groupedByDay = useMemo(() => {
    const g = {}
    filtered.forEach(e => {
      const key = e.date || 'sin-fecha'
      if (!g[key]) g[key] = []
      g[key].push(e)
    })
    return g
  }, [filtered])

  // Sorted day keys (descending), always include today in current month
  const dayKeys = useMemo(() => {
    const keys = Object.keys(groupedByDay)
      .filter(k => k !== 'sin-fecha')
      .sort((a, b) => b.localeCompare(a))
    if (isCurrentMonth && !keys.includes(today)) {
      keys.unshift(today)
    }
    return keys
  }, [groupedByDay, isCurrentMonth, today])

  const hasSinFecha   = !!groupedByDay['sin-fecha']
  const hasAnyData    = (expenses || []).length > 0
  const hasMonthData  = filtered.length > 0 || isCurrentMonth

  function prevMonth() {
    let m = selMonth - 1, y = selYear
    if (m < 1) { m = 12; y-- }
    setSelMonth(m); setSelYear(y)
  }
  function nextMonth() {
    let m = selMonth + 1, y = selYear
    if (m > 12) { m = 1; y++ }
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1)) return
    setSelMonth(m); setSelYear(y)
  }
  const canGoNext = !(selYear === now.getFullYear() && selMonth === now.getMonth() + 1)

  function handleSave(data) {
    if (modal === 'new') onAdd({ ...data, id: 've-' + Date.now() })
    else                 onEdit({ ...modal.expense, ...data })
    setModal(null)
  }
  function handleDelete(e) {
    dialog.danger({ itemName: e.description, title: '¿Eliminar?' }).then(ok => ok && onDelete(e.id))
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, gap:8, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          <button className="btn btn-xs btn-ghost" onClick={prevMonth} style={{ padding:'4px 8px', fontSize:14 }}>‹</button>
          <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
            style={{ fontSize:12, padding:'4px 8px' }}>
            {MONTHS_ES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
            style={{ fontSize:12, padding:'4px 8px' }}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-xs btn-ghost" onClick={nextMonth} disabled={!canGoNext}
            style={{ padding:'4px 8px', fontSize:14, opacity: canGoNext ? 1 : 0.3 }}>›</button>
          {!isCurrentMonth && (
            <button className="btn btn-xs btn-ghost" style={{ marginLeft:4 }}
              onClick={() => { setSelYear(now.getFullYear()); setSelMonth(now.getMonth()+1) }}>
              Hoy
            </button>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <Icon name="plus" size={14}/> Registrar gasto
        </button>
      </div>

      {/* KPIs */}
      <section className="grid-three" style={{ marginBottom:16 }}>
        <div className="kpi">
          <div className="kpi-label">{MONTHS_SHORT[selMonth-1]} {selYear}</div>
          <div className="kpi-value">{fmtPEN(totalMonth, { decimals:0 })}</div>
          <div className="kpi-foot">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</div>
        </div>
        <div className={`kpi ${igvMonth > 0 ? 'kpi-accent' : ''}`}>
          <div className="kpi-label">Crédito fiscal IGV</div>
          <div className="kpi-value">{igvMonth > 0 ? fmtPEN(igvMonth, { decimals:2 }) : '—'}</div>
          <div className="kpi-foot">{igvMonth > 0 ? 'Deducible de impuestos' : 'Sin gastos con IGV'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Deducibles del mes</div>
          <div className="kpi-value">{dedMonth > 0 ? fmtPEN(dedMonth, { decimals:0 }) : '—'}</div>
          <div className="kpi-foot" style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[
              pmBreakdown.efectivo > 0 && `💵 ${fmtPEN(pmBreakdown.efectivo, { decimals:0 })}`,
              pmBreakdown.cuenta   > 0 && `🏦 ${fmtPEN(pmBreakdown.cuenta,   { decimals:0 })}`,
              pmBreakdown.tarjeta  > 0 && `💳 ${fmtPEN(pmBreakdown.tarjeta,  { decimals:0 })}`,
            ].filter(Boolean).join(' · ') || (totalAll > 0 ? 'Sin gastos este mes' : 'Acumulado: —')}
          </div>
        </div>
      </section>

      {/* Category bar */}
      {filtered.length > 0 && <CategoryBar expenses={filtered}/>}

      {/* Content */}
      {!hasAnyData ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Icon name="bills" size={22}/></div>
            <h3>Sin gastos variables registrados</h3>
            <p>Registra gastos puntuales: dominios, herramientas anuales, materiales, equipamiento.</p>
            <button className="btn btn-primary btn-xs" onClick={() => setModal('new')}>
              + Registrar primer gasto
            </button>
          </div>
        </div>
      ) : !hasMonthData ? (
        <div className="card">
          <div style={{ textAlign:'center', padding:'24px 0', color:'var(--ink-mute)', fontSize:13 }}>
            Sin gastos registrados en {MONTHS_ES[selMonth-1]} {selYear}
          </div>
        </div>
      ) : (
        <div>
          {dayKeys.map(dateStr => (
            <DayGroup
              key={dateStr}
              dateStr={dateStr}
              expenses={groupedByDay[dateStr] || []}
              isToday={dateStr === today}
              onEdit={e => setModal({ expense: e })}
              onDelete={handleDelete}
              onAddQuick={onAdd}
              onOpenModal={() => setModal('new')}
              accounts={accounts}
              creditLines={creditLines}
              showQuickAdd={isCurrentMonth}
            />
          ))}

          {hasSinFecha && (
            <DayGroup
              key="sin-fecha"
              dateStr="sin-fecha"
              expenses={groupedByDay['sin-fecha']}
              isToday={false}
              onEdit={e => setModal({ expense: e })}
              onDelete={handleDelete}
              onAddQuick={onAdd}
              onOpenModal={() => setModal('new')}
              accounts={accounts}
              creditLines={creditLines}
              showQuickAdd={false}
            />
          )}
        </div>
      )}

      {modal && (
        <ExpenseModal
          initial={modal === 'new' ? null : modal.expense}
          onSave={handleSave}
          onClose={() => setModal(null)}
          accounts={accounts}
          creditLines={creditLines}
        />
      )}
    </div>
  )
}
