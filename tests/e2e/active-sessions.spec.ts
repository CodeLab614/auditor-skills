import { expect, test } from '@playwright/test';
import {
  cleanE2EData,
  createTestSession,
  enableSeededAdminTwoFactor,
  prisma,
  signInWithPasswordAndTotp,
} from './helpers';

const ADMIN_EMAIL = 'admin@e2e.invalid';

test.afterEach(async () => {
  await cleanE2EData();
  await prisma.session.deleteMany({ where: { user: { email: ADMIN_EMAIL } } });
});

test('active sessions use English text and remote revocation still works', async ({ page }) => {
  const admin = await enableSeededAdminTwoFactor();
  await signInWithPasswordAndTotp(page, admin.email, admin.password, admin.secret);
  const remoteSession = await createTestSession(admin.user.id);
  await prisma.session.update({
    where: { id: remoteSession.id },
    data: {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/120.0',
      ipAddress: '203.0.113.25',
    },
  });

  await page.goto('/dashboard/profile');
  await page.getByRole('tab', { name: 'Sessions' }).click();
  await expect(page.getByRole('heading', { name: 'Active Sessions' })).toBeVisible();
  await expect(page.getByText('Current session')).toBeVisible();
  await expect(page.getByText('Firefox on Linux')).toBeVisible();

  await page.getByRole('button', { name: 'Revoke remote session' }).click();
  await expect(page.getByRole('heading', { name: 'Revoke remote session' })).toBeVisible();
  await page.getByRole('button', { name: 'Revoke session' }).click();

  await expect.poll(async () =>
    prisma.session.count({ where: { id: remoteSession.id } }),
  ).toBe(0);
  await expect(page.getByText('Firefox on Linux')).toHaveCount(0);
});
