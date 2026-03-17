/**
 * Authentication Server Action Template
 *
 * This template shows the REQUIRED pattern for auth-related server actions
 * using Better Auth.
 *
 * Key Rules:
 * 1. Import auth from '@/lib/auth' for Better Auth API
 * 2. Use headers() for passing request headers to auth API
 * 3. Handle APIError from 'better-auth/api' specifically
 * 4. Handle special cases like 2FA redirect
 * 5. Always return the standard response format
 */

'use server';

import * as z from 'zod';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { APIError } from 'better-auth/api';

// ============================================
// 1. VALIDATION SCHEMAS (in validations/auth.ts)
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ============================================
// 2. SIGN IN ACTION
// ============================================

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
    // Step 1: Validate input
    const { success, data } = loginSchema.safeParse(values);

    if (!success) {
      return {
        response: 'error',
        message: 'Invalid fields',
        data: null,
      };
    }

    const { email, password } = data;

    // Step 2: Call Better Auth API
    const result = await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
      asResponse: true,
    });

    // Step 3: Parse response
    const responseData = await result.json();

    // Step 4: Handle 2FA redirect
    if (responseData.twoFactorRedirect) {
      return {
        response: 'success',
        message: 'Two-factor authentication required',
        data: { twoFactorRequired: true },
      };
    }

    // Step 5: Return success
    return {
      response: 'success',
      message: 'Login successful',
      data: null,
    };
  } catch (error) {
    // Handle Better Auth API errors specifically
    if (error instanceof APIError) {
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

// ============================================
// 3. SIGN UP ACTION
// ============================================

export const signUpAction = async (
  values: z.infer<typeof registerSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: { email: string } | null;
}> => {
  try {
    const { success, data, error } = registerSchema.safeParse(values);

    if (!success) {
      const firstError = error.errors[0]?.message ?? 'Invalid fields';
      return {
        response: 'error',
        message: firstError,
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
      message: 'Account created! Please check your email to verify.',
      data: { email },
    };
  } catch (error) {
    if (error instanceof APIError) {
      // Handle common auth errors
      if (error.message?.includes('already exists')) {
        return {
          response: 'error',
          message: 'An account with this email already exists',
          data: null,
        };
      }
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

// ============================================
// 4. FORGOT PASSWORD ACTION
// ============================================

export const forgotPasswordAction = async (
  values: { email: string }
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: null;
}> => {
  try {
    const schema = z.object({
      email: z.string().email('Please enter a valid email address'),
    });

    const { success, data } = schema.safeParse(values);

    if (!success) {
      return {
        response: 'error',
        message: 'Please enter a valid email address',
        data: null,
      };
    }

    await auth.api.forgetPassword({
      body: {
        email: data.email,
        redirectTo: '/auth/reset-password',
      },
      headers: await headers(),
    });

    // Always return success to prevent email enumeration
    return {
      response: 'success',
      message: 'If an account exists, a reset link has been sent.',
      data: null,
    };
  } catch (error) {
    console.error('Forgot password error:', error);
    // Still return success to prevent email enumeration
    return {
      response: 'success',
      message: 'If an account exists, a reset link has been sent.',
      data: null,
    };
  }
};

// ============================================
// 5. RESET PASSWORD ACTION
// ============================================

export const resetPasswordAction = async (
  values: { token: string; password: string }
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: null;
}> => {
  try {
    const schema = z.object({
      token: z.string().min(1, 'Token is required'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters'),
    });

    const { success, data, error } = schema.safeParse(values);

    if (!success) {
      const firstError = error.errors[0]?.message ?? 'Invalid fields';
      return {
        response: 'error',
        message: firstError,
        data: null,
      };
    }

    await auth.api.resetPassword({
      body: {
        token: data.token,
        newPassword: data.password,
      },
      headers: await headers(),
    });

    return {
      response: 'success',
      message: 'Password reset successfully',
      data: null,
    };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        response: 'error',
        message: error.message ?? 'Failed to reset password',
        data: null,
      };
    }

    console.error('Reset password error:', error);
    return {
      response: 'error',
      message: 'An unexpected error occurred',
      data: null,
    };
  }
};

// ============================================
// 6. TWO-FACTOR VERIFICATION ACTION
// ============================================

export const verifyTotpAction = async (
  values: { code: string }
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: null;
}> => {
  try {
    const schema = z.object({
      code: z.string().length(6, 'Code must be 6 digits'),
    });

    const { success, data } = schema.safeParse(values);

    if (!success) {
      return {
        response: 'error',
        message: 'Please enter a valid 6-digit code',
        data: null,
      };
    }

    await auth.api.verifyTOTP({
      body: { code: data.code },
      headers: await headers(),
      asResponse: true,
    });

    return {
      response: 'success',
      message: 'Verification successful',
      data: null,
    };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        response: 'error',
        message: 'Invalid verification code',
        data: null,
      };
    }

    console.error('TOTP verification error:', error);
    return {
      response: 'error',
      message: 'An unexpected error occurred',
      data: null,
    };
  }
};

// ============================================
// PATTERN SUMMARY
// ============================================

/**
 * Auth Action Checklist:
 *
 * ✅ Import auth from '@/lib/auth'
 * ✅ Import headers from 'next/headers'
 * ✅ Import APIError from 'better-auth/api'
 * ✅ Validate input with Zod safeParse
 * ✅ Pass headers to auth API: headers: await headers()
 * ✅ Handle APIError in catch block
 * ✅ Handle 2FA redirect for sign in
 * ✅ Prevent email enumeration in password reset
 * ✅ Return standard response format
 * ✅ Use "Action" suffix in function names
 */
