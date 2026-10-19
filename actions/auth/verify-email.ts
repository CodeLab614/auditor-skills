'use server';

import * as z from 'zod';
import { headers } from 'next/headers';
import { APIError } from 'better-auth/api';
import { auth } from '@/lib/auth';
import { checkRateLimit, getClientIp, hashKey } from '@/lib/rate-limit';
import { reportError } from '@/lib/report-error';

const verifyEmailTokenSchema = z.string().min(1).max(4096);

type VerifyEmailData = {
  signedIn: boolean;
};

export const verifyEmailAction = async (
  token: string
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: VerifyEmailData | null;
}> => {
  try {
    const parsedToken = verifyEmailTokenSchema.safeParse(token);

    if (!parsedToken.success) {
      return {
        response: 'error',
        message: 'Invalid verification link',
        data: null,
      };
    }

    const clientIp = await getClientIp();
    const rateLimit = await checkRateLimit([
      ...(clientIp
        ? [{ key: `verify-email-confirm:ip:${clientIp}`, window: 600, max: 10 }]
        : []),
      {
        key: `verify-email-confirm:token:${hashKey(parsedToken.data)}`,
        window: 600,
        max: 5,
      },
    ]);

    if (rateLimit.limited) {
      return {
        response: 'error',
        message: `Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`,
        data: null,
      };
    }

    const result = await auth.api.verifyEmail({
      query: { token: parsedToken.data },
      headers: await headers(),
      returnHeaders: true,
    });
    const sessionCookieName = (await auth.$context).authCookies.sessionToken.name;
    const signedIn = result.headers.getSetCookie().some((cookie) =>
      cookie.startsWith(`${sessionCookieName}=`)
    );

    return {
      response: 'success',
      message: signedIn ? 'Email verified' : 'Email already verified',
      data: { signedIn },
    };
  } catch (error) {
    if (error instanceof APIError) {
      console.error('Verify email error:', error.message);
      return {
        response: 'error',
        message: error.message ?? 'Failed to verify email',
        data: null,
      };
    }
    reportError(error, { area: 'auth.verify-email' });
    return {
      response: 'error',
      message: 'An unexpected error occurred',
      data: null,
    };
  }
};
