import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { getTakedownRequests } from "@/lib/auditor/mock-data";
import { TakedownsContent } from "@/components/auditor/admin/takedowns-content";

export const metadata: Metadata = {
  title: "Reclamaciones · Auditor de skills",
};

export default async function TakedownsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if ((await getAdminAccess(session)) !== "admin") redirect("/dashboard");
  return (
      <TakedownsContent requests={await getTakedownRequests()} />
  );
}
