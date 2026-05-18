import Icon from '../components/Icon.jsx'
import { fmtPEN } from '../data.js'

// Genera consejos dinámicos basados en los datos reales del usuario
function generateTips(invoices, settings, bills, goals) {
  const tips = []

  const paid    = invoices.filter(i => i.status === 'paid')
  const overdue = invoices.filter(i => i.status === 'overdue')
  const pending = invoices.filter(i => i.status === 'pending')

  // Use last 3 months average income for ratio comparisons (avoids all-time skew)
  const now = new Date()
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const recentPaid = paid.filter(i => {
    const dateStr = i.paidAt || i.issuedDate
    if (!dateStr) return false
    return new Date(dateStr) >= threeMonthsAgo
  })
  const avgMonthlyIncome = recentPaid.reduce((s, i) => s + i.amount, 0) / 3

  const totalIncome  = paid.reduce((s, i) => s + i.amount, 0)
  const totalOverdue = overdue.reduce((s, i) => s + i.amount, 0)
  const totalPending = pending.reduce((s, i) => s + i.amount, 0)
  const totalBills   = (bills || []).filter(b => b.active !== false).reduce((s, b) => s + b.amount, 0)
  const taxRate      = settings?.taxRate ?? 30

  // ── Facturas vencidas ─────────────────────────
  if (overdue.length > 0) {
    tips.push({
      id: 'overdue', type: 'bad', icon: 'bell',
      title: `${overdue.length} factura${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''} sin cobrar`,
      body: `Tienes ${fmtPEN(totalOverdue)} en facturas vencidas. Cada día que pasa reduce tu liquidez. Considera enviar un recordatorio amigable hoy mismo.`,
      action: 'Ver facturas vencidas', view: 'invoices',
    })
  }

  // ── Cobros pendientes ─────────────────────────
  if (pending.length > 0) {
    tips.push({
      id: 'pending', type: 'warn', icon: 'clock',
      title: `${fmtPEN(totalPending)} por ingresar`,
      body: `Tienes ${pending.length} factura${pending.length > 1 ? 's' : ''} en plazo por cobrar. Si se cobran todas, representan un ingreso próximo importante.`,
      action: 'Ver facturas pendientes', view: 'invoices',
    })
  }

  // ── Gastos fijos vs ingresos (últimos 3 meses) ──────────────────
  if (avgMonthlyIncome > 0 && totalBills > 0) {
    const billsRatio = (totalBills / avgMonthlyIncome) * 100
    if (billsRatio > 40) {
      tips.push({
        id: 'bills-high', type: 'warn', icon: 'bills',
        title: 'Gastos fijos muy altos para tus ingresos',
        body: `Tus gastos fijos (${fmtPEN(totalBills)}/mes) representan el ${billsRatio.toFixed(0)}% de tu ingreso mensual promedio de los últimos 3 meses. Lo recomendable es que no superen el 30–35%.`,
        action: 'Revisar gastos fijos', view: 'bills',
      })
    } else {
      tips.push({
        id: 'bills-ok', type: 'good', icon: 'bills',
        title: 'Gastos fijos bajo control',
        body: `Tus gastos recurrentes son solo el ${billsRatio.toFixed(0)}% de tu ingreso mensual promedio. Buen trabajo manteniendo los costos bajos.`,
      })
    }
  }

  // ── Sin ingresos aún ─────────────────────────
  if (invoices.length === 0) {
    tips.push({
      id: 'no-invoices', type: 'neutral', icon: 'invoice',
      title: 'Crea tu primera factura',
      body: 'Registra tus servicios como facturas para llevar un control claro de lo que cobras y a quién. El sistema calculará automáticamente tu reserva de impuestos.',
      action: 'Crear factura', view: 'invoices',
    })
  }

  // ── Impuestos ─────────────────────────────────
  if (totalIncome > 0 && taxRate > 0) {
    const shouldHaveReserved = totalIncome * (taxRate / 100)
    tips.push({
      id: 'tax-reserve', type: 'neutral', icon: 'taxes',
      title: `Reserva sugerida de impuestos: ${fmtPEN(shouldHaveReserved)}`,
      body: `Con una tasa del ${taxRate}% sobre tus ${fmtPEN(totalIncome)} cobrados, deberías tener reservados ${fmtPEN(shouldHaveReserved)} para SUNAT. Mantén esta reserva separada de tu cuenta de gastos.`,
      action: 'Ver impuestos', view: 'taxes',
    })
  }

  // ── Diversificación de clientes ───────────────
  const clientCount = new Set(invoices.map(i => i.client)).size
  if (invoices.length >= 3 && clientCount <= 2) {
    const topClient = [...invoices.reduce((map, inv) => {
      map.set(inv.client, (map.get(inv.client) || 0) + inv.amount)
      return map
    }, new Map()).entries()].sort((a, b) => b[1] - a[1])[0]
    if (topClient && totalIncome > 0) {
      const topRatio = (topClient[1] / totalIncome) * 100
      if (topRatio > 60) {
        tips.push({
          id: 'concentration', type: 'warn', icon: 'clients',
          title: 'Dependencia alta de un solo cliente',
          body: `El cliente "${topClient[0]}" representa el ${topRatio.toFixed(0)}% de tus ingresos. Depender tanto de un solo cliente es riesgoso. Intenta diversificar.`,
          action: 'Ver clientes', view: 'clients',
        })
      }
    }
  }

  // ── Metas de ahorro ───────────────────────────
  const goalsBehind = (goals || []).filter(g => (g.current / g.target) < 0.3)
  if (goalsBehind.length > 0) {
    tips.push({
      id: 'goals-behind', type: 'neutral', icon: 'goals',
      title: `${goalsBehind.length} meta${goalsBehind.length > 1 ? 's' : ''} con poco avance`,
      body: `${goalsBehind.map(g => `"${g.name}"`).join(', ')} ${goalsBehind.length > 1 ? 'están' : 'está'} por debajo del 30%. Considera asignar un porcentaje fijo de cada factura cobrada a estas metas.`,
      action: 'Ver metas', view: 'goals',
    })
  }

  // ── Tarifa por hora ───────────────────────────
  if ((settings?.hourlyRate ?? 0) === 0 && invoices.length > 0) {
    tips.push({
      id: 'hourly-rate', type: 'neutral', icon: 'clock',
      title: 'Define tu tarifa por hora',
      body: 'Sin una tarifa definida no puedes saber si estás cobrando lo suficiente por tu tiempo. Ve a Ajustes y configura cuánto vale tu hora de trabajo.',
      action: 'Ir a ajustes', view: 'settings',
    })
  }

  // ── Todo bien ────────────────────────────────
  if (tips.length === 0) {
    tips.push({
      id: 'all-good', type: 'good', icon: 'goals',
      title: '¡Todo en orden!',
      body: 'No hay alertas activas. Sigue así — cuando haya algo que mejorar aparecerá aquí.',
    })
  }

  return tips
}

