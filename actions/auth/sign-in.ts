'use server';

import * as z from 'zod';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { APIError } from 'better-auth/api';
import { loginSchema } from '@/validations/auth';
import { checkRateLimit, getClientIp, hashKey } from '@/lib/rate-limit';

type SignInData = {
  twoFactorRequired?: boolean;
};

export const signInAction = async (
  values: z.infer<typeof loginSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: SignInData | null;
}> => {
  try {
    const { success, data } = loginSchema.safeParse(values);

    if (!success) {
      return {
        response: 'error',
        message: 'Invalid fields',
        data: null,
      };
    }

    const { email, password } = data;
    const clientIp = await getClientIp();
    const normalizedEmail = email.trim().toLowerCase();
    const rateLimit = await checkRateLimit([
      ...(clientIp ? [{ key: `signin:ip:${clientIp}`, window: 60, max: 10 }] : []),
      { key: `signin:email:${hashKey(normalizedEmail)}`, window: 60, max: 5 },
    ]);

    if (rateLimit.limited) {
      return {
        response: 'error',
        message: `Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`,
        data: null,
      };
    }

    const result = await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });

    if ('twoFactorRedirect' in result && result.twoFactorRedirect) {
      return {
        response: 'success',
        message: 'Two-factor authentication required',
        data: { twoFactorRequired: true },
      };
    }

    return {
      response: 'success',
      message: 'Login successful',
      data: null,
    };
  } catch (error) {
    if (error instanceof APIError) {
      console.error('Sign in error:', error.message, error.status);
      return {
        response: 'error',
        message: error.message ?? 'Invalid credentials',
        data: null,
      };
    }
    console.error('Sign in error:', error);
    return {
      response: 'error',
      message: 'An unexpected error occurred',
      data: null,
    };
  }
};

export const resendVerificationEmailAction = async (
  email: string
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: null;
}> => {
  try {
    const clientIp = await getClientIp();
    const normalizedEmail = email.trim().toLowerCase();
    const rateLimit = await checkRateLimit([
      ...(clientIp ? [{ key: `verify-email:ip:${clientIp}`, window: 600, max: 5 }] : []),
      { key: `verify-email:email:${hashKey(normalizedEmail)}`, window: 600, max: 3 },
    ]);

    if (rateLimit.limited) {
      return {
        response: 'error',
        message: `Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`,
        data: null,
      };
    }

    await auth.api.sendVerificationEmail({
      body: {
        email,
        callbackURL: '/auth/verify-email',
      },
      headers: await headers(),
    });

    return {
      response: 'success',
      message: 'Verification email sent',
      data: null,
    };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        response: 'error',
        message: error.message ?? 'Failed to send verification email',
        data: null,
      };
    }
    return {
      response: 'error',
      message: 'An unexpected error occurred',
      data: null,
    };
  }
};
