import { expect, test } from '@playwright/test';
import { cleanE2EData, createTestUser, installTestTurnstileWidget, prisma } from './helpers';
import { getOutboxMessages } from './helpers/outbox';

test.beforeEach(async ({ page }) => {
  await installTestTurnstileWidget(page);
  await page.context().setExtraHTTPHeaders({
    'x-forwarded-for': `192.0.2.${Math.floor(Math.random() * 200) + 1}`,
  });
});

test.afterEach(async () => {
  await cleanE2EData();
});

test('rejecting Turnstile blocks registration without creating a user or email', async ({ page }) => {
  const email = `e2e-turnstile-signup-${Date.now()}@e2e.invalid`;
  await page.goto('/auth/register');
  await page.getByPlaceholder('John Doe').fill('Rejected Signup');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Create a password').fill('E2e-User-Password-123!');
  await page.getByPlaceholder('Confirm your password').fill('E2e-User-Password-123!');
  await page.getByRole('checkbox').check();
  const button = page.getByRole('button', { name: 'Create account' });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByText('Captcha verification failed. Please try again.')).toBeVisible();

  expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  expect(await getOutboxMessages(email)).toEqual([]);
});

test('rejecting Turnstile blocks password recovery without sending email', async ({ page }) => {
  const { email } = await createTestUser();
  const usersBefore = await prisma.user.count();
  await page.goto('/auth/forgot-password');
  await page.getByPlaceholder('name@example.com').fill(email);
  const button = page.getByRole('button', { name: 'Send reset link' });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByText('Captcha verification failed. Please try again.')).toBeVisible();

  expect(await prisma.user.count()).toBe(usersBefore);
  expect(await getOutboxMessages(email)).toEqual([]);
});
