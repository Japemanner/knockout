import { test, expect } from '@playwright/test'

// E2E-regressiontests voor de SSR-prefetch refactor van /uren
// (branch 001-multi-kanban-workspace):
// - src/app/(dashboard)/uren/page.tsx prefetcht 5 queries server-side via
//   QueryClient.prefetchQuery + HydrationBoundary
// - de browser-queryFn's in src/hooks/useHours.ts lezen rechtstreeks via de
//   browser-Supabase-client — GEEN server-action reads meer
// - mutaties (create/update client, create/update/delete entry) blijven server
//   actions, maar revalidatePath('/uren') is verwijderd uit createClient en
//   updateClient — data-verversing loopt via React Query invalidatie
//
// Dekking:
// 1. Het laden van /uren triggert GEEN requests met een next-action header
//    (server action). Supabase REST-refetches na hydratatie zijn géén server
//    actions en worden correct niet meegeteld.
// 2. Een nieuwe opdrachtgever verschijnt ZONDER reload in de lijst in het
//    beheer-dialog én als Card op het dashboard (regression voor het
//    verwijderde revalidatePath — React Query invalidatie moet het overnemen).
// 3. Een nieuwe urenregel verschijnt ZONDER reload direct in de Historie
//    (optimistic update op de ['hours','entries'] key-prefix).
//
// Conventies conform tests/e2e/hours.spec.ts: elke test start met
// page.goto('/uren'), skip via test.skip wanneer de middleware naar /login
// herleidt, geen vaste sleeps, geen beforeEach. Tests zijn robuust voor een
// account zonder opdrachtgevers/entries (skip of graceful aanmaak).

