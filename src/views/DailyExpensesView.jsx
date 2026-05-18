import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem } from '../lib/animations.js'
import { fmtPEN } from '../data.js'
import Icon from '../components/Icon.jsx'
import { useDialog } from '../hooks/useDialog.js'
import NewDailyExpenseModal from '../modals/NewDailyExpenseModal.jsx'

const CATEGORIES = {
  comida:          { label: 'Comida',          emoji: '🍽️', color: '#ef4444' },
  transporte:      { label: 'Transporte',      emoji: '🚌', color: '#3b82f6' },
  servicios:       { label: 'Servicios',       emoji: '💡', color: '#f59e0b' },
  entretenimiento: { label: 'Entretenimiento', emoji: '🎬', color: '#8b5cf6' },
  salud:           { label: 'Salud',           emoji: '💊', color: '#10b981' },
  ropa:            { label: 'Ropa',            emoji: '👕', color: '#ec4899' },
  supermercado:    { label: 'Supermercado',    emoji: '🛒', color: '#06b6d4' },
  otro:            { label: 'Otro',            emoji: '📦', color: '#6b7280' },
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']

function formatDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  const yStr = yesterday.toISOString().split('T')[0]
  if (dateStr === today) return 'Hoy'
  if (dateStr === yStr)  return 'Ayer'
  const weekdays = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  return `${weekdays[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

function sourceLabel(expense, accounts, creditLines) {
  if (!expense.sourceType || expense.sourceType === 'cash') return { text: 'Efectivo', icon: '💵' }
  if (expense.sourceType === 'account') {
    const acc = accounts.find(a => a.id === expense.sourceId)
    return { text: acc?.nombre ?? acc?.bank ?? 'Cuenta', icon: '🏦' }
  }
  if (expense.sourceType === 'credit') {
    const cl = creditLines.find(c => c.id === expense.sourceId)
    return { text: cl?.nombre ?? 'Tarjeta', icon: '💳' }
  }
  return { text: '—', icon: '💰' }
}

export default function DailyExpensesView({
  dailyExpenses = [],
  accounts = [],
  creditLines = [],
  onAdd,
  onEdit,
  onDelete,
}) {
  const now = new Date()
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const dialog = useDialog()
  const [modal,    setModal]    = useState(null)   // null | 'new' | expense-object
  const [filterCat, setFilterCat] = useState('all')
  const [expandedDates, setExpandedDates] = useState(new Set())

  // Filter to selected month
  const monthExpenses = useMemo(() => {
    return dailyExpenses.filter(e => {
      if (!e.date) return false
      const d = new Date(e.date)
      return d.getFullYear() === selYear && d.getMonth() === selMonth - 1
    })
  }, [dailyExpenses, selYear, selMonth])

  // Apply category filter
  const filtered = useMemo(() => {
    if (filterCat === 'all') return monthExpenses
    return monthExpenses.filter(e => e.category === filterCat)
  }, [monthExpenses, filterCat])

  // Group by date (sorted desc)
  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(e => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => (b.id ?? '').localeCompare(a.id ?? '')),
        total: items.reduce((s, e) => s + e.amount, 0),
      }))
  }, [filtered])

  // Category totals for summary
  const catTotals = useMemo(() => {
    const map = {}
    monthExpenses.forEach(e => {
      const cat = e.category || 'otro'
      map[cat] = (map[cat] ?? 0) + e.amount
    })
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, total]) => ({ cat, total, ...CATEGORIES[cat] }))
  }, [monthExpenses])

  const totalMonth = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0)

  // Month navigation
  function prevMonth() {
    if (selMonth === 1) { setSelYear(y => y - 1); setSelMonth(12) }
    else setSelMonth(m => m - 1)
  }
  function nextMonth() {
    const isLast = selYear === now.getFullYear() && selMonth === now.getMonth() + 1
    if (isLast) return
    if (selMonth === 12) { setSelYear(y => y + 1); setSelMonth(1) }
    else setSelMonth(m => m + 1)
  }
  const isCurrentMonth = selYear === now.getFullYear() && selMonth === now.getMonth() + 1

  function handleSave(expense) {
    if (modal !== 'new' && modal?.id) {
      onEdit(expense)
    } else {
      onAdd(expense)
    }
    setModal(null)
  }

  function handleDelete(id, description) {
    dialog.danger({ title: '¿Eliminar gasto?', itemName: description })
      .then(ok => ok && onDelete(id))
  }

  return (
    <div className="view">
      {/* Header */}
      <header className="view-header">
        <div>
          <div className="eyebrow">Gastos diarios</div>
          <h1>Gastos del día</h1>
          <p className="lede">
            {totalMonth > 0
              ? `${fmtPEN(totalMonth, { decimals: 0 })} en ${MONTHS_ES[selMonth - 1]} ${selYear} · ${monthExpenses.length} transacciones`
              : 'Sin gastos registrados este mes'}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setModal('new')}
        >
          <Icon name="plus" size={14} />
          Agregar gasto
        </button>
      </header>

      {/* Month selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="icon-btn" onClick={prevMonth}>
          <Icon name="chevron" size={14} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <span style={{ fontWeight: 600, fontSize: 15, minWidth: 140, textAlign: 'center' }}>
          {MONTHS_ES[selMonth - 1]} {selYear}
        </span>
        <button className="icon-btn" onClick={nextMonth} disabled={isCurrentMonth}
          style={{ opacity: isCurrentMonth ? 0.3 : 1 }}>
          <Icon name="chevron" size={14} style={{ transform: 'rotate(-90deg)' }} />
        </button>
        {!isCurrentMonth && (
          <button className="btn btn-ghost" style={{ fontSize: 12 }}
            onClick={() => { setSelYear(now.getFullYear()); setSelMonth(now.getMonth() + 1) }}>
            Hoy
          </button>
        )}
      </div>

      {/* Category summary pills */}
      {catTotals.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <button
            onClick={() => setFilterCat('all')}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              border: `2px solid ${filterCat === 'all' ? 'var(--accent)' : 'var(--border)'}`,
              background: filterCat === 'all' ? 'color-mix(in srgb, var(--accent) 12%, var(--bg-elev))' : 'var(--bg-elev)',
              color: filterCat === 'all' ? 'var(--accent)' : 'var(--ink-soft)',
              cursor: 'pointer', transition: 'all .15s',
            }}
          >
            Todo · {fmtPEN(totalMonth, { decimals: 0 })}
          </button>
          {catTotals.map(({ cat, total, label, emoji }) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat === filterCat ? 'all' : cat)}
              style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: `2px solid ${filterCat === cat ? 'var(--accent)' : 'var(--border)'}`,
                background: filterCat === cat ? 'color-mix(in srgb, var(--accent) 12%, var(--bg-elev))' : 'var(--bg-elev)',
                color: filterCat === cat ? 'var(--accent)' : 'var(--ink-soft)',
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {emoji} {label} · {fmtPEN(total, { decimals: 0 })}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {grouped.length === 0 && (
        <div className="empty-state" style={{ marginTop: 48 }}>
          <div className="empty-state-icon"><span style={{ fontSize: 32 }}>🧾</span></div>
          <h3>Sin gastos en {MONTHS_ES[selMonth - 1]}</h3>
          <p>Registra tus gastos diarios para ver en qué estás gastando tu dinero.</p>
          <button className="btn btn-primary btn-xs" onClick={() => setModal('new')}>
            + Agregar primer gasto
          </button>
        </div>
      )}

      {/* Grouped list */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {grouped.map(group => (
          <motion.div key={group.date} variants={staggerItem}>
            {/* Day header */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 0 6px', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                marginBottom: 6,
              }}
              onClick={() => setExpandedDates(s => {
                const next = new Set(s)
                next.has(group.date) ? next.delete(group.date) : next.add(group.date)
                return next
              })}
            >
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{formatDay(group.date)}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-mute)', marginLeft: 8 }}>
                  {group.items.length} {group.items.length === 1 ? 'gasto' : 'gastos'}
                </span>
              </div>
              <span className="mono" style={{ fontWeight: 700, color: 'var(--bad)', fontSize: 14 }}>
                {fmtPEN(group.total)}
              </span>
              <Icon
                name="chevron"
                size={12}
                style={{
                  transform: expandedDates.has(group.date) ? 'rotate(-90deg)' : 'none',
                  transition: 'transform .15s',
                  color: 'var(--ink-faint)',
                }}
              />
            </div>

            {/* Items */}
            <AnimatePresence initial={false}>
              {!expandedDates.has(group.date) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>
                    {group.items.map(expense => {
                      const cat    = CATEGORIES[expense.category] ?? CATEGORIES.otro
                      const source = sourceLabel(expense, accounts, creditLines)
                      return (
                        <div
                          key={expense.id}
                          className="card"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px',
                          }}
                        >
                          {/* Category emoji */}
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: `${cat.color}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, flexShrink: 0,
                          }}>
                            {cat.emoji}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: 600, fontSize: 14,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {expense.description}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 1 }}>
                              <span style={{
                                display: 'inline-block', background: `${cat.color}18`,
                                color: cat.color, borderRadius: 4, padding: '1px 6px',
                                fontWeight: 600, fontSize: 10, marginRight: 6,
                              }}>
                                {cat.label}
                              </span>
                              {source.icon} {source.text}
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--bad)', flexShrink: 0 }}>
                            {fmtPEN(expense.amount)}
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button
                              className="icon-btn"
                              title="Editar"
                              onClick={() => setModal(expense)}
                            >
                              <Icon name="edit" size={14} />
                            </button>
                            <button
                              className="icon-btn"
                              title="Eliminar"
                              style={{ color: 'var(--bad)' }}
                              onClick={() => handleDelete(expense.id, expense.description)}
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>

      {/* Monthly breakdown chart — category bars */}
      {catTotals.length > 0 && (
        <div className="card" style={{ marginTop: 32, padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
            Distribución por categoría — {MONTHS_SHORT[selMonth - 1]} {selYear}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {catTotals.map(({ cat, total, label, emoji, color }) => {
              const pct = totalMonth > 0 ? (total / totalMonth * 100) : 0
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{emoji}</span>
                    <span style={{ fontSize: 13, flex: 1 }}>{label}</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{fmtPEN(total)}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-mute)', minWidth: 36, textAlign: 'right' }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-sunk)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: color, borderRadius: 3,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
          {filterCat !== 'all' && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-mute)' }}>
              Filtrado: {fmtPEN(totalFiltered)} de {fmtPEN(totalMonth)} total
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <NewDailyExpenseModal
          initial={modal === 'new' ? null : modal}
          accounts={accounts}
          creditLines={creditLines}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
