import { LoginForm } from "@/components/auth";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; provider?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { error, provider } = await searchParams;
  const normalizedError = error?.toLowerCase().replaceAll('_', ' ');
  const oauthSignupDisabled = normalizedError?.includes('signup disabled');
  const oauthSignupDisabledProvider = oauthSignupDisabled
    ? provider === 'github'
      ? 'GitHub'
      : provider === 'google'
        ? 'Google'
        : undefined
    : undefined;

  return <LoginForm oauthSignupDisabledProvider={oauthSignupDisabledProvider} />;
}
