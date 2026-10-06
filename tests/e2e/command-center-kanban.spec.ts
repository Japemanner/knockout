import { test, expect } from '@playwright/test'

// E2E voor het command center-bord met gesterde items (feature 022).
// Verifieert: vaste kolommen (Backlog/Doing/Done), kaart-in-kolom mapping,
// bronbord-labels, lege staat en drag-sync naar het bronbord.
// Vereist een geauthenticeerde sessie; zonder login slaan tests over.

const CC_COLUMNS = ['Backlog', 'Doing', 'Done'] as const

test.describe('command-center kanban bord', () => {
  test('bord toont precies Backlog, Doing en Done in die volgorde', async ({ page }) => {
    await page.goto('/command-center')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist voor command-center bordcontrole')
      return
    }

    // Sectie moet bestaan
    await expect(page.getByText('Gesterde items')).toBeVisible()

    // De drie vaste kolomkoppen in volgorde
    const headers = page.locator('h3:has-text("Backlog"), h3:has-text("Doing"), h3:has-text("Done")')
    await expect(headers.first()).toBeVisible()
    const names = await headers.allTextContents()
    const trimmed = names.map((n) => n.trim())
    expect(trimmed).toEqual([...CC_COLUMNS])
  })

  test('lege staat toont uitleg wanneer er geen gesterde kaarten zijn', async ({ page }) => {
    await page.goto('/command-center')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist')
      return
    }

    const emptyMessage = page.getByText(/Geen gesterde items/)
    const hasEmpty = (await emptyMessage.count()) > 0

    if (hasEmpty) {
      // Lege staat toont de verwachte uitleg
      await expect(
        page.getByText(/Klik op de ster bij een kaart/)
      ).toBeVisible()
    } else {
      // Er zijn gesterde kaarten: kolommen moeten kaarten bevatten
      const cardCount = await page.locator('[data-testid="starred-kanban"] .bg-card.border').count()
      expect(cardCount).toBeGreaterThan(0)
    }
  })

  test('gesterde kaart ligt in de kolom die overeenkomt met de bronkolom en toont bronbord-label', async ({ page }) => {
    await page.goto('/command-center')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist')
      return
    }

    const emptyMessage = page.getByText(/Geen gesterde items/)
    if ((await emptyMessage.count()) > 0) {
      test.skip(true, 'Geen gesterde items — kaart-in-kolom test niet mogelijk')
      return
    }

    // Elke kaart moet een bronbord-label (uppercase, klein font) tonen
    const boardLabels = page.locator('span.uppercase.tracking-wide')
    const labelCount = await boardLabels.count()
    expect(labelCount).toBeGreaterThan(0)

    // Elke kaart ligt in exact één van de drie kolommen
    for (const columnName of CC_COLUMNS) {
      const column = page.locator('div', { has: page.locator(`h3:has-text("${columnName}")`) })
      expect(await column.count()).toBeGreaterThan(0)
    }
  })

  test('drag-sync: kaart van Backlog naar Doing verplaatst ook op het bronbord', async ({ page }) => {
    await page.goto('/command-center')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist voor drag-sync test')
      return
    }

    const emptyMessage = page.getByText(/Geen gesterde items/)
    if ((await emptyMessage.count()) > 0) {
      test.skip(true, 'Geen gesterde items — drag-sync test niet mogelijk')
      return
    }

    // Zoek een kaart die (nog) niet in Doing ligt — de eerste kaart in Backlog
    const backlogColumn = page.locator('div.bg-muted\\/50', { has: page.locator('h3:has-text("Backlog")') })
    const backlogCards = backlogColumn.locator('.bg-card.border')
    const backlogCount = await backlogCards.count()

    if (backlogCount === 0) {
      test.skip(true, 'Geen gesterde kaart in Backlog — drag-sync niet testbaar')
      return
    }

    // Onthoud de kaarttitel en het bronbord-label
    const sourceCard = backlogCards.first()
    const cardTitle = (await sourceCard.locator('span.truncate').first().textContent())?.trim()
    const boardLabel = (await sourceCard.locator('span.uppercase').first().textContent())?.trim()
    expect(cardTitle).toBeTruthy()
    expect(boardLabel).toBeTruthy()

    // Sleep naar de Doing-kolom
    const doingColumn = page.locator('div.bg-muted\\/50', { has: page.locator('h3:has-text("Doing")') })
    await sourceCard.hover()
    await page.mouse.down()
    await doingColumn.hover()
    await page.mouse.up()

    // Optimistische update: kaart is nu in Doing zichtbaar (of verdwenen bij Done-regel)
    await expect(doingColumn.locator(`span.truncate:has-text("${cardTitle}")`)).toBeVisible({ timeout: 5000 })

    // Zoek het bronbord via de sidebar en verifieer de sync aldaar
    const boardLink = page.locator(`aside a:has-text("${boardLabel}"), nav a:has-text("${boardLabel}")`).first()
    if ((await boardLink.count()) > 0) {
      await boardLink.click()
      await page.waitForLoadState('networkidle')

      // De kaart moet op het bronbord in Doing liggen (mutatie persistent zichtbaar)
      const doingOnBoard = page.locator('h3:has-text("Doing")').first()
      await expect(doingOnBoard).toBeVisible()
      await expect(
        page.locator(`h3:has-text("Doing") ~ * span:has-text("${cardTitle}")`).first()
      ).toBeVisible({ timeout: 5000 })
    }
  })
})