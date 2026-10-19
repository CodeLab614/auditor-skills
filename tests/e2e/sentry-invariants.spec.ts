import { expect, test } from '@playwright/test';
import {
  createSentryEnvValues,
  getSentryBuildConfig,
  getSentryEnvironment,
  getSentryRuntimeConfig,
} from '../../lib/sentry-config';
import { initializeSentry } from '../../lib/sentry-init';
import {
  hasSensitiveSentryData,
  sanitizeSentryData,
} from '../../lib/sentry-privacy';

test('Sentry privacy filtering removes nested secrets but keeps error diagnostics', () => {
  const event = sanitizeSentryData({
    message: 'Database request failed',
    exception: {
      values: [{
        value: 'Database request failed',
        stacktrace: { frames: [{ filename: 'actions/users.ts', function: 'addUserAction' }] },
      }],
    },
    extra: {
      password: 'visible-password',
      nested: {
        totpCode: '123456',
        invitationToken: 'invite-token',
        cookies: { session: 'session-cookie' },
        backupCodes: ['backup-code'],
      },
      url: 'https://example.test/reset?token=secret-token&state=secret-state&safe=kept',
    },
    request: {
      body: { password: 'request-password' },
      data: 'request-body',
      headers: { authorization: 'Bearer secret', accept: 'application/json' },
    },
    user: { id: 'user-id', email: 'person@example.com', name: 'Private Name' },
  });

  expect(event.message).toBe('Database request failed');
  expect(event.exception.values[0].value).toBe('Database request failed');
  expect(event.exception.values[0].stacktrace.frames[0].filename).toBe('actions/users.ts');
  expect(event.extra.password).toBe('[Filtered]');
  expect(event.extra.nested.totpCode).toBe('[Filtered]');
  expect(event.extra.nested.invitationToken).toBe('[Filtered]');
  expect(event.extra.nested.cookies).toBe('[Filtered]');
  expect(event.extra.nested.backupCodes).toBe('[Filtered]');
  expect(event.extra.url).toContain('safe=kept');
  expect(event.extra.url).not.toContain('secret-token');
  expect(event.extra.url).not.toContain('secret-state');
  expect(event.request.body).toBe('[Filtered]');
  expect(event.request.data).toBe('[Filtered]');
  expect(event.request.headers.authorization).toBe('[Filtered]');
  expect(event.user).toEqual({ id: 'user-id' });
  expect(hasSensitiveSentryData({ area: 'auth.sign-in' })).toBe(false);
  expect(hasSensitiveSentryData({ email: 'person@example.com' })).toBe(true);
  expect(hasSensitiveSentryData({ context: 'person@example.com' })).toBe(true);
});

test('Sentry configuration only enables valid DSNs and complete source map credentials', () => {
  expect(getSentryRuntimeConfig({})).toMatchObject({
    enabled: false,
    invalidDsn: false,
    tracesSampleRate: 0,
  });
  expect(getSentryRuntimeConfig({ NEXT_PUBLIC_SENTRY_DSN: 'not-a-dsn' })).toMatchObject({
    enabled: false,
    invalidDsn: true,
  });
  expect(getSentryRuntimeConfig({
    NEXT_PUBLIC_SENTRY_DSN: 'http://public@127.0.0.1:3102/1',
  })).toMatchObject({ enabled: true, invalidDsn: false });

  expect(getSentryBuildConfig({
    SENTRY_ORG: 'organization',
    SENTRY_PROJECT: 'project',
  }).enabled).toBe(false);
  expect(getSentryBuildConfig({
    SENTRY_AUTH_TOKEN: 'build-token',
    SENTRY_ORG: 'organization',
    SENTRY_PROJECT: 'project',
  }).enabled).toBe(true);

  expect(createSentryEnvValues({ dsn: '  http://public@127.0.0.1:3102/1  ' }))
    .toMatchObject({
      NEXT_PUBLIC_SENTRY_DSN: 'http://public@127.0.0.1:3102/1',
      SENTRY_AUTH_TOKEN: '',
      SENTRY_TRACES_SAMPLE_RATE: '',
    });

  let initializationCount = 0;
  expect(initializeSentry(getSentryRuntimeConfig({}), () => {
    initializationCount += 1;
  })).toBe(false);
  expect(initializationCount).toBe(0);

  expect(initializeSentry(getSentryRuntimeConfig({
    NEXT_PUBLIC_SENTRY_DSN: 'http://public@127.0.0.1:3102/1',
  }), () => {
    initializationCount += 1;
  })).toBe(true);
  expect(initializationCount).toBe(1);
});

test('Sentry environment uses NODE_ENV by default and the real Vercel environment when available', () => {
  expect(getSentryEnvironment({ NODE_ENV: 'production' })).toBe('production');
  expect(getSentryEnvironment({
    NODE_ENV: 'production',
    VERCEL_ENV: 'preview',
  })).toBe('preview');
});

test('Sentry runtime configuration accepts the calculated public environment', () => {
  expect(getSentryRuntimeConfig({
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'preview',
    NODE_ENV: 'development',
  }).environment).toBe('preview');
});
