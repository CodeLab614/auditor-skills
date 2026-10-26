'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { signInWithGithub } from '@/actions/auth';
import { GitHubIcon } from '@/components/dashboard/users/provider-icons';
import { AuthCard, AuthLink } from './auth-card';
import { SupportLink } from './support-link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function LoginForm({
  oauthSignupDisabledProvider,
  notice,
  githubEnabled = false,
}: {
  oauthSignupDisabledProvider?: 'Google' | 'GitHub';
  notice?: string;
  githubEnabled?: boolean;
}) {
  const [isPending, setIsPending] = React.useState(false);

  const handleGithubSignIn = async () => {
    setIsPending(true);
    const result = await signInWithGithub();
    if (result.response === 'error') {
      toast.error(result.message);
      setIsPending(false);
    }
  };

  return (
    <AuthCard
      title="Sign in with your GitHub account"
      footer={
        <div className="space-y-2">
          <div>
            Don&apos;t have an account?{' '}
            <AuthLink href="/auth/register">Sign up</AuthLink>
          </div>
          <SupportLink />
        </div>
      }
    >
      {notice && (
        <Alert className="mb-4">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {oauthSignupDisabledProvider && (
        <Alert className="mb-4">
          <AlertDescription>
            No account found for this {oauthSignupDisabledProvider} account.{' '}
            <AuthLink href="/auth/register">Create one first</AuthLink>.
          </AlertDescription>
        </Alert>
      )}
      {githubEnabled ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isPending}
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
    </AuthCard>
  );
}
