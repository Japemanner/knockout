import { test, expect } from '@playwright/test'

// E2E voor de LinkedIn content-kalender (feature 023).
// Verifieert: nav-item positie, soorten & slots aanmaken, klik-op-leeg-slot,
// ideeënbak met slepen en de LinkedIn-melding bij geplande posts.
// Vereist een geauthenticeerde sessie + gedraaide migratie 022_content_calendar;
// zonder login slaan tests over (bestaand skip-patroon).

test.describe('content-kalender', () => {
  test('nav-item "Content" staat direct onder "Uren" en opent de kalender', async ({ page }) => {
    await page.goto('/content')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist voor content-kalender')
      return
    }

    // Kalender-header aanwezig (huidige maand, knoppen)
    await expect(page.getByRole('button', { name: 'Soorten & slots' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nieuwe post' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Vandaag' })).toBeVisible()

    // Nav-volgorde: Uren direct gevolgd door Content
    const navLinks = page.locator('nav a')
    const labels = (await navLinks.allTextContents()).map((l) => l.trim())
    const urenIndex = labels.indexOf('Uren')
    expect(urenIndex).toBeGreaterThanOrEqual(0)
    expect(labels[urenIndex + 1]).toBe('Content')
  })

  test('soort met weekdag-slot aanmaken toont een leeg slot in de kalender', async ({ page }) => {
    await page.goto('/content')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist voor content-kalender')
      return
    }

    const pillarName = `Testsoort ${Date.now()}`

    await page.getByRole('button', { name: 'Soorten & slots' }).click()
    await page.getByPlaceholder('Bijv. Praktijk financieel adviseurs').fill(pillarName)
    await page.getByRole('button', { name: 'Toevoegen' }).click()

    // Weekdag aanzetten voor de nieuwe soort (eerste dag-chip "Ma")
    await page.getByTitle('Ma aanzetten').last().click()

    await page.keyboard.press('Escape')

    // Leeg slot zichtbaar in de kalender: "Soortnaam · 08:00"
    await expect(page.getByText(`${pillarName} · 08:00`).first()).toBeVisible()
  })

  test('klik op leeg slot opent de editor met datum, tijd, soort en status Concept', async ({ page }) => {
    await page.goto('/content')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist voor content-kalender')
      return
    }

    // Eerste open slot-placeholder klikken (bestaande soorten vereist; aangemaakt
    // in de eerdere test of door de gebruiker)
    const slot = page.locator('button[title^="Klik om een nieuwe post te maken"]').first()
    if ((await slot.count()) === 0) {
      test.skip(true, 'Geen lege slots — maak eerst een contentsoort met weekslot aan')
      return
    }

    await slot.click()

    // Editor geopend met status Concept
    await expect(page.getByText('Post bewerken')).toBeVisible()
    const statusSelect = page.locator('select').filter({ hasText: 'Concept' })
    await expect(statusSelect).toBeVisible()

    // Sluiten zonder wijzigingen: geen bevestiging nodig (formulier is schoon)
    await page.keyboard.press('Escape')
    await expect(page.getByText('Post bewerken')).toHaveCount(0)
  })

  test('idee aanmaken en naar een dag slepen neemt datum en tijd over', async ({ page }) => {
    await page.goto('/content')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist voor content-kalender')
      return
    }

    // Quick-add: titel typen + Enter maakt een idee (FR-028)
    const ideaTitle = `Sleeptidee ${Date.now()}`
    await page.getByPlaceholder('Nieuw idee — titel typen en Enter').fill(ideaTitle)
    await page.keyboard.press('Enter')
    const idea = page.getByText(ideaTitle).first()
    await expect(idea).toBeVisible()

    // Sleep naar de eerste dagcel van het raster
    const target = page.locator('[data-date]').first()
    const targetBox = await target.boundingBox()
    const ideaBox = await idea.boundingBox()
    if (!targetBox || !ideaBox) {
      test.skip(true, 'Dagcel of idee niet meetbaar — layout niet geladen')
      return
    }

    await page.mouse.move(ideaBox.x + ideaBox.width / 2, ideaBox.y + ideaBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + Math.min(20, targetBox.height / 2), { steps: 12 })
    await page.mouse.up()

    // De post staat nu in het maandraster (zichtbare mutatie, conform AGENTS.md-regels)
    await expect(page.locator('[data-date]').getByText(ideaTitle).first()).toBeVisible()

    // Persistent na herladen: nog steeds in het raster, niet in de ideeënbak
    await page.reload()
    await expect(page.locator('[data-date]').getByText(ideaTitle).first()).toBeVisible()
  })

  test('geplande post verslepen toont de LinkedIn-melding', async ({ page }) => {
    await page.goto('/content')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist voor content-kalender')
      return
    }

    // Maak via een leeg slot een Concept-post met tekst en zet hem op Gepland
    const slot = page.locator('button[title^="Klik om een nieuwe post te maken"]').first()
    if ((await slot.count()) === 0) {
      test.skip(true, 'Geen lege slots — maak eerst een contentsoort met weekslot aan')
      return
    }
    await slot.click()

    // Unieke titel (de titel staat op de chip, de body alleen in de editor)
    await page.locator('input').first().fill('Geplande sleeppost')
    await page.getByPlaceholder('De volledige LinkedIn-tekst…').fill('Testpost voor de geplande-status — verplaatsen toont de LinkedIn-melding.')
    await page.locator('select').filter({ hasText: 'Concept' }).selectOption('gepland')
    await page.getByRole('button', { name: 'Opslaan', exact: true }).click()
    await expect(page.getByText('Opgeslagen')).toBeVisible()

    // Sluit de editor en sleep de geplande post naar een andere dag
    await page.keyboard.press('Escape')
    const draggableChip = page.getByText('Geplande sleeppost').first()
    const chipBox = await draggableChip.boundingBox()
    const dayCells = page.locator('[data-date]')
    const dayCount = await dayCells.count()
    if (!chipBox || dayCount < 2) {
      test.skip(true, 'Chip of dagcellen niet meetbaar')
      return
    }
    const targetBox = await dayCells.nth(2).boundingBox()
    if (!targetBox) {
      test.skip(true, 'Doeldagcel niet meetbaar')
      return
    }

    await page.mouse.move(chipBox.x + chipBox.width / 2, chipBox.y + chipBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 20, { steps: 12 })
    await page.mouse.up()

    await expect(page.getByText('Pas de datum ook aan in LinkedIn').first()).toBeVisible()
  })
})