"use server";

import * as z from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const socialRegistrationSchema = z.object({
  acceptTerms: z.literal(true, {
    error: "You must accept the terms and conditions",
  }),
});

type SocialProvider = "google" | "github";
type SocialActionResponse = {
  response: "success" | "error";
  message: string;
  data: null;
};

async function startSocialAuth(
  provider: SocialProvider,
  options: { requestSignUp: boolean; registrationValues?: unknown },
): Promise<SocialActionResponse> {
  if (options.requestSignUp) {
    const parsed = socialRegistrationSchema.safeParse(
      options.registrationValues,
    );

    if (!parsed.success) {
      return {
        response: "error",
        message:
          parsed.error.issues[0]?.message ??
          "You must accept the terms and conditions",
        data: null,
      };
    }
  }

  let url: string | undefined;

  try {
    const result = await auth.api.signInSocial({
      body: {
        provider,
        callbackURL: "/dashboard",
        errorCallbackURL: options.requestSignUp
          ? "/auth/register"
          : `/auth/login?provider=${provider}`,
        ...(options.requestSignUp
          ? {
              requestSignUp: true,
              additionalData: { termsAccepted: true },
            }
          : {}),
      },
      headers: await headers(),
    });
    url = result.url;
  } catch (error) {
    console.error(`Failed to authenticate with ${provider}:`, error);
    return {
      response: "error",
      message: `Failed to authenticate with ${provider === "google" ? "Google" : "GitHub"}`,
      data: null,
    };
  }

  if (url) redirect(url);

  return {
    response: "success",
    message: "Authentication started",
    data: null,
  };
}

export async function signInWithGoogle(): Promise<SocialActionResponse> {
  return startSocialAuth("google", { requestSignUp: false });
}

export async function signInWithGithub(): Promise<SocialActionResponse> {
  return startSocialAuth("github", { requestSignUp: false });
}

export async function signUpWithGoogle(
  values: unknown,
): Promise<SocialActionResponse> {
  return startSocialAuth("google", {
    requestSignUp: true,
    registrationValues: values,
  });
}

export async function signUpWithGithub(
  values: unknown,
): Promise<SocialActionResponse> {
  return startSocialAuth("github", {
    requestSignUp: true,
    registrationValues: values,
  });
}
