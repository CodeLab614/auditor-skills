'use server';

import * as z from 'zod';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { APIError } from 'better-auth/api';
import { loginSchema } from '@/validations/auth';

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

    const result = await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
      asResponse: true,
    });

    const responseData = await result.json();

    // Check if the response indicates an error
    if (!result.ok || responseData.error || responseData.code) {
      return {
        response: 'error',
        message: 'Invalid credentials',
        data: null,
      };
    }

    if (responseData.twoFactorRedirect) {
      return {
        response: 'success',
        message: 'Two-factor authentication required',
        data: { twoFactorRequired: true },
      };
    }

    // Verify we actually got a valid session/user back
    if (!responseData.user && !responseData.session) {
      return {
        response: 'error',
        message: 'Invalid credentials',
        data: null,
      };
    }

    return {
      response: 'success',
      message: 'Login successful',
      data: null,
    };
  } catch (error) {
    if (error instanceof APIError) {
      console.error('Sign in error:', error.message);
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
