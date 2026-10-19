import { expect, test } from '@playwright/test';
import {
  cleanE2EData,
  createTestSession,
  createTestUser,
  enableSeededAdminTwoFactor,
  prisma,
  signInWithPasswordAndTotp,
} from './helpers';
import { getOutboxMessage, getOutboxMessages } from './helpers/outbox';

const ADMIN_EMAIL = 'admin@e2e.invalid';

test.beforeEach(async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 200) + 1}`,
  });
});

test.afterEach(async () => {
  await cleanE2EData();
  await prisma.session.deleteMany({ where: { user: { email: ADMIN_EMAIL } } });
});

async function signInAdmin(page: import('@playwright/test').Page) {
  const admin = await enableSeededAdminTwoFactor();
  await signInWithPasswordAndTotp(page, admin.email, admin.password, admin.secret);
}

test('admin resets another user by email and generates a working temporary password', async ({ page, browser }) => {
  const emailResetUser = await createTestUser();
  const temporaryPasswordUser = await createTestUser();
  await createTestSession(temporaryPasswordUser.user.id);
  await signInAdmin(page);
  await page.goto('/dashboard/users');

  const emailRow = page.getByRole('row').filter({ hasText: emailResetUser.email });
  await emailRow.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('menuitem', { name: 'Reset Password' }).click();
  await page.getByRole('button', { name: 'Send Email' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const emailReset = await getOutboxMessage(emailResetUser.email);
  expect(emailReset.subject).toBe('Reset your password');
  const resetPage = await browser.newPage();
  await resetPage.goto(emailReset.url);
  await resetPage.getByPlaceholder('Enter new password').fill('Admin-Email-Reset-456!');
  await resetPage.getByPlaceholder('Confirm new password').fill('Admin-Email-Reset-456!');
  await resetPage.getByRole('button', { name: 'Reset password' }).click();
  await expect(resetPage.getByRole('heading', { name: 'Password reset successful' })).toBeVisible();
  await resetPage.close();

  const manualRow = page.getByRole('row').filter({ hasText: temporaryPasswordUser.email });
  await manualRow.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('menuitem', { name: 'Reset Password' }).click();
  await page.getByRole('button', { name: /Generate Temporary Password/ }).click();
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  const passwordText = page.getByRole('dialog').locator('code');
  const temporaryPassword = (await passwordText.textContent())?.trim();
  expect(temporaryPassword?.length).toBeGreaterThanOrEqual(12);
  expect(await prisma.session.count({ where: { userId: temporaryPasswordUser.user.id } })).toBe(0);
  const manualNotices = (await getOutboxMessages(temporaryPasswordUser.email))
    .filter((message) => message.subject === 'A temporary password was created for your account');
  expect(manualNotices).toHaveLength(1);
  expect(manualNotices[0]!.html).not.toContain(temporaryPassword ?? '');

  const client = await browser.newPage();
  await client.context().setExtraHTTPHeaders({ 'x-forwarded-for': `192.0.2.${Math.floor(Math.random() * 200) + 1}` });
  await client.goto('/auth/login');
  await client.getByPlaceholder('name@example.com').fill(temporaryPasswordUser.email);
  await client.getByPlaceholder('Enter your password').fill(temporaryPassword ?? '');
  await client.getByRole('button', { name: 'Sign in' }).click();
  await expect(client).toHaveURL(/\/dashboard/);
});

test('admin cannot use manual reset on their own account', async ({ page }) => {
  await signInAdmin(page);
  await page.goto('/dashboard/users');
  const adminRow = page.getByRole('row').filter({ hasText: ADMIN_EMAIL });
  await adminRow.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('menuitem', { name: 'Reset Password' }).click();
  await page.getByRole('button', { name: /Generate Temporary Password/ }).click();
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByText(/Use the password change option in your profile/)).toBeVisible();
  expect(await prisma.account.findFirst({
    where: { user: { email: ADMIN_EMAIL }, providerId: 'credential' },
    select: { id: true },
  })).not.toBeNull();
});

test('main pages load without browser console or runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  for (const route of ['/', '/auth/login', '/auth/register', '/auth/forgot-password']) {
    await page.goto(route);
    await expect(page.locator('body')).not.toBeEmpty();
  }

  await signInAdmin(page);
  for (const route of ['/dashboard', '/dashboard/users', '/dashboard/activity', '/dashboard/profile']) {
    await page.goto(route);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page).toHaveURL(new RegExp(route.replaceAll('/', '\\/')));
  }

  expect(errors).toEqual([]);
});
