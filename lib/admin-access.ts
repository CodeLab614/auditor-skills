import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const ADMIN_TWO_FACTOR_REQUIRED_MESSAGE =
  'Two-factor authentication is required for admin access';
export const ACTIVE_ADMIN_REQUIRED_MESSAGE =
  'At least one active administrator is required';
export const ADMIN_TRANSACTION_CONFLICT_MESSAGE =
  'Administrator data changed during this operation. Please try again';

export type AdminAccess = 'admin' | 'not-admin' | 'two-factor-required';

type SessionForAdminAccess = {
  user: {
    id: string;
    role?: string | null;
    twoFactorEnabled?: boolean | null;
  };
} | null | undefined;

export async function getAdminAccess(
  session: SessionForAdminAccess
): Promise<AdminAccess> {
  if (!session || session.user.role !== 'admin') {
    return 'not-admin';
  }

  if (session.user.twoFactorEnabled) {
    return 'admin';
  }

  const credentialAccount = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: 'credential',
      password: { not: null },
    },
    select: { id: true },
  });

  return credentialAccount ? 'two-factor-required' : 'admin';
}

export class ActiveAdminRequiredError extends Error {
  constructor() {
    super(ACTIVE_ADMIN_REQUIRED_MESSAGE);
    this.name = 'ActiveAdminRequiredError';
  }
}

export async function assertActiveAdminRemains(
  transaction: Prisma.TransactionClient
): Promise<void> {
  const activeAdminCount = await transaction.user.count({
    where: { role: 'admin', status: 'active' },
  });

  if (activeAdminCount === 0) {
    throw new ActiveAdminRequiredError();
  }
}

export function getAdminMutationError(error: unknown): string | null {
  if (error instanceof ActiveAdminRequiredError) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2034'
  ) {
    return ADMIN_TRANSACTION_CONFLICT_MESSAGE;
  }

  return null;
}
