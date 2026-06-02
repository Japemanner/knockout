import { Pool } from 'pg'

const pools = new Map<string, Pool>()

export function getPool(connectionId: string, connectionString: string): Pool {
  const existing = pools.get(connectionId)
  if (existing) return existing

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
  })

  pools.set(connectionId, pool)
  return pool
}

export function destroyPool(connectionId: string): void {
  const pool = pools.get(connectionId)
  if (pool) {
    pool.end().catch(() => {})
    pools.delete(connectionId)
  }
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
