'use server';

import * as z from 'zod';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { APIError } from 'better-auth/api';
import { logActivity } from '@/lib/activity-log';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const updateProfileAction = async (
  values: z.infer<typeof updateProfileSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: null;
}> => {
  try {
    const { success, data } = updateProfileSchema.safeParse(values);

    if (!success) {
      return {
        response: 'error',
        message: 'Invalid fields',
        data: null,
      };
    }

    const { name } = data;

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

    await auth.api.updateUser({
      body: { name },
      headers: await headers(),
    });

    await logActivity(session.user.id, 'profile_update', {
      field: 'name',
      newValue: name,
    });

    return {
      response: 'success',
      message: 'Profile updated successfully',
      data: null,
    };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        response: 'error',
        message: error.message ?? 'Failed to update profile',
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
