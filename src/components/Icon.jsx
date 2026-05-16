export default function Icon({ name, size = 16 }) {
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
    bank:       <><path d="M3 10l9-6 9 6"/><path d="M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18"/></>,
    sparkle:    <><path d="M12 3l1.8 5.5L19 10l-5.2 1.5L12 17l-1.8-5.5L5 10l5.2-1.5z"/><path d="M19 3l.9 2.6L22.5 7l-2.6.9L19 10.5l-.9-2.6L15.5 7l2.6-.9z"/></>,
    trash:      <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></>,
    quote:      <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></>,
    edit:       <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    card:       <><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><path d="M7 15h3M14 15h4"/></>,
    wallet:     <><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><circle cx="17" cy="12" r="2"/><path d="M17 10h4v4h-4"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.dashboard}
    </svg>
  )
}
