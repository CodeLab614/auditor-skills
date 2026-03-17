'use server';

import * as z from 'zod';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { APIError } from 'better-auth/api';
import { logActivity } from '@/actions/activity-log';
import { twoFactorSchema } from '@/validations/auth';

export const verifyTotpAction = async (
  values: z.infer<typeof twoFactorSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: null;
}> => {
  try {
    const { success, data } = twoFactorSchema.safeParse(values);

    if (!success) {
      return {
        response: 'error',
        message: 'Invalid code',
        data: null,
      };
    }

    const { code } = data;

    await auth.api.verifyTOTP({
      body: { code },
      headers: await headers(),
    });

    return {
      response: 'success',
      message: 'Two-factor authentication verified',
      data: null,
    };
  } catch (error) {
    if (error instanceof APIError) {
      console.error('Verify TOTP error:', error.message);
      return {
        response: 'error',
        message: error.message ?? 'Invalid code',
        data: null,
      };
    }
    console.error('Verify TOTP error:', error);
    return {
      response: 'error',
      message: 'An unexpected error occurred',
      data: null,
    };
  }
};

export const verifyBackupCodeAction = async (
  code: string
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: null;
}> => {
  try {
    if (!code || code.trim().length === 0) {
      return {
        response: 'error',
        message: 'Backup code is required',
        data: null,
      };
    }

    await auth.api.verifyBackupCode({
      body: { code },
      headers: await headers(),
    });

    return {
      response: 'success',
      message: 'Backup code verified',
      data: null,
    };
  } catch (error) {
    if (error instanceof APIError) {
      console.error('Verify backup code error:', error.message);
      return {
        response: 'error',
        message: error.message ?? 'Invalid backup code',
        data: null,
      };
    }
    console.error('Verify backup code error:', error);
    return {
      response: 'error',
      message: 'An unexpected error occurred',
      data: null,
    };
  }
};

type Enable2FAData = {
  totpURI: string;
  backupCodes: string[];
};

export const enable2FAAction = async (
  password: string
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: Enable2FAData | null;
}> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const result = await auth.api.enableTwoFactor({
      body: { password },
      headers: await headers(),
    });

    if (session?.user?.id) {
      await logActivity(session.user.id, '2fa_enabled');
    }

    return {
      response: 'success',
      message: 'Two-factor authentication enabled',
      data: {
        totpURI: result.totpURI,
        backupCodes: result.backupCodes,
      },
    };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        response: 'error',
        message: error.message ?? 'Failed to enable 2FA',
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

export const verify2FASetupAction = async (
  code: string
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: null;
}> => {
  try {
    await auth.api.verifyTOTP({
      body: { code },
      headers: await headers(),
    });

    return {
      response: 'success',
      message: 'Two-factor authentication setup complete',
      data: null,
    };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        response: 'error',
        message: error.message ?? 'Invalid verification code',
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

export const disable2FAAction = async (
  password: string
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: null;
}> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    await auth.api.disableTwoFactor({
      body: { password },
      headers: await headers(),
    });

    if (session?.user?.id) {
      await logActivity(session.user.id, '2fa_disabled');
    }

    return {
      response: 'success',
      message: 'Two-factor authentication disabled',
      data: null,
    };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        response: 'error',
        message: error.message ?? 'Failed to disable 2FA',
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

export const get2FAStatusAction = async (): Promise<{
  response: 'success' | 'error';
  message: string;
  data: { enabled: boolean } | null;
}> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return {
      response: 'success',
      message: '2FA status retrieved',
      data: {
        enabled: session?.user?.twoFactorEnabled ?? false,
      },
    };
  } catch {
    return {
      response: 'error',
      message: 'Failed to get 2FA status',
      data: null,
    };
  }
};
