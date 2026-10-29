import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// E2E voor spec 025-crud-categorie-sync: categorietabs, beheer en sync-knop.
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

async function createCategory(page: Page, name: string) {
  await page.getByTitle('Nieuwe categorie').click()
  await page.getByPlaceholder('Naam voor deze categorie...').fill(name)
  await page.getByRole('button', { name: 'Aanmaken', exact: true }).click()
  await expect(page.getByRole('link', { name, exact: true })).toBeVisible()
}

async function deleteCategory(page: Page, name: string) {
  const tab = page.getByRole('link', { name, exact: true })
  await tab.hover()
  await page.locator('div.group', { has: tab }).getByTitle('Categorie verwijderen').click()
  await page.getByRole('button', { name: 'Verwijderen', exact: true }).click()
  await expect(page.getByRole('link', { name, exact: true })).toHaveCount(0)
}

test.describe('CRUD-categorieën', () => {
  test('tabrij toont "Alle"; nieuwe categorie verschijnt als tab', async ({ page }) => {
    await page.goto('/crud')
    if (skipIfNotLoggedIn(page)) return

    await expect(page.getByRole('link', { name: 'Alle', exact: true })).toBeVisible()

    const name = uniqueName()
    await createCategory(page, name)
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

  test('hernoemen is direct zichtbaar en behouden na herladen (FR-006)', async ({ page }) => {
    await page.goto('/crud')
    if (skipIfNotLoggedIn(page)) return

    const name = uniqueName()
    const newName = `${name} hernoemd`
    await createCategory(page, name)

    const tab = page.getByRole('link', { name, exact: true })
    await tab.hover()
    await page.locator('div.group', { has: tab }).getByTitle('Hernoemen').click()
    await page.getByRole('dialog').getByRole('textbox').fill(newName)
    await page.getByRole('button', { name: 'Opslaan', exact: true }).click()
    await expect(page.getByRole('link', { name: newName, exact: true })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('link', { name: newName, exact: true })).toBeVisible()

    await deleteCategory(page, newName)
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

  test('categorie verwijderen houdt overzichten onder "Alle" (FR-008)', async ({ page }) => {
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

    // Eerste overzicht verplaatsen naar de categorie (FR-007)
    await cards.first().hover()
    await page.getByTitle('Verplaatsen naar categorie').first().click()
    await page.getByRole('dialog').getByRole('button', { name, exact: true }).click()
    await expect(page.getByText('Verplaatst')).toBeVisible()

    // Categorie verwijderen — overzicht moet onder "Alle" blijven bestaan
    await deleteCategory(page, name)
    await expect(cards.first()).toBeVisible()
  })

  test('sync-knop zichtbaar op detailpagina en geeft feedback na klik (FR-010/FR-015)', async ({ page }) => {
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