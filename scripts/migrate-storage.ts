#!/usr/bin/env bun
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createLocalStorage, createS3Storage, getImageTypeFromBytes, getStorage, getStorageDriver } from '../lib/storage';
import { prisma } from '../lib/prisma';

const apply = process.argv.includes('--apply');
const local = createLocalStorage();
const configuredS3PublicUrl = process.env.S3_PUBLIC_URL?.trim().replace(/\/+$/, '');
let s3: ReturnType<typeof createS3Storage> | null = null;
const driver = getStorageDriver();
const target = getStorage();
const journalPath = resolve(process.cwd(), 'storage', '.migration-state.json');

interface PendingMove {
  userId: string;
  sourceUrl: string;
  destinationKey: string;
  destinationUrl: string;
}

async function readJournal(): Promise<PendingMove[]> {
  try { return JSON.parse(await readFile(journalPath, 'utf8')) as PendingMove[]; } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeJournal(entries: PendingMove[]) {
  await mkdir(resolve(journalPath, '..'), { recursive: true });
  const temporary = `${journalPath}.tmp`;
  await writeFile(temporary, JSON.stringify(entries, null, 2));
  await rename(temporary, journalPath);
}

function urlPath(url: string): string | null {
  try { return new URL(url, 'http://rapidauth.local').pathname; } catch { return null; }
}

function localKey(url: string): string | null {
  const pathname = urlPath(url);
  if (!pathname?.startsWith('/uploads/')) return null;
  return pathname.slice('/uploads/'.length);
}

function legacyFilePath(key: string): string | null {
  if (!/^avatars\/[A-Za-z0-9_-]+\.(?:jpg|png|gif|webp)$/i.test(key)) return null;
  return resolve(process.cwd(), 'public', 'uploads', key);
}

async function readSource(url: string): Promise<{ key: string; bytes: Buffer; deleteSource: () => Promise<void> } | null> {
  const key = localKey(url);
  if (key) {
    const bytes = await local.get(key);
    if (bytes) return { key, bytes, deleteSource: () => local.delete(key) };
    const oldPath = legacyFilePath(key);
    if (oldPath) {
      try {
        return { key, bytes: await readFile(oldPath), deleteSource: async () => unlink(oldPath) };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }

  if (configuredS3PublicUrl && url.startsWith(`${configuredS3PublicUrl}/`)) {
    s3 ??= createS3Storage(process.env);
    const s3Key = s3.keyFromUrl(url);
    if (!s3Key) return null;
    const bytes = await s3.get(s3Key);
    if (bytes) return { key: s3Key, bytes, deleteSource: () => s3!.delete(s3Key) };
  }
  return null;
}

async function main() {
  const users = await prisma.user.findMany({
    where: { image: { not: null } },
    select: { id: true, image: true },
    orderBy: { id: 'asc' },
  });
  console.log(`${apply ? 'APPLY' : 'SIMULATION'}: ${users.length} user image URL(s); target storage is ${driver}.`);
  let moved = 0;
  let skipped = 0;
  let failed = 0;
  let journal = apply ? await readJournal() : [];

  for (const user of users) {
    const imageUrl = user.image!;
    const pending = journal.find((entry) => entry.userId === user.id);
    if (pending && imageUrl === pending.destinationUrl) {
      const source = await readSource(pending.sourceUrl);
      try { await source?.deleteSource(); } catch (error) {
        console.error(`Migration for ${user.id} is already in the database; source cleanup remains pending:`, error);
        failed += 1;
        continue;
      }
      journal = journal.filter((entry) => entry.userId !== user.id);
      await writeJournal(journal);
      moved += 1;
      console.log(`Resumed cleanup for user ${user.id}.`);
      continue;
    }
    const currentKey = target.keyFromUrl(imageUrl);
    if (currentKey && (await target.get(currentKey))) {
      console.log(`Already in target; skip user ${user.id}: ${imageUrl}`);
      skipped += 1;
      continue;
    }
    const sourceKey = localKey(imageUrl) ?? (configuredS3PublicUrl && imageUrl.startsWith(`${configuredS3PublicUrl}/`)
      ? imageUrl.slice(`${configuredS3PublicUrl}/`.length)
      : null);
    if (!sourceKey) {
      console.log(`No supported source for user ${user.id}; skip: ${imageUrl}`);
      skipped += 1;
      continue;
    }
    console.log(`User ${user.id}: ${imageUrl} -> ${driver} storage (new randomized avatar key)`);
    if (!apply) {
      moved += 1;
      continue;
    }

    try {
      const source = await readSource(imageUrl);
      if (!source) throw new Error('Source object or legacy file was not found.');
      const imageType = getImageTypeFromBytes(source.bytes);
      if (!imageType) throw new Error('Source does not contain a supported image signature.');
      const destinationKey = pending?.destinationKey ?? `avatars/${user.id}-${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}.${imageType.extension}`;
      const destinationUrl = pending?.destinationUrl ?? (driver === 'local'
        ? `/uploads/${destinationKey}`
        : `${process.env.S3_PUBLIC_URL!.replace(/\/+$/, '')}/${destinationKey}`);
      const currentJournal = journal.filter((entry) => entry.userId !== user.id);
      currentJournal.push({ userId: user.id, sourceUrl: imageUrl, destinationKey, destinationUrl });
      journal = currentJournal;
      await writeJournal(journal);
      const existingDestination = await target.get(destinationKey);
      if (existingDestination && !existingDestination.equals(source.bytes)) {
        throw new Error('A pending destination key contains different bytes. Source was retained.');
      }
      if (!existingDestination) await target.put(destinationKey, source.bytes, imageType.mimeType);
      const verified = await target.get(destinationKey);
      if (!verified || !verified.equals(source.bytes)) throw new Error('Copied object did not pass read-back verification.');
      await prisma.user.update({ where: { id: user.id }, data: { image: destinationUrl } });
      let sourceDeleted = true;
      try {
        await source.deleteSource();
      } catch (error) {
        console.error(`Avatar moved for user ${user.id}, but source cleanup failed; re-run migration after checking it:`, error);
        sourceDeleted = false;
      }
      if (!sourceDeleted) {
        failed += 1;
        continue;
      }
      journal = journal.filter((entry) => entry.userId !== user.id);
      await writeJournal(journal);
      moved += 1;
      console.log(`Moved user ${user.id}.`);
    } catch (error) {
      failed += 1;
      console.error(`Failed to move user ${user.id}; source retained:`, error);
    }
  }

  console.log(`Summary: moved ${moved}, skipped ${skipped}, failed ${failed}.`);
  if (failed > 0) process.exitCode = 1;
}

void main().finally(async () => prisma.$disconnect());
