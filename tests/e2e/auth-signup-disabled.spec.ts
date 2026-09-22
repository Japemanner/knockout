import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Playwright laadt geen .env.local — Next.js dev server wel. Fallback voor de
// API-test, zodat tests lokaal draaien zodra .env.local bestaat.
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

// Registratie is definitief uitgeschakeld (disable_signup=true + DB-trigger backstop).
// Deze tests verifiëren dat:
// 1. De Auth API signup weigert voor nieuwe gebruikers (disable_signup=true)
// 2. De loginpagina geen onbekende adressen laat registreren via magic link
//    én de neutrale melding toont (geen account-enumeration).

const NEUTRAL_MESSAGE = 'Als dit adres bekend is, ontvang je een inloglink.'

// ============================================================
// API: GET /auth/v1/settings — disable_signup moet true zijn
// ============================================================
test.describe('auth settings API', () => {
  test('disable_signup staat op true', async ({ request }) => {
    const supabaseUrl = envFromLocalFile('NEXT_PUBLIC_SUPABASE_URL')
    const anonKey = envFromLocalFile('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    test.skip(!supabaseUrl || !anonKey, 'NEXT_PUBLIC_SUPABASE_URL of NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreekt')

    const response = await request.get(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: anonKey! },
    })
    expect(response.ok()).toBeTruthy()

    const settings = await response.json()
    expect(settings.disable_signup).toBe(true)
  })
})

// ============================================================
// UI: magic link naar onbekend adres — neutrale melding, geen account-enumeration
// ============================================================
test.describe('login magic link (signup disabled)', () => {
  test('onbekend adres geeft neutrale melding zonder "Signups not allowed"', async ({ page }) => {
    await page.goto('/login')

    const email = `signup-test-${Date.now()}@example.com`
    await page.locator('#email').fill(email)
    await page.getByRole('button', { name: 'Stuur magic link' }).click()

    // Neutrale melding (ook bij een error — niet lekken of het adres bestaat)
    await expect(page.getByText(NEUTRAL_MESSAGE)).toBeVisible({ timeout: 15000 })

    // De auth-server weigert registratie van onbekende adressen.
    // De UI mag de Supabase-fouttekst ("Signups not allowed") nergens tonen.
    expect(await page.getByText('Signups not allowed').count()).toBe(0)
  })
})