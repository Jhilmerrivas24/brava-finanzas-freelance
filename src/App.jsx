import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { viewTransition } from './lib/animations.js'
import { useToast } from './hooks/useToast.js'
import Sidebar from './components/Sidebar.jsx'
import Icon from './components/Icon.jsx'
import Overview from './views/Overview.jsx'
import InvoicesView from './views/InvoicesView.jsx'
import ClientsView from './views/ClientsView.jsx'
import CashflowView from './views/CashflowView.jsx'
import TaxesView from './views/TaxesView.jsx'
import GoalsView from './views/GoalsView.jsx'
import GastosView from './views/GastosView.jsx'
import BudgetView from './views/BudgetView.jsx'
import IngresosView from './views/IngresosView.jsx'
import ConsejosView from './views/ConsejosView.jsx'
import SettingsView from './views/SettingsView.jsx'
import QuotesView from './views/QuotesView.jsx'
import AccountsView from './views/AccountsView.jsx'
import CreditLinesView from './views/CreditLinesView.jsx'
import LoansView from './views/LoansView.jsx'
import PaymentsView from './views/PaymentsView.jsx'
import NewInvoiceModal from './modals/NewInvoiceModal.jsx'
import { supabase } from './lib/supabase.js'
import { useAuth } from './auth/AuthContext.jsx'
import LoginView from './auth/LoginView.jsx'
import RegisterView from './auth/RegisterView.jsx'
import ForgotPasswordView from './auth/ForgotPasswordView.jsx'
import { fmtPEN } from './data.js'

const SEED_IDS = ['INV-0142','INV-0143','INV-0144','INV-0145','INV-0146','INV-0147','INV-0148','INV-0149']

const DEFAULT_SETTINGS = {
  name: '',
  role: '',
  industry: '',
  currency: 'PEN',
  taxRate: 30,
  hourlyRate: 0,
  detractionPct: 12,
  rentaRate: 1.5,
  paymentDay: 21,
}

