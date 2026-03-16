"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthCard, AuthLink } from "./auth-card";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle, RefreshCw } from "lucide-react";

interface VerifyEmailFormProps {
  email?: string;
}

export function VerifyEmailForm({ email = "your email" }: VerifyEmailFormProps) {
  const router = useRouter();
  const [isResending, setIsResending] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    setIsResending(true);

    try {
      // TODO: Implement resend verification email with Better Auth
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setResendCooldown(60);
    } catch (error) {
      console.error("Resend failed:", error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthCard
      title="Verify your email"
      description="We've sent a verification link to your email"
      footer={
        <>
          Wrong email?{" "}
          <AuthLink href="/auth/register">Use a different email</AuthLink>
        </>
      }
    >
      <div className="flex flex-col items-center py-4 space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Mail className="h-8 w-8 text-primary" strokeWidth={1.5} />
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            We sent a verification link to
          </p>
          <p className="font-medium">{email}</p>
          <p className="text-sm text-muted-foreground">
            Click the link in the email to verify your account.
          </p>
        </div>

        <div className="w-full space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend verification email
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push("/auth/login")}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    </AuthCard>
  );
}

interface EmailVerifiedProps {
  onContinue?: () => void;
}

export function EmailVerified({ onContinue }: EmailVerifiedProps) {
  const router = useRouter();

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <AuthCard
      title="Email verified!"
      description="Your email has been successfully verified"
    >
      <div className="flex flex-col items-center py-4 space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-emerald-400" strokeWidth={1.5} />
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Thank you for verifying your email address. You can now access all features.
        </p>

        <Button className="w-full" onClick={handleContinue}>
          Continue to dashboard
        </Button>
      </div>
    </AuthCard>
  );
}
