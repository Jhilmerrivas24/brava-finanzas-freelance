import jsPDF from 'jspdf'
import Icon from '../components/Icon.jsx'
import Avatar from '../components/Avatar.jsx'
import Bar from '../components/Bar.jsx'
import Ring from '../components/Ring.jsx'
import StatusPill from '../components/StatusPill.jsx'
import CashflowChart from '../components/CashflowChart.jsx'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useDialog } from '../hooks/useDialog.js'
import { useToast } from '../hooks/useToast.js'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem, hoverLift, tapScale } from '../lib/animations.js'
import { fmtPEN } from '../data.js'

// ── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    const start = performance.now()
    cancelAnimationFrame(rafRef.current)
    function tick(now) {
      const elapsed  = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 3)
      setValue((target - 0) * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])
  return value
}

const TIPO_LABEL = {
  corriente: 'Cta. corriente', ahorros: 'Ahorros',
  digital: 'Billetera digital', negocio: 'Negocio', otro: 'Otro',
}
const TIPO_COLOR = {
  corriente: '#3b82f6', ahorros: '#10b981',
  digital: '#8b5cf6', negocio: '#f59e0b', otro: '#6b7280',
}

const MONTHS_ES    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']

// ── Account Modal ──────────────────────────────────────────────────────────────
function AccountModal({ initial, onSave, onClose }) {
  const defaults = {
    nombre: initial?.nombre ?? initial?.bank ?? '',
    tipo:   initial?.tipo   ?? 'corriente',
    saldo:  String(initial?.saldo ?? initial?.balance ?? ''),
    moneda: initial?.moneda ?? 'PEN',
  }
  const [form, setForm] = useState(defaults)
  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.nombre.trim() && String(form.saldo).trim() !== '' && Number(form.saldo) >= 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Agregar'} cuenta</div>
            <h2 className="modal-title">{form.nombre || 'Nueva cuenta'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <div className="field" style={{ flex:2 }}>
              <label>Nombre de la cuenta</label>
              <input type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)}
                placeholder="Ej. BCP Corriente, Yape personal…" autoFocus/>
            </div>
            <div className="field" style={{ flex:1 }}>
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="corriente">Cta. corriente</option>
                <option value="ahorros">Ahorros</option>
                <option value="digital">Billetera digital</option>
                <option value="negocio">Negocio</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Saldo actual</label>
              <div className="amount-input">
                <span className="amount-prefix mono">S/</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={form.saldo} onChange={e => set('saldo', e.target.value)} placeholder="0.00"/>
              </div>
            </div>
            <div className="field">
              <label>Moneda</label>
              <select value={form.moneda} onChange={e => set('moneda', e.target.value)}>
                <option value="PEN">Soles (PEN)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onSave({
              nombre: form.nombre, banco: form.nombre, tipo: form.tipo,
              saldo: Number(form.saldo) || 0, moneda: form.moneda, activa: true,
              bank: form.nombre, balance: Number(form.saldo) || 0,
              type: TIPO_LABEL[form.tipo] ?? form.tipo,
            })}>
            <Icon name="check" size={14}/> {initial ? 'Guardar' : 'Agregar cuenta'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, delta, deltaPositive, foot, accent, rawValue, prevValue }) {
  const counted = useCountUp(rawValue ?? 0)
  const pct = (prevValue != null && prevValue !== 0 && rawValue != null)
    ? ((rawValue - prevValue) / Math.abs(prevValue) * 100).toFixed(0)
    : null
  const showPct   = pct !== null && Math.abs(Number(pct)) >= 1
  const pctIsPos  = Number(pct) >= 0

  return (
    <motion.div
      className={`kpi ${accent ? 'kpi-accent' : ''}`}
      variants={staggerItem}
      whileHover={hoverLift}
      whileTap={tapScale}
      style={{ cursor: 'default' }}
    >
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{rawValue != null ? fmtPEN(counted) : value}</div>
      {showPct && (
        <div className={`kpi-delta ${pctIsPos ? 'is-pos' : 'is-neg'}`}>
          <Icon name={pctIsPos ? 'arrowUp' : 'arrowDown'} size={12}/>
          {Math.abs(Number(pct))}% vs mes ant.
        </div>
      )}
      {!showPct && delta && (
        <div className={`kpi-delta ${deltaPositive ? 'is-pos' : 'is-neg'}`}>
          <Icon name={deltaPositive ? 'arrowUp' : 'arrowDown'} size={12}/>
          {delta}
        </div>
      )}
      {foot && <div className="kpi-foot">{foot}</div>}
    </motion.div>
  )
}

function EmptyCard({ icon, title, desc, action, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon name={icon} size={22}/></div>
      <h3>{title}</h3>
      <p>{desc}</p>
      {action && <button className="btn btn-primary btn-xs" onClick={onAction}>{action}</button>}
    </div>
  )
}

