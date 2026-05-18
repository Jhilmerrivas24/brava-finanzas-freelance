import { useState, useEffect } from 'react'
import Icon from './Icon.jsx'

const NAV_SECTIONS = [
  {
    id:    'principal',
    label: 'Principal',
    items: [
      { id: 'overview',  label: 'Resumen',        icon: 'dashboard' },
      { id: 'quotes',    label: 'Cotizaciones',   icon: 'quote'     },
      { id: 'invoices',  label: 'Facturas',       icon: 'invoice'   },
      { id: 'clients',   label: 'Clientes',       icon: 'clients'   },
    ],
  },
  {
    id:    'ingresos',
    label: 'Ingresos',
    items: [
      { id: 'ingresos',  label: 'Ingresos fijos', icon: 'cashflow'  },
    ],
  },
  {
    id:    'gastos',
    label: 'Gastos',
    items: [
      { id: 'daily',     label: 'Gastos del día',  icon: 'wallet'   },
      { id: 'gastos',    label: 'Gastos recurrentes', icon: 'bills'  },
      { id: 'budget',    label: 'Presupuesto',     icon: 'filter'   },
    ],
  },
  {
    id:    'finanzas',
    label: 'Finanzas',
    items: [
      { id: 'accounts',  label: 'Cuentas',         icon: 'bank'     },
      { id: 'credit',    label: 'Tarjetas',        icon: 'card'     },
      { id: 'loans',     label: 'Préstamos',       icon: 'wallet'   },
      { id: 'payments',  label: 'Pagos del mes',   icon: 'check'    },
      { id: 'cashflow',  label: 'Flujo de caja',   icon: 'cashflow' },
    ],
  },
  {
    id:    'reportes',
    label: 'Reportes',
    items: [
      { id: 'taxes',     label: 'Impuestos',       icon: 'taxes'    },
      { id: 'goals',     label: 'Metas',           icon: 'goals'    },
      { id: 'consejos',  label: 'Sugerencias',     icon: 'sparkle'  },
    ],
  },
]

const COLLAPSE_KEY = 'brava:sidebarCollapsed'

function loadCollapsed() {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}') } catch { return {} }
}

export default function Sidebar({
  view, setView, initials, displayName, displayRole,
  onSignOut, userEmail, isOpen, onClose, badges = {},
}) {
  // Which sections are collapsed — default: all open
  const [collapsed, setCollapsed] = useState(loadCollapsed)

  // Auto-expand section that contains the active view
  useEffect(() => {
    const activeSection = NAV_SECTIONS.find(s => s.items.some(i => i.id === view))
    if (activeSection && collapsed[activeSection.id]) {
      setCollapsed(c => {
        const next = { ...c }
        delete next[activeSection.id]
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next))
        return next
      })
    }
  // eslint-disable-next-line
  }, [view])

  function toggleSection(sectionId) {
    setCollapsed(c => {
      const next = { ...c }
      if (next[sectionId]) delete next[sectionId]
      else next[sectionId] = true
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next))
      return next
    })
  }

  // Count badges per section
  function sectionBadge(section) {
    return section.items.reduce((s, item) => s + (badges[item.id] ?? 0), 0)
  }

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-is-open' : ''}`}>
      {/* Brand */}
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

      {/* User button */}
      <button className="sidebar-user" onClick={() => setView('settings')}
        style={{ textAlign: 'left', cursor: 'pointer' }}>
        <div className="avatar avatar-lg"
          style={{ background: 'linear-gradient(135deg,#c2410c,#7c2d12)', flexShrink: 0 }}>
          {initials || '?'}
        </div>
        <div className="sidebar-user-meta">
          <div className="sidebar-user-name">{displayName}</div>
          <div className="sidebar-user-role">{displayRole}</div>
        </div>
      </button>

      {/* Sectioned nav */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map(section => {
          const isCollapsed = !!collapsed[section.id]
          const secBadge    = sectionBadge(section)
          const hasActive   = section.items.some(i => i.id === view)

          return (
            <div key={section.id} style={{ marginBottom: 2 }}>
              {/* Section header — clickable to collapse */}
              <button
                onClick={() => toggleSection(section.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '6px 12px 4px',
                  gap: 6,
                }}
              >
                <span style={{
                  flex: 1, textAlign: 'left',
                  fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  color: hasActive ? 'var(--accent)' : 'var(--ink-faint)',
                  transition: 'color .15s',
                }}>
                  {section.label}
                </span>
                {secBadge > 0 && !isCollapsed && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, lineHeight: 1,
                    padding: '2px 5px', borderRadius: 999,
                    background: 'var(--bad)', color: '#fff',
                    minWidth: 16, textAlign: 'center',
                  }}>
                    {secBadge}
                  </span>
                )}
                <span style={{
                  display: 'inline-flex', flexShrink: 0,
                  transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                  transition: 'transform .15s',
                  color: 'var(--ink-faint)',
                  opacity: 0.5,
                }}>
                  <Icon name="chevron" size={10}/>
                </span>
              </button>

              {/* Items */}
              {!isCollapsed && section.items.map(item => {
                const badge = badges[item.id] ?? 0
                return (
                  <button
                    key={item.id}
                    className={`sidebar-item ${view === item.id ? 'is-active' : ''}`}
                    onClick={() => setView(item.id)}
                    style={{ position: 'relative' }}
                  >
                    <Icon name={item.icon} size={16}/>
                    <span className="sidebar-label">{item.label}</span>
                    {badge > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: 10, fontWeight: 700, lineHeight: 1,
                        padding: '2px 6px', borderRadius: 999,
                        background: view === item.id ? 'rgba(255,255,255,0.25)' : 'var(--bad)',
                        color: '#fff',
                        minWidth: 18, textAlign: 'center',
                      }}>
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className={`sidebar-item ${view === 'settings' ? 'is-active' : ''}`}
          onClick={() => setView('settings')}
        >
          <Icon name="settings" size={16}/>
          <span className="sidebar-label">Ajustes</span>
        </button>

        {onSignOut && (
          <>
            {userEmail && (
              <div style={{
                padding: '4px 12px 2px', fontSize: 10,
                color: 'var(--ink-faint)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {userEmail}
              </div>
            )}
            <button className="sidebar-item" onClick={onSignOut}
              style={{ color: 'var(--bad)', opacity: 0.8 }}>
              <Icon name="close" size={16}/>
              <span className="sidebar-label">Cerrar sesión</span>
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
