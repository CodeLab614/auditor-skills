import { z } from 'zod';

export const SUPPORT_EMAIL_NOT_CONFIGURED =
  'Support email not configured (set SUPPORT_EMAIL)';

export function getSupportEmail(
  env: Record<string, string | undefined>,
): string | null {
  const raw = env.SUPPORT_EMAIL?.trim();
  if (!raw) return null;
  const result = z.email().safeParse(raw);
  return result.success ? result.data : null;
}

export function getSupportEmailConfigError(
  env: Record<string, string | undefined>,
): string | null {
  const email = getSupportEmail(env);
  if (email) return null;
  return 'SUPPORT_EMAIL is required for production builds. Configure a valid support email address. See docs/en/01-environment-variables.md.';
}

export function getPublicSupportEmail(): string | null {
  // Literal process.env.SUPPORT_EMAIL is required for Next.js build-time inlining.
  return getSupportEmail({ SUPPORT_EMAIL: process.env.SUPPORT_EMAIL });
}
