import { getClientIp } from '@/lib/rate-limit';

const secretKey = process.env.TURNSTILE_SECRET_KEY;
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const isEnabled = Boolean(secretKey && siteKey);

const testSiteKeys = new Set([
  '1x00000000000000000000AA',
  '2x00000000000000000000AB',
  '1x00000000000000000000BB',
  '2x00000000000000000000BB',
  '3x00000000000000000000FF',
]);
const testSecretKeys = new Set([
  '1x0000000000000000000000000000000AA',
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
]);
const isTestKey = Boolean(
  (siteKey && testSiteKeys.has(siteKey)) ||
    (secretKey && testSecretKeys.has(secretKey))
);

if (Boolean(secretKey) !== Boolean(siteKey)) {
  throw new Error(
    'TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY must both be set to enable Turnstile.'
  );
}

if (process.env.NODE_ENV === 'production' && isTestKey) {
  throw new Error('Cloudflare Turnstile test keys cannot be used in production.');
}

if (process.env.NODE_ENV === 'production' && !isEnabled) {
  console.warn(
    'Cloudflare Turnstile is disabled in production because its keys are not configured.'
  );
}

type SiteverifyResponse = {
  success?: unknown;
  action?: unknown;
};

export async function verifyTurnstile(
  token: string | undefined,
  expectedAction: string
): Promise<boolean> {
  if (!isEnabled) return true;
  if (typeof token !== 'string' || !token || token.length > 2048 || !secretKey) {
    return false;
  }

  try {
    const remoteIp = await getClientIp();
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
          ...(remoteIp ? { remoteip: remoteIp } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!response.ok) return false;

    const result = (await response.json()) as SiteverifyResponse;
    const actionMatches = isTestKey || result.action === expectedAction;

    return result.success === true && actionMatches;
  } catch {
    return false;
  }
}
