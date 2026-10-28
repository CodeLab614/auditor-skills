import type { Metadata } from "next";
import { redirectToFirstRunIfNoAdmin } from "@/lib/first-run-admin";
import { AuditorShell } from "@/components/auditor/auditor-shell";
import { HomeContent } from "@/components/auditor/home-content";
import { getHomeStats } from "@/lib/auditor/queries";

export const metadata: Metadata = {
  title: "Auditor de skills",
};

export default async function Home() {
  await redirectToFirstRunIfNoAdmin();

  return (
    <AuditorShell>
      <HomeContent stats={await getHomeStats()} />
    </AuditorShell>
  );
}
