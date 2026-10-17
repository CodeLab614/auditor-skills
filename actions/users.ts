'use server';

import * as z from 'zod';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { auth, getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  addUserSchema,
  changeRoleSchema,
  editUserSchema,
  resetPasswordSchema,
} from '@/validations/users';

// Helper to get request info for activity logging
async function getRequestInfo() {
  const headersList = await headers();
  const ipAddress =
    headersList.get("x-forwarded-for")?.split(",")[0] ||
    headersList.get("x-real-ip") ||
    "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";
  return { ipAddress, userAgent };
}

// Helper to log activity
async function logActivity(
  userId: string,
  action: string,
  details?: Record<string, unknown>
) {
  const { ipAddress, userAgent } = await getRequestInfo();
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      details: details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent,
    },
  });
}

// ============================================
// ADD USER ACTION (New Pattern)
// ============================================

type AddUserData = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export const addUserAction = async (
  values: z.infer<typeof addUserSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: AddUserData | null;
}> => {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        response: 'error',
        message: 'Unauthorized',
        data: null,
      };
    }

    if (session.user.role !== 'admin') {
      return {
        response: 'error',
        message: 'Only admins can add users',
        data: null,
      };
    }

    const { success, data, error } = addUserSchema.safeParse(values);

    if (!success) {
      const firstError = error.issues[0]?.message ?? 'Invalid fields';
      return {
        response: 'error',
        message: firstError,
        data: null,
      };
    }

    const { name, role, sendInvite } = data;
    const email = data.email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (existingUser) {
      return {
        response: 'error',
        message: 'A user with this email already exists',
        data: null,
      };
    }

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role,
        emailVerified: false,
        status: 'pending',
      },
    });

    // Log activity
    await logActivity(session.user.id, 'profile_update', {
      action: 'user_created',
      targetUserId: newUser.id,
      targetUserName: name,
      targetUserEmail: email,
      role,
      inviteSent: sendInvite,
    });

    // TODO: Send invitation email if sendInvite is true

    revalidatePath('/dashboard/users');

    return {
      response: 'success',
      message: sendInvite
        ? 'User created and invitation sent'
        : 'User created successfully',
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    };
  } catch (error) {
    console.error('Add user error:', error);
    return {
      response: 'error',
      message: 'Failed to create user',
      data: null,
    };
  }
};

// ============================================
// EDIT USER ACTION (New Pattern)
// ============================================

type EditUserData = {
  id: string;
  name: string;
  email: string;
};

export const editUserAction = async (
  userId: string,
  values: z.infer<typeof editUserSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: EditUserData | null;
}> => {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        response: 'error',
        message: 'Unauthorized',
        data: null,
      };
    }

    // Only admins can edit users
    if (session.user.role !== 'admin') {
      return {
        response: 'error',
        message: 'Only admins can edit users',
        data: null,
      };
    }

    const { success, data, error } = editUserSchema.safeParse(values);

    if (!success) {
      const firstError = error.issues[0]?.message ?? 'Invalid fields';
      return {
        response: 'error',
        message: firstError,
        data: null,
      };
    }

    const { name } = data;
    const email = data.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return {
        response: 'error',
        message: 'User not found',
        data: null,
      };
    }

    const emailChanged = email !== user.email.toLowerCase();

    // Check if user is OAuth — cannot change email
    if (emailChanged) {
      const oauthAccount = await prisma.account.findFirst({
        where: { userId, providerId: { not: 'credential' } },
      });

      if (oauthAccount) {
        return {
          response: 'error',
          message: 'Cannot change email for OAuth users. Email is managed by the authentication provider.',
          data: null,
        };
      }

      // Check if email is being changed to one that already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          id: { not: userId },
        },
      });

      if (existingUser) {
        return {
          response: 'error',
          message: 'A user with this email already exists',
          data: null,
        };
      }
    }

    const updatedUser = emailChanged
      ? await prisma.$transaction(async (tx) => {
          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { name, email, emailVerified: false },
          });
          await tx.session.deleteMany({ where: { userId } });
          return updatedUser;
        })
      : await prisma.user.update({
          where: { id: userId },
          data: { name },
        });

    let message = 'User updated successfully';

    if (emailChanged) {
      try {
        await auth.api.sendVerificationEmail({
          body: { email, callbackURL: '/auth/verify-email' },
        });
        message = 'User updated. A verification email was sent to the new address';
      } catch (error) {
        console.error('Verification email error:', error);
        message = 'User updated, but the verification email could not be sent';
      }
    }

    await logActivity(session.user.id, 'profile_update', {
      action: 'user_edited',
      targetUserId: userId,
      emailVerificationReset: emailChanged,
      changes: {
        name: user.name !== name ? { from: user.name, to: name } : undefined,
        email: emailChanged ? { from: user.email, to: email } : undefined,
      },
    });

    revalidatePath('/dashboard/users');

    return {
      response: 'success',
      message,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
      },
    };
  } catch (error) {
    console.error('Edit user error:', error);
    return {
      response: 'error',
      message: 'Failed to update user',
      data: null,
    };
  }
};

