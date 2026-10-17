import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { headers } from "next/headers";

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
        },
      },
    },
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            mapProfileToUser: (profile: { picture: string }) => ({
              image: profile.picture,
            }),
          },
        }
      : {}),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            mapProfileToUser: (profile: { avatar_url: string }) => ({
              image: profile.avatar_url,
            }),
          },
        }
      : {}),
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
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
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
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
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}
