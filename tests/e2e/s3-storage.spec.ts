import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { createLocalStorage, createS3Storage } from '../../lib/storage';
import { createTestUser, prisma } from './helpers';

const s3 = createS3Storage(process.env);
const local = createLocalStorage();
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/XwAAAABJRU5ErkJggg==', 'base64');

function migrate(driver: 'local' | 's3', apply = true) {
  const env = { ...process.env, STORAGE_DRIVER: driver };
  const args = ['run', 'scripts/migrate-storage.ts'];
  if (apply) args.push('--apply');
  const result = spawnSync('bun', args, {
    cwd: process.cwd(), env, encoding: 'utf8',
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
}

test('S3 storage can put, read through its public URL, and delete', async () => {
  const key = `avatars/s3-e2e-${crypto.randomUUID()}.png`;
  const url = await s3.put(key, png, 'image/png');
  try {
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(png);
  } finally {
    await s3.delete(key);
  }
  expect(await s3.get(key)).toBeNull();
});

test('storage:migrate moves a local avatar to S3 and back without losing bytes', async () => {
  const user = await createTestUser();
  const sourceKey = `avatars/${user.user.id}-migration.png`;
  await local.put(sourceKey, png, 'image/png');
  const sourceUrl = `/uploads/${sourceKey}`;
  await prisma.user.update({ where: { id: user.user.id }, data: { image: sourceUrl } });

  const dryRun = spawnSync('bun', ['run', 'scripts/migrate-storage.ts'], {
    cwd: process.cwd(), env: { ...process.env, STORAGE_DRIVER: 's3' }, encoding: 'utf8',
  });
  expect(dryRun.status, dryRun.stdout + dryRun.stderr).toBe(0);
  expect(dryRun.stdout).toContain('SIMULATION');
  expect((await prisma.user.findUniqueOrThrow({ where: { id: user.user.id }, select: { image: true } })).image).toBe(sourceUrl);
  expect(await local.get(sourceKey)).toEqual(png);

  migrate('s3');
  const onS3 = await prisma.user.findUniqueOrThrow({ where: { id: user.user.id }, select: { image: true } });
  expect(onS3.image).toContain(process.env.S3_PUBLIC_URL);
  const s3Key = s3.keyFromUrl(onS3.image!);
  expect(s3Key).toBeTruthy();
  expect(await s3.get(s3Key!)).toEqual(png);
  expect(await local.get(sourceKey)).toBeNull();

  migrate('local');
  const backLocal = await prisma.user.findUniqueOrThrow({ where: { id: user.user.id }, select: { image: true } });
  expect(backLocal.image).toMatch(/^\/uploads\/avatars\//);
  const localKey = local.keyFromUrl(backLocal.image!)!;
  expect(await local.get(localKey)).toEqual(png);
  expect(await s3.get(s3Key!)).toBeNull();
  await local.delete(localKey);
});

test.afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e-' } } });
});