function loadSettings() {
  try {
    const raw = localStorage.getItem('brava:settings')
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

function loadDark() {
  try { return localStorage.getItem('brava:dark') === '1' } catch { return false }
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

// ── Mark-paid account selector modal ─────────────────────────────────────────
function MarkPaidModal({ invoice, accounts, onConfirm, onClose }) {
  const [selectedId, setSelectedId] = useState(null)
  const TIPO_LABEL = { corriente: 'Cta. corriente', ahorros: 'Ahorros', digital: 'Billetera digital', negocio: 'Negocio', otro: 'Otro' }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">Registrar cobro</div>
            <h2 className="modal-title">¿A qué cuenta entró?</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-body">
          {/* Invoice info */}
          <div style={{
            marginBottom: 16, padding: '10px 14px',
            background: 'var(--bg-elev)', borderRadius: 8, fontSize: 13,
          }}>
            <div style={{ color: 'var(--ink-mute)', marginBottom: 4 }}>Factura cobrada</div>
            <div style={{ fontWeight: 700 }}>{invoice.client}</div>
            <div className="mono" style={{ color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
              {fmtPEN(invoice.amount)}
            </div>
          </div>
          {/* Account list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {accounts.map(a => {
              const nombre = a.nombre ?? a.bank ?? '(sin nombre)'
              const saldo  = a.saldo  ?? a.balance ?? 0
              const tipo   = a.tipo   ?? 'corriente'
              return (
                <button
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${selectedId === a.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: selectedId === a.id
                      ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-elev))'
                      : 'var(--bg-elev)',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
                >
                  <Icon name="bank" size={16} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
                      {TIPO_LABEL[tipo] ?? tipo} · Saldo: {fmtPEN(saldo)}
                    </div>
                  </div>
                  {selectedId === a.id && <Icon name="check" size={14} />}
                </button>
              )
            })}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => onConfirm(null)}>
            Sin asignar cuenta
          </button>
          <button
            className="btn btn-primary"
            disabled={!selectedId}
            onClick={() => onConfirm(selectedId)}
          >
            <Icon name="check" size={14} /> Confirmar cobro
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Auth-gated shell ──────────────────────────────────────────────────────────
function AuthGate() {
  const { user, loading, signOut } = useAuth()
  const [authView, setAuthView] = useState('login') // 'login' | 'register' | 'forgot'

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg, #0f172a)', gap: 16,
      }}>
        <svg viewBox="0 0 24 24" width="40" height="40">
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#1D9E75" />
          <path d="M8 16V8h4.2c1.7 0 2.8.9 2.8 2.3 0 1-.6 1.7-1.5 1.9 1.1.2 1.8 1 1.8 2.1 0 1.5-1.1 2.4-2.9 2.4H8zm2-4.8h1.8c.7 0 1.2-.3 1.2-1s-.5-1-1.2-1H10v2zm0 3.2h1.9c.8 0 1.3-.4 1.3-1.1s-.5-1.1-1.3-1.1H10v2.2z" fill="#fff" />
        </svg>
        <div style={{ color: '#64748b', fontSize: 14 }}>Cargando Brava…</div>
      </div>
    )
  }

  if (!user) {
    if (authView === 'register') return <RegisterView onGoLogin={() => setAuthView('login')} />
    if (authView === 'forgot')   return <ForgotPasswordView onGoLogin={() => setAuthView('login')} />
    return <LoginView onGoRegister={() => setAuthView('register')} onGoForgot={() => setAuthView('forgot')} />
  }

  return <Dashboard signOut={signOut} userEmail={user.email} />
}

function Dashboard({ signOut, userEmail } = {}) {
  const toast = useToast()
  const [dark, setDark] = useState(loadDark)
  const [view, setView] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [invoices, setInvoices] = useState(() => loadLS('brava:invoices', []))
  const [settings, setSettings] = useState(loadSettings)
  const [bills, setBills] = useState(() => loadLS('brava:bills', []))
  const [fixedIncome, setFixedIncome] = useState(() => loadLS('brava:fixedIncome', []))
  const [cashflow, setCashflow] = useState(() => loadLS('brava:cashflow', []))
  const [goals, setGoals] = useState(() => loadLS('brava:goals', []))
  const [clients, setClients] = useState(() => loadLS('brava:clients', []))
  const [accounts, setAccounts] = useState(() => loadLS('brava:accounts', []))
  const [accountMovements, setAccountMovements] = useState(() => loadLS('brava:accountMovements', []))
  const [creditLines, setCreditLines]           = useState(() => loadLS('brava:creditLines', []))
  const [loans, setLoans]                       = useState(() => loadLS('brava:loans', []))
  const [loanPayments, setLoanPayments]         = useState(() => loadLS('brava:loanPayments', []))
  const [monthlyChecks, setMonthlyChecks]       = useState(() => loadLS('brava:monthlyChecks', {}))
  const [payModal, setPayModal] = useState(null)   // null | { id, amount, client }
  const [taxPeriods, setTaxPeriods] = useState(() => loadLS('brava:taxPeriods', []))
  const [taxInvoices, setTaxInvoices] = useState(() => loadLS('brava:taxInvoices', []))
  const [taxRH, setTaxRH] = useState(() => loadLS('brava:taxRH', []))
  const [taxPurchases, setTaxPurchases] = useState(() => loadLS('brava:taxPurchases', []))
  const [quotes, setQuotes]                     = useState(() => loadLS('brava:quotes', []))
  const [variableExpenses, setVariableExpenses] = useState(() => loadLS('brava:variableExpenses', []))

  // ── Computed real data for Overview ────────────────────────────────────────
  const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']
  const data = useMemo(() => {
    const now      = new Date()
    const thisYear = now.getFullYear()
    const thisMon  = now.getMonth() // 0-indexed

    // Paid invoices this month — use paidAt if available, fallback to issuedDate
    const invoiceIncomeThisMonth = invoices
      .filter(i => {
        if (i.status !== 'paid') return false
        const dateStr = i.paidAt || i.issuedDate
        if (!dateStr) return false
        const d = new Date(dateStr)
        return d.getMonth() === thisMon && d.getFullYear() === thisYear
      })
      .reduce((s, i) => s + i.amount, 0)

    // Fixed income monthly equivalent
    const FREQ_DIV = { monthly:1, bimonthly:2, quarterly:3, annual:12 }
    const fixedIncomeMonthly = fixedIncome.reduce((s, inc) => {
      const div = FREQ_DIV[inc.frequency] || 1
      return s + (inc.amount || 0) / div
    }, 0)

    const inThisMonth  = invoiceIncomeThisMonth + fixedIncomeMonthly
    // Only sum bills that are not explicitly paused / inactive
    const outThisMonth = bills.filter(b => b.active !== false).reduce((s, b) => s + (b.amount || 0), 0)

    const cashAvailable = accounts.reduce((s, a) => s + (a.saldo ?? a.balance ?? 0), 0)

    // ── Tax calculations — corrected by docType ───────────────────────────────
    // Only 'factura' (with RUC) and 'rh' generate fiscal obligations.
    // 'boleta' and 'sin_declarar' are 100% liquid — no tax reserve needed.

    // Helper: is this month?
    const isThisMon = (i) => {
      if (!i.issuedDate) return false
      const d = new Date(i.issuedDate)
      return d.getMonth() === thisMon && d.getFullYear() === thisYear
    }

    // IGV obligation this month — facturas paid this month
    // (igv field is 18% of base, set by NewInvoiceModal)
    const igvThisMonth = invoices
      .filter(i => i.status === 'paid' && i.docType === 'factura' && isThisMon(i))
      .reduce((s, i) => s + (i.igv ?? i.amount * 0.18), 0)

    // Retention from RH paid this month (hasRetention === true → client retains 8%)
    const retentionThisMonth = invoices
      .filter(i => i.status === 'paid' && i.docType === 'rh' && i.hasRetention && isThisMon(i))
      .reduce((s, i) => s + (i.retention || 0), 0)

    // Renta target — only fiscal docs (factura + rh) from current year
    const allFiscalIncome = invoices
      .filter(i => {
        if (i.status !== 'paid') return false
        if (i.docType !== 'factura' && i.docType !== 'rh') return false
        if (!i.issuedDate) return false
        return new Date(i.issuedDate).getFullYear() === thisYear
      })
      .reduce((s, i) => s + (i.amount || 0), 0)
    const taxTarget = allFiscalIncome * ((settings.taxRate || 30) / 100)

    // taxSetAside = confirmed renta payments registered in TaxesView for current year
    const taxSetAside = (taxPeriods || [])
      .filter(p => p.id && String(p.id).startsWith(String(thisYear)))
      .reduce((s, p) => s + (p.paid || 0), 0)

    // Hours from quotes this month (unit 'hr' or 'hora')
    const quotesThisMonth = (quotes || []).filter(q => {
      if (!q.date) return false  // exclude quotes with no date — don't inflate any month
      const d = new Date(q.date)
      return d.getMonth() === thisMon && d.getFullYear() === thisYear
    })
    const hoursBilled = quotesThisMonth
      .filter(q => q.status === 'pending' || q.status === 'accepted')
      .reduce((s, q) => s + (q.items || []).reduce((si, it) =>
        si + (/^hr/i.test(it.unit || '') ? (it.qty || 0) : 0), 0), 0)
    const hoursPaid = quotesThisMonth
      .filter(q => q.status === 'accepted')
      .reduce((s, q) => s + (q.items || []).reduce((si, it) =>
        si + (/^hr/i.test(it.unit || '') ? (it.qty || 0) : 0), 0), 0)

    // Projected income: accepted quotes not yet converted to an invoice
    const invoicedQuoteIds = new Set(invoices.map(i => i.fromQuoteId).filter(Boolean))
    const projectedIncome  = (quotes || [])
      .filter(q => q.status === 'accepted' && !invoicedQuoteIds.has(q.id))
      .reduce((s, q) => s + (q.total || 0), 0)

    const cfData = [...cashflow]
      .sort((a, b) => (a.year - b.year) || (a.month - b.month))
      .slice(-6)
      .map(m => ({ month: MONTHS_SHORT[(m.month || 1) - 1], inc: m.inc || 0, exp: m.exp || 0 }))

    // Credit card debt
    const totalCreditDebt = (creditLines || [])
      .filter(cl => cl.activa !== false)
      .reduce((s, cl) => s + (cl.usado ?? 0), 0)

    // Loan debt — saldo pendiente de préstamos activos
    const totalLoanDebt = (loans || [])
      .filter(l => l.activo !== false && (l.saldoPendiente ?? 0) > 0)
      .reduce((s, l) => s + (l.saldoPendiente ?? 0), 0)

    // Total monthly loan payments
    const totalMonthlyCuota = (loans || [])
      .filter(l => l.activo !== false && (l.saldoPendiente ?? 0) > 0)
      .reduce((s, l) => s + (l.cuota ?? 0), 0)

    return {
      cashAvailable,
      inThisMonth,
      outThisMonth,
      taxSetAside,
      taxTarget,
      igvThisMonth,
      retentionThisMonth,
      hoursBilled,
      hoursPaid,
      projectedIncome,
      totalCreditDebt,
      totalLoanDebt,
      totalMonthlyCuota,
      cashflow: cfData,
    }
  }, [invoices, bills, fixedIncome, cashflow, accounts, creditLines, loans, settings, quotes, taxPeriods])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('brava:dark', dark ? '1' : '0')
  }, [dark])

  // ── Load data from Supabase on mount (when user is authenticated) ──────────
  useEffect(() => {
    if (!userEmail) return  // no session → keep localStorage data

    async function loadFromSupabase() {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) return

      // Helper: fetch table, map local_id → id for compatibility
      async function fetch(table) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        if (error) { console.error(`[sb] fetch ${table}:`, error.message); return null }
        // Map local_id back to id so existing React state / components work unchanged
        return (data || []).map(row => {
          const { local_id, user_id, created_at, ...rest } = row
          return local_id ? { ...rest, id: local_id } : rest
        })
      }

      const [
        sbInvoices, sbClients, sbQuotes, sbBills,
        sbVarExp, sbGoals, sbCashflow, sbFixedIncome, sbAccounts,
      ] = await Promise.all([
        fetch('invoices'), fetch('clients'), fetch('quotes'), fetch('bills'),
        fetch('variable_expenses'), fetch('goals'), fetch('cashflow'),
        fetch('fixed_income'), fetch('accounts'),
      ])

      // Override state with Supabase data (including empty arrays — user may have deleted all)
      if (Array.isArray(sbInvoices))    setInvoices(sbInvoices)
      if (Array.isArray(sbClients))     setClients(sbClients)
      if (Array.isArray(sbQuotes))      setQuotes(sbQuotes)
      if (Array.isArray(sbBills))       setBills(sbBills)
      if (Array.isArray(sbVarExp))      setVariableExpenses(sbVarExp)
      if (Array.isArray(sbGoals))       setGoals(sbGoals)
      if (Array.isArray(sbCashflow))    setCashflow(sbCashflow)
      if (Array.isArray(sbFixedIncome)) setFixedIncome(sbFixedIncome)
      if (Array.isArray(sbAccounts))    setAccounts(sbAccounts)
    }

    loadFromSupabase()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail])

  // ── Fire-and-forget Supabase write helper ─────────────────────────────────
  const sbWrite = useCallback(async (table, operation, payload, matchId) => {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) return

    if (operation === 'insert') {
      const { id: localId, ...rest } = payload
      await supabase.from(table).insert({ ...rest, user_id: userId, local_id: localId })
        .then(({ error }) => error && console.error(`[sb] insert ${table}:`, error.message))
    } else if (operation === 'update') {
      const { id: localId, ...rest } = payload
      await supabase.from(table).update({ ...rest, user_id: userId })
        .eq('user_id', userId).eq('local_id', localId)
        .then(({ error }) => error && console.error(`[sb] update ${table}:`, error.message))
    } else if (operation === 'delete') {
      await supabase.from(table).delete()
        .eq('user_id', userId).eq('local_id', matchId)
        .then(({ error }) => error && console.error(`[sb] delete ${table}:`, error.message))
    }
  }, [])

  useEffect(() => { localStorage.setItem('brava:invoices',    JSON.stringify(invoices))    }, [invoices])
  useEffect(() => { localStorage.setItem('brava:bills',       JSON.stringify(bills))       }, [bills])
  useEffect(() => { localStorage.setItem('brava:fixedIncome', JSON.stringify(fixedIncome)) }, [fixedIncome])
  useEffect(() => { localStorage.setItem('brava:cashflow',    JSON.stringify(cashflow))    }, [cashflow])
  useEffect(() => { localStorage.setItem('brava:goals',       JSON.stringify(goals))       }, [goals])
  useEffect(() => { localStorage.setItem('brava:clients',      JSON.stringify(clients))      }, [clients])
  useEffect(() => { localStorage.setItem('brava:accounts',         JSON.stringify(accounts))         }, [accounts])
  useEffect(() => { localStorage.setItem('brava:accountMovements', JSON.stringify(accountMovements)) }, [accountMovements])
  useEffect(() => { localStorage.setItem('brava:creditLines',      JSON.stringify(creditLines))      }, [creditLines])
  useEffect(() => { localStorage.setItem('brava:loans',            JSON.stringify(loans))            }, [loans])
  useEffect(() => { localStorage.setItem('brava:loanPayments',     JSON.stringify(loanPayments))     }, [loanPayments])
  useEffect(() => { localStorage.setItem('brava:monthlyChecks',    JSON.stringify(monthlyChecks))    }, [monthlyChecks])
  useEffect(() => { localStorage.setItem('brava:taxPeriods',   JSON.stringify(taxPeriods))   }, [taxPeriods])
  useEffect(() => { localStorage.setItem('brava:taxInvoices',  JSON.stringify(taxInvoices))  }, [taxInvoices])
  useEffect(() => { localStorage.setItem('brava:taxRH',        JSON.stringify(taxRH))        }, [taxRH])
  useEffect(() => { localStorage.setItem('brava:taxPurchases', JSON.stringify(taxPurchases)) }, [taxPurchases])
  useEffect(() => { localStorage.setItem('brava:quotes',           JSON.stringify(quotes))           }, [quotes])
  useEffect(() => { localStorage.setItem('brava:variableExpenses', JSON.stringify(variableExpenses)) }, [variableExpenses])

  function handleSaveSettings(newSettings) {
    setSettings(newSettings)
    localStorage.setItem('brava:settings', JSON.stringify(newSettings))
    setView('overview')
    toast.success('Configuración guardada ✓')
  }

  // ── Account movement helper ────────────────────────────────────────────────
  function addAccountMovement(mov) {
    setAccountMovements(ms => [mov, ...ms])
    if (mov.accountId && mov.delta !== undefined) {
      const acc = accounts.find(a => a.id === mov.accountId)
      if (acc) {
        const newSaldo = (acc.saldo ?? acc.balance ?? 0) + mov.delta
        setAccounts(as => as.map(a =>
          a.id === mov.accountId ? { ...a, saldo: newSaldo, balance: newSaldo } : a
        ))
        sbWrite('accounts', 'update', { id: acc.id, saldo: newSaldo, balance: newSaldo })
      }
    }
  }

  // ── Invoice payment ────────────────────────────────────────────────────────
  const markPaid = (id) => {
    const inv = invoices.find(i => i.id === id)
    // If accounts exist, show account-selector modal first
    const activeAccounts = accounts.filter(a => a.activa !== false)
    if (activeAccounts.length > 0 && inv) {
      setPayModal({ id: inv.id, amount: inv.amount, client: inv.client })
    } else {
      _confirmMarkPaid({ id, amount: inv?.amount, client: inv?.client }, null)
    }
  }

  function _confirmMarkPaid(pm, accountId) {
    const { id, amount, client } = pm
    const paidAt = new Date().toISOString().split('T')[0]
    setInvoices(invs => invs.map(i => i.id === id ? { ...i, status: 'paid', paidAt } : i))
    sbWrite('invoices', 'update', { id, status: 'paid', paidAt }, id)

    if (accountId) {
      addAccountMovement({
        id:          'mov-' + Date.now(),
        accountId,
        type:        'income',
        description: `Cobro: ${client} · ${id}`,
        amount:      amount || 0,
        delta:       amount || 0,
        date:        new Date().toISOString().split('T')[0],
        invoiceId:   id,
      })
    }

    setPayModal(null)
    toast.success('Factura cobrada ✓', client ? `${client} — ${fmtPEN(amount || 0)}` : undefined)
  }
  const markUndo = (id) => {
    setInvoices(invs => invs.map(i => i.id === id ? { ...i, status: 'pending' } : i))
    sbWrite('invoices', 'update', { id, status: 'pending' }, id)
    toast.info('Estado revertido', 'La factura volvió a pendiente')
  }
  const deleteInv = (id) => {
    setInvoices(invs => invs.filter(i => i.id !== id))
    sbWrite('invoices', 'delete', null, id)
    toast.success('Factura eliminada')
  }

  // Bills CRUD
  const addBill    = (b) => { setBills(bs => [...bs, b]); sbWrite('bills', 'insert', b); toast.success('Gasto fijo registrado', b.name) }
  const editBill   = (b) => { setBills(bs => bs.map(x => x.id === b.id ? b : x)); sbWrite('bills', 'update', b); toast.success('Gasto actualizado', b.name) }
  const deleteBill = (id) => { setBills(bs => bs.filter(x => x.id !== id)); sbWrite('bills', 'delete', null, id); toast.success('Gasto eliminado') }

  // Fixed income CRUD
  const addIncome    = (inc) => { setFixedIncome(list => [...list, inc]); sbWrite('fixed_income', 'insert', inc); toast.success('Ingreso fijo registrado', inc.name) }
  const editIncome   = (inc) => { setFixedIncome(list => list.map(x => x.id === inc.id ? inc : x)); sbWrite('fixed_income', 'update', inc); toast.success('Ingreso actualizado', inc.name) }
  const deleteIncome = (id)  => { setFixedIncome(list => list.filter(x => x.id !== id)); sbWrite('fixed_income', 'delete', null, id); toast.success('Ingreso eliminado') }

  // Cashflow CRUD
  const addCashflow    = (cf) => { setCashflow(list => [...list, cf]); sbWrite('cashflow', 'insert', cf); toast.success('Mes registrado en flujo de caja') }
  const editCashflow   = (cf) => { setCashflow(list => list.map(x => x.id === cf.id ? cf : x)); sbWrite('cashflow', 'update', cf); toast.success('Flujo de caja actualizado') }
  const deleteCashflow = (id) => { setCashflow(list => list.filter(x => x.id !== id)); sbWrite('cashflow', 'delete', null, id); toast.success('Mes eliminado del flujo') }

  // Goals CRUD
  const addGoal    = (g)  => { setGoals(gs => [...gs, g]); sbWrite('goals', 'insert', g); toast.success('Meta creada', g.name) }
  const editGoal   = (g)  => { setGoals(gs => gs.map(x => x.id === g.id ? g : x)); sbWrite('goals', 'update', g); toast.success('Meta actualizada', g.name) }
  const deleteGoal = (id) => { setGoals(gs => gs.filter(x => x.id !== id)); sbWrite('goals', 'delete', null, id); toast.success('Meta eliminada') }
  const aportar    = (id, newCurrent) => {
    setGoals(gs => gs.map(x => x.id === id ? { ...x, current: newCurrent } : x))
    sbWrite('goals', 'update', { id, current: newCurrent })
    toast.success('Aporte registrado ✓')
  }

  // Clients CRUD
  const addClient    = (c) => { setClients(cs => [...cs, c]); sbWrite('clients', 'insert', c); toast.success('Cliente guardado', c.name) }
  const editClient   = (c) => { setClients(cs => cs.map(x => x.id === c.id ? c : x)); sbWrite('clients', 'update', c); toast.success('Cliente actualizado', c.name) }
  const deleteClient = (id) => { setClients(cs => cs.filter(x => x.id !== id)); sbWrite('clients', 'delete', null, id); toast.success('Cliente eliminado') }

  // Accounts CRUD
  const addAccount    = (a) => { setAccounts(as => [...as, a]); sbWrite('accounts', 'insert', a); toast.success('Cuenta agregada', a.nombre ?? a.bank) }
  const editAccount   = (a) => { setAccounts(as => as.map(x => x.id === a.id ? a : x)); sbWrite('accounts', 'update', a); toast.success('Cuenta actualizada', a.nombre ?? a.bank) }
  const deleteAccount = (id) => { setAccounts(as => as.filter(x => x.id !== id)); sbWrite('accounts', 'delete', null, id); toast.success('Cuenta eliminada') }

  // ── Credit line usado sync ─────────────────────────────────────────────────
  function updateCreditUsado(creditLineId, delta) {
    const cl = creditLines.find(c => c.id === creditLineId)
    if (!cl) return
    const newUsado = Math.max(0, (cl.usado ?? 0) + delta)
    setCreditLines(cls => cls.map(c => c.id === creditLineId ? { ...c, usado: newUsado } : c))
    sbWrite('credit_lines', 'update', { id: creditLineId, usado: newUsado })
  }

  // Credit lines CRUD
  const addCreditLine    = (cl) => { setCreditLines(cs => [...cs, cl]); sbWrite('credit_lines', 'insert', cl); toast.success('Tarjeta agregada', cl.nombre) }
  const editCreditLine   = (cl) => { setCreditLines(cs => cs.map(x => x.id === cl.id ? cl : x)); sbWrite('credit_lines', 'update', cl); toast.success('Tarjeta actualizada', cl.nombre) }
  const deleteCreditLine = (id)  => { setCreditLines(cs => cs.filter(x => x.id !== id)); sbWrite('credit_lines', 'delete', null, id); toast.success('Tarjeta eliminada') }

  // Loans CRUD
  const addLoan    = (l) => { setLoans(ls => [...ls, l]); sbWrite('loans', 'insert', l); toast.success('Préstamo registrado', l.nombre) }
  const editLoan   = (l) => { setLoans(ls => ls.map(x => x.id === l.id ? l : x)); sbWrite('loans', 'update', l); toast.success('Préstamo actualizado', l.nombre) }
  const deleteLoan = (id) => { setLoans(ls => ls.filter(x => x.id !== id)); sbWrite('loans', 'delete', null, id); toast.success('Préstamo eliminado') }

  // Register a loan payment (reduces saldoPendiente + optionally debits account)
  function registerLoanPayment({ loanId, amount, capital, interes, date, notes, accountId }) {
    const loan = loans.find(l => l.id === loanId)
    if (!loan) return

    // Record payment
    const payment = {
      id: 'lp-' + Date.now(),
      loanId, amount, capital: capital ?? amount, interes: interes ?? 0,
      date: date || new Date().toISOString().split('T')[0],
      notes: notes || '',
    }
    setLoanPayments(ps => [payment, ...ps])

    // Reduce saldo
    const reduction    = capital ?? amount
    const newSaldo     = Math.max(0, (loan.saldoPendiente ?? loan.montoOriginal ?? 0) - reduction)
    const updatedLoan  = { ...loan, saldoPendiente: newSaldo }
    setLoans(ls => ls.map(l => l.id === loanId ? updatedLoan : l))
    sbWrite('loans', 'update', { id: loanId, saldoPendiente: newSaldo })

    // Optionally debit from account
    if (accountId) {
      addAccountMovement({
        id:          'mov-' + Date.now(),
        accountId,
        type:        'expense',
        description: `Cuota: ${loan.nombre}`,
        amount,
        delta:       -amount,
        date:        payment.date,
        loanId,
      })
    }

    toast.success('Cuota registrada ✓', `${loan.nombre} — ${fmtPEN(amount)}`)
  }

  // ── Monthly checklist ──────────────────────────────────────────────────────
  function toggleMonthlyCheck(type, itemId, yearMonth, paid) {
    const key = `${type}-${itemId}-${yearMonth}`
    setMonthlyChecks(mc => {
      const updated = { ...mc }
      if (paid) updated[key] = { paid: true, paidAt: new Date().toISOString().split('T')[0] }
      else      delete updated[key]
      return updated
    })
  }

  // Tax periods
  const updateTaxPeriod = (p) => setTaxPeriods(ps => {
    const exists = ps.find(x => x.id === p.id)
    return exists ? ps.map(x => x.id === p.id ? p : x) : [...ps, p]
  })

  // Tax invoices CRUD
  const addTaxInvoice    = (x) => setTaxInvoices(xs => [...xs, x])
  const editTaxInvoice   = (x) => setTaxInvoices(xs => xs.map(i => i.id === x.id ? x : i))
  const deleteTaxInvoice = (id) => setTaxInvoices(xs => xs.filter(i => i.id !== id))

  // Tax RH CRUD
  const addTaxRH    = (x) => setTaxRH(xs => [...xs, x])
  const editTaxRH   = (x) => setTaxRH(xs => xs.map(i => i.id === x.id ? x : i))
  const deleteTaxRH = (id) => setTaxRH(xs => xs.filter(i => i.id !== id))

  // Tax purchases CRUD
  const addTaxPurchase    = (x) => setTaxPurchases(xs => [...xs, x])
  const editTaxPurchase   = (x) => setTaxPurchases(xs => xs.map(i => i.id === x.id ? x : i))
  const deleteTaxPurchase = (id) => setTaxPurchases(xs => xs.filter(i => i.id !== id))

  // Variable expenses CRUD (+ credit line sync)
  const addVariableExpense = (e) => {
    setVariableExpenses(es => [e, ...es])
    sbWrite('variable_expenses', 'insert', e)
    if (e.paymentMethod?.type === 'tarjeta' && e.paymentMethod.creditLineId) {
      updateCreditUsado(e.paymentMethod.creditLineId, e.amount)
    }
    toast.success('Gasto registrado', e.description)
  }
  const editVariableExpense = (e) => {
    const old = variableExpenses.find(x => x.id === e.id)
    setVariableExpenses(es => es.map(x => x.id === e.id ? e : x))
    sbWrite('variable_expenses', 'update', e)
    // Sync credit lines: reverse old, apply new
    const oldCL = old?.paymentMethod?.type === 'tarjeta' ? old.paymentMethod.creditLineId : null
    const newCL = e.paymentMethod?.type   === 'tarjeta' ? e.paymentMethod.creditLineId   : null
    if (oldCL === newCL && oldCL) {
      updateCreditUsado(oldCL, e.amount - (old?.amount ?? 0))
    } else {
      if (oldCL) updateCreditUsado(oldCL, -(old?.amount ?? 0))
      if (newCL) updateCreditUsado(newCL, e.amount)
    }
    toast.success('Gasto actualizado')
  }
  const deleteVariableExpense = (id) => {
    const expense = variableExpenses.find(e => e.id === id)
    setVariableExpenses(es => es.filter(x => x.id !== id))
    sbWrite('variable_expenses', 'delete', null, id)
    if (expense?.paymentMethod?.type === 'tarjeta' && expense.paymentMethod.creditLineId) {
      updateCreditUsado(expense.paymentMethod.creditLineId, -(expense.amount))
    }
    toast.success('Gasto eliminado')
  }

  // Quotes CRUD
  const addQuote          = (q) => { setQuotes(qs => [q, ...qs]); sbWrite('quotes', 'insert', q); toast.success('Cotización creada', q.id) }
  const editQuote         = (q) => { setQuotes(qs => qs.map(x => x.id === q.id ? q : x)); sbWrite('quotes', 'update', q); toast.success('Cotización actualizada') }
  const deleteQuote       = (id) => { setQuotes(qs => qs.filter(x => x.id !== id)); sbWrite('quotes', 'delete', null, id); toast.success('Cotización eliminada') }
  const changeQuoteStatus = (id, status) => {
    setQuotes(qs => qs.map(x => x.id === id ? { ...x, status } : x))
    sbWrite('quotes', 'update', { id, status })
    if (status === 'accepted') toast.success('Cotización aceptada ✓')
    else if (status === 'rejected') toast.warning('Cotización rechazada')
    else if (status === 'invoiced') toast.success('Convertida a factura ✓')
  }

  // Convert accepted quote → invoice (with tax auto-sync)
  function addInvoiceFromQuote(quote) {
    const now        = new Date()
    const issuedDate = now.toISOString().split('T')[0]
    const MO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']
    const issued     = `${now.getDate()} ${MO[now.getMonth()]}`
    const dueD       = new Date(now)
    dueD.setDate(dueD.getDate() + 14)
    const due        = `${dueD.getDate()} ${MO[dueD.getMonth()]}`

    const clientObj  = clients.find(c => c.id === quote.clientId || c.name === quote.clientName)
    const clientColor = clientObj?.color || '#a8a29e'
    const clientRuc   = clientObj?.ruc   || ''
    const existingNums = invoices.map(i => parseInt((i.id||'').replace(/\D/g,''))||0)
    const invId       = 'INV-' + String((existingNums.length ? Math.max(...existingNums) : 149) + 1).padStart(4,'0')

    const serviceBase = (quote.subtotalServices || 0) + (quote.subtotalEquipment || 0)
    const igvAmt      = quote.applyIGV ? (quote.igvAmount || 0) : 0
    const total       = quote.total || 0

    const base = {
      id: invId,
      client: quote.clientName, clientId: quote.clientId || undefined,
      clientColor, clientRuc,
      project: quote.project,
      issued, issuedDate, due,
      status: 'pending',
      docType: quote.docType || 'factura',
      fromQuoteId: quote.id,
      cost: null, margin: null,
    }

    const inv = quote.docType === 'rh'
      ? { ...base,
          amount: total, grossAmount: total,
          hasRetention: true, retention: total * 0.08,
          net: total * 0.92, netReceived: total * 0.92,
        }
      : { ...base,
          amount: serviceBase, igv: igvAmt, subtotal: total,
          hasDetraction: false, detractionPct: 0, detractionAmt: 0,
          netReceived: total, total,
        }

    // Reuse createInvoice for tax auto-sync + navigation
    createInvoice(inv)
    // Mark quote as invoiced (React 18 batches these)
    changeQuoteStatus(quote.id, 'invoiced')
  }

  const allNums = invoices.map(i => parseInt((i.id||'').replace(/\D/g,''))||0)
  const nextId  = 'INV-' + String((allNums.length ? Math.max(...allNums) : 149) + 1).padStart(4,'0')

  const createInvoice = (inv) => {
    setInvoices(invs => [inv, ...invs])
    sbWrite('invoices', 'insert', inv)

    // Auto-sync to taxes based on docType
    const d = new Date()
    const taxDate = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`

    if (inv.docType === 'factura') {
      addTaxInvoice({
        id:             'ti-' + Date.now(),
        serie:          inv.serie   || 'F001',
        number:         inv.number  || '',
        date:           taxDate,
        clientName:     inv.client,
        clientRuc:      inv.clientRuc || '',
        concept:        inv.project,
        amount:         inv.amount,
        igv:            inv.igv       || 0,
        subtotal:       inv.subtotal  || inv.amount,
        hasDetraction:  inv.hasDetraction || false,
        detractionPct:  String(inv.detractionPct ?? settings.detractionPct ?? 12),
        detractionAmt:  inv.detractionAmt || 0,
        netReceived:    inv.netReceived   || inv.amount,
        total:          inv.total         || inv.amount,
        status:         'emitida',
        fromInvoiceId:  inv.id,
      })
    } else if (inv.docType === 'rh') {
      addTaxRH({
        id:            'rh-' + Date.now(),
        serie:         inv.serie  || '001',
        number:        inv.number || '',
        date:          taxDate,
        clientName:    inv.client,
        clientRuc:     inv.clientRuc || '',
        concept:       inv.project,
        grossAmount:   inv.grossAmount   || inv.amount,
        hasRetention:  inv.hasRetention  ?? true,
        retention:     inv.retention     || 0,
        net:           inv.net           || inv.amount,
        status:        'emitido',
        fromInvoiceId: inv.id,
      })
    }

    setModalOpen(false)
    setView('invoices')
    toast.success('Factura creada', inv.id ? `${inv.id} · ${inv.client}` : inv.client)
  }

  const viewProps = {
    data, invoices, settings,
    bills, fixedIncome, cashflow, goals, clients, accounts,
    variableExpenses, quotes,
    onMarkPaid:   markPaid,
    onNewInvoice: () => setModalOpen(true),
    onGoto:       setView,
    onUndo:       markUndo,
    onDelete:     deleteInv,
    onSaveSettings: handleSaveSettings,
    // bills
    onAddBill: addBill, onEditBill: editBill, onDeleteBill: deleteBill,
    // fixed income
    onAddIncome: addIncome, onEditIncome: editIncome, onDeleteIncome: deleteIncome,
    // cashflow
    onAddCashflow: addCashflow, onEditCashflow: editCashflow, onDeleteCashflow: deleteCashflow,
    // goals
    onAddGoal: addGoal, onEditGoal: editGoal, onDeleteGoal: deleteGoal, onAportar: aportar,
    // clients
    onAddClient: addClient, onEditClient: editClient, onDeleteClient: deleteClient,
    // accounts
    onAddAccount: addAccount, onEditAccount: editAccount, onDeleteAccount: deleteAccount,
    accountMovements,
    onAddAccountMovement: addAccountMovement,
    // credit lines
    creditLines,
    onAddCreditLine: addCreditLine, onEditCreditLine: editCreditLine, onDeleteCreditLine: deleteCreditLine,
    onUpdateCreditUsado: updateCreditUsado,
    // loans
    loans, loanPayments,
    onAddLoan: addLoan, onEditLoan: editLoan, onDeleteLoan: deleteLoan,
    onRegisterLoanPayment: registerLoanPayment,
    // monthly checklist
    monthlyChecks,
    onToggleMonthlyCheck: toggleMonthlyCheck,
  }

  const initials     = getInitials(settings.name)
  const displayName  = settings.name || 'Tu nombre'
  const displayRole  = [settings.role, settings.industry].filter(Boolean).join(' · ') || 'Configura tu perfil →'

  // Sidebar badges — counts for items that need attention
  const sidebarBadges = useMemo(() => {
    const now2    = new Date(); now2.setHours(0,0,0,0)
    const yyyymm  = `${now2.getFullYear()}-${String(now2.getMonth()+1).padStart(2,'0')}`

    // Overdue invoices
    const overdueCount = invoices.filter(i => i.status === 'overdue').length

    // Unpaid payments this month
    const unpaidPayments = [
      ...(bills   || []).filter(b => b.active !== false && !monthlyChecks[`bill-${b.id}-${yyyymm}`]?.paid),
      ...(loans   || []).filter(l => l.activo !== false && (l.saldoPendiente ?? 0) > 0 && !monthlyChecks[`loan-${l.id}-${yyyymm}`]?.paid),
      ...(creditLines || []).filter(cl => cl.activa !== false && (cl.usado ?? 0) > 0 && !monthlyChecks[`credit-${cl.id}-${yyyymm}`]?.paid),
    ].length

    return {
      invoices: overdueCount,
      payments: unpaidPayments,
    }
  }, [invoices, bills, loans, creditLines, monthlyChecks])

  return (
    <div className="app">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        view={view}
        setView={(v) => { setView(v); setSidebarOpen(false) }}
        initials={initials}
        displayName={displayName}
        displayRole={displayRole}
        onSignOut={() => { toast.info('Sesión cerrada'); signOut() }}
        userEmail={userEmail}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        badges={sidebarBadges}
      />

      <main className="main">
        <div className="topbar">
          {/* Hamburger — only visible on mobile */}
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Abrir menú"
          >
            <span /><span /><span />
          </button>

          {/* Mobile brand name (replaces search on narrow screens) */}
          <span className="topbar-brand-mobile">Brava</span>

          <div className="topbar-search">
            <Icon name="search" size={14} />
            <input type="text" placeholder="Buscar facturas, clientes, transacciones…" />
            <span className="kbd">⌘K</span>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={() => setDark(d => !d)} title="Cambiar tema">
              <Icon name={dark ? 'sun' : 'moon'} size={16} />
            </button>
            <button className="icon-btn" title="Notificaciones">
              <Icon name="bell" size={16} />
              <span className="dot-badge" />
            </button>
            <button
              className="topbar-user"
              onClick={() => setView('settings')}
              title="Ir a configuración"
            >
              <div
                className="avatar"
                style={{ background: 'linear-gradient(135deg,#c2410c,#7c2d12)', width: 28, height: 28, fontSize: 11 }}
              >
                {initials}
              </div>
              <div>{displayName}</div>
              <Icon name="chevron" size={12} />
            </button>
          </div>
        </div>

        <div className="scroll">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              variants={viewTransition}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ minHeight: '100%' }}
            >
              {view === 'overview'  && <Overview     {...viewProps} />}
              {view === 'quotes'    && (
                <QuotesView
                  quotes={quotes}
                  clients={clients}
                  settings={settings}
                  onAddQuote={addQuote}
                  onEditQuote={editQuote}
                  onDeleteQuote={deleteQuote}
                  onChangeStatus={changeQuoteStatus}
                  onConvertToInvoice={addInvoiceFromQuote}
                  onGoto={setView}
                />
              )}
              {view === 'accounts'  && (
                <AccountsView
                  accounts={accounts}
                  accountMovements={accountMovements}
                  onAddAccount={addAccount}
                  onEditAccount={editAccount}
                  onDeleteAccount={deleteAccount}
                  onAddAccountMovement={addAccountMovement}
                />
              )}
              {view === 'payments' && (
                <PaymentsView
                  bills={bills}
                  loans={loans}
                  creditLines={creditLines}
                  accounts={accounts}
                  monthlyChecks={monthlyChecks}
                  onToggleMonthlyCheck={toggleMonthlyCheck}
                  onRegisterLoanPayment={registerLoanPayment}
                  onUpdateCreditUsado={updateCreditUsado}
                  onAddAccountMovement={addAccountMovement}
                />
              )}
              {view === 'loans' && (
                <LoansView
                  loans={loans}
                  loanPayments={loanPayments}
                  accounts={accounts}
                  onAddLoan={addLoan}
                  onEditLoan={editLoan}
                  onDeleteLoan={deleteLoan}
                  onRegisterLoanPayment={registerLoanPayment}
                />
              )}
              {view === 'credit' && (
                <CreditLinesView
                  creditLines={creditLines}
                  accounts={accounts}
                  variableExpenses={variableExpenses}
                  onAddCreditLine={addCreditLine}
                  onEditCreditLine={editCreditLine}
                  onDeleteCreditLine={deleteCreditLine}
                  onUpdateCreditUsado={updateCreditUsado}
                  onAddAccountMovement={addAccountMovement}
                />
              )}
              {view === 'invoices'  && <InvoicesView {...viewProps} taxInvoices={taxInvoices} taxRH={taxRH} />}
              {view === 'clients'   && (
                <ClientsView
                  clients={clients}
                  invoices={invoices}
                  onAddClient={addClient}
                  onEditClient={editClient}
                  onDeleteClient={deleteClient}
                  onNewInvoice={() => setModalOpen(true)}
                />
              )}
              {view === 'cashflow'  && (
                <CashflowView
                  cashflow={cashflow}
                  onAddCashflow={addCashflow}
                  onEditCashflow={editCashflow}
                  onDeleteCashflow={deleteCashflow}
                  invoices={invoices}
                  fixedIncome={fixedIncome}
                  bills={bills}
                  variableExpenses={variableExpenses}
                />
              )}
              {view === 'taxes' && (
                <TaxesView
                  invoices={invoices}
                  settings={settings}
                  clients={clients}
                  onDeleteInvoice={deleteInv}
                  onSaveSettings={handleSaveSettings}
                  taxPeriods={taxPeriods}
                  onUpdateTaxPeriod={updateTaxPeriod}
                  taxInvoices={taxInvoices}
                  onAddTaxInvoice={addTaxInvoice}
                  onEditTaxInvoice={editTaxInvoice}
                  onDeleteTaxInvoice={deleteTaxInvoice}
                  taxRH={taxRH}
                  onAddTaxRH={addTaxRH}
                  onEditTaxRH={editTaxRH}
                  onDeleteTaxRH={deleteTaxRH}
                  taxPurchases={taxPurchases}
                  onAddTaxPurchase={addTaxPurchase}
                  onEditTaxPurchase={editTaxPurchase}
                  onDeleteTaxPurchase={deleteTaxPurchase}
                  bills={bills}
                  variableExpenses={variableExpenses}
                />
              )}
              {view === 'budget'    && <BudgetView bills={bills} />}
              {view === 'goals'     && (
                <GoalsView
                  goals={goals}
                  onAddGoal={addGoal}
                  onEditGoal={editGoal}
                  onDeleteGoal={deleteGoal}
                  onAportar={aportar}
                  invoices={invoices}
                  accounts={accounts}
                  quotes={quotes}
                  bills={bills}
                />
              )}
              {view === 'gastos'    && (
                <GastosView
                  bills={bills}
                  onAddBill={addBill}
                  onEditBill={editBill}
                  onDeleteBill={deleteBill}
                  variableExpenses={variableExpenses}
                  onAddVariableExpense={addVariableExpense}
                  onEditVariableExpense={editVariableExpense}
                  onDeleteVariableExpense={deleteVariableExpense}
                  accounts={accounts}
                  creditLines={creditLines}
                />
              )}
              {view === 'ingresos'  && (
                <IngresosView
                  fixedIncome={fixedIncome}
                  onAddIncome={addIncome}
                  onEditIncome={editIncome}
                  onDeleteIncome={deleteIncome}
                  invoices={invoices}
                  clients={clients}
                />
              )}
              {view === 'consejos'  && <ConsejosView {...viewProps} />}
              {view === 'settings'  && <SettingsView settings={settings} onSave={handleSaveSettings} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {modalOpen && (
        <NewInvoiceModal
          onClose={() => setModalOpen(false)}
          onCreate={createInvoice}
          nextId={nextId}
          settings={settings}
          clients={clients}
        />
      )}

      {payModal && (
        <MarkPaidModal
          invoice={payModal}
          accounts={accounts.filter(a => a.activa !== false)}
          onConfirm={(accountId) => _confirmMarkPaid(payModal, accountId)}
          onClose={() => setPayModal(null)}
        />
      )}
    </div>
  )
}

// AuthGate is the real entry point — exported as default
export default AuthGate