const TYPE_STYLE = {
  good:    { bg: 'var(--good-soft)',  color: 'var(--good)',     border: 'var(--good-soft)'  },
  warn:    { bg: 'var(--warn-soft)',  color: 'var(--warn)',     border: 'var(--warn-soft)'  },
  bad:     { bg: 'var(--bad-soft)',   color: 'var(--bad)',      border: 'var(--bad-soft)'   },
  neutral: { bg: 'var(--mute-soft)', color: 'var(--ink-mute)', border: 'var(--border)'     },
}

const GENERAL_TIPS = [
  {
    title: 'La regla 50/30/20 adaptada al freelance',
    body: 'Destina el 50% de tus ingresos a gastos esenciales (renta, servicios), 30% a tu negocio (herramientas, marketing), y 20% a ahorro e impuestos. Ajusta los % según tu realidad.',
  },
  {
    title: 'Factura rápido, cobra rápido',
    body: 'Envía la factura el mismo día que terminas el trabajo. Cada día de retraso al facturar suele equivaler a un día más de espera para el pago.',
  },
  {
    title: 'Fondo de emergencia = 3 meses de gastos fijos',
    body: 'Mantén siempre en una cuenta separada el equivalente a 3 meses de tus gastos fijos. Es tu red de seguridad cuando los proyectos escasean.',
  },
  {
    title: 'Sube tu tarifa al menos una vez al año',
    body: 'La inflación erosiona el valor de tu hora. Si no ajustas tus tarifas anualmente, efectivamente estás ganando menos cada año. Un 10–15% es razonable si tienes trabajo constante.',
  },
  {
    title: 'Cobra un adelanto siempre',
    body: 'Pedir el 30–50% de adelanto antes de empezar un proyecto protege tu tiempo y filtra clientes poco serios. Es una práctica estándar, no un signo de desconfianza.',
  },
]

export default function ConsejosView({ invoices, settings, bills, goals, onGoto }) {
  const tips = generateTips(invoices, settings, bills, goals)

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <div className="eyebrow">Análisis inteligente</div>
          <h1>Sugerencias financieras</h1>
          <p className="lede">Consejos personalizados basados en tus datos actuales.</p>
        </div>
      </header>

      {/* Alertas personalizadas */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="eyebrow" style={{ padding: '4px 0' }}>Basado en tus datos</div>
        {tips.map(tip => {
          const s = TYPE_STYLE[tip.type]
          return (
            <div
              key={tip.id}
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,255,255,.5)', display: 'grid', placeItems: 'center',
                color: s.color,
              }}>
                <Icon name={tip.icon} size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>{tip.title}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{tip.body}</div>
                {tip.action && tip.view && (
                  <button
                    className="btn btn-xs"
                    style={{ marginTop: 10, background: 'rgba(255,255,255,.7)', borderColor: 'transparent' }}
                    onClick={() => onGoto(tip.view)}
                  >
                    {tip.action} <Icon name="arrowRight" size={11} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </section>

      {/* Consejos generales */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <div className="eyebrow" style={{ padding: '4px 0' }}>Buenas prácticas freelance</div>
        <div className="goals-grid">
          {GENERAL_TIPS.map((tip, i) => (
            <div key={i} className="card" style={{ gap: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{tip.title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-mute)', lineHeight: 1.55 }}>{tip.body}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