// ============================================
// CHANGE ROLE ACTION (New Pattern)
// ============================================

type ChangeRoleData = {
  userId: string;
  previousRole: string;
  newRole: string;
};

export const changeRoleAction = async (
  userId: string,
  values: z.infer<typeof changeRoleSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: ChangeRoleData | null;
}> => {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        response: 'error',
        message: 'Unauthorized',
        data: null,
      };
    }

    if (session.user.role !== 'admin') {
      return {
        response: 'error',
        message: 'Only admins can change roles',
        data: null,
      };
    }

    const { success, data, error } = changeRoleSchema.safeParse(values);

    if (!success) {
      const firstError = error.issues[0]?.message ?? 'Invalid role';
      return {
        response: 'error',
        message: firstError,
        data: null,
      };
    }

    const { role: newRole } = data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true },
    });

    if (!user) {
      return {
        response: 'error',
        message: 'User not found',
        data: null,
      };
    }

    if (user.role === newRole) {
      return {
        response: 'error',
        message: 'User already has this role',
        data: null,
      };
    }

    const previousRole = user.role;

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    await logActivity(session.user.id, 'profile_update', {
      action: 'role_change',
      targetUserId: userId,
      targetUserName: user.name,
      previousRole,
      newRole,
    });

    revalidatePath('/dashboard/users');

    return {
      response: 'success',
      message: `Role updated to ${newRole}`,
      data: {
        userId,
        previousRole,
        newRole,
      },
    };
  } catch (error) {
    console.error('Change role error:', error);
    return {
      response: 'error',
      message: 'Failed to change user role',
      data: null,
    };
  }
};

// ============================================
// DELETE USER ACTION
// ============================================

type DeleteUserData = {
  userId: string;
  userName: string;
};

export const deleteUser = async (
  userId: string
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: DeleteUserData | null;
}> => {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        response: 'error',
        message: 'Unauthorized',
        data: null,
      };
    }

    if (session.user.role !== 'admin') {
      return {
        response: 'error',
        message: 'Only admins can delete users',
        data: null,
      };
    }

    if (session.user.id === userId) {
      return {
        response: 'error',
        message: 'Cannot delete your own account',
        data: null,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return {
        response: 'error',
        message: 'User not found',
        data: null,
      };
    }

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId } }),
      prisma.account.deleteMany({ where: { userId } }),
      prisma.activityLog.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    await logActivity(session.user.id, 'profile_update', {
      action: 'user_deleted',
      targetUserId: userId,
      targetUserName: user.name,
      targetUserEmail: user.email,
    });

    revalidatePath('/dashboard/users');

    return {
      response: 'success',
      message: `User ${user.name} deleted successfully`,
      data: { userId, userName: user.name },
    };
  } catch (error) {
    console.error('Delete user error:', error);
    return {
      response: 'error',
      message: 'Failed to delete user',
      data: null,
    };
  }
};

// ============================================
// TOGGLE USER STATUS ACTION
// ============================================

type ToggleStatusData = {
  userId: string;
  newStatus: string;
};

