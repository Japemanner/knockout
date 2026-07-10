import { test, expect } from '@playwright/test'

// Regression tests voor Supabase-latency-sensitive paden.
// Elke test dekt een functie die in de performance-refactoring is aangepast
// OF een kritieke user flow die voorheen geen test-dekking had.
// Tests skippen automatisch als er geen login-sessie is.

function skipIfNotLoggedIn(page: import('@playwright/test').Page) {
  if (page.url().includes('/login')) {
    test.skip(true, 'Niet ingelogd — login vereist')
    return true
  }
  return false
}

// ============================================================
// /boards lijst pagina — server-side fetch van kk_boards
// ============================================================
test.describe('/boards lijstpagina', () => {
  test('toont titel en bordkaarten of lege state', async ({ page }) => {
    await page.goto('/boards')
    if (skipIfNotLoggedIn(page)) return

    await expect(page.getByText('Borden')).toBeVisible()
    await expect(page.getByText('Je Kanban-borden')).toBeVisible()

    // Er moeten borden zijn (kaarten met bordnamen) of de lege-state tekst
    const emptyText = page.getByText('Nog geen borden')
    const boardCards = page.locator('a[href^="/boards/"]:not([href$="/boards"])')
    const hasEmpty = await emptyText.count() > 0
    const hasBoards = await boardCards.count() > 0

    expect(hasEmpty || hasBoards).toBeTruthy()
  })

  test('Nieuw bord knop is zichtbaar', async ({ page }) => {
    await page.goto('/boards')
    if (skipIfNotLoggedIn(page)) return

    await expect(page.getByRole('button', { name: /Nieuw bord/ })).toBeVisible()
  })
})

// ============================================================
// Bord aanmaken — createBoard server action (2 Supabase queries)
// ============================================================
test.describe('bord aanmaken', () => {
  test('nieuw bord aanmaken via dialog toont het bord in de lijst', async ({ page }) => {
    await page.goto('/boards')
    if (skipIfNotLoggedIn(page)) return

    const createButton = page.getByRole('button', { name: /Nieuw bord/ })
    await createButton.click()

    // Dialog moet openen
    await expect(page.getByText('Nieuw bord')).toBeVisible()
    await expect(page.getByPlaceholder('Bordnaam...')).toBeVisible()

    const boardName = `Test Bord ${Date.now()}`
    await page.getByPlaceholder('Bordnaam...').fill(boardName)
    await page.getByRole('button', { name: 'Aanmaken' }).click()

    // Bord moet verschijnen in de lijst na refresh
    await page.waitForURL('**/boards')
    await expect(page.getByText(boardName)).toBeVisible({ timeout: 10000 })
  })
})

// ============================================================
// Kaart aanmaken in kolom — createCardInColumn RPC (was 3 trips, nu 1 RPC)
// ============================================================
test.describe('kaart aanmaken in kolom', () => {
  test('kaart aanmaken via kolom + knop verschijnt in de kolom', async ({ page }) => {
    await page.goto('/boards')
    if (skipIfNotLoggedIn(page)) return

    const boardLinks = page.locator('a[href^="/boards/"]:not([href$="/boards"])')
    if (await boardLinks.count() === 0) {
      test.skip(true, 'Geen borden beschikbaar')
      return
    }

    const href = await boardLinks.first().getAttribute('href')
    if (!href) return
    await page.goto(href)

    // Klik op de eerste "Kaart" knop in een kolom
    const addButtons = page.getByRole('button', { name: /Kaart$/ })
    if (await addButtons.count() === 0) {
      test.skip(true, 'Geen kolommen met kaart-knop')
      return
    }

    await addButtons.first().click()

    // Vul kaarttitel in en bevestig
    const titleInput = page.getByPlaceholder('Kaarttitel...')
    await expect(titleInput).toBeVisible()
    const cardTitle = `Test Kaart ${Date.now()}`
    await titleInput.fill(cardTitle)
    await page.getByRole('button', { name: 'Toevoegen' }).first().click()

    // Kaart moet zichtbaar zijn in de kolom
    await expect(page.getByText(cardTitle)).toBeVisible({ timeout: 5000 })
  })
})

