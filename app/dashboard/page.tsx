import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { getDashboardMetrics, getUserData } from "@/actions/dashboard";
import { DashboardContent, UserWelcome } from "@/components/dashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const adminAccess = await getAdminAccess(session);

  if (adminAccess === 'admin') {
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

  if (adminAccess === 'two-factor-required') {
    return (
      <Alert>
        <AlertTitle>
          <h2>Two-factor authentication required</h2>
        </AlertTitle>
        <AlertDescription className="space-y-4">
          <p>
            Activate two-factor authentication in Profile → Security before
            using the admin panel.
          </p>
          <Button asChild>
            <Link href="/dashboard/profile">Open Profile</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // For non-admin users, show welcome page
  const result = await getUserData();

  if (result.response === 'error' || !result.data) {
    redirect("/auth/login");
  }

  return <UserWelcome user={result.data} />;
}
