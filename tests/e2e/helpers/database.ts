import { hashPassword } from 'better-auth/crypto';
import { createEmailVerificationToken } from 'better-auth/api';
import { prisma } from '../../../lib/prisma';

export const E2E_PASSWORD = 'E2e-User-Password-123!';
export const E2E_SECRET =
  'e2e-only-secret-never-use-this-value-outside-local-tests-000000000000';

let nextUserId = 0;

export async function createTestUser(options: {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  status?: string;
  emailVerified?: boolean;
} = {}) {
  const email = options.email ?? `e2e-${Date.now()}-${nextUserId++}@e2e.invalid`;
  const password = options.password ?? E2E_PASSWORD;
  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name: options.name ?? 'E2E Test User',
      email,
      emailVerified: options.emailVerified ?? true,
      role: options.role ?? 'user',
      status: options.status ?? 'active',
      accounts: {
        create: {
          accountId: email,
          providerId: 'credential',
          password: hashedPassword,
        },
      },
    },
  });
  return { user, email, password };
}

export async function createTestSession(userId: string) {
  return prisma.session.create({
    data: {
      userId,
      token: `e2e-session-${crypto.randomUUID()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
}

export async function createVerificationToken(email: string, expiresIn = 3600) {
  return createEmailVerificationToken(E2E_SECRET, email, undefined, expiresIn);
}

export async function createExpiredResetToken(token: string) {
  await prisma.verification.create({
    data: {
      identifier: `reset-password:${token}`,
      value: 'e2e-expired-token',
      expiresAt: new Date(Date.now() - 60_000),
    },
  });
}

export async function cleanE2EData() {
  await prisma.user.deleteMany({
    where: { email: { startsWith: 'e2e-' } },
  });
  await prisma.rateLimit.deleteMany();
}

export { prisma };
