import type { ReactNode } from "react";

export function TextHighlight({ children }: { children: ReactNode }) {
  return <span className="auditor-highlight">{children}</span>;
}
