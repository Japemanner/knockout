import { test, expect } from '@playwright/test'

// Feature 021: vaste kolommen Backlog/Doing/Done op alle borden; Done start altijd ingeklapt.
// Volgt het bestaande skip-als-niet-ingelogd patroon uit de regressiesuite.

async function skipIfNotLoggedIn(page: import('@playwright/test').Page): Promise<boolean> {
  if (page.url().includes('/login')) {
    test.skip(true, 'Niet ingelogd — test overgeslagen')
    return true
  }
  return false
}

test.describe('vaste kolomstructuur — nieuw bord', () => {
  test('nieuw bord heeft exact Backlog, Doing, Done in volgorde', async ({ page }) => {
    await page.goto('/boards')
    if (await skipIfNotLoggedIn(page)) return

    // Maak een nieuw bord aan
    const createButton = page.getByRole('button', { name: /Nieuw bord/ })
    await createButton.click()
    await expect(page.getByPlaceholder('Bordnaam...')).toBeVisible()

    const boardName = `Standaard Kolommen Test ${Date.now()}`
    await page.getByPlaceholder('Bordnaam...').fill(boardName)
    await page.getByRole('button', { name: 'Aanmaken' }).click()
    await page.waitForURL('**/boards')
    await expect(page.getByText(boardName)).toBeVisible({ timeout: 10000 })

    // Open het nieuwe bord
    const boardLink = page.locator('a[href^="/boards/"]:not([href$="/boards"])', {
      hasText: boardName,
    })
    await boardLink.first().click()
    await page.waitForLoadState('networkidle')

    // Data-correctheid: exact Backlog, Doing, Done — geen Review, geen andere kolommen
    const headers = page.locator('h3.font-medium')
    const names = (await headers.allTextContents()).map((n) => n.trim())
    expect(names.length).toBe(3)
    expect(names[0]).toBe('Backlog')
    expect(names[1]).toBe('Doing')
    expect(names[2]).toBe('Done')
  })

  test('nieuw bord heeft geen Kolom toevoegen-knop meer', async ({ page }) => {
    await page.goto('/boards')
    if (await skipIfNotLoggedIn(page)) return

    const boardLinks = page.locator('a[href^="/boards/"]:not([href$="/boards"])')
    if (await boardLinks.count() === 0) {
      test.skip(true, 'Geen borden beschikbaar')
      return
    }

    const href = await boardLinks.first().getAttribute('href')
    if (!href) return
    await page.goto(href)

    await expect(page.getByRole('button', { name: /Kolom toevoegen/ })).toHaveCount(0)
  })
})

test.describe('Done-kolom standaard ingeklapt', () => {
  test('Done start ingeklapt, uitklappen werkt, en herladen reset naar ingeklapt', async ({ page }) => {
    await page.goto('/boards')
    if (await skipIfNotLoggedIn(page)) return

    const boardLinks = page.locator('a[href^="/boards/"]:not([href$="/boards"])')
    if (await boardLinks.count() === 0) {
      test.skip(true, 'Geen borden beschikbaar')
      return
    }

    const href = await boardLinks.first().getAttribute('href')
    if (!href) return
    await page.goto(href)
    await page.waitForLoadState('networkidle')

    // Done-kolom moet bestaan
    const doneHeader = page.locator('h3.font-medium', { hasText: 'Done' }).first()
    await expect(doneHeader).toBeVisible()

    // De kolomknop rond Done moet de aria-label "Done uitklappen" hebben (ingeklapt)
    const collapseToggle = page.locator('button[aria-label="Done uitklappen"]').first()
    await expect(collapseToggle).toBeVisible()

    // De "Kaart"-toevoegknop is verborgen zolang de kolom ingeklapt is
    const doneColumn = collapseToggle.locator('..')
    await expect(doneColumn.getByRole('button', { name: /Kaart$/ })).toHaveCount(0)

    // Klap de Done-kolom uit
    await collapseToggle.click()
    const expandToggle = page.locator('button[aria-label="Done inklappen"]').first()
    await expect(expandToggle).toBeVisible()

    // Herlaad de pagina — Done moet weer ingeklapt zijn
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button[aria-label="Done uitklappen"]').first()).toBeVisible()
    await expect(page.locator('button[aria-label="Done inklappen"]')).toHaveCount(0)
  })

  test('ingeklapte Done-kolom toont het aantal kaarten', async ({ page }) => {
    await page.goto('/boards')
    if (await skipIfNotLoggedIn(page)) return

    const boardLinks = page.locator('a[href^="/boards/"]:not([href$="/boards"])')
    if (await boardLinks.count() === 0) {
      test.skip(true, 'Geen borden beschikbaar')
      return
    }

    const href = await boardLinks.first().getAttribute('href')
    if (!href) return
    await page.goto(href)
    await page.waitForLoadState('networkidle')

    // De kaartteller (text-xs text-muted-foreground) naast de kolomnaam moet zichtbaar blijven
    const doneColumn = page.locator('div', { has: page.locator('h3.font-medium', { hasText: 'Done' }) }).first()
    await expect(doneColumn.locator('span.text-xs').first()).toBeVisible()
  })
})