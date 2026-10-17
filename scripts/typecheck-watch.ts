import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const validatorPath = resolve(rootDir, '.next', 'dev', 'types', 'validator.ts');
const startedAt = Date.now();
const timeoutAt = startedAt + 60_000;

const wait = (milliseconds: number) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

let validatorUpdated = false;

while (Date.now() < timeoutAt) {
  try {
    const file = await stat(validatorPath);
    if (file.mtimeMs >= startedAt) {
      validatorUpdated = true;
      await wait(1_000);
      break;
    }
  } catch {
    // Next.js has not created the validator file yet.
  }

  await wait(500);
}

if (!validatorUpdated) {
  console.warn('\x1b[33mWarning: .next/dev/types/validator.ts was not regenerated within 60 seconds; starting TypeScript anyway.\x1b[0m');
}

const child = spawn('bun', ['x', 'tsc', '--noEmit', '--watch', '--pretty', '--preserveWatchOutput'], {
  cwd: rootDir,
  stdio: 'inherit',
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));

child.on('error', (error) => {
  console.error('Failed to start the TypeScript watcher:', error);
  process.exitCode = 1;
});

child.on('close', (code) => {
  process.exitCode = code ?? 1;
});
