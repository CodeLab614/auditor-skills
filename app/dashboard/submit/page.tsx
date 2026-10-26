import type { Metadata } from "next";
import { getQuota } from "@/lib/auditor/mock-data";
import { SubmitContent } from "@/components/auditor/submit-content";

export const metadata: Metadata = {
  title: "Enviar una skill · Auditor de skills",
};

export default async function SubmitPage() {
  return <SubmitContent quota={await getQuota()} />;
}
