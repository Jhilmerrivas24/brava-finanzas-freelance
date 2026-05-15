import { fmtPENShort, fmtPEN } from '../data.js'

export default function CashflowChart({ data, height = 220, accentIn = 'var(--ink)', accentOut = 'var(--accent)' }) {
  const max = Math.max(...data.flatMap(d => [d.inc, d.exp]))
  const niceMax = Math.ceil(max / 5000) * 5000
  const gridLines = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="cashflow-chart">
      <div className="cashflow-grid">
        {gridLines.map(g => (
          <div key={g} className="cashflow-gridline">
            <span className="cashflow-tick">{fmtPENShort(niceMax * (1 - g))}</span>
          </div>
        ))}
      </div>
      <div className="cashflow-bars" style={{ height }}>
        {data.map((d, i) => {
          const hIn  = (d.inc / niceMax) * 100
          const hOut = (d.exp / niceMax) * 100
          return (
            <div key={i} className="cashflow-col">
              <div className="cashflow-bar-wrap">
                <div className="cashflow-bar" style={{ height: `${hIn}%`,  background: accentIn  }} title={`Ingresos ${fmtPEN(d.inc)}`} />
                <div className="cashflow-bar" style={{ height: `${hOut}%`, background: accentOut }} title={`Egresos ${fmtPEN(d.exp)}`} />
              </div>
              <div className="cashflow-label">{d.m}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
