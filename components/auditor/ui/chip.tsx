import type { HTMLAttributes, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ChipTone = "neutral" | "critical" | "high" | "medium" | "low" | "dangerous" | "review" | "safe";

export function Chip({
  tone = "neutral",
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone; children: ReactNode }) {
  return (
    <Badge variant="outline" className={cn("auditor-chip", `auditor-chip--${tone}`, className)} {...props}>
      {children}
    </Badge>
  );
}
