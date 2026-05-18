import { useState, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'

const CATEGORIES = [
  { value: 'comida',          label: 'Comida',          emoji: '🍽️' },
  { value: 'transporte',      label: 'Transporte',      emoji: '🚌' },
  { value: 'servicios',       label: 'Servicios',       emoji: '💡' },
  { value: 'entretenimiento', label: 'Entretenimiento', emoji: '🎬' },
  { value: 'salud',           label: 'Salud',           emoji: '💊' },
  { value: 'ropa',            label: 'Ropa',            emoji: '👕' },
  { value: 'supermercado',    label: 'Supermercado',    emoji: '🛒' },
  { value: 'otro',            label: 'Otro',            emoji: '📦' },
]

export default function NewDailyExpenseModal({
  initial = null,
  accounts = [],
  creditLines = [],
  onSave,
  onClose,
}) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    date:        initial?.date        ?? today,
    description: initial?.description ?? '',
    amount:      initial?.amount != null ? String(initial.amount) : '',
    category:    initial?.category    ?? 'comida',
    sourceType:  initial?.sourceType  ?? 'cash',   // 'cash' | 'account' | 'credit'
    sourceId:    initial?.sourceId    ?? '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Reset sourceId when sourceType changes
  useEffect(() => {
    if (form.sourceType === 'cash') set('sourceId', '')
  }, [form.sourceType]) // eslint-disable-line

  const activeAccounts = accounts.filter(a => a.activa !== false)
  const activeCredits  = creditLines.filter(cl => cl.activa !== false)

  const valid =
    form.date.trim() &&
    form.description.trim() &&
    Number(form.amount) > 0 &&
    (form.sourceType === 'cash' || form.sourceId)

  function handleSubmit() {
    const item = {
      id:          initial?.id ?? 'de-' + Date.now(),
      date:        form.date,
      description: form.description.trim(),
      amount:      Number(form.amount),
      category:    form.category,
      sourceType:  form.sourceType,
      sourceId:    form.sourceId || null,
    }
    onSave(item)
    onClose()
  }

  const cat = CATEGORIES.find(c => c.value === form.category)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Registrar'} gasto</div>
            <h2 className="modal-title">
              {cat?.emoji} {initial ? 'Editar gasto' : 'Gasto del día'}
            </h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Date + Amount */}
          <div className="field-row">
            <div className="field" style={{ flex: 1 }}>
              <label>Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Monto</label>
              <div className="amount-input">
                <span className="amount-prefix mono">S/</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="amount-field mono"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  autoFocus={!initial}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="field">
            <label>Descripción</label>
            <input
              type="text"
              placeholder="Ej. Almuerzo en el trabajo, pasaje Metropolitano…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="field">
            <label>Categoría</label>
            <div className="cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set('category', c.value)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 4, padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${form.category === c.value ? 'var(--accent)' : 'var(--border)'}`,
                    background: form.category === c.value
                      ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-elev))'
                      : 'var(--bg-elev)',
                    transition: 'all 0.15s',
                    fontSize: 11, color: form.category === c.value ? 'var(--accent)' : 'var(--ink-mute)',
                    fontWeight: form.category === c.value ? 700 : 400,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment source */}
          <div className="field">
            <label>Pagado con</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[
                { id: 'cash',    label: 'Efectivo', icon: '💵' },
                { id: 'account', label: 'Cuenta',   icon: '🏦' },
                { id: 'credit',  label: 'Tarjeta',  icon: '💳' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => set('sourceType', opt.id)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8,
                    border: `2px solid ${form.sourceType === opt.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: form.sourceType === opt.id
                      ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-elev))'
                      : 'var(--bg-elev)',
                    cursor: 'pointer', fontSize: 12,
                    color: form.sourceType === opt.id ? 'var(--accent)' : 'var(--ink-soft)',
                    fontWeight: form.sourceType === opt.id ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{opt.icon}</div>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Account selector */}
            {form.sourceType === 'account' && (
              activeAccounts.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ink-mute)', padding: '8px 0' }}>
                  No tienes cuentas registradas. Agrégalas en Finanzas → Cuentas.
                </div>
              ) : (
                <select value={form.sourceId} onChange={e => set('sourceId', e.target.value)}>
                  <option value="">Selecciona una cuenta…</option>
                  {activeAccounts.map(a => {
                    const nombre = a.nombre ?? a.bank ?? '(sin nombre)'
                    const saldo  = a.saldo  ?? a.balance ?? 0
                    return (
                      <option key={a.id} value={a.id}>
                        {nombre} — Saldo: {fmtPEN(saldo)}
                      </option>
                    )
                  })}
                </select>
              )
            )}

            {/* Credit card selector */}
            {form.sourceType === 'credit' && (
              activeCredits.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ink-mute)', padding: '8px 0' }}>
                  No tienes tarjetas registradas. Agrégalas en Finanzas → Tarjetas.
                </div>
              ) : (
                <select value={form.sourceId} onChange={e => set('sourceId', e.target.value)}>
                  <option value="">Selecciona una tarjeta…</option>
                  {activeCredits.map(cl => {
                    const disponible = (cl.limite ?? 0) - (cl.usado ?? 0)
                    return (
                      <option key={cl.id} value={cl.id}>
                        {cl.nombre} — Disponible: {fmtPEN(disponible)}
                      </option>
                    )
                  })}
                </select>
              )
            )}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={!valid}
            onClick={handleSubmit}
          >
            <Icon name="check" size={14} />
            {initial ? 'Guardar cambios' : 'Registrar gasto'}
          </button>
        </div>
      </div>
    </div>
  )
}
