"use client";

import * as React from "react";
import {
  PageHeader,
  MetricGrid,
  BarChart,
  DataTable,
  StatusBadge,
  createMonthlyData,
  type Column,
  type StatusType,
} from "@/components/dashboard";
import { Users, UserCheck, UserX, UserPlus } from "lucide-react";

interface RecentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface DashboardMetrics {
  totalUsers: number;
  totalUsersChange: number;
  activeUsers: number;
  activeUsersChange: number;
  inactiveUsers: number;
  inactiveUsersChange: number;
  newThisMonth: number;
  newThisMonthChange: number;
}

const userStatusMap: Record<string, { status: StatusType; label: string }> = {
  active: { status: "success", label: "Active" },
  pending: { status: "warning", label: "Pending" },
  inactive: { status: "error", label: "Inactive" },
};

const roleColors: Record<string, string> = {
  admin: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  moderator: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  user: "text-muted-foreground bg-muted border-border",
};

const columns: Column<RecentUser>[] = [
  {
    key: "name",
    header: "Name",
    render: (item) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{item.name}</span>
        <span className="text-xs text-muted-foreground">{item.email}</span>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (item) => (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-normal border capitalize ${
          roleColors[item.role] || roleColors.user
        }`}
      >
        {item.role}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (item) => {
      const config = userStatusMap[item.status] || { status: "neutral" as StatusType, label: item.status };
      return <StatusBadge status={config.status} label={config.label} />;
    },
  },
  {
    key: "createdAt",
    header: "Joined",
    render: (item) => (
      <span className="text-muted-foreground">{item.createdAt}</span>
    ),
  },
];

interface DashboardContentProps {
  metrics: DashboardMetrics;
  chartData: number[];
  recentUsers: RecentUser[];
}

export function DashboardContent({
  metrics,
  chartData,
  recentUsers,
}: DashboardContentProps) {
  const [dateRange, setDateRange] = React.useState("30d");
  const [chartTab, setChartTab] = React.useState("monthly");

  const formattedChartData = createMonthlyData(chartData);

  const metricCards = [
    {
      title: "Total Users",
      value: metrics.totalUsers,
      change: metrics.totalUsersChange,
      trend: "up" as const,
      icon: Users,
    },
    {
      title: "Active Users",
      value: metrics.activeUsers,
      change: metrics.activeUsersChange,
      trend: "up" as const,
      icon: UserCheck,
    },
    {
      title: "Inactive Users",
      value: metrics.inactiveUsers,
      change: metrics.inactiveUsersChange,
      trend: "down" as const,
      icon: UserX,
    },
    {
      title: "New This Month",
      value: metrics.newThisMonth,
      change: metrics.newThisMonthChange,
      trend: "up" as const,
      icon: UserPlus,
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your user base and activity."
        selectedDateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <MetricGrid metrics={metricCards} />

      <BarChart
        title="User Growth"
        description="New user registrations per month."
        data={formattedChartData}
        tabs={[
          { label: "Monthly", value: "monthly" },
          { label: "Weekly", value: "weekly" },
        ]}
        activeTab={chartTab}
        onTabChange={setChartTab}
        highlightIndex={11}
        formatValue={(value) => `${value} users`}
      />

      <DataTable
        title="Recent Users"
        description="Latest registered users on the platform."
        columns={columns}
        data={recentUsers}
        viewAllHref="/dashboard/users"
        viewAllLabel="View All Users"
      />
    </>
  );
}
