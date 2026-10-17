// Internal helper; it must not live in a "use server" file because its exports would be public endpoints.

import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

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
