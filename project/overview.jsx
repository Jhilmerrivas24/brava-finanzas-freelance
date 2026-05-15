// Overview / dashboard — the main "everything" view

function KpiCard({ label, value, delta, deltaPositive, foot, accent }) {
  return (
    <div className={`kpi ${accent ? "kpi-accent" : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {delta && (
        <div className={`kpi-delta ${deltaPositive ? "is-pos" : "is-neg"}`}>
          <Icon name={deltaPositive ? "arrowUp" : "arrowDown"} size={12} />
          {delta}
        </div>
      )}
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  );
}

function Overview({ data, preset, invoices, onMarkPaid, onNewInvoice, onGoto }) {
  const net = data.inThisMonth - data.outThisMonth;
  const taxPct = data.taxSetAside / data.taxTarget;
  const hoursPct = data.hoursPaid / data.hoursBilled;
  const overdue = invoices.filter(i => i.status === "overdue");
  const pending = invoices.filter(i => i.status === "pending");

  // average monthly burn from cashflow history
  const avgBurn = data.cashflow.reduce((s,r) => s + r.exp, 0) / data.cashflow.length;
  const runwayMonths = data.cashAvailable / avgBurn;

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Septiembre 2026 · {preset === "great" ? "mes fuerte" : "mes flojo"}</div>
          <h1>Hola, Ana — esto es <span className="ink-accent">lo que vale tu mes</span>.</h1>
          <p className="lede">
            Cobraste {fmtPEN(data.inThisMonth)} este mes, separaste el 30 % para SUNAT y tienes
            {" "}{overdue.length > 0 ? <strong className="ink-bad">{overdue.length} factura(s) vencida(s)</strong> : "todo al día"}.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-ghost"><Icon name="download" size={14}/> Exportar</button>
          <button className="btn btn-primary" onClick={onNewInvoice}><Icon name="plus" size={14}/> Nueva factura</button>
        </div>
      </header>

      {/* KPI row */}
      <section className="kpi-row">
        <KpiCard
          label="Disponible para gastar"
          value={fmtPEN(data.cashAvailable)}
          delta={preset === "great" ? "+12.4%" : "−8.1%"}
          deltaPositive={preset === "great"}
          foot={`Runway: ~${runwayMonths.toFixed(1)} meses al ritmo actual`}
          accent
        />
        <KpiCard
          label="Ingresos del mes"
          value={fmtPEN(data.inThisMonth)}
          delta={preset === "great" ? "+38%" : "−42%"}
          deltaPositive={preset === "great"}
          foot={`${invoices.filter(i=>i.status==="paid").length} facturas cobradas`}
        />
        <KpiCard
          label="Egresos del mes"
          value={fmtPEN(data.outThisMonth)}
          delta={preset === "great" ? "+6%" : "+2%"}
          deltaPositive={false}
          foot={`${RECURRING_BILLS.length} suscripciones activas`}
        />
        <KpiCard
          label="Neto"
          value={fmtPEN(net, { sign: net !== 0 })}
          delta={`Margen ${((net / data.inThisMonth) * 100).toFixed(0)}%`}
          deltaPositive={net > 0}
          foot={net > 0 ? "Por encima del promedio" : "Mes en rojo — revisar gastos"}
        />
      </section>

      {/* Main grid: cashflow chart + side rail */}
      <section className="grid-main">
        {/* Cash flow */}
        <div className="card card-chart">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Últimos 7 meses</div>
              <h3 className="card-title">Flujo de caja</h3>
            </div>
            <div className="legend">
              <span className="legend-item"><i className="dot dot-ink"/> Ingresos</span>
              <span className="legend-item"><i className="dot dot-accent"/> Egresos</span>
              <button className="btn-link" onClick={() => onGoto("cashflow")}>Ver detalle <Icon name="arrowRight" size={12}/></button>
            </div>
          </div>
          <CashflowChart data={data.cashflow} />
          <div className="chart-footnotes">
            <div><span className="num">{fmtPEN(data.cashflow.reduce((s,r)=>s+r.inc,0))}</span><span className="lbl">Ingresos 7m</span></div>
            <div><span className="num">{fmtPEN(data.cashflow.reduce((s,r)=>s+r.exp,0))}</span><span className="lbl">Egresos 7m</span></div>
            <div><span className="num">{fmtPEN(avgBurn)}</span><span className="lbl">Burn promedio</span></div>
            <div><span className="num">{((1 - data.cashflow.reduce((s,r)=>s+r.exp,0)/data.cashflow.reduce((s,r)=>s+r.inc,0)) * 100).toFixed(0)}%</span><span className="lbl">Margen 7m</span></div>
          </div>
        </div>

        {/* Tax tracker */}
        <div className="card card-tax">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Reserva SUNAT</div>
              <h3 className="card-title">Impuestos al día</h3>
            </div>
          </div>
          <div className="tax-ring">
            <div className="tax-ring-svg">
              <Ring value={taxPct} size={140} stroke={12} />
              <div className="tax-ring-center">
                <div className="tax-pct">{(taxPct*100).toFixed(0)}%</div>
                <div className="tax-cap">de lo necesario</div>
              </div>
            </div>
          </div>
          <div className="tax-numbers">
            <div>
              <div className="lbl">Apartado</div>
              <div className="num">{fmtPEN(data.taxSetAside)}</div>
            </div>
            <div>
              <div className="lbl">Faltante</div>
              <div className="num ink-warn">{fmtPEN(Math.max(0, data.taxTarget - data.taxSetAside))}</div>
            </div>
          </div>
          <button className="btn btn-soft btn-full" onClick={() => onGoto("taxes")}>
            Apartar 30% automáticamente <Icon name="arrowRight" size={12}/>
          </button>
        </div>
      </section>

      {/* Invoices + clients + activity */}
      <section className="grid-two">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Por cobrar</div>
              <h3 className="card-title">Facturas pendientes</h3>
            </div>
            <button className="btn-link" onClick={() => onGoto("invoices")}>Ver todas <Icon name="arrowRight" size={12}/></button>
          </div>
          <table className="invoice-table">
            <thead>
              <tr><th>Cliente</th><th>Concepto</th><th className="num-col">Monto</th><th>Vence</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {[...overdue, ...pending].slice(0,5).map(inv => {
                const c = CLIENT_LIST.find(x => x.id === inv.client);
                return (
                  <tr key={inv.id}>
                    <td>
                      <div className="cell-client">
                        <Avatar name={c.name} color={c.color} size={26}/>
                        <div>
                          <div className="ink-strong">{c.name}</div>
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
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Liquidez</div>
              <h3 className="card-title">Cuentas y tarjetas</h3>
            </div>
            <button className="btn-link"><Icon name="plus" size={12}/> Conectar</button>
          </div>
          <ul className="account-list">
            {ACCOUNTS.map(a => (
              <li key={a.last}>
                <div className="account-icon"><Icon name="bank" size={16}/></div>
                <div className="account-meta">
                  <div className="ink-strong">{a.name}</div>
                  <div className="ink-mute mono">···· {a.last}</div>
                </div>
                <div className="account-amount mono">{fmtPEN(a.balance)}</div>
              </li>
            ))}
            <li className="account-total">
              <div className="ink-mute">Total disponible</div>
              <div className="mono ink-strong">{fmtPEN(ACCOUNTS.reduce((s,a)=>s+a.balance,0))}</div>
            </li>
          </ul>
        </div>
      </section>

      {/* Bottom row: hours, goals snapshot, activity */}
      <section className="grid-three">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Horas facturadas vs cobradas</div>
              <h3 className="card-title">Time-to-money</h3>
            </div>
          </div>
          <div className="hours-stack">
            <div className="hours-row">
              <div className="hours-label">Facturadas</div>
              <div className="hours-bar"><div className="hours-fill" style={{ width: "100%", background: "var(--ink)" }}/></div>
              <div className="hours-num mono">{data.hoursBilled}h</div>
            </div>
            <div className="hours-row">
              <div className="hours-label">Cobradas</div>
              <div className="hours-bar"><div className="hours-fill" style={{ width: `${hoursPct*100}%`, background: "var(--accent)" }}/></div>
              <div className="hours-num mono">{data.hoursPaid}h</div>
            </div>
          </div>
          <div className="hours-foot">
            <div>
              <div className="lbl">Tarifa hora</div>
              <div className="num mono">{fmtPEN(data.hourRate, { decimals: 0 })}</div>
            </div>
            <div>
              <div className="lbl">Por cobrar</div>
              <div className="num mono">{fmtPEN((data.hoursBilled - data.hoursPaid) * data.hourRate, { decimals: 0 })}</div>
            </div>
            <div>
              <div className="lbl">Días promedio</div>
              <div className="num mono">{preset === "great" ? "11" : "27"}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">3 metas activas</div>
              <h3 className="card-title">Metas de ahorro</h3>
            </div>
            <button className="btn-link" onClick={() => onGoto("goals")}>Gestionar <Icon name="arrowRight" size={12}/></button>
          </div>
          <ul className="goals-list">
            {GOALS.slice(0,3).map(g => {
              const p = g.current / g.target;
              return (
                <li key={g.name}>
                  <div className="goal-line">
                    <div className="ink-strong">{g.name}</div>
                    <div className="mono ink-mute">{fmtPEN(g.current, {decimals:0})} <span className="ink-faint">/ {fmtPEN(g.target, {decimals:0})}</span></div>
                  </div>
                  <Bar value={p} color={g.color}/>
                  <div className="goal-foot">
                    <span className="ink-mute">{(p*100).toFixed(0)}% completo</span>
                    <span className="ink-mute">ETA · {g.eta}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Movimientos recientes</div>
              <h3 className="card-title">Actividad</h3>
            </div>
          </div>
          <ul className="activity-list">
            {RECENT_ACTIVITY.map((a, i) => (
              <li key={i}>
                <div className={`activity-icon ${a.kind === "in" ? "is-in" : "is-out"}`}>
                  <Icon name={a.kind === "in" ? "arrowDown" : "arrowUp"} size={12}/>
                </div>
                <div className="activity-meta">
                  <div className="ink-strong">{a.label}</div>
                  <div className="ink-mute">{a.ref} · {a.when}</div>
                </div>
                <div className={`activity-amount mono ${a.kind === "in" ? "is-in" : "is-out"}`}>
                  {a.kind === "in" ? "+" : "−"} {fmtPEN(a.amount, {decimals: 0})}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { Overview });
