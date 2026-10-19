import { expect, test } from '@playwright/test';
import {
  cleanE2EData,
  createExpiredResetToken,
  createTestSession,
  createTestUser,
  createVerificationToken,
  E2E_PASSWORD,
  installTestTurnstileWidget,
  prisma,
} from './helpers';
import { getOutboxMessage } from './helpers/outbox';

test.beforeEach(async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
  });
});

test.afterEach(async () => {
  await cleanE2EData();
});

test('registration sends verification email; opening the link does not verify until confirmation', async ({ page }) => {
  const email = `e2e-register-${Date.now()}@e2e.invalid`;
  await page.goto('/auth/register');
  await page.getByPlaceholder('John Doe').fill('Registration Test');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Create a password').fill(E2E_PASSWORD);
  await page.getByPlaceholder('Confirm your password').fill(E2E_PASSWORD);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/auth\/verify-email/);

  const message = await getOutboxMessage(email);
  expect(message.subject).toBe('Verify your email address');
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  expect(user.emailVerified).toBe(false);

  await page.goto(message.url);
  await expect(page.getByRole('heading', { name: 'Confirm your email' })).toBeVisible();
  expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(false);
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(true);
  expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);

  await page.goto(message.url);
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByRole('heading', { name: 'Already verified' })).toBeVisible();
});

test('registration and password recovery submit buttons wait for a Turnstile token', async ({ page }) => {
  await installTestTurnstileWidget(page);
  await page.goto('/auth/register');
  const registerButton = page.getByRole('button', { name: 'Create account' });
  await expect(registerButton).toBeDisabled();
  await expect(registerButton).toBeEnabled();

  await page.goto('/auth/forgot-password');
  const resetButton = page.getByRole('button', { name: 'Send reset link' });
  await expect(resetButton).toBeDisabled();
  await expect(resetButton).toBeEnabled();
});

test('verification rejects expired and invalid signed tokens', async ({ page }) => {
  const { email } = await createTestUser({ emailVerified: false });
  const expired = await createVerificationToken(email, -60);
  await page.goto(`/auth/email-verified?token=${encodeURIComponent(expired)}`);
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByRole('heading', { name: 'Verification failed' })).toBeVisible();

  await page.goto('/auth/email-verified?token=not-a-valid-jwt');
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByRole('heading', { name: 'Verification failed' })).toBeVisible();
  expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(false);
});

test('password reset revokes sessions, invalidates the old password and rejects reuse and expiry', async ({ page }) => {
  const { user, email, password } = await createTestUser();
  await createTestSession(user.id);
  await page.goto('/auth/forgot-password');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  const message = await getOutboxMessage(email);
  expect(message.subject).toBe('Reset your password');

  await page.goto(message.url);
  const nextPassword = 'New-E2e-Password-456!';
  await page.getByPlaceholder('Enter new password').fill(nextPassword);
  await page.getByPlaceholder('Confirm new password').fill(nextPassword);
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByRole('heading', { name: 'Password reset successful' })).toBeVisible();
  expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);

  await page.goto('/auth/login');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(/invalid|incorrect/i)).toBeVisible();

  await page.goto(message.url);
  await page.getByPlaceholder('Enter new password').fill('Another-E2e-Password-789!');
  await page.getByPlaceholder('Confirm new password').fill('Another-E2e-Password-789!');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByText(/invalid|expired|used/i)).toBeVisible();

  const expiredToken = `expired-${crypto.randomUUID()}`;
  await createExpiredResetToken(expiredToken);
  await page.goto(`/auth/reset-password?token=${expiredToken}`);
  await page.getByPlaceholder('Enter new password').fill('Another-E2e-Password-789!');
  await page.getByPlaceholder('Confirm new password').fill('Another-E2e-Password-789!');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByText(/invalid|expired/i)).toBeVisible();

  await page.goto('/auth/login');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(nextPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test('inactive accounts cannot sign in', async ({ page }) => {
  const { email, password } = await createTestUser({ status: 'inactive' });
  await page.goto('/auth/login');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(/deactivated|inactive/i)).toBeVisible();
  await expect(page).not.toHaveURL(/\/dashboard/);
});

test('HTTP auth routes stay closed except for ok and error', async ({ request }) => {
  expect((await request.get('/api/auth/ok')).status()).toBe(200);
  expect((await request.get('/api/auth/error')).status()).not.toBe(404);
  for (const path of [
    '/api/auth/sign-up/email',
    '/api/auth/sign-in/email',
    '/api/auth/get-session',
    '/api/auth/request-password-reset',
    '/api/auth/reset-password',
    '/api/auth/verify-email',
    '/api/auth/send-verification-email',
    '/api/auth/two-factor/verify-totp',
    '/api/auth/list-sessions',
    '/api/auth/sign-out',
    '/api/auth/delete-user',
    '/api/auth/delete-user/callback',
  ]) {
    const response = path.endsWith('/get-session') || path.endsWith('/delete-user/callback')
      ? await request.get(path)
      : await request.post(path, { data: {} });
    expect(response.status(), `${path} must stay closed`).toBe(404);
  }
});
