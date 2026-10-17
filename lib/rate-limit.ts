import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

// Direct auth.api calls bypass Better Auth's HTTP router rate limiter.

export async function getClientIp(): Promise<string | null> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();

  return forwardedFor || requestHeaders.get('x-real-ip')?.trim() || null;
}

export async function checkRateLimit(
  rules: { key: string; window: number; max: number }[]
): Promise<{ limited: boolean; retryAfter: number }> {
  let limited = false;
  let retryAfter = 0;

  for (const rule of rules) {
    const nowMs = BigInt(Date.now());
    const windowMs = BigInt(rule.window * 1000);
    const rows = await prisma.$queryRaw<
      { count: number; lastRequest: bigint }[]
    >`INSERT INTO "rateLimit" (id, key, count, "lastRequest")
      VALUES (gen_random_uuid()::text, 'action:' || ${rule.key}::text, 1, ${nowMs}::bigint)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN "rateLimit"."lastRequest" <= ${nowMs}::bigint - ${windowMs}::bigint THEN 1
          ELSE "rateLimit".count + 1
        END,
        "lastRequest" = CASE
          WHEN "rateLimit"."lastRequest" <= ${nowMs}::bigint - ${windowMs}::bigint THEN ${nowMs}::bigint
          ELSE "rateLimit"."lastRequest"
        END
      RETURNING count, "lastRequest"`;
    const row = rows[0];

    if (row && row.count > rule.max) {
      limited = true;
      const remainingMs = Number(row.lastRequest) + Number(windowMs) - Date.now();
      retryAfter = Math.max(retryAfter, Math.ceil(remainingMs / 1000), 0);
    }
  }

  return { limited, retryAfter };
}

export function hashKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
