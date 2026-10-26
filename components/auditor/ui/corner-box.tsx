import * as React from "react";
import { cn } from "@/lib/utils";

export type BoxCornerKey = "tl" | "tr" | "bl" | "br";
export type BoxCorners = Partial<Record<BoxCornerKey, boolean>>;
export type BoxNeighbors = {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
};

const cornerKeys: BoxCornerKey[] = ["tl", "tr", "bl", "br"];

export function cornersFromNeighbors(
  neighbors: BoxNeighbors,
): Record<BoxCornerKey, boolean> {
  const { top, right, bottom, left } = neighbors;
  return {
    tl: !top && !left,
    tr: !top && !right,
    bl: !bottom && !left,
    br: !bottom && !right,
  };
}

export function cornersForGridCell(
  row: number,
  col: number,
  rows: number,
  cols: number,
): Record<BoxCornerKey, boolean> {
  return cornersFromNeighbors({
    top: row > 0,
    right: col < cols - 1,
    bottom: row < rows - 1,
    left: col > 0,
  });
}

function CornerMarks({
  corners,
  hover = false,
}: {
  corners?: BoxCorners;
  hover?: boolean;
}) {
  return (
    <span aria-hidden className={cn("auditor-corner-marks", hover && "is-hover")}
    >
      {cornerKeys.map((corner) =>
        corners?.[corner] === false ? null : (
          <span
            key={corner}
            className={`auditor-corner-mark auditor-corner-mark--${corner}`}
          />
        ),
      )}
    </span>
  );
}

export interface CornerBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  corners?: BoxCorners;
  withStripes?: boolean;
  hoverStripes?: boolean;
  noBorder?: boolean;
}

export const CornerBox = React.forwardRef<HTMLDivElement, CornerBoxProps>(
  (
    {
      className,
      corners,
      withStripes,
      hoverStripes,
      noBorder,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        "auditor-corner-box",
        noBorder && "auditor-corner-box--flush",
        withStripes && "auditor-with-stripes",
        hoverStripes && "auditor-corner-box--stripes",
        className,
      )}
      {...props}
    >
      <CornerMarks corners={corners} />
      {children}
    </div>
  ),
);
CornerBox.displayName = "CornerBox";

export function HoverCorners({ corners }: { corners?: BoxCorners }) {
  return <CornerMarks corners={corners} hover />;
}
