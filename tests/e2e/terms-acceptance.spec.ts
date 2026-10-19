import { expect, test } from '@playwright/test';

import { siteConfig } from '../../config/site';
import {
  cleanE2EData,
  createTestUser,
  prisma,
  submitPasswordSignIn,
} from './helpers';

test.afterEach(async () => {
  await cleanE2EData();
});

test('user without stored acceptance must accept before opening the dashboard', async ({ page }) => {
  const account = await createTestUser({ termsAccepted: false });

  await submitPasswordSignIn(page, account.email, account.password);
  await expect(page).toHaveURL(/\/auth\/accept-terms$/);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/auth\/accept-terms$/);
  const acceptButton = page.getByRole('button', { name: 'Accept and continue' });
  await expect(acceptButton).toBeDisabled();

  await acceptButton.evaluate((button) => button.removeAttribute('disabled'));
  await acceptButton.click();
  await expect(page.getByText('You must accept the terms and conditions')).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/accept-terms$/);
  expect(await prisma.user.findUniqueOrThrow({ where: { id: account.user.id } }))
    .toMatchObject({ termsAcceptedAt: null, termsVersion: null });

  await page.getByRole('checkbox').check();
  await acceptButton.click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await expect.poll(async () => prisma.user.findUnique({
    where: { id: account.user.id },
    select: { termsAcceptedAt: true, termsVersion: true },
  })).toMatchObject({
    termsAcceptedAt: expect.any(Date),
    termsVersion: siteConfig.termsVersion,
  });
  await expect.poll(() => prisma.activityLog.count({
    where: { userId: account.user.id, action: 'terms_accepted' },
  })).toBe(1);
});

test('user with an older terms version must accept the current version again', async ({ page }) => {
  const account = await createTestUser({ termsVersion: 'previous-version' });

  await submitPasswordSignIn(page, account.email, account.password);
  await expect(page).toHaveURL(/\/auth\/accept-terms$/);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Accept and continue' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await expect.poll(async () => (
    await prisma.user.findUniqueOrThrow({ where: { id: account.user.id } })
  ).termsVersion).toBe(siteConfig.termsVersion);
});
