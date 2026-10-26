// Internal helpers for the first-run admin screen; they must not live in a "use server" file because its exports would be public endpoints.

import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const FIRST_RUN_ADMIN_PATH = '/auth/setup';

export const FIRST_RUN_WINDOW_MS = 15 * 60 * 1000;

export type FirstRunState = 'completed' | 'open' | 'closed';

/**
 * The window is counted from process start, not from module load, so every
 * route bundle (and dev-mode reload) agrees on the same moment.
 */
export function isFirstRunWindowOpen(): boolean {
  return process.uptime() * 1000 < FIRST_RUN_WINDOW_MS;
}

export async function hasAdminUser(
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<boolean> {
  const admin = await client.user.findFirst({
    where: { role: 'admin' },
    select: { id: true },
  });

  return admin !== null;
}

export async function promoteFirstRunAdmin(userId: string): Promise<boolean> {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        if (!isFirstRunWindowOpen() || (await hasAdminUser(transaction))) {
          return false;
        }

        await transaction.user.update({
          where: { id: userId },
          data: { role: 'admin' },
        });

        await transaction.activityLog.create({
          data: {
            userId,
            action: 'register',
            details: JSON.stringify({ method: 'first-run', role: 'admin' }),
            ipAddress: 'unknown',
            userAgent: 'unknown',
          },
        });

        return true;
      },
      { isolationLevel: 'Serializable' }
    );
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : null;

    if (code === 'P2034') return false;
    throw error;
  }
}

export async function getFirstRunState(): Promise<FirstRunState> {
  if (await hasAdminUser()) return 'completed';
  return isFirstRunWindowOpen() ? 'open' : 'closed';
}

/** For Server Components: send visitors to the setup screen while no admin exists. */
export async function redirectToFirstRunIfNoAdmin(): Promise<void> {
  // Admin existence is per-request data; without this the build prerenders the page and queries the database.
  await connection();
  if (!(await hasAdminUser())) redirect(FIRST_RUN_ADMIN_PATH);
}
