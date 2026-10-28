import { verdictLabel } from "@/lib/auditor/labels";
import type { Verdict } from "@/lib/auditor/types";
import { cn } from "@/lib/utils";

export interface VerdictMarkProps {
  verdict: Verdict;
  className?: string;
}

export function VerdictMark({ verdict, className }: VerdictMarkProps) {
  return (
    <span
      className={cn(
        "auditor-verdict-mark",
        `auditor-verdict-mark--${verdict}`,
        className,
      )}
    >
      <span className="auditor-verdict-mark__square" aria-hidden="true" />
      <span className="auditor-mono-label auditor-verdict-mark__label">
        {verdictLabel[verdict]}
      </span>
    </span>
  );
}
