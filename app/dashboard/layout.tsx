import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  // Get user image from database
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  const user = {
    name: session.user.name,
    email: session.user.email,
    role: session.user.role ?? "User",
    avatar: dbUser?.image ?? session.user.image ?? undefined,
  };

  return (
    <DashboardShell user={user} brandName="R A P I D">
      {children}
    </DashboardShell>
  );
}
