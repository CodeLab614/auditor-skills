import { expect, test } from '@playwright/test';

import {
  cleanE2EData,
  createTestUser,
  submitPasswordSignIn,
} from './helpers';
import { getOutboxMessage, getOutboxMessages } from './helpers/outbox';

test.afterEach(async () => {
  await cleanE2EData();
});

test('changing a password from Profile sends one security notice', async ({ page }) => {
  const account = await createTestUser();
  await submitPasswordSignIn(page, account.email, account.password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/dashboard/profile');
  await page.getByRole('tab', { name: 'Security' }).click();
  await page.getByPlaceholder('Enter current password').fill(account.password);
  await page.getByPlaceholder('Enter new password').fill('E2e-Changed-Password-456!');
  await page.getByPlaceholder('Confirm new password').fill('E2e-Changed-Password-456!');
  await page.getByRole('button', { name: 'Update Password' }).click();
  await expect(page.getByText('Password changed successfully')).toBeVisible();

  const notices = (await getOutboxMessages(account.email))
    .filter((message) => message.subject === 'Your password was changed');
  expect(notices).toHaveLength(1);
  expect(notices[0]!.html).toContain('UTC');
});

test('resetting a password with an email link sends one security notice', async ({ page }) => {
  const account = await createTestUser();
  await page.goto('/auth/forgot-password');
  await page.getByPlaceholder('name@example.com').fill(account.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  const resetMessage = await getOutboxMessage(account.email);
  await page.goto(resetMessage.url);
  await page.getByPlaceholder('Enter new password').fill('E2e-Reset-Password-456!');
  await page.getByPlaceholder('Confirm new password').fill('E2e-Reset-Password-456!');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByRole('heading', { name: 'Password reset successful' })).toBeVisible();

  const notices = (await getOutboxMessages(account.email))
    .filter((message) => message.subject === 'Your password was reset');
  expect(notices).toHaveLength(1);
  expect(notices[0]!.html).toContain('UTC');
});
