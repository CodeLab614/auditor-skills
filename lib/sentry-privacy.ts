import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs';

const FILTERED = '[Filtered]';
const SENSITIVE_KEY = /(?:password|passwd|passcode|token|secret|code|otp|totp|backup|authorization|cookie|session|credential|api[-_]?key|access[-_]?key|refresh[-_]?key)/i;
const SENSITIVE_QUERY_PARAMETER = /([?&](?:token|code|state|password|secret|otp|totp|key)=)[^&#\s]*/gi;
const SENSITIVE_QUERY_PARAMETER_PRESENT = /[?&](?:token|code|state|password|secret|otp|totp|key)=[^&#\s]*/i;
const EMAIL_ADDRESS = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function sanitizeString(value: string): string {
  return value
    .replace(SENSITIVE_QUERY_PARAMETER, `$1${FILTERED}`)
    .replace(EMAIL_ADDRESS, FILTERED);
}

function containsSensitiveData(value: unknown, seen: WeakSet<object>): boolean {
  if (typeof value === 'string') {
    EMAIL_ADDRESS.lastIndex = 0;
    return EMAIL_ADDRESS.test(value) || SENSITIVE_QUERY_PARAMETER_PRESENT.test(value);
  }
  if (value === null || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.some((item) => containsSensitiveData(item, seen));
  }

  return Object.entries(value).some(([key, child]) => (
    SENSITIVE_KEY.test(key) || containsSensitiveData(child, seen)
  ));
}

function sanitizeObject(
  value: unknown,
  seen: WeakSet<object>,
  parentKey?: string,
): unknown {
  if (typeof value === 'string') return sanitizeString(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return FILTERED;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item, seen, parentKey));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) {
      sanitized[key] = FILTERED;
      continue;
    }
    if (parentKey === 'request' && /^(?:body|data)$/i.test(key)) {
      sanitized[key] = FILTERED;
      continue;
    }
    if (key === 'user') {
      const user = child && typeof child === 'object'
        ? child as Record<string, unknown>
        : undefined;
      sanitized.user = user?.id === undefined
        ? {}
        : { id: sanitizeObject(user.id, seen, 'user') };
      continue;
    }
    sanitized[key] = sanitizeObject(child, seen, key);
  }

  return sanitized;
}

export function sanitizeSentryData<T>(value: T): T {
  return sanitizeObject(value, new WeakSet()) as T;
}

export function hasSensitiveSentryData(value: unknown): boolean {
  return containsSensitiveData(value, new WeakSet());
}

export function beforeSend(event: ErrorEvent): ErrorEvent {
  return sanitizeSentryData(event);
}

export function beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  return sanitizeSentryData(breadcrumb);
}
