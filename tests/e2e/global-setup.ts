import { spawnSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { createE2EEnvironment } from './helpers/e2e-environment';

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
  const env = createE2EEnvironment(databaseUrl);

  run('bunx', ['prisma', 'db', 'push'], env);
  await resetDatabase(databaseUrl);
  run('bun', ['run', 'db:seed'], env);
  await rm(resolve('.e2e-outbox'), { recursive: true, force: true });
  await mkdir(resolve('.e2e-outbox'), { recursive: true });
}
