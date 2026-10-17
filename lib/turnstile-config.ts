const TEST_SITE_KEYS = new Set([
  '1x00000000000000000000AA',
  '2x00000000000000000000AB',
  '1x00000000000000000000BB',
  '2x00000000000000000000BB',
  '3x00000000000000000000FF',
]);

const TEST_SECRET_KEYS = new Set([
  '1x0000000000000000000000000000000AA',
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
]);

export function isTurnstileTestSiteKey(value: string | undefined): boolean {
  return Boolean(value && TEST_SITE_KEYS.has(value));
}

export function isTurnstileTestSecretKey(value: string | undefined): boolean {
  return Boolean(value && TEST_SECRET_KEYS.has(value));
}

export function getTurnstileConfigError(
  env: Record<string, string | undefined>,
): string | null {
  const { NEXT_PUBLIC_TURNSTILE_SITE_KEY: siteKey, TURNSTILE_SECRET_KEY: secretKey } = env;
  const guide = 'docs/en/02-turnstile.md and docs/es/02-turnstile.md';

  if (!siteKey || !secretKey) {
    return `Cloudflare Turnstile is required for production builds. Set both NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY. See ${guide}.`;
  }

  if (isTurnstileTestSiteKey(siteKey) || isTurnstileTestSecretKey(secretKey)) {
    return `Cloudflare Turnstile test keys cannot be used in production builds. Set real NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY values. See ${guide}.`;
  }

  return null;
}
