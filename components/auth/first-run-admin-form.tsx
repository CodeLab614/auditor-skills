"use client";

import { useTransition } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import type { RegisterFormData } from "@/validations/auth";
import { startFirstAdminWithGithubAction } from "@/actions/auth";
import {
  FIRST_RUN_ADMIN_EXISTS_MESSAGE,
  FIRST_RUN_CLOSED_MESSAGE,
} from "@/lib/first-run-admin-messages";

import { AuthCard } from "./auth-card";
import { TermsAcceptanceField } from "./register-fields";
import { GitHubIcon } from "@/components/dashboard/users/provider-icons";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form } from "@/components/ui/form";

export function FirstRunAdminForm({
  githubEnabled,
}: {
  githubEnabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<RegisterFormData>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });
  const acceptedTerms = form.watch("acceptTerms");

  const handleGithubSignIn = () => {
    startTransition(async () => {
      const result = await startFirstAdminWithGithubAction({
        acceptTerms: acceptedTerms,
      });
      if (result.response === "error") {
        toast.error(result.message);
        if (
          result.message === FIRST_RUN_CLOSED_MESSAGE ||
          result.message === FIRST_RUN_ADMIN_EXISTS_MESSAGE
        ) {
          router.refresh();
        }
      }
    });
  };

  return (
    <AuthCard
      title="Create your admin account"
      description="This is the first run. The GitHub account you create here will manage the app."
    >
      <Form {...form}>
        <div className="space-y-4">
          <TermsAcceptanceField form={form} disabled={isPending} />
          {githubEnabled ? (
            <Button
              type="button"
              className="w-full"
              disabled={isPending || !acceptedTerms}
              onClick={handleGithubSignIn}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to GitHub...
                </>
              ) : (
                <>
                  <GitHubIcon className="mr-2 h-4 w-4" />
                  Create the administrator with GitHub
                </>
              )}
            </Button>
          ) : (
            <Alert>
              <AlertDescription>
                GitHub sign-in is not configured. Set GITHUB_CLIENT_ID and
                GITHUB_CLIENT_SECRET.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Form>
    </AuthCard>
  );
}

export function FirstRunClosed() {
  return (
    <AuthCard
      title="Setup window closed"
      description="The admin account was not created in time."
    >
      <Alert>
        <AlertDescription>
          For security, this screen closes 15 minutes after the app starts.
          Restart the app to open it again, then reload this page.
        </AlertDescription>
      </Alert>
    </AuthCard>
  );
}
