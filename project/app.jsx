// Brava — root app

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "sidebarHidden": false,
  "preset": "great"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = React.useState("overview");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [invoices, setInvoices] = React.useState(() => makeInvoices(t.preset));

  // When preset changes, regenerate invoices
  React.useEffect(() => {
    setInvoices(makeInvoices(t.preset));
  }, [t.preset]);

  // Apply dark mode
  React.useEffect(() => {
    document.documentElement.dataset.theme = t.dark ? "dark" : "light";
  }, [t.dark]);

  const data = t.preset === "great" ? GREAT_MONTH : SLOW_MONTH;

  const markPaid = (id) => setInvoices(invs => invs.map(i => i.id === id ? { ...i, status: "paid" } : i));
  const markUndo = (id) => setInvoices(invs => invs.map(i => i.id === id ? { ...i, status: "pending" } : i));

  const nextId = "INV-0" + (150 + invoices.filter(i => !["INV-0142","INV-0143","INV-0144","INV-0145","INV-0146","INV-0147","INV-0148","INV-0149"].includes(i.id)).length);

  const createInvoice = (inv) => {
    setInvoices(invs => [inv, ...invs]);
    setModalOpen(false);
    setView("invoices");
  };

  const props = {
    data,
    preset: t.preset,
    invoices,
    onMarkPaid: markPaid,
    onNewInvoice: () => setModalOpen(true),
    onGoto: setView,
    onUndo: markUndo,
  };

  return (
    <div className={`app ${t.sidebarHidden ? "sidebar-hidden" : ""}`} data-screen-label={`Brava — ${view}`}>
      {!t.sidebarHidden && <Sidebar view={view} setView={setView} collapsed={false}/>}

      <main className="main">
        <div className="topbar">
          <div className="topbar-search">
            <Icon name="search" size={14}/>
            <input type="text" placeholder="Buscar facturas, clientes, transacciones…"/>
            <span className="kbd">⌘K</span>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={() => setTweak("dark", !t.dark)} title="Cambiar tema">
              <Icon name={t.dark ? "sun" : "moon"} size={16}/>
            </button>
            <button className="icon-btn" title="Notificaciones">
              <Icon name="bell" size={16}/>
              <span className="dot-badge"/>
            </button>
            <div className="topbar-user">
              <div className="avatar" style={{ background: "linear-gradient(135deg,#c2410c,#7c2d12)", width: 28, height: 28, fontSize: 11 }}>AR</div>
              <div className="topbar-user-name">Ana Reyes</div>
              <Icon name="chevron" size={12}/>
            </div>
          </div>
        </div>

        <div className="scroll">
          {view === "overview"  && <Overview {...props}/>}
          {view === "invoices"  && <InvoicesView {...props}/>}
          {view === "clients"   && <ClientsView {...props}/>}
          {view === "cashflow"  && <CashflowView {...props}/>}
          {view === "taxes"     && <TaxesView {...props}/>}
          {view === "goals"     && <GoalsView {...props}/>}
          {view === "bills"     && <BillsView {...props}/>}
        </div>
      </main>

      {modalOpen && <NewInvoiceModal onClose={() => setModalOpen(false)} onCreate={createInvoice} nextId={nextId}/>}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Apariencia">
          <TweakToggle label="Modo oscuro" value={t.dark} onChange={v => setTweak("dark", v)}/>
          <TweakToggle label="Ocultar barra lateral" value={t.sidebarHidden} onChange={v => setTweak("sidebarHidden", v)}/>
        </TweakSection>
        <TweakSection label="Datos de muestra">
          <TweakRadio
            label="Preset"
            value={t.preset}
            options={[
              { value: "great", label: "Mes fuerte" },
              { value: "slow",  label: "Mes flojo" },
            ]}
            onChange={v => setTweak("preset", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
