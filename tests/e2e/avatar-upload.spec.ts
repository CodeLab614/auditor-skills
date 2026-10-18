import { rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { prisma } from './helpers';

const ADMIN_EMAIL = 'admin@e2e.invalid';
const ADMIN_PASSWORD = 'E2e-Admin-Password-123!';

test.afterEach(async () => {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (admin) {
    await rm(join(process.cwd(), 'public', 'uploads', 'avatars', `${admin.id}.png`), { force: true });
    await prisma.user.update({ where: { id: admin.id }, data: { image: null } });
  }
});

test('a signed-in user can upload an avatar to the development server', async ({ page, request }) => {
  await page.goto('/auth/login');
  await page.getByPlaceholder('name@example.com').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('Enter your password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto('/dashboard/profile');

  await page.locator('#avatar-upload').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/XwAAAABJRU5ErkJggg==',
      'base64',
    ),
  });

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  await expect.poll(() => prisma.user.findUnique({ where: { id: admin.id }, select: { image: true } })).toMatchObject({
    image: expect.stringContaining(`/uploads/avatars/${admin.id}.png`),
  });
  const imagePath = join(process.cwd(), 'public', 'uploads', 'avatars', `${admin.id}.png`);
  await expect.poll(async () => (await request.get(`/uploads/avatars/${admin.id}.png`)).status()).toBe(200);
  await expect(stat(imagePath)).resolves.toBeTruthy();
});