// ── "Tu sueldo real" card ─────────────────────────────────────────────────────
function RealSalaryCard({ data, bills = [], settings = {}, invoices = [], variableExpenses = [], selYear, selMonth }) {
  const thisYear = selYear
  const thisMon  = selMonth - 1  // 0-indexed

  const ingresosBrutos = invoices
    .filter(i => {
      if (i.status !== 'paid' || !i.issuedDate) return false
      const d = new Date(i.issuedDate)
      return d.getFullYear() === thisYear && d.getMonth() === thisMon
    })
    .reduce((s, i) => s + (i.amount || 0), 0)

  // Solo factura + RH generan obligación fiscal — sin_declarar y boleta son 100% líquidos
  const ingresosFiscales = invoices
    .filter(i => {
      if (i.status !== 'paid' || !i.issuedDate) return false
      if (i.docType !== 'factura' && i.docType !== 'rh') return false
      const d = new Date(i.issuedDate)
      return d.getFullYear() === thisYear && d.getMonth() === thisMon
    })
    .reduce((s, i) => s + (i.amount || 0), 0)

  const taxRate      = (settings.taxRate || 30) / 100
  const impuestos    = ingresosFiscales * taxRate
  const billsTotal   = bills.filter(b => b.active !== false).reduce((s, b) => s + (b.amount || 0), 0)
  const varDeducible = variableExpenses
    .filter(e => {
      if (!e.deductible || !e.date) return false
      const d = new Date(e.date)
      return d.getFullYear() === thisYear && d.getMonth() === thisMon
    })
    .reduce((s, e) => s + (e.amount || 0), 0)
  const gastoNegocio = billsTotal + varDeducible
  const sueldoReal   = ingresosBrutos - impuestos - gastoNegocio

  const gastosPersonales = variableExpenses
    .filter(e => {
      if (e.deductible || !e.date) return false
      const d = new Date(e.date)
      return d.getFullYear() === thisYear && d.getMonth() === thisMon
    })
    .reduce((s, e) => s + (e.amount || 0), 0)

  let contextMsg = null
  if (gastosPersonales > 0 && sueldoReal < gastosPersonales) {
    contextMsg = { icon: '⚠️', text: 'Este mes gastaste más de lo que te quedó', color: 'var(--bad)' }
  } else if (gastosPersonales > 0 && sueldoReal > gastosPersonales * 1.3) {
    contextMsg = { icon: '✅', text: 'Buen mes, considera aportar al fondo de emergencia', color: 'var(--good)' }
  } else if (ingresosBrutos > 0) {
    const pct = ((sueldoReal / ingresosBrutos) * 100).toFixed(0)
    contextMsg = { icon: '📊', text: `Tu sueldo real representa el ${pct}% de tus ingresos brutos`, color: 'var(--ink-mute)' }
  }

  if (ingresosBrutos === 0 && billsTotal === 0) return null

  const cols = [
    { label:'Ing. brutos',      value:ingresosBrutos,              sub:'Ingresos cobrados', color:'var(--good)', prefix:'' },
    { label:'− Impuestos',      value:impuestos,                   sub: ingresosFiscales > 0 ? `${settings.taxRate||30}% sobre fiscal` : 'Sin obligación fiscal', color:'#ef4444', prefix:'−' },
    { label:'− Gastos negocio', value:gastoNegocio,                sub:'Fijos + deducibles', color:'#f97316', prefix:'−' },
    { label:'= Sueldo real',    value:Math.max(sueldoReal, 0),     sub:'Lo que queda para vivir',
      color: sueldoReal >= 0 ? '#16a34a' : 'var(--bad)', prefix: sueldoReal < 0 ? '−' : '', highlight:true },
  ]

  return (
    <div className="card" style={{ marginBottom:20 }}>
      <div className="card-head" style={{ marginBottom:14 }}>
        <div>
          <div className="card-eyebrow">{MONTHS_ES[thisMon]} {thisYear} · separación negocio / personal</div>
          <h3 className="card-title">Tu sueldo real</h3>
        </div>
      </div>
      <div className="real-salary-grid" style={{
        display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0,
        border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:12,
      }}>
        {cols.map((col, i) => (
          <div key={col.label} style={{
            padding:'14px 16px', borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
            background: col.highlight ? `color-mix(in srgb,${col.color} 8%,var(--bg-elev))` : 'var(--bg-elev)',
          }}>
            <div style={{ fontSize:11, color:'var(--ink-mute)', marginBottom:6, fontWeight:500 }}>{col.label}</div>
            <div className="mono" style={{ fontSize:17, fontWeight:col.highlight ? 800 : 600, color:col.color }}>
              {col.prefix}{fmtPEN(Math.abs(col.value), { decimals:0 })}
            </div>
            <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:4 }}>{col.sub}</div>
          </div>
        ))}
      </div>
      {contextMsg && (
        <div style={{ fontSize:13, color:contextMsg.color, display:'flex', alignItems:'center', gap:6 }}>
          <span>{contextMsg.icon}</span><span>{contextMsg.text}</span>
        </div>
      )}
    </div>
  )
}

// ── Alert system ─────────────────────────────────────────────────────────────
const ALERT_DISMISS_KEY = 'brava:dismissedAlerts'

function loadDismissed() {
  try {
    const raw   = JSON.parse(localStorage.getItem(ALERT_DISMISS_KEY) || '{}')
    const today = new Date().toISOString().split('T')[0]
    const fresh = {}
    Object.entries(raw).forEach(([k, v]) => { if (v.date === today) fresh[k] = v })
    return fresh
  } catch { return {} }
}

function daysUntilDay(dayNum) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const n = Math.min(Math.max(Number(dayNum) || 1, 1), 28) // clamp to safe range
  const target = new Date(today)
  target.setDate(n)
  if (target <= today) {
    target.setMonth(target.getMonth() + 1)
    target.setDate(n)
  }
  return Math.round((target - today) / 86400000)
}

const ALERT_CFG = {
  urgente:     { bg: 'color-mix(in srgb,var(--bad) 10%,var(--bg-elev))',   border: 'color-mix(in srgb,var(--bad) 25%,transparent)',  text: 'var(--bad)',      heading: '🔴 Urgente' },
  proximo:     { bg: 'color-mix(in srgb,var(--warn) 10%,var(--bg-elev))',  border: 'color-mix(in srgb,var(--warn) 25%,transparent)', text: 'var(--warn)',     heading: '🟡 Próximos (≤ 7 días)' },
  informativo: { bg: 'var(--bg-sunk)',                                       border: 'var(--border)',                                  text: 'var(--ink-mute)', heading: '🔵 En los próximos 14 días' },
}

function AlertRow({ alert, onGoto, onDismiss }) {
  const cfg = ALERT_CFG[alert.type]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '9px 12px', borderRadius: 8, marginBottom: 5,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      cursor: alert.goto ? 'pointer' : 'default',
      transition: 'opacity .15s',
    }} onClick={() => alert.goto && onGoto(alert.goto)}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-strong)' }}>{alert.title}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>{alert.sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {alert.daysLeft < 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.text, background: 'color-mix(in srgb,var(--bad) 15%,transparent)', padding: '2px 8px', borderRadius: 999 }}>
            Vencida
          </span>
        )}
        {alert.daysLeft === 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.text, background: 'color-mix(in srgb,var(--bad) 15%,transparent)', padding: '2px 8px', borderRadius: 999 }}>
            ¡Hoy!
          </span>
        )}
        {alert.daysLeft > 0 && (
          <span style={{ fontSize: 11, color: cfg.text, fontWeight: 600 }}>en {alert.daysLeft}d</span>
        )}
        {alert.goto && <Icon name="arrowRight" size={12} style={{ color: 'var(--ink-faint)' }}/>}
        <button
          className="btn btn-xs btn-ghost"
          style={{ padding: '2px 6px', fontSize: 10, color: 'var(--ink-faint)' }}
          title="Descartar hasta mañana"
          onClick={e => { e.stopPropagation(); onDismiss(alert.id) }}
        >✕</button>
      </div>
    </div>
  )
}

