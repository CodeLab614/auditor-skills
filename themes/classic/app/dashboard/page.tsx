import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardMetrics, getUserData } from "@/actions/dashboard";
import { DashboardContent, UserWelcome } from "@/components/dashboard";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const isAdmin = session.user.role === "admin";

  if (isAdmin) {
    const result = await getDashboardMetrics();

    if (result.response === 'error' || !result.data) {
      return (
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">{result.message}</p>
        </div>
      );
    }

    return (
      <DashboardContent
        metrics={result.data.metrics}
        chartData={result.data.chartData}
        recentUsers={result.data.recentUsers}
      />
    );
  }

  // For non-admin users, show welcome page
  const result = await getUserData(session.user.id);

  if (result.response === 'error' || !result.data) {
    redirect("/auth/login");
  }

  return <UserWelcome user={result.data} />;
}
