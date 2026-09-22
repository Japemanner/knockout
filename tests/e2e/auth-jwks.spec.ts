import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Playwright laadt geen .env.local — fallback patroon uit auth-signup-disabled.spec.ts,
// zodat tests lokaal draaien zodra .env.local bestaat.
function envFromLocalFile(name: string): string | undefined {
  if (process.env[name]) return process.env[name]
  try {
    const lines = readFileSync('.env.local', 'utf-8').split(/\r?\n/)
    const line = lines.find((l) => l.startsWith(`${name}=`))
    return line ? line.slice(name.length + 1).trim() : undefined
  } catch {
    return undefined
  }
}

// Bewaakt de asymmetrische JWT-keys op productie. Zolang het JWKS-endpoint
// minstens één ES256/RS256-key bevat, verifieert getClaims() in
// src/lib/supabase/middleware.ts het token lokaal (0 ms i.p.v. ~50 ms
// /auth/v1/user round-trip per request). Als deze test faalt: check
// Supabase Dashboard → Project Settings → JWT Keys.
test.describe('auth JWKS', () => {
  test('JWKS-endpoint bevat minstens één asymmetrische key (ES256/RS256)', async ({ request }) => {
    const supabaseUrl = envFromLocalFile('NEXT_PUBLIC_SUPABASE_URL')
    test.skip(!supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL ontbreekt')

    const response = await request.get(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
    expect(response.ok()).toBeTruthy()

    const jwks = (await response.json()) as { keys?: Array<{ alg?: string }> }
    const keys = jwks.keys ?? []

    expect(keys.length).toBeGreaterThan(0)
    const asymmetric = keys.filter((k) => k.alg === 'ES256' || k.alg === 'RS256')
    expect(asymmetric.length).toBeGreaterThan(0)
  })
})