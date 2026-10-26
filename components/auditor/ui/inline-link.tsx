import Link from "next/link";
import type { ComponentProps } from "react";

export function InlineLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={["auditor-inline-link", className].filter(Boolean).join(" ")} />;
}
