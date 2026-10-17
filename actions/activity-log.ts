"use server";

import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";

export type ActivityAction =
  | "login"
  | "logout"
  | "register"
  | "profile_update"
  | "password_change"
  | "email_change"
  | "avatar_change"
  | "2fa_enabled"
  | "2fa_disabled"
  | "2fa_verified"
  | "email_verified"
  | "oauth_login"
  | "oauth_link"
  | "session_revoked";

export interface ActivityDetails {
  provider?: string;
  previousValue?: string;
  newValue?: string;
  field?: string;
  [key: string]: unknown;
}

export async function logActivity(
  userId: string,
  action: ActivityAction,
  details?: ActivityDetails
) {
  try {
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await prisma.activityLog.create({
      data: {
        userId,
        action,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export async function logActivityWithContext(
  userId: string,
  action: ActivityAction,
  details?: ActivityDetails,
  context?: { ipAddress?: string; userAgent?: string }
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        details: details ? JSON.stringify(details) : null,
        ipAddress: context?.ipAddress || "unknown",
        userAgent: context?.userAgent || "unknown",
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export async function getUserActivityLogs(
  userId: string,
  options?: { limit?: number; offset?: number }
) {
  try {
    const session = await getSession();
    if (!session || (session.user.id !== userId && session.user.role !== "admin")) {
      return { success: false as const, error: "Unauthorized" };
    }

    const { limit = 50, offset = 0 } = options || {};

    const logs = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      success: true as const,
      data: logs.map((log) => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
      })),
    };
  } catch (error) {
    console.error("Failed to get activity logs:", error);
    return { success: false as const, error: "Failed to get activity logs" };
  }
}
