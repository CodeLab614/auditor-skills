'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// ============================================
// TYPES
// ============================================

export interface ProfileData {
  name: string;
  email: string;
  avatar?: string;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface SessionData {
  id: string;
  token: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface ProfilePageData {
  profile: ProfileData;
  twoFactorEnabled: boolean;
  isOAuthUser: boolean;
  activityLogs: ActivityLogEntry[];
  sessions: SessionData[];
  currentSessionToken?: string;
}

// ============================================
// GET PROFILE DATA ACTION
// ============================================

export const getProfileData = async (): Promise<{
  response: 'success' | 'error';
  message: string;
  data: ProfilePageData | null;
}> => {
  try {
    const session = await getSession();
    if (!session) {
      return { response: 'error', message: 'Unauthorized', data: null };
    }

    const userId = session.user.id;

    // Get current session token
    const cookieStore = await cookies();
    const currentSessionToken = cookieStore.get('better-auth.session_token')?.value;

    // Get user's 2FA status, image, activity logs, and sessions from database
    const [user, oauthAccounts, activityLogs, sessions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, twoFactorEnabled: true, image: true },
      }),
      prisma.account.findMany({
        where: { userId, providerId: { not: 'credential' } },
        select: { providerId: true },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.session.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() }, // Only active (non-expired) sessions
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!user) {
      return {
        response: 'error',
        message: 'User not found',
        data: null,
      };
    }

    const profile: ProfileData = {
      name: user.name,
      email: user.email,
      avatar: user.image ?? undefined,
    };

    // Parse JSON details for activity logs and serialize dates
    const parsedActivityLogs: ActivityLogEntry[] = activityLogs.map((log) => ({
      id: log.id,
      userId: log.userId,
      action: log.action,
      details: log.details ? JSON.parse(log.details) : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    }));

    // Format sessions with current session flag and serialize dates
    const formattedSessions: SessionData[] = sessions.map((s) => ({
      id: s.id,
      token: s.token,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isCurrent: s.token === currentSessionToken,
    }));

    return {
      response: 'success',
      message: 'Profile data fetched successfully',
      data: {
        profile,
        twoFactorEnabled: user.twoFactorEnabled ?? false,
        isOAuthUser: oauthAccounts.length > 0,
        activityLogs: parsedActivityLogs,
        sessions: formattedSessions,
        currentSessionToken,
      },
    };
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return {
      response: 'error',
      message: 'Failed to fetch profile data',
      data: null,
    };
  }
};
