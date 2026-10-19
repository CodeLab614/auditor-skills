import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ChangeTemporaryPasswordForm } from "@/components/auth";
import { auth, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasExpiredTemporaryPassword } from "@/lib/temporary-password";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      mustChangePassword: true,
      temporaryPasswordExpiresAt: true,
    },
  });

  if (!user) {
    await auth.api.signOut({ headers: await headers() });
    redirect("/auth/login");
  }

  if (hasExpiredTemporaryPassword(user)) {
    await auth.api.signOut({ headers: await headers() });
    redirect("/auth/login?notice=temporary-password-expired");
  }

  if (!user.mustChangePassword) redirect("/dashboard");

  return <ChangeTemporaryPasswordForm />;
}
