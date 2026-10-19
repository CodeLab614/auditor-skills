import { hashPassword, makeSignature, symmetricEncrypt } from 'better-auth/crypto';
import { createEmailVerificationToken } from 'better-auth/api';
import { prisma } from '../../../lib/prisma';

export const E2E_PASSWORD = 'E2e-User-Password-123!';
export const E2E_SECRET =
  'e2e-only-secret-never-use-this-value-outside-local-tests-000000000000';
export const E2E_TOTP_STORED_SECRET = '12345678901234567890';
export const SEEDED_ADMIN_EMAIL = 'admin@e2e.invalid';
export const SEEDED_ADMIN_PASSWORD = 'E2e-Admin-Password-123!';

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
    },
  });
  await prisma.account.create({
    data: {
      accountId: user.id,
      providerId: 'credential',
      password: hashedPassword,
      userId: user.id,
    },
  });
  return { user, email, password };
}

export async function createTestSession(userId: string, createdAt = new Date()) {
  return prisma.session.create({
    data: {
      userId,
      token: `e2e-session-${crypto.randomUUID()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt,
    },
  });
}

export async function enableTestTwoFactor(userId: string) {
  const backupCodes = Array.from(
    { length: 10 },
    (_, index) => `E2E${String(index).padStart(2, '0')}-CODE${index}`,
  );
  const [secret, encryptedBackupCodes] = await Promise.all([
    symmetricEncrypt({ key: E2E_SECRET, data: E2E_TOTP_STORED_SECRET }),
    symmetricEncrypt({ key: E2E_SECRET, data: JSON.stringify(backupCodes) }),
  ]);

  await prisma.$transaction([
    prisma.twoFactor.deleteMany({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } }),
    prisma.twoFactor.create({
      data: {
        userId,
        secret,
        backupCodes: encryptedBackupCodes,
        verified: true,
        failedVerificationCount: 0,
      },
    }),
  ]);

  return { secret: E2E_TOTP_STORED_SECRET, backupCodes };
}

export async function createAdminWith2FA(options: {
  name?: string;
  email?: string;
  password?: string;
} = {}) {
  const account = await createTestUser({ ...options, role: 'admin' });
  const twoFactor = await enableTestTwoFactor(account.user.id);
  return { ...account, ...twoFactor };
}

export async function enableSeededAdminTwoFactor() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: SEEDED_ADMIN_EMAIL } });
  const twoFactor = await enableTestTwoFactor(admin.id);
  return { user: admin, email: SEEDED_ADMIN_EMAIL, password: SEEDED_ADMIN_PASSWORD, ...twoFactor };
}

export async function createOAuthTestUser(options: { role?: string; createdAt?: Date } = {}) {
  const email = `e2e-oauth-${Date.now()}-${nextUserId++}@e2e.invalid`;
  const user = await prisma.user.create({
    data: {
      name: 'E2E OAuth User',
      email,
      emailVerified: true,
      role: options.role ?? 'user',
      status: 'active',
      accounts: { create: { accountId: `oauth-${crypto.randomUUID()}`, providerId: 'google' } },
    },
  });
  const session = await createTestSession(user.id, options.createdAt);
  const cookieValue = `${session.token}.${await makeSignature(session.token, E2E_SECRET)}`;
  return { user, email, session, cookieValue };
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
