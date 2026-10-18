import { spawnSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';

function assertSafeDatabaseUrl(databaseUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('E2E tests require a valid local DATABASE_URL.');
  }

  const hostIsLocal = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  const sslDisabled = parsed.searchParams.get('sslmode') === 'disable';
  const portIsE2E = parsed.port === '55432';
  const ciDatabase = process.env.CI === 'true' && parsed.port === '5432';

  if (!hostIsLocal || !sslDisabled || (!portIsE2E && !ciDatabase)) {
    throw new Error(
      'Refusing to run E2E setup: DATABASE_URL must use localhost or 127.0.0.1, sslmode=disable, and port 55432 (or the isolated CI PostgreSQL service on port 5432).',
    );
  }
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, { stdio: 'inherit', env });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
  }
}

// Start every run from an empty database so a failed run cannot leave the admin changed.
async function resetDatabase(databaseUrl: string) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`
      DO $$
      DECLARE table_name text;
      BEGIN
        FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
          EXECUTE format('TRUNCATE TABLE %I CASCADE', table_name);
        END LOOP;
      END $$;
    `);
  } finally {
    await client.end();
  }
}

export default async function globalSetup() {
  const databaseUrl = process.env.CI
    ? process.env.DATABASE_URL ??
      'postgresql://rapidauth:rapidauth@127.0.0.1:5432/rapidauth?sslmode=disable'
    : 'postgresql://rapidauth:rapidauth@127.0.0.1:55432/rapidauth?sslmode=disable';
  assertSafeDatabaseUrl(databaseUrl);

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_URL: 'http://127.0.0.1:3100',
    BETTER_AUTH_SECRET:
      'e2e-only-secret-never-use-this-value-outside-local-tests-000000000000',
    SEED_ADMIN_EMAIL: 'admin@e2e.invalid',
    SEED_ADMIN_PASSWORD: 'E2e-Admin-Password-123!',
    RAPIDAUTH_E2E: 'true',
  };

  run('bunx', ['prisma', 'db', 'push'], env);
  await resetDatabase(databaseUrl);
  run('bun', ['run', 'db:seed'], env);
  await rm(resolve('.e2e-outbox'), { recursive: true, force: true });
  await mkdir(resolve('.e2e-outbox'), { recursive: true });
}
