import type { init } from '@sentry/nextjs';
import type { SentryRuntimeConfig } from '@/lib/sentry-config';
import { beforeBreadcrumb, beforeSend } from '@/lib/sentry-privacy';

type SentryInitializer = (options: Parameters<typeof init>[0]) => unknown;

export function initializeSentry(
  config: SentryRuntimeConfig,
  initialize: SentryInitializer,
): boolean {
  if (!config.enabled) return false;

  initialize({
    beforeBreadcrumb,
    beforeSend,
    dataCollection: {
      cookies: false,
      databaseQueryData: false,
      genAI: { inputs: false, outputs: false },
      graphQL: { document: false, variables: false },
      httpBodies: [],
      httpHeaders: false,
      queues: false,
      stackFrameVariables: false,
      urlQueryParams: false,
      userInfo: false,
    },
    dsn: config.dsn,
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
  });

  return true;
}
