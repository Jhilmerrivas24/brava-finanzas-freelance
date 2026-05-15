// Reusable inline SVG charts and small visual atoms.

function Sparkline({ data, height = 40, width = 120, stroke = "var(--accent)", fill = "var(--accent-soft)" }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => [i * stepX, height - ((v - min) / range) * (height - 4) - 2]);
  const path = points.map(([x,y],i) => `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ overflow: "visible" }}>
      <path d={area} fill={fill} opacity="0.4" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Bar pair chart — income vs expenses per month
function CashflowChart({ data, height = 220, accentIn = "var(--ink)", accentOut = "var(--accent)" }) {
  const max = Math.max(...data.flatMap(d => [d.inc, d.exp]));
  const niceMax = Math.ceil(max / 5000) * 5000;
  const cols = data.length;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

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
          const hIn = (d.inc / niceMax) * 100;
          const hOut = (d.exp / niceMax) * 100;
          return (
            <div key={i} className="cashflow-col">
              <div className="cashflow-bar-wrap">
                <div className="cashflow-bar cashflow-bar-in"  style={{ height: `${hIn}%`,  background: accentIn  }} title={`Ingresos ${fmtPEN(d.inc)}`} />
                <div className="cashflow-bar cashflow-bar-out" style={{ height: `${hOut}%`, background: accentOut }} title={`Egresos ${fmtPEN(d.exp)}`} />
              </div>
              <div className="cashflow-label">{d.m}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Donut / progress ring
function Ring({ value, size = 56, stroke = 6, color = "var(--accent)", track = "var(--border)" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, value)));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
              strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
              transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dashoffset .6s ease" }} />
    </svg>
  );
}

// Horizontal progress bar
function Bar({ value, color = "var(--accent)", track = "var(--border)" }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div style={{ background: track, borderRadius: 999, height: 6, overflow: "hidden" }}>
      <div style={{ background: color, width: `${v * 100}%`, height: "100%", borderRadius: 999, transition: "width .5s ease" }} />
    </div>
  );
}

// Status pill
function StatusPill({ status }) {
  const map = {
    paid:    { label: "Pagada",  cls: "pill-good"    },
    pending: { label: "Pendiente", cls: "pill-warn" },
    overdue: { label: "Vencida", cls: "pill-bad"     },
    draft:   { label: "Borrador", cls: "pill-mute"   },
  };
  const m = map[status] || map.draft;
  return <span className={`pill ${m.cls}`}>{m.label}</span>;
}

function Avatar({ name, color, size = 28 }) {
  const initials = name.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
  return (
    <div className="avatar" style={{ background: color, width: size, height: size, fontSize: size*0.36 }}>
      {initials}
    </div>
  );
}

function Icon({ name, size = 16 }) {
  // Minimal stroked icons. 24x24 viewBox.
  const paths = {
    dashboard:  <><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>,
    invoice:    <><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h5"/></>,
    clients:    <><circle cx="9" cy="8" r="4"/><path d="M2 21c0-3.5 3.1-6 7-6s7 2.5 7 6"/><path d="M17 11a3 3 0 1 0 0-6"/><path d="M22 21c0-2.6-2.2-4.8-5-5.4"/></>,
    cashflow:   <><path d="M3 17l5-5 4 4 8-8"/><path d="M14 8h6v6"/></>,
    taxes:      <><path d="M5 4h14l-1 16H6z"/><path d="M9 9h6M9 13h6M9 17h3"/></>,
    goals:      <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
    bills:      <><path d="M4 4h16v16H4z"/><path d="M4 9h16M9 14h6"/></>,
    settings:   <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    plus:       <><path d="M12 5v14M5 12h14"/></>,
    search:     <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    bell:       <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
    arrowUp:    <><path d="M12 19V5M5 12l7-7 7 7"/></>,
    arrowDown:  <><path d="M12 5v14M5 12l7 7 7-7"/></>,
    arrowRight: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    check:      <><path d="M5 12l5 5L20 7"/></>,
    chevron:    <><path d="M6 9l6 6 6-6"/></>,
    moon:       <><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></>,
    sun:        <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    menu:       <><path d="M3 6h18M3 12h18M3 18h18"/></>,
    close:      <><path d="M6 6l12 12M18 6L6 18"/></>,
    clock:      <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    download:   <><path d="M12 3v12M6 11l6 6 6-6"/><path d="M5 21h14"/></>,
    filter:     <><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>,
    sparkle:    <><path d="M12 3v18M3 12h18"/></>,
    bank:       <><path d="M3 10l9-6 9 6"/><path d="M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.dashboard}
    </svg>
  );
}

Object.assign(window, { Sparkline, CashflowChart, Ring, Bar, StatusPill, Avatar, Icon });
