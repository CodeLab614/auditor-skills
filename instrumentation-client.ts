import * as Sentry from '@sentry/nextjs';
import { getSentryRuntimeConfig } from '@/lib/sentry-config';
import { initializeSentry } from '@/lib/sentry-init';

const config = getSentryRuntimeConfig({
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  NODE_ENV: process.env.NODE_ENV,
  SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
});

initializeSentry(config, Sentry.init);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
