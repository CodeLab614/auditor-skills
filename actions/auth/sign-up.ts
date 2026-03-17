'use server';

import * as z from 'zod';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { APIError } from 'better-auth/api';
import { registerSchema } from '@/validations/auth';

type SignUpData = {
  email: string;
};

export const signUpAction = async (
  values: z.infer<typeof registerSchema>
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
