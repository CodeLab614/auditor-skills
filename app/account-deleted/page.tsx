import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: `Account deleted | ${siteConfig.appName}`,
};

export default function AccountDeletedPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <AuthCard
          title="Your account has been deleted"
          description="Your account and associated data have been removed. A confirmation email is on its way."
        >
          <div className="flex flex-col items-center gap-5 py-2 text-center">
            <span className="flex size-12 items-center justify-center rounded-full border border-border bg-muted text-foreground">
              <Check className="size-5" aria-hidden="true" />
            </span>
            <p className="text-sm text-muted-foreground">Thank you for using {siteConfig.appName}.</p>
            <Button asChild className="w-full">
              <Link href="/">Return to home</Link>
            </Button>
          </div>
        </AuthCard>
      </div>
    </main>
  );
}
