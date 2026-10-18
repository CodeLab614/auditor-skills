import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createLocalStorage, getImageTypeFromBytes, getS3StorageConfigError, getStorageConfigError, resolveLocalStoragePath } from '../../lib/storage';
import { deleteStoredAvatar } from '../../lib/storage/avatar';

let root: string;
test.afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

test.describe('local file storage', () => {
  test('stores bytes outside public and returns a stable public URL', async () => {
    root = await mkdtemp(join(tmpdir(), 'rapidauth-storage-'));
    const storage = createLocalStorage(root);
    const bytes = Buffer.from('safe image bytes');
    const url = await storage.put('avatars/user-random.png', bytes, 'image/png');
    expect(url).toBe('/uploads/avatars/user-random.png');
    expect(storage.keyFromUrl(url)).toBe('avatars/user-random.png');
    expect(await storage.get('avatars/user-random.png')).toEqual(bytes);
    await storage.delete('avatars/user-random.png');
    expect(await storage.get('avatars/user-random.png')).toBeNull();
  });

  test('rejects traversal and absolute paths after URL decoding', () => {
    root = '/tmp/rapidauth-test-storage';
    for (const key of ['../secret.png', '%2e%2e/secret.png', 'a/%252e%252e/secret.png', '/etc/passwd', 'a\\..\\secret.png']) {
      expect(() => resolveLocalStoragePath(root, key)).toThrow();
    }
  });
});

test('detects image formats from bytes and rejects text disguised as PNG', () => {
  expect(getImageTypeFromBytes(Buffer.from([0xff, 0xd8, 0xff, 0x00]))?.mimeType).toBe('image/jpeg');
  expect(getImageTypeFromBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.extension).toBe('png');
  expect(getImageTypeFromBytes(Buffer.from('not a png'))).toBeNull();
  expect(getImageTypeFromBytes(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
});

test('S3 storage reports missing required configuration and invalid path-style values', () => {
  expect(getS3StorageConfigError({
    ...process.env,
    STORAGE_DRIVER: 's3',
    S3_REGION: '',
    S3_BUCKET: '',
    S3_ACCESS_KEY_ID: '',
    S3_SECRET_ACCESS_KEY: '',
    S3_PUBLIC_URL: '',
  })).toContain('S3_REGION, S3_BUCKET');
  expect(getS3StorageConfigError({
    ...process.env,
    STORAGE_DRIVER: 's3',
    S3_REGION: 'auto',
    S3_BUCKET: 'avatars',
    S3_ACCESS_KEY_ID: 'access',
    S3_SECRET_ACCESS_KEY: 'secret',
    S3_PUBLIC_URL: 'https://cdn.example.com',
    S3_FORCE_PATH_STYLE: 'sometimes',
  })).toContain('S3_FORCE_PATH_STYLE must be');
});

test('storage configuration rejects an unknown driver', () => {
  expect(getStorageConfigError({ ...process.env, STORAGE_DRIVER: 'r2' })).toContain('Invalid STORAGE_DRIVER');
  expect(getStorageConfigError({ ...process.env, STORAGE_DRIVER: 'local' })).toBeNull();
});

test('avatar cleanup only deletes files owned by the given user', async () => {
  const key = `avatars/owner-${crypto.randomUUID()}.png`;
  const filePath = join(process.cwd(), 'storage', 'uploads', key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from('owned avatar'));
  try {
    await deleteStoredAvatar(`/uploads/${key}`, 'someone-else');
    expect(existsSync(filePath)).toBe(true);
    await deleteStoredAvatar(`/uploads/${key}`, 'owner');
    expect(existsSync(filePath)).toBe(false);
  } finally {
    await rm(filePath, { force: true });
  }
});
