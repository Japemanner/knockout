import { test, expect, type Page } from '@playwright/test'

// Feature 019: de opgeslagen kolomvolgorde (drag-and-drop in de tabelkoppen)
// moet ook doorwerken in het aanmaak- en bewerkformulier.
// Tests skippen automatisch als er geen login-sessie of geen CRUD-overzicht is.

function skipIfNotLoggedIn(page: Page) {
  if (page.url().includes('/login')) {
    test.skip(true, 'Niet ingelogd — login vereist')
    return true
  }
  return false
}

/**
 * Opent het eerste CRUD-overzicht en geeft de URL terug.
 * Skipt als er geen overzichten bestaan.
 */
async function openFirstCrudOverview(page: Page): Promise<string> {
  await page.goto('/crud')
  if (skipIfNotLoggedIn(page)) return ''

  const firstLink = page.locator('a[href^="/crud/"]').first()
  const linkCount = await page.locator('a[href^="/crud/"]').count()
  if (linkCount === 0) {
    test.skip(true, 'Geen CRUD-overzichten aanwezig')
    return ''
  }

  const href = await firstLink.getAttribute('href')
  await page.goto(href!)
  await expect(page.getByRole('button', { name: /Record/ })).toBeVisible()
  return href!
}

/**
 * Leest de tabelkop-volgorde uit de thead van de GenericTable.
 * DraggableTableHeader rendert th > div > span met de kolomnaam.
 */
async function readTableHeaderOrder(page: Page): Promise<string[]> {
  const headers = page.locator('table thead th span')
  const count = await headers.count()
  const names: string[] = []
  for (let i = 0; i < count; i++) {
    const text = await headers.nth(i).textContent()
    if (text && text.trim()) names.push(text.trim())
  }
  return names
}

/**
 * Leest de veldvolgorde uit het openstaande DynamicForm in de dialog.
 * FormFieldMapper rendert label-tekst boven elk veld (kolomnaam).
 */
async function readFormFieldOrder(page: Page): Promise<string[]> {
  const dialog = page.locator('[role="dialog"]')
  await expect(dialog).toBeVisible()

  // FormFieldMapper gebruikt de kolomnaam als label
  const labels = dialog.locator('form label')
  const count = await labels.count()
  const names: string[] = []
  for (let i = 0; i < count; i++) {
    const text = await labels.nth(i).textContent()
    if (text) names.push(text.trim())
  }
  return names
}

test.describe('CRUD formulier volgt kolomvolgorde', () => {
  test('aanmaakformulier velden staan in dezelfde relatieve volgorde als tabelkolommen', async ({ page }) => {
    await openFirstCrudOverview(page)
    if (page.url().includes('/login')) return

    const headerOrder = await readTableHeaderOrder(page)

    // Open het aanmaakformulier
    await page.getByRole('button', { name: /^\+?\s*Record/ }).first().click()
    const fieldOrder = await readFormFieldOrder(page)

    // Verwacht: de tabelkolommen (die de opgeslagen volgorde tonen) verschijnen
    // in het formulier in dezelfde relatieve volgorde. Kolommen die in de tabel
    // verborgen zijn of PK/actie-kolommen mogen ontbreken, maar de volgorde van
    // de gedeelde kolommen moet identiek zijn (subsequence-check).
    const common = fieldOrder.filter((name) => headerOrder.includes(name))
    expect(common.length).toBeGreaterThan(0)

    const expectedRelative = headerOrder.filter((name) => fieldOrder.includes(name))
    expect(common).toEqual(expectedRelative)
  })

  test('bewerkformulier heeft dezelfde veldvolgorde als aanmaakformulier', async ({ page }) => {
    const href = await openFirstCrudOverview(page)
    if (page.url().includes('/login')) return

    // Bewerkformulier vergelijken met aanmaakformulier
    await page.getByRole('button', { name: /^\+?\s*Record/ }).first().click()
    const createOrder = await readFormFieldOrder(page)

    // Sluit dialog
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"]')).toBeHidden()

    // Open het eerste record voor bewerking (potlood-icoon in de tabelrijen)
    const editButton = page.locator('table tbody button').first()
    const editCount = await page.locator('table tbody button').count()
    if (editCount === 0) {
      test.skip(true, 'Geen records om te bewerken')
      return
    }
    await editButton.click()
    const editOrder = await readFormFieldOrder(page)

    // Zelfde veldset, zelfde volgorde (zelfde DynamicForm, zelfde kolommenlijst)
    expect(editOrder).toEqual(createOrder)
  })

  test('terugval: formulier heeft velden ook zonder opgeslagen volgorde', async ({ page }) => {
    await openFirstCrudOverview(page)
    if (page.url().includes('/login')) return

    await page.getByRole('button', { name: /^\+?\s*Record/ }).first().click()
    const fieldOrder = await readFormFieldOrder(page)

    // Zonder of met opgeslagen volgorde: er moeten altijd velden zijn
    expect(fieldOrder.length).toBeGreaterThan(0)
  })
})