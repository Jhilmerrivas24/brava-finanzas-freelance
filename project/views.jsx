// Remaining views: Clients, Cash flow, Taxes, Goals, Bills

function ClientsView({ invoices, onGoto, onNewInvoice }) {
  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">6 cuentas activas</div>
          <h1>Clientes y proyectos</h1>
          <p className="lede">2 con retainer mensual · 4 por proyecto · ingreso YTD {fmtPEN(CLIENTS_DETAIL.reduce((s,c)=>s+c.ytd,0))}</p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-ghost"><Icon name="filter" size={14}/> Filtrar</button>
          <button className="btn btn-primary" onClick={onNewInvoice}><Icon name="plus" size={14}/> Nueva factura</button>
        </div>
      </header>

      <section className="client-grid">
        {CLIENTS_DETAIL.map(c => {
          const meta = CLIENT_LIST.find(x => x.id === c.id);
          const clientInvoices = invoices.filter(i => i.client === c.id);
          const owed = clientInvoices.filter(i => i.status !== "paid").reduce((s,i)=>s+i.amount,0);
          const ytdShare = c.ytd / 85550; // arbitrary total for bar
          return (
            <div key={c.id} className="client-card">
              <div className="client-card-head">
                <Avatar name={c.name} color={meta.color} size={40}/>
                <div className="client-card-meta">
                  <div className="ink-strong">{c.name}</div>
                  <div className="ink-mute">{c.type}</div>
                </div>
                <span className={`health-dot health-${c.health}`} title={`Salud: ${c.health}`}/>
              </div>
              <div className="client-card-project">
                <div className="eyebrow">Proyecto actual</div>
                <div className="ink-strong">{c.project}</div>
              </div>
              <div className="client-card-stats">
                <div>
                  <div className="lbl">YTD</div>
                  <div className="num mono">{fmtPEN(c.ytd, {decimals:0})}</div>
                </div>
                <div>
                  <div className="lbl">Última factura</div>
                  <div className="num mono">{c.lastInvoice}</div>
                </div>
                <div>
                  <div className="lbl">Por cobrar</div>
                  <div className={`num mono ${owed > 0 ? "ink-warn" : "ink-mute"}`}>{owed > 0 ? fmtPEN(owed, {decimals:0}) : "—"}</div>
                </div>
              </div>
              <div className="client-card-bar">
                <Bar value={ytdShare} color={meta.color}/>
                <div className="ink-mute" style={{marginTop: 6, fontSize: 11}}>{(ytdShare*100).toFixed(0)}% de tu ingreso anual</div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function CashflowView({ data, preset }) {
  const totalIn = data.cashflow.reduce((s,r)=>s+r.inc,0);
  const totalOut = data.cashflow.reduce((s,r)=>s+r.exp,0);
  const margin = ((totalIn - totalOut) / totalIn) * 100;

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Marzo — Septiembre 2026</div>
          <h1>Flujo de caja</h1>
          <p className="lede">Ingresos {fmtPEN(totalIn)} · Egresos {fmtPEN(totalOut)} · Margen {margin.toFixed(0)}%</p>
        </div>
      </header>

      <section className="kpi-row">
        <KpiCard label="Ingreso promedio" value={fmtPEN(totalIn / data.cashflow.length)} foot="Por mes (7 meses)"/>
        <KpiCard label="Egreso promedio" value={fmtPEN(totalOut / data.cashflow.length)} foot="Burn rate mensual"/>
        <KpiCard label="Mejor mes" value={data.cashflow.reduce((a,b) => a.inc>b.inc?a:b).m} foot={fmtPEN(Math.max(...data.cashflow.map(r=>r.inc)))} accent/>
        <KpiCard label="Peor mes" value={data.cashflow.reduce((a,b) => a.inc<b.inc?a:b).m} foot={fmtPEN(Math.min(...data.cashflow.map(r=>r.inc)))}/>
      </section>

      <div className="card card-chart">
        <div className="card-head">
          <div>
            <div className="card-eyebrow">Detalle mensual</div>
            <h3 className="card-title">Ingresos vs egresos</h3>
          </div>
          <div className="legend">
            <span className="legend-item"><i className="dot dot-ink"/> Ingresos</span>
            <span className="legend-item"><i className="dot dot-accent"/> Egresos</span>
          </div>
        </div>
        <CashflowChart data={data.cashflow} height={280}/>
      </div>

      <div className="card card-flat">
        <table className="invoice-table invoice-table-full">
          <thead>
            <tr><th>Mes</th><th className="num-col">Ingresos</th><th className="num-col">Egresos</th><th className="num-col">Neto</th><th>Margen</th></tr>
          </thead>
          <tbody>
            {data.cashflow.map(r => {
              const net = r.inc - r.exp;
              const m = (net/r.inc)*100;
              return (
                <tr key={r.m}>
                  <td className="ink-strong">{r.m} 2026</td>
                  <td className="num-col mono">{fmtPEN(r.inc)}</td>
                  <td className="num-col mono">{fmtPEN(r.exp)}</td>
                  <td className={`num-col mono ${net>0?"ink-good":"ink-bad"}`}>{fmtPEN(net, {sign:true})}</td>
                  <td><span className={`pill ${m>0?"pill-good":"pill-bad"}`}>{m.toFixed(0)}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaxesView({ data }) {
  const pct = data.taxSetAside / data.taxTarget;
  const quarters = [
    { q: "Q1 2026", target: 12400, paid: 12400, status: "paid",    date: "31 Mar" },
    { q: "Q2 2026", target: 14820, paid: 14820, status: "paid",    date: "30 Jun" },
    { q: "Q3 2026", target: data.taxTarget,  paid: data.taxSetAside, status: "current", date: "30 Set" },
    { q: "Q4 2026", target: 0,    paid: 0,     status: "future", date: "31 Dic" },
  ];

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">SUNAT · Cuarta categoría</div>
          <h1>Impuestos</h1>
          <p className="lede">Reservas automáticas del 30% de cada factura cobrada.</p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-ghost"><Icon name="settings" size={14}/> Configurar tasa</button>
          <button className="btn btn-primary"><Icon name="download" size={14}/> Generar declaración</button>
        </div>
      </header>

      <section className="grid-tax">
        <div className="card card-tax-big">
          <div className="card-eyebrow">Reserva del trimestre actual</div>
          <div className="tax-big">
            <Ring value={pct} size={220} stroke={16}/>
            <div className="tax-big-center">
              <div className="mono">{fmtPEN(data.taxSetAside)}</div>
              <div className="ink-mute">de {fmtPEN(data.taxTarget)}</div>
              <div className="pill pill-good" style={{marginTop:10}}>{(pct*100).toFixed(0)}% al día</div>
            </div>
          </div>
          <div className="tax-big-meta">
            <div>
              <div className="lbl">Tasa aplicada</div>
              <div className="num mono">30%</div>
            </div>
            <div>
              <div className="lbl">Próximo pago</div>
              <div className="num mono">17 Oct</div>
            </div>
            <div>
              <div className="lbl">Faltante</div>
              <div className="num mono ink-warn">{fmtPEN(Math.max(0, data.taxTarget - data.taxSetAside))}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Trimestres 2026</div>
              <h3 className="card-title">Historial</h3>
            </div>
          </div>
          <ul className="quarter-list">
            {quarters.map(q => (
              <li key={q.q} className={`quarter quarter-${q.status}`}>
                <div className="quarter-meta">
                  <div className="ink-strong">{q.q}</div>
                  <div className="ink-mute">Vence {q.date}</div>
                </div>
                <div className="quarter-amt mono">
                  {q.status === "future" ? "—" : fmtPEN(q.paid, {decimals: 0})}
                </div>
                <StatusPill status={q.status === "paid" ? "paid" : q.status === "current" ? "pending" : "draft"}/>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function GoalsView() {
  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">{GOALS.length} metas activas</div>
          <h1>Metas de ahorro</h1>
          <p className="lede">Cubos separados de tu cuenta corriente — cada factura cobrada aporta un porcentaje.</p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary"><Icon name="plus" size={14}/> Nueva meta</button>
        </div>
      </header>

      <section className="goals-grid">
        {GOALS.map(g => {
          const p = g.current / g.target;
          const missing = g.target - g.current;
          return (
            <div key={g.name} className="goal-card">
              <div className="goal-card-head">
                <div>
                  <div className="ink-strong" style={{fontSize: 17}}>{g.name}</div>
                  <div className="ink-mute">Objetivo · {g.eta}</div>
                </div>
                <div className="goal-pct mono" style={{color: g.color}}>{(p*100).toFixed(0)}%</div>
              </div>
              <div className="goal-progress">
                <div className="goal-progress-track">
                  <div className="goal-progress-fill" style={{ width: `${p*100}%`, background: g.color }}/>
                </div>
              </div>
              <div className="goal-card-stats">
                <div>
                  <div className="lbl">Ahorrado</div>
                  <div className="num mono ink-strong">{fmtPEN(g.current, {decimals: 0})}</div>
                </div>
                <div>
                  <div className="lbl">Meta</div>
                  <div className="num mono">{fmtPEN(g.target, {decimals: 0})}</div>
                </div>
                <div>
                  <div className="lbl">Falta</div>
                  <div className="num mono ink-mute">{fmtPEN(missing, {decimals: 0})}</div>
                </div>
              </div>
              <div className="goal-card-actions">
                <button className="btn btn-soft btn-xs"><Icon name="plus" size={12}/> Aportar</button>
                <button className="btn btn-xs btn-quiet">Ajustar regla</button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function BillsView() {
  const total = RECURRING_BILLS.reduce((s,b)=>s+b.amount,0);
  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Gastos recurrentes</div>
          <h1>Suscripciones y gastos fijos</h1>
          <p className="lede">{RECURRING_BILLS.length} cargos automáticos · {fmtPEN(total)} mensual · {fmtPEN(total*12)} al año</p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary"><Icon name="plus" size={14}/> Agregar gasto</button>
        </div>
      </header>

      <div className="card card-flat">
        <table className="invoice-table invoice-table-full">
          <thead>
            <tr><th>Servicio</th><th>Categoría</th><th>Día del mes</th><th className="num-col">Monto</th><th className="num-col">Anual</th><th></th></tr>
          </thead>
          <tbody>
            {RECURRING_BILLS.map(b => (
              <tr key={b.name}>
                <td className="ink-strong">{b.name}</td>
                <td><span className="pill pill-mute">{b.category}</span></td>
                <td className="ink-mute mono">Día {b.day}</td>
                <td className="num-col mono">{fmtPEN(b.amount)}</td>
                <td className="num-col mono ink-mute">{fmtPEN(b.amount * 12, {decimals:0})}</td>
                <td className="row-actions"><button className="btn btn-xs btn-quiet">Editar</button></td>
              </tr>
            ))}
            <tr className="row-total">
              <td colSpan={3} className="ink-strong">Total mensual</td>
              <td className="num-col mono ink-strong">{fmtPEN(total)}</td>
              <td className="num-col mono ink-strong">{fmtPEN(total * 12, {decimals: 0})}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { ClientsView, CashflowView, TaxesView, GoalsView, BillsView });
