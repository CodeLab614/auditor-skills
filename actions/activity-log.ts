"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function getUserActivityLogs(
  userId: string,
  options?: { limit?: number; offset?: number }
) {
  try {
    const session = await getSession();
    if (!session || (session.user.id !== userId && session.user.role !== "admin")) {
      return { success: false as const, error: "Unauthorized" };
    }

    const requestedLimit = options?.limit ?? 50;
    const requestedOffset = options?.offset ?? 0;
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(100, Math.max(1, Math.trunc(requestedLimit)))
      : 50;
    const offset = Number.isFinite(requestedOffset)
      ? Math.max(0, Math.trunc(requestedOffset))
      : 0;

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
