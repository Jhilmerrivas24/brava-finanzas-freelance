import { useState, useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'
import { useDialog } from '../hooks/useDialog.js'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, hoverLift, tapScale } from '../lib/animations.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const TIPO_LABEL = {
  corriente: 'Cta. corriente',
  ahorros:   'Ahorros',
  digital:   'Billetera digital',
  negocio:   'Cuenta negocio',
  otro:      'Otro',
}
const TIPO_COLOR = {
  corriente: '#3b82f6',
  ahorros:   '#10b981',
  digital:   '#8b5cf6',
  negocio:   '#f59e0b',
  otro:      '#6b7280',
}

// ── Account modal ─────────────────────────────────────────────────────────────
function AccountModal({ initial, onSave, onClose }) {
  const defaults = {
    nombre: initial?.nombre ?? initial?.bank ?? '',
    banco:  initial?.banco  ?? initial?.bank ?? '',
    tipo:   initial?.tipo   ?? 'corriente',
    saldo:  String(initial?.saldo ?? initial?.balance ?? ''),
    moneda: initial?.moneda ?? 'PEN',
    activa: initial?.activa ?? true,
  }
  const [form, setForm] = useState(defaults)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.nombre.trim() && String(form.saldo).trim() !== '' && Number(form.saldo) >= 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{initial ? 'Editar' : 'Agregar'} cuenta</div>
            <h2 className="modal-title">{form.nombre || 'Nueva cuenta'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <div className="field" style={{ flex: 2 }}>
              <label>Nombre de la cuenta</label>
              <input
                type="text" value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                placeholder="Ej. BCP Corriente, Yape personal…"
                autoFocus
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Banco / Entidad</label>
              <input
                type="text" value={form.banco}
                onChange={e => set('banco', e.target.value)}
                placeholder="BCP, BBVA…"
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Tipo de cuenta</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="corriente">Cuenta corriente</option>
                <option value="ahorros">Cuenta de ahorros</option>
                <option value="digital">Billetera digital</option>
                <option value="negocio">Cuenta negocio</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="field">
              <label>Moneda</label>
              <select value={form.moneda} onChange={e => set('moneda', e.target.value)}>
                <option value="PEN">Soles (PEN)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Saldo actual</label>
              <div className="amount-input">
                <span className="amount-prefix mono">{form.moneda === 'USD' ? 'US$' : 'S/'}</span>
                <input
                  type="text" inputMode="decimal" className="amount-field mono"
                  value={form.saldo}
                  onChange={e => set('saldo', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 'auto', paddingBottom: 8 }}>
                <input
                  type="checkbox" checked={form.activa}
                  onChange={e => set('activa', e.target.checked)}
                />
                <span>Cuenta activa</span>
              </label>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onSave({
              nombre:  form.nombre,
              banco:   form.banco || form.nombre,
              tipo:    form.tipo,
              saldo:   Number(form.saldo) || 0,
              moneda:  form.moneda,
              activa:  form.activa,
              // backward-compat fields
              bank:    form.banco || form.nombre,
              balance: Number(form.saldo) || 0,
              type:    TIPO_LABEL[form.tipo] ?? form.tipo,
            })}>
            <Icon name="check" size={14}/> {initial ? 'Guardar cambios' : 'Agregar cuenta'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Manual movement modal ─────────────────────────────────────────────────────
function MovementModal({ account, onSave, onClose }) {
  const [form, setForm] = useState({ type: 'income', description: '', amount: '', date: new Date().toISOString().split('T')[0] })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.description.trim() && Number(form.amount) > 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{account.nombre ?? account.bank} · Movimiento</div>
            <h2 className="modal-title">Registrar movimiento</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Tipo</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['income','Entrada'],['expense','Salida']].map(([v, l]) => (
                <button
                  key={v}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                    border: `2px solid ${form.type === v ? 'var(--accent)' : 'var(--border)'}`,
                    background: form.type === v ? 'color-mix(in srgb, var(--accent) 12%, var(--bg-elev))' : 'var(--bg-elev)',
                    fontWeight: form.type === v ? 700 : 400,
                    color: form.type === v ? 'var(--accent)' : 'var(--ink-mute)',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => set('type', v)}
                >{l}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Descripción</label>
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Ej. Cobro cliente, retiro efectivo…" autoFocus />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Monto</label>
              <div className="amount-input">
                <span className="amount-prefix mono">S/</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onSave({
              id:          'mov-' + Date.now(),
              accountId:   account.id,
              type:        form.type,
              description: form.description,
              amount:      Number(form.amount) || 0,
              delta:       form.type === 'income' ? Number(form.amount) : -(Number(form.amount)),
              date:        form.date,
            })}>
            <Icon name="check" size={14}/> Registrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function AccountsView({
  accounts = [],
  accountMovements = [],
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onAddAccountMovement,
}) {
  const dialog      = useDialog()
  const [modal, setModal]           = useState(null) // null | 'new' | { account }
  const [movModal, setMovModal]     = useState(null) // null | { account }
  const [selectedId, setSelectedId] = useState(null)

  // Normalize: merge old/new field shapes
  const normalized = accounts.map(a => ({
    ...a,
    nombre: a.nombre ?? a.bank ?? '(sin nombre)',
    banco:  a.banco  ?? a.bank ?? '',
    tipo:   a.tipo   ?? 'corriente',
    saldo:  a.saldo  ?? a.balance ?? 0,
    moneda: a.moneda ?? 'PEN',
    activa: a.activa ?? true,
  }))

  const active   = normalized.filter(a => a.activa !== false)
  const inactive = normalized.filter(a => a.activa === false)

  // Totals
  const totalPEN = active.filter(a => a.moneda === 'PEN').reduce((s, a) => s + a.saldo, 0)
  const totalUSD = active.filter(a => a.moneda === 'USD').reduce((s, a) => s + a.saldo, 0)

  const byTipo = useMemo(() => {
    const map = {}
    active.forEach(a => {
      if (a.moneda !== 'PEN') return
      if (!map[a.tipo]) map[a.tipo] = 0
      map[a.tipo] += a.saldo
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [active])

  // Movements for selected account (or all)
  const selectedAccount = selectedId ? normalized.find(a => a.id === selectedId) : null
  const movements = (selectedId
    ? accountMovements.filter(m => m.accountId === selectedId)
    : accountMovements
  ).slice().sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleSave(data) {
    if (modal === 'new') {
      onAddAccount({ ...data, id: 'acc-' + Date.now(), createdAt: new Date().toISOString() })
    } else {
      onEditAccount({ ...modal.account, ...data })
    }
    setModal(null)
  }

  async function handleDelete(a) {
    const ok = await dialog.danger({ title: 'Eliminar cuenta', itemName: a.nombre })
    if (ok) {
      onDeleteAccount(a.id)
      if (selectedId === a.id) setSelectedId(null)
    }
  }

  function handleMovSave(mov) {
    onAddAccountMovement(mov)
    setMovModal(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="view">
      {/* Header */}
      <header className="view-header">
        <div>
          <div className="eyebrow">Liquidez real</div>
          <h1>Cuentas bancarias</h1>
          <p className="lede">
            Rastrea el dinero en cada cuenta y billetera. Los cobros de facturas se registran aquí automáticamente.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14} /> Nueva cuenta
          </button>
        </div>
      </header>

      {/* KPI summary row */}
      <motion.section
        className="kpi-row"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        style={{ marginBottom: 28 }}
      >
        <motion.div className="kpi kpi-accent" variants={staggerItem} whileHover={hoverLift}>
          <div className="kpi-label">Total disponible (PEN)</div>
          <div className="kpi-value">{fmtPEN(totalPEN)}</div>
          <div className="kpi-foot">{active.filter(a => a.moneda === 'PEN').length} cuenta(s) activa(s)</div>
        </motion.div>
        {totalUSD > 0 && (
          <motion.div className="kpi" variants={staggerItem} whileHover={hoverLift}>
            <div className="kpi-label">Total en dólares</div>
            <div className="kpi-value">US$ {totalUSD.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
            <div className="kpi-foot">{active.filter(a => a.moneda === 'USD').length} cuenta(s) USD</div>
          </motion.div>
        )}
        {byTipo.map(([tipo, total]) => (
          <motion.div key={tipo} className="kpi" variants={staggerItem} whileHover={hoverLift}>
            <div className="kpi-label" style={{ color: TIPO_COLOR[tipo] }}>{TIPO_LABEL[tipo] ?? tipo}</div>
            <div className="kpi-value">{fmtPEN(total)}</div>
            <div className="kpi-foot">{active.filter(a => a.tipo === tipo).length} cuenta(s)</div>
          </motion.div>
        ))}
      </motion.section>

      {/* Account cards */}
      {active.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
          <h3 style={{ marginBottom: 8 }}>Sin cuentas registradas</h3>
          <p style={{ color: 'var(--ink-mute)', marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
            Agrega tus cuentas bancarias y billeteras digitales para rastrear tu liquidez real.
          </p>
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Icon name="plus" size={14} /> Agregar primera cuenta
          </button>
        </div>
      ) : (
        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {active.map(a => {
            const movCount = accountMovements.filter(m => m.accountId === a.id).length
            const isSelected = selectedId === a.id
            return (
              <motion.div
                key={a.id}
                className="card"
                variants={staggerItem}
                whileHover={hoverLift}
                whileTap={tapScale}
                style={{
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                  transition: 'border-color 0.15s',
                }}
                onClick={() => setSelectedId(isSelected ? null : a.id)}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `color-mix(in srgb, ${TIPO_COLOR[a.tipo]} 18%, var(--bg-elev))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: TIPO_COLOR[a.tipo],
                  }}>
                    <Icon name="bank" size={18} />
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-xs btn-ghost"
                      title="Registrar movimiento"
                      onClick={e => { e.stopPropagation(); setMovModal({ account: a }) }}
                    >
                      <Icon name="plus" size={11} />
                    </button>
                    <button
                      className="btn btn-xs btn-ghost"
                      title="Editar cuenta"
                      onClick={e => { e.stopPropagation(); setModal({ account: a }) }}
                    >
                      <Icon name="edit" size={11} />
                    </button>
                    <button
                      className="btn btn-xs btn-ghost"
                      style={{ color: 'var(--bad)' }}
                      title="Eliminar cuenta"
                      onClick={e => { e.stopPropagation(); handleDelete(a) }}
                    >
                      <Icon name="trash" size={11} />
                    </button>
                  </div>
                </div>

                {/* Bank + name */}
                {a.banco && a.banco !== a.nombre && (
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 2 }}>{a.banco}</div>
                )}
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{a.nombre}</div>

                {/* Tipo pill */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, padding: '2px 8px', borderRadius: 4,
                  background: `color-mix(in srgb, ${TIPO_COLOR[a.tipo]} 15%, var(--bg-elev))`,
                  color: TIPO_COLOR[a.tipo],
                  marginBottom: 14,
                }}>
                  {TIPO_LABEL[a.tipo] ?? a.tipo}
                  {a.moneda !== 'PEN' && ` · ${a.moneda}`}
                </div>

                {/* Saldo */}
                <div style={{
                  fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono, monospace)',
                  color: a.saldo < 0 ? 'var(--bad)' : 'var(--ink)',
                  letterSpacing: '-0.02em',
                }}>
                  {a.moneda === 'USD' ? 'US$ ' : 'S/ '}
                  {Math.abs(a.saldo).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </div>

                {/* Movement count + selected hint */}
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-faint)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{movCount > 0 ? `${movCount} movimiento(s)` : 'Sin movimientos'}</span>
                  {isSelected && <span style={{ color: 'var(--accent)' }}>← viendo historial</span>}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Inactive accounts (collapsed) */}
      {inactive.length > 0 && (
        <div style={{ marginBottom: 24, opacity: 0.6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-mute)', marginBottom: 8 }}>
            Cuentas inactivas ({inactive.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {inactive.map(a => (
              <div key={a.id} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12,
                border: '1px solid var(--border)', background: 'var(--bg-elev)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Icon name="bank" size={12} />
                <span>{a.nombre}</span>
                <span className="mono" style={{ color: 'var(--ink-mute)' }}>{fmtPEN(a.saldo)}</span>
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => onEditAccount({ ...a, activa: true })}
                  title="Reactivar"
                >
                  ↩
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Movement history */}
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-eyebrow">
              {selectedAccount
                ? `${selectedAccount.nombre} · ${accountMovements.filter(m => m.accountId === selectedAccount.id).length} registros`
                : `Todos · ${accountMovements.length} registro(s)`}
            </div>
            <h3 className="card-title">Historial de movimientos</h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {selectedId && (
              <button className="btn btn-ghost btn-xs" onClick={() => setSelectedId(null)}>
                Ver todas
              </button>
            )}
            {selectedAccount && onAddAccountMovement && (
              <button className="btn btn-primary btn-xs" onClick={() => setMovModal({ account: selectedAccount })}>
                <Icon name="plus" size={11} /> Movimiento
              </button>
            )}
          </div>
        </div>

        {movements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-mute)', fontSize: 13 }}>
            {selectedId
              ? 'Esta cuenta no tiene movimientos aún. Los cobros de facturas se registran automáticamente.'
              : 'Sin movimientos. Cobra una factura o regístralo manualmente.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  {!selectedId && <th>Cuenta</th>}
                  <th style={{ textAlign: 'center' }}>Tipo</th>
                  <th className="num-col">Monto</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 30).map(m => {
                  const acc = normalized.find(a => a.id === m.accountId)
                  return (
                    <tr key={m.id}>
                      <td className="ink-mute mono" style={{ whiteSpace: 'nowrap' }}>
                        {m.date || '—'}
                      </td>
                      <td style={{ maxWidth: 260 }}>{m.description || '—'}</td>
                      {!selectedId && (
                        <td className="ink-mute" style={{ fontSize: 12 }}>
                          {acc?.nombre ?? '—'}
                        </td>
                      )}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: 11, padding: '2px 8px', borderRadius: 4,
                          background: m.type === 'income'
                            ? 'color-mix(in srgb, var(--good) 15%, var(--bg-elev))'
                            : 'color-mix(in srgb, var(--bad) 15%, var(--bg-elev))',
                          color: m.type === 'income' ? 'var(--good)' : 'var(--bad)',
                        }}>
                          {m.type === 'income' ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td
                        className="num-col mono"
                        style={{
                          fontWeight: 600,
                          color: m.type === 'income' ? 'var(--good)' : 'var(--bad)',
                        }}
                      >
                        {m.type === 'income' ? '+' : '−'}&nbsp;
                        {fmtPEN(Math.abs(m.amount || m.delta || 0))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {movements.length > 30 && (
              <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: 'var(--ink-mute)' }}>
                Mostrando los últimos 30 de {movements.length} movimientos.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal && (
        <AccountModal
          initial={modal === 'new' ? null : modal.account}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {movModal && (
        <MovementModal
          account={movModal.account}
          onSave={handleMovSave}
          onClose={() => setMovModal(null)}
        />
      )}
    </div>
  )
}
