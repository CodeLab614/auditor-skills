"use client";

import * as React from "react";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/validations/auth';
import { forgotPasswordAction } from '@/actions/auth';

import { AuthCard, AuthLink } from "./auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [sentEmail, setSentEmail] = React.useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (values: ForgotPasswordFormData) => {
    startTransition(async () => {
      const result = await forgotPasswordAction(values);

      if (result.response === 'error') {
        toast.error(result.message);
        return;
      }

      setSentEmail(result.data?.email ?? values.email);
      toast.success(result.message);
    });
  };

  const handleResend = () => {
    if (sentEmail) {
      onSubmit({ email: sentEmail });
    }
  };

  if (sentEmail) {
    return (
      <AuthCard
        title="Check your email"
        description="We've sent a password reset link to your email"
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
        <div className="flex flex-col items-center py-4 space-y-4">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle
              className="h-6 w-6 text-emerald-400"
              strokeWidth={1.5}
            />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              We sent a password reset link to
            </p>
            <p className="font-medium">{sentEmail}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full mt-4"
            disabled={isPending}
            onClick={handleResend}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Didn't receive the email? Try again"
            )}
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password?"
      description="Enter your email and we'll send you a reset link"
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10"
                      disabled={isPending}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending link...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
