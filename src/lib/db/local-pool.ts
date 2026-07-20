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
// Defensief: als DIRECT_DATABASE_URL ontbreekt of de eerste connectie-poging
// faalt (bijv. verkeerd wachtwoord, poort geblokkeerd), returnt
// getLocalPoolOrNull() null in plaats van te throwen. Call-sites loggen de
// fout en geven een lege/resultaat-loze response terug, zodat de pagina
// alsnog rendert (i.p.v. een 500 crash).

let pool: Pool | undefined
let poolInitError: string | null = null

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
// ontbreekt of de pool niet geïnitialiseerd kan worden. Call-sites moeten
// zelf fallback-logica implementeren (bijv. lege response returnen).
export function getLocalPoolOrNull(): Pool | null {
  if (pool) return pool
  if (poolInitError) return null
  try {
    return getLocalPool()
  } catch (err) {
    poolInitError = err instanceof Error ? err.message : String(err)
    console.error('getLocalPoolOrNull: pool init failed:', poolInitError)
    return null
  }
}