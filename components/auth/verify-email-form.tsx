"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthCard, AuthLink } from "./auth-card";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { resendVerificationEmailAction } from '@/actions/auth';

interface VerifyEmailFormProps {
  email?: string;
}

export function VerifyEmailForm({
  email = "your email",
}: VerifyEmailFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!email || email === 'your email') return;

    setIsPending(true);

    const result = await resendVerificationEmailAction(email);

    if (result.response === 'error') {
      toast.error(result.message);
    } else {
      toast.success(result.message);
      setResendCooldown(60);
    }

    setIsPending(false);
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
        <div className="w-16 h-16 bg-primary/10 border border-primary/20 flex items-center justify-center">
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
            disabled={isPending || resendCooldown > 0}
          >
            {isPending ? (
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
