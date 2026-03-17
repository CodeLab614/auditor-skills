"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface EmailVerifiedClientProps {
  verified: boolean;
  alreadyVerified: boolean;
}

export function EmailVerifiedClient({ verified, alreadyVerified }: EmailVerifiedClientProps) {
  const router = useRouter();

  // If already verified, redirect to login after a short delay
  useEffect(() => {
    if (alreadyVerified) {
      const timer = setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alreadyVerified, router]);

  if (alreadyVerified) {
    return (
      <AuthCard
        title="Already verified"
        description="Your email has already been verified"
      >
        <div className="flex flex-col items-center py-4 space-y-6">
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-primary" strokeWidth={1.5} />
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Redirecting you to sign in...
          </p>

          <Button className="w-full" onClick={() => router.push("/auth/login")}>
            Go to sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (verified) {
    return (
      <AuthCard
        title="Email verified!"
        description="Your email has been successfully verified"
      >
        <div className="flex flex-col items-center py-4 space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-emerald-400" strokeWidth={1.5} />
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Thank you for verifying your email address. You can now sign in to your account.
          </p>

          <Button className="w-full" onClick={() => router.push("/auth/login")}>
            Sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Verification failed"
      description="We couldn't verify your email"
    >
      <div className="flex flex-col items-center py-4 space-y-6">
        <div className="w-16 h-16 bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-destructive" strokeWidth={1.5} />
        </div>

        <p className="text-sm text-muted-foreground text-center">
          The verification link is invalid or has expired. Please request a new verification email.
        </p>

        <Button className="w-full" onClick={() => router.push("/auth/login")}>
          Back to sign in
        </Button>
      </div>
    </AuthCard>
  );
}
