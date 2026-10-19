import * as Sentry from '@sentry/nextjs';
import { getSentryRuntimeConfig } from '@/lib/sentry-config';
import {
  hasSensitiveSentryData,
  sanitizeSentryData,
} from '@/lib/sentry-privacy';

type ReportErrorContext = {
  area: string;
  [key: string]: boolean | number | string | undefined;
};

const capturedErrors = new WeakSet<object>();

export function reportError(
  error: unknown,
  { area, ...context }: ReportErrorContext,
): void {
  console.error(`${area}:`, error);

  if (!getSentryRuntimeConfig(process.env).enabled) return;
  if (hasSensitiveSentryData(context)) return;
  if (error !== null && typeof error === 'object') {
    if (capturedErrors.has(error)) return;
    capturedErrors.add(error);
  }

  Sentry.captureException(error, {
    extra: sanitizeSentryData(context),
    tags: { area },
  });
}
