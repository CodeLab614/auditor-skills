import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getStorageDriver } from './config';
import { getStorage } from './index';

// Only deletes avatars owned by userId, so a foreign or external image URL can never remove another file.
export async function deleteStoredAvatar(url: string | null | undefined, userId: string): Promise<void> {
  if (!url) return;
  const storage = getStorage();
  const key = storage.keyFromUrl(url);
  if (!key) return;
  const legacyKeys = ['jpg', 'png', 'gif', 'webp'].map((extension) => `avatars/${userId}.${extension}`);
  const isOwnAvatar = key.startsWith(`avatars/${userId}-`) || legacyKeys.includes(key.toLowerCase());
  if (!isOwnAvatar) return;
  await storage.delete(key);

  // Remove files created by older releases that lived in public/uploads/avatars.
  if (getStorageDriver() === 'local' && /^avatars\/[A-Za-z0-9_-]+\.(?:jpg|png|gif|webp)$/i.test(key)) {
    try {
      await unlink(resolve(process.cwd(), 'public', 'uploads', key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
