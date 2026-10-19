import { betterAuth } from "better-auth";
import {
  addOAuthServerContext,
  APIError,
  createAuthMiddleware,
  getOAuthState,
} from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { siteConfig } from "@/config/site";
import { prisma } from "@/lib/prisma";
import {
  sendAccountDeletedEmail,
  sendResetPasswordEmail,
  sendSecurityNoticeEmail,
  sendVerificationEmail,
} from "@/lib/email";
import { deleteStoredAvatar } from "@/lib/storage/avatar";
import { createSocialProviders } from "@/lib/social-providers";
import {
  resolveTermsAcceptance,
  TERMS_ACCEPTANCE_HEADER,
} from "@/lib/terms-acceptance";
import { cookies, headers } from "next/headers";

// Keep auth email links on the configured application origin.
const baseURL = process.env.BETTER_AUTH_URL;

if (!baseURL) {
  throw new Error(
    "BETTER_AUTH_URL is required because auth email links would use the request Host without it."
  );
}

let parsedBaseURL: URL;

try {
  parsedBaseURL = new URL(baseURL);
} catch {
  throw new Error("BETTER_AUTH_URL must be a valid HTTP or HTTPS URL.");
}

if (parsedBaseURL.protocol !== "http:" && parsedBaseURL.protocol !== "https:") {
  throw new Error("BETTER_AUTH_URL must be a valid HTTP or HTTPS URL.");
}

