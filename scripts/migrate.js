#!/usr/bin/env node
// Brava — SQL migration runner
// Usage: node scripts/migrate.js "SELECT ..."
//        node scripts/migrate.js --file scripts/migrations/xxx.sql

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Manual .env.local parser (no dotenv dependency)
function loadEnv(path) {
  try {
    const lines = readFileSync(path, 'utf8').split('\n')
    for (const line of lines) {
      const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)
      if (m) process.env[m[1]] = m[2].trim()
    }
  } catch {}
}
loadEnv(resolve(__dirname, '../.env.local'))

const URL = process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

let sql
if (process.argv[2] === '--file') {
  sql = readFileSync(resolve(process.argv[3]), 'utf8')
} else {
  sql = process.argv.slice(2).join(' ')
}

if (!sql?.trim()) {
  console.error('❌  No SQL provided.')
  process.exit(1)
}

console.log('🚀  Running migration...')

const res = await fetch(`${URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'apikey': KEY,
    'Authorization': `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})

const json = await res.json()

if (!res.ok) {
  console.error('❌  Failed:', JSON.stringify(json))
  process.exit(1)
}
if (json?.error) {
  console.error('❌  SQL error:', json.error)
  process.exit(1)
}

console.log('✅  Success')
