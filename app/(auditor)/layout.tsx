import "./auditor.css";
import { SiteHeader } from "@/components/auditor";
import { AuditorTheme } from "@/components/auditor/ui/auditor-theme";
import { getSession } from "@/lib/auth";

export default async function AuditorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  return (
    <AuditorTheme fullHeight>
      <SiteHeader signedIn={Boolean(session)} />
      {children}
    </AuditorTheme>
  );
}
