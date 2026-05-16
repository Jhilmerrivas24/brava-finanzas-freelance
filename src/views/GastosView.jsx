import { useState } from 'react'
import { fmtPEN } from '../data.js'
import BillsView from './BillsView.jsx'
import VariableExpensesView from './VariableExpensesView.jsx'

export default function GastosView({
  bills = [],
  onAddBill, onEditBill, onDeleteBill,
  variableExpenses = [],
  onAddVariableExpense, onEditVariableExpense, onDeleteVariableExpense,
  accounts = [],
  creditLines = [],
}) {
  const [tab, setTab] = useState('fixed')

  const totalFixed    = (bills || []).filter(b => b.active !== false).reduce((s, b) => s + b.amount, 0)
  // Solo gastos variables del mes actual
  const now = new Date()
  const totalVariable = (variableExpenses || []).filter(e => {
    if (!e.date) return false
    const d = new Date(e.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).reduce((s, e) => s + e.amount, 0)

  const TABS = [
    { id: 'fixed',    label: 'Gastos fijos',    count: (bills || []).length },
    { id: 'variable', label: 'Gastos variables', count: (variableExpenses || []).length },
  ]

  return (
    <div className="view">
      {/* Header */}
      <header className="view-header">
        <div>
          <div className="eyebrow">Control de gastos</div>
          <h1>Gastos</h1>
          <p className="lede">
            Fijos activos: {fmtPEN(totalFixed, { decimals:0 })}/mes
            {totalVariable > 0 && <> · Variables este mes: {fmtPEN(totalVariable, { decimals:0 })}</>}
          </p>
        </div>
      </header>

      {/* Tab bar */}
      <div style={{
        display:'flex', gap:0, marginBottom:24,
        borderBottom:'1px solid var(--border)',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background:'none', border:'none', cursor:'pointer',
              padding:'8px 18px', fontSize:14,
              fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? 'var(--accent)' : 'var(--ink-mute)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1,
              display:'flex', alignItems:'center', gap:7,
              transition: 'color .15s',
            }}>
            {t.label}
            {t.count > 0 && (
              <span style={{
                background: tab === t.id ? 'var(--accent)' : 'var(--bg-sunk)',
                color: tab === t.id ? '#fff' : 'var(--ink-mute)',
                borderRadius:999, fontSize:11, padding:'1px 7px', fontWeight:600,
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'fixed' && (
        <BillsView
          bills={bills}
          onAddBill={onAddBill}
          onEditBill={onEditBill}
          onDeleteBill={onDeleteBill}
        />
      )}
      {tab === 'variable' && (
        <VariableExpensesView
          expenses={variableExpenses}
          onAdd={onAddVariableExpense}
          onEdit={onEditVariableExpense}
          onDelete={onDeleteVariableExpense}
          accounts={accounts}
          creditLines={creditLines}
        />
      )}
    </div>
  )
}
