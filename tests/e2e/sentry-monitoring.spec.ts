import { expect, test } from '@playwright/test';
import {
  getSentryEnvelopes,
  resetSentryCollector,
} from './helpers/sentry-collector';

test('a caught server action error reaches Sentry without credentials', async ({ page }) => {
  const email = 'sentry-error@e2e.invalid';
  const password = 'E2e-Sentry-Password-123!';
  await resetSentryCollector();

  await page.goto('/auth/login');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('An unexpected error occurred')).toBeVisible();

  await expect.poll(async () => (await getSentryEnvelopes()).join('\n'))
    .toContain('auth.sign-in');
  const envelopes = (await getSentryEnvelopes()).join('\n');
  expect(envelopes).not.toContain(email);
  expect(envelopes).not.toContain(password);
});
