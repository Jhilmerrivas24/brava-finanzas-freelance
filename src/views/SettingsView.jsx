import Icon from '../components/Icon.jsx'

const RUBROS = [
  'Diseño gráfico',
  'Desarrollo web',
  'Fotografía',
  'Redacción / Copywriting',
  'Marketing digital',
  'Ilustración',
  'Consultoría',
  'Arquitectura',
  'Videografía',
  'Traducción',
  'Otro',
]

export default function SettingsView({ settings, onSave }) {
  function handleSubmit(e) {
    e.preventDefault()
    const form = new FormData(e.target)
    onSave({
      name:          form.get('name'),
      role:          form.get('role'),
      industry:      form.get('industry'),
      currency:      form.get('currency'),
      myRuc:         form.get('myRuc'),
      taxRate:       Number(form.get('taxRate')),
      hourlyRate:    Number(form.get('hourlyRate')),
      detractionPct: Number(form.get('detractionPct')),
      rentaRate:     Number(form.get('rentaRate')),
      paymentDay:    Number(form.get('paymentDay')),
    })
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Perfil y preferencias</div>
          <h1>Configuración</h1>
          <p className="lede">Personaliza la app con tu información y parámetros financieros.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Perfil personal */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Identidad</div>
              <h3 className="card-title">Tu perfil</h3>
            </div>
          </div>

          <div className="settings-grid">
            <div className="field">
              <label htmlFor="name">Nombre completo</label>
              <input
                type="text"
                id="name"
                name="name"
                defaultValue={settings.name}
                placeholder="Ej. Ana Reyes"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="role">Cargo / título profesional</label>
              <input
                type="text"
                id="role"
                name="role"
                defaultValue={settings.role}
                placeholder="Ej. Diseñadora freelance"
              />
            </div>

            <div className="field">
              <label htmlFor="myRuc">RUC / DNI</label>
              <input
                type="text"
                id="myRuc"
                name="myRuc"
                defaultValue={settings.myRuc}
                placeholder="Ej. 20601234567"
                maxLength={11}
                style={{ maxWidth: 180 }}
                onInput={e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11) }}
              />
              <span className="field-hint">Tu número de RUC o DNI como freelancer.</span>
            </div>

            <div className="field">
              <label htmlFor="industry">Rubro</label>
              <select id="industry" name="industry" defaultValue={settings.industry}>
                <option value="">— Selecciona tu rubro —</option>
                {RUBROS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="currency">Moneda</label>
              <select id="currency" name="currency" defaultValue={settings.currency || 'PEN'}>
                <option value="PEN">S/ — Sol peruano (PEN)</option>
                <option value="USD">$ — Dólar estadounidense (USD)</option>
                <option value="EUR">€ — Euro (EUR)</option>
                <option value="CLP">$ — Peso chileno (CLP)</option>
                <option value="COP">$ — Peso colombiano (COP)</option>
                <option value="MXN">$ — Peso mexicano (MXN)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Parámetros financieros */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Finanzas</div>
              <h3 className="card-title">Parámetros de trabajo</h3>
            </div>
          </div>

          <div className="settings-grid">
            <div className="field">
              <label htmlFor="taxRate">Tasa de impuestos (%)</label>
              <input
                type="number"
                id="taxRate"
                name="taxRate"
                defaultValue={settings.taxRate ?? 30}
                min={0}
                max={100}
                step={0.5}
                placeholder="30"
              />
              <span className="field-hint">Se reservará este % de cada factura cobrada.</span>
            </div>

            <div className="field">
              <label htmlFor="hourlyRate">Tarifa por hora</label>
              <input
                type="number"
                id="hourlyRate"
                name="hourlyRate"
                defaultValue={settings.hourlyRate ?? 0}
                min={0}
                step={1}
                placeholder="0"
              />
              <span className="field-hint">Usada para calcular el módulo Time-to-money.</span>
            </div>

            <div className="field">
              <label htmlFor="detractionPct">Detracción por defecto (%)</label>
              <input
                type="number"
                id="detractionPct"
                name="detractionPct"
                defaultValue={settings.detractionPct ?? 12}
                min={0}
                max={100}
                step={0.5}
                placeholder="12"
              />
              <span className="field-hint">Se pre-llena en cada factura. Puedes cambiarlo por factura. Ej: Fotografía/Video = 12%, Publicidad = 10%, Construcción = 4%.</span>
            </div>

            <div className="field">
              <label htmlFor="rentaRate">Tasa Renta pago a cuenta (%)</label>
              <input
                type="number"
                id="rentaRate"
                name="rentaRate"
                defaultValue={settings.rentaRate ?? 1.5}
                min={0}
                max={10}
                step={0.1}
                placeholder="1.5"
              />
              <span className="field-hint">Porcentaje de cada factura que se declara como pago a cuenta de renta. Varía según rubro (1.5% coeficiente habitual).</span>
            </div>

            <div className="field">
              <label htmlFor="paymentDay">Día de pago SUNAT</label>
              <input
                type="number"
                id="paymentDay"
                name="paymentDay"
                defaultValue={settings.paymentDay ?? 21}
                min={1}
                max={31}
                step={1}
                placeholder="21"
              />
              <span className="field-hint">Día del mes en que vencen tus obligaciones tributarias (varía según el último dígito de tu RUC).</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            <Icon name="check" size={14} /> Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}
