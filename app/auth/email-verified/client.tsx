"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { verifyEmailAction } from "@/actions/auth";
import { CheckCircle, MailCheck, XCircle } from "lucide-react";

interface EmailVerifiedClientProps {
  token: string;
}

type VerificationStatus = "confirm" | "already" | "error";
const fallbackErrorMessage =
  "The verification link is invalid or has expired. Please request a new verification email.";

export function EmailVerifiedClient({ token }: EmailVerifiedClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus>("confirm");
  const [errorMessage, setErrorMessage] = useState(fallbackErrorMessage);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (status === "already") {
      const timer = setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  const handleVerify = () => {
    startTransition(async () => {
      try {
        const result = await verifyEmailAction(token);

        if (result.response === "error" || !result.data) {
          setErrorMessage(result.response === "error" ? result.message : fallbackErrorMessage);
          setStatus("error");
          return;
        }

        if (result.data.signedIn) {
          router.push("/dashboard");
          router.refresh();
          return;
        }

        setStatus("already");
      } catch {
        setErrorMessage(fallbackErrorMessage);
        setStatus("error");
      }
    });
  };

  if (status === "already") {
    return (
      <AuthCard
        title="Already verified"
        description="Your email has already been verified"
      >
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="flex size-16 items-center justify-center border border-primary/20 bg-primary/10">
            <CheckCircle className="size-8 text-primary" strokeWidth={1.5} />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Redirecting you to sign in...
          </p>

          <Button className="w-full" onClick={() => router.push("/auth/login")}>
            Go to sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (status === "error") {
    return (
      <AuthCard
        title="Verification failed"
        description="We couldn't verify your email"
      >
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="flex size-16 items-center justify-center border border-destructive/20 bg-destructive/10">
            <XCircle className="size-8 text-destructive" strokeWidth={1.5} />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {errorMessage}
          </p>

          <Button className="w-full" onClick={() => router.push("/auth/login")}>
            Back to sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Confirm your email"
      description="Confirm your email address to finish creating your account"
    >
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="flex size-16 items-center justify-center border border-primary/20 bg-primary/10">
          <MailCheck className="size-8 text-primary" strokeWidth={1.5} />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Click below to verify your email address and continue to your dashboard.
        </p>

        <Button className="w-full" disabled={isPending} onClick={handleVerify}>
          {isPending ? "Verifying..." : "Verify email"}
        </Button>
      </div>
    </AuthCard>
  );
}
