"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { siteConfig } from "@/config/site";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/report-error";
import { acceptTermsSchema } from "@/validations/auth";

export const acceptTermsAction = async (
  values: z.infer<typeof acceptTermsSchema>,
): Promise<{
  response: "success" | "error";
  message: string;
  data: null;
}> => {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        response: "error",
        message: "Unauthorized",
        data: null,
      };
    }

    const parsed = acceptTermsSchema.safeParse(values);
    if (!parsed.success) {
      return {
        response: "error",
        message:
          parsed.error.issues[0]?.message ??
          "You must accept the terms and conditions",
        data: null,
      };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        termsAcceptedAt: new Date(),
        termsVersion: siteConfig.termsVersion,
      },
    });
    await logActivity(session.user.id, "terms_accepted", {
      version: siteConfig.termsVersion,
    });
    revalidatePath("/dashboard", "layout");

    return {
      response: "success",
      message: "Terms accepted",
      data: null,
    };
  } catch (error) {
    reportError(error, { area: "auth.accept-terms" });
    return {
      response: "error",
      message: "Failed to save your acceptance",
      data: null,
    };
  }
};
