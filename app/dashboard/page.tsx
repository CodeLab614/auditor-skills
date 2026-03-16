import { DashboardContent } from "@/components/dashboard";

// This would come from your database in a real app
async function getDashboardData() {
  const metrics = {
    totalUsers: 2847,
    totalUsersChange: 12.5,
    activeUsers: 2134,
    activeUsersChange: 8.2,
    inactiveUsers: 713,
    inactiveUsersChange: 3.1,
    newThisMonth: 156,
    newThisMonthChange: 24.3,
  };

  const chartData = [
    120, 145, 132, 178, 165, 198,
    210, 245, 220, 267, 234, 289,
  ];

  const recentUsers = [
    {
      id: "1",
      name: "Elena Rostova",
      email: "elena@example.com",
      role: "admin",
      status: "active",
      createdAt: "Mar 14, 2025",
    },
    {
      id: "2",
      name: "Marcus Chen",
      email: "marcus@example.com",
      role: "user",
      status: "active",
      createdAt: "Mar 14, 2025",
    },
    {
      id: "3",
      name: "Sarah Jenkins",
      email: "sarah@example.com",
      role: "user",
      status: "pending",
      createdAt: "Mar 13, 2025",
    },
    {
      id: "4",
      name: "David O'Connor",
      email: "david@example.com",
      role: "user",
      status: "inactive",
      createdAt: "Mar 12, 2025",
    },
    {
      id: "5",
      name: "Ana Martinez",
      email: "ana@example.com",
      role: "moderator",
      status: "active",
      createdAt: "Mar 11, 2025",
    },
  ];

  return { metrics, chartData, recentUsers };
}

export default async function DashboardPage() {
  const { metrics, chartData, recentUsers } = await getDashboardData();

  return (
    <DashboardContent
      metrics={metrics}
      chartData={chartData}
      recentUsers={recentUsers}
    />
  );
}
