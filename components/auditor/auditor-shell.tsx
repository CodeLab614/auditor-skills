import "@/app/(auditor)/auditor.css";
import { SiteHeader } from "@/components/auditor/site-header";
import { AuditorTheme } from "@/components/auditor/ui/auditor-theme";
import { getSession } from "@/lib/auth";

export async function AuditorShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <AuditorTheme fullHeight>
      <SiteHeader signedIn={Boolean(session)} />
      {children}
    </AuditorTheme>
  );
}
