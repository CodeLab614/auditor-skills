import { createHmac } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import {
  cleanE2EData,
  createTestUser,
  E2E_PASSWORD,
  prisma,
} from './helpers';

function decodeBase32(secret: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';

  for (const character of secret.toUpperCase().replace(/=+$/, '')) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error('Invalid base32 TOTP secret');
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotp(secret: string, timestamp = Date.now()) {
  const counter = BigInt(Math.floor(timestamp / 30_000));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = createHmac('sha1', decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, '0');
}

function generateInvalidTotp(secret: string) {
  const now = Date.now();
  const acceptedCodes = new Set(
    [-30_000, 0, 30_000].map((offset) => generateTotp(secret, now + offset)),
  );

  for (let candidate = 0; candidate < 1_000_000; candidate += 1) {
    const code = String(candidate).padStart(6, '0');
    if (!acceptedCodes.has(code)) return code;
  }

  throw new Error('Could not generate an invalid TOTP code');
}

async function signIn(page: Page, email: string) {
  await page.goto('/auth/login');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/auth\/two-factor$/);
}

async function logOut(page: Page) {
  await page.getByRole('button', { name: /E2E Test User/ }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
}

test.afterEach(async () => {
  await cleanE2EData();
});

test('enables TOTP, rejects invalid codes, and consumes each backup code once', async ({ page }) => {
  expect(generateTotp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59_000)).toBe('287082');
  const { user, email } = await createTestUser();

  await page.goto('/auth/login');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/dashboard/profile');
  await page.getByRole('tab', { name: 'Security' }).click();
  await page.getByRole('button', { name: 'Enable' }).click();
  await page.getByPlaceholder('Enter your password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('img', { name: '2FA QR Code' })).toBeVisible();
  const secret = await page.locator('input[readonly]').inputValue();
  expect(secret).toMatch(/^[A-Z2-7]+=*$/i);
  await page.getByRole('button', { name: "I've scanned the code" }).click();
  const setupCodeInput = page.locator('input[data-input-otp]');
  await expect(setupCodeInput).toBeVisible();
  await setupCodeInput.fill(generateTotp(secret));

  await expect(page.getByText('Save your backup codes', { exact: true })).toBeVisible();
  const backupCodes = page.getByText(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/i);
  await expect(backupCodes).toHaveCount(10);
  const backupCode = (await backupCodes.first().innerText()).trim();
  await page.getByRole('button', { name: "I've saved my backup codes" }).click();
  await expect(page.getByText('Your account is protected with 2FA.')).toBeVisible();
  expect(await prisma.twoFactor.count({ where: { userId: user.id } })).toBe(1);

  await logOut(page);
  await signIn(page, email);
  const signInCodeInput = page.locator('input[data-input-otp]');
  await expect(signInCodeInput).toBeVisible();
  await signInCodeInput.fill(generateInvalidTotp(secret));
  await expect(page.getByText(/invalid|incorrect/i).last()).toBeVisible();
  await expect(page).not.toHaveURL(/\/dashboard/);

  await signInCodeInput.fill(generateTotp(secret));
  await expect(page).toHaveURL(/\/dashboard$/);

  await logOut(page);
  await signIn(page, email);
  await page.getByRole('link', { name: 'Use a backup code instead' }).click();
  await page.getByPlaceholder('XXXX-XXXX-XXXX').fill(backupCode);
  await page.getByRole('button', { name: 'Verify backup code' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await logOut(page);
  await signIn(page, email);
  await page.getByRole('link', { name: 'Use a backup code instead' }).click();
  await page.getByPlaceholder('XXXX-XXXX-XXXX').fill(backupCode);
  await page.getByRole('button', { name: 'Verify backup code' }).click();
  await expect(page.getByText(/invalid|incorrect|used/i).last()).toBeVisible();
  await expect(page).not.toHaveURL(/\/dashboard/);
});