export const auth = betterAuth({
  baseURL,
  rateLimit: { enabled: true, storage: "database" },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path !== "/sign-in/social") return;

      const additionalData = context.body?.additionalData as
        | Record<string, unknown>
        | undefined;

      if (
        context.body?.requestSignUp === true &&
        additionalData?.termsAccepted === true
      ) {
        await addOAuthServerContext({ termsAccepted: true });
      }
    }),
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  databaseHooks: {
    account: {
      create: {
        before: async (account) => {
          if (account.providerId === "credential") return;

          const user = await prisma.user.findUnique({
            where: { id: account.userId },
            select: { emailVerified: true },
          });

          if (!user || user.emailVerified) return;

          // OAuth proves email ownership; the prior unverified password is not trustworthy.
          const removedCredentials = await prisma.account.deleteMany({
            where: {
              userId: account.userId,
              providerId: "credential",
            },
          });

          if (removedCredentials.count > 0) {
            await prisma.session.deleteMany({
              where: { userId: account.userId },
            });

            try {
              await prisma.activityLog.create({
                data: {
                  userId: account.userId,
                  action: "oauth_link",
                  details: JSON.stringify({
                    provider: account.providerId,
                    removedUnverifiedPassword: true,
                  }),
                  ipAddress: "unknown",
                  userAgent: "unknown",
                },
              });
            } catch (error) {
              console.error("Failed to log OAuth account linking activity:", error);
            }
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          // All sign-in paths create a session, making this the single enforcement point.
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { status: true },
          });

          if (user?.status === "inactive") {
            throw new APIError("FORBIDDEN", {
              message: "This account has been deactivated.",
            });
          }
        },
        after: async (session) => {
          // Log login activity when a new session is created
          try {
            await prisma.activityLog.create({
              data: {
                userId: session.userId,
                action: "login",
                details: null,
                ipAddress: session.ipAddress || "unknown",
                userAgent: session.userAgent || "unknown",
              },
            });
          } catch (error) {
            console.error("Failed to log login activity:", error);
          }
        },
      },
    },
    user: {
      create: {
        before: async (user, context) => {
          let source: "email" | "oauth" | null = null;
          let accepted: unknown;

          if (context?.path === "/sign-up/email") {
            source = "email";
            accepted =
              (context.request?.headers.get(TERMS_ACCEPTANCE_HEADER) ??
                context.headers?.get(TERMS_ACCEPTANCE_HEADER)) === "true";
          } else if (context?.path?.startsWith("/callback/")) {
            source = "oauth";
            accepted = (await getOAuthState())?.serverContext?.termsAccepted;
          }

          const acceptance = resolveTermsAcceptance({ source, accepted });
          if (!acceptance.termsAcceptedAt) return;

          return {
            data: {
              ...user,
              ...acceptance,
            },
          };
        },
        after: async (user) => {
          // Log registration activity when a new user is created
          try {
            await prisma.activityLog.create({
              data: {
                userId: user.id,
                action: "register",
                details: null,
                ipAddress: "unknown",
                userAgent: "unknown",
              },
            });
          } catch (error) {
            console.error("Failed to log registration activity:", error);
          }

          if (
            user.termsAcceptedAt &&
            user.termsVersion === siteConfig.termsVersion
          ) {
            try {
              await prisma.activityLog.create({
                data: {
                  userId: user.id,
                  action: "terms_accepted",
                  details: JSON.stringify({
                    version: siteConfig.termsVersion,
                  }),
                  ipAddress: "unknown",
                  userAgent: "unknown",
                },
              });
            } catch (error) {
              console.error("Failed to log terms acceptance activity:", error);
            }
          }
        },
      },
    },
  },
  socialProviders: createSocialProviders(process.env),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, token }) => {
      const resetUrl = new URL("/auth/reset-password", baseURL);
      resetUrl.searchParams.set("token", token);

      await sendResetPasswordEmail({
        email: user.email,
        name: user.name,
        url: resetUrl.toString(),
      });
    },
    onPasswordReset: async ({ user }) => {
      try {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "password_change",
            details: null,
            ipAddress: "unknown",
            userAgent: "unknown",
          },
        });
      } catch (error) {
        console.error("Failed to log password reset activity:", error);
      }

      try {
        await sendSecurityNoticeEmail({
          to: user.email,
          userName: user.name,
          event: 'password-reset',
          occurredAt: new Date(),
        });
      } catch (error) {
        console.error('Failed to send password reset security notice:', error);
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    afterEmailVerification: async (user) => {
      try {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "email_verified",
            details: null,
            ipAddress: "unknown",
            userAgent: "unknown",
          },
        });
      } catch (error) {
        console.error("Failed to log email verification activity:", error);
      }
    },
    sendVerificationEmail: async ({ user, url }) => {
      // Replace the callback URL to go to our custom verified page
      const verifiedUrl = url.replace(
        "/api/auth/verify-email",
        "/auth/email-verified"
      );
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        url: verifiedUrl,
      });
    },
  },
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const currentUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (currentUser?.role !== "admin") return;

        const otherActiveAdmins = await prisma.user.count({
          where: { role: "admin", status: "active", id: { not: user.id } },
        });

        if (otherActiveAdmins === 0) {
          throw new APIError("FORBIDDEN", {
            message: "You are the last administrator. Add another active administrator before deleting this account.",
          });
        }
      },
      afterDelete: async (user) => {
        try {
          await deleteStoredAvatar(user.image, user.id);
        } catch (error) {
          console.error("Failed to delete account avatar:", error);
        }

        try {
          await prisma.verification.deleteMany({
            where: { OR: [{ value: user.id }, { identifier: user.email }] },
          });
        } catch (error) {
          console.error("Failed to delete account verification records:", error);
        }

        try {
          await sendAccountDeletedEmail({
            email: user.email,
            name: user.name,
            deletedAt: new Date().toLocaleString("en-US", {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "UTC",
            }) + " UTC",
          });
        } catch (error) {
          console.error("Failed to send account deletion notice:", error);
        }
      },
    },
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        input: false,
      },
      termsAcceptedAt: {
        type: "date",
        required: false,
        input: false,
      },
      termsVersion: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  plugins: [
    twoFactor({
      issuer: "RapidAuth",
    }),
    nextCookies(),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

export async function getSession() {
  const requestHeaders = new Headers(await headers());
  // Better Auth 1.7 can rotate the session inside an action (for example, during TOTP setup verification); cookies() reflects the new cookie.
  const cookieHeader = (await cookies()).toString();

  if (cookieHeader) {
    requestHeaders.set("cookie", cookieHeader);
  } else {
    requestHeaders.delete("cookie");
  }

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });
  return session;
}
