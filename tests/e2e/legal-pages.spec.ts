import { expect, test } from '@playwright/test';

test('legal pages show their titles and update date, link to each other, and have no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Terms of Service', exact: true })).toBeVisible();
  await expect(page.getByText('Last updated: 2026-10-18', { exact: true })).toBeVisible();
  const termsSupportLinks = page.locator('a[href="mailto:support@e2e.invalid"]');
  await expect(termsSupportLinks.first()).toBeVisible();
  await expect(termsSupportLinks.first()).toHaveText('support@e2e.invalid');
  expect(await page.content()).not.toContain('REPLACE_WITH_CONTACT_EMAIL');

  await page.getByRole('link', { name: 'Privacy Policy' }).last().click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { name: 'Privacy Policy', exact: true })).toBeVisible();
  await expect(page.getByText('Last updated: 2026-10-18', { exact: true })).toBeVisible();
  await expect(page.getByText('Google sign-in', { exact: false })).toHaveCount(1);
  const privacySupportLinks = page.locator('a[href="mailto:support@e2e.invalid"]');
  await expect(privacySupportLinks.first()).toBeVisible();
  await expect(privacySupportLinks.first()).toHaveText('support@e2e.invalid');
  expect(await page.content()).not.toContain('REPLACE_WITH_CONTACT_EMAIL');

  await page.getByRole('link', { name: 'Support' }).last().click();
  await expect(page).toHaveURL(/\/support$/);

  await page.getByRole('link', { name: 'Terms of Service' }).last().click();
  await expect(page).toHaveURL(/\/terms$/);

  await page.getByRole('link', { name: 'Support' }).last().click();
  await expect(page).toHaveURL(/\/support$/);

  expect(errors).toEqual([]);
});

test('registration legal links open in new tabs and keep entered values', async ({ page }) => {
  await page.goto('/auth/register');
  await page.getByPlaceholder('John Doe').fill('Legal Link Test');
  await page.getByPlaceholder('name@example.com').fill('legal-link@example.test');
  await page.getByPlaceholder('Create a password').fill('Valid-E2e-Password-123!');

  for (const [label, route] of [
    ['Terms of Service', '/terms'],
    ['Privacy Policy', '/privacy'],
  ] as const) {
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('link', { name: label }).click(),
    ]);
    await expect(popup).toHaveURL(new RegExp(`${route}$`));
    await popup.close();
    await expect(page.getByPlaceholder('John Doe')).toHaveValue('Legal Link Test');
    await expect(page.getByPlaceholder('name@example.com')).toHaveValue('legal-link@example.test');
    await expect(page.getByPlaceholder('Create a password')).toHaveValue('Valid-E2e-Password-123!');
  }
});

test('landing and auth footers link to both legal pages', async ({ page }) => {
  await page.goto('/');
  const landingFooter = page.getByRole('contentinfo');
  await landingFooter.getByRole('link', { name: 'Terms' }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await page.goto('/');
  await landingFooter.getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveURL(/\/privacy$/);

  await page.goto('/auth/login');
  const authFooter = page.getByRole('contentinfo');
  await authFooter.getByRole('link', { name: 'Terms' }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await page.goto('/auth/login');
  await authFooter.getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveURL(/\/privacy$/);
});
