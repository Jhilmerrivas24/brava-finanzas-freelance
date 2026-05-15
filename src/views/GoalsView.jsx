import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { GOAL_COLORS, fmtPEN } from '../data.js'

function GoalModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ?? {
    name: '', current: '0', target: '', eta: '', color: GOAL_COLORS[0],
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.name.trim() && Number(form.target) > 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Nueva'} meta</div>
            <h2 className="modal-title">{form.name || 'Nueva meta de ahorro'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Nombre de la meta</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ej. Fondo de emergencia, iMac, Vacaciones…"/>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Monto objetivo</label>
              <input type="number" min="0" step="100" value={form.target}
                onChange={e => set('target', e.target.value)} placeholder="0"/>
            </div>
            <div className="field">
              <label>Ahorrado hasta ahora</label>
              <input type="number" min="0" step="100" value={form.current}
                onChange={e => set('current', e.target.value)} placeholder="0"/>
            </div>
          </div>
          <div className="field">
            <label>Fecha objetivo (opcional)</label>
            <input type="text" value={form.eta} onChange={e => set('eta', e.target.value)}
              placeholder="Ej. Dic 2026"/>
          </div>
          <div className="field">
            <label>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {GOAL_COLORS.map(c => (
                <button key={c} type="button" onClick={() => set('color', c)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
                  outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                  outlineOffset: 2, cursor: 'pointer',
                }}/>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave({
            ...form, current: Number(form.current) || 0, target: Number(form.target),
          })}>
            <Icon name="check" size={14}/> {initial ? 'Guardar cambios' : 'Crear meta'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AportarModal({ goal, onSave, onClose }) {
  const [amount, setAmount] = useState('')
  const num = Number(amount) || 0
  const newTotal = goal.current + num
  const overshot = newTotal > goal.target

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">Aportar a meta</div>
            <h2 className="modal-title">{goal.name}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--bg-sunk)', borderRadius: 10, padding: '12px 14px', fontSize: 13, marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="ink-mute">Ahorrado</span>
              <span className="mono ink-strong">{fmtPEN(goal.current, { decimals: 0 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="ink-mute">Objetivo</span>
              <span className="mono ink-mute">{fmtPEN(goal.target, { decimals: 0 })}</span>
            </div>
          </div>
          <div className="field">
            <label>Monto a aportar</label>
            <div className="amount-input">
              <span className="amount-prefix mono">S/</span>
              <input type="text" inputMode="decimal" className="amount-field mono" autoFocus
                value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/>
            </div>
            {num > 0 && (
              <span className="field-hint" style={{ color: overshot ? 'var(--warn)' : 'var(--good)' }}>
                Nuevo total: {fmtPEN(Math.min(newTotal, goal.target), { decimals: 0 })}
                {overshot ? ' — se ajustará al 100%' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={num <= 0}
            onClick={() => onSave(Math.min(newTotal, goal.target))}>
            <Icon name="check" size={14}/> Confirmar aporte
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GoalsView({ goals, onAddGoal, onEditGoal, onDeleteGoal, onAportar }) {
  const [modal, setModal] = useState(null)
  const [aportar, setAportar] = useState(null)

  function handleSave(data) {
    if (modal === 'new') onAddGoal({ ...data, id: 'g-' + Date.now() })
    else onEditGoal({ ...modal.goal, ...data })
    setModal(null)
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">{goals.length} metas activas</div>
          <h1>Metas de ahorro</h1>
          <p className="lede">Cubos separados de tu cuenta corriente — cada factura cobrada puede aportar un porcentaje.</p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14}/> Nueva meta
          </button>
        </div>
      </header>

      {goals.length === 0
        ? <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="goals" size={22}/></div>
              <h3>Sin metas de ahorro</h3>
              <p>Define hacia dónde va tu dinero: emergencias, equipo, vacaciones o lo que quieras.</p>
              <button className="btn btn-primary btn-xs" onClick={() => setModal('new')}>+ Crear primera meta</button>
            </div>
          </div>
        : <section className="goals-grid">
            {goals.map(g => {
              const p = Math.min(g.current / g.target, 1)
              const missing = g.target - g.current
              return (
                <div key={g.id} className="goal-card">
                  <div className="goal-card-head">
                    <div>
                      <div className="ink-strong" style={{ fontSize: 17 }}>{g.name}</div>
                      {g.eta && <div className="ink-mute">Objetivo · {g.eta}</div>}
                    </div>
                    <div className="goal-pct mono" style={{ color: g.color }}>{(p * 100).toFixed(0)}%</div>
                  </div>
                  <div className="goal-progress">
                    <div className="goal-progress-track">
                      <div className="goal-progress-fill" style={{ width: `${p * 100}%`, background: g.color }}/>
                    </div>
                  </div>
                  <div className="goal-card-stats">
                    <div>
                      <div className="lbl">Ahorrado</div>
                      <div className="num mono ink-strong">{fmtPEN(g.current, { decimals: 0 })}</div>
                    </div>
                    <div>
                      <div className="lbl">Meta</div>
                      <div className="num mono">{fmtPEN(g.target, { decimals: 0 })}</div>
                    </div>
                    <div>
                      <div className="lbl">Falta</div>
                      <div className="num mono ink-mute">{missing > 0 ? fmtPEN(missing, { decimals: 0 }) : '¡Logrado!'}</div>
                    </div>
                  </div>
                  <div className="goal-card-actions">
                    <button className="btn btn-soft btn-xs" onClick={() => setAportar(g)}>
                      <Icon name="plus" size={12}/> Aportar
                    </button>
                    <button className="btn btn-xs btn-ghost" onClick={() => setModal({ goal: g })}>
                      <Icon name="settings" size={12}/> Editar
                    </button>
                    <button className="btn btn-xs btn-quiet" style={{ color: 'var(--bad)', marginLeft: 'auto' }}
                      onClick={() => { if (window.confirm(`¿Eliminar "${g.name}"?`)) onDeleteGoal(g.id) }}>
                      <Icon name="close" size={12}/>
                    </button>
                  </div>
                </div>
              )
            })}
          </section>
      }

      {modal && <GoalModal initial={modal === 'new' ? null : modal.goal} onSave={handleSave} onClose={() => setModal(null)}/>}
      {aportar && (
        <AportarModal
          goal={aportar}
          onSave={(newCurrent) => { onAportar(aportar.id, newCurrent); setAportar(null) }}
          onClose={() => setAportar(null)}
        />
      )}
    </div>
  )
}
