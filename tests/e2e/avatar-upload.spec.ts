import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  createTestUser,
  enableSeededAdminTwoFactor,
  prisma,
  signInWithPasswordAndTotp,
} from './helpers';
import { getStorage } from '../../lib/storage';

const storage = getStorage();

const ADMIN_EMAIL = 'admin@e2e.invalid';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/XwAAAABJRU5ErkJggg==',
  'base64',
);
const createdUrls: string[] = [];

test.beforeEach(async ({ page }) => {
  await prisma.rateLimit.deleteMany();
  await page.context().setExtraHTTPHeaders({
    'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
  });
});

async function signInAdmin(page: import('@playwright/test').Page) {
  const admin = await enableSeededAdminTwoFactor();
  await signInWithPasswordAndTotp(page, admin.email, admin.password, admin.secret);
}

async function upload(page: import('@playwright/test').Page, buffer: Buffer, name = 'avatar.png') {
  await page.locator('#avatar-upload').setInputFiles({ name, mimeType: 'image/png', buffer });
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (admin?.image) createdUrls.push(admin.image);
}

async function uploadAndWait(page: import('@playwright/test').Page, buffer: Buffer, previous: string | null, name?: string) {
  await upload(page, buffer, name);
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  await expect.poll(() => prisma.user.findUnique({ where: { id: admin.id }, select: { image: true } }))
    .not.toMatchObject({ image: previous });
  const updated = await prisma.user.findUniqueOrThrow({ where: { id: admin.id }, select: { image: true } });
  if (updated.image) createdUrls.push(updated.image);
}

test.afterEach(async () => {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (admin?.image) createdUrls.push(admin.image);
  for (const url of createdUrls.splice(0)) {
    const key = storage.keyFromUrl(url);
    if (key) await storage.delete(key);
  }
  if (admin) await prisma.user.update({ where: { id: admin.id }, data: { image: null } });
});

test('a signed-in user can upload a valid avatar larger than 1 MB', async ({ page, request }) => {
  await signInAdmin(page);
  await page.goto('/dashboard/profile');
  await uploadAndWait(page, Buffer.concat([png, Buffer.alloc(3 * 1024 * 1024)]), null);

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  const imageUrl = admin.image;
  expect(imageUrl).toMatch(/^\/uploads\/avatars\/[a-zA-Z0-9_-]+-[a-f0-9]+\.png$/);
  const response = await request.get(imageUrl!);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/png');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect((await response.body()).byteLength).toBeGreaterThan(1024 * 1024);
});

test('replacing an avatar deletes the previous object', async ({ page, request }) => {
  await signInAdmin(page);
  await page.goto('/dashboard/profile');
  await uploadAndWait(page, png, null);
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  const previousUrl = admin.image!;
  await uploadAndWait(page, Buffer.concat([png, Buffer.from([0, 1, 2])]), previousUrl, 'second.png');
  const updated = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
  expect(updated.image).not.toBe(previousUrl);
  expect((await request.get(previousUrl)).status()).toBe(404);
});

test('a text file named PNG is rejected by checking its bytes', async ({ page }) => {
  await signInAdmin(page);
  await page.goto('/dashboard/profile');
  const before = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  await upload(page, Buffer.from('this is not an image'), 'fake.png');
  await expect(page.getByText('Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.')).toBeVisible();
  await expect.poll(() => prisma.user.findUnique({ where: { id: before.id }, select: { image: true } }))
    .toMatchObject({ image: null });
});

test('an avatar larger than 4 MB is rejected', async ({ page }) => {
  await signInAdmin(page);
  await page.goto('/dashboard/profile');
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  await upload(page, Buffer.concat([png, Buffer.alloc(4 * 1024 * 1024)]));
  await expect(page.getByText('File too large. Maximum size is 4MB.')).toBeVisible();
  await expect.poll(() => prisma.user.findUnique({ where: { id: admin.id }, select: { image: true } }))
    .toMatchObject({ image: null });
});

test('the local upload route rejects encoded traversal variants', async ({ request }) => {
  const canary = `storage-traversal-${crypto.randomUUID()}.png`;
  const canaryPath = join(process.cwd(), 'public', canary);
  await writeFile(canaryPath, png);
  try {
    for (const path of [
      '/uploads/avatars/../package.json',
      '/uploads/avatars/%2e%2e/package.json',
      '/uploads/avatars/%2E%2E%2fpackage.json',
      '/uploads/avatars/%252e%252e%252fpackage.json',
      '/uploads/avatars/%2fetc%2fpasswd',
      '/uploads/avatars/C:%5cWindows%5cwin.ini',
      `/uploads/avatars/%252e%252e/%252e%252e/%252e%252e/public/${canary}`,
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).not.toBe(200);
      expect(await response.text(), path).not.toContain('root:');
    }
  } finally {
    await unlink(canaryPath);
  }
});

test('deleting a user also deletes their avatar', async ({ page, request }) => {
  const target = await createTestUser();
  const key = `avatars/${target.user.id}-e2e-deletion.png`;
  await mkdir(join(process.cwd(), 'storage', 'uploads', 'avatars'), { recursive: true });
  await writeFile(join(process.cwd(), 'storage', 'uploads', key), png);
  await prisma.user.update({ where: { id: target.user.id }, data: { image: `/uploads/${key}` } });
  await signInAdmin(page);
  await page.goto('/dashboard/users');
  await page.getByPlaceholder('Search by name or email...').fill(target.email);
  const row = page.getByRole('row').filter({ hasText: target.email });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('menuitem', { name: 'Delete User' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('row').filter({ hasText: target.email })).toHaveCount(0);
  await expect.poll(() => storage.get(key)).toBeNull();
  expect((await request.get(`/uploads/${key}`)).status()).toBe(404);
});