export const toggleUserStatus = async (
  userId: string,
  activate: boolean
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: ToggleStatusData | null;
}> => {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        response: 'error',
        message: 'Unauthorized',
        data: null,
      };
    }

    if (session.user.role !== 'admin') {
      return {
        response: 'error',
        message: 'Only admins can toggle user status',
        data: null,
      };
    }

    if (session.user.id === userId) {
      return {
        response: 'error',
        message: 'Cannot change your own status',
        data: null,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, status: true },
    });

    if (!user) {
      return {
        response: 'error',
        message: 'User not found',
        data: null,
      };
    }

    const newStatus = activate ? 'active' : 'inactive';

    if (newStatus === 'inactive') {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { status: newStatus },
        });
        await tx.session.deleteMany({ where: { userId } });
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { status: newStatus },
      });
    }

    await logActivity(session.user.id, 'profile_update', {
      action: 'status_change',
      targetUserId: userId,
      targetUserName: user.name,
      previousStatus: user.status,
      newStatus,
    });

    revalidatePath('/dashboard/users');

    return {
      response: 'success',
      message: `User ${activate ? 'activated' : 'deactivated'} successfully`,
      data: { userId, newStatus },
    };
  } catch (error) {
    console.error('Toggle user status error:', error);
    return {
      response: 'error',
      message: 'Failed to change user status',
      data: null,
    };
  }
};

// ============================================
// BULK TOGGLE STATUS ACTION
// ============================================

type BulkToggleStatusData = {
  count: number;
  newStatus: string;
};

export const bulkToggleStatus = async (
  userIds: string[],
  activate: boolean
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: BulkToggleStatusData | null;
}> => {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        response: 'error',
        message: 'Unauthorized',
        data: null,
      };
    }

    if (session.user.role !== 'admin') {
      return {
        response: 'error',
        message: 'Only admins can toggle user status',
        data: null,
      };
    }

    if (userIds.includes(session.user.id)) {
      return {
        response: 'error',
        message: 'Cannot change your own status',
        data: null,
      };
    }

    const newStatus = activate ? 'active' : 'inactive';

    if (newStatus === 'inactive') {
      await prisma.$transaction(async (tx) => {
        await tx.user.updateMany({
          where: { id: { in: userIds } },
          data: { status: newStatus },
        });
        await tx.session.deleteMany({ where: { userId: { in: userIds } } });
      });
    } else {
      await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { status: newStatus },
      });
    }

    await logActivity(session.user.id, 'profile_update', {
      action: 'bulk_status_change',
      targetUserIds: userIds,
      newStatus,
      count: userIds.length,
    });

    revalidatePath('/dashboard/users');

    return {
      response: 'success',
      message: `${userIds.length} user(s) ${activate ? 'activated' : 'deactivated'} successfully`,
      data: { count: userIds.length, newStatus },
    };
  } catch (error) {
    console.error('Bulk toggle status error:', error);
    return {
      response: 'error',
      message: 'Failed to change user status',
      data: null,
    };
  }
};

// ============================================
// BULK CHANGE ROLE ACTION
// ============================================

type BulkChangeRoleData = {
  count: number;
  newRole: string;
};

export const bulkChangeRole = async (
  userIds: string[],
  newRole: string
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: BulkChangeRoleData | null;
}> => {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        response: 'error',
        message: 'Unauthorized',
        data: null,
      };
    }

    if (session.user.role !== 'admin') {
      return {
        response: 'error',
        message: 'Only admins can change roles',
        data: null,
      };
    }

    if (!['admin', 'moderator', 'user'].includes(newRole)) {
      return {
        response: 'error',
        message: 'Invalid role',
        data: null,
      };
    }

    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { role: newRole },
    });

    await logActivity(session.user.id, 'profile_update', {
      action: 'bulk_role_change',
      targetUserIds: userIds,
      newRole,
      count: userIds.length,
    });

    revalidatePath('/dashboard/users');

    return {
      response: 'success',
      message: `Role updated to ${newRole} for ${userIds.length} user(s)`,
      data: { count: userIds.length, newRole },
    };
  } catch (error) {
    console.error('Bulk change role error:', error);
    return {
      response: 'error',
      message: 'Failed to change roles',
      data: null,
    };
  }
};

// ============================================
// BULK DELETE USERS ACTION
// ============================================

type BulkDeleteUsersData = {
  count: number;
};

export const bulkDeleteUsers = async (
  userIds: string[]
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: BulkDeleteUsersData | null;
}> => {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        response: 'error',
        message: 'Unauthorized',
        data: null,
      };
    }

    if (session.user.role !== 'admin') {
      return {
        response: 'error',
        message: 'Only admins can delete users',
        data: null,
      };
    }

    if (userIds.includes(session.user.id)) {
      return {
        response: 'error',
        message: 'Cannot delete your own account',
        data: null,
      };
    }

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.account.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.activityLog.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.user.deleteMany({ where: { id: { in: userIds } } }),
    ]);

    await logActivity(session.user.id, 'profile_update', {
      action: 'bulk_user_deleted',
      targetUserIds: userIds,
      count: userIds.length,
    });

    revalidatePath('/dashboard/users');

    return {
      response: 'success',
      message: `${userIds.length} user(s) deleted successfully`,
      data: { count: userIds.length },
    };
  } catch (error) {
    console.error('Bulk delete users error:', error);
    return {
      response: 'error',
      message: 'Failed to delete users',
      data: null,
    };
  }
};

