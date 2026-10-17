'use server';

import * as z from 'zod';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { APIError } from 'better-auth/api';
import { logActivity } from '@/actions/activity-log';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/validations/auth';
import { checkRateLimit, getClientIp, hashKey } from '@/lib/rate-limit';

type ForgotPasswordData = {
  email: string;
};

export const forgotPasswordAction = async (
  values: z.infer<typeof forgotPasswordSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: ForgotPasswordData | null;
}> => {
  try {
    const { success, data } = forgotPasswordSchema.safeParse(values);

    if (!success) {
      return {
        response: 'error',
        message: 'Invalid fields',
        data: null,
      };
    }

    const { email } = data;
    const clientIp = await getClientIp();
    const normalizedEmail = email.trim().toLowerCase();
    const rateLimit = await checkRateLimit([
      ...(clientIp ? [{ key: `reset:ip:${clientIp}`, window: 600, max: 5 }] : []),
      { key: `reset:email:${hashKey(normalizedEmail)}`, window: 600, max: 3 },
    ]);

    if (rateLimit.limited) {
      return {
        response: 'error',
        message: `Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`,
        data: null,
      };
    }

    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: '/auth/reset-password',
      },
      headers: await headers(),
    });

    return {
      response: 'success',
      message: 'Password reset link sent to your email',
      data: { email },
    };
  } catch (error) {
    if (error instanceof APIError) {
      console.error('Forgot password error:', error.message);
      return {
        response: 'error',
        message: error.message ?? 'Failed to send reset link',
        data: null,
      };
    }
    console.error('Forgot password error:', error);
    return {
      response: 'error',
      message: 'An unexpected error occurred',
      data: null,
    };
  }
};

export const resetPasswordAction = async (
  values: z.infer<typeof resetPasswordSchema> & { token: string }
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: null;
}> => {
  try {
    const { success, data } = resetPasswordSchema.safeParse(values);

    if (!success) {
      return {
        response: 'error',
        message: 'Invalid fields',
        data: null,
      };
    }

    const { password } = data;

    await auth.api.resetPassword({
      body: {
        token: values.token,
        newPassword: password,
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
      console.error('Reset password error:', error.message);
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

export const changePasswordAction = async (
  values: z.infer<typeof changePasswordSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: null;
}> => {
  try {
    const validation = changePasswordSchema.safeParse(values);

    if (!validation.success) {
      return {
        response: 'error',
        message: validation.error.issues[0]?.message ?? 'Invalid fields',
        data: null,
      };
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        response: 'error',
        message: 'Unauthorized',
        data: null,
      };
    }

    const rateLimit = await checkRateLimit([
      { key: `password-check:user:${session.user.id}`, window: 60, max: 5 },
    ]);

    if (rateLimit.limited) {
      return {
        response: 'error',
        message: `Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`,
        data: null,
      };
    }

    await auth.api.changePassword({
      body: {
        currentPassword: validation.data.currentPassword,
        newPassword: validation.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });

    await logActivity(session.user.id, 'password_change');

    return {
      response: 'success',
      message: 'Password changed successfully',
      data: null,
    };
  } catch (error) {
    if (error instanceof APIError) {
      console.error('Change password error:', error.message);
      return {
        response: 'error',
        message: error.message ?? 'Failed to change password',
        data: null,
      };
    }
    console.error('Change password error:', error);
    return {
      response: 'error',
      message: 'An unexpected error occurred',
      data: null,
    };
  }
};
