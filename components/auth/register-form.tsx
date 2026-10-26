'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { signUpWithGithub } from '@/actions/auth';
import { GitHubIcon } from '@/components/dashboard/users/provider-icons';
import type { RegisterFormData } from '@/validations/auth';
import { AuthCard, AuthLink } from './auth-card';
import { SupportLink } from './support-link';
import { TermsAcceptanceField } from './register-fields';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form } from '@/components/ui/form';

export function RegisterForm({
  githubEnabled = false,
}: {
  githubEnabled?: boolean;
}) {
  const [isPending, setIsPending] = React.useState(false);
  const form = useForm<RegisterFormData>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });
  const acceptedTerms = form.watch('acceptTerms');

  const handleGithubSignIn = async () => {
    setIsPending(true);
    const result = await signUpWithGithub({ acceptTerms: acceptedTerms });
    if (result.response === 'error') {
      toast.error(result.message);
      setIsPending(false);
    }
  };

  return (
    <AuthCard
      title="Create an account"
      description="Continue with your GitHub account"
      footer={
        <div className="space-y-2">
          <div>
            Already have an account?{' '}
            <AuthLink href="/auth/login">Sign in</AuthLink>
          </div>
          <SupportLink />
        </div>
      }
    >
      <Form {...form}>
        <form className="flex flex-col gap-4">
          <TermsAcceptanceField form={form} disabled={isPending} />
          {githubEnabled ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isPending || !acceptedTerms}
              onClick={handleGithubSignIn}
            >
              <GitHubIcon className="mr-2 h-4 w-4" />
              Continue with GitHub
            </Button>
          ) : (
            <Alert>
              <AlertDescription>
                GitHub sign-in is not configured. Set GITHUB_CLIENT_ID and
                GITHUB_CLIENT_SECRET.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </Form>
    </AuthCard>
  );
}
