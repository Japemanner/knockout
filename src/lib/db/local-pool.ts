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
//
// Lenient: als DIRECT_DATABASE_URL niet geconfigureerd is (bijv. op Netlify
// zonder env-var), returnt getLocalPoolOrNull() null in plaats van te throwen.
// Call-sites vallen terug op de Supabase-client (PostgREST).

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

// Lenient versie: returnt null ipv te throwen als DIRECT_DATABASE_URL
// ontbreekt. Call-sites moeten zelf fallback-logica implementeren.
export function getLocalPoolOrNull(): Pool | null {
  try {
    return getLocalPool()
  } catch {
    return null
  }
}