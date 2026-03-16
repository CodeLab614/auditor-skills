"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthCard, AuthLink } from "./auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2, ArrowLeft } from "lucide-react";

export function TwoFactorForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [code, setCode] = React.useState(["", "", "", "", "", ""]);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const chars = value.slice(0, 6).split("");
      const newCode = [...code];
      chars.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);
      const nextIndex = Math.min(index + chars.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");

    if (fullCode.length !== 6) {
      alert("Please enter a 6-digit code");
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement 2FA verification with Better Auth
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/dashboard");
    } catch (error) {
      console.error("2FA verification failed:", error);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseBackupCode = () => {
    // TODO: Implement backup code flow
    console.log("Use backup code");
  };

  return (
    <AuthCard
      title="Two-factor authentication"
      description="Enter the 6-digit code from your authenticator app"
      footer={
        <>
          <AuthLink href="/auth/login">
            <span className="inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </span>
          </AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" strokeWidth={1.5} />
          </div>

          <div className="space-y-2 w-full">
            <Label htmlFor="code-0" className="sr-only">
              Verification code
            </Label>
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  id={`code-${index}`}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-medium"
                  disabled={isLoading}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleUseBackupCode}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Use a backup code instead
          </button>
        </div>
      </form>
    </AuthCard>
  );
}

export function TwoFactorBackupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [backupCode, setBackupCode] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement backup code verification with Better Auth
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/dashboard");
    } catch (error) {
      console.error("Backup code verification failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Use backup code"
      description="Enter one of your backup codes to sign in"
      footer={
        <>
          <AuthLink href="/auth/two-factor">
            <span className="inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Use authenticator app
            </span>
          </AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="backupCode">Backup Code</Label>
          <Input
            id="backupCode"
            type="text"
            placeholder="XXXX-XXXX-XXXX"
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
            className="text-center font-mono tracking-wider"
            required
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground text-center">
            Backup codes are single-use and cannot be reused.
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify backup code"
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
