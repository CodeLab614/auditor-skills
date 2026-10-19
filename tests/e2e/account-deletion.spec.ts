import { expect, test } from '@playwright/test';
import {
  cleanE2EData,
  createAdminWith2FA,
  createOAuthTestUser,
  createTestUser,
  prisma,
  signInWithPasswordAndTotp,
} from './helpers';
import { getOutboxMessage } from './helpers/outbox';
import { getStorage } from '../../lib/storage';
import { siteConfig } from '../../config/site';

const storage = getStorage();

test.beforeEach(async ({ page }) => {
  await prisma.rateLimit.deleteMany();
  await page.context().setExtraHTTPHeaders({
    'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
  });
});

test.afterEach(async () => {
  await cleanE2EData();
  await prisma.user.updateMany({ where: { email: 'admin@e2e.invalid' }, data: { status: 'active' } });
});

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto('/dashboard/profile');
  await page.getByRole('tab', { name: 'Security' }).click();
}

test('delete account requires the exact phrase and the correct password', async ({ page }) => {
  const { user, email, password } = await createTestUser();
  await signIn(page, email, password);
  await page.getByRole('button', { name: 'Delete account' }).click();

  const dialog = page.getByRole('dialog');
  const confirmButton = dialog.getByRole('button', { name: 'Delete account permanently' });
  await expect(confirmButton).toBeDisabled();
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE ');
  await expect(confirmButton).toBeDisabled();
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await expect(confirmButton).toBeDisabled();

  await dialog.getByLabel('Password').fill('incorrect-password');
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();
  await expect(dialog.getByRole('alert')).toHaveText('Incorrect password.');
  expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
});

test('successful deletion removes account data, avatar and sessions, sends notice and allows re-registration', async ({ page }) => {
  const { user, email, password } = await createTestUser();
  const avatarKey = `avatars/${user.id}-e2e-deletion.png`;
  await storage.put(avatarKey, Buffer.from('avatar bytes'), 'image/png');
  await prisma.user.update({ where: { id: user.id }, data: { image: `/uploads/${avatarKey}` } });
  await prisma.twoFactor.create({ data: { userId: user.id, secret: 'e2e-secret', backupCodes: '[]' } });
  await prisma.verification.create({ data: { identifier: `reset-password:e2e-${user.id}`, value: user.id, expiresAt: new Date(Date.now() + 60_000) } });
  await signIn(page, email, password);
  await page.getByRole('button', { name: 'Delete account' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Password').fill(password);
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await dialog.getByRole('button', { name: 'Delete account permanently' }).click();

  await expect(page).toHaveURL(/\/account-deleted$/);
  await expect(page.getByRole('heading', { name: 'Your account has been deleted' })).toBeVisible();
  expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
  expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  expect(await prisma.account.count({ where: { userId: user.id } })).toBe(0);
  expect(await prisma.twoFactor.count({ where: { userId: user.id } })).toBe(0);
  expect(await prisma.activityLog.count({ where: { userId: user.id } })).toBe(0);
  expect(await storage.get(avatarKey)).toBeNull();
  expect(await prisma.verification.count({ where: { value: user.id } })).toBe(0);
  const notice = await getOutboxMessage(email);
  expect(notice.subject).toBe('Your account has been deleted');
  expect(notice.html).toContain('UTC');
  expect(notice.html).toContain('REPLACE_WITH_CONTACT_EMAIL');
  expect(notice.html).toContain(`Your ${siteConfig.appName} account was deleted`);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.goto('/auth/login');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(/invalid|not found|incorrect/i)).toBeVisible();

  await page.goto('/auth/register');
  await page.getByPlaceholder('John Doe').fill('Re-registered User');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Create a password').fill(password);
  await page.getByPlaceholder('Confirm your password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/auth\/verify-email/);
});

test('only the last active administrator is prevented from deleting their account', async ({ page }) => {
  await prisma.user.update({ where: { email: 'admin@e2e.invalid' }, data: { status: 'inactive' } });
  const { user, email, password, secret } = await createAdminWith2FA();
  await signInWithPasswordAndTotp(page, email, password, secret);
  await page.goto('/dashboard/profile');
  await page.getByRole('tab', { name: 'Security' }).click();
  await page.getByRole('button', { name: 'Delete account' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Password').fill(password);
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await dialog.getByRole('button', { name: 'Delete account permanently' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('You are the last administrator. Add another active administrator before deleting this account.');
  expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();

  await prisma.user.create({ data: { name: 'Another admin', email: `e2e-admin-${Date.now()}@e2e.invalid`, role: 'admin', status: 'active' } });
  await dialog.getByLabel('Type DELETE to confirm').fill('');
  await dialog.getByLabel('Password').fill(password);
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await dialog.getByRole('button', { name: 'Delete account permanently' }).click();
  await expect(page).toHaveURL(/\/account-deleted$/);
  await prisma.user.update({ where: { email: 'admin@e2e.invalid' }, data: { status: 'active' } });
});

test('OAuth-only account deletion requires a session newer than ten minutes', async ({ page }) => {
  const stale = await createOAuthTestUser({ createdAt: new Date(Date.now() - 11 * 60 * 1000) });
  await page.context().addCookies([{ name: 'better-auth.session_token', value: stale.cookieValue, url: 'http://127.0.0.1:3100' }]);
  await page.goto('/dashboard/profile');
  await page.getByRole('tab', { name: 'Security' }).click();
  await page.getByRole('button', { name: 'Delete account' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Password')).toHaveCount(0);
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await dialog.getByRole('button', { name: 'Delete account permanently' }).click();
  await expect(dialog.getByRole('alert')).toContainText('session is not recent');
  expect(await prisma.user.findUnique({ where: { id: stale.user.id } })).not.toBeNull();

  await page.context().clearCookies();
  const recent = await createOAuthTestUser();
  await page.context().addCookies([{ name: 'better-auth.session_token', value: recent.cookieValue, url: 'http://127.0.0.1:3100' }]);
  await page.goto('/dashboard/profile');
  await page.getByRole('tab', { name: 'Security' }).click();
  await page.getByRole('button', { name: 'Delete account' }).click();
  const recentDialog = page.getByRole('dialog');
  await recentDialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await recentDialog.getByRole('button', { name: 'Delete account permanently' }).click();
  await expect(page).toHaveURL(/\/account-deleted$/);
});

test('delete account action rate limits incorrect password attempts', async ({ page }) => {
  const { user, email, password } = await createTestUser();
  await signIn(page, email, password);
  await page.getByRole('button', { name: 'Delete account' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await dialog.getByLabel('Password').fill('incorrect-password');
  const submit = dialog.getByRole('button', { name: 'Delete account permanently' });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await submit.click();
    await expect(dialog.getByRole('alert')).toHaveText('Incorrect password.');
  }
  await submit.click();
  await expect(dialog.getByRole('alert')).toContainText('Too many attempts');
  expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
});