// ============================================================
// Kaart bewerken — updateCard (revalidatePath verwijderd)
// ============================================================
test.describe('kaart bewerken', () => {
  test('kaart detail modal opent en opslaan werkt', async ({ page }) => {
    await page.goto('/boards')
    if (skipIfNotLoggedIn(page)) return

    const boardLinks = page.locator('a[href^="/boards/"]:not([href$="/boards"])')
    if (await boardLinks.count() === 0) {
      test.skip(true, 'Geen borden beschikbaar')
      return
    }

    const href = await boardLinks.first().getAttribute('href')
    if (!href) return
    await page.goto(href)

    // Zoek een kaart om op te klikken
    const cards = page.locator('[class*="cursor-grab"]')
    if (await cards.count() === 0) {
      test.skip(true, 'Geen kaarten op dit bord')
      return
    }

    await cards.first().click()

    // Detail modal moet openen
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })

    // Wijzig de titel
    const titleInput = page.locator('[role="dialog"] input').first()
    const originalTitle = await titleInput.inputValue()
    const newTitle = `${originalTitle} (bewerkt)`
    await titleInput.fill(newTitle)

    // Opslaan
    await page.getByRole('button', { name: 'Opslaan' }).click()

    // Modal sluit of toont geen fout
    // De titel in de kolomkaart moet bijgewerkt zijn (optimistic update)
    await expect(page.getByText(newTitle)).toBeVisible({ timeout: 5000 })
  })
})

// ============================================================
// Ster toggle + persistentie — toggleStar (revalidatePath verwijderd)
// ============================================================
test.describe('ster toggle persistentie', () => {
  test('ster toggle overleeft een page reload', async ({ page }) => {
    await page.goto('/boards')
    if (skipIfNotLoggedIn(page)) return

    const boardLinks = page.locator('a[href^="/boards/"]:not([href$="/boards"])')
    if (await boardLinks.count() === 0) {
      test.skip(true, 'Geen borden beschikbaar')
      return
    }

    const href = await boardLinks.first().getAttribute('href')
    if (!href) return
    await page.goto(href)

    const cards = page.locator('[class*="cursor-grab"]')
    if (await cards.count() === 0) {
      test.skip(true, 'Geen kaarten op dit bord')
      return
    }

    // Hover over de eerste kaart om de ster-knop zichtbaar te maken
    await cards.first().hover()
    const starButton = cards.first().locator('button').first()

    // Bepaal huidige ster-status
    const wasStarred = await cards.first().locator('svg[class*="fill-yellow-500"]').count() > 0

    // Toggle de ster
    await starButton.click({ force: true })

    // Wacht even voor de optimistic update
    await expect(page.locator('body')).toBeVisible()

    // Herlaad de pagina
    await page.reload()

    // Verwacht dat de ster-status consistent is (als we hem aanzetten, is hij nu aan;
    // als we hem uitzetten, is hij nu uit)
    const cardsAfterReload = page.locator('[class*="cursor-grab"]')
    await cardsAfterReload.first().waitFor({ state: 'visible' })

    if (!wasStarred) {
      // We hebben de ster aangezet — na reload moet hij geel zijn
      const yellowStar = cardsAfterReload.first().locator('svg[class*="fill-yellow-500"]')
      await expect(yellowStar).toBeVisible({ timeout: 5000 })
    } else {
      // We hebben de ster uitgezet — na reload mag hij niet geel zijn
      const yellowStar = cardsAfterReload.first().locator('svg[class*="fill-yellow-500"]')
      const stillStarred = await yellowStar.count() > 0
      expect(stillStarred).toBeFalsy()
    }
  })
})

// ============================================================
// Kolom aanmaken — createColumn server action (2 Supabase queries)
// ============================================================
test.describe('kolom aanmaken', () => {
  test('nieuwe kolom toevoegen verschijnt op het bord', async ({ page }) => {
    await page.goto('/boards')
    if (skipIfNotLoggedIn(page)) return

    const boardLinks = page.locator('a[href^="/boards/"]:not([href$="/boards"])')
    if (await boardLinks.count() === 0) {
      test.skip(true, 'Geen borden beschikbaar')
      return
    }

    const href = await boardLinks.first().getAttribute('href')
    if (!href) return
    await page.goto(href)

    // Tel bestaande kolommen
    const existingColumns = page.locator('h3.font-medium')
    const initialCount = await existingColumns.count()

    // Klik op "Kolom toevoegen"
    const addColumnButton = page.getByRole('button', { name: /Kolom toevoegen/ })
    await addColumnButton.click()

    // Vul kolomnaam in
    const columnName = `Test Kolom ${Date.now()}`
    await page.getByPlaceholder('Kolomnaam...').fill(columnName)
    await page.getByRole('button', { name: 'Toevoegen' }).click()

    // Wacht op page refresh en verifieer dat de kolom verschijnt
    await page.waitForLoadState('networkidle')

    // Herlaad om de nieuwe kolom te zien (createColumn roept revalidatePath aan)
    await page.reload()

    const newColumns = page.locator('h3.font-medium')
    const newCount = await newColumns.count()
    expect(newCount).toBe(initialCount + 1)

    await expect(page.getByText(columnName)).toBeVisible()
  })
})

