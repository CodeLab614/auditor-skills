import { DashboardShell } from "@/components/dashboard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In a real app, you would fetch user data here from your auth system
  const user = {
    name: "Admin User",
    email: "admin@example.com",
    role: "Admin",
  };

  return (
    <DashboardShell user={user} brandName="R A P I D">
      {children}
    </DashboardShell>
  );
}
