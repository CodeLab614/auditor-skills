import { createHash } from "node:crypto";

export const USER_INVITATION_PREFIX = "user-invite:";
export const USER_INVITATION_LIFETIME_DAYS = 7;
export const USER_INVITATION_LIFETIME_MS =
  USER_INVITATION_LIFETIME_DAYS * 24 * 60 * 60 * 1000;

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getInvitationIdentifier(token: string): string {
  return `${USER_INVITATION_PREFIX}${hashInvitationToken(token)}`;
}

export function getInvitationExpiration(now = new Date()): Date {
  return new Date(now.getTime() + USER_INVITATION_LIFETIME_MS);
}

export function isInvitationExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
