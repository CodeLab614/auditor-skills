import type { ReactNode } from "react";
import { Heading, type HeadingLevel } from "./heading";

export function SectionHeader({
  label,
  title,
  trailing,
  as = "h2",
}: {
  label: ReactNode;
  title: ReactNode;
  trailing?: ReactNode;
  as?: HeadingLevel;
}) {
  return (
    <header className="auditor-section-header">
      <span className="auditor-mono-label">{label}</span>
      <Heading as={as} size="normal">{title}</Heading>
      {trailing && <span className="auditor-mono-label">{trailing}</span>}
    </header>
  );
}
