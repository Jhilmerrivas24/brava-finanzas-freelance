import { useState, useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import Ring from '../components/Ring.jsx'
import { fmtPEN } from '../data.js'
import { useDialog } from '../hooks/useDialog.js'

const YEAR = new Date().getFullYear()
const CURRENT_Q = Math.floor(new Date().getMonth() / 3)
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const PURCHASE_CATS  = ['Software','Hardware / Equipos','Servicios profesionales','Marketing','Educación','Espacio / Coworking','Transporte','Salud','Otro']
const PURCHASE_TYPES = ['Factura','Boleta','Ticket','Recibo','Nota de venta','Otro']
const TODAY = (() => { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` })()

// ── Date helpers ──────────────────────────────────────────────────────────────
function parseMonthKey(s) {
  if (!s) return null
  const p = s.split('/')
  if (p.length === 3) return `${p[2]}-${p[1]}`
  return null
}
function monthLabel(k) {
  if (!k) return ''
  const [y, m] = k.split('-')
  return `${MONTHS_ES[parseInt(m,10)-1]} ${y}`
}
function qLabel(k) {
  if (!k) return ''
  const [y, q] = k.split('-Q')
  return `Q${q} ${y}`
}
function defaultDueDate(key, paymentDay) {
  const pd = paymentDay || 21
  if (!key) return ''
  if (key.includes('-Q')) {
    // quarterly: due date = paymentDay of month after quarter ends
    const [y, q] = key.split('-Q')
    const endMonth = parseInt(q) * 3  // 3, 6, 9, 12
    const dueMonth = endMonth === 12 ? 1 : endMonth + 1
    const dueYear  = endMonth === 12 ? parseInt(y) + 1 : parseInt(y)
    return `${String(pd).padStart(2,'0')}/${String(dueMonth).padStart(2,'0')}/${dueYear}`
  }
  // monthly: due date = paymentDay of next month
  const [y, m] = key.split('-')
  const nm = parseInt(m) === 12 ? 1 : parseInt(m) + 1
  const ny = parseInt(m) === 12 ? parseInt(y) + 1 : parseInt(y)
  return `${String(pd).padStart(2,'0')}/${String(nm).padStart(2,'0')}/${ny}`
}

// ── Build monthly periods from data ───────────────────────────────────────────
// taxPurchases, bills (hasIGV), variableExpenses (hasIGV) feed the crédito fiscal
function buildPeriods(taxInvoices, taxRH, rentaRate, taxPurchases, bills, variableExpenses) {
  const map = {}
  const ensure = (k) => {
    if (!map[k]) map[k] = {
      key: k, invCount: 0, invBase: 0,
      igvDebito: 0,   // IGV deuda a SUNAT (de facturas emitidas)
      igvCredito: 0,  // IGV crédito fiscal (compras + gastos con IGV)
      rentaOwed: 0,
      rhCount: 0, rhGross: 0, rhRetention: 0,
    }
  }

  // ── Débito fiscal: facturas emitidas ─────────────────────────────────────
  ;(taxInvoices||[]).forEach(x => {
    const k = parseMonthKey(x.date); if (!k) return; ensure(k)
    map[k].invCount++
    map[k].invBase    += x.amount   || 0
    map[k].igvDebito  += x.igv      || 0
    map[k].rentaOwed  += (x.amount||0) * ((rentaRate||0)/100)
  })
  ;(taxRH||[]).forEach(x => {
    const k = parseMonthKey(x.date); if (!k) return; ensure(k)
    map[k].rhCount++
    map[k].rhGross     += x.grossAmount || 0
    map[k].rhRetention += x.retention   || 0
  })

  // ── Crédito fiscal: compras con IGV (taxPurchases) ───────────────────────
  ;(taxPurchases||[]).forEach(x => {
    const k = parseMonthKey(x.date); if (!k || !map[k]) return
    map[k].igvCredito += x.igv || 0
  })

  // ── Crédito fiscal: gastos fijos activos con hasIGV ──────────────────────
  // Aplica mensualmente a todos los períodos existentes
  const billsIGVMonthly = (bills||[])
    .filter(b => b.active !== false && b.hasIGV && b.amount > 0)
    .reduce((s, b) => s + (b.amount - b.amount / 1.18), 0)
  Object.keys(map).forEach(k => { map[k].igvCredito += billsIGVMonthly })

  // ── Crédito fiscal: gastos variables con hasIGV ──────────────────────────
  ;(variableExpenses||[]).forEach(x => {
    if (!x.hasIGV || !x.date || x.amount <= 0) return
    const d  = new Date(x.date)
    const k  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    if (!map[k]) return
    map[k].igvCredito += x.amount - x.amount / 1.18
  })

  // ── Neto: max(0, débito − crédito) ───────────────────────────────────────
  Object.values(map).forEach(p => {
    p.igvOwed = p.igvDebito  // alias backward-compat (raw debito)
    p.igvNeto = Math.max(0, p.igvDebito - p.igvCredito)
  })

  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key))
}

function groupQuarterly(monthly) {
  const map = {}
  monthly.forEach(m => {
    const [y, mo] = m.key.split('-')
    const q    = Math.ceil(parseInt(mo)/3)
    const key  = `${y}-Q${q}`
    if (!map[key]) map[key] = {
      key, invCount: 0, invBase: 0,
      igvDebito: 0, igvCredito: 0,
      igvOwed: 0, igvNeto: 0,
      rentaOwed: 0, rhCount: 0, rhGross: 0, rhRetention: 0,
    }
    const r = map[key]
    r.invCount    += m.invCount;   r.invBase     += m.invBase
    r.igvDebito   += m.igvDebito;  r.igvCredito  += m.igvCredito
    r.rentaOwed   += m.rentaOwed
    r.rhCount     += m.rhCount;    r.rhGross     += m.rhGross
    r.rhRetention += m.rhRetention
  })
  Object.values(map).forEach(p => {
    p.igvOwed = p.igvDebito
    p.igvNeto = Math.max(0, p.igvDebito - p.igvCredito)
  })
  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key))
}

// ── Shared modal shell ────────────────────────────────────────────────────────
function Modal({ title, eyebrow, onClose, children, footer, wide }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: wide ? 680 : 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div><div className="eyebrow">{eyebrow}</div><h2 className="modal-title">{title}</h2></div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">{footer}</div>
      </div>
    </div>
  )
}

// ── Settings modal ────────────────────────────────────────────────────────────
function TaxSettingsModal({ settings, onSave, onClose }) {
  const [taxRate,   setTaxRate]   = useState(String(settings?.taxRate      ?? 30))
  const [rentaRate, setRentaRate] = useState(String(settings?.rentaRate    ?? 1.5))
  const [detPct,    setDetPct]    = useState(String(settings?.detractionPct?? 12))
  const [payDay,    setPayDay]    = useState(String(settings?.paymentDay   ?? 21))

  return (
    <Modal eyebrow="Configurar" title="Parámetros de impuestos" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => onSave({
          taxRate: Number(taxRate)||0, rentaRate: Number(rentaRate)||0,
          detractionPct: Number(detPct)||0, paymentDay: Number(payDay)||21,
        })}>
          <Icon name="check" size={14}/> Guardar
        </button>
      </>}
    >
      <div className="field-row">
        <div className="field">
          <label>Reserva de impuesto (%)</label>
          <input type="number" min="0" max="100" step="0.5" value={taxRate} onChange={e=>setTaxRate(e.target.value)} autoFocus/>
          <span className="field-hint">% que reservas de cada factura cobrada. Ej: 30%.</span>
        </div>
        <div className="field">
          <label>Pago a cuenta — Renta (%)</label>
          <input type="number" min="0" max="100" step="0.5" value={rentaRate} onChange={e=>setRentaRate(e.target.value)}/>
          <span className="field-hint">% sobre base de facturas emitidas. 3ra cat. coeficiente: 1.5%. Varía por rubro.</span>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Detracción por defecto (%)</label>
          <input type="number" min="0" max="100" step="0.5" value={detPct} onChange={e=>setDetPct(e.target.value)}/>
          <span className="field-hint">Pre-llena en facturas. Foto/Video: 12%.</span>
        </div>
        <div className="field">
          <label>Día de vencimiento habitual</label>
          <input type="number" min="1" max="31" value={payDay} onChange={e=>setPayDay(e.target.value)}/>
          <span className="field-hint">Día del mes para pagar SUNAT. Varía según RUC. Ej: 21.</span>
        </div>
      </div>
      <div style={{ background:'var(--bg-sunk)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--ink-mute)' }}>
        <div style={{fontWeight:600,marginBottom:4}}>Referencia de tasas</div>
        {[
          ['Reserva segura freelance','25–30%'],
          ['Pago a cuenta 3ra cat. (coeficiente)','1.5%'],
          ['Pago a cuenta 4ta cat. (retención)','8%'],
          ['IGV','18%'],
          ['Detracción fotografía/video','12%'],
          ['Detracción publicidad','10%'],
          ['Detracción construcción','4%'],
        ].map(([l,v]) => (
          <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
            <span>{l}</span><span className="mono" style={{fontWeight:600}}>{v}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ── Period edit modal ─────────────────────────────────────────────────────────
function PeriodModal({ period, computed, onSave, onClose }) {
  const [dueDate, setDueDate] = useState(period.dueDate || '')
  const [paid,    setPaid]    = useState(String(period.paid    ?? ''))
  const [status,  setStatus]  = useState(period.status || 'pending')
  // Use igvNeto (after credit fiscal) for total obligation
  const totalTax = (computed.igvNeto ?? computed.igvOwed ?? 0) + (computed.rentaOwed||0) + (computed.rhRetention||0)

  return (
    <Modal eyebrow="Editar período" title={period.label} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => onSave({ dueDate, paid: Number(paid)||0, status })}>
          <Icon name="check" size={14}/> Guardar
        </button>
      </>}
    >
      {/* Computed summary */}
      <div style={{ background:'var(--bg-sunk)', borderRadius:10, padding:'12px 14px', fontSize:13, display:'flex', flexDirection:'column', gap:4, marginBottom:4 }}>
        <div style={{fontWeight:600,marginBottom:2}}>Resumen del período</div>
        {[
          ['Facturas emitidas', computed.invCount + ' factura(s)'],
          ['Base imponible', fmtPEN(computed.invBase||0,{decimals:0})],
          ['IGV débito (facturas)', fmtPEN(computed.igvDebito||computed.igvOwed||0,{decimals:0})],
          computed.igvCredito > 0 && ['IGV crédito fiscal', '− ' + fmtPEN(computed.igvCredito,{decimals:0})],
          computed.igvCredito > 0 && ['IGV neto a pagar', fmtPEN(computed.igvNeto||0,{decimals:0})],
          ['Pago a cuenta Renta', fmtPEN(computed.rentaOwed||0,{decimals:0})],
          ['Retención RH', fmtPEN(computed.rhRetention||0,{decimals:0})],
          ['Total obligaciones', fmtPEN(totalTax,{decimals:0})],
        ].filter(Boolean).map(([l,v]) => (
          <div key={l} style={{display:'flex',justifyContent:'space-between'}}>
            <span className="ink-mute">{l}</span><span className="mono ink-strong">{v}</span>
          </div>
        ))}
      </div>
      <div className="field">
        <label>Fecha de vencimiento</label>
        <input type="text" value={dueDate} onChange={e=>setDueDate(e.target.value)} placeholder="DD/MM/AAAA" autoFocus/>
        <span className="field-hint">Varía según el último dígito de tu RUC.</span>
      </div>
      <div className="field">
        <label>Monto pagado a SUNAT (S/)</label>
        <div className="amount-input">
          <span className="amount-prefix mono">S/</span>
          <input type="text" inputMode="decimal" className="amount-field mono"
            value={paid} onChange={e=>setPaid(e.target.value)} placeholder="0.00"/>
        </div>
      </div>
      <div className="field">
        <label>Estado</label>
        <select value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="pending">Pendiente</option>
          <option value="paid">Pagado</option>
          <option value="partial">Parcial</option>
          <option value="draft">Próximo</option>
        </select>
      </div>
    </Modal>
  )
}

// ── Invoice modal ─────────────────────────────────────────────────────────────
function InvModal({ initial, defaultDetractionPct, clients, onSave, onClose }) {
  const [f, setF] = useState(initial ?? {
    serie:'F001', number:'', date:TODAY, clientName:'', clientRuc:'', concept:'',
    amount:'', igv:'', hasDetraction:false, detractionPct:String(defaultDetractionPct??12), status:'emitida',
  })
  const s = (k,v) => setF(x=>({...x,[k]:v}))
  function handleClientPick(name) {
    s('clientName', name)
    const match = (clients||[]).find(c => c.name.toLowerCase() === name.toLowerCase())
    if (match?.ruc) s('clientRuc', match.ruc)
  }
  const amt    = Number(f.amount)||0; const igvAmt = Number(f.igv)||0
  const sub    = amt + igvAmt; const detPct = Number(f.detractionPct)||0
  const detAmt = f.hasDetraction ? sub*(detPct/100) : 0
  const net    = sub - detAmt
  const valid  = f.clientName.trim()&&amt>0
  return (
    <Modal wide eyebrow={initial?'Editar':'Nueva'} title="Factura emitida" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid}
          onClick={()=>onSave({...f,amount:amt,igv:igvAmt,subtotal:sub,detractionAmt:detAmt,netReceived:net,total:sub})}>
          <Icon name="check" size={14}/> {initial?'Guardar cambios':'Agregar factura'}
        </button>
      </>}
    >
      <div className="field-row">
        <div className="field"><label>Serie</label><input type="text" value={f.serie} onChange={e=>s('serie',e.target.value)} placeholder="F001"/></div>
        <div className="field"><label>Número</label><input type="text" value={f.number} onChange={e=>s('number',e.target.value)} placeholder="00001" autoFocus/></div>
        <div className="field"><label>Fecha (DD/MM/AAAA)</label><input type="text" value={f.date} onChange={e=>s('date',e.target.value)} placeholder="14/05/2026"/></div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Razón social del cliente</label>
          <input list="tax-inv-clients" type="text" value={f.clientName} onChange={e=>handleClientPick(e.target.value)} placeholder="Empresa S.A.C."/>
          <datalist id="tax-inv-clients">{(clients||[]).map(c=><option key={c.id} value={c.name}/>)}</datalist>
        </div>
        <div className="field"><label>RUC del cliente</label><input type="text" maxLength={11} value={f.clientRuc} onChange={e=>s('clientRuc',e.target.value)} placeholder="20XXXXXXXXX"/></div>
      </div>
      <div className="field"><label>Concepto</label><input type="text" value={f.concept} onChange={e=>s('concept',e.target.value)} placeholder="Servicios de fotografía — Mayo 2026"/></div>
      <div className="field-row">
        <div className="field">
          <label>Valor de venta (sin IGV)</label>
          <div className="amount-input"><span className="amount-prefix mono">S/</span>
            <input type="text" inputMode="decimal" className="amount-field mono" value={f.amount} onChange={e=>s('amount',e.target.value)} placeholder="0.00"/>
          </div>
        </div>
        <div className="field">
          <label>IGV</label>
          <div className="amount-input"><span className="amount-prefix mono">S/</span>
            <input type="text" inputMode="decimal" className="amount-field mono" value={f.igv} onChange={e=>s('igv',e.target.value)} placeholder="0.00"/>
          </div>
          {amt>0&&<button type="button" className="btn btn-xs btn-ghost" style={{marginTop:4,fontSize:11}} onClick={()=>s('igv',(amt*0.18).toFixed(2))}>Calcular 18%</button>}
        </div>
      </div>
      {/* Detracción */}
      <div style={{background:'var(--bg-sunk)',borderRadius:10,padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div><div style={{fontWeight:600,fontSize:13}}>Detracción</div>
            <div style={{fontSize:12,color:'var(--ink-mute)'}}>El cliente deposita un % a tu cta. de detracciones SUNAT</div>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',userSelect:'none'}}>
            <input type="checkbox" checked={f.hasDetraction} onChange={e=>s('hasDetraction',e.target.checked)} style={{width:16,height:16,accentColor:'var(--accent)',cursor:'pointer'}}/>
            <span style={{fontSize:13,fontWeight:600}}>Aplica</span>
          </label>
        </div>
        {f.hasDetraction&&(
          <>
            <div className="field" style={{marginBottom:0}}>
              <label>Porcentaje de detracción (%)</label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="number" min="0" max="100" step="0.5" value={f.detractionPct} onChange={e=>s('detractionPct',e.target.value)} style={{maxWidth:110}}/>
                <div style={{display:'flex',gap:4}}>
                  {[['4%','4'],['10%','10'],['12%','12'],['15%','15']].map(([l,v])=>(
                    <button key={v} type="button" className={`btn btn-xs ${f.detractionPct===v?'btn-primary':'btn-ghost'}`} onClick={()=>s('detractionPct',v)}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            {sub>0&&(
              <div style={{background:'var(--bg-elev)',borderRadius:8,padding:'10px 14px',fontSize:13,display:'flex',flexDirection:'column',gap:3}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><span className="ink-mute">Subtotal (base + IGV)</span><span className="mono">{fmtPEN(sub)}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span className="ink-mute">Detracción {detPct}%</span><span className="mono ink-bad">− {fmtPEN(detAmt)}</span></div>
                <div style={{display:'flex',justifyContent:'space-between',paddingTop:4,borderTop:'1px solid var(--border)',marginTop:2}}><span className="ink-strong" style={{fontWeight:600}}>Neto que recibes</span><span className="mono ink-strong" style={{fontWeight:700}}>{fmtPEN(net)}</span></div>
                {sub<700&&<div style={{fontSize:11,color:'var(--warn)',marginTop:2}}>⚠ Detracción generalmente aplica si el total supera S/ 700.</div>}
              </div>
            )}
          </>
        )}
        {!f.hasDetraction&&sub>0&&(
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
            <span className="ink-mute">Total a cobrar</span><span className="mono ink-strong">{fmtPEN(sub)}</span>
          </div>
        )}
      </div>
      <div className="field"><label>Estado</label>
        <select value={f.status} onChange={e=>s('status',e.target.value)}>
          <option value="emitida">Emitida</option><option value="cobrada">Cobrada</option><option value="anulada">Anulada</option>
        </select>
      </div>
    </Modal>
  )
}

// ── RH modal ──────────────────────────────────────────────────────────────────
function RHModal({ initial, clients, onSave, onClose }) {
  const [f,setF] = useState(initial??{serie:'001',number:'',date:TODAY,clientName:'',clientRuc:'',concept:'',grossAmount:'',hasRetention:true,status:'emitido'})
  const s=(k,v)=>setF(x=>({...x,[k]:v}))
  function handleClientPick(name) {
    s('clientName', name)
    const match = (clients||[]).find(c => c.name.toLowerCase() === name.toLowerCase())
    if (match?.ruc) s('clientRuc', match.ruc)
  }
  const gross=Number(f.grossAmount)||0; const ret=f.hasRetention?gross*0.08:0; const net=gross-ret
  const valid=f.number.trim()&&f.clientName.trim()&&gross>0
  return (
    <Modal eyebrow={initial?'Editar':'Nuevo'} title="Recibo por Honorarios" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={()=>onSave({...f,grossAmount:gross,retention:ret,net})}>
          <Icon name="check" size={14}/> {initial?'Guardar cambios':'Agregar RH'}</button></>}
    >
      <div className="field-row">
        <div className="field"><label>Serie</label><input type="text" value={f.serie} onChange={e=>s('serie',e.target.value)} placeholder="001"/></div>
        <div className="field"><label>Número</label><input type="text" value={f.number} onChange={e=>s('number',e.target.value)} placeholder="00001" autoFocus/></div>
        <div className="field"><label>Fecha</label><input type="text" value={f.date} onChange={e=>s('date',e.target.value)} placeholder="DD/MM/AAAA"/></div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Razón social pagador</label>
          <input list="tax-rh-clients" type="text" value={f.clientName} onChange={e=>handleClientPick(e.target.value)} placeholder="Empresa S.A.C."/>
          <datalist id="tax-rh-clients">{(clients||[]).map(c=><option key={c.id} value={c.name}/>)}</datalist>
        </div>
        <div className="field"><label>RUC pagador</label><input type="text" maxLength={11} value={f.clientRuc} onChange={e=>s('clientRuc',e.target.value)} placeholder="20XXXXXXXXX"/></div>
      </div>
      <div className="field"><label>Concepto</label><input type="text" value={f.concept} onChange={e=>s('concept',e.target.value)} placeholder="Servicios de consultoría — Mayo 2026"/></div>
      <div className="field-row">
        <div className="field"><label>Honorarios brutos</label>
          <div className="amount-input"><span className="amount-prefix mono">S/</span>
            <input type="text" inputMode="decimal" className="amount-field mono" value={f.grossAmount} onChange={e=>s('grossAmount',e.target.value)} placeholder="0.00"/>
          </div>
        </div>
        <div className="field" style={{justifyContent:'flex-end',paddingTop:22}}>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
            <input type="checkbox" checked={f.hasRetention} onChange={e=>s('hasRetention',e.target.checked)} style={{width:16,height:16,accentColor:'var(--accent)'}}/>
            Retención 8%
          </label>
        </div>
      </div>
      {gross>0&&(<div style={{background:'var(--bg-sunk)',borderRadius:8,padding:'10px 14px',fontSize:13,display:'flex',flexDirection:'column',gap:3}}>
        {f.hasRetention&&<div style={{display:'flex',justifyContent:'space-between'}}><span className="ink-mute">Retención (8%)</span><span className="mono ink-bad">− {fmtPEN(ret)}</span></div>}
        <div style={{display:'flex',justifyContent:'space-between'}}><span className="ink-mute">Neto a cobrar</span><span className="mono ink-strong">{fmtPEN(net)}</span></div>
      </div>)}
      <div className="field"><label>Estado</label>
        <select value={f.status} onChange={e=>s('status',e.target.value)}>
          <option value="emitido">Emitido</option><option value="cobrado">Cobrado</option><option value="anulado">Anulado</option>
        </select>
      </div>
    </Modal>
  )
}

// ── Purchase modal ────────────────────────────────────────────────────────────
function PurchaseModal({ initial, onSave, onClose }) {
  const [f,setF]=useState(initial??{type:'Factura',serie:'',number:'',date:TODAY,supplier:'',supplierRuc:'',concept:'',amount:'',igv:'',category:'Software'})
  const s=(k,v)=>setF(x=>({...x,[k]:v}))
  const amt=Number(f.amount)||0; const igvAmt=Number(f.igv)||0; const total=amt+igvAmt
  const valid=f.number.trim()&&f.supplier.trim()&&amt>0
  return (
    <Modal eyebrow={initial?'Editar':'Nueva'} title="Compra / Deducción" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={()=>onSave({...f,amount:amt,igv:igvAmt,total})}>
          <Icon name="check" size={14}/> {initial?'Guardar cambios':'Agregar compra'}</button></>}
    >
      <div className="field-row">
        <div className="field"><label>Tipo</label><select value={f.type} onChange={e=>s('type',e.target.value)}>{PURCHASE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        <div className="field"><label>Serie</label><input type="text" value={f.serie} onChange={e=>s('serie',e.target.value)} placeholder="F001"/></div>
        <div className="field"><label>Número</label><input type="text" value={f.number} onChange={e=>s('number',e.target.value)} placeholder="00001" autoFocus/></div>
      </div>
      <div className="field"><label>Fecha (DD/MM/AAAA)</label><input type="text" value={f.date} onChange={e=>s('date',e.target.value)} placeholder="14/05/2026"/></div>
      <div className="field-row">
        <div className="field"><label>Proveedor</label><input type="text" value={f.supplier} onChange={e=>s('supplier',e.target.value)} placeholder="Proveedor S.A.C."/></div>
        <div className="field"><label>RUC proveedor</label><input type="text" maxLength={11} value={f.supplierRuc} onChange={e=>s('supplierRuc',e.target.value)} placeholder="20XXXXXXXXX"/></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Concepto</label><input type="text" value={f.concept} onChange={e=>s('concept',e.target.value)} placeholder="Suscripción Figma…"/></div>
        <div className="field"><label>Categoría</label><select value={f.category} onChange={e=>s('category',e.target.value)}>{PURCHASE_CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Monto sin IGV</label>
          <div className="amount-input"><span className="amount-prefix mono">S/</span><input type="text" inputMode="decimal" className="amount-field mono" value={f.amount} onChange={e=>s('amount',e.target.value)} placeholder="0.00"/></div>
        </div>
        <div className="field"><label>IGV</label>
          <div className="amount-input"><span className="amount-prefix mono">S/</span><input type="text" inputMode="decimal" className="amount-field mono" value={f.igv} onChange={e=>s('igv',e.target.value)} placeholder="0.00"/></div>
          {amt>0&&<button type="button" className="btn btn-xs btn-ghost" style={{marginTop:4,fontSize:11}} onClick={()=>s('igv',(amt*0.18).toFixed(2))}>Calcular 18%</button>}
        </div>
      </div>
      {total>0&&(<div style={{background:'var(--bg-sunk)',borderRadius:8,padding:'10px 14px',fontSize:13}}>
        <div style={{display:'flex',justifyContent:'space-between'}}><span className="ink-mute">Total con IGV</span><span className="mono ink-strong">{fmtPEN(total)}</span></div>
      </div>)}
    </Modal>
  )
}

function SPill({ s: status }) {
  const map={emitida:'pill-warn',cobrada:'pill-good',anulada:'pill-bad',emitido:'pill-warn',cobrado:'pill-good',anulado:'pill-bad',paid:'pill-good',pending:'pill-warn',partial:'pill-warn',draft:'pill-mute'}
  return <span className={`pill ${map[status]||'pill-mute'}`}>{status}</span>
}
function Empty({ icon, title, desc, action, onAction }) {
  return (<div className="empty-state"><div className="empty-state-icon"><Icon name={icon} size={22}/></div><h3>{title}</h3><p>{desc}</p>{action&&<button className="btn btn-primary btn-xs" onClick={onAction}>{action}</button>}</div>)
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Helpers to convert main invoices into tax format ──────────────────────────
function invToTaxRow(inv) {
  let date = inv.issued || '—'
  if (inv.issuedDate) {
    const d = inv.issuedDate
    date = `${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(0,4)}`
  }
  return {
    id:            inv.id,
    serie:         inv.serie    || 'F001',
    number:        inv.number   || '',
    date,
    clientName:    inv.client,
    clientRuc:     inv.clientRuc || '',
    concept:       inv.project,
    amount:        inv.amount,
    igv:           inv.igv       || 0,
    subtotal:      inv.subtotal  || inv.amount,
    hasDetraction: inv.hasDetraction || false,
    detractionPct: String(inv.detractionPct || 0),
    detractionAmt: inv.detractionAmt || 0,
    netReceived:   inv.netReceived   || inv.amount,
    total:         inv.total         || inv.amount,
    status:        inv.status === 'paid' ? 'cobrada' : 'emitida',
    fromInvoiceId: inv.id,
    _fromMain:     true,
  }
}
function invToRHRow(inv) {
  let date = inv.issued || '—'
  if (inv.issuedDate) {
    const d = inv.issuedDate
    date = `${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(0,4)}`
  }
  return {
    id:           inv.id,
    serie:        inv.serie   || '001',
    number:       inv.number  || '',
    date,
    clientName:   inv.client,
    clientRuc:    inv.clientRuc || '',
    concept:      inv.project,
    grossAmount:  inv.grossAmount || inv.amount,
    hasRetention: inv.hasRetention ?? true,
    retention:    inv.retention   || 0,
    net:          inv.net         || inv.amount,
    status:       inv.status === 'paid' ? 'cobrado' : 'emitido',
    fromInvoiceId: inv.id,
    _fromMain:    true,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function TaxesView({
  invoices, settings, onSaveSettings, clients,
  onDeleteInvoice,
  taxPeriods, onUpdateTaxPeriod,
  taxInvoices, onAddTaxInvoice, onEditTaxInvoice, onDeleteTaxInvoice,
  taxRH, onAddTaxRH, onEditTaxRH, onDeleteTaxRH,
  taxPurchases, onAddTaxPurchase, onEditTaxPurchase, onDeleteTaxPurchase,
  bills = [], variableExpenses = [],
}) {
  const dialog = useDialog()
  const [tab, setTab]           = useState('resumen')
  const [periodView, setPeriodView] = useState('monthly') // 'monthly' | 'quarterly'
  const [settingsModal, setSettingsModal] = useState(false)
  const [editPeriod,    setEditPeriod]    = useState(null)
  const [invModal,  setInvModal]  = useState(null)
  const [rhModal,   setRhModal]   = useState(null)
  const [purModal,  setPurModal]  = useState(null)

  const taxRate        = settings?.taxRate       ?? 30
  const rentaRate      = settings?.rentaRate     ?? 1.5
  const detractionPct  = settings?.detractionPct ?? 12
  const paymentDay     = settings?.paymentDay    ?? 21

  // Only fiscal documents generate income tax obligation
  // boletas and sin_declarar are 100% liquid — excluded from tax base
  const paidIncome    = (invoices||[])
    .filter(i => i.status === 'paid' && (i.docType === 'factura' || i.docType === 'rh'))
    .reduce((s, i) => s + i.amount, 0)
  const totalReserved = paidIncome * (taxRate/100)

  // Boletas — reference only, no fiscal impact
  const boletasEmitidas = useMemo(() =>
    (invoices||[]).filter(i => i.docType === 'boleta' || i.docType === 'sin_declarar')
  , [invoices])

  // ── Merge: taxInvoices + invoices (factura/rh) not yet in tax arrays ─────────
  const allFaturas = useMemo(() => {
    const linked = new Set((taxInvoices||[]).map(ti => ti.fromInvoiceId).filter(Boolean))
    const fromMain = (invoices||[])
      .filter(inv => inv.docType === 'factura' && !linked.has(inv.id))
      .map(invToTaxRow)
    return [...(taxInvoices||[]), ...fromMain]
  }, [taxInvoices, invoices])

  const allRHs = useMemo(() => {
    const linked = new Set((taxRH||[]).map(r => r.fromInvoiceId).filter(Boolean))
    const fromMain = (invoices||[])
      .filter(inv => inv.docType === 'rh' && !linked.has(inv.id))
      .map(invToRHRow)
    return [...(taxRH||[]), ...fromMain]
  }, [taxRH, invoices])

  // Auto-generate monthly periods (use merged arrays + credit fiscal sources)
  const rawMonthly   = useMemo(
    () => buildPeriods(allFaturas, allRHs, rentaRate, taxPurchases, bills, variableExpenses),
    [allFaturas, allRHs, rentaRate, taxPurchases, bills, variableExpenses]
  )
  const rawQuarterly = useMemo(() => groupQuarterly(rawMonthly), [rawMonthly])

  // Merge with stored period data
  const mergePeriod = (p) => {
    const stored = (taxPeriods||[]).find(x => x.id === p.key) || {}
    return {
      ...p,
      ...stored,
      label:   periodView==='monthly' ? monthLabel(p.key) : qLabel(p.key),
      dueDate: stored.dueDate || defaultDueDate(p.key, paymentDay),
      status:  stored.status || 'pending',
      paid:    stored.paid || 0,
    }
  }

  const periods = (periodView==='monthly' ? rawMonthly : rawQuarterly).map(mergePeriod)

  // Totals (use merged arrays)
  const totalIGVDebito  = allFaturas.reduce((s,x)=>s+(x.igv||0),0)
  const totalIGVCredito = periods.reduce((s,p)=>s+(p.igvCredito||0),0)
  const totalIGVNeto    = periods.reduce((s,p)=>s+(p.igvNeto||0),0)
  const totalIGV        = totalIGVDebito  // alias for backward compat display
  const totalRenta      = allFaturas.reduce((s,x)=>s+(x.amount||0)*(rentaRate/100),0)
  const totalPaidSunat  = periods.reduce((s,p)=>s+(p.paid||0),0)
  // Ring uses NET obligations (after credit)
  const ringPct = (totalIGVNeto+totalRenta) > 0
    ? Math.min(totalPaidSunat/(totalIGVNeto+totalRenta), 1)
    : 0

  const TABS = [
    { id:'resumen',  label:'Resumen' },
    { id:'periodos', label:'Períodos', count: periods.length },
    { id:'facturas', label:'Facturas emitidas', count: allFaturas.length },
    { id:'rh',       label:'RHs', count: allRHs.length },
    { id:'compras',  label:'Compras', count:(taxPurchases||[]).length },
    { id:'boletas',  label:'Boletas', count: boletasEmitidas.length },
  ]

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">SUNAT · Perú</div>
          <h1>Impuestos</h1>
          <p className="lede">
            Reserva {taxRate}% · Renta {rentaRate}% · Detracción {detractionPct}% · Día pago {paymentDay}
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-ghost" onClick={()=>setSettingsModal(true)}>
            <Icon name="settings" size={14}/> Configurar tasas
          </button>
        </div>
      </header>

      <div className="tabs">
        {TABS.map(t=>(
          <button key={t.id} className={`tab ${tab===t.id?'is-active':''}`} onClick={()=>setTab(t.id)}>
            {t.label}{t.count!=null&&<span className="tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── RESUMEN ────────────────────────────────────────────────────────── */}
      {tab==='resumen' && (
        <>
          <section className="grid-tax">
            {/* Ring */}
            <div className="card card-tax-big">
              <div className="card-eyebrow">Obligaciones vs pagado {YEAR}</div>
              <div className="tax-big">
                <Ring value={ringPct} size={200} stroke={16}/>
                <div className="tax-big-center">
                  <div className="mono" style={{fontSize:18,fontWeight:700}}>{fmtPEN(totalPaidSunat)}</div>
                  <div className="ink-mute" style={{fontSize:12}}>de {fmtPEN(totalIGVNeto+totalRenta)}</div>
                  <div className={`pill ${ringPct>=1?'pill-good':totalPaidSunat>0?'pill-warn':'pill-mute'}`} style={{marginTop:8}}>
                    {(ringPct*100).toFixed(0)}% pagado
                  </div>
                </div>
              </div>
              <div className="tax-big-meta">
                <div><div className="lbl">Reserva</div><div className="num mono">{taxRate}%</div></div>
                <div><div className="lbl">Renta</div><div className="num mono">{rentaRate}%</div></div>
                <div><div className="lbl">Detracción</div><div className="num mono">{detractionPct}%</div></div>
              </div>
            </div>

            {/* Summary totals */}
            <div className="card">
              <div className="card-head"><div><div className="card-eyebrow">Acumulado {YEAR}</div><h3 className="card-title">Resumen fiscal</h3></div></div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[
                  ['Facturas emitidas (base)', allFaturas.reduce((s,x)=>s+(x.amount||0),0), 'ink-strong'],
                  ['IGV débito (facturas)', totalIGVDebito, 'ink-strong'],
                  ['IGV crédito fiscal', totalIGVCredito, 'ink-good'],
                  ['IGV neto a pagar', totalIGVNeto, 'ink-strong'],
                  ['Pago a cta. Renta', totalRenta, 'ink-strong'],
                  ['Detracciones', allFaturas.reduce((s,x)=>s+(x.detractionAmt||0),0), 'ink-warn'],
                  ['RHs neto cobrado', allRHs.reduce((s,x)=>s+(x.net||0),0), null],
                  ['Retenciones RH', allRHs.reduce((s,x)=>s+(x.retention||0),0), 'ink-warn'],
                  ['Compras (total)', (taxPurchases||[]).reduce((s,x)=>s+(x.total||x.amount||0),0), null],
                ].map(([l,v,cls])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:13,paddingBottom:6,borderBottom:'1px solid var(--border)'}}>
                    <span className="ink-mute">{l}</span>
                    <span className={`mono ${cls||''}`}>{fmtPEN(v,{decimals:0})}</span>
                  </div>
                ))}
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700}}>
                  <span>Total pagado a SUNAT</span>
                  <span className="mono">{fmtPEN(totalPaidSunat,{decimals:0})}</span>
                </div>
              </div>
              <button className="btn btn-soft btn-full" style={{marginTop:12}} onClick={()=>setTab('periodos')}>
                Ver detalle por período <Icon name="arrowRight" size={12}/>
              </button>
            </div>
          </section>
        </>
      )}

      {/* ── PERIODOS ───────────────────────────────────────────────────────── */}
      {tab==='periodos' && (
        <>
          {/* Toggle */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{display:'flex',gap:4,background:'var(--bg-sunk)',borderRadius:8,padding:3}}>
              {[['monthly','Por mes'],['quarterly','Por trimestre']].map(([v,l])=>(
                <button key={v}
                  className={`btn btn-xs ${periodView===v?'btn-primary':''}`}
                  style={{borderRadius:6,padding:'4px 14px'}}
                  onClick={()=>setPeriodView(v)}
                >{l}</button>
              ))}
            </div>
            <div style={{fontSize:12,color:'var(--ink-mute)'}}>
              Haz clic en un período para editar su fecha de pago y estado
            </div>
          </div>

          {periods.length === 0
            ? <div className="card">
                <Empty icon="taxes" title="Sin períodos aún"
                  desc="Agrega facturas o RHs en las pestañas correspondientes. Los períodos se generan automáticamente."
                  action="Agregar factura" onAction={()=>setTab('facturas')}/>
              </div>
            : <div className="card card-flat">
                <table className="invoice-table invoice-table-full">
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Vencimiento</th>
                      <th className="num-col">Facts.</th>
                      <th className="num-col">Base</th>
                      <th className="num-col">IGV débito</th>
                      <th className="num-col">Crédito fiscal</th>
                      <th className="num-col">IGV neto</th>
                      <th className="num-col">Renta ({rentaRate}%)</th>
                      <th className="num-col">Ret. RH</th>
                      <th className="num-col">Total oblig.</th>
                      <th className="num-col">Pagado</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map(p => {
                      const totalObl = (p.igvNeto||0) + (p.rentaOwed||0) + (p.rhRetention||0)
                      const diff     = totalObl - (p.paid||0)
                      return (
                        <tr key={p.key} style={{cursor:'pointer'}} onClick={()=>setEditPeriod(p)}>
                          <td className="ink-strong">{p.label}</td>
                          <td className="mono ink-mute">{p.dueDate || '—'}</td>
                          <td className="num-col mono">{p.invCount>0?p.invCount:'—'}</td>
                          <td className="num-col mono">{p.invBase>0?fmtPEN(p.invBase,{decimals:0}):'—'}</td>
                          <td className="num-col mono ink-mute">{p.igvDebito>0?fmtPEN(p.igvDebito,{decimals:0}):'—'}</td>
                          <td className="num-col mono ink-good">{p.igvCredito>0?`− ${fmtPEN(p.igvCredito,{decimals:0})}`:'—'}</td>
                          <td className="num-col mono ink-strong">{p.igvNeto>0?fmtPEN(p.igvNeto,{decimals:0}):'—'}</td>
                          <td className="num-col mono ink-strong">{p.rentaOwed>0?fmtPEN(p.rentaOwed,{decimals:0}):'—'}</td>
                          <td className="num-col mono ink-mute">{p.rhRetention>0?fmtPEN(p.rhRetention,{decimals:0}):'—'}</td>
                          <td className="num-col mono" style={{fontWeight:700}}>{totalObl>0?fmtPEN(totalObl,{decimals:0}):'—'}</td>
                          <td className="num-col mono">{p.paid>0?fmtPEN(p.paid,{decimals:0}):'—'}</td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:4}}>
                              <SPill s={p.status}/>
                              {diff > 0 && <span style={{fontSize:10,color:'var(--bad)'}}>−{fmtPEN(diff,{decimals:0})}</span>}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="row-total">
                      <td className="ink-strong" colSpan={2}>Total</td>
                      <td className="num-col mono">{periods.reduce((s,p)=>s+p.invCount,0)}</td>
                      <td className="num-col mono">{fmtPEN(periods.reduce((s,p)=>s+(p.invBase||0),0),{decimals:0})}</td>
                      <td className="num-col mono">{fmtPEN(periods.reduce((s,p)=>s+(p.igvDebito||0),0),{decimals:0})}</td>
                      <td className="num-col mono ink-good">{fmtPEN(periods.reduce((s,p)=>s+(p.igvCredito||0),0),{decimals:0})}</td>
                      <td className="num-col mono ink-strong">{fmtPEN(periods.reduce((s,p)=>s+(p.igvNeto||0),0),{decimals:0})}</td>
                      <td className="num-col mono ink-strong">{fmtPEN(periods.reduce((s,p)=>s+(p.rentaOwed||0),0),{decimals:0})}</td>
                      <td className="num-col mono">{fmtPEN(periods.reduce((s,p)=>s+(p.rhRetention||0),0),{decimals:0})}</td>
                      <td className="num-col mono" style={{fontWeight:700}}>{fmtPEN(periods.reduce((s,p)=>s+(p.igvNeto||0)+(p.rentaOwed||0)+(p.rhRetention||0),0),{decimals:0})}</td>
                      <td className="num-col mono">{fmtPEN(periods.reduce((s,p)=>s+(p.paid||0),0),{decimals:0})}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
          }
        </>
      )}

      {/* ── FACTURAS EMITIDAS ─────────────────────────────────────────────── */}
      {tab==='facturas' && (
        <>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <button className="btn btn-primary" onClick={()=>setInvModal('new')}><Icon name="plus" size={14}/> Nueva factura</button>
          </div>
          {allFaturas.length===0
            ? <div className="card"><Empty icon="invoice" title="Sin facturas registradas" desc="Crea facturas desde el modal principal o agrégalas manualmente aquí." action="+ Nueva factura" onAction={()=>setInvModal('new')}/></div>
            : <>
                <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
                  {[['Base emitida',allFaturas.reduce((s,x)=>s+(x.amount||0),0)],['IGV total',allFaturas.reduce((s,x)=>s+(x.igv||0),0)],['Detracciones',allFaturas.reduce((s,x)=>s+(x.detractionAmt||0),0)],['Neto recibido',allFaturas.reduce((s,x)=>s+(x.netReceived||x.total||0),0)]]
                    .map(([l,v])=>(<div key={l} className="kpi" style={{flex:1,minWidth:140}}><div className="kpi-label">{l}</div><div className="kpi-value" style={{fontSize:16}}>{fmtPEN(v,{decimals:0})}</div></div>))}
                </div>
                <div className="card card-flat">
                  <table className="invoice-table invoice-table-full">
                    <thead><tr>
                      <th>Comprobante</th><th>Fecha</th><th>Cliente</th><th>RUC</th><th>Concepto</th>
                      <th className="num-col">Base</th><th className="num-col">IGV</th>
                      <th className="num-col">Detrac.</th><th className="num-col">Neto</th>
                      <th>Estado</th><th></th>
                    </tr></thead>
                    <tbody>
                      {allFaturas.map(inv=>(
                        <tr key={inv.id} style={inv._fromMain?{background:'color-mix(in srgb,var(--accent) 4%,transparent)'}:{}}>
                          <td className="mono ink-strong">
                            {inv.serie&&inv.number?`${inv.serie}-${inv.number}`:inv.serie||<span className="ink-faint">—</span>}
                            {inv._fromMain&&<span style={{fontSize:9,marginLeft:5,color:'var(--accent)',fontWeight:700,opacity:.8}}>FACT</span>}
                          </td>
                          <td className="mono ink-mute">{inv.date}</td>
                          <td className="ink-strong">{inv.clientName}</td>
                          <td className="mono ink-mute">{inv.clientRuc||'—'}</td>
                          <td className="ink-mute">{inv.concept}</td>
                          <td className="num-col mono">{fmtPEN(inv.amount)}</td>
                          <td className="num-col mono ink-mute">{inv.igv>0?fmtPEN(inv.igv):'—'}</td>
                          <td className="num-col mono">{inv.detractionAmt>0?<span style={{color:'var(--bad)'}}>−{fmtPEN(inv.detractionAmt,{decimals:0})} <span style={{fontSize:10,opacity:.7}}>({inv.detractionPct}%)</span></span>:<span className="ink-faint">—</span>}</td>
                          <td className="num-col mono ink-strong">{fmtPEN(inv.netReceived||inv.total||inv.amount)}</td>
                          <td><SPill s={inv.status}/></td>
                          <td className="row-actions" style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                            <button className="btn btn-xs btn-ghost" onClick={()=>setInvModal({inv})}><Icon name="settings" size={12}/> Editar</button>
                            <button className="btn btn-xs btn-quiet" style={{color:'var(--bad)'}} onClick={()=>{
                              dialog.danger({ itemName: `${inv.serie||''}-${inv.number||inv.id}`, title: '¿Eliminar?' }).then(ok => {
                                if(!ok) return
                                if(inv._fromMain) { onDeleteInvoice?.(inv.id) }
                                else onDeleteTaxInvoice(inv.id)
                              })
                            }}><Icon name="close" size={12}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
          }
        </>
      )}

      {/* ── RHs ──────────────────────────────────────────────────────────── */}
      {tab==='rh' && (
        <>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <button className="btn btn-primary" onClick={()=>setRhModal('new')}><Icon name="plus" size={14}/> Nuevo RH</button>
          </div>
          {allRHs.length===0
            ? <div className="card"><Empty icon="invoice" title="Sin RHs registrados" desc="Crea RHs desde el modal principal o agrégalos manualmente aquí." action="+ Nuevo RH" onAction={()=>setRhModal('new')}/></div>
            : <>
                <div style={{display:'flex',gap:10,marginBottom:16}}>
                  {[['Brutos',allRHs.reduce((s,x)=>s+(x.grossAmount||0),0)],['Retención 8%',allRHs.reduce((s,x)=>s+(x.retention||0),0)],['Neto',allRHs.reduce((s,x)=>s+(x.net||0),0)]]
                    .map(([l,v])=>(<div key={l} className="kpi" style={{flex:1}}><div className="kpi-label">{l}</div><div className="kpi-value" style={{fontSize:16}}>{fmtPEN(v,{decimals:0})}</div></div>))}
                </div>
                <div className="card card-flat">
                  <table className="invoice-table invoice-table-full">
                    <thead><tr><th>RH</th><th>Fecha</th><th>Pagador</th><th>RUC</th><th>Concepto</th><th className="num-col">Bruto</th><th className="num-col">Retención</th><th className="num-col">Neto</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                      {allRHs.map(rh=>(
                        <tr key={rh.id} style={rh._fromMain?{background:'color-mix(in srgb,var(--accent) 4%,transparent)'}:{}}>
                          <td className="mono ink-strong">
                            {rh.serie&&rh.number?`${rh.serie}-${rh.number}`:rh.serie||<span className="ink-faint">—</span>}
                            {rh._fromMain&&<span style={{fontSize:9,marginLeft:5,color:'var(--accent)',fontWeight:700,opacity:.8}}>RH</span>}
                          </td>
                          <td className="mono ink-mute">{rh.date}</td>
                          <td className="ink-strong">{rh.clientName}</td>
                          <td className="mono ink-mute">{rh.clientRuc||'—'}</td>
                          <td className="ink-mute">{rh.concept}</td>
                          <td className="num-col mono">{fmtPEN(rh.grossAmount||0)}</td>
                          <td className="num-col mono ink-bad">{rh.retention>0?`− ${fmtPEN(rh.retention)}`:'—'}</td>
                          <td className="num-col mono ink-strong">{fmtPEN(rh.net||0)}</td>
                          <td><SPill s={rh.status}/></td>
                          <td className="row-actions" style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                            <button className="btn btn-xs btn-ghost" onClick={()=>setRhModal({rh})}><Icon name="settings" size={12}/> Editar</button>
                            <button className="btn btn-xs btn-quiet" style={{color:'var(--bad)'}} onClick={()=>{
                              dialog.danger({ itemName: 'RH', title: '¿Eliminar?' }).then(ok => {
                                if(!ok) return
                                if(rh._fromMain) { onDeleteInvoice?.(rh.id) }
                                else onDeleteTaxRH(rh.id)
                              })
                            }}><Icon name="close" size={12}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
          }
        </>
      )}

      {/* ── COMPRAS ──────────────────────────────────────────────────────── */}
      {tab==='compras' && (
        <>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <button className="btn btn-primary" onClick={()=>setPurModal('new')}><Icon name="plus" size={14}/> Agregar compra</button>
          </div>
          {(taxPurchases||[]).length===0
            ? <div className="card"><Empty icon="bills" title="Sin compras registradas" desc="Registra facturas de proveedores para deducirlas de impuestos." action="+ Agregar compra" onAction={()=>setPurModal('new')}/></div>
            : <>
                <div style={{display:'flex',gap:10,marginBottom:16}}>
                  {[['Total compras',(taxPurchases||[]).reduce((s,x)=>s+(x.total||0),0)],['IGV recuperable',(taxPurchases||[]).reduce((s,x)=>s+(x.igv||0),0)],['Comprobantes',(taxPurchases||[]).length]]
                    .map(([l,v],i)=>(<div key={l} className="kpi" style={{flex:1}}><div className="kpi-label">{l}</div><div className="kpi-value" style={{fontSize:16}}>{i===2?v:fmtPEN(v,{decimals:0})}</div></div>))}
                </div>
                <div className="card card-flat">
                  <table className="invoice-table invoice-table-full">
                    <thead><tr><th>Comprobante</th><th>Fecha</th><th>Proveedor</th><th>RUC</th><th>Concepto</th><th>Cat.</th><th className="num-col">Base</th><th className="num-col">IGV</th><th className="num-col">Total</th><th></th></tr></thead>
                    <tbody>
                      {(taxPurchases||[]).map(p=>(
                        <tr key={p.id}>
                          <td className="mono ink-strong">{p.type} {p.serie&&`${p.serie}-`}{p.number}</td>
                          <td className="mono ink-mute">{p.date}</td>
                          <td className="ink-strong">{p.supplier}</td>
                          <td className="mono ink-mute">{p.supplierRuc||'—'}</td>
                          <td className="ink-mute">{p.concept}</td>
                          <td><span className="pill pill-mute">{p.category}</span></td>
                          <td className="num-col mono">{fmtPEN(p.amount)}</td>
                          <td className="num-col mono ink-mute">{p.igv>0?fmtPEN(p.igv):'—'}</td>
                          <td className="num-col mono ink-strong">{fmtPEN(p.total||p.amount)}</td>
                          <td className="row-actions" style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                            <button className="btn btn-xs btn-ghost" onClick={()=>setPurModal({p})}><Icon name="settings" size={12}/> Editar</button>
                            <button className="btn btn-xs btn-quiet" style={{color:'var(--bad)'}} onClick={()=>{ dialog.danger({ itemName: 'compra', title: '¿Eliminar?' }).then(ok => ok && onDeleteTaxPurchase(p.id)) }}><Icon name="close" size={12}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
          }
        </>
      )}

      {/* ── BOLETAS (referencia, sin impacto fiscal) ──────────────────────── */}
      {tab==='boletas' && (
        <>
          <div className="card" style={{ padding: '14px 18px', background: 'var(--warn-soft)',
            border: '1px solid var(--warn)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18 }}>ℹ️</span>
            <div style={{ fontSize: 13, color: 'var(--warn)' }}>
              <strong>Las boletas y servicios sin declarar no generan IGV ni impactan tu base imponible.</strong>
              {' '}El ingreso cobrado es 100% líquido. Se muestran aquí solo como referencia.
            </div>
          </div>

          {boletasEmitidas.length === 0
            ? <div className="empty-state">
                <div className="empty-state-icon"><Icon name="invoice" size={22}/></div>
                <h3>Sin boletas registradas</h3>
                <p>Las facturas de tipo boleta o servicio sin declarar aparecerán aquí.</p>
              </div>
            : <div className="card card-flat">
                <table className="invoice-table invoice-table-full">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Cliente</th>
                      <th>Tipo</th>
                      <th>Fecha</th>
                      <th className="num-col">Monto</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boletasEmitidas.map(inv => (
                      <tr key={inv.id}>
                        <td className="mono" style={{ fontSize: 12 }}>{inv.id}</td>
                        <td>{inv.client}</td>
                        <td>
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 999,
                            background: 'var(--mute-soft)', color: 'var(--ink-mute)',
                          }}>
                            {inv.docType === 'boleta' ? 'Boleta' : 'Sin declarar'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{inv.issued || inv.issuedDate || '—'}</td>
                        <td className="num-col mono">{fmtPEN(inv.amount || 0)}</td>
                        <td>
                          <span className={`pill ${inv.status === 'paid' ? 'pill-good' : 'pill-warn'}`}>
                            {inv.status === 'paid' ? 'Cobrada' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }

          {/* Summary */}
          {boletasEmitidas.length > 0 && (
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                <div>
                  <div className="lbl" style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Total emitido
                  </div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
                    {fmtPEN(boletasEmitidas.reduce((s, i) => s + (i.amount || 0), 0))}
                  </div>
                </div>
                <div>
                  <div className="lbl" style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Total cobrado
                  </div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--good)' }}>
                    {fmtPEN(boletasEmitidas.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0))}
                  </div>
                </div>
                <div>
                  <div className="lbl" style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    IGV generado
                  </div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--good)' }}>
                    S/ 0.00
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--good)', marginTop: 2 }}>✓ 100% líquido</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {settingsModal && (
        <TaxSettingsModal settings={settings}
          onSave={d => { onSaveSettings({ ...settings, ...d }); setSettingsModal(false) }}
          onClose={() => setSettingsModal(false)}/>
      )}
      {editPeriod && (
        <PeriodModal
          period={editPeriod}
          computed={editPeriod}
          onSave={d => { onUpdateTaxPeriod({ id: editPeriod.key, ...d }); setEditPeriod(null) }}
          onClose={() => setEditPeriod(null)}/>
      )}
      {invModal && (
        <InvModal
          initial={invModal==='new' ? null : invModal.inv}
          defaultDetractionPct={detractionPct}
          clients={clients}
          onSave={d => {
            if (invModal === 'new') {
              onAddTaxInvoice({...d, id:'ti-'+Date.now()})
            } else if (invModal.inv?._fromMain) {
              // Convert _fromMain entry into a proper taxInvoice
              onAddTaxInvoice({...d, id:'ti-'+Date.now(), fromInvoiceId: invModal.inv.fromInvoiceId})
            } else {
              onEditTaxInvoice({...invModal.inv, ...d})
            }
            setInvModal(null)
          }}
          onClose={() => setInvModal(null)}/>
      )}
      {rhModal && (
        <RHModal
          initial={rhModal==='new' ? null : rhModal.rh}
          clients={clients}
          onSave={d => {
            if (rhModal === 'new') {
              onAddTaxRH({...d, id:'rh-'+Date.now()})
            } else if (rhModal.rh?._fromMain) {
              // Convert _fromMain entry into a proper taxRH
              onAddTaxRH({...d, id:'rh-'+Date.now(), fromInvoiceId: rhModal.rh.fromInvoiceId})
            } else {
              onEditTaxRH({...rhModal.rh, ...d})
            }
            setRhModal(null)
          }}
          onClose={() => setRhModal(null)}/>
      )}
      {purModal && (
        <PurchaseModal
          initial={purModal==='new' ? null : purModal.p}
          onSave={d => { purModal==='new' ? onAddTaxPurchase({...d,id:'pur-'+Date.now()}) : onEditTaxPurchase({...purModal.p,...d}); setPurModal(null) }}
          onClose={() => setPurModal(null)}/>
      )}
    </div>
  )
}
