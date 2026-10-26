import type { HTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { CornerBox } from "./corner-box";

const panelGridVariants = cva("auditor-panel-grid grid min-w-0", {
  variants: {
    columns: {
      1: "grid-cols-1",
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
    },
  },
  defaultVariants: { columns: 2 },
});

export function PanelGrid({
  children,
  className,
  columns = 2,
  ...props
}: HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof panelGridVariants> & { children: ReactNode }) {
  return (
    <CornerBox className="auditor-panel-grid-frame p-0">
      <div
        className={cn(panelGridVariants({ columns }), className)}
        data-columns={columns}
        {...props}
      >
        {children}
      </div>
    </CornerBox>
  );
}
