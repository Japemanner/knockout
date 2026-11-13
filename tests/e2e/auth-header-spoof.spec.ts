import { test, expect } from '@playwright/test'
import { NextRequest } from 'next/server.js'

// Pure logic-regressietests (geen browser, geen login), conform
// tests/e2e/content-ideas-logic.spec.ts. Bewaakt twee kwetsbaarheden:
// 1. een door de client gesponsorde x-user-id header mag nooit server-side
//    terechtkomen (middleware strippt hem vóór NextResponse.next);
// 2. tabel-/kolomnamen die in PostgREST- of SQL-strings belanden moeten
//    syntactisch gevalideerd zijn.

import { updateSession } from '@/lib/supabase/middleware'
import { assertIdent } from '@/lib/db/identifiers'

// Playwright laadt geen .env.local. De middleware heeft alleen een
// Supabase-URL en anon-key nodig om de client te construeren; zonder sessie
// (geen cookies) doet getClaims() geen netwerkcall, dus dummy-waarden volstaan.
// De env-vars worden alleen binnen deze test gezet (en daarna hersteld), zodat
// ze niet lekken naar andere spec-bestanden in dezelfde worker.
async function withSupabaseEnv<T>(fn: () => Promise<T>): Promise<T> {
  const keys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const
  const previous = keys.map((key) => process.env[key])
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  try {
    return await fn()
  } finally {
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key]
      else process.env[key] = previous[i]
    })
  }
}

test.describe('x-user-id spoofing', () => {
  test('gestript op een publiek pad: geen user en geen doorgifte van de header', async () => {
    const request = new NextRequest('http://localhost:3000/login', {
      headers: { 'x-user-id': '00000000-0000-0000-0000-000000000000' },
    })

    const { user, supabaseResponse } = await withSupabaseEnv(() => updateSession(request))

    expect(user).toBeNull()
    expect(request.headers.get('x-user-id')).toBeNull()
    expect(supabaseResponse.headers.get('x-middleware-request-x-user-id')).toBeNull()
  })
})

test.describe('assertIdent', () => {
  test('accepteert een geldige tabelnaam', () => {
    expect(assertIdent('kk_cards')).toBe('kk_cards')
  })

  test('weigert SQL-injectie, spaties, lege strings en namen langer dan 63 tekens', () => {
    for (const invalid of [
      'kk_cards"; drop table x; --',
      'a b',
      '',
      'a'.repeat(64),
    ]) {
      expect(() => assertIdent(invalid)).toThrow('Ongeldige naam')
    }
  })
})
