import { Pool } from 'pg'

const MAX_POOLS = 10
const MAX_POOL_AGE = 30 * 60 * 1000

interface PoolEntry {
  pool: Pool
  lastUsed: number
}

const pools = new Map<string, PoolEntry>()

function evictOldest(): void {
  if (pools.size < MAX_POOLS) return
  let oldestId: string | null = null
  let oldestTime = Infinity
  for (const [id, entry] of pools.entries()) {
    if (entry.lastUsed < oldestTime) {
      oldestTime = entry.lastUsed
      oldestId = id
    }
  }
  if (oldestId !== null) {
    const entry = pools.get(oldestId)!
    entry.pool.end().catch(() => {})
    pools.delete(oldestId)
  }
}

export function getPool(connectionId: string, connectionString: string): Pool {
  const existing = pools.get(connectionId)
  if (existing) {
    existing.lastUsed = Date.now()
    return existing.pool
  }

  evictOldest()

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
  })

  pools.set(connectionId, { pool, lastUsed: Date.now() })
  return pool
}

export function destroyPool(connectionId: string): void {
  const entry = pools.get(connectionId)
  if (entry) {
    entry.pool.end().catch(() => {})
    pools.delete(connectionId)
  }
}

export function cleanupIdlePools(): number {
  const now = Date.now()
  let evicted = 0
  for (const [id, entry] of pools.entries()) {
    if (now - entry.lastUsed > MAX_POOL_AGE) {
      entry.pool.end().catch(() => {})
      pools.delete(id)
      evicted++
    }
  }
  return evicted
}

export function testConnection(connectionString: string): Promise<boolean> {
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000 })
  return pool
    .query('SELECT 1')
    .then(() => {
      pool.end().catch(() => {})
      return true
    })
    .catch(() => {
      pool.end().catch(() => {})
      return false
    })
}