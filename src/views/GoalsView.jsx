import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { progressTransition, staggerContainer, staggerItem } from '../lib/animations.js'
import Icon from '../components/Icon.jsx'
import { GOAL_COLORS, fmtPEN } from '../data.js'
import { loadData, saveData, KEYS } from '../lib/storage.js'

// ── Goal type definitions ──────────────────────────────────────────────────────
const GOAL_TYPES = [
  {
    id:    'manual',
    label: 'Manual',
    icon:  'edit',
    desc:  'Tú registras cada aporte de forma manual',
    unit:  'S/',
    auto:  false,
  },
  {
    id:    'income_ytd',
    label: 'Ingresos anuales',
    icon:  'invoice',
    desc:  'Suma automática de facturas cobradas este año',
    unit:  'S/',
    auto:  true,
  },
  {
    id:    'income_month',
    label: 'Ingresos del mes',
    icon:  'invoice',
    desc:  'Facturas cobradas en el mes actual',
    unit:  'S/',
    auto:  true,
  },
  {
    id:    'savings',
    label: 'Ahorro en cuentas',
    icon:  'accounts',
    desc:  'Saldo total de todas tus cuentas registradas',
    unit:  'S/',
    auto:  true,
  },
  {
    id:    'hours_ytd',
    label: 'Horas facturadas',
    icon:  'clock',
    desc:  'Horas en cotizaciones aceptadas este año',
    unit:  'hrs',
    auto:  true,
  },
]

const TYPE_MAP = Object.fromEntries(GOAL_TYPES.map(t => [t.id, t]))

// ── Compute automatic current value ────────────────────────────────────────────
function computeAuto(goal, invoices = [], accounts = [], quotes = []) {
  const now      = new Date()
  const thisYear = now.getFullYear()
  const thisMon  = now.getMonth()

  switch (goal.type) {
    case 'income_ytd':
      return invoices
        .filter(i => {
          if (i.status !== 'paid' || !i.issuedDate) return false
          return new Date(i.issuedDate).getFullYear() === thisYear
        })
        .reduce((s, i) => s + (i.amount || 0), 0)

    case 'income_month':
      return invoices
        .filter(i => {
          if (i.status !== 'paid' || !i.issuedDate) return false
          const d = new Date(i.issuedDate)
          return d.getFullYear() === thisYear && d.getMonth() === thisMon
        })
        .reduce((s, i) => s + (i.amount || 0), 0)

    case 'savings':
      return accounts.reduce((s, a) => s + (a.balance || 0), 0)

    case 'hours_ytd':
      return (quotes || [])
        .filter(q => {
          if (q.status !== 'accepted' && q.status !== 'invoiced') return false
          if (!q.date) return true
          return new Date(q.date).getFullYear() === thisYear
        })
        .reduce((s, q) => s + (q.items || []).reduce((si, it) =>
          si + (/^hr/i.test(it.unit || '') ? (it.qty || 0) : 0), 0), 0)

    default:
      return null // manual
  }
}

// ── Auto type badge ────────────────────────────────────────────────────────────
function AutoBadge({ typeId }) {
  const t = TYPE_MAP[typeId]
  if (!t?.auto) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: '.04em',
      textTransform: 'uppercase',
      background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
      color: 'var(--accent)',
      padding: '2px 6px', borderRadius: 4,
    }}>
      AUTO
    </span>
  )
}

// ── Emergency Fund ─────────────────────────────────────────────────────────────
const EF_STATUS = [
  { maxMonths: 1,   color: 'var(--bad)',    border: '#ef4444', label: 'Urgente',     icon: '🔴', msg: 'Urgente: construye tu colchón financiero' },
  { maxMonths: 3,   color: 'var(--warn)',   border: '#f59e0b', label: 'En progreso', icon: '🟡', msg: 'En progreso, sigue aportando' },
  { maxMonths: 6,   color: 'var(--good)',   border: '#22c55e', label: 'Bien cubierto',icon: '🟢', msg: 'Bien cubierto' },
  { maxMonths: 999, color: '#3b82f6',       border: '#3b82f6', label: 'Excelente',   icon: '💎', msg: 'Excelente solidez financiera' },
]

function getEFStatus(months) {
  return EF_STATUS.find(s => months < s.maxMonths) || EF_STATUS[EF_STATUS.length - 1]
}

