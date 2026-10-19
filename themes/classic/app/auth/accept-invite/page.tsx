import { AuthCard, AuthLink, AcceptInviteForm } from "@/components/auth";
import { getValidUserInvitation } from "@/lib/user-invitations";

interface AcceptInvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps) {
  const { token } = await searchParams;
  const invitation = token ? await getValidUserInvitation(token) : null;

  if (!token || !invitation) {
    return (
      <AuthCard
        title="Invitation unavailable"
        description="This invitation link is invalid, expired, or has already been used."
      >
        <p className="text-center text-sm text-muted-foreground">
          Ask an administrator to resend the invitation, or go to the{" "}
          <AuthLink href="/auth/login">sign-in page</AuthLink>.
        </p>
      </AuthCard>
    );
  }

  return <AcceptInviteForm token={token} />;
}
