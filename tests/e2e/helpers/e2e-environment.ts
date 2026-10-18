export function assertSafeDatabaseUrl(databaseUrl: string) {
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

export function createE2EEnvironment(databaseUrl: string): NodeJS.ProcessEnv {
  assertSafeDatabaseUrl(databaseUrl);

  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_URL: 'http://127.0.0.1:3100',
    BETTER_AUTH_SECRET:
      'e2e-only-secret-never-use-this-value-outside-local-tests-000000000000',
    SEED_ADMIN_EMAIL: 'admin@e2e.invalid',
    SEED_ADMIN_PASSWORD: 'E2e-Admin-Password-123!',
    RAPIDAUTH_E2E: 'true',
  };
}
