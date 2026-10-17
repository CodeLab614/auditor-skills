import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { headers } from "next/headers";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  databaseHooks: {
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
