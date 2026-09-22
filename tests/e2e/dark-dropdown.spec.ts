import { test, expect } from '@playwright/test'

// Regression test voor dark mode dropdown leesbaarheid (feature 017).
// In dark mode werden <option> elementen onleesbaar: witte tekst op lichte achtergrond.
// Fix: expliciete color: black + backgroundColor: white op elk <option> in de Select component.
// Tests skippen automatisch als er geen login-sessie is.

function skipIfNotLoggedIn(page: import('@playwright/test').Page) {
  if (page.url().includes('/login')) {
    test.skip(true, 'Niet ingelogd — login vereist')
    return true
  }
  return false
}

test.describe('dark mode dropdown leesbaarheid', () => {
  test('option elementen hebben donkere tekst en lichte achtergrond in dark mode', async ({ page }) => {
    await page.goto('/settings')
    if (skipIfNotLoggedIn(page)) return

    // Activeer dark mode via de thema-selector
    const themeSelect = page.locator('select').first()
    await themeSelect.selectOption('dark')

    // Wacht tot de .dark class op <html> staat
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 3000 })

    // Verifieer dat alle <option> elementen in de thema-selector expliciet
    // donkere tekst (black) en lichte achtergrond (white) hebben
    const options = themeSelect.locator('option')
    const count = await options.count()

    // Minimaal de 3 thema-opties (Licht, Donker, Systeem)
    expect(count).toBeGreaterThanOrEqual(3)

    for (let i = 0; i < count; i++) {
      const opt = options.nth(i)
      const color = await opt.evaluate((el) => window.getComputedStyle(el).color)
      const bg = await opt.evaluate((el) => window.getComputedStyle(el).backgroundColor)

      // color moet rgb(0, 0, 0) zijn (black) — behalve de placeholder die #6b7280 is
      const isPlaceholder = await opt.getAttribute('disabled')
      if (isPlaceholder !== null) {
        // Placeholder optie: grijze tekst
        expect(color).not.toBe('rgb(255, 255, 255)')
      } else {
        expect(color).toBe('rgb(0, 0, 0)')
      }

      // backgroundColor moet rgb(255, 255, 255) zijn (white)
      expect(bg).toBe('rgb(255, 255, 255)')
    }
  })

  test('gesloten select veld behoudt thema-styling in dark mode', async ({ page }) => {
    await page.goto('/settings')
    if (skipIfNotLoggedIn(page)) return

    // Activeer dark mode
    const themeSelect = page.locator('select').first()
    await themeSelect.selectOption('dark')
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 3000 })

    // Het <select> element zelf moet bg-transparent zijn (thema volgen)
    // en de tekst moet licht zijn (erven van dark mode foreground)
    const selectColor = await themeSelect.evaluate((el) => window.getComputedStyle(el).color)
    // In dark mode is --foreground 0 0% 98% = rgb(250, 250, 250)
    // De tekst van het select moet licht zijn (niet zwart)
    expect(selectColor).not.toBe('rgb(0, 0, 0)')
  })

  test('geen regressie in light mode — opties blijven leesbaar', async ({ page }) => {
    await page.goto('/settings')
    if (skipIfNotLoggedIn(page)) return

    // Activeer light mode
    const themeSelect = page.locator('select').first()
    await themeSelect.selectOption('light')

    // Wacht tot .dark class verwijderd is
    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 3000 })

    const options = themeSelect.locator('option')
    const count = await options.count()
    expect(count).toBeGreaterThanOrEqual(3)

    for (let i = 0; i < count; i++) {
      const opt = options.nth(i)
      const color = await opt.evaluate((el) => window.getComputedStyle(el).color)
      const bg = await opt.evaluate((el) => window.getComputedStyle(el).backgroundColor)

      // In light mode moet ook zwart-op-wit zijn (geen regressie)
      const isPlaceholder = await opt.getAttribute('disabled')
      if (isPlaceholder === null) {
        expect(color).toBe('rgb(0, 0, 0)')
      }
      expect(bg).toBe('rgb(255, 255, 255)')
    }
  })

  test('uren formulier dropdown opties zijn leesbaar in dark mode', async ({ page }) => {
    await page.goto('/uren')
    if (skipIfNotLoggedIn(page)) return

    // Activeer dark mode via settings als er een thema-toggle is,
    // anders via emulateMedia
    await page.emulateMedia({ colorScheme: 'dark' })

    // Zoek alle <select> elementen op de uren-pagina
    const selects = page.locator('select')
    const selectCount = await selects.count()

    if (selectCount === 0) {
      test.skip(true, 'Geen dropdowns op de uren-pagina')
      return
    }

    // Controleer de eerste select met opties
    const firstSelect = selects.first()
    const options = firstSelect.locator('option')
    const optCount = await options.count()

    if (optCount === 0) {
      test.skip(true, 'Dropdown heeft geen opties')
      return
    }

    for (let i = 0; i < optCount; i++) {
      const opt = options.nth(i)
      const color = await opt.evaluate((el) => window.getComputedStyle(el).color)
      const bg = await opt.evaluate((el) => window.getComputedStyle(el).backgroundColor)

      // Opties moeten donkere tekst op lichte achtergrond hebben
      expect(color).not.toBe('rgb(255, 255, 255)')
      expect(bg).toBe('rgb(255, 255, 255)')
    }
  })
})