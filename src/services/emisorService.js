/**
 * emisorService.js
 *
 * Servicio de acceso a datos del emisor.
 * Actualmente usa localStorage; cuando migremos a Supabase
 * solo hay que reemplazar las funciones loadEmisor / saveEmisor
 * sin tocar ningún componente.
 *
 * Contrato del objeto emisor:
 * {
 *   nombre:   string  — Nombre de la empresa o marca
 *   tagline:  string  — Descripción / tagline
 *   ruc:      string  — RUC o DNI
 *   email:    string  — Correo electrónico
 *   telefono: string  — Teléfono / WhatsApp
 *   direccion:string  — Dirección / Ciudad
 *   web:      string  — Sitio web (opcional)
 * }
 */

const STORAGE_KEY = 'brava_emisor'

export const DEFAULT_EMISOR = {
  nombre:    'Brava',
  tagline:   'Dashboard de finanzas para freelancers',
  ruc:       '',
  email:     '',
  telefono:  '',
  direccion: 'Lima, Perú',
  web:       '',
}

// ── Lee el emisor guardado. Si no existe, devuelve los defaults.
export function loadEmisor() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_EMISOR }
    return { ...DEFAULT_EMISOR, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_EMISOR }
  }
}

// ── Persiste el emisor. Devuelve el objeto guardado.
export function saveEmisor(emisor) {
  try {
    const data = { ...DEFAULT_EMISOR, ...emisor }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return data
  } catch (err) {
    console.error('[emisorService] Error al guardar:', err)
    return emisor
  }
}

// ── Limpia el emisor y restaura los defaults.
export function resetEmisor() {
  localStorage.removeItem(STORAGE_KEY)
  return { ...DEFAULT_EMISOR }
}
