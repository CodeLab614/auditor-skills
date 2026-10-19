'use server';

import * as z from 'zod';
import { APIError } from 'better-auth/api';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth, getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { reportError } from '@/lib/report-error';

const deleteAccountSchema = z.object({
  password: z.string().max(128).optional(),
  confirmation: z.string(),
});

type DeleteAccountResponse = {
  response: 'success' | 'error';
  message: string;
  data: null;
};

const errorResponse = (message: string): DeleteAccountResponse => ({
  response: 'error',
  message,
  data: null,
});

export async function deleteOwnAccountAction(
  values: z.infer<typeof deleteAccountSchema>,
): Promise<DeleteAccountResponse> {
  const parsed = deleteAccountSchema.safeParse(values);
  if (!parsed.success) return errorResponse('Invalid request.');
  if (parsed.data.confirmation !== 'DELETE') {
    return errorResponse('Type DELETE exactly to confirm.');
  }

  const session = await getSession();
  if (!session?.user?.id) return errorResponse('Unauthorized. Please sign in again.');

  const [credential, rateLimit] = await Promise.all([
    prisma.account.findFirst({
      where: { userId: session.user.id, providerId: 'credential', password: { not: null } },
      select: { id: true },
    }),
    checkRateLimit([
      { key: `delete-account:user:${session.user.id}`, window: 600, max: 5 },
    ]),
  ]);

  if (rateLimit.limited) {
    return errorResponse(`Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`);
  }

  if (credential && !parsed.data.password) {
    return errorResponse('Password is required.');
  }

  if (!credential) {
    const ageMs = Date.now() - new Date(session.session.createdAt).getTime();
    if (ageMs < 0 || ageMs >= 10 * 60 * 1000) {
      return errorResponse('Your session is not recent. Sign out and sign in again to delete your account.');
    }
  }

  try {
    await auth.api.deleteUser({
      body: credential ? { password: parsed.data.password } : {},
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      const code = (error as APIError & { body?: { code?: string } }).body?.code;
      if (code === 'INVALID_PASSWORD' || /invalid password/i.test(error.message)) {
        return errorResponse('Incorrect password.');
      }
      if (code === 'SESSION_EXPIRED' || /session.*expired|session.*fresh/i.test(error.message)) {
        return errorResponse('Your session is not recent. Sign out and sign in again to delete your account.');
      }
      if (/last administrator/i.test(error.message)) {
        return errorResponse(error.message);
      }
      reportError(error, { area: 'auth.delete-account' });
      return errorResponse('Unable to delete your account. Please try again.');
    }
    reportError(error, { area: 'auth.delete-account' });
    return errorResponse('Unable to delete your account. Please try again.');
  }

  redirect('/account-deleted');
}
