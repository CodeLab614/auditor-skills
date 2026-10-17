import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getProfileData } from "@/actions/profile";
import { ProfileContent } from "@/components/dashboard";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const result = await getProfileData();

  if (result.response === 'error' || !result.data) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{result.message}</p>
      </div>
    );
  }

  return (
    <ProfileContent
      initialProfile={result.data.profile}
      twoFactorEnabled={result.data.twoFactorEnabled}
      isOAuthUser={result.data.isOAuthUser}
      activityLogs={result.data.activityLogs}
      sessions={result.data.sessions}
    />
  );
}
