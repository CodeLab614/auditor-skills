import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { getActivityLogs } from "@/actions/activity";
import { ActivityLogsContent } from "@/components/dashboard/activity-logs-content";

export default async function ActivityPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  if ((await getAdminAccess(session)) !== 'admin') {
    redirect("/dashboard");
  }

  const result = await getActivityLogs();

  if (result.response === 'error' || !result.data) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{result.message}</p>
      </div>
    );
  }

  return <ActivityLogsContent logs={result.data} />;
}
