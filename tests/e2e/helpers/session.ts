import { expect, type Page } from '@playwright/test';

import { generateTotpForStoredSecret } from './totp';

export async function submitPasswordSignIn(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function signInWithPasswordAndTotp(
  page: Page,
  email: string,
  password: string,
  storedSecret: string,
) {
  await submitPasswordSignIn(page, email, password);
  await expect(page).toHaveURL(/\/auth\/two-factor$/);
  await page.locator('input[data-input-otp]').fill(generateTotpForStoredSecret(storedSecret));
  await expect(page).toHaveURL(/\/dashboard$/);
}
