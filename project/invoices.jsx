// Invoices view + new-invoice modal

function InvoicesView({ invoices, onMarkPaid, onNewInvoice, onUndo }) {
  const [filter, setFilter] = React.useState("all");
  const tabs = [
    { id: "all", label: "Todas", count: invoices.length },
    { id: "overdue", label: "Vencidas", count: invoices.filter(i => i.status === "overdue").length },
    { id: "pending", label: "Pendientes", count: invoices.filter(i => i.status === "pending").length },
    { id: "paid", label: "Pagadas", count: invoices.filter(i => i.status === "paid").length },
  ];
  const filtered = filter === "all" ? invoices : invoices.filter(i => i.status === filter);

  const totalAll = invoices.reduce((s,i)=>s+i.amount,0);
  const totalPaid = invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0);
  const totalPending = invoices.filter(i=>i.status==="pending").reduce((s,i)=>s+i.amount,0);
  const totalOverdue = invoices.filter(i=>i.status==="overdue").reduce((s,i)=>s+i.amount,0);

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Septiembre 2026</div>
          <h1>Facturas</h1>
          <p className="lede">
            {invoices.length} facturas emitidas · {fmtPEN(totalPaid)} cobrado · <span className="ink-bad">{fmtPEN(totalOverdue)} vencido</span>
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-ghost"><Icon name="filter" size={14}/> Filtrar</button>
          <button className="btn btn-ghost"><Icon name="download" size={14}/> Exportar</button>
          <button className="btn btn-primary" onClick={onNewInvoice}><Icon name="plus" size={14}/> Nueva factura</button>
        </div>
      </header>

      <section className="kpi-row">
        <KpiCard label="Total emitido" value={fmtPEN(totalAll)} foot={`${invoices.length} facturas`}/>
        <KpiCard label="Cobrado" value={fmtPEN(totalPaid)} foot={`${((totalPaid/totalAll)*100).toFixed(0)}% del total`} deltaPositive />
        <KpiCard label="Pendiente" value={fmtPEN(totalPending)} foot={`${invoices.filter(i=>i.status==="pending").length} facturas en plazo`}/>
        <KpiCard label="Vencido" value={fmtPEN(totalOverdue)} foot={`${invoices.filter(i=>i.status==="overdue").length} facturas a cobrar ya`} accent />
      </section>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${filter === t.id ? "is-active" : ""}`} onClick={() => setFilter(t.id)}>
            {t.label} <span className="tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="card card-flat">
        <table className="invoice-table invoice-table-full">
          <thead>
            <tr>
              <th>Factura</th>
              <th>Cliente</th>
              <th>Concepto</th>
              <th>Emitida</th>
              <th>Vence</th>
              <th className="num-col">Monto</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const c = CLIENT_LIST.find(x => x.id === inv.client);
              return (
                <tr key={inv.id}>
                  <td className="mono ink-strong">{inv.id}</td>
                  <td>
                    <div className="cell-client">
                      <Avatar name={c.name} color={c.color} size={26}/>
                      <span className="ink-strong">{c.name}</span>
                    </div>
                  </td>
                  <td className="ink-mute">{inv.project}</td>
                  <td className="ink-mute mono">{inv.issued}</td>
                  <td className="ink-mute mono">{inv.due}</td>
                  <td className="num-col mono ink-strong">{fmtPEN(inv.amount)}</td>
                  <td><StatusPill status={inv.status}/></td>
                  <td className="row-actions">
                    {inv.status !== "paid"
                      ? <button className="btn btn-xs" onClick={() => onMarkPaid(inv.id)}><Icon name="check" size={12}/> Marcar pagada</button>
                      : <button className="btn btn-xs btn-quiet" onClick={() => onUndo(inv.id)}>Deshacer</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- New invoice modal ---

function NewInvoiceModal({ onClose, onCreate, nextId }) {
  const [clientId, setClientId] = React.useState("c1");
  const [project, setProject] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [dueIn, setDueIn] = React.useState(14);

  const client = CLIENT_LIST.find(c => c.id === clientId);
  const amtNum = parseFloat(amount.replace(/,/g,"")) || 0;
  const tax = amtNum * 0.30;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">Crear nueva</div>
            <h2 className="modal-title">Factura {nextId}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>Cliente</label>
            <div className="client-picker">
              {CLIENT_LIST.map(c => (
                <button key={c.id} className={`client-chip ${clientId === c.id ? "is-on" : ""}`} onClick={() => setClientId(c.id)}>
                  <Avatar name={c.name} color={c.color} size={20}/>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Concepto / proyecto</label>
              <input type="text" value={project} onChange={e=>setProject(e.target.value)} placeholder="p.ej. Rediseño de landing" />
            </div>
            <div className="field">
              <label>Vencimiento</label>
              <select value={dueIn} onChange={e=>setDueIn(parseInt(e.target.value))}>
                <option value={7}>7 días</option>
                <option value={14}>14 días</option>
                <option value={30}>30 días</option>
                <option value={45}>45 días</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Monto</label>
            <div className="amount-input">
              <span className="amount-prefix mono">S/</span>
              <input type="text" inputMode="decimal" className="amount-field mono" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" autoFocus/>
            </div>
          </div>

          <div className="invoice-preview">
            <div className="invoice-preview-head">
              <div className="ink-mute">Vista previa</div>
              <div className="mono ink-mute">{nextId}</div>
            </div>
            <div className="invoice-preview-body">
              <div className="invoice-preview-row">
                <span className="ink-mute">Cliente</span>
                <span className="ink-strong">{client.name}</span>
              </div>
              <div className="invoice-preview-row">
                <span className="ink-mute">Concepto</span>
                <span className="ink-strong">{project || <em className="ink-faint">— sin definir —</em>}</span>
              </div>
              <div className="invoice-preview-row">
                <span className="ink-mute">Subtotal</span>
                <span className="mono">{fmtPEN(amtNum)}</span>
              </div>
              <div className="invoice-preview-row invoice-preview-row-quiet">
                <span className="ink-mute">Reserva 30% impuestos (auto)</span>
                <span className="mono ink-mute">{fmtPEN(tax)}</span>
              </div>
              <div className="invoice-preview-row invoice-preview-row-total">
                <span className="ink-strong">Total a cobrar</span>
                <span className="mono ink-strong">{fmtPEN(amtNum)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={!project || amtNum <= 0}
            onClick={() => onCreate({
              id: nextId,
              client: clientId,
              project,
              amount: amtNum,
              issued: "12 Set",
              due: `${12 + dueIn} Set`,
              status: "pending",
            })}
          >
            <Icon name="check" size={14}/> Crear y enviar
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { InvoicesView, NewInvoiceModal });
