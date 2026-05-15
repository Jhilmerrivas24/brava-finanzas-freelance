// Sample data for Brava. Two presets: "great" and "slow" month.
// All amounts in PEN (Peruvian soles, prefix S/).

const CLIENT_LIST = [
  { id: "c1", name: "Lima Café Co.", short: "LC", color: "#c2410c", retainer: 3200 },
  { id: "c2", name: "Ñam Restaurants", short: "Ñ", color: "#15803d", retainer: 0 },
  { id: "c3", name: "Velocidad Studio", short: "VS", color: "#1d4ed8", retainer: 1800 },
  { id: "c4", name: "Casa Pampa", short: "CP", color: "#7c3aed", retainer: 0 },
  { id: "c5", name: "Brote Editorial", short: "BE", color: "#0f766e", retainer: 0 },
  { id: "c6", name: "Norte Travel", short: "NT", color: "#a16207", retainer: 0 },
];

// Months: Jan..Dec
const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Set","Oct","Nov","Dic"];

const GREAT_MONTH = {
  label: "Mes fuerte",
  cashAvailable: 24850.40,
  inThisMonth: 18420.00,
  outThisMonth: 6890.50,
  taxSetAside: 4605.00,
  taxTarget: 5526.00, // 30% of 18,420
  cashflow: [
    { m:"Mar", inc: 9800, exp: 5400 },
    { m:"Abr", inc: 11200, exp: 5900 },
    { m:"May", inc: 8400, exp: 5200 },
    { m:"Jun", inc: 13600, exp: 6100 },
    { m:"Jul", inc: 10800, exp: 5800 },
    { m:"Ago", inc: 16200, exp: 6400 },
    { m:"Set", inc: 18420, exp: 6890 },
  ],
  hoursBilled: 84,
  hoursPaid: 62,
  hourRate: 220,
};

const SLOW_MONTH = {
  label: "Mes flojo",
  cashAvailable: 9120.80,
  inThisMonth: 4200.00,
  outThisMonth: 5640.30,
  taxSetAside: 1050.00,
  taxTarget: 1260.00,
  cashflow: [
    { m:"Mar", inc: 9800, exp: 5400 },
    { m:"Abr", inc: 11200, exp: 5900 },
    { m:"May", inc: 8400, exp: 5200 },
    { m:"Jun", inc: 6800, exp: 6100 },
    { m:"Jul", inc: 5400, exp: 5800 },
    { m:"Ago", inc: 7200, exp: 5400 },
    { m:"Set", inc: 4200, exp: 5640 },
  ],
  hoursBilled: 38,
  hoursPaid: 22,
  hourRate: 220,
};

// Invoices — preset adapts which are paid vs pending vs overdue
function makeInvoices(preset) {
  const base = [
    { id:"INV-0142", client:"c1", project:"Rediseño de menú",        amount: 4800, issued:"02 Set", due:"16 Set", status:"paid" },
    { id:"INV-0143", client:"c3", project:"Sistema de identidad",     amount: 6200, issued:"05 Set", due:"19 Set", status:"paid" },
    { id:"INV-0144", client:"c2", project:"Campaña aniversario",      amount: 3400, issued:"08 Set", due:"22 Set", status:"pending" },
    { id:"INV-0145", client:"c4", project:"Landing — septiembre",     amount: 2200, issued:"11 Set", due:"25 Set", status:"pending" },
    { id:"INV-0146", client:"c5", project:"Portada — Vol. 12",        amount: 1800, issued:"01 Set", due:"15 Set", status:"overdue" },
    { id:"INV-0147", client:"c6", project:"Iconos itinerario",        amount: 1450, issued:"03 Set", due:"17 Set", status:"overdue" },
    { id:"INV-0148", client:"c1", project:"Retainer — septiembre",    amount: 3200, issued:"01 Set", due:"15 Set", status:"paid" },
    { id:"INV-0149", client:"c3", project:"Retainer — septiembre",    amount: 1800, issued:"01 Set", due:"15 Set", status:"paid" },
  ];
  if (preset === "slow") {
    // Most pending/overdue, less paid
    return base.map((inv, i) => {
      if (i < 2) return { ...inv, status: "paid" };
      if (i < 5) return { ...inv, status: "pending" };
      return { ...inv, status: "overdue" };
    });
  }
  return base;
}

