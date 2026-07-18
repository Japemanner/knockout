import { Pool } from 'pg'

// Singleton pg.Pool voor de eigen Supabase-database via Supavisor (poort 6543,
// transaction mode). Hergebruikt DIRECT_DATABASE_URL die al in .env.example
// gedocumenteerd is — geen nieuwe Supabase add-on, alleen hergebruik van de
// bestaande connection string.
//
// Server-side leesqueries via deze pool slaan PostgREST (REST API) over en
// besparen ~30-80ms TLS-overhead per round-trip. RLS wordt gecompenseerd door
// handmatige `WHERE user_id = $1` filtering in elke query; userId komt uit
// de `x-user-id` header gevuld door middleware via getClaims() (lokale JWT
// verificatie, niet te vervalsen door de client).

let pool: Pool | undefined

export function getLocalPool(): Pool {
  if (pool) return pool

  const connectionString = process.env.DIRECT_DATABASE_URL
  if (!connectionString) {
    throw new Error('DIRECT_DATABASE_URL is niet geconfigureerd. Voeg de Supabase pooler URL toe aan .env.local (poort 6543, transaction mode).')
  }

  pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 5000,
  })

  return pool
}