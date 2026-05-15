// Sidebar — collapsible nav

function Sidebar({ view, setView, collapsed }) {
  const items = [
    { id: "overview",  label: "Resumen",      icon: "dashboard" },
    { id: "invoices",  label: "Facturas",     icon: "invoice", badge: 4 },
    { id: "clients",   label: "Clientes",     icon: "clients" },
    { id: "cashflow",  label: "Flujo de caja", icon: "cashflow" },
    { id: "taxes",     label: "Impuestos",    icon: "taxes" },
    { id: "goals",     label: "Metas",        icon: "goals" },
    { id: "bills",     label: "Gastos fijos", icon: "bills" },
  ];

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <rect x="2" y="2" width="20" height="20" rx="6" fill="var(--accent)"/>
            <path d="M8 16V8h4.2c1.7 0 2.8.9 2.8 2.3 0 1-.6 1.7-1.5 1.9 1.1.2 1.8 1 1.8 2.1 0 1.5-1.1 2.4-2.9 2.4H8zm2-4.8h1.8c.7 0 1.2-.3 1.2-1s-.5-1-1.2-1H10v2zm0 3.2h1.9c.8 0 1.3-.4 1.3-1.1s-.5-1.1-1.3-1.1H10v2.2z" fill="#fff"/>
          </svg>
        </div>
        <div className="brand-text">
          <div className="brand-name">Brava</div>
          <div className="brand-sub">Finanzas freelance</div>
        </div>
      </div>

      <div className="sidebar-user">
        <div className="avatar avatar-lg" style={{ background: "linear-gradient(135deg,#c2410c,#7c2d12)" }}>AR</div>
        <div className="sidebar-user-meta">
          <div className="sidebar-user-name">Ana Reyes</div>
          <div className="sidebar-user-role">Diseñadora · Lima</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Trabajo</div>
        {items.map(it => (
          <button
            key={it.id}
            className={`sidebar-item ${view === it.id ? "is-active" : ""}`}
            onClick={() => setView(it.id)}
          >
            <Icon name={it.icon} size={16}/>
            <span className="sidebar-label">{it.label}</span>
            {it.badge ? <span className="sidebar-badge">{it.badge}</span> : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-card">
          <div className="sidebar-card-title">Próxima declaración</div>
          <div className="sidebar-card-amount">S/ 4,605</div>
          <div className="sidebar-card-meta">a reservar antes del 17 Oct</div>
          <Bar value={0.83} />
        </div>
        <button className="sidebar-item sidebar-item-quiet">
          <Icon name="settings" size={16}/>
          <span className="sidebar-label">Ajustes</span>
        </button>
      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar });
