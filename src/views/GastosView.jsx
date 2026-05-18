import { useState } from 'react'
import { fmtPEN } from '../data.js'
import BillsView from './BillsView.jsx'
import VariableExpensesView from './VariableExpensesView.jsx'
import Icon from '../components/Icon.jsx'

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function CreditCardConsumptionTab({ creditLines = [], dailyExpenses = [], variableExpenses = [], creditStatements = [], onGoto }) {
  const now = new Date()
  const isCurMon = (dateStr) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const periodLabel   = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`

  const activeCards = creditLines.filter(cl => cl.activa !== false)

  // For each card: compute charges this month from daily + variable expenses
  const cardStats = activeCards.map(cl => {
    const dailyCharges = (dailyExpenses || [])
      .filter(e => isCurMon(e.date) && e.sourceType === 'credit' && e.sourceId === cl.id)
    const varCharges = (variableExpenses || [])
      .filter(e => isCurMon(e.date) && e.paymentMethod?.type === 'tarjeta' && e.paymentMethod.creditLineId === cl.id)

    const autoCharges = dailyCharges.reduce((s, e) => s + e.amount, 0) + varCharges.reduce((s, e) => s + e.amount, 0)
    const allItems = [
      ...dailyCharges.map(e => ({ ...e, origin: 'diario' })),
      ...varCharges.map(e => ({ ...e, origin: 'variable' })),
    ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

    // Find current period statement
    const stmt = (creditStatements || []).find(s => s.cardId === cl.id && s.period === currentPeriod)
    const totalCharges = stmt?.chargesManual ?? autoCharges
    const lastPayment = stmt?.isPaid ? stmt : null

    return { cl, totalCharges, allItems, lastPayment }
  })

  if (activeCards.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--ink-mute)' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>💳</div>
        <p>No tienes tarjetas registradas.</p>
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => onGoto('credit')}>
          Ir a Tarjetas →
        </button>
      </div>
    )
  }

  const grandTotal = cardStats.reduce((s, cs) => s + cs.totalCharges, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', background: 'var(--bg-sunk)', borderRadius: 10,
        fontSize: 13,
      }}>
        <span style={{ color: 'var(--ink-mute)' }}>Total cargado en tarjetas — <strong>{periodLabel}</strong></span>
        <span className="mono" style={{ fontWeight: 700, color: grandTotal > 0 ? 'var(--bad)' : 'var(--ink-mute)' }}>
          {fmtPEN(grandTotal)}
        </span>
      </div>

      {cardStats.map(({ cl, totalCharges, allItems, lastPayment }) => {
        const pct = cl.limite > 0 ? Math.min(totalCharges / cl.limite, 1) : 0
        const pctColor = pct < 0.3 ? 'var(--good)' : pct < 0.7 ? 'var(--warn)' : 'var(--bad)'

        return (
          <div key={cl.id} className="card" style={{ gap: 0 }}>
            {/* Card header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>💳</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cl.nombre}</div>
                  {cl.banco && <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{cl.banco}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontWeight: 700, fontSize: 16, color: totalCharges > 0 ? 'var(--bad)' : 'var(--ink-mute)' }}>
                  {fmtPEN(totalCharges)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>cargos {periodLabel}</div>
              </div>
            </div>

            {/* Progress bar */}
            {cl.limite > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct * 100}%`, background: pctColor, borderRadius: 2, transition: 'width .4s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-faint)', marginTop: 3 }}>
                  <span>{(pct * 100).toFixed(0)}% del límite ({fmtPEN(cl.limite)})</span>
                  <span>Saldo actual: {fmtPEN(cl.usado ?? 0)}</span>
                </div>
              </div>
            )}

            {/* Payment badge */}
            {lastPayment ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
                padding: '3px 9px', borderRadius: 6, marginBottom: 10,
                background: 'color-mix(in srgb, var(--good) 12%, transparent)',
                color: 'var(--good)', fontWeight: 600,
              }}>
                <Icon name="check" size={11} /> Pagado {periodLabel}: {fmtPEN(lastPayment.paidAmount ?? lastPayment.amount ?? 0)}
              </div>
            ) : totalCharges > 0 ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
                padding: '3px 9px', borderRadius: 6, marginBottom: 10,
                background: 'color-mix(in srgb, var(--warn) 12%, transparent)',
                color: 'var(--warn)', fontWeight: 600,
              }}>
                ⏳ Pago pendiente
              </div>
            ) : null}

            {/* Items list */}
            {allItems.length > 0 ? (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)', marginBottom: 8 }}>
                  Detalle de cargos
                </div>
                {allItems.slice(0, 5).map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < Math.min(allItems.length, 5) - 1 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {item.description || item.category}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                        {item.date} · {item.origin === 'diario' ? 'Gasto del día' : 'Gasto variable'}
                      </span>
                    </div>
                    <span className="mono" style={{ color: 'var(--bad)', fontWeight: 600, marginLeft: 12 }}>
                      {fmtPEN(item.amount)}
                    </span>
                  </div>
                ))}
                {allItems.length > 5 && (
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6, textAlign: 'center' }}>
                    +{allItems.length - 5} más
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                Sin cargos este mes
              </div>
            )}

            <button
              className="btn btn-ghost btn-xs"
              style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
              onClick={() => onGoto('credit')}
            >
              Registrar pago o ver historial →
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default function GastosView({
  bills = [],
  onAddBill, onEditBill, onDeleteBill,
  variableExpenses = [],
  onAddVariableExpense, onEditVariableExpense, onDeleteVariableExpense,
  dailyExpenses = [],
  accounts = [],
  creditLines = [],
  creditStatements = [],
  loans = [],
  loanPayments = [],
  onGoto,
}) {
  const [tab, setTab] = useState('fixed')

  const totalFixed    = (bills || []).filter(b => b.active !== false).reduce((s, b) => s + b.amount, 0)
  const now = new Date()
  const isCurMon = (e) => {
    if (!e.date) return false
    const d = new Date(e.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }
  const totalVariable = (variableExpenses || []).filter(isCurMon).reduce((s, e) => s + e.amount, 0)
  const totalDaily    = (dailyExpenses    || []).filter(isCurMon).reduce((s, e) => s + e.amount, 0)
  const totalThisMonth = totalVariable + totalDaily

  // Active loans with pending balance
  const activeLoans    = (loans || []).filter(l => l.activo !== false && (l.saldoPendiente ?? 0) > 0)
  const totalLoanCuota = activeLoans.reduce((s, l) => s + (l.cuota ?? 0), 0)

  // Credit card charges this month
  const activeCreditLines = (creditLines || []).filter(cl => cl.activa !== false)
  const totalCardCharges = activeCreditLines.reduce((sum, cl) => {
    const daily = (dailyExpenses || []).filter(e => isCurMon(e) && e.sourceType === 'credit' && e.sourceId === cl.id).reduce((s, e) => s + e.amount, 0)
    const varr  = (variableExpenses || []).filter(e => isCurMon(e) && e.paymentMethod?.type === 'tarjeta' && e.paymentMethod.creditLineId === cl.id).reduce((s, e) => s + e.amount, 0)
    return sum + daily + varr
  }, 0)

  const TABS = [
    { id: 'fixed',    label: 'Gastos fijos',    count: (bills || []).length + activeLoans.length },
    { id: 'variable', label: 'Gastos variables', count: (variableExpenses || []).length },
    { id: 'credit',   label: 'Tarjetas',         count: activeCreditLines.length },
  ]

  return (
    <div className="view">
      {/* Header */}
      <header className="view-header">
        <div>
          <div className="eyebrow">Control de gastos</div>
          <h1>Gastos</h1>
          <p className="lede">
            Fijos: {fmtPEN(totalFixed + totalLoanCuota, { decimals:0 })}/mes
            {totalThisMonth > 0 && <> · Variables + diarios: {fmtPEN(totalThisMonth, { decimals:0 })}</>}
            {totalCardCharges > 0 && <> · En tarjetas: {fmtPEN(totalCardCharges, { decimals:0 })}</>}
          </p>
        </div>
        {onGoto && (
          <button className="btn btn-ghost" onClick={() => onGoto('daily')} style={{ fontSize:13 }}>
            Ver gastos del día →
          </button>
        )}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <BillsView
            bills={bills}
            onAddBill={onAddBill}
            onEditBill={onEditBill}
            onDeleteBill={onDeleteBill}
            extraMonthly={totalLoanCuota}
            extraCount={activeLoans.length}
          />
          {/* Loans as fixed expenses */}
          {activeLoans.length > 0 && (
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-faint)' }}>
                  Préstamos activos — cuotas mensuales
                </div>
                <button className="btn btn-ghost btn-xs" onClick={() => onGoto?.('loans')}>
                  Gestionar préstamos →
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeLoans.map(l => {
                  const myP = (loanPayments || []).filter(p => p.loanId === l.id)
                  const cuotasPagadas = (l.cuotasYaPagadas || 0) + myP.length
                  const restantes = l.totalCuotas > 0 ? Math.max(0, l.totalCuotas - cuotasPagadas) : null
                  const pct = l.montoOriginal > 0
                    ? Math.min((l.montoOriginal - (l.saldoPendiente ?? 0)) / l.montoOriginal, 1)
                    : 0
                  return (
                    <div key={l.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr auto',
                      gap: 8, padding: '12px 16px',
                      background: 'var(--bg-elev)', borderRadius: 10,
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                            background: 'color-mix(in srgb, var(--bad) 12%, transparent)',
                            color: 'var(--bad)',
                          }}>
                            PRÉSTAMO
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{l.nombre}</span>
                          {l.banco && <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{l.banco}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--ink-mute)', flexWrap: 'wrap' }}>
                          {l.totalCuotas > 0 && (
                            <span>Cuota {cuotasPagadas}/{l.totalCuotas}{restantes !== null ? ` · ${restantes} restante${restantes !== 1 ? 's' : ''}` : ''}</span>
                          )}
                          <span>Saldo: <strong className="mono">{fmtPEN(l.saldoPendiente ?? 0)}</strong></span>
                          {l.diaPago && <span>Vence día {l.diaPago}</span>}
                        </div>
                        {l.montoOriginal > 0 && (
                          <div style={{ marginTop: 6, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct * 100}%`, background: 'var(--accent)', borderRadius: 2 }} />
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--bad)' }}>
                          {fmtPEN(l.cuota ?? 0)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>/mes</div>
                        {l.capitalPorCuota > 0 && l.interesPorCuota > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 2 }}>
                            K {fmtPEN(l.capitalPorCuota)} + I {fmtPEN(l.interesPorCuota)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 16px', background: 'var(--bg-sunk)', borderRadius: 8, fontSize: 13,
                }}>
                  <span style={{ color: 'var(--ink-mute)' }}>Total cuotas préstamos/mes</span>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--bad)' }}>{fmtPEN(totalLoanCuota)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
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
      {tab === 'credit' && (
        <CreditCardConsumptionTab
          creditLines={creditLines}
          dailyExpenses={dailyExpenses}
          variableExpenses={variableExpenses}
          creditStatements={creditStatements}
          onGoto={onGoto}
        />
      )}
    </div>
  )
}
