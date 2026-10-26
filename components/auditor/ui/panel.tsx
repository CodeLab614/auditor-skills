import type { HTMLAttributes, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  children,
  className,
  contentClassName,
  gridCell = false,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title?: ReactNode;
  contentClassName?: string;
  gridCell?: boolean;
}) {
  return (
    <Card
      className={cn(
        "auditor-panel rounded-[8px] py-0 ring-1 ring-[var(--auditor-line,var(--border))]",
        gridCell && "auditor-panel--grid-cell rounded-none ring-0",
        className,
      )}
      data-grid-cell={gridCell || undefined}
      {...props}
    >
      {title && (
        <CardHeader className="auditor-panel__header px-4 pt-4 pb-0">
          <CardTitle className="auditor-panel__title text-[15px] font-medium leading-5">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn("auditor-panel__content p-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
