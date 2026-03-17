'use server';

import { prisma } from '@/lib/prisma';

// ============================================
// TYPES
// ============================================

export interface DashboardMetrics {
  totalUsers: number;
  totalUsersChange: number;
  activeUsers: number;
  activeUsersChange: number;
  inactiveUsers: number;
  inactiveUsersChange: number;
  newThisMonth: number;
  newThisMonthChange: number;
}

export interface RecentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  chartData: number[];
  recentUsers: RecentUser[];
}

export interface UserData {
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  twoFactorEnabled: boolean;
}

// ============================================
// GET DASHBOARD METRICS ACTION
// ============================================

export const getDashboardMetrics = async (): Promise<{
  response: 'success' | 'error';
  message: string;
  data: DashboardData | null;
}> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get total users count
    const totalUsers = await prisma.user.count();

    // Get users created last month for comparison
    const lastMonthUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // Get verified users as "active"
    const verifiedUsers = await prisma.user.count({
      where: {
        emailVerified: true,
      },
    });

    // Inactive users (not verified)
    const inactiveUsers = totalUsers - verifiedUsers;

    // New users this month
    const newThisMonth = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Calculate percentage changes
    const totalUsersChange =
      lastMonthUsers > 0
        ? ((totalUsers - lastMonthUsers) / lastMonthUsers) * 100
        : 0;

    // Get monthly user registration data for chart (last 12 months)
    const chartData: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });
      chartData.push(count);
    }

    // Get recent users (last 5)
    const recentUsersData = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    const recentUsers = recentUsersData.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.emailVerified ? 'active' : 'pending',
      createdAt: user.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    }));

    return {
      response: 'success',
      message: 'Dashboard metrics fetched successfully',
      data: {
        metrics: {
          totalUsers,
          totalUsersChange: Math.round(totalUsersChange * 10) / 10,
          activeUsers: verifiedUsers,
          activeUsersChange: 0,
          inactiveUsers,
          inactiveUsersChange: 0,
          newThisMonth,
          newThisMonthChange: 0,
        },
        chartData,
        recentUsers,
      },
    };
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return {
      response: 'error',
      message: 'Failed to fetch dashboard metrics',
      data: null,
    };
  }
};

// ============================================
// GET USER DATA ACTION
// ============================================

export const getUserData = async (
  userId: string
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: UserData | null;
}> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return {
        response: 'error',
        message: 'User not found',
        data: null,
      };
    }

    return {
      response: 'success',
      message: 'User data fetched successfully',
      data: {
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        twoFactorEnabled: user.twoFactorEnabled ?? false,
      },
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return {
      response: 'error',
      message: 'Failed to fetch user data',
      data: null,
    };
  }
};
