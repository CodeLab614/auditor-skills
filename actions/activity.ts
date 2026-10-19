'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  ADMIN_TWO_FACTOR_REQUIRED_MESSAGE,
  getAdminAccess,
} from '@/lib/admin-access';

// ============================================
// TYPES
// ============================================

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// ============================================
// GET ACTIVITY LOGS ACTION
// ============================================

export const getActivityLogs = async (): Promise<{
  response: 'success' | 'error';
  message: string;
  data: ActivityLog[] | null;
}> => {
  try {
    const session = await getSession();
    if (!session) {
      return { response: 'error', message: 'Unauthorized', data: null };
    }

    const adminAccess = await getAdminAccess(session);
    if (adminAccess !== 'admin') {
      return {
        response: 'error',
        message:
          adminAccess === 'two-factor-required'
            ? ADMIN_TWO_FACTOR_REQUIRED_MESSAGE
            : 'Unauthorized',
        data: null,
      };
    }

    const logs = await prisma.activityLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const data = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user.name,
      userEmail: log.user.email,
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      response: 'success',
      message: 'Activity logs fetched successfully',
      data,
    };
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return {
      response: 'error',
      message: 'Failed to fetch activity logs',
      data: null,
    };
  }
};
