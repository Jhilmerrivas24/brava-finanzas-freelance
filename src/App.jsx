import { useState, useEffect, useMemo, useCallback } from 'react'
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
import NewInvoiceModal from './modals/NewInvoiceModal.jsx'
import { supabase } from './lib/supabase.js'
import { useAuth } from './auth/AuthContext.jsx'
import LoginView from './auth/LoginView.jsx'
import RegisterView from './auth/RegisterView.jsx'
import ForgotPasswordView from './auth/ForgotPasswordView.jsx'
// data.js imported in views directly

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

    // Paid invoices this month (requires issuedDate field)
    const invoiceIncomeThisMonth = invoices
      .filter(i => {
        if (i.status !== 'paid') return false
        if (!i.issuedDate) return false
        const d = new Date(i.issuedDate)
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

    const allPaidIncome = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
    const taxTarget     = allPaidIncome * ((settings.taxRate || 30) / 100)
    const cashAvailable = accounts.reduce((s, a) => s + (a.balance || 0), 0)

    // taxSetAside = confirmed payments registered in tax periods
    const taxSetAside = (taxPeriods || []).reduce((s, p) => s + (p.paid || 0), 0)

    // Hours from quotes this month (unit 'hr' or 'hora')
    const quotesThisMonth = (quotes || []).filter(q => {
      if (!q.date) return true
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

    return {
      cashAvailable,
      inThisMonth,
      outThisMonth,
      taxSetAside,
      taxTarget,
      hoursBilled,
      hoursPaid,
      projectedIncome,
      cashflow: cfData,
    }
  }, [invoices, bills, fixedIncome, cashflow, accounts, settings, quotes, taxPeriods])

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

      // Only override state if Supabase returned rows (don't wipe localStorage data)
      if (sbInvoices?.length)    setInvoices(sbInvoices)
      if (sbClients?.length)     setClients(sbClients)
      if (sbQuotes?.length)      setQuotes(sbQuotes)
      if (sbBills?.length)       setBills(sbBills)
      if (sbVarExp?.length)      setVariableExpenses(sbVarExp)
      if (sbGoals?.length)       setGoals(sbGoals)
      if (sbCashflow?.length)    setCashflow(sbCashflow)
      if (sbFixedIncome?.length) setFixedIncome(sbFixedIncome)
      if (sbAccounts?.length)    setAccounts(sbAccounts)
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
  useEffect(() => { localStorage.setItem('brava:accounts',     JSON.stringify(accounts))     }, [accounts])
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
  }

  const markPaid = (id) => {
    setInvoices(invs => invs.map(i => i.id === id ? { ...i, status: 'paid' } : i))
    sbWrite('invoices', 'update', { id, status: 'paid' }, id)
  }
  const markUndo = (id) => {
    setInvoices(invs => invs.map(i => i.id === id ? { ...i, status: 'pending' } : i))
    sbWrite('invoices', 'update', { id, status: 'pending' }, id)
  }
  const deleteInv = (id) => {
    setInvoices(invs => invs.filter(i => i.id !== id))
    sbWrite('invoices', 'delete', null, id)
  }

  // Bills CRUD
  const addBill    = (b) => { setBills(bs => [...bs, b]); sbWrite('bills', 'insert', b) }
  const editBill   = (b) => { setBills(bs => bs.map(x => x.id === b.id ? b : x)); sbWrite('bills', 'update', b) }
  const deleteBill = (id) => { setBills(bs => bs.filter(x => x.id !== id)); sbWrite('bills', 'delete', null, id) }

  // Fixed income CRUD
  const addIncome    = (inc) => { setFixedIncome(list => [...list, inc]); sbWrite('fixed_income', 'insert', inc) }
  const editIncome   = (inc) => { setFixedIncome(list => list.map(x => x.id === inc.id ? inc : x)); sbWrite('fixed_income', 'update', inc) }
  const deleteIncome = (id)  => { setFixedIncome(list => list.filter(x => x.id !== id)); sbWrite('fixed_income', 'delete', null, id) }

  // Cashflow CRUD
  const addCashflow    = (cf) => { setCashflow(list => [...list, cf]); sbWrite('cashflow', 'insert', cf) }
  const editCashflow   = (cf) => { setCashflow(list => list.map(x => x.id === cf.id ? cf : x)); sbWrite('cashflow', 'update', cf) }
  const deleteCashflow = (id) => { setCashflow(list => list.filter(x => x.id !== id)); sbWrite('cashflow', 'delete', null, id) }

  // Goals CRUD
  const addGoal    = (g)  => { setGoals(gs => [...gs, g]); sbWrite('goals', 'insert', g) }
  const editGoal   = (g)  => { setGoals(gs => gs.map(x => x.id === g.id ? g : x)); sbWrite('goals', 'update', g) }
  const deleteGoal = (id) => { setGoals(gs => gs.filter(x => x.id !== id)); sbWrite('goals', 'delete', null, id) }
  const aportar    = (id, newCurrent) => {
    setGoals(gs => gs.map(x => x.id === id ? { ...x, current: newCurrent } : x))
    sbWrite('goals', 'update', { id, current: newCurrent })
  }

  // Clients CRUD
  const addClient    = (c) => { setClients(cs => [...cs, c]); sbWrite('clients', 'insert', c) }
  const editClient   = (c) => { setClients(cs => cs.map(x => x.id === c.id ? c : x)); sbWrite('clients', 'update', c) }
  const deleteClient = (id) => { setClients(cs => cs.filter(x => x.id !== id)); sbWrite('clients', 'delete', null, id) }

  // Accounts CRUD
  const addAccount    = (a) => setAccounts(as => [...as, a])
  const editAccount   = (a) => setAccounts(as => as.map(x => x.id === a.id ? a : x))
  const deleteAccount = (id) => setAccounts(as => as.filter(x => x.id !== id))

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

  // Variable expenses CRUD
  const addVariableExpense    = (e) => { setVariableExpenses(es => [e, ...es]); sbWrite('variable_expenses', 'insert', e) }
  const editVariableExpense   = (e) => { setVariableExpenses(es => es.map(x => x.id === e.id ? e : x)); sbWrite('variable_expenses', 'update', e) }
  const deleteVariableExpense = (id) => { setVariableExpenses(es => es.filter(x => x.id !== id)); sbWrite('variable_expenses', 'delete', null, id) }

  // Quotes CRUD
  const addQuote          = (q) => { setQuotes(qs => [q, ...qs]); sbWrite('quotes', 'insert', q) }
  const editQuote         = (q) => { setQuotes(qs => qs.map(x => x.id === q.id ? q : x)); sbWrite('quotes', 'update', q) }
  const deleteQuote       = (id) => { setQuotes(qs => qs.filter(x => x.id !== id)); sbWrite('quotes', 'delete', null, id) }
  const changeQuoteStatus = (id, status) => { setQuotes(qs => qs.map(x => x.id === id ? { ...x, status } : x)); sbWrite('quotes', 'update', { id, status }) }

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
    const invId       = 'INV-0' + (150 + invoices.filter(i => !SEED_IDS.includes(i.id)).length)

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

  const nextId = 'INV-0' + (150 + invoices.filter(i => !SEED_IDS.includes(i.id)).length)

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
  }

  const viewProps = {
    data, invoices, settings,
    bills, fixedIncome, cashflow, goals, clients, accounts,
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
  }

  const initials     = getInitials(settings.name)
  const displayName  = settings.name || 'Tu nombre'
  const displayRole  = [settings.role, settings.industry].filter(Boolean).join(' · ') || 'Configura tu perfil →'

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
        onSignOut={signOut}
        userEmail={userEmail}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
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
          {view === 'budget'    && (
            <BudgetView bills={bills} />
          )}
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
    </div>
  )
}

// AuthGate is the real entry point — exported as default
export default AuthGate
