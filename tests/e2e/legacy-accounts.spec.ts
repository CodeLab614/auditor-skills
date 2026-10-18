import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { hashPassword } from 'better-auth/crypto';
import {
  cleanE2EData,
  createE2EEnvironment,
  E2E_PASSWORD,
  prisma,
} from './helpers';

test.afterEach(async () => {
  await cleanE2EData();
});

test('db:seed normalizes legacy credential accounts so Better Auth 1.7 can sign them in', async ({ page }) => {
  const email = `e2e-legacy-${Date.now()}@e2e.invalid`;
  const password = E2E_PASSWORD;
  const user = await prisma.user.create({
    data: {
      name: 'Legacy Credential User',
      email,
      emailVerified: true,
      role: 'user',
      status: 'active',
    },
  });
  await prisma.account.create({
    data: {
      accountId: email,
      providerId: 'credential',
      password: await hashPassword(password),
      userId: user.id,
    },
  });

  await page.goto('/auth/login');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(/invalid|incorrect/i)).toBeVisible();
  await expect(page).not.toHaveURL(/\/dashboard/);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('E2E tests require DATABASE_URL before running db:seed.');
  }
  const result = spawnSync('bun', ['run', 'db:seed'], {
    encoding: 'utf8',
    env: createE2EEnvironment(databaseUrl),
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toMatch(/Normalized 1 legacy credential account/i);

  const account = await prisma.account.findFirstOrThrow({
    where: { userId: user.id, providerId: 'credential' },
  });
  expect(account.accountId).toBe(user.id);

  await page.goto('/auth/login');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
