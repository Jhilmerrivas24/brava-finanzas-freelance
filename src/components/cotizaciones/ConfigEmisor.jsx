import { useState } from 'react'
import { loadEmisor, saveEmisor, DEFAULT_EMISOR } from '../../services/emisorService.js'
import Icon from '../Icon.jsx'

// ── Colores del header del PDF ──────────────────────
// Verde teal corporativo (ajustado al branding de cotizaciones)
const HEADER_BG      = '#1D9E75'
const HEADER_NAME_FG = '#FFFFFF'
const HEADER_TAG_FG  = '#9FE1CB'
const HEADER_META_FG = '#C8F0E4'

// ── Preview del header PDF ─────────────────────────
function HeaderPreview({ emisor }) {
  const { nombre, tagline, email, telefono, ruc, direccion, web } = emisor

  const metaParts = [ruc && `RUC ${ruc}`, direccion, web].filter(Boolean)
  const contactParts = [email, telefono].filter(Boolean)

  return (
    <div className="emisor-preview-wrap">
      <div className="emisor-preview-label">Preview del encabezado PDF</div>
      <div className="emisor-preview-header" style={{ background: HEADER_BG }}>
        {/* Izquierda: marca */}
        <div className="emisor-preview-left">
          <div className="emisor-preview-name" style={{ color: HEADER_NAME_FG }}>
            {nombre || 'Mi Empresa'}
          </div>
          {tagline && (
            <div className="emisor-preview-tagline" style={{ color: HEADER_TAG_FG }}>
              {tagline}
            </div>
          )}
          {contactParts.length > 0 && (
            <div className="emisor-preview-contact" style={{ color: HEADER_META_FG }}>
              {contactParts.join(' · ')}
            </div>
          )}
          {metaParts.length > 0 && (
            <div className="emisor-preview-meta" style={{ color: HEADER_META_FG }}>
              {metaParts.join(' · ')}
            </div>
          )}
        </div>

        {/* Derecha: número de cotización mock */}
        <div className="emisor-preview-right">
          <div className="emisor-preview-cot-label" style={{ color: HEADER_TAG_FG }}>
            COTIZACIÓN
          </div>
          <div className="emisor-preview-cot-id" style={{ color: HEADER_NAME_FG }}>
            COT-2026-001
          </div>
        </div>
      </div>

      {/* Nota aclaratoria */}
      <div className="emisor-preview-note">
        Así se verá el encabezado en todos tus PDFs exportados.
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────
export default function ConfigEmisor({ onClose }) {
  // Cargamos desde el service; los cambios locales son el "borrador"
  const [form, setForm]       = useState(() => loadEmisor())
  const [saved, setSaved]     = useState(false)
  const [dirty, setDirty]     = useState(false)

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setSaved(false)
    setDirty(true)
  }

  function handleSave() {
    saveEmisor(form)
    setSaved(true)
    setDirty(false)
    // Oculta el mensaje tras 2.5 s
    setTimeout(() => setSaved(false), 2500)
  }

  function handleReset() {
    if (!window.confirm('¿Restaurar los valores por defecto?')) return
    setForm({ ...DEFAULT_EMISOR })
    setSaved(false)
    setDirty(true)
  }

  const FIELDS = [
    { key: 'nombre',    label: 'Nombre de empresa / marca',   placeholder: 'Ej: Brava Studio',         type: 'text' },
    { key: 'tagline',   label: 'Descripción / tagline',        placeholder: 'Ej: Fotografía comercial',  type: 'text' },
    { key: 'ruc',       label: 'RUC o DNI',                    placeholder: 'Ej: 20601234567',           type: 'text' },
    { key: 'email',     label: 'Correo electrónico',           placeholder: 'hola@mismarca.com',         type: 'email' },
    { key: 'telefono',  label: 'Teléfono / WhatsApp',          placeholder: '+51 999 888 777',           type: 'tel' },
    { key: 'direccion', label: 'Dirección / Ciudad',           placeholder: 'Lima, Perú',                type: 'text' },
    { key: 'web',       label: 'Sitio web (opcional)',         placeholder: 'https://mismarca.com',      type: 'url' },
  ]

  return (
    <div className="config-emisor-overlay">
      <div className="config-emisor-panel">

        {/* Header del panel */}
        <div className="config-emisor-head">
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Datos del emisor</div>
            <div className="ink-mute" style={{ fontSize: 12, marginTop: 2 }}>
              Se usan en el encabezado de todos los PDFs de cotización.
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Cerrar">
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Cuerpo: formulario + preview */}
        <div className="config-emisor-body">

          {/* Formulario */}
          <div className="config-emisor-form">
            {FIELDS.map(({ key, label, placeholder, type }) => (
              <div className="field" key={key}>
                <label>{label}</label>
                <input
                  type={type}
                  value={form[key] || ''}
                  placeholder={placeholder}
                  onChange={e => handleChange(key, e.target.value)}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="config-emisor-preview-col">
            <HeaderPreview emisor={form} />
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="config-emisor-foot">
          <button
            className="btn btn-ghost btn-xs"
            onClick={handleReset}
            style={{ color: 'var(--ink-mute)' }}
          >
            Restaurar defaults
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saved && (
              <span className="emisor-saved-msg">
                <Icon name="check" size={12} /> Datos guardados
              </span>
            )}
            <button className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!dirty && !saved}
            >
              <Icon name="check" size={14} /> Guardar
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
