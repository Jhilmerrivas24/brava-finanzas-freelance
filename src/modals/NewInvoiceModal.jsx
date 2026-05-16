import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'

const COLORS = ['#c2410c','#15803d','#1d4ed8','#7c3aed','#0f766e','#a16207','#be185d','#0e7490']

const DOC_TYPES = [
  { value: 'factura',      label: 'Factura',      hint: 'Va a SUNAT'  },
  { value: 'rh',           label: 'RH',           hint: 'Honorarios'  },
  { value: 'boleta',       label: 'Boleta',       hint: '100% líquido'},
  { value: 'sin_declarar', label: 'Sin declarar', hint: 'No a SUNAT'  },
]

export default function NewInvoiceModal({ onClose, onCreate, nextId, settings, clients }) {
  const now      = new Date()
  const months   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']
  const issued   = `${now.getDate()} ${months[now.getMonth()]}`
  const TODAY_DD = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`

  // ── State ──────────────────────────────────────────────────────────────────
  const [docType,        setDocType]        = useState('factura')
  const [serie,          setSerie]          = useState('F001')
  const [number,         setNumber]         = useState('')
  const [clientName,     setClientName]     = useState('')
  const [clientId,       setClientId]       = useState('')
  const [clientColor,    setClientColor]    = useState(COLORS[0])
  const [clientRuc,      setClientRuc]      = useState('')
  const [project,        setProject]        = useState('')
  const [dueIn,          setDueIn]          = useState(14)
  const [amount,         setAmount]         = useState('') // base sin IGV (factura) | bruto (rh) | total (sin_declarar)
  const [igv,            setIgv]            = useState('')
  const [hasDetraction,  setHasDetraction]  = useState(false)
  const [detractionPct,  setDetractionPct]  = useState(String(settings?.detractionPct ?? 12))
  const [hasRetention,   setHasRetention]   = useState(true)
  const [cost,           setCost]           = useState('')
  const [showMargin,     setShowMargin]     = useState(false)

  // ── Derived values ─────────────────────────────────────────────────────────
  const taxRate   = settings?.taxRate ?? 30
  const amtNum    = parseFloat(amount) || 0
  const igvNum    = parseFloat(igv)    || 0
  const costNum   = parseFloat(cost)   || 0
  const subtotal  = amtNum + igvNum
  const detPct    = parseFloat(detractionPct) || 0
  const detAmt    = hasDetraction ? subtotal * (detPct / 100) : 0
  const retention = hasRetention  ? amtNum * 0.08 : 0  // for RH
  const netFact   = subtotal - detAmt                  // neto factura
  const netRH     = amtNum - retention                 // neto RH
  const margin    = amtNum > 0 && costNum > 0 ? ((amtNum - costNum) / amtNum) * 100 : null
  const profit    = amtNum > 0 && costNum > 0 ? amtNum - costNum : null

  const dueD    = new Date(now)
  dueD.setDate(dueD.getDate() + dueIn)
  const dueDate = `${dueD.getDate()} ${months[dueD.getMonth()]}`

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleDocType(val) {
    setDocType(val)
    setSerie(val === 'rh' ? '001' : 'F001')
  }

  function handleClientName(name) {
    setClientName(name)
    const match = (clients || []).find(c => c.name.toLowerCase() === name.toLowerCase())
    if (match) {
      setClientColor(match.color || COLORS[0])
      if (match.ruc) setClientRuc(match.ruc)
      setClientId(match.id)
    } else {
      setClientId('')
    }
  }

  function handleCreate() {
    const issuedDate = now.toISOString().split('T')[0]
    const base = {
      id: nextId, client: clientName, clientId: clientId || undefined, clientColor, clientRuc,
      project, issued, issuedDate, due: dueDate,
      status: 'pending', docType,
      serie, number,
      cost: costNum || null,
      margin: margin ? parseFloat(margin.toFixed(1)) : null,
    }
    if (docType === 'factura') {
      onCreate({ ...base,
        amount: amtNum, igv: igvNum, subtotal,
        hasDetraction, detractionPct: detPct, detractionAmt: detAmt,
        netReceived: netFact, total: subtotal,
      })
    } else if (docType === 'rh') {
      onCreate({ ...base,
        amount: amtNum, // grossAmount
        grossAmount: amtNum,
        hasRetention, retention,
        net: netRH, netReceived: netRH,
      })
    } else {
      onCreate({ ...base, amount: amtNum })
    }
  }

  const canCreate = clientName.trim() && project.trim() && amtNum > 0

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">Nuevo comprobante</div>
            <h2 className="modal-title">
              {docType === 'rh' ? 'RH' : docType === 'sin_declarar' || docType === 'boleta' ? 'Servicio' : 'Factura'} {nextId}
            </h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>

        <div className="modal-body">

          {/* ── Tipo ─────────────────────────────────────────────────────── */}
          <div className="field">
            <label>Tipo de comprobante</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {DOC_TYPES.map(dt => (
                <button key={dt.value} type="button" onClick={() => handleDocType(dt.value)}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid',
                    borderColor: docType === dt.value ? 'var(--accent)' : 'var(--border)',
                    background: docType === dt.value ? 'color-mix(in srgb,var(--accent) 12%,transparent)' : 'var(--bg-elev)',
                    color: docType === dt.value ? 'var(--accent)' : 'var(--ink)',
                    cursor: 'pointer', textAlign: 'center',
                    fontWeight: docType === dt.value ? 700 : 400, fontSize: 13,
                  }}>
                  <div>{dt.label}</div>
                  <div style={{ fontSize: 10, opacity: .7, marginTop: 2 }}>{dt.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Serie + Número (solo factura / rh) ───────────────────────── */}
          {docType !== 'sin_declarar' && docType !== 'boleta' && (
            <div className="field-row">
              <div className="field" style={{ maxWidth: 110 }}>
                <label>Serie</label>
                <input type="text" value={serie} onChange={e => setSerie(e.target.value)}
                  placeholder={docType === 'rh' ? '001' : 'F001'}/>
              </div>
              <div className="field">
                <label>Número de comprobante</label>
                <input type="text" value={number} onChange={e => setNumber(e.target.value)}
                  placeholder="00001"/>
              </div>
            </div>
          )}

          {/* ── Cliente ──────────────────────────────────────────────────── */}
          <div className="field-row">
            <div className="field">
              <label>Razón social / cliente</label>
              <input
                list="inv-client-list"
                type="text"
                value={clientName}
                onChange={e => handleClientName(e.target.value)}
                placeholder="Empresa S.A.C. o nombre"
                autoFocus
              />
              <datalist id="inv-client-list">
                {(clients || []).map(c => <option key={c.id} value={c.name}/>)}
              </datalist>
            </div>
            {docType !== 'sin_declarar' && docType !== 'boleta' && (
              <div className="field" style={{ maxWidth: 160 }}>
                <label>RUC del cliente</label>
                <input type="text" maxLength={11} value={clientRuc}
                  onChange={e => setClientRuc(e.target.value)} placeholder="20XXXXXXXXX"/>
              </div>
            )}
          </div>

          {/* ── Color ────────────────────────────────────────────────────── */}
          <div className="field">
            <label>Color del cliente</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setClientColor(c)} style={{
                  width: 26, height: 26, borderRadius: '50%', background: c, border: 'none',
                  outline: clientColor === c ? `3px solid ${c}` : '3px solid transparent',
                  outlineOffset: 2, cursor: 'pointer',
                }}/>
              ))}
            </div>
          </div>

          {/* ── Concepto + Vencimiento ───────────────────────────────────── */}
          <div className="field-row">
            <div className="field">
              <label>Concepto / proyecto</label>
              <input type="text" value={project} onChange={e => setProject(e.target.value)}
                placeholder="Ej. Sesión de fotografía — Mayo 2026"/>
            </div>
            <div className="field" style={{ maxWidth: 150 }}>
              <label>Vencimiento</label>
              <select value={dueIn} onChange={e => setDueIn(parseInt(e.target.value))}>
                <option value={7}>7 días</option>
                <option value={14}>14 días</option>
                <option value={30}>30 días</option>
                <option value={45}>45 días</option>
                <option value={60}>60 días</option>
              </select>
            </div>
          </div>

          {/* ── Monto ────────────────────────────────────────────────────── */}
          {docType === 'factura' ? (
            <div className="field-row">
              <div className="field">
                <label>Valor de venta (sin IGV)</label>
                <div className="amount-input">
                  <span className="amount-prefix mono">S/</span>
                  <input type="text" inputMode="decimal" className="amount-field mono"
                    value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/>
                </div>
              </div>
              <div className="field">
                <label>IGV</label>
                <div className="amount-input">
                  <span className="amount-prefix mono">S/</span>
                  <input type="text" inputMode="decimal" className="amount-field mono"
                    value={igv} onChange={e => setIgv(e.target.value)} placeholder="0.00"/>
                </div>
                {amtNum > 0 && (
                  <button type="button" className="btn btn-xs btn-ghost" style={{ marginTop: 4, fontSize: 11 }}
                    onClick={() => setIgv((amtNum * 0.18).toFixed(2))}>
                    Calcular 18%
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="field">
              <label>{docType === 'rh' ? 'Honorarios brutos' : 'Monto total'}</label>
              <div className="amount-input">
                <span className="amount-prefix mono">S/</span>
                <input type="text" inputMode="decimal" className="amount-field mono"
                  value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/>
              </div>
            </div>
          )}

          {/* ── Detracción (solo factura) ─────────────────────────────────── */}
          {docType === 'factura' && (
            <div style={{ background:'var(--bg-sunk)', borderRadius:10, padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>Detracción</div>
                  <div style={{ fontSize:12, color:'var(--ink-mute)' }}>El cliente retiene un % para tu cuenta SUNAT</div>
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={hasDetraction} onChange={e => setHasDetraction(e.target.checked)}
                    style={{ width:16, height:16, accentColor:'var(--accent)', cursor:'pointer' }}/>
                  <span style={{ fontSize:13, fontWeight:600 }}>Aplica</span>
                </label>
              </div>
              {hasDetraction && (
                <>
                  <div className="field" style={{ marginBottom:0 }}>
                    <label>Porcentaje (%)</label>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <input type="number" min="0" max="100" step="0.5" value={detractionPct}
                        onChange={e => setDetractionPct(e.target.value)} style={{ maxWidth:100 }}/>
                      <div style={{ display:'flex', gap:4 }}>
                        {[['4%','4'],['10%','10'],['12%','12'],['15%','15']].map(([l,v]) => (
                          <button key={v} type="button"
                            className={`btn btn-xs ${detractionPct === v ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setDetractionPct(v)}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {subtotal > 0 && (
                    <div style={{ background:'var(--bg-elev)', borderRadius:8, padding:'10px 14px', fontSize:13, display:'flex', flexDirection:'column', gap:3 }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ink-mute">Base + IGV</span><span className="mono">{fmtPEN(subtotal)}</span></div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ink-mute">Detracción {detPct}%</span><span className="mono ink-bad">− {fmtPEN(detAmt)}</span></div>
                      <div style={{ display:'flex', justifyContent:'space-between', paddingTop:4, borderTop:'1px solid var(--border)', marginTop:2 }}>
                        <span className="ink-strong" style={{ fontWeight:600 }}>Neto que recibes</span>
                        <span className="mono ink-strong" style={{ fontWeight:700 }}>{fmtPEN(netFact)}</span>
                      </div>
                      {subtotal < 700 && <div style={{ fontSize:11, color:'var(--warn)' }}>⚠ Detracción aplica generalmente si el total supera S/ 700.</div>}
                    </div>
                  )}
                </>
              )}
              {!hasDetraction && subtotal > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                  <span className="ink-mute">Total a cobrar</span>
                  <span className="mono ink-strong">{fmtPEN(subtotal)}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Retención 8% (solo RH) ───────────────────────────────────── */}
          {docType === 'rh' && amtNum > 0 && (
            <div style={{ background:'var(--bg-sunk)', borderRadius:10, padding:'14px 16px', display:'flex', flexDirection:'column', gap:8 }}>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13 }}>
                <input type="checkbox" checked={hasRetention} onChange={e => setHasRetention(e.target.checked)}
                  style={{ width:16, height:16, accentColor:'var(--accent)' }}/>
                <div>
                  <div style={{ fontWeight:600 }}>Retención 8%</div>
                  <div style={{ fontSize:12, color:'var(--ink-mute)' }}>El cliente retiene el 8% de tus honorarios</div>
                </div>
              </label>
              <div style={{ background:'var(--bg-elev)', borderRadius:8, padding:'10px 14px', fontSize:13, display:'flex', flexDirection:'column', gap:3 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ink-mute">Honorarios brutos</span><span className="mono">{fmtPEN(amtNum)}</span></div>
                {hasRetention && <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ink-mute">Retención 8%</span><span className="mono ink-bad">− {fmtPEN(retention)}</span></div>}
                <div style={{ display:'flex', justifyContent:'space-between', paddingTop:4, borderTop:'1px solid var(--border)', marginTop:2 }}>
                  <span className="ink-strong" style={{ fontWeight:600 }}>Neto que recibes</span>
                  <span className="mono ink-strong" style={{ fontWeight:700 }}>{fmtPEN(netRH)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Calculadora de margen ─────────────────────────────────────── */}
          <div style={{ marginBottom: 4 }}>
            <button type="button" className="btn btn-xs btn-ghost" onClick={() => setShowMargin(v => !v)} style={{ fontSize:12 }}>
              <Icon name={showMargin ? 'arrowDown' : 'arrowRight'} size={11}/>
              {showMargin ? 'Ocultar margen' : 'Calcular margen del servicio'}
            </button>
          </div>
          {showMargin && (
            <div style={{ background:'var(--bg-sunk)', borderRadius:10, padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--ink-mute)', textTransform:'uppercase', letterSpacing:'.06em' }}>Calculadora de margen</div>
              <div className="field" style={{ marginBottom:0 }}>
                <label>Costo del servicio</label>
                <div className="amount-input">
                  <span className="amount-prefix mono">S/</span>
                  <input type="text" inputMode="decimal" className="amount-field mono"
                    value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00"/>
                </div>
              </div>
              {margin !== null && (
                <div style={{ display:'flex', gap:10 }}>
                  {[
                    ['Ganancia', fmtPEN(profit,{decimals:0}), profit>=0?'ink-good':'ink-bad'],
                    ['Margen', `${margin.toFixed(1)}%`, margin>=40?'ink-good':margin>=20?'ink-warn':'ink-bad'],
                    ['Eval.', margin>=50?'✓ Excelente':margin>=30?'~ Ok':'✗ Bajo', margin>=50?'ink-good':margin>=30?'ink-warn':'ink-bad'],
                  ].map(([l,v,cls]) => (
                    <div key={l} style={{ flex:1, background:'var(--bg-elev)', borderRadius:8, padding:'10px 12px' }}>
                      <div style={{ fontSize:11, color:'var(--ink-mute)', marginBottom:2 }}>{l}</div>
                      <div className={`mono ${cls}`} style={{ fontWeight:700, fontSize:15 }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Preview ──────────────────────────────────────────────────── */}
          <div className="invoice-preview">
            <div className="invoice-preview-head">
              <div className="ink-mute">Vista previa · {docType === 'rh' ? 'RH' : docType === 'sin_declarar' || docType === 'boleta' ? 'Sin declarar' : 'Factura'}</div>
              <div className="mono ink-mute">{serie ? `${serie}-` : ''}{number || nextId}</div>
            </div>
            <div className="invoice-preview-body">
              <div className="invoice-preview-row">
                <span className="ink-mute">Cliente</span>
                <span className="ink-strong" style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {clientName
                    ? <><span style={{ width:16, height:16, borderRadius:'50%', background:clientColor, display:'inline-block', flexShrink:0 }}/>{clientName}{clientRuc && <span className="ink-faint mono" style={{fontSize:11}}> · {clientRuc}</span>}</>
                    : <em className="ink-faint">— sin definir —</em>}
                </span>
              </div>
              <div className="invoice-preview-row">
                <span className="ink-mute">Concepto</span>
                <span className="ink-strong">{project || <em className="ink-faint">—</em>}</span>
              </div>
              <div className="invoice-preview-row">
                <span className="ink-mute">Emitida / Vence</span>
                <span className="mono">{issued} → {dueDate}</span>
              </div>
              {docType === 'factura' && (
                <>
                  <div className="invoice-preview-row">
                    <span className="ink-mute">Base sin IGV</span>
                    <span className="mono">{fmtPEN(amtNum)}</span>
                  </div>
                  {igvNum > 0 && <div className="invoice-preview-row"><span className="ink-mute">IGV</span><span className="mono">{fmtPEN(igvNum)}</span></div>}
                  {detAmt > 0 && <div className="invoice-preview-row"><span className="ink-mute">Detracción {detPct}%</span><span className="mono ink-bad">− {fmtPEN(detAmt)}</span></div>}
                  <div className="invoice-preview-row invoice-preview-row-total">
                    <span className="ink-strong">Neto a cobrar</span>
                    <span className="mono ink-strong">{fmtPEN(netFact)}</span>
                  </div>
                </>
              )}
              {docType === 'rh' && (
                <>
                  <div className="invoice-preview-row">
                    <span className="ink-mute">Honorarios brutos</span>
                    <span className="mono">{fmtPEN(amtNum)}</span>
                  </div>
                  {hasRetention && retention > 0 && <div className="invoice-preview-row"><span className="ink-mute">Retención 8%</span><span className="mono ink-bad">− {fmtPEN(retention)}</span></div>}
                  <div className="invoice-preview-row invoice-preview-row-total">
                    <span className="ink-strong">Neto a cobrar</span>
                    <span className="mono ink-strong">{fmtPEN(netRH)}</span>
                  </div>
                </>
              )}
              {(docType === 'sin_declarar' || docType === 'boleta') && (
                <div className="invoice-preview-row invoice-preview-row-total">
                  <span className="ink-strong">Total</span>
                  <span className="mono ink-strong">{fmtPEN(amtNum)}</span>
                </div>
              )}
              {docType !== 'sin_declarar' && docType !== 'boleta' && (
                <div className="invoice-preview-row invoice-preview-row-quiet">
                  <span className="ink-mute">Reserva {taxRate}% impuestos</span>
                  {/* RH: reserva sobre neto (bruto − 8% retención); factura: sobre base */}
                  <span className="mono ink-mute">
                    {fmtPEN((docType === 'rh' ? amtNum * 0.92 : amtNum) * (taxRate/100))}
                  </span>
                </div>
              )}
              {margin !== null && (
                <div className="invoice-preview-row invoice-preview-row-quiet">
                  <span className="ink-mute">Margen</span>
                  <span className={`mono ${margin >= 30 ? 'ink-good' : 'ink-bad'}`}>{margin.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!canCreate} onClick={handleCreate}>
            <Icon name="check" size={14}/>
            Crear {docType === 'rh' ? 'RH' : docType === 'sin_declarar' || docType === 'boleta' ? 'servicio' : 'factura'}
          </button>
        </div>
      </div>
    </div>
  )
}
