import { redirect } from "next/navigation";
import { AcceptTermsForm } from "@/components/auth";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAcceptedCurrentTerms } from "@/lib/terms-acceptance";

export default async function AcceptTermsPage() {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const acceptance = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { termsAcceptedAt: true, termsVersion: true },
  });

  if (acceptance && hasAcceptedCurrentTerms(acceptance)) {
    redirect("/dashboard");
  }

  return <AcceptTermsForm />;
}
