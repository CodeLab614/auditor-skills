export const TEMPORARY_PASSWORD_LIFETIME_HOURS = 72;
export const TEMPORARY_PASSWORD_LIFETIME_MS =
  TEMPORARY_PASSWORD_LIFETIME_HOURS * 60 * 60 * 1000;

export const TEMPORARY_PASSWORD_EXPIRED_MESSAGE =
  "Your temporary password has expired. Ask an administrator for a new one.";

export function getTemporaryPasswordExpiration(now = new Date()): Date {
  return new Date(now.getTime() + TEMPORARY_PASSWORD_LIFETIME_MS);
}

export function hasExpiredTemporaryPassword(
  user: {
    mustChangePassword: boolean;
    temporaryPasswordExpiresAt: Date | null;
  },
  now = new Date(),
): boolean {
  return (
    user.mustChangePassword &&
    user.temporaryPasswordExpiresAt !== null &&
    user.temporaryPasswordExpiresAt.getTime() <= now.getTime()
  );
}
