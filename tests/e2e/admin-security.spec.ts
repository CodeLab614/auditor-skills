import { expect, test } from '@playwright/test';

import {
  cleanE2EData,
  createAdminWith2FA,
  createOAuthTestUser,
  createTestUser,
  generateTotp,
  prisma,
  signInWithPasswordAndTotp,
  submitPasswordSignIn,
} from './helpers';
import { getOutboxMessages } from './helpers/outbox';

test.beforeEach(async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 200) + 1}`,
  });
});

test.afterEach(async () => {
  await cleanE2EData();
});

test('password admin must finish 2FA setup before admin navigation and metrics are available', async ({ page }) => {
  const { user, email, password } = await createTestUser({ role: 'admin' });
  await submitPasswordSignIn(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Two-factor authentication required' })).toBeVisible();
  await expect(page.getByText('Total Users', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Activity' })).toHaveCount(0);

  await page.goto('/dashboard/users');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/dashboard/activity');
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/dashboard/profile');
  await page.getByRole('tab', { name: 'Security' }).click();
  await page.getByRole('button', { name: 'Enable' }).click();
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('img', { name: '2FA QR Code' })).toBeVisible();
  expect((await getOutboxMessages(email)).filter(
    (message) => message.subject === 'Two-factor authentication was enabled',
  )).toHaveLength(0);

  const secret = await page.locator('input[readonly]').inputValue();
  await page.getByRole('button', { name: "I've scanned the code" }).click();
  await page.locator('input[data-input-otp]').fill(generateTotp(secret));
  await expect(page.getByText('Save your backup codes', { exact: true })).toBeVisible();
  const notices = (await getOutboxMessages(email)).filter(
    (message) => message.subject === 'Two-factor authentication was enabled',
  );
  expect(notices).toHaveLength(1);
  expect(notices[0]!.html).toContain('UTC');
  expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).twoFactorEnabled).toBe(true);

  await page.getByRole('button', { name: "I've saved my backup codes" }).click();
  await page.goto('/dashboard/users');
  await expect(page).toHaveURL(/\/dashboard\/users$/);
});

test('password admin loses admin access after disabling 2FA and receives one notice', async ({ page }) => {
  const admin = await createAdminWith2FA();
  await signInWithPasswordAndTotp(page, admin.email, admin.password, admin.secret);
  await page.goto('/dashboard/users');
  await expect(page).toHaveURL(/\/dashboard\/users$/);

  await page.goto('/dashboard/profile');
  await page.getByRole('tab', { name: 'Security' }).click();
  await page.getByRole('button', { name: 'Disable' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Enter your password').fill(admin.password);
  await dialog.getByRole('button', { name: 'Disable 2FA' }).click();
  await expect(dialog).toBeHidden();

  await expect.poll(async () => (
    await getOutboxMessages(admin.email)
  ).filter(
    (message) => message.subject === 'Two-factor authentication was disabled',
  ).length).toBe(1);
  expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.user.id } })).twoFactorEnabled).toBe(false);
  await page.goto('/dashboard/users');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
});

test('OAuth-only admin can use admin pages without app 2FA', async ({ page }) => {
  const admin = await createOAuthTestUser({ role: 'admin' });
  await page.context().addCookies([{
    name: 'better-auth.session_token',
    value: admin.cookieValue,
    url: 'http://127.0.0.1:3100',
  }]);
  await page.goto('/dashboard/users');
  await expect(page).toHaveURL(/\/dashboard\/users$/);
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
});

test('regular user dashboard remains available without 2FA', async ({ page }) => {
  const account = await createTestUser({ name: 'E2E Regular User' });
  await submitPasswordSignIn(page, account.email, account.password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Welcome, E2E' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Two-factor authentication required' })).toHaveCount(0);
});

test('admin cannot change their own role but can change another admin role', async ({ page }) => {
  const currentAdmin = await createAdminWith2FA({ name: 'E2E Current Admin' });
  const otherAdmin = await createTestUser({ name: 'E2E Other Admin', role: 'admin' });
  await signInWithPasswordAndTotp(
    page,
    currentAdmin.email,
    currentAdmin.password,
    currentAdmin.secret,
  );
  await page.goto(
    `/dashboard/users?q=${encodeURIComponent(currentAdmin.email)}`,
  );

  const ownRow = page.getByRole('row').filter({ hasText: currentAdmin.email });
  await ownRow.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Change Role' })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await ownRow.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Change Role' }).click();
  await page.getByRole('menuitem', { name: 'User', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Change Role' }).click();
  await expect(page.getByText('You cannot change your own role')).toBeVisible();
  expect((await prisma.user.findUniqueOrThrow({ where: { id: currentAdmin.user.id } })).role).toBe('admin');

  await page.goto(
    `/dashboard/users?q=${encodeURIComponent(otherAdmin.email)}`,
  );
  const otherRow = page.getByRole('row').filter({ hasText: otherAdmin.email });
  await otherRow.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('menuitem', { name: 'Change Role' }).click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'User' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Update Role' }).click();
  await expect.poll(async () => (
    await prisma.user.findUniqueOrThrow({ where: { id: otherAdmin.user.id } })
  ).role).toBe('user');
});
