import type { Metadata } from "next";
import { SubmissionsContent } from "@/components/auditor/submissions-content";
import { getMySubmissions, getQuota } from "@/lib/auditor/mock-data";

export const metadata: Metadata = {
  title: "Mis envíos · Auditor de skills",
};

export default async function SubmissionsPage() {
  const [submissions, quota] = await Promise.all([
    getMySubmissions(),
    getQuota(),
  ]);
  return <SubmissionsContent submissions={submissions} quota={quota} />;
}
