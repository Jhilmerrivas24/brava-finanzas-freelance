import { useState, useEffect, useMemo } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Icon from './components/Icon.jsx'
import Overview from './views/Overview.jsx'
import InvoicesView from './views/InvoicesView.jsx'
import ClientsView from './views/ClientsView.jsx'
import CashflowView from './views/CashflowView.jsx'
import TaxesView from './views/TaxesView.jsx'
import GoalsView from './views/GoalsView.jsx'
import BillsView from './views/BillsView.jsx'
import IngresosView from './views/IngresosView.jsx'
import ConsejosView from './views/ConsejosView.jsx'
import SettingsView from './views/SettingsView.jsx'
import NewInvoiceModal from './modals/NewInvoiceModal.jsx'
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

export default function App() {
  const [dark, setDark] = useState(loadDark)
  const [view, setView] = useState('overview')
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
    const outThisMonth = bills.reduce((s, b) => s + (b.amount || 0), 0)

    const allPaidIncome = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
    const taxTarget     = allPaidIncome * ((settings.taxRate || 30) / 100)
    const cashAvailable = accounts.reduce((s, a) => s + (a.balance || 0), 0)

    const cfData = [...cashflow]
      .sort((a, b) => (a.year - b.year) || (a.month - b.month))
      .slice(-6)
      .map(m => ({ month: MONTHS_SHORT[(m.month || 1) - 1], inc: m.inc || 0, exp: m.exp || 0 }))

    return {
      cashAvailable,
      inThisMonth,
      outThisMonth,
      taxSetAside: 0,
      taxTarget,
      hoursBilled: 0,
      hoursPaid: 0,
      cashflow: cfData,
    }
  }, [invoices, bills, fixedIncome, cashflow, accounts, settings])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('brava:dark', dark ? '1' : '0')
  }, [dark])

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

  function handleSaveSettings(newSettings) {
    setSettings(newSettings)
    localStorage.setItem('brava:settings', JSON.stringify(newSettings))
    setView('overview')
  }

  const markPaid   = (id) => setInvoices(invs => invs.map(i => i.id === id ? { ...i, status: 'paid' }    : i))
  const markUndo   = (id) => setInvoices(invs => invs.map(i => i.id === id ? { ...i, status: 'pending' } : i))
  const deleteInv  = (id) => setInvoices(invs => invs.filter(i => i.id !== id))

  // Bills CRUD
  const addBill    = (b) => setBills(bs => [...bs, b])
  const editBill   = (b) => setBills(bs => bs.map(x => x.id === b.id ? b : x))
  const deleteBill = (id) => setBills(bs => bs.filter(x => x.id !== id))

  // Fixed income CRUD
  const addIncome    = (inc) => setFixedIncome(list => [...list, inc])
  const editIncome   = (inc) => setFixedIncome(list => list.map(x => x.id === inc.id ? inc : x))
  const deleteIncome = (id)  => setFixedIncome(list => list.filter(x => x.id !== id))

  // Cashflow CRUD
  const addCashflow    = (cf) => setCashflow(list => [...list, cf])
  const editCashflow   = (cf) => setCashflow(list => list.map(x => x.id === cf.id ? cf : x))
  const deleteCashflow = (id) => setCashflow(list => list.filter(x => x.id !== id))

  // Goals CRUD
  const addGoal    = (g) => setGoals(gs => [...gs, g])
  const editGoal   = (g) => setGoals(gs => gs.map(x => x.id === g.id ? g : x))
  const deleteGoal = (id) => setGoals(gs => gs.filter(x => x.id !== id))
  const aportar    = (id, newCurrent) => setGoals(gs => gs.map(x => x.id === id ? { ...x, current: newCurrent } : x))

  // Clients CRUD
  const addClient    = (c) => setClients(cs => [...cs, c])
  const editClient   = (c) => setClients(cs => cs.map(x => x.id === c.id ? c : x))
  const deleteClient = (id) => setClients(cs => cs.filter(x => x.id !== id))

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

  const nextId = 'INV-0' + (150 + invoices.filter(i => !SEED_IDS.includes(i.id)).length)

  const createInvoice = (inv) => {
    setInvoices(invs => [inv, ...invs])

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
      <Sidebar
        view={view}
        setView={setView}
        initials={initials}
        displayName={displayName}
        displayRole={displayRole}
      />

      <main className="main">
        <div className="topbar">
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
            />
          )}
          {view === 'goals'     && (
            <GoalsView
              goals={goals}
              onAddGoal={addGoal}
              onEditGoal={editGoal}
              onDeleteGoal={deleteGoal}
              onAportar={aportar}
            />
          )}
          {view === 'bills'     && (
            <BillsView
              bills={bills}
              onAddBill={addBill}
              onEditBill={editBill}
              onDeleteBill={deleteBill}
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
