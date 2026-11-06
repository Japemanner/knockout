import { test, expect } from '@playwright/test'

// Regression test for the Next.js client router cache (feature 029).
//
// Next.js 15 defaults experimental.staleTimes.dynamic to 0, which forces a
// fresh RSC payload on every client-side navigation. The app sets it to 30
// seconds, so a page visited twice within 30 seconds should not produce a new
// /crud request on the second visit.
//
// The test is login-gated, following the existing suite convention: without a
// session the middleware redirects to /login and the test skips.
test.describe('page load performance', () => {
  test('page switch within 30 seconds reuses the router cache', async ({ page }) => {
    await page.goto('/boards')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist')
      return
    }

    await expect(page.getByRole('heading', { name: 'Borden' })).toBeVisible({ timeout: 20000 })

    const crudRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/crud')) crudRequests.push(request.url())
    })

    const sidebar = page.locator('aside')
    const crudLink = sidebar.getByRole('link', { name: 'CRUD', exact: true })
    const boardsLink = sidebar.getByRole('link', { name: 'Borden', exact: true })

    // First visit: prefetch and/or navigation may produce requests.
    await crudLink.click()
    await expect(page.getByRole('heading', { name: 'CRUD' })).toBeVisible({ timeout: 20000 })

    // Back to the start page, then forward again within the 30-second window.
    await boardsLink.click()
    await expect(page.getByRole('heading', { name: 'Borden' })).toBeVisible({ timeout: 20000 })

    const requestsBeforeSecondVisit = crudRequests.length
    await crudLink.click()
    await expect(page.getByRole('heading', { name: 'CRUD' })).toBeVisible({ timeout: 20000 })

    expect(crudRequests.length - requestsBeforeSecondVisit).toBe(0)
  })
})
