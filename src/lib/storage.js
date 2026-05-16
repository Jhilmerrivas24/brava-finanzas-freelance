/**
 * storage.js — thin wrapper over localStorage.
 * All keys live here; swap the body of loadData / saveData
 * to move to Supabase without touching any component.
 */

export const KEYS = {
  invoices:         'brava:invoices',
  bills:            'brava:bills',
  variableExpenses: 'brava:variableExpenses',
  fixedIncome:      'brava:fixedIncome',
  cashflow:         'brava:cashflow',
  goals:            'brava:goals',
  clients:          'brava:clients',
  accounts:         'brava:accounts',
  taxPeriods:       'brava:taxPeriods',
  taxInvoices:      'brava:taxInvoices',
  taxRH:            'brava:taxRH',
  taxPurchases:     'brava:taxPurchases',
  quotes:           'brava:quotes',
  settings:         'brava:settings',
  budget:           'brava:budget',
  emergencyFund:    'brava:emergencyFund',
}

export function loadData(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    console.error('[storage] saveData error:', err)
  }
}
