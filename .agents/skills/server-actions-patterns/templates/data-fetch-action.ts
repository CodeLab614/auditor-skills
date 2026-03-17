/**
 * Data Fetching Server Actions Template
 *
 * This template shows the REQUIRED pattern for data fetching actions
 * that are called from Server Components (pages).
 *
 * Key Rules:
 * 1. These actions are called in page.tsx, data passed to components
 * 2. Always serialize dates as ISO strings
 * 3. Transform data in action, not in component
 * 4. Handle authentication for protected data
 * 5. Return standard response format
 */

'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// ============================================
// 1. TYPES (in types/*.ts)
// ============================================

type DashboardMetrics = {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  recentActivity: ActivityItem[];
};

type ActivityItem = {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  createdAt: string;
};

type UserProfile = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

// ============================================
// 2. DASHBOARD METRICS (Protected)
// ============================================

export const getDashboardMetricsAction = async (): Promise<{
  response: 'success' | 'error';
  message: string;
  data: DashboardMetrics | null;
}> => {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        response: 'error',
        message: 'Authentication required',
        data: null,
      };
    }

    // Fetch metrics in parallel for performance
    const [totalUsers, activeUsers, totalPosts, recentActivity] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            sessions: {
              some: {
                expiresAt: { gt: new Date() },
              },
            },
          },
        }),
        prisma.post.count(),
        prisma.activityLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } } },
        }),
      ]);

    // Transform activity data (serialize dates)
    const transformedActivity: ActivityItem[] = recentActivity.map((item) => ({
      id: item.id,
      action: item.action,
      description: item.description ?? '',
      userId: item.userId,
      userName: item.user.name ?? 'Unknown',
      createdAt: item.createdAt.toISOString(),
    }));

    return {
      response: 'success',
      message: 'Dashboard metrics fetched',
      data: {
        totalUsers,
        activeUsers,
        totalPosts,
        recentActivity: transformedActivity,
      },
    };
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    return {
      response: 'error',
      message: 'Failed to fetch dashboard metrics',
      data: null,
    };
  }
};

// ============================================
// 3. USER PROFILE (Protected)
// ============================================

export const getProfileAction = async (): Promise<{
  response: 'success' | 'error';
  message: string;
  data: UserProfile | null;
}> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        response: 'error',
        message: 'Authentication required',
        data: null,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return {
        response: 'error',
        message: 'User not found',
        data: null,
      };
    }

    // Transform and serialize
    return {
      response: 'success',
      message: 'Profile fetched',
      data: {
        id: user.id,
        name: user.name ?? '',
        email: user.email,
        image: user.image,
        role: user.role ?? 'user',
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Get profile error:', error);
    return {
      response: 'error',
      message: 'Failed to fetch profile',
      data: null,
    };
  }
};

// ============================================
// 4. USERS LIST (Admin Protected)
// ============================================

type UserListItem = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
};

export const getUsersAction = async (): Promise<{
  response: 'success' | 'error';
  message: string;
  data: UserListItem[] | null;
}> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        response: 'error',
        message: 'Authentication required',
        data: null,
      };
    }

    // Check admin role
    if (session.user.role !== 'admin') {
      return {
        response: 'error',
        message: 'Admin access required',
        data: null,
      };
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Transform all users
    const transformedUsers: UserListItem[] = users.map((user) => ({
      id: user.id,
      name: user.name ?? '',
      email: user.email,
      image: user.image,
      role: user.role ?? 'user',
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
    }));

    return {
      response: 'success',
      message: `Found ${users.length} users`,
      data: transformedUsers,
    };
  } catch (error) {
    console.error('Get users error:', error);
    return {
      response: 'error',
      message: 'Failed to fetch users',
      data: null,
    };
  }
};

// ============================================
// 5. ACTIVE SESSIONS (Protected)
// ============================================

type SessionItem = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export const getSessionsAction = async (): Promise<{
  response: 'success' | 'error';
  message: string;
  data: SessionItem[] | null;
}> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        response: 'error',
        message: 'Authentication required',
        data: null,
      };
    }

    const sessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform sessions
    const transformedSessions: SessionItem[] = sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isCurrent: s.token === session.session.token,
    }));

    return {
      response: 'success',
      message: `Found ${sessions.length} active sessions`,
      data: transformedSessions,
    };
  } catch (error) {
    console.error('Get sessions error:', error);
    return {
      response: 'error',
      message: 'Failed to fetch sessions',
      data: null,
    };
  }
};

// ============================================
// USAGE IN PAGE.TSX
// ============================================

/**
 * Example usage in a Server Component page:
 *
 * ```tsx
 * // app/dashboard/page.tsx
 * import { getDashboardMetricsAction } from '@/actions/dashboard';
 * import { DashboardContent } from '@/components/dashboard';
 * import { redirect } from 'next/navigation';
 *
 * export default async function DashboardPage() {
 *   const result = await getDashboardMetricsAction();
 *
 *   if (result.response === 'error') {
 *     // Handle auth error - redirect to login
 *     if (result.message === 'Authentication required') {
 *       redirect('/auth/login');
 *     }
 *     // Handle other errors
 *     return <div>Error: {result.message}</div>;
 *   }
 *
 *   // Pass data to client component
 *   return <DashboardContent metrics={result.data} />;
 * }
 * ```
 */

// ============================================
// PATTERN SUMMARY
// ============================================

/**
 * Data Fetch Action Checklist:
 *
 * ✅ Check authentication with auth.api.getSession
 * ✅ Check authorization (role-based access)
 * ✅ Use Promise.all for parallel queries
 * ✅ Transform data in action (not in component)
 * ✅ Serialize ALL dates as ISO strings
 * ✅ Handle not found cases
 * ✅ Return standard response format
 * ✅ Use "Action" suffix
 * ✅ console.error before returning error
 * ✅ Try-catch wrapper
 *
 * Page Integration:
 * ✅ Call action in page.tsx (Server Component)
 * ✅ Handle error case (redirect or error UI)
 * ✅ Pass result.data to Client Component
 * ✅ Component receives already-transformed data
 */
