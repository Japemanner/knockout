import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// E2E voor spec 027-crud-categorie-beheer: centraal beheerpaneel op het CRUD-tabblad.
// Alle categorieacties gaan via zichtbare knoppen — geen hover.
// Test skipt automatisch als er geen login-sessie is (login vereist).

function skipIfNotLoggedIn(page: Page) {
  if (page.url().includes('/login')) {
    test.skip(true, 'Niet ingelogd — login vereist')
    return true
  }
  return false
}

function uniqueName() {
  return `Testcat ${Date.now().toString(36)}`
}

async function openManager(page: Page) {
  await page.getByRole('button', { name: 'Categorieën beheren' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Categorieën beheren' })).toBeVisible()
}

async function closeManagerIfOpen(page: Page) {
  if ((await page.getByRole('dialog').count()) > 0) {
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
}

async function createCategory(page: Page, name: string) {
  await openManager(page)
  await page.getByPlaceholder('Naam voor de nieuwe categorie...').fill(name)
  await page.getByRole('button', { name: 'Toevoegen', exact: true }).click()
  await expect(page.getByRole('link', { name, exact: true })).toBeVisible()
  await closeManagerIfOpen(page)
}

async function renameCategory(page: Page, name: string, newName: string) {
  await openManager(page)
  await page.getByRole('button', { name: `Hernoemen: ${name}` }).click()
  await page.getByRole('textbox', { name: `Nieuwe naam voor ${name}` }).fill(newName)
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click()
  await expect(page.getByRole('link', { name: newName, exact: true })).toBeVisible()
  await closeManagerIfOpen(page)
}

async function deleteCategory(page: Page, name: string) {
  await openManager(page)
  await page.getByRole('button', { name: `Verwijderen: ${name}` }).click()
  await expect(page.getByText('Categorie verwijderen?')).toBeVisible()
  await page.getByRole('button', { name: 'Verwijderen', exact: true }).click()
  await expect(page.getByRole('link', { name, exact: true })).toHaveCount(0)
  await closeManagerIfOpen(page)
}

test.describe('CRUD-categorieën', () => {
  test('paginakop toont "Categorieën beheren" naast "Nieuwe CRUD"', async ({ page }) => {
    await page.goto('/crud')
    if (skipIfNotLoggedIn(page)) return

    await expect(page.getByRole('button', { name: 'Categorieën beheren' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nieuwe CRUD' })).toBeVisible()
  })

  test('beheerpaneel toont categorieën met naam en telling; tabs zijn navigatie-only', async ({ page }) => {
    await page.goto('/crud')
    if (skipIfNotLoggedIn(page)) return

    const name = uniqueName()
    await createCategory(page, name)

    await openManager(page)
    const row = page.getByRole('dialog').locator('li', { hasText: name })
    await expect(row).toBeVisible()
    await expect(row.getByText('0 overzichten')).toBeVisible()
    await closeManagerIfOpen(page)

    // De tabrij bevat geen beheeracties meer
    await expect(page.getByTitle('Nieuwe categorie')).toHaveCount(0)
    await expect(page.getByTitle('Hernoemen')).toHaveCount(0)
    await expect(page.getByTitle('Categorie verwijderen')).toHaveCount(0)

    await deleteCategory(page, name)
  })

  test('categorietab filtert het grid; "Alle" toont alles', async ({ page }) => {
    await page.goto('/crud')
    if (skipIfNotLoggedIn(page)) return

    const name = uniqueName()
    await createCategory(page, name)

    await page.getByRole('link', { name, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`category=`))
    await expect(page.getByText('Geen CRUD overzichten in deze categorie')).toBeVisible()

    await page.getByRole('link', { name: 'Alle', exact: true }).click()
    await expect(page).not.toHaveURL(new RegExp(`category=`))
    await expect(page.getByText('Geen CRUD overzichten in deze categorie')).toHaveCount(0)

    await deleteCategory(page, name)
  })

  test('hernoemen is direct zichtbaar en behouden na herladen (FR-007)', async ({ page }) => {
    await page.goto('/crud')
    if (skipIfNotLoggedIn(page)) return

    const name = uniqueName()
    const newName = `${name} hernoemd`
    await createCategory(page, name)

    await renameCategory(page, name, newName)

    await page.reload()
    await expect(page.getByRole('link', { name: newName, exact: true })).toBeVisible()

    await deleteCategory(page, newName)
  })

  test('een lege of whitespace-naam wordt geweigerd met melding (FR-005)', async ({ page }) => {
    await page.goto('/crud')
    if (skipIfNotLoggedIn(page)) return

    await openManager(page)
    await page.getByPlaceholder('Naam voor de nieuwe categorie...').fill('   ')
    await page.getByRole('button', { name: 'Toevoegen', exact: true }).click()
    await expect(page.getByText('Vul een naam in')).toBeVisible()
    await closeManagerIfOpen(page)
  })

  test('"Nieuwe CRUD" preselecteert de actieve categorie (FR-005)', async ({ page }) => {
    await page.goto('/crud')
    if (skipIfNotLoggedIn(page)) return

    const name = uniqueName()
    await createCategory(page, name)
    await page.getByRole('link', { name, exact: true }).click()

    await page.getByRole('button', { name: 'Nieuwe CRUD' }).click()
    const categorySelect = page.getByRole('dialog').locator('select').first()
    expect(await categorySelect.inputValue()).not.toBe('')
    await page.getByRole('button', { name: 'Annuleren' }).click()

    await page.getByRole('link', { name: 'Alle', exact: true }).click()
    await deleteCategory(page, name)
  })

  test('categorie verwijderen houdt overzichten onder "Alle" (FR-009)', async ({ page }) => {
    await page.goto('/crud')
    if (skipIfNotLoggedIn(page)) return

    const cards = page.locator('div.grid a[href^="/crud/"]')
    const cardCount = await cards.count()
    if (cardCount === 0) {
      test.skip(true, 'Geen CRUD overzichten — verplaatsgedrag niet testbaar')
      return
    }

    const name = uniqueName()
    await createCategory(page, name)

    // Eerste overzicht verplaatsen naar de categorie via het bestaande kaartmenu
    await cards.first().hover()
    await page.getByTitle('Verplaatsen naar categorie').first().click()
    await page.getByRole('dialog').getByRole('button', { name, exact: true }).click()
    await expect(page.getByText('Verplaatst')).toBeVisible()

    // Het paneel telt het overzicht mee
    await openManager(page)
    await expect(page.getByRole('dialog').locator('li', { hasText: name }).getByText('1 overzicht')).toBeVisible()
    await closeManagerIfOpen(page)

    // Categorie verwijderen — overzicht moet onder "Alle" blijven bestaan
    await deleteCategory(page, name)
    await expect(cards.first()).toBeVisible()
  })

  test('sync-knop zichtbaar op detailpagina en geeft feedback na klik', async ({ page }) => {
    await page.goto('/crud')
    if (skipIfNotLoggedIn(page)) return

    const cards = page.locator('div.grid a[href^="/crud/"]')
    if ((await cards.count()) === 0) {
      test.skip(true, 'Geen CRUD overzichten — sync-knop niet testbaar')
      return
    }

    await cards.first().click()
    const syncButton = page.getByRole('button', { name: 'Synchroniseren' })
    await expect(syncButton).toBeVisible()
    await syncButton.click()
    await expect(
      page.getByText('Structuur is actueel').or(page.getByText('Structuur bijgewerkt'))
    ).toBeVisible()
  })
})

test.describe('CRUD-categorieën op mobiel (375 px)', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('beheer werkt zonder hover en beide knoppen blijven zichtbaar (FR-002)', async ({ page }) => {
    await page.goto('/crud')
    if (skipIfNotLoggedIn(page)) return

    await expect(page.getByRole('button', { name: 'Categorieën beheren' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nieuwe CRUD' })).toBeVisible()

    const name = uniqueName()
    await createCategory(page, name)

    await openManager(page)
    // Acties zijn zichtbaar zonder hover
    await expect(page.getByRole('button', { name: `Hernoemen: ${name}` })).toBeVisible()
    await expect(page.getByRole('button', { name: `Verwijderen: ${name}` })).toBeVisible()
    await closeManagerIfOpen(page)

    const newName = `${name} mobiel`
    await renameCategory(page, name, newName)
    await page.reload()
    await expect(page.getByRole('link', { name: newName, exact: true })).toBeVisible()

    await deleteCategory(page, newName)
  })
})
