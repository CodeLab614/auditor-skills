import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

export default async function globalTeardown() {
  await rm(resolve('.e2e-outbox'), { recursive: true, force: true });
}
