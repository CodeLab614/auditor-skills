import { expect, test } from '@playwright/test';

import {
  assertActiveAdminRemains,
  getAdminAccess,
} from '../../lib/admin-access';
import {
  cleanE2EData,
  createOAuthTestUser,
  createTestUser,
  prisma,
  SEEDED_ADMIN_EMAIL,
} from './helpers';

test.beforeEach(async () => {
  await prisma.user.update({
    where: { email: SEEDED_ADMIN_EMAIL },
    data: { status: 'inactive' },
  });
});

test.afterEach(async () => {
  await cleanE2EData();
  await prisma.user.update({
    where: { email: SEEDED_ADMIN_EMAIL },
    data: { status: 'active' },
  });
});

test('active-admin invariant rejects and rolls back a write that leaves zero active admins', async () => {
  const admin = await createTestUser({ role: 'admin' });

  await expect(prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: admin.user.id }, data: { role: 'user' } });
    await assertActiveAdminRemains(tx);
  }, { isolationLevel: 'Serializable' })).rejects.toThrow('At least one active administrator is required');

  expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.user.id } })).role).toBe('admin');
});

test('active-admin invariant permits a write when another active admin remains', async () => {
  const first = await createTestUser({ role: 'admin' });
  const second = await createTestUser({ role: 'admin' });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: first.user.id }, data: { status: 'inactive' } });
    await assertActiveAdminRemains(tx);
  }, { isolationLevel: 'Serializable' });

  expect((await prisma.user.findUniqueOrThrow({ where: { id: first.user.id } })).status).toBe('inactive');
  expect((await prisma.user.findUniqueOrThrow({ where: { id: second.user.id } })).status).toBe('active');
});

test('password admin without 2FA is denied admin access', async () => {
  const admin = await createTestUser({ role: 'admin' });

  await expect(getAdminAccess({
    user: {
      id: admin.user.id,
      role: 'admin',
      twoFactorEnabled: false,
    },
  })).resolves.toBe('two-factor-required');
});

test('OAuth-only admin is exempt from app 2FA', async () => {
  const admin = await createOAuthTestUser({ role: 'admin' });

  await expect(getAdminAccess({
    user: {
      id: admin.user.id,
      role: 'admin',
      twoFactorEnabled: false,
    },
  })).resolves.toBe('admin');
});