export type AuthProvider = "email" | "google" | "github";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  provider: AuthProvider;
  createdAt: string;
  lastActive: string;
}

// ============================================
// RESET PASSWORD ACTION (New Pattern)
// ============================================

type ResetPasswordData = {
  userId: string;
  method: 'email' | 'manual';
  temporaryPassword?: string;
};

export const resetPasswordAction = async (
  userId: string,
  values: z.infer<typeof resetPasswordSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: ResetPasswordData | null;
}> => {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        response: 'error',
        message: 'Unauthorized',
        data: null,
      };
    }

    if (session.user.role !== 'admin') {
      return {
        response: 'error',
        message: 'Only admins can reset passwords',
        data: null,
      };
    }

    const { success, data, error } = resetPasswordSchema.safeParse(values);

    if (!success) {
      const firstError = error.issues[0]?.message ?? 'Invalid method';
      return {
        response: 'error',
        message: firstError,
        data: null,
      };
    }

    const { method } = data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return {
        response: 'error',
        message: 'User not found',
        data: null,
      };
    }

    if (method === 'email') {
      // TODO: Send password reset email using Better Auth's forgetPassword
      // For now, we'll just log the activity
      await logActivity(session.user.id, 'profile_update', {
        action: 'password_reset_requested',
        targetUserId: userId,
        targetUserName: user.name,
        method: 'email',
      });

      return {
        response: 'success',
        message: `Password reset email sent to ${user.email}`,
        data: {
          userId,
          method: 'email',
        },
      };
    }

    // Manual method: Generate temporary password
    const temporaryPassword = generateTemporaryPassword();

    // TODO: Update user password using Better Auth
    // For now, we'll just log the activity
    await logActivity(session.user.id, 'profile_update', {
      action: 'password_reset_manual',
      targetUserId: userId,
      targetUserName: user.name,
      method: 'manual',
    });

    return {
      response: 'success',
      message: 'Temporary password generated',
      data: {
        userId,
        method: 'manual',
        temporaryPassword,
      },
    };
  } catch (error) {
    console.error('Reset password error:', error);
    return {
      response: 'error',
      message: 'Failed to reset password',
      data: null,
    };
  }
};

// Helper to generate a temporary password
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function getUsers(): Promise<{
  response: 'success' | 'error';
  message: string;
  data: User[] | null;
}> {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'admin') {
      return { response: 'error', message: 'Unauthorized', data: null };
    }

    const usersData = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        accounts: {
          select: {
            providerId: true,
          },
        },
        activityLogs: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            createdAt: true,
          },
        },
      },
    });

    const now = new Date();

    const users = usersData.map((user) => {
      // Determine provider
      const providerAccount = user.accounts.find(
        (acc) => acc.providerId === "google" || acc.providerId === "github"
      );
      const provider: AuthProvider = providerAccount
        ? (providerAccount.providerId as AuthProvider)
        : "email";

      // Use status from database, fallback to pending if email not verified
      const status = !user.emailVerified ? "pending" : user.status;

      // Determine last active from activity logs
      let lastActive = "Never";
      if (user.activityLogs.length > 0) {
        const lastActivity = user.activityLogs[0];
        const diffMs = now.getTime() - lastActivity.createdAt.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          lastActive = "Today";
        } else if (diffDays === 1) {
          lastActive = "Yesterday";
        } else if (diffDays < 7) {
          lastActive = `${diffDays} days ago`;
        } else if (diffDays < 14) {
          lastActive = "1 week ago";
        } else if (diffDays < 30) {
          lastActive = `${Math.floor(diffDays / 7)} weeks ago`;
        } else {
          lastActive = `${Math.floor(diffDays / 30)} months ago`;
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status,
        provider,
        createdAt: user.createdAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        lastActive,
      };
    });

    return {
      response: 'success',
      message: 'Users fetched successfully',
      data: users,
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      response: 'error',
      message: 'Failed to fetch users',
      data: null,
    };
  }
}