function AlertPanel({ alerts, onGoto, onDismiss }) {
  const [collapsed, setCollapsed] = useState(false)
  if (!alerts.length) return null

  const urgent = alerts.filter(a => a.type === 'urgente')
  const soon   = alerts.filter(a => a.type === 'proximo')
  const info   = alerts.filter(a => a.type === 'informativo')
  const borderColor = urgent.length > 0 ? 'var(--bad)' : soon.length > 0 ? 'var(--warn)' : 'var(--accent)'

  const summary = [
    urgent.length > 0 && `${urgent.length} urgente${urgent.length > 1 ? 's' : ''}`,
    soon.length   > 0 && `${soon.length} próximo${soon.length > 1 ? 's' : ''}`,
    info.length   > 0 && `${info.length} info`,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{
      borderRadius: 12, border: `1px solid var(--border)`,
      borderLeft: `4px solid ${borderColor}`,
      background: 'var(--bg-elev)', overflow: 'hidden', marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer' }}
        onClick={() => setCollapsed(c => !c)}>
        <span style={{ fontSize: 18 }}>{urgent.length > 0 ? '🚨' : '⚡'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-mute)' }}>
            Centro de alertas
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-strong)', marginTop: 2 }}>
            {summary}
          </div>
        </div>
        <span style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s', color: 'var(--ink-faint)', display: 'inline-flex' }}>
          <Icon name="chevron" size={14}/>
        </span>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 14px' }}>
              {urgent.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--bad)', marginBottom: 6 }}>
                    {ALERT_CFG.urgente.heading}
                  </div>
                  {urgent.map(a => <AlertRow key={a.id} alert={a} onGoto={onGoto} onDismiss={onDismiss}/>)}
                </div>
              )}
              {soon.length > 0 && (
                <div style={{ marginBottom: urgent.length > 0 ? 12 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--warn)', marginBottom: 6 }}>
                    {ALERT_CFG.proximo.heading}
                  </div>
                  {soon.map(a => <AlertRow key={a.id} alert={a} onGoto={onGoto} onDismiss={onDismiss}/>)}
                </div>
              )}
              {info.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-mute)', marginBottom: 6 }}>
                    {ALERT_CFG.informativo.heading}
                  </div>
                  {info.map(a => <AlertRow key={a.id} alert={a} onGoto={onGoto} onDismiss={onDismiss}/>)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Snapshot helpers ──────────────────────────────────────────────────────────
const SNAP_KEY = 'brava:monthlySnapshots'
function loadSnapshots() {
  try { return JSON.parse(localStorage.getItem(SNAP_KEY) || '{}') } catch { return {} }
}
function saveSnapshot(year, month, snap) {
  try {
    const snaps = loadSnapshots()
    const k = `${year}-${String(month).padStart(2,'0')}`
    if (!snaps[k]) {  // only save once per month
      snaps[k] = { year, month, savedAt: new Date().toISOString(), ...snap }
      localStorage.setItem(SNAP_KEY, JSON.stringify(snaps))
    }
  } catch {}
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Overview({
  data, invoices, bills, goals, accounts, clients, fixedIncome,
  creditLines, loans, variableExpenses = [], quotes = [],
  onMarkPaid, onNewInvoice, onGoto, settings,
  onAddAccount, onEditAccount, onDeleteAccount,
}) {
  const dialog  = useDialog()
  const toast   = useToast()
  const [accModal,   setAccModal]   = useState(null)
  const [dismissed,  setDismissed]  = useState(loadDismissed)

  const now = new Date()
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const isCurrentMonth = selYear === now.getFullYear() && selMonth === now.getMonth() + 1

  // ── Historical data computation ──────────────────────────────────────────
  function computeForMonth(year, month) {
    const mon0 = month - 1
    const isMon = (ds) => {
      if (!ds) return false
      const d = new Date(ds)
      return d.getFullYear() === year && d.getMonth() === mon0
    }
    const FREQ_DIV = { monthly:1, bimonthly:2, quarterly:3, annual:12 }

    const invoiceIncome   = (invoices || []).filter(i => i.status === 'paid' && isMon(i.issuedDate)).reduce((s, i) => s + i.amount, 0)
    const fixedMonthly    = (fixedIncome || []).reduce((s, inc) => s + (inc.amount || 0) / (FREQ_DIV[inc.frequency] || 1), 0)
    const inThisMonth     = invoiceIncome + fixedMonthly

    const outBills        = (bills || []).filter(b => b.active !== false).reduce((s, b) => s + b.amount, 0)
    const outVar          = (variableExpenses || []).filter(e => isMon(e.date)).reduce((s, e) => s + e.amount, 0)
    const outThisMonth    = outBills + outVar

    const igvThisMonth    = (invoices || []).filter(i => i.status === 'paid' && i.docType === 'factura' && isMon(i.issuedDate)).reduce((s, i) => s + (i.igv ?? i.amount * 0.18), 0)
    const retentionThisMonth = (invoices || []).filter(i => i.status === 'paid' && i.docType === 'rh' && i.hasRetention && isMon(i.issuedDate)).reduce((s, i) => s + (i.retention || 0), 0)

    const qm         = (quotes || []).filter(q => q.date && isMon(q.date))
    const hoursBilled = qm.filter(q => q.status === 'pending' || q.status === 'accepted')
      .reduce((s, q) => s + (q.items || []).reduce((si, it) => si + (/^hr/i.test(it.unit || '') ? (it.qty || 0) : 0), 0), 0)
    const hoursPaid   = qm.filter(q => q.status === 'accepted')
      .reduce((s, q) => s + (q.items || []).reduce((si, it) => si + (/^hr/i.test(it.unit || '') ? (it.qty || 0) : 0), 0), 0)

    return { inThisMonth, outThisMonth, igvThisMonth, retentionThisMonth, hoursBilled, hoursPaid, projectedIncome: 0 }
  }

  const activeData = useMemo(() => {
    if (isCurrentMonth) return data
    return { ...data, ...computeForMonth(selYear, selMonth) }
  // eslint-disable-next-line
  }, [selYear, selMonth, isCurrentMonth, data, invoices, bills, variableExpenses, fixedIncome, quotes])

  // Previous month for comparison deltas
  const prevData = useMemo(() => {
    let py = selYear, pm = selMonth - 1
    if (pm < 1) { pm = 12; py-- }
    return computeForMonth(py, pm)
  // eslint-disable-next-line
  }, [selYear, selMonth, data, invoices, bills, variableExpenses, fixedIncome, quotes])

  // ── Alerts ───────────────────────────────────────────────────────────────
  function dismissAlert(id) {
    const today = new Date().toISOString().split('T')[0]
    setDismissed(d => {
      const updated = { ...d, [id]: { date: today } }
      try { localStorage.setItem(ALERT_DISMISS_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  const alerts = useMemo(() => {
    const list = []

    // Overdue invoices
    ;(invoices || []).filter(i => i.status === 'overdue').forEach(inv => {
      list.push({
        id: `inv-${inv.id}`, type: 'urgente',
        title: `Factura vencida — ${inv.client}`,
        sub: `${inv.id} · ${fmtPEN(inv.amount)}`,
        daysLeft: -1, goto: 'invoices',
      })
    })

    // Bills due within 14 days (need dueDay field)
    ;(bills || []).filter(b => b.active !== false && b.dueDay).forEach(b => {
      const days = daysUntilDay(b.dueDay)
      if (days <= 14) {
        list.push({
          id: `bill-${b.id}`,
          type: days <= 3 ? 'urgente' : days <= 7 ? 'proximo' : 'informativo',
          title: b.name,
          sub: `Gasto fijo · ${fmtPEN(b.amount)} · vence día ${b.dueDay}`,
          daysLeft: days, goto: 'gastos',
        })
      }
    })

    // Credit lines with used balance due within 14 days
    ;(creditLines || []).filter(cl => cl.activa !== false && cl.fechaPago && (cl.usado ?? 0) > 0).forEach(cl => {
      const days = daysUntilDay(cl.fechaPago)
      if (days <= 14) {
        list.push({
          id: `cl-${cl.id}`,
          type: days <= 3 ? 'urgente' : days <= 7 ? 'proximo' : 'informativo',
          title: `Pago tarjeta — ${cl.nombre}`,
          sub: `Saldo usado: ${fmtPEN(cl.usado)} · pago día ${cl.fechaPago}`,
          daysLeft: days, goto: 'credit',
        })
      }
    })

    // Loans with pending balance due within 14 days
    ;(loans || []).filter(l => l.activo !== false && l.diaPago && (l.saldoPendiente ?? 0) > 0).forEach(l => {
      const days = daysUntilDay(l.diaPago)
      if (days <= 14) {
        list.push({
          id: `loan-${l.id}`,
          type: days <= 3 ? 'urgente' : days <= 7 ? 'proximo' : 'informativo',
          title: `Cuota — ${l.nombre}`,
          sub: `${fmtPEN(l.cuota ?? 0)}/mes · vence día ${l.diaPago}`,
          daysLeft: days, goto: 'loans',
        })
      }
    })

    return list
      .filter(a => !dismissed[a.id])
      .sort((a, b) => a.daysLeft - b.daysLeft)
  // eslint-disable-next-line
  }, [invoices, bills, creditLines, loans, dismissed])

  // ── Auto-snapshot: save current month once per month ─────────────────────
  useEffect(() => {
    if (!isCurrentMonth) return
    if (data.inThisMonth > 0 || data.outThisMonth > 0) {
      saveSnapshot(now.getFullYear(), now.getMonth() + 1, {
        inThisMonth:   data.inThisMonth,
        outThisMonth:  data.outThisMonth,
        neto:          data.inThisMonth - data.outThisMonth,
        cashAvailable: data.cashAvailable,
      })
    }
  // eslint-disable-next-line
  }, [data.inThisMonth, data.outThisMonth, data.cashAvailable, isCurrentMonth])

  // ── Derived values ────────────────────────────────────────────────────────
  function handleAccSave(d) {
    if (accModal === 'new') onAddAccount({ ...d, id: 'acc-' + Date.now(), createdAt: new Date().toISOString() })
    else onEditAccount({ ...accModal.account, ...d })
    setAccModal(null)
  }

  const net          = activeData.inThisMonth - activeData.outThisMonth
  const taxPct       = activeData.taxTarget > 0 ? activeData.taxSetAside / activeData.taxTarget : 0
  const hoursPct     = activeData.hoursBilled > 0 ? activeData.hoursPaid / activeData.hoursBilled : 0
  const overdue      = (invoices || []).filter(i => i.status === 'overdue')
  const pending      = (invoices || []).filter(i => i.status === 'pending')
  const avgBurn      = activeData.cashflow.length > 0
    ? activeData.cashflow.reduce((s, r) => s + r.exp, 0) / activeData.cashflow.length
    : activeData.outThisMonth  // fallback: use current month expenses if no cashflow data
  const runwayMonths = avgBurn > 0 ? activeData.cashAvailable / avgBurn : 0
  const firstName    = settings?.name ? settings.name.split(' ')[0] : 'aquí'
  const hasInvoices  = (invoices || []).length > 0
  const hasCashflow  = activeData.cashflow.length > 0

  const monthLabel   = `${MONTHS_ES[selMonth - 1]} ${selYear}`
  const canGoNext    = !(selYear === now.getFullYear() && selMonth === now.getMonth() + 1)

  function prevMonth() {
    let m = selMonth - 1, y = selYear
    if (m < 1) { m = 12; y-- }
    setSelMonth(m); setSelYear(y)
  }
  function nextMonth() {
    if (!canGoNext) return
    let m = selMonth + 1, y = selYear
    if (m > 12) { m = 1; y++ }
    setSelMonth(m); setSelYear(y)
  }

  // ── PDF Export ────────────────────────────────────────────────────────────
  function handleExport() {
    const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
    const W     = 210
    const L     = 20

    // Header
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, W, 40, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(29, 158, 117)
    doc.text('Brava', L, 18)
    doc.setFontSize(11)
    doc.setTextColor(148, 163, 184)
    doc.text('Resumen Financiero · ' + monthLabel, L, 26)
    if (settings?.name) {
      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)
      doc.text(settings.name, W - L, 26, { align: 'right' })
    }

    // KPI strip
    let y = 50
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const kpis = [
      { label: 'Ingresos del mes',     value: fmtPEN(activeData.inThisMonth),  color: [22, 163, 74] },
      { label: 'Egresos del mes',      value: fmtPEN(activeData.outThisMonth), color: [239, 68, 68] },
      { label: 'Neto',                 value: fmtPEN(net),                     color: net >= 0 ? [22, 163, 74] : [239, 68, 68] },
      { label: 'Efectivo disponible',  value: fmtPEN(activeData.cashAvailable), color: [29, 158, 117] },
    ]
    const colW = (W - L * 2) / 4
    kpis.forEach((k, i) => {
      const x = L + i * colW
      doc.setDrawColor(226, 232, 240)
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(x, y, colW - 3, 22, 2, 2, 'FD')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(k.label, x + 4, y + 7)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...k.color)
      doc.text(k.value, x + 4, y + 16)
      doc.setFont('helvetica', 'normal')
    })

    // Sueldo real section
    y += 30
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('Tu sueldo real', L, y)
    y += 8

    const taxRate_    = (settings?.taxRate || 30) / 100
    const mon0_       = selMonth - 1
    // Solo ingresos fiscales (factura + rh) generan reserva de impuestos
    const fiscalInPDF = (invoices || [])
      .filter(i => {
        if (i.status !== 'paid' || !i.issuedDate) return false
        if (i.docType !== 'factura' && i.docType !== 'rh') return false
        const d = new Date(i.issuedDate)
        return d.getFullYear() === selYear && d.getMonth() === mon0_
      })
      .reduce((s, i) => s + (i.amount || 0), 0)
    const impuestos   = fiscalInPDF * taxRate_
    const billsTotal  = (bills || []).filter(b => b.active !== false).reduce((s, b) => s + b.amount, 0)
    const varDed      = (variableExpenses || []).filter(e => {
      if (!e.deductible || !e.date) return false
      const d = new Date(e.date)
      return d.getFullYear() === selYear && d.getMonth() === mon0_
    }).reduce((s, e) => s + e.amount, 0)
    const gastoNeg    = billsTotal + varDed
    const sueldoReal  = activeData.inThisMonth - impuestos - gastoNeg

    const breakdown = [
      ['Ingresos brutos',   fmtPEN(activeData.inThisMonth)],
      ['− Impuestos',       '− ' + fmtPEN(impuestos)],
      ['− Gastos negocio',  '− ' + fmtPEN(gastoNeg)],
      ['= Sueldo real',     fmtPEN(Math.max(sueldoReal, 0))],
    ]
    breakdown.forEach(([lbl, val], i) => {
      const isLast = i === breakdown.length - 1
      doc.setFontSize(isLast ? 11 : 10)
      doc.setFont('helvetica', isLast ? 'bold' : 'normal')
      doc.setTextColor(isLast ? 30 : 100, isLast ? 41 : 116, isLast ? 59 : 139)
      doc.text(lbl, L, y)
      doc.setTextColor(isLast ? (sueldoReal >= 0 ? 22 : 239) : 30, isLast ? (sueldoReal >= 0 ? 163 : 68) : 41, isLast ? (sueldoReal >= 0 ? 74 : 68) : 59)
      doc.text(val, W - L, y, { align: 'right' })
      y += 7
    })

    // Facturas pendientes
    const pendingInvs = [...overdue, ...pending].slice(0, 8)
    if (pendingInvs.length > 0) {
      y += 6
      doc.setDrawColor(226, 232, 240)
      doc.line(L, y, W - L, y)
      y += 8
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(30, 41, 59)
      doc.text('Facturas pendientes', L, y)
      y += 8
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      pendingInvs.forEach(inv => {
        doc.setTextColor(51, 65, 85)
        doc.text(inv.client, L, y)
        doc.text(inv.id || '', L + 55, y)
        doc.setTextColor(239, 68, 68)
        doc.text(fmtPEN(inv.amount), W - L, y, { align: 'right' })
        y += 6
      })
    }

    // Footer
    const pageH = 297
    doc.setFillColor(248, 250, 252)
    doc.rect(0, pageH - 18, W, 18, 'F')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Generado por Brava · ${new Date().toLocaleDateString('es-PE')}`, L, pageH - 7)
    doc.text('brava.finanzas', W - L, pageH - 7, { align: 'right' })

    const fileName = `brava-${monthLabel.toLowerCase().replace(/ /g, '-')}.pdf`
    doc.save(fileName)
    toast.success('PDF exportado ✓', fileName)
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          {/* Month navigation */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
            <button className="btn btn-xs btn-ghost" onClick={prevMonth}
              style={{ padding:'2px 8px', fontSize:15, lineHeight:1 }}>‹</button>
            <span className="eyebrow" style={{ margin:0 }}>{monthLabel}</span>
            <button className="btn btn-xs btn-ghost" onClick={nextMonth} disabled={!canGoNext}
              style={{ padding:'2px 8px', fontSize:15, lineHeight:1, opacity: canGoNext ? 1 : 0.3 }}>›</button>
            {!isCurrentMonth && (
              <button className="btn btn-xs btn-ghost" style={{ fontSize:11 }}
                onClick={() => { setSelYear(now.getFullYear()); setSelMonth(now.getMonth()+1) }}>
                Ir a hoy
              </button>
            )}
          </div>
          <h1>
            {isCurrentMonth
              ? <>Hola, {firstName} — esto es <span className="ink-accent">lo que vale tu mes</span>.</>
              : <>{monthLabel} — <span className="ink-accent">resumen histórico</span>.</>}
          </h1>
          <p className="lede">
            {hasInvoices
              ? <>Tienes {(invoices||[]).length} factura(s) · {overdue.length > 0
                  ? <strong className="ink-bad">{overdue.length} vencida(s)</strong>
                  : 'todo al día'}.</>
              : 'Empieza creando tu primera factura para ver el resumen aquí.'}
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-ghost" onClick={handleExport}>
            <Icon name="download" size={14}/> Exportar PDF
          </button>
          <button className="btn btn-primary" onClick={onNewInvoice}>
            <Icon name="plus" size={14}/> Nueva factura
          </button>
        </div>
      </header>

      {/* Historical mode banner */}
      {!isCurrentMonth && (
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'color-mix(in srgb,var(--warn) 10%,var(--bg-elev))',
          border:'1px solid color-mix(in srgb,var(--warn) 30%,transparent)',
          borderRadius:10, padding:'10px 16px', marginBottom:20, fontSize:13,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span>📅</span>
            <span>
              Viendo <strong>{monthLabel}</strong> — datos históricos calculados de tus registros
            </span>
          </div>
          <button className="btn btn-ghost btn-xs"
            onClick={() => { setSelYear(now.getFullYear()); setSelMonth(now.getMonth()+1) }}>
            Volver al mes actual <Icon name="arrowRight" size={11}/>
          </button>
        </div>
      )}

      {/* KPIs */}
      <motion.section className="kpi-row" variants={staggerContainer} initial="hidden" animate="visible">
        <KpiCard
          label="Disponible para gastar"
          rawValue={activeData.cashAvailable}
          foot={runwayMonths > 0 ? `Runway: ~${runwayMonths.toFixed(1)} meses` : 'Configura tus cuentas'}
          accent
        />
        <KpiCard
          label="Ingresos del mes"
          rawValue={activeData.inThisMonth}
          prevValue={prevData.inThisMonth}
          foot={
            activeData.projectedIncome > 0
              ? `${(invoices||[]).filter(i => i.status === 'paid').length} cobradas · +${fmtPEN(activeData.projectedIncome, { decimals:0 })} proyectado`
              : `${(invoices||[]).filter(i => i.status === 'paid').length} facturas cobradas`
          }
        />
        <KpiCard
          label="Egresos del mes"
          rawValue={activeData.outThisMonth}
          prevValue={prevData.outThisMonth}
          foot={`${(bills || []).length} gasto${(bills||[]).length !== 1 ? 's' : ''} fijo${(bills||[]).length !== 1 ? 's' : ''} activo${(bills||[]).length !== 1 ? 's' : ''}`}
        />
        <KpiCard
          label="Neto"
          value={fmtPEN(net, { sign: activeData.inThisMonth > 0 || activeData.outThisMonth > 0 })}
          rawValue={net}
          prevValue={prevData.inThisMonth - prevData.outThisMonth}
          foot={activeData.inThisMonth > 0 ? `Margen ${((net / activeData.inThisMonth) * 100).toFixed(0)}%` : 'Sin movimientos aún'}
          deltaPositive={net >= 0}
        />
      </motion.section>

      {/* Projected income notice */}
      {activeData.projectedIncome > 0 && (
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'color-mix(in srgb,var(--accent) 10%,var(--bg-elev))',
          border:'1px solid color-mix(in srgb,var(--accent) 30%,transparent)',
          borderRadius:10, padding:'10px 16px', marginBottom:20, fontSize:13,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Icon name="invoice" size={15}/>
            <span>
              <strong>{fmtPEN(activeData.projectedIncome, { decimals:0 })}</strong> en cotizaciones aceptadas pendientes de facturar
            </span>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={() => onGoto('quotes')}>
            Ver cotizaciones <Icon name="arrowRight" size={11}/>
          </button>
        </div>
      )}

      {/* Alert panel — only shown in current month */}
      {isCurrentMonth && (
        <AlertPanel alerts={alerts} onGoto={onGoto} onDismiss={dismissAlert}/>
      )}

      {/* Tu sueldo real */}
      <RealSalaryCard
        data={activeData}
        bills={bills}
        settings={settings}
        invoices={invoices}
        variableExpenses={variableExpenses}
        selYear={selYear}
        selMonth={selMonth}
      />

      {/* Posición neta */}
      {(activeData.cashAvailable > 0 || activeData.totalCreditDebt > 0 || activeData.totalLoanDebt > 0) && (() => {
        const totalDebt   = (activeData.totalCreditDebt ?? 0) + (activeData.totalLoanDebt ?? 0)
        const netPos      = activeData.cashAvailable - totalDebt
        const hasLoans    = activeData.totalLoanDebt > 0
        const hasTarjetas = activeData.totalCreditDebt > 0
        const cols = [
          { icon:'💵', label:'Efectivo',      value: activeData.cashAvailable, color:'var(--good)', sub:`${(accounts||[]).filter(a => a.activa !== false).length} cuenta(s)`,       action:() => onGoto('accounts') },
          ...(hasTarjetas ? [{ icon:'💳', label:'Tarjetas', value:-activeData.totalCreditDebt, color:'var(--bad)',  sub:`${(creditLines||[]).filter(c=>c.activa!==false).length} tarjeta(s)`, action:() => onGoto('credit')   }] : []),
          ...(hasLoans    ? [{ icon:'🏦', label:'Préstamos', value:-activeData.totalLoanDebt,  color:'var(--warn)', sub:`${(loans||[]).filter(l=>l.activo!==false).length} préstamo(s)`,     action:() => onGoto('loans')    }] : []),
          { icon:'📊', label:'Posición neta', value: netPos, color: netPos >= 0 ? 'var(--good)' : 'var(--bad)', sub: netPos >= 0 ? 'Posición positiva ✓' : 'Pasivos > Activos', highlight:true, action:null },
        ]
        return (
          <div className="card" style={{ marginBottom:20 }}>
            <div className="card-head" style={{ marginBottom:14 }}>
              <div>
                <div className="card-eyebrow">Balance financiero</div>
                <h3 className="card-title">Posición neta</h3>
              </div>
            </div>
            <div className="net-position-grid" style={{
              display:'grid', gridTemplateColumns:`repeat(${cols.length},1fr)`, gap:0,
              border:'1px solid var(--border)', borderRadius:10, overflow:'hidden',
            }}>
              {cols.map((col, i) => (
                <div key={col.label} style={{
                  padding:'14px 16px', borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                  background: col.highlight ? `color-mix(in srgb,${col.color} 8%,var(--bg-elev))` : 'var(--bg-elev)',
                  cursor: col.action ? 'pointer' : 'default',
                }} onClick={col.action ?? undefined}>
                  <div style={{ fontSize:11, color:'var(--ink-mute)', marginBottom:6, fontWeight:500 }}>{col.icon} {col.label}</div>
                  <div className="mono" style={{ fontSize:17, fontWeight:col.highlight ? 800 : 700, color:col.color }}>
                    {col.value < 0 ? `− ${fmtPEN(Math.abs(col.value))}` : fmtPEN(col.value)}
                  </div>
                  <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:4 }}>{col.sub}</div>
                </div>
              ))}
            </div>
            {activeData.totalMonthlyCuota > 0 && (
              <div style={{ marginTop:10, fontSize:12, color:'var(--ink-mute)', display:'flex', alignItems:'center', gap:6 }}>
                <span>📅</span>
                <span>
                  Cuotas mensuales comprometidas: <strong className="mono">{fmtPEN(activeData.totalMonthlyCuota)}</strong>
                  <button className="btn-link" style={{ marginLeft:8 }} onClick={() => onGoto('loans')}>
                    Ver préstamos <Icon name="arrowRight" size={11}/>
                  </button>
                </span>
              </div>
            )}
          </div>
        )
      })()}

      <section className="grid-main">
        <div className="card card-chart">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Últimos meses</div>
              <h3 className="card-title">Flujo de caja</h3>
            </div>
            {hasCashflow && (
              <div className="legend">
                <span className="legend-item"><i className="dot dot-ink"/> Ingresos</span>
                <span className="legend-item"><i className="dot dot-accent"/> Egresos</span>
                <button className="btn-link" onClick={() => onGoto('cashflow')}>Ver detalle <Icon name="arrowRight" size={12}/></button>
              </div>
            )}
          </div>
          {hasCashflow
            ? <>
                <CashflowChart data={activeData.cashflow}/>
                <div className="chart-footnotes">
                  <div>
                    <span className="num">{fmtPEN(activeData.cashflow.reduce((s, r) => s + r.inc, 0))}</span>
                    <span className="lbl">Ingresos</span>
                  </div>
                  <div>
                    <span className="num">{fmtPEN(activeData.cashflow.reduce((s, r) => s + r.exp, 0))}</span>
                    <span className="lbl">Egresos</span>
                  </div>
                  <div>
                    <span className="num">{fmtPEN(avgBurn)}</span>
                    <span className="lbl">Burn promedio</span>
                  </div>
                </div>
              </>
            : <EmptyCard icon="cashflow" title="Sin historial aún" desc="Los datos aparecerán aquí conforme registres facturas cobradas y gastos."/>
          }
        </div>

        <div className="card card-tax">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Reserva impuestos{!isCurrentMonth ? ' · Datos actuales' : ''}</div>
              <h3 className="card-title">Impuestos al día{!isCurrentMonth ? <span style={{ fontSize:11, fontWeight:400, color:'var(--ink-mute)', marginLeft:6 }}>(año en curso)</span> : ''}</h3>
            </div>
          </div>
          <div className="tax-ring">
            <div className="tax-ring-svg">
              <Ring value={taxPct} size={140} stroke={12}/>
              <div className="tax-ring-center">
                <div className="tax-pct">{(taxPct * 100).toFixed(0)}%</div>
                <div className="tax-cap">renta cubierta</div>
              </div>
            </div>
          </div>
          <div className="tax-numbers">
            <div>
              <div className="lbl">Renta apartada</div>
              <div className="num">{fmtPEN(activeData.taxSetAside)}</div>
            </div>
            <div>
              <div className="lbl">Faltante renta</div>
              <div className="num ink-warn">{fmtPEN(Math.max(0, activeData.taxTarget - activeData.taxSetAside))}</div>
            </div>
          </div>

          {(activeData.igvThisMonth > 0 || activeData.retentionThisMonth > 0) && (
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink-mute)', marginBottom:2 }}>
                Obligaciones del mes
              </div>
              {activeData.igvThisMonth > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5 }}>
                  <span style={{ color:'var(--ink-mute)' }}>IGV facturas</span>
                  <span className="mono" style={{ color:'var(--bad)', fontWeight:600 }}>{fmtPEN(activeData.igvThisMonth)}</span>
                </div>
              )}
              {activeData.retentionThisMonth > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5 }}>
                  <span style={{ color:'var(--ink-mute)' }}>Retención RH</span>
                  <span className="mono" style={{ color:'var(--warn)', fontWeight:600 }}>{fmtPEN(activeData.retentionThisMonth)}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, borderTop:'1px solid var(--border)', paddingTop:6, marginTop:2 }}>
                <span style={{ fontWeight:600, color:'var(--ink-soft)' }}>Total a reservar</span>
                <span className="mono" style={{ fontWeight:700 }}>{fmtPEN(activeData.igvThisMonth + activeData.retentionThisMonth)}</span>
              </div>
            </div>
          )}

          {activeData.igvThisMonth === 0 && activeData.retentionThisMonth === 0 && activeData.inThisMonth > 0 && (
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:10, display:'flex', alignItems:'center', gap:8, fontSize:12.5, color:'var(--good)' }}>
              <span>✓</span>
              <span>Sin IGV ni retención este mes — ingresos 100% líquidos</span>
            </div>
          )}

          <button className="btn btn-soft btn-full" onClick={() => onGoto('taxes')}>
            Ver detalle de impuestos <Icon name="arrowRight" size={12}/>
          </button>
        </div>
      </section>

      <section className="grid-two">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Por cobrar</div>
              <h3 className="card-title">Facturas pendientes</h3>
            </div>
            <button className="btn-link" onClick={() => onGoto('invoices')}>Ver todas <Icon name="arrowRight" size={12}/></button>
          </div>
          {[...overdue, ...pending].length > 0
            ? <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Cliente</th><th>Concepto</th><th className="num-col">Monto</th>
                    <th>Vence</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...overdue, ...pending].slice(0, 5).map(inv => {
                    const c = (clients||[]).find(x => x.name === inv.client || x.id === inv.client)
                    return (
                      <tr key={inv.id}>
                        <td>
                          <div className="cell-client">
                            <Avatar name={inv.client} color={c?.color || inv.clientColor || '#a8a29e'} size={26}/>
                            <div>
                              <div className="ink-strong">{inv.client}</div>
                              <div className="ink-mute">{inv.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="ink-mute">{inv.project}</td>
                        <td className="num-col mono">{fmtPEN(inv.amount)}</td>
                        <td className="ink-mute">{inv.due}</td>
                        <td><StatusPill status={inv.status}/></td>
                        <td>
                          <button className="btn btn-xs" onClick={() => onMarkPaid(inv.id)}>
                            <Icon name="check" size={12}/> Marcar pagada
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            : <EmptyCard
                icon="invoice"
                title="Sin facturas pendientes"
                desc="Cuando crees una factura aparecerá aquí hasta que esté cobrada."
                action="+ Nueva factura"
                onAction={onNewInvoice}
              />
          }
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Liquidez real</div>
              <h3 className="card-title">Cuentas</h3>
            </div>
            <button className="btn-link" onClick={() => setAccModal('new')}>
              <Icon name="plus" size={12}/> Nueva
            </button>
          </div>
          {(accounts || []).length === 0
            ? <div style={{ textAlign:'center', padding:'20px 0', color:'var(--ink-mute)', fontSize:13 }}>
                <div style={{ marginBottom:8 }}>Sin cuentas registradas</div>
                <button className="btn btn-xs btn-ghost" onClick={() => setAccModal('new')}>+ Agregar cuenta</button>
              </div>
            : <>
                <ul className="account-list">
                  {(accounts || []).filter(a => a.activa !== false).map(a => {
                    const nombre = a.nombre ?? a.bank ?? '(sin nombre)'
                    const saldo  = a.saldo  ?? a.balance ?? 0
                    const tipo   = a.tipo   ?? 'corriente'
                    return (
                      <li key={a.id} style={{ cursor:'pointer' }} onClick={() => setAccModal({ account: a })}>
                        <div className="account-icon" style={{ color: TIPO_COLOR[tipo] ?? 'var(--ink-mute)' }}>
                          <Icon name="bank" size={16}/>
                        </div>
                        <div className="account-meta">
                          <div className="ink-strong">{nombre}</div>
                          <div className="ink-mute" style={{ fontSize:11 }}>
                            {TIPO_LABEL[tipo] ?? tipo}
                            {a.moneda && a.moneda !== 'PEN' ? ` · ${a.moneda}` : ''}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div className="account-amount mono">{fmtPEN(saldo)}</div>
                          <button className="btn btn-xs btn-quiet" style={{ color:'var(--bad)', padding:'2px 4px' }}
                            onClick={e => { e.stopPropagation(); dialog.danger({ itemName: nombre, title: '¿Eliminar?' }).then(ok => ok && onDeleteAccount(a.id)) }}>
                            <Icon name="close" size={10}/>
                          </button>
                        </div>
                      </li>
                    )
                  })}
                  <li className="account-total">
                    <div className="ink-mute">Total disponible</div>
                    <div className="mono ink-strong">
                      {fmtPEN((accounts || []).filter(a => a.activa !== false).reduce((s, a) => s + (a.saldo ?? a.balance ?? 0), 0))}
                    </div>
                  </li>
                </ul>
                <button className="btn btn-soft btn-full" onClick={() => onGoto('accounts')} style={{ marginTop:8 }}>
                  Gestionar cuentas <Icon name="arrowRight" size={12}/>
                </button>
              </>
          }
        </div>
      </section>

      <section className="grid-three">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Horas facturadas vs cobradas</div>
              <h3 className="card-title">Time-to-money</h3>
            </div>
          </div>
          {activeData.hoursBilled > 0
            ? <>
                <div className="hours-stack">
                  <div className="hours-row">
                    <div className="hours-label">Facturadas</div>
                    <div className="hours-bar"><div className="hours-fill" style={{ width:'100%', background:'var(--ink)' }}/></div>
                    <div className="hours-num mono">{activeData.hoursBilled}h</div>
                  </div>
                  <div className="hours-row">
                    <div className="hours-label">Cobradas</div>
                    <div className="hours-bar"><div className="hours-fill" style={{ width:`${hoursPct*100}%`, background:'var(--accent)' }}/></div>
                    <div className="hours-num mono">{activeData.hoursPaid}h</div>
                  </div>
                </div>
                <div className="hours-foot">
                  <div>
                    <div className="lbl">Tarifa hora</div>
                    <div className="num mono">{fmtPEN(settings?.hourlyRate || 0, { decimals:0 })}</div>
                  </div>
                  <div>
                    <div className="lbl">Por cobrar</div>
                    <div className="num mono">{fmtPEN((activeData.hoursBilled - activeData.hoursPaid) * (settings?.hourlyRate || 0), { decimals:0 })}</div>
                  </div>
                </div>
              </>
            : <EmptyCard icon="clock" title="Sin horas registradas" desc="Configura tu tarifa en Ajustes y registra horas desde las facturas."/>
          }
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">{(goals || []).length} metas activas</div>
              <h3 className="card-title">Metas de ahorro</h3>
            </div>
            <button className="btn-link" onClick={() => onGoto('goals')}>Gestionar <Icon name="arrowRight" size={12}/></button>
          </div>
          {(goals || []).length > 0
            ? <ul className="goals-list">
                {(goals || []).slice(0, 3).map(g => {
                  const p = Math.min(g.current / g.target, 1)
                  return (
                    <li key={g.id}>
                      <div className="goal-line">
                        <div className="ink-strong">{g.name}</div>
                        <div className="mono ink-mute">
                          {fmtPEN(g.current, { decimals:0 })} <span className="ink-faint">/ {fmtPEN(g.target, { decimals:0 })}</span>
                        </div>
                      </div>
                      <Bar value={p} color={g.color}/>
                      <div className="goal-foot">
                        <span className="ink-mute">{(p * 100).toFixed(0)}% completo</span>
                        {g.eta && <span className="ink-mute">ETA · {g.eta}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            : <EmptyCard icon="goals" title="Sin metas aún" desc="Crea metas de ahorro para ver tu progreso aquí." action="+ Nueva meta" onAction={() => onGoto('goals')}/>
          }
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Movimientos recientes</div>
              <h3 className="card-title">Actividad</h3>
            </div>
          </div>
          {hasInvoices
            ? <ul className="activity-list">
                {(invoices||[]).filter(i => i.status === 'paid').slice(0, 5).map((inv, i) => (
                  <li key={i}>
                    <div className="activity-icon is-in"><Icon name="arrowDown" size={12}/></div>
                    <div className="activity-meta">
                      <div className="ink-strong">Pago — {inv.client}</div>
                      <div className="ink-mute">{inv.id}</div>
                    </div>
                    <div className="activity-amount mono is-in">+ {fmtPEN(inv.amount, { decimals:0 })}</div>
                  </li>
                ))}
              </ul>
            : <EmptyCard icon="dashboard" title="Sin actividad" desc="Las facturas cobradas y los pagos aparecerán aquí."/>
          }
        </div>
      </section>

      {accModal && (
        <AccountModal
          initial={accModal === 'new' ? null : accModal.account}
          onSave={handleAccSave}
          onClose={() => setAccModal(null)}
        />
      )}
    </div>
  )
}
