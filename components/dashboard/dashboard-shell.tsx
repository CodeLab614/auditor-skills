"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar, type NavSection, type UserProfile } from "./sidebar";
import { Header } from "./header";
import {
  LayoutDashboard,
  Users,
  UserCircle,
} from "lucide-react";

const navigation: NavSection[] = [
  {
    title: "Menu",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Users", href: "/dashboard/users", icon: Users },
    ],
  },
  {
    title: "Account",
    items: [
      { title: "Profile", href: "/dashboard/profile", icon: UserCircle },
    ],
  },
];

interface DashboardShellProps {
  children: React.ReactNode;
  user?: UserProfile;
  brandName?: string;
}

export function DashboardShell({
  children,
  user = {
    name: "Admin User",
    email: "admin@example.com",
    role: "Admin",
  },
  brandName = "R A P I D",
}: DashboardShellProps) {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/");
  };

  const sidebarProps = {
    brandName,
    navigation,
    user,
    onLogout: handleLogout,
  };

  return (
    <div className="h-screen overflow-hidden flex bg-background">
      <Sidebar {...sidebarProps} />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header sidebarProps={sidebarProps} searchPlaceholder="Search users..." />
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative z-0">
          <div className="max-w-7xl mx-auto flex flex-col gap-10">
            {children}
            <div className="h-10" />
          </div>
        </div>
      </main>
    </div>
  );
}
