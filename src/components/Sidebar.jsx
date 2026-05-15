import Icon from './Icon.jsx'
import Bar from './Bar.jsx'

const NAV_ITEMS = [
  { id: 'overview',  label: 'Resumen',        icon: 'dashboard' },
  { id: 'quotes',    label: 'Cotizaciones',   icon: 'quote'     },
  { id: 'invoices',  label: 'Facturas',       icon: 'invoice'   },
  { id: 'clients',   label: 'Clientes',       icon: 'clients'   },
  { id: 'cashflow',  label: 'Flujo de caja',  icon: 'cashflow'  },
  { id: 'taxes',     label: 'Impuestos',      icon: 'taxes'     },
  { id: 'goals',     label: 'Metas',          icon: 'goals'     },
  { id: 'bills',     label: 'Gastos fijos',   icon: 'bills'     },
  { id: 'ingresos',  label: 'Ingresos fijos', icon: 'cashflow'  },
  { id: 'consejos',  label: 'Sugerencias',    icon: 'sparkle'   },
]

export default function Sidebar({ view, setView, initials, displayName, displayRole }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <rect x="2" y="2" width="20" height="20" rx="6" fill="var(--accent)" />
            <path d="M8 16V8h4.2c1.7 0 2.8.9 2.8 2.3 0 1-.6 1.7-1.5 1.9 1.1.2 1.8 1 1.8 2.1 0 1.5-1.1 2.4-2.9 2.4H8zm2-4.8h1.8c.7 0 1.2-.3 1.2-1s-.5-1-1.2-1H10v2zm0 3.2h1.9c.8 0 1.3-.4 1.3-1.1s-.5-1.1-1.3-1.1H10v2.2z" fill="#fff" />
          </svg>
        </div>
        <div className="brand-text">
          <div className="brand-name">Brava</div>
          <div className="brand-sub">Finanzas freelance</div>
        </div>
      </div>

      <button className="sidebar-user" onClick={() => setView('settings')} style={{ textAlign: 'left', cursor: 'pointer' }}>
        <div
          className="avatar avatar-lg"
          style={{ background: 'linear-gradient(135deg,#c2410c,#7c2d12)', flexShrink: 0 }}
        >
          {initials || '?'}
        </div>
        <div className="sidebar-user-meta">
          <div className="sidebar-user-name">{displayName}</div>
          <div className="sidebar-user-role">{displayRole}</div>
        </div>
      </button>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Trabajo</div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${view === item.id ? 'is-active' : ''}`}
            onClick={() => setView(item.id)}
          >
            <Icon name={item.icon} size={16} />
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className={`sidebar-item ${view === 'settings' ? 'is-active' : ''}`}
          onClick={() => setView('settings')}
        >
          <Icon name="settings" size={16} />
          <span className="sidebar-label">Ajustes</span>
        </button>
      </div>
    </aside>
  )
}