function EmergencyFund({ bills = [] }) {
  const EF_KEY = KEYS.emergencyFund

  // Persistent state
  const [ef, setEf] = useState(() => loadData(EF_KEY, { monto: 0, meta: null, updatedAt: null }))

  // Inline edit states
  const [editingMonto, setEditingMonto] = useState(false)
  const [editingMeta,  setEditingMeta]  = useState(false)
  const [montoInput,   setMontoInput]   = useState('')
  const [metaInput,    setMetaInput]    = useState('')

  // Auto-calculated monthly expenses from active bills
  const billsMonthly = bills.filter(b => b.active !== false).reduce((s, b) => s + (b.amount || 0), 0)

  // Meta: user override or 4 × bills monthly
  const autoMeta     = billsMonthly * 4
  const effectiveMeta = (ef.meta != null && ef.meta > 0) ? ef.meta : autoMeta

  const months   = effectiveMeta > 0 ? ef.monto / billsMonthly : 0
  const pct      = effectiveMeta > 0 ? Math.min(ef.monto / effectiveMeta, 1) : 0
  const status   = getEFStatus(months)

  function saveMonto(val) {
    const updated = { ...ef, monto: Number(val) || 0, updatedAt: new Date().toISOString() }
    setEf(updated)
    saveData(EF_KEY, updated)
    setEditingMonto(false)
  }

  function saveMeta(val) {
    const updated = { ...ef, meta: Number(val) || 0, updatedAt: new Date().toISOString() }
    setEf(updated)
    saveData(EF_KEY, updated)
    setEditingMeta(false)
  }

  function resetMeta() {
    const updated = { ...ef, meta: null }
    setEf(updated)
    saveData(EF_KEY, updated)
    setEditingMeta(false)
  }

  return (
    <div
      className="card"
      style={{
        marginBottom: 24,
        border: `2px solid ${status.border}`,
        background: `color-mix(in srgb, ${status.border} 5%, var(--bg-elev))`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>{status.icon}</span>
            <span className="ink-strong" style={{ fontSize: 16, fontWeight: 700 }}>Fondo de emergencia</span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
              background: `color-mix(in srgb, ${status.border} 20%, transparent)`,
              color: status.color, padding: '2px 7px', borderRadius: 4,
            }}>
              {status.label}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>{status.msg}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: status.color }}>
            {billsMonthly > 0 ? `${months.toFixed(1)} meses` : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>cubiertos de gastos esenciales</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
          <span className="ink-mute">Progreso hacia la meta</span>
          <span className="mono" style={{ color: status.color, fontWeight: 700 }}>
            {(pct * 100).toFixed(0)}%
          </span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: 'var(--bg-sunk)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct * 100}%`,
            background: status.color, borderRadius: 5, transition: 'width 0.4s ease',
          }}/>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Current amount (editable) */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 4 }}>Monto actual del fondo</div>
          {editingMonto
            ? <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div className="amount-input" style={{ width: 140 }}>
                  <span className="amount-prefix mono" style={{ fontSize: 12 }}>S/</span>
                  <input
                    type="number" min="0" step="100"
                    className="amount-field mono"
                    value={montoInput}
                    onChange={e => setMontoInput(e.target.value)}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveMonto(montoInput); if (e.key === 'Escape') setEditingMonto(false) }}
                    style={{ fontSize: 14 }}
                  />
                </div>
                <button className="btn btn-xs btn-primary" onClick={() => saveMonto(montoInput)}>
                  <Icon name="check" size={12}/>
                </button>
                <button className="btn btn-xs btn-ghost" onClick={() => setEditingMonto(false)}>
                  <Icon name="close" size={12}/>
                </button>
              </div>
            : <button
                className="btn btn-ghost"
                onClick={() => { setMontoInput(String(ef.monto)); setEditingMonto(true) }}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, padding: '2px 6px' }}
              >
                {fmtPEN(ef.monto, { decimals: 0 })}
                <span style={{ fontSize: 11, marginLeft: 6, color: 'var(--ink-mute)' }}>editar</span>
              </button>
          }
        </div>

        {/* Target (editable) */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 4 }}>
            Meta recomendada (4 meses de gastos fijos)
          </div>
          {editingMeta
            ? <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="amount-input" style={{ width: 140 }}>
                  <span className="amount-prefix mono" style={{ fontSize: 12 }}>S/</span>
                  <input
                    type="number" min="0" step="100"
                    className="amount-field mono"
                    value={metaInput}
                    onChange={e => setMetaInput(e.target.value)}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveMeta(metaInput); if (e.key === 'Escape') setEditingMeta(false) }}
                    style={{ fontSize: 14 }}
                  />
                </div>
                <button className="btn btn-xs btn-primary" onClick={() => saveMeta(metaInput)}>
                  <Icon name="check" size={12}/>
                </button>
                <button className="btn btn-xs btn-ghost" onClick={resetMeta} title="Volver a automático">
                  Auto
                </button>
                <button className="btn btn-xs btn-ghost" onClick={() => setEditingMeta(false)}>
                  <Icon name="close" size={12}/>
                </button>
              </div>
            : <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono" style={{ fontSize: 16, fontWeight: 600 }}>
                  {fmtPEN(effectiveMeta, { decimals: 0 })}
                </span>
                {ef.meta == null && (
                  <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
                    (auto: {fmtPEN(billsMonthly, { decimals: 0 })} × 4)
                  </span>
                )}
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => { setMetaInput(String(effectiveMeta)); setEditingMeta(true) }}
                  style={{ fontSize: 11 }}
                >
                  Editar meta
                </button>
              </div>
          }
        </div>

        {/* Bills reference */}
        {billsMonthly > 0 && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 2 }}>Gastos fijos activos / mes</div>
            <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
              {fmtPEN(billsMonthly, { decimals: 0 })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              {bills.filter(b => b.active !== false).length} servicios activos
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Goal Modal ─────────────────────────────────────────────────────────────────
function GoalModal({ initial, onSave, onClose }) {
  const isEdit = !!initial
  const [form, setForm] = useState(initial ?? {
    name: '', type: 'manual', current: '0', target: '', eta: '', color: GOAL_COLORS[0],
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedType = TYPE_MAP[form.type] || TYPE_MAP.manual
  const isAuto       = selectedType.auto
  const isHours      = form.type === 'hours_ytd'
  const valid        = form.name.trim() && Number(form.target) > 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{isEdit ? 'Editar' : 'Nueva'} meta</div>
            <h2 className="modal-title">{form.name || 'Nueva meta'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          {/* Name */}
          <div className="field">
            <label>Nombre de la meta</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ej. Fondo de emergencia, 200 horas, Ingreso anual…"/>
          </div>

          {/* Type selector */}
          <div className="field">
            <label>Tipo de seguimiento</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {GOAL_TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set('type', t.id)}
                  style={{
                    textAlign: 'left', padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                    border: `1.5px solid ${form.type === t.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: form.type === t.id
                      ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-elev))'
                      : 'var(--bg-elev)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: form.type === t.id ? 'var(--accent)' : 'var(--ink)' }}>
                    {t.label}
                    {t.auto && (
                      <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, letterSpacing: '.05em',
                        background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
                        color: 'var(--accent)', padding: '1px 4px', borderRadius: 3 }}>
                        AUTO
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Target + Current (only shown for manual) */}
          <div className="field-row">
            <div className="field">
              <label>{isHours ? 'Horas objetivo' : 'Monto objetivo'}</label>
              <input type="number" min="0" step={isHours ? 1 : 100} value={form.target}
                onChange={e => set('target', e.target.value)}
                placeholder={isHours ? 'Ej. 200' : '0'}/>
            </div>
            {!isAuto && (
              <div className="field">
                <label>{isHours ? 'Horas acumuladas' : 'Ahorrado hasta ahora'}</label>
                <input type="number" min="0" step={isHours ? 1 : 100} value={form.current}
                  onChange={e => set('current', e.target.value)} placeholder="0"/>
              </div>
            )}
          </div>

          {isAuto && (
            <div style={{
              fontSize: 12, color: 'var(--ink-mute)', background: 'var(--bg-sunk)',
              borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <Icon name="info" size={13}/>
              El progreso se calcula automáticamente desde tus datos reales. No necesitas ingresar un valor inicial.
            </div>
          )}

          {/* ETA */}
          <div className="field">
            <label>Fecha objetivo (opcional)</label>
            <input type="text" value={form.eta} onChange={e => set('eta', e.target.value)}
              placeholder="Ej. Dic 2026"/>
          </div>

          {/* Color */}
          <div className="field">
            <label>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {GOAL_COLORS.map(c => (
                <button key={c} type="button" onClick={() => set('color', c)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
                  outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                  outlineOffset: 2, cursor: 'pointer',
                }}/>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave({
            ...form,
            type:    form.type || 'manual',
            current: isAuto ? 0 : (Number(form.current) || 0),
            target:  Number(form.target),
          })}>
            <Icon name="check" size={14}/> {isEdit ? 'Guardar cambios' : 'Crear meta'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Aportar Modal (only for manual goals) ─────────────────────────────────────
function AportarModal({ goal, onSave, onClose }) {
  const [amount, setAmount] = useState('')
  const num      = Number(amount) || 0
  const newTotal = goal.current + num
  const overshot = newTotal > goal.target

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">Aportar a meta</div>
            <h2 className="modal-title">{goal.name}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--bg-sunk)', borderRadius: 10, padding: '12px 14px', fontSize: 13, marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="ink-mute">Ahorrado</span>
              <span className="mono ink-strong">{fmtPEN(goal.current, { decimals: 0 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="ink-mute">Objetivo</span>
              <span className="mono ink-mute">{fmtPEN(goal.target, { decimals: 0 })}</span>
            </div>
          </div>
          <div className="field">
            <label>Monto a aportar</label>
            <div className="amount-input">
              <span className="amount-prefix mono">S/</span>
              <input type="text" inputMode="decimal" className="amount-field mono" autoFocus
                value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/>
            </div>
            {num > 0 && (
              <span className="field-hint" style={{ color: overshot ? 'var(--warn)' : 'var(--good)' }}>
                Nuevo total: {fmtPEN(Math.min(newTotal, goal.target), { decimals: 0 })}
                {overshot ? ' — se ajustará al 100%' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={num <= 0}
            onClick={() => onSave(Math.min(newTotal, goal.target))}>
            <Icon name="check" size={14}/> Confirmar aporte
          </button>
        </div>
      </div>
    </div>
  )
}

// ── GoalCard ───────────────────────────────────────────────────────────────────
function GoalCard({ goal, effectiveCurrent, onEdit, onDelete, onAportar }) {
  const typeInfo = TYPE_MAP[goal.type || 'manual']
  const isAuto   = typeInfo?.auto
  const isHours  = goal.type === 'hours_ytd'

  const current  = effectiveCurrent ?? goal.current ?? 0
  const p        = goal.target > 0 ? Math.min(current / goal.target, 1) : 0
  const missing  = goal.target - current

  const fmtCurrent = isHours
    ? `${current.toFixed(0)} hrs`
    : fmtPEN(current, { decimals: 0 })
  const fmtTarget  = isHours
    ? `${goal.target} hrs`
    : fmtPEN(goal.target, { decimals: 0 })
  const fmtMissing = missing > 0
    ? (isHours ? `${missing.toFixed(0)} hrs` : fmtPEN(missing, { decimals: 0 }))
    : '¡Logrado!'

  return (
    <div className="goal-card">
      <div className="goal-card-head">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div className="ink-strong" style={{ fontSize: 17 }}>{goal.name}</div>
            <AutoBadge typeId={goal.type}/>
          </div>
          {goal.eta && <div className="ink-mute" style={{ fontSize: 12 }}>Objetivo · {goal.eta}</div>}
          {isAuto && (
            <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>{typeInfo.desc}</div>
          )}
        </div>
        <div className="goal-pct mono" style={{ color: goal.color }}>{(p * 100).toFixed(0)}%</div>
      </div>
      <div className="goal-progress">
        <div className="goal-progress-track">
          <motion.div
          className="goal-progress-fill"
          style={{ background: goal.color }}
          initial={{ width: 0 }}
          animate={{ width: `${p * 100}%` }}
          transition={progressTransition}
        />
        </div>
      </div>
      <div className="goal-card-stats">
        <div>
          <div className="lbl">{isHours ? 'Horas' : (isAuto ? 'Actual' : 'Ahorrado')}</div>
          <div className="num mono ink-strong">{fmtCurrent}</div>
        </div>
        <div>
          <div className="lbl">Meta</div>
          <div className="num mono">{fmtTarget}</div>
        </div>
        <div>
          <div className="lbl">Falta</div>
          <div className="num mono ink-mute">{fmtMissing}</div>
        </div>
      </div>
      <div className="goal-card-actions">
        {!isAuto && (
          <button className="btn btn-soft btn-xs" onClick={() => onAportar(goal)}>
            <Icon name="plus" size={12}/> Aportar
          </button>
        )}
        {isAuto && (
          <span style={{
            fontSize: 11, color: 'var(--ink-mute)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Icon name="info" size={11}/> Calculado automáticamente
          </span>
        )}
        <button className="btn btn-xs btn-ghost" onClick={() => onEdit(goal)}>
          <Icon name="settings" size={12}/> Editar
        </button>
        <button className="btn btn-xs btn-quiet" style={{ color: 'var(--bad)', marginLeft: 'auto' }}
          onClick={() => { if (window.confirm(`¿Eliminar "${goal.name}"?`)) onDelete(goal.id) }}>
          <Icon name="close" size={12}/>
        </button>
      </div>
    </div>
  )
}

// ── Main view ──────────────────────────────────────────────────────────────────
export default function GoalsView({
  goals = [],
  onAddGoal, onEditGoal, onDeleteGoal, onAportar,
  invoices = [], accounts = [], quotes = [],
  bills = [],
}) {
  const [modal,   setModal]   = useState(null)  // null | 'new' | { goal }
  const [aportar, setAportar] = useState(null)  // null | goal

  // Compute auto current for each goal
  const autoCurrents = useMemo(() => {
    const out = {}
    goals.forEach(g => {
      const val = computeAuto(g, invoices, accounts, quotes)
      if (val !== null) out[g.id] = val
    })
    return out
  }, [goals, invoices, accounts, quotes])

  function handleSave(data) {
    if (modal === 'new') onAddGoal({ ...data, id: 'g-' + Date.now() })
    else onEditGoal({ ...modal.goal, ...data })
    setModal(null)
  }

  // Summary KPIs
  const totalManualProgress = goals
    .filter(g => !TYPE_MAP[g.type]?.auto)
    .reduce((s, g) => s + (g.current || 0), 0)
  const totalManualTarget = goals
    .filter(g => !TYPE_MAP[g.type]?.auto)
    .reduce((s, g) => s + (g.target || 0), 0)
  const completedCount = goals.filter(g => {
    const cur = autoCurrents[g.id] ?? g.current ?? 0
    return cur >= g.target
  }).length

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">{goals.length} metas activas · {completedCount} completadas</div>
          <h1>Metas de ahorro</h1>
          <p className="lede">Cubos separados de tu cuenta corriente. Las metas automáticas se actualizan solas con tus datos reales.</p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14}/> Nueva meta
          </button>
        </div>
      </header>

      {/* ── Emergency Fund — always visible, fixed section ── */}
      <EmergencyFund bills={bills} />

      {/* KPI row if manual goals exist */}
      {totalManualTarget > 0 && (
        <div className="kpi-row" style={{ marginBottom: 16 }}>
          <div className="kpi-card">
            <div className="kpi-label">Total ahorrado (manual)</div>
            <div className="kpi-value mono">{fmtPEN(totalManualProgress, { decimals: 0 })}</div>
            <div className="kpi-foot ink-mute">de {fmtPEN(totalManualTarget, { decimals: 0 })} objetivo</div>
          </div>
        </div>
      )}

      {goals.length === 0
        ? <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="goals" size={22}/></div>
              <h3>Sin metas de ahorro</h3>
              <p>Define hacia dónde va tu dinero: emergencias, equipo, vacaciones o metas de ingresos y horas.</p>
              <button className="btn btn-primary btn-xs" onClick={() => setModal('new')}>+ Crear primera meta</button>
            </div>
          </div>
        : <section className="goals-grid">
            {goals.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                effectiveCurrent={autoCurrents[g.id]}
                onEdit={g => setModal({ goal: g })}
                onDelete={onDeleteGoal}
                onAportar={setAportar}
              />
            ))}
          </section>
      }

      {modal && (
        <GoalModal
          initial={modal === 'new' ? null : modal.goal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {aportar && (
        <AportarModal
          goal={aportar}
          onSave={(newCurrent) => { onAportar(aportar.id, newCurrent); setAportar(null) }}
          onClose={() => setAportar(null)}
        />
      )}
    </div>
  )
}