const CLIENTS_DETAIL = [
  { id:"c1", name:"Lima Café Co.",    type:"Retainer mensual", active: true,  ytd: 28800, lastInvoice:"02 Set", project:"Sistema de menú",          health:"good" },
  { id:"c3", name:"Velocidad Studio", type:"Retainer + proyectos", active: true, ytd: 24200, lastInvoice:"05 Set", project:"Identidad corporativa",    health:"good" },
  { id:"c2", name:"Ñam Restaurants",  type:"Por proyecto", active: true,  ytd: 14600, lastInvoice:"08 Set", project:"Campaña aniversario",        health:"ok" },
  { id:"c4", name:"Casa Pampa",       type:"Por proyecto", active: true,  ytd:  8400, lastInvoice:"11 Set", project:"Landing comercial",          health:"ok" },
  { id:"c5", name:"Brote Editorial",  type:"Por proyecto", active: true,  ytd:  5200, lastInvoice:"01 Set", project:"Portada de revista",         health:"watch" },
  { id:"c6", name:"Norte Travel",     type:"Por proyecto", active: false, ytd:  4350, lastInvoice:"03 Set", project:"Iconografía itinerarios",    health:"watch" },
];

const RECURRING_BILLS = [
  { name:"Adobe Creative Cloud",  amount: 245.00, day: 14, category:"Software" },
  { name:"Figma Professional",    amount:  62.00, day: 15, category:"Software" },
  { name:"Espacio Coworking",     amount: 480.00, day: 28, category:"Espacio" },
  { name:"Internet fibra",        amount: 129.00, day:  5, category:"Servicios" },
  { name:"Contador mensual",      amount: 320.00, day: 30, category:"Servicios" },
  { name:"Seguro de salud",       amount: 410.00, day: 10, category:"Salud" },
];

const GOALS = [
  { name:"Fondo de emergencia",  current: 12400, target: 24000, eta:"Dic 2026", color:"#15803d" },
  { name:"Equipo nuevo (iMac)",  current:  4800, target:  9200, eta:"Nov 2026", color:"#c2410c" },
  { name:"Vacaciones — Cusco",   current:  1850, target:  4500, eta:"Oct 2026", color:"#7c3aed" },
  { name:"Curso de motion",      current:   620, target:  1800, eta:"Ene 2027", color:"#0f766e" },
];

const ACCOUNTS = [
  { name:"BCP — Cuenta sueldo",       last:"4421", balance: 14820.40, type:"checking" },
  { name:"BBVA — Cuenta negocio",     last:"8812", balance:  6230.00, type:"checking" },
  { name:"Interbank — Ahorros",       last:"1107", balance:  3800.00, type:"savings"  },
];

const RECENT_ACTIVITY = [
  { kind:"in",  label:"Pago — Velocidad Studio",  ref:"INV-0143", amount: 6200,  when:"hoy, 09:14" },
  { kind:"out", label:"Adobe Creative Cloud",     ref:"Suscripción", amount: 245, when:"ayer, 18:22" },
  { kind:"in",  label:"Pago — Lima Café Co.",     ref:"INV-0148", amount: 3200, when:"ayer, 10:01" },
  { kind:"out", label:"Coworking — septiembre",   ref:"Espacio",  amount: 480,  when:"02 Set" },
  { kind:"out", label:"Reserva impuestos",        ref:"Auto-30%", amount: 1860, when:"01 Set" },
];

function fmtPEN(n, opts = {}) {
  const { decimals = 2, sign = false } = opts;
  const v = Math.abs(n).toLocaleString("es-PE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  if (sign) return (n < 0 ? "−" : "+") + " S/ " + v;
  return "S/ " + v;
}

function fmtPENShort(n) {
  if (Math.abs(n) >= 1000) return "S/ " + (n / 1000).toFixed(1) + "k";
  return "S/ " + n.toFixed(0);
}

Object.assign(window, {
  CLIENT_LIST, MONTHS_SHORT,
  GREAT_MONTH, SLOW_MONTH,
  makeInvoices, CLIENTS_DETAIL, RECURRING_BILLS, GOALS, ACCOUNTS, RECENT_ACTIVITY,
  fmtPEN, fmtPENShort,
});
