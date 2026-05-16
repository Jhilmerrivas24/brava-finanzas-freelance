import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { progressTransition } from '../lib/animations.js'
import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'
import { loadData, saveData, KEYS } from '../lib/storage.js'
import { useDialog } from '../hooks/useDialog.js'

// ── Constants ──────────────────────────────────────────────────────────────────
const BUDGET_KEY = KEYS.budget  // 'brava:budget'

const BUDGET_CATS = [
  { id: 'Transporte',      color: '#1d4ed8' },
  { id: 'Alimentación',    color: '#15803d' },
  { id: 'Papelería',       color: '#a16207' },
  { id: 'Entretenimiento', color: '#be185d' },
  { id: 'Marketing',       color: '#c2410c' },
  { id: 'Herramientas',    color: '#7c3aed' },
  { id: 'Suscripción',     color: '#0e7490' },
  { id: 'Otro',            color: '#6b7280' },
]

// Map variableExpenses categories → budget categories
const VAR_TO_BUDGET = {
  'Software':     'Suscripción',
  'Servicios':    'Otro',
  'Transporte':   'Transporte',
  'Alimentación': 'Alimentación',
  'Marketing':    'Marketing',
  'Educación':    'Otro',
  'Material':     'Papelería',
  'Equipamiento': 'Herramientas',
  'Salud':        'Otro',
  'Otro':         'Otro',
}

// Map bills categories → budget categories
const BILL_TO_BUDGET = {
  'Software':   'Suscripción',
  'Espacio':    'Otro',
  'Servicios':  'Otro',
  'Salud':      'Otro',
  'Transporte': 'Transporte',
  'Marketing':  'Marketing',
  'Educación':  'Otro',
  'Otro':       'Otro',
}

const MONTHS_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function toMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}
function prevMonthKey(year, month) {
  if (month === 1) return toMonthKey(year - 1, 12)
  return toMonthKey(year, month - 1)
}

