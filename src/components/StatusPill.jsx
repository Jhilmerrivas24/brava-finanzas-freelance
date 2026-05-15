const STATUS_MAP = {
  paid:    { label: 'Pagada',    cls: 'pill-good' },
  pending: { label: 'Pendiente', cls: 'pill-warn' },
  overdue: { label: 'Vencida',   cls: 'pill-bad'  },
  draft:   { label: 'Borrador',  cls: 'pill-mute' },
}

export default function StatusPill({ status }) {
  const m = STATUS_MAP[status] || STATUS_MAP.draft
  return <span className={`pill ${m.cls}`}>{m.label}</span>
}
