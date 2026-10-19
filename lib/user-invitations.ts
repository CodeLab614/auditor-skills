import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getInvitationExpiration,
  getInvitationIdentifier,
  USER_INVITATION_PREFIX,
} from "@/lib/user-invitation-token";

export {
  getInvitationExpiration,
  getInvitationIdentifier,
  hashInvitationToken,
  isInvitationExpired,
  USER_INVITATION_LIFETIME_DAYS,
  USER_INVITATION_LIFETIME_MS,
  USER_INVITATION_PREFIX,
} from "@/lib/user-invitation-token";

export const INVALID_INVITATION_MESSAGE =
  "This invitation link is invalid, expired, or has already been used.";

export function getInvitationUrl(token: string): string {
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl) throw new Error("BETTER_AUTH_URL is required for invitation links.");

  const invitationUrl = new URL("/auth/accept-invite", baseUrl);
  invitationUrl.searchParams.set("token", token);
  return invitationUrl.toString();
}

export async function issueUserInvitation(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const identifier = getInvitationIdentifier(token);

  await prisma.$transaction(
    async (transaction) => {
      await transaction.verification.deleteMany({
        where: {
          value: userId,
          identifier: { startsWith: USER_INVITATION_PREFIX },
        },
      });
      await transaction.verification.create({
        data: {
          identifier,
          value: userId,
          expiresAt: getInvitationExpiration(),
        },
      });
    },
    { isolationLevel: "Serializable" },
  );

  return token;
}

export async function getValidUserInvitation(token: string) {
  if (!token) return null;

  const invitation = await prisma.verification.findFirst({
    where: {
      identifier: getInvitationIdentifier(token),
      expiresAt: { gt: new Date() },
    },
    select: { value: true, expiresAt: true },
  });

  if (!invitation) return null;

  const user = await prisma.user.findUnique({
    where: { id: invitation.value },
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

  if (!user || user.emailVerified || user.accounts.length > 0) return null;

  return { userId: user.id, expiresAt: invitation.expiresAt };
}

export async function consumeUserInvitation(token: string) {
  if (!token) return null;

  const context = await auth.$context;
  return context.internalAdapter.consumeVerificationValue(
    getInvitationIdentifier(token),
  );
}
