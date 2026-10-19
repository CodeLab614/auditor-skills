"use server";

import * as z from "zod";
import { siteConfig } from "@/config/site";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  consumeUserInvitation,
  getValidUserInvitation,
  INVALID_INVITATION_MESSAGE,
} from "@/lib/user-invitations";
import { acceptInviteSchema } from "@/validations/auth";

const acceptInviteActionSchema = acceptInviteSchema.and(
  z.object({ token: z.string().min(1).max(512) }),
);

export const acceptInviteAction = async (
  values: z.infer<typeof acceptInviteSchema> & { token: string },
): Promise<{
  response: "success" | "error";
  message: string;
  data: null;
}> => {
  try {
    const validation = acceptInviteActionSchema.safeParse(values);
    if (!validation.success) {
      return {
        response: "error",
        message:
          validation.error?.issues[0]?.message ?? INVALID_INVITATION_MESSAGE,
        data: null,
      };
    }

    const invitation = await getValidUserInvitation(validation.data.token);
    if (!invitation) {
      return {
        response: "error",
        message: INVALID_INVITATION_MESSAGE,
        data: null,
      };
    }

    const context = await auth.$context;
    const passwordHash = await context.password.hash(validation.data.password);
    const consumed = await consumeUserInvitation(validation.data.token);

    if (!consumed || consumed.value !== invitation.userId) {
      return {
        response: "error",
        message: INVALID_INVITATION_MESSAGE,
        data: null,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: consumed.value },
      select: {
        id: true,
        emailVerified: true,
        accounts: {
          where: { providerId: "credential" },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!user || user.emailVerified || user.accounts.length > 0) {
      return {
        response: "error",
        message: INVALID_INVITATION_MESSAGE,
        data: null,
      };
    }

    await context.internalAdapter.createAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: passwordHash,
    });

    const acceptedAt = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          status: "active",
          termsAcceptedAt: acceptedAt,
          termsVersion: siteConfig.termsVersion,
        },
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "terms_accepted",
          details: JSON.stringify({ version: siteConfig.termsVersion }),
          ipAddress: "unknown",
          userAgent: "unknown",
        },
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "invitation_accepted",
          details: null,
          ipAddress: "unknown",
          userAgent: "unknown",
        },
      }),
    ]);

    return {
      response: "success",
      message: "Invitation accepted. You can now sign in with your password.",
      data: null,
    };
  } catch (error) {
    console.error("Accept invitation error:", error);
    return {
      response: "error",
      message: "Failed to accept invitation",
      data: null,
    };
  }
};