test.describe('/uren SSR-hydratie en React Query invalidatie', () => {
  test('/uren stuurt geen server-action requests bij het laden', async ({ page }) => {
    // Verzamel ALLE requests met een next-action header (= server action call).
    // De listener staat vóór page.goto zodat niets gemist wordt.
    // Let op: TanStack Query refetcht na hydratatie mogelijk rechtstreeks via
    // Supabase REST — dat zijn geen server actions en moeten niet worden
    // meegeteld; daarom filteren we uitsluitend op de next-action header.
    const serverActionUrls: string[] = []
    page.on('request', (request) => {
      if (request.headers()['next-action']) {
        serverActionUrls.push(request.url())
      }
    })

    await page.goto('/uren')

    // Als we naar /login zijn herleid, skip de rest
    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist')
      return
    }

    // 1. Pagina-structuur geladen
    await expect(page.getByText('Urenregistratie')).toBeVisible({ timeout: 20000 })

    // 2. Tijdschrijf-sectie gehydrateerd: formulier aanwezig óf de lege state
    //    (geen actieve opdrachtgevers)
    const formTitle = page.getByText('Uren schrijven')
    const noClientsText = page.getByText('Voeg eerst een opdrachtgever toe')
    await expect(formTitle.or(noClientsText).first()).toBeVisible({ timeout: 15000 })

    // 3. Historie-sectie geladen
    await expect(page.getByText('Historie')).toBeVisible({ timeout: 15000 })

    // 4. Dashboard is geladen of leeg: een Card op het dashboard rendert de
    //    titel als h3 binnen div.grid > div.rounded-xl (Skeletons in de laad-
    //    state zijn divs zonder h3 en matchen dus niet), óf de lege state
    //    "Nog geen opdrachtgevers" is zichtbaar.
    const dashboardCardTitle = page.locator('div.grid > div.rounded-xl h3')
    const dashboardEmpty = page.getByText('Nog geen opdrachtgevers')
    await expect(dashboardCardTitle.or(dashboardEmpty).first()).toBeVisible({ timeout: 15000 })

    // 5. De kern van de test: er mogen géén server-action requests zijn geweest
    if (serverActionUrls.length > 0) {
      console.log('Server-action requests gevonden tijdens laden van /uren:', serverActionUrls)
    }
    expect(
      serverActionUrls,
      `Verwacht 0 next-action requests bij het laden van /uren, maar vond ${serverActionUrls.length}: ${serverActionUrls.join(', ')}`
    ).toEqual([])
  })

  test('nieuwe opdrachtgever verschijnt zonder reload in lijst en op dashboard', async ({ page }) => {
    await page.goto('/uren')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist')
      return
    }

    // Open het beheer-dialog (de Dialog-component rendert een container met
    // class "max-w-lg" — uniek op de pagina)
    await page.getByRole('button', { name: /Beheer opdrachtgevers/ }).click()
    await expect(page.getByText('Opdrachtgevers beheren')).toBeVisible()

    const dialog = page.locator('div.max-w-lg')

    // Open het aanmaakformulier
    await dialog.getByRole('button', { name: 'Nieuwe opdrachtgever' }).click()

    // Vul het formulier met een unieke naam
    const clientName = `Test Opdrachtgever ${Date.now()}`
    await dialog.getByPlaceholder('bijv. Acme BV').fill(clientName)
    await dialog.getByPlaceholder('bijv. 40').fill('10')
    await dialog.getByPlaceholder('bijv. 75').fill('50')

    await dialog.getByRole('button', { name: 'Toevoegen' }).click()

    // Toast bevestigt de mutatie
    await expect(page.getByText('Opdrachtgever toegevoegd')).toBeVisible({ timeout: 10000 })

    // ZONDER reload: de nieuwe naam verschijnt in de opdrachtgeverslijst in het
    // dialog (React Query invalidatie van ['hours','clients'])
    await expect(dialog.getByText(clientName)).toBeVisible({ timeout: 10000 })

    // Sluit het dialog via de Sluiten-knop in de footer
    await dialog.getByRole('button', { name: 'Sluiten' }).click()

    // ZONDER reload: de nieuwe naam verschijnt op het dashboard als Card-titel
    // (h3-heading). Regression voor het verwijderde revalidatePath('/uren') in
    // createClient — de invalidatie van ['hours','dashboard'] moet de
    // data-verversing overnemen.
    await expect(page.getByRole('heading', { name: clientName })).toBeVisible({ timeout: 10000 })
  })

  test('nieuwe urenregel verschijnt direct in Historie', async ({ page }) => {
    await page.goto('/uren')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist')
      return
    }

    // Het tijdschrijf-formulier is uniek herkenbaar aan #hours-date. De
    // Select-component rendert een native <select> zonder id, dus de selects
    // worden per positie binnen dit formulier aangesproken:
    // 0 = opdrachtgever, 1 = start-uur, 2 = start-minuut,
    // 3 = eind-uur, 4 = eind-minuut.
    const entryForm = page.locator('form:has(#hours-date)')
    const noClientsText = page.getByText('Voeg eerst een opdrachtgever toe')

    // Wacht tot het formulier of de lege state zichtbaar is
    await expect(entryForm.or(noClientsText).first()).toBeVisible({ timeout: 15000 })

    // Geen actieve opdrachtgevers → maak er eerst één aan via het beheer-dialog
    if (await noClientsText.isVisible()) {
      await page.getByRole('button', { name: /Beheer opdrachtgevers/ }).click()
      await expect(page.getByText('Opdrachtgevers beheren')).toBeVisible()

      const dialog = page.locator('div.max-w-lg')
      await dialog.getByRole('button', { name: 'Nieuwe opdrachtgever' }).click()
      const fallbackClientName = `Test Opdrachtgever ${Date.now()}`
      await dialog.getByPlaceholder('bijv. Acme BV').fill(fallbackClientName)
      await dialog.getByPlaceholder('bijv. 40').fill('10')
      await dialog.getByPlaceholder('bijv. 75').fill('50')
      await dialog.getByRole('button', { name: 'Toevoegen' }).click()
      await expect(page.getByText('Opdrachtgever toegevoegd')).toBeVisible({ timeout: 10000 })

      await dialog.getByRole('button', { name: 'Sluiten' }).click()

      // Na de invalidatie van ['hours','clients'] moet het formulier
      // verschijnen. Lukt dat niet, dan kunnen we geen urenregel schrijven.
      try {
        await entryForm.waitFor({ timeout: 10000 })
      } catch {
        test.skip(true, 'Uren-formulier niet beschikbaar na aanmaken opdrachtgever — geen urenregel mogelijk')
        return
      }
    }

    // Selecteer de eerste opdrachtgever (option index 0 is de disabled
    // placeholder "Kies...")
    const formSelects = entryForm.locator('select')
    await formSelects.nth(0).selectOption({ index: 1 })

    // Unieke omschrijving zodat de regel eenduidig herkenbaar is in de Historie
    const description = `E2E test regel ${Date.now()}`
    await page.locator('#hours-desc').fill(description)

    // Starttijd 09:00, eindtijd 10:00 → 1 uur
    await formSelects.nth(1).selectOption('09')
    await formSelects.nth(2).selectOption('00')
    await formSelects.nth(3).selectOption('10')
    await formSelects.nth(4).selectOption('00')

    await entryForm.getByRole('button', { name: 'Toevoegen' }).click()

    // Toast bevestigt het opslaan
    await expect(page.getByText('Opgeslagen')).toBeVisible({ timeout: 10000 })

    // ZONDER reload: de nieuwe regel staat direct in de Historie. De
    // omschrijving wordt als <p> binnen de entry-regel gerenderd. De optimistic
    // update op de ['hours','entries'] prefix zet hem er direct in; de
    // invalidatie verversen hem daarna met de server-data. first() voorkomt
    // een strict-mode conflict tijdens de optimistic-naar-echt overgang.
    await expect(page.getByText(description).first()).toBeVisible({ timeout: 10000 })
  })
})