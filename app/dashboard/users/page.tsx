import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { getUsers } from "@/actions/users";
import { UsersContent } from "@/components/dashboard";

export default async function UsersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  if ((await getAdminAccess(session)) !== 'admin') {
    redirect("/dashboard");
  }

  const result = await getUsers();

  if (result.response === 'error' || !result.data) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{result.message}</p>
      </div>
    );
  }

  return (
    <UsersContent
      users={result.data}
      isAdmin={true}
      currentUserId={session.user.id}
    />
  );
}