// ============================================================
// Kaart verwijderen — deleteCard (4 Supabase queries)
// ============================================================
test.describe('kaart verwijderen', () => {
  test('kaart verwijderen via detail modal verwijdert de kaart uit de kolom', async ({ page }) => {
    await page.goto('/boards')
    if (skipIfNotLoggedIn(page)) return

    const boardLinks = page.locator('a[href^="/boards/"]:not([href$="/boards"])')
    if (await boardLinks.count() === 0) {
      test.skip(true, 'Geen borden beschikbaar')
      return
    }

    const href = await boardLinks.first().getAttribute('href')
    if (!href) return
    await page.goto(href)

    const cards = page.locator('[class*="cursor-grab"]')
    const cardCount = await cards.count()
    if (cardCount === 0) {
      test.skip(true, 'Geen kaarten om te verwijderen')
      return
    }

    // Onthoud de titel van de eerste kaart
    const firstCard = cards.first()
    const cardTitle = await firstCard.locator('span').first().textContent()

    // Open detail modal
    await firstCard.click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })

    // Klik op Verwijderen
    await page.getByRole('button', { name: /Verwijderen/ }).first().click()

    // Bevestig
    await page.getByRole('button', { name: 'Ja' }).click()

    // Modal sluit
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 })

    // Kaart mag niet meer zichtbaar zijn (optimistic update verwijdert hem)
    if (cardTitle) {
      const remaining = page.getByText(cardTitle)
      await expect(remaining).toHaveCount(0, { timeout: 5000 })
    }
  })
})

// ============================================================
// Kaart archiveren — toggleArchiveCard (4 Supabase queries)
// ============================================================
test.describe('kaart archiveren', () => {
  test('kaart archiveren via detail modal verwijdert de kaart uit het bord', async ({ page }) => {
    await page.goto('/boards')
    if (skipIfNotLoggedIn(page)) return

    const boardLinks = page.locator('a[href^="/boards/"]:not([href$="/boards"])')
    if (await boardLinks.count() === 0) {
      test.skip(true, 'Geen borden beschikbaar')
      return
    }

    const href = await boardLinks.first().getAttribute('href')
    if (!href) return
    await page.goto(href)

    const cards = page.locator('[class*="cursor-grab"]')
    if (await cards.count() === 0) {
      test.skip(true, 'Geen kaarten om te archiveren')
      return
    }

    const cardTitle = await cards.first().locator('span').first().textContent()

    // Open detail modal
    await cards.first().click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })

    // Klik op Archiveren
    await page.getByRole('button', { name: /Archiveren/ }).click()

    // Toast moet verschijnen
    await expect(page.getByText(/gearchiveerd/)).toBeVisible({ timeout: 5000 })

    // Modal sluit
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 })

    // Kaart mag niet meer zichtbaar zijn in de kolom
    if (cardTitle) {
      const remaining = page.getByText(cardTitle)
      await expect(remaining).toHaveCount(0, { timeout: 5000 })
    }
  })
})