// ── Progress bar helper ────────────────────────────────────────────────────────
function ProgressBar({ pct, color, height = 6 }) {
  return (
    <div style={{ height, borderRadius: height / 2, background: 'var(--bg-sunk)', overflow: 'hidden' }}>
      <motion.div
        style={{ height: '100%', background: color, borderRadius: height / 2 }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct * 100, 100)}%` }}
        transition={progressTransition}
      />
    </div>
  )
}

function statusColor(pct) {
  if (pct >= 1)   return 'var(--bad)'
  if (pct >= 0.8) return 'var(--warn)'
  return 'var(--good)'
}

// ── Main view ──────────────────────────────────────────────────────────────────
export default function BudgetView({ bills = [] }) {
  const dialog = useDialog()
  const now = new Date()
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)

  // Budgets stored as { 'YYYY-MM': { catId: amount, ... }, ... }
  const [allBudgets, setAllBudgets] = useState(() => loadData(BUDGET_KEY, {}))

  // Per-cell editing mode
  const [editing, setEditing] = useState({})

  const monthKey   = toMonthKey(selYear, selMonth)
  const currentCats = allBudgets[monthKey] || {}

  // Load variable expenses from localStorage (self-contained, no prop)
  const variableExpenses = useMemo(() => loadData(KEYS.variableExpenses, []), [])

  // Actual spending per budget category for the selected month
  const actualSpending = useMemo(() => {
    const result = {}
    BUDGET_CATS.forEach(c => { result[c.id] = 0 })

    // Variable expenses in selected month
    variableExpenses.forEach(e => {
      if (!e.date) return
      const d = new Date(e.date)
      if (d.getFullYear() === selYear && (d.getMonth() + 1) === selMonth) {
        const cat = VAR_TO_BUDGET[e.category] || 'Otro'
        result[cat] = (result[cat] || 0) + (e.amount || 0)
      }
    })

    // Active bills (monthly recurring)
    bills.filter(b => b.active !== false).forEach(b => {
      const cat = BILL_TO_BUDGET[b.category] || 'Otro'
      result[cat] = (result[cat] || 0) + (b.amount || 0)
    })

    return result
  }, [variableExpenses, bills, selYear, selMonth])

  // Save a budget amount for a category
  function setBudgetAmount(catId, rawValue) {
    const updated = {
      ...allBudgets,
      [monthKey]: { ...(allBudgets[monthKey] || {}), [catId]: Number(rawValue) || 0 },
    }
    setAllBudgets(updated)
    saveData(BUDGET_KEY, updated)
  }

  function copyFromPrevMonth() {
    const prevKey = prevMonthKey(selYear, selMonth)
    const prev = allBudgets[prevKey]
    if (!prev || Object.keys(prev).length === 0) {
      dialog.alert({ type: 'info', title: 'Sin datos', message: 'No hay presupuesto guardado para el mes anterior.' })
      return
    }
    const updated = { ...allBudgets, [monthKey]: { ...prev } }
    setAllBudgets(updated)
    saveData(BUDGET_KEY, updated)
  }

  // Summary totals
  const totalBudget = BUDGET_CATS.reduce((s, c) => s + (currentCats[c.id] || 0), 0)
  const totalSpent  = BUDGET_CATS.reduce((s, c) => s + (actualSpending[c.id] || 0), 0)
  const totalAvail  = totalBudget - totalSpent
  const totalPct    = totalBudget > 0 ? totalSpent / totalBudget : (totalSpent > 0 ? 1 : 0)
  const totalColor  = statusColor(totalPct)

  const hasBudget = totalBudget > 0

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Planificación · {MONTHS_ES[selMonth - 1]} {selYear}</div>
          <h1>Presupuesto mensual</h1>
          <p className="lede">Define cuánto quieres gastar por categoría y monitorea en tiempo real contra tus gastos reales.</p>
        </div>
        <div className="view-header-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
          <select
            value={selMonth}
            onChange={e => setSelMonth(Number(e.target.value))}
            style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6 }}
          >
            {MONTHS_ES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={selYear}
            onChange={e => setSelYear(Number(e.target.value))}
            style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6 }}
          >
            {[now.getFullYear(), now.getFullYear() - 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={copyFromPrevMonth}>
            Copiar mes anterior
          </button>
        </div>
      </header>

      {/* ── Summary card ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 2 }}>Presupuesto total</div>
            <div className="mono ink-strong" style={{ fontSize: 22 }}>
              {hasBudget ? fmtPEN(totalBudget, { decimals: 0 }) : <span className="ink-faint">Sin definir</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
              {BUDGET_CATS.filter(c => (currentCats[c.id] || 0) > 0).length} categorías presupuestadas
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 2 }}>Gastado este mes</div>
            <div className="mono" style={{ fontSize: 22, color: hasBudget ? totalColor : 'var(--ink)' }}>
              {fmtPEN(totalSpent, { decimals: 0 })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
              Gastos fijos + variables del mes
            </div>
          </div>

          {hasBudget && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 2 }}>Disponible</div>
              <div className="mono" style={{
                fontSize: 22,
                color: totalAvail >= 0 ? 'var(--good)' : 'var(--bad)',
                fontWeight: 700,
              }}>
                {totalAvail >= 0
                  ? fmtPEN(totalAvail, { decimals: 0 })
                  : '−' + fmtPEN(-totalAvail, { decimals: 0 })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                {totalAvail < 0 ? '⚠️ Excediste el presupuesto' : 'Te queda para el mes'}
              </div>
            </div>
          )}

          {hasBudget && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                <span className="ink-mute">Progreso general</span>
                <span className="mono" style={{ color: totalColor, fontWeight: 700 }}>
                  {(Math.min(totalPct, 1) * 100).toFixed(0)}%
                </span>
              </div>
              <ProgressBar pct={totalPct} color={totalColor} height={10} />
              <div style={{ fontSize: 11, color: totalColor, marginTop: 4 }}>
                {totalPct >= 1
                  ? `¡Superado en ${fmtPEN(totalSpent - totalBudget, { decimals: 0 })}!`
                  : totalPct >= 0.8
                  ? 'Cerca del límite — revisa tus gastos'
                  : 'Vas bien ✓'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Category table ── */}
      <div className="card card-flat">
        <table className="invoice-table invoice-table-full">
          <thead>
            <tr>
              <th>Categoría</th>
              <th style={{ width: 160 }}>Presupuesto S/</th>
              <th>Progreso</th>
              <th className="num-col">Gastado</th>
              <th className="num-col">Te queda</th>
            </tr>
          </thead>
          <tbody>
            {BUDGET_CATS.map(cat => {
              const budget = currentCats[cat.id] || 0
              const spent  = actualSpending[cat.id] || 0
              const avail  = budget - spent
              const pct    = budget > 0
                ? spent / budget
                : spent > 0 ? 1 : 0
              const sc     = statusColor(pct)
              const isEdit = editing[cat.id]

              return (
                <tr key={cat.id}>
                  {/* Category name + color dot */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: cat.color, flexShrink: 0,
                      }}/>
                      <span className="ink-strong">{cat.id}</span>
                    </div>
                  </td>

                  {/* Budget input (inline editable) */}
                  <td>
                    {isEdit
                      ? <div className="amount-input" style={{ width: 130 }}>
                          <span className="amount-prefix mono" style={{ fontSize: 12 }}>S/</span>
                          <input
                            type="number" min="0" step="50"
                            className="amount-field mono"
                            defaultValue={budget || ''}
                            autoFocus
                            onBlur={e => {
                              setBudgetAmount(cat.id, e.target.value)
                              setEditing(ed => ({ ...ed, [cat.id]: false }))
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') e.target.blur()
                              if (e.key === 'Escape') setEditing(ed => ({ ...ed, [cat.id]: false }))
                            }}
                            style={{ fontSize: 13 }}
                          />
                        </div>
                      : <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => setEditing(ed => ({ ...ed, [cat.id]: true }))}
                          style={{
                            fontFamily: 'var(--font-mono)', fontSize: 13,
                            minWidth: 90, textAlign: 'left',
                            color: budget > 0 ? 'var(--ink)' : 'var(--accent)',
                          }}
                        >
                          {budget > 0
                            ? `S/ ${budget.toLocaleString('es-PE')}`
                            : '+ Definir límite'}
                        </button>
                    }
                  </td>

                  {/* Progress bar */}
                  <td style={{ minWidth: 150 }}>
                    {(budget > 0 || spent > 0)
                      ? <div>
                          <ProgressBar pct={pct} color={sc} />
                          <div style={{ fontSize: 11, color: sc, marginTop: 3 }}>
                            {pct >= 1
                              ? `Superado en ${fmtPEN(spent - budget, { decimals: 0 })}`
                              : pct >= 0.8
                              ? `${(pct * 100).toFixed(0)}% — casi en el límite`
                              : budget > 0
                              ? `${(pct * 100).toFixed(0)}% usado`
                              : 'Sin presupuesto definido'}
                          </div>
                        </div>
                      : <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                          Sin presupuesto · sin gasto
                        </span>
                    }
                  </td>

                  {/* Spent */}
                  <td className="num-col mono">
                    {spent > 0
                      ? <span style={{ color: sc, fontWeight: pct >= 0.8 ? 600 : 400 }}>
                          {fmtPEN(spent, { decimals: 0 })}
                        </span>
                      : <span className="ink-faint">—</span>
                    }
                  </td>

                  {/* Available */}
                  <td className="num-col mono">
                    {budget > 0
                      ? <span style={{ color: avail >= 0 ? 'var(--good)' : 'var(--bad)', fontWeight: 600 }}>
                          {avail >= 0
                            ? fmtPEN(avail, { decimals: 0 })
                            : '−' + fmtPEN(-avail, { decimals: 0 })}
                        </span>
                      : <span className="ink-faint">—</span>
                    }
                  </td>
                </tr>
              )
            })}

            {/* Total row */}
            {hasBudget && (
              <tr className="row-total">
                <td className="ink-strong">Total</td>
                <td className="mono ink-strong">{fmtPEN(totalBudget, { decimals: 0 })}</td>
                <td>
                  <ProgressBar pct={totalPct} color={totalColor} />
                </td>
                <td className="num-col mono ink-strong" style={{ color: totalColor }}>
                  {fmtPEN(totalSpent, { decimals: 0 })}
                </td>
                <td className="num-col mono" style={{ color: totalAvail >= 0 ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>
                  {totalAvail >= 0
                    ? fmtPEN(totalAvail, { decimals: 0 })
                    : '−' + fmtPEN(-totalAvail, { decimals: 0 })}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!hasBudget && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-mute)', fontSize: 13 }}>
            <div style={{ marginBottom: 8 }}>
              Haz clic en <strong>"+ Definir límite"</strong> en cualquier categoría para empezar a presupuestar.
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              Los gastos reales se cargan automáticamente desde tus gastos fijos y variables.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
