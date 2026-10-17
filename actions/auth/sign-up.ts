'use server';

import * as z from 'zod';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { APIError } from 'better-auth/api';
import { registerSchema } from '@/validations/auth';
import { checkRateLimit, getClientIp, hashKey } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';

type SignUpData = {
  email: string;
};

export const signUpAction = async (
  values: z.infer<typeof registerSchema>,
  captchaToken?: string
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: SignUpData | null;
}> => {
  try {
    const { success, data } = registerSchema.safeParse(values);

    if (!success) {
      return {
        response: 'error',
        message: 'Invalid fields',
        data: null,
      };
    }

    const { name, email, password } = data;
    const clientIp = await getClientIp();
    const normalizedEmail = email.trim().toLowerCase();
    const ipRateLimit = clientIp
      ? await checkRateLimit([
          { key: `signup:ip:${clientIp}`, window: 3600, max: 5 },
        ])
      : null;

    if (ipRateLimit?.limited) {
      return {
        response: 'error',
        message: `Too many attempts. Try again in ${ipRateLimit.retryAfter} seconds.`,
        data: null,
      };
    }

    if (!(await verifyTurnstile(captchaToken, 'signup'))) {
      return {
        response: 'error',
        message: 'Captcha verification failed. Please try again.',
        data: null,
      };
    }

    const emailRateLimit = await checkRateLimit([
      { key: `signup:email:${hashKey(normalizedEmail)}`, window: 3600, max: 3 },
    ]);

    if (emailRateLimit.limited) {
      return {
        response: 'error',
        message: `Too many attempts. Try again in ${emailRateLimit.retryAfter} seconds.`,
        data: null,
      };
    }

    await auth.api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    });

    return {
      response: 'success',
      message: 'Account created successfully. Please check your email to verify your account.',
      data: { email },
    };
  } catch (error) {
    if (error instanceof APIError) {
      console.error('Sign up error:', error.message);
      return {
        response: 'error',
        message: error.message ?? 'Registration failed',
        data: null,
      };
    }
    console.error('Sign up error:', error);
    return {
      response: 'error',
      message: 'An unexpected error occurred',
      data: null,
    };
  }
};
