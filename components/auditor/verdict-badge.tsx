import { Chip } from "@/components/auditor/ui/chip";
import { pluralize, verdictLabel } from "@/lib/auditor/labels";
import type { Verdict } from "@/lib/auditor/types";

const tones = {
  dangerous: "dangerous",
  review: "review",
  "no-serious-findings": "safe",
} as const;

export function VerdictBadge({
  verdict,
  warnings,
}: {
  verdict: Verdict;
  warnings?: number;
}) {
  return (
    <Chip tone={tones[verdict]}>
      {verdictLabel[verdict]}
      {warnings === undefined ? "" : ` · ${pluralize(warnings, "aviso", "avisos")}`}
    </Chip>
  );
}
