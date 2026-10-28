import { AuditorShell } from "@/components/auditor/auditor-shell";

export default function AuditorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AuditorShell>{children}</AuditorShell>;
}