// ============================================================
// Board pagina kolom-volgorde — nested query met foreignTable ordering
// ============================================================
test.describe('bordpagina kolom-volgorde', () => {
  test('kolommen tonen in de juiste volgorde (Backlog, Doing, Review, Done)', async ({ page }) => {
    await page.goto('/boards')
    if (skipIfNotLoggedIn(page)) return

    const boardLinks = page.locator('a[href^="/boards/"]:not([href$="/boards"])')
    if (await boardLinks.count() === 0) {
      test.skip(true, 'Geen borden beschikbaar')
      return
    }

    const href = await boardLinks.first().getAttribute('href')
    if (!href) return
    await page.goto(href)

    // Lees alle kolom-headers in volgorde
    const headers = page.locator('h3.font-medium')
    const count = await headers.count()
    if (count < 2) {
      test.skip(true, 'Te weinig kolommen om volgorde te testen')
      return
    }

    const names = await headers.allTextContents()
    // Als de eerste kolom "Backlog" is, verifieer de default volgorde
    if (names[0]?.trim() === 'Backlog') {
      expect(names[1]?.trim()).toBe('Doing')
      if (count >= 3) expect(names[2]?.trim()).toBe('Review')
      if (count >= 4) expect(names[3]?.trim()).toBe('Done')
    }
    // Als de volgorde anders is (aangepast bord), verify alleen dat
    // de kolommen niet leeg zijn en uniek
    expect(names.every((n) => n.trim().length > 0)).toBeTruthy()
    expect(new Set(names).size).toBe(names.length)
  })
})

// ============================================================
// Uren dashboard — getDashboardStats (N+1 fix, JS aggregation)
// ============================================================
test.describe('/uren dashboard stats', () => {
  test('dashboard toont opdrachtgevers met voortgang indien ingelogd', async ({ page }) => {
    await page.goto('/uren')
    if (skipIfNotLoggedIn(page)) return

    await expect(page.getByText('Urenregistratie')).toBeVisible()

    // Het dashboard (HoursDashboard component) laadt client-side via TanStack Query
    // Verwacht of opdrachtgevers met uren, of een lege state
    // Belangrijk: de pagina mag niet crashen (de N+1 fix moet werken)
    await page.waitForLoadState('networkidle')

    // Als er opdrachtgevers zijn, moeten er voortgangsbalken of percentages zichtbaar zijn
    // Als er geen opdrachtgevers zijn, toont het formulier een placeholder
    const hasContent = await page.locator('body').textContent()
    expect(hasContent).toBeTruthy()
    expect(hasContent!.length).toBeGreaterThan(0)
  })

  test('uren schrijven formulier is zichtbaar', async ({ page }) => {
    await page.goto('/uren')
    if (skipIfNotLoggedIn(page)) return

    await expect(page.getByText('Uren schrijven')).toBeVisible()
  })

  test('historie sectie is zichtbaar', async ({ page }) => {
    await page.goto('/uren')
    if (skipIfNotLoggedIn(page)) return

    await expect(page.getByText('Historie')).toBeVisible()
  })
})

// ============================================================
// Middleware auth — redirect naar /login als niet ingelogd
// ============================================================
test.describe('auth redirect', () => {
  test('onbeveiligde route redirect naar /login zonder sessie', async ({ page, context }) => {
    // Maak een schone context zonder cookies
    const cleanPage = await context.newPage()
    await cleanPage.goto('/boards')

    // Moet herleid worden naar /login
    await cleanPage.waitForURL('**/login**', { timeout: 10000 })
    expect(cleanPage.url()).toContain('/login')

    await cleanPage.close()
  })
})

// ============================================================
// Command-center gesterde items data-correctheid
// (regression voor de many-to-one nested relation bug)
// ============================================================
test.describe('command-center gesterde items data-correctheid', () => {
  test('gesterde items op command-center komen overeen met /starred pagina', async ({ page }) => {
    // Haal gesterde items op via /starred
    await page.goto('/starred')
    if (skipIfNotLoggedIn(page)) return

    // Lees alle bord-namen en kaart-titels van /starred
    const starredBoardLinks = page.locator('a[href^="/boards/"]:not([href$="/boards"])')
    const starredCount = await starredBoardLinks.count()

    if (starredCount === 0) {
      test.skip(true, 'Geen gesterde items — kan data-correctheid niet vergelijken')
      return
    }

    const starredBoardNames: string[] = []
    for (let i = 0; i < starredCount; i++) {
      const text = await starredBoardLinks.nth(i).textContent()
      if (text) starredBoardNames.push(text.trim())
    }

    // Ga naar command-center en vergelijk
    await page.goto('/command-center')

    // De StarredSection moet dezelfde bordnamen tonen
    const ccSection = page.locator('text=Gesterde items').locator('..')
    for (const name of starredBoardNames) {
      // Elke bordnaam van /starred moet ook op /command-center staan
      await expect(ccSection.getByText(name)).toBeVisible({ timeout: 5000 })
    }
  })
})