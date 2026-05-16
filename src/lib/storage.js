/**
 * storage.js — dual-mode persistence layer.
 *
 * • If a Supabase session is active → read/write from Supabase
 * • If not → fallback to localStorage (offline / pre-auth)
 *
 * Swap the Supabase calls here without touching any component.
 */

import { supabase } from './supabase.js'

// ── localStorage keys (fallback) ─────────────────────────────────────────────
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

// ── localStorage helpers ──────────────────────────────────────────────────────
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

// ── Supabase table map ────────────────────────────────────────────────────────
// Maps entity name → Supabase table name
const TABLE = {
  invoices:         'invoices',
  clients:          'clients',
  quotes:           'quotes',
  bills:            'bills',
  variableExpenses: 'variable_expenses',
  goals:            'goals',
  cashflow:         'cashflow',
  fixedIncome:      'fixed_income',
  accounts:         'accounts',
}

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

// ── Supabase CRUD ─────────────────────────────────────────────────────────────

/**
 * Load all rows for the current user from a Supabase table.
 * Falls back to localStorage key on error or if not authenticated.
 */
export async function sbLoad(entity, lsKey, fallback = []) {
  const userId = await getUserId()
  if (!userId) return loadData(lsKey, fallback)

  const table = TABLE[entity]
  if (!table) return loadData(lsKey, fallback)

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(`[storage] sbLoad(${entity}) error:`, error.message)
    return loadData(lsKey, fallback)
  }
  return data ?? fallback
}

/**
 * Insert a row into a Supabase table.
 * Also writes to localStorage as cache.
 */
export async function sbInsert(entity, lsKey, row) {
  const userId = await getUserId()
  if (!userId) {
    // No session: persist to localStorage only
    const list = loadData(lsKey, [])
    const updated = [row, ...list]
    saveData(lsKey, updated)
    return { data: row, error: null }
  }

  const table = TABLE[entity]
  // Strip local-only id (Supabase uses UUID gen_random_uuid)
  // Keep local id as a reference field if needed
  const { id: localId, ...rest } = row
  const payload = { ...rest, user_id: userId, local_id: localId }

  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error(`[storage] sbInsert(${entity}) error:`, error.message)
    // Fallback: save locally
    const list = loadData(lsKey, [])
    saveData(lsKey, [row, ...list])
  }
  return { data: data ?? row, error }
}

/**
 * Update a row in Supabase by matching `local_id` or `id`.
 */
export async function sbUpdate(entity, lsKey, row) {
  const userId = await getUserId()
  if (!userId) {
    const list = loadData(lsKey, [])
    saveData(lsKey, list.map(x => x.id === row.id ? row : x))
    return { error: null }
  }

  const table = TABLE[entity]
  const { id: localId, ...rest } = row
  const payload = { ...rest, user_id: userId }

  // Try matching by local_id first, then by id column
  const { error } = await supabase
    .from(table)
    .update(payload)
    .eq('user_id', userId)
    .eq('local_id', localId)

  if (error) {
    console.error(`[storage] sbUpdate(${entity}) error:`, error.message)
    const list = loadData(lsKey, [])
    saveData(lsKey, list.map(x => x.id === row.id ? row : x))
  }
  return { error }
}

/**
 * Delete a row in Supabase by local_id.
 */
export async function sbDelete(entity, lsKey, localId) {
  const userId = await getUserId()
  if (!userId) {
    saveData(lsKey, loadData(lsKey, []).filter(x => x.id !== localId))
    return { error: null }
  }

  const table = TABLE[entity]
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('user_id', userId)
    .eq('local_id', localId)

  if (error) {
    console.error(`[storage] sbDelete(${entity}) error:`, error.message)
    saveData(lsKey, loadData(lsKey, []).filter(x => x.id !== localId))
  }
  return { error }
}
