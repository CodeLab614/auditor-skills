"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusType = "success" | "warning" | "error" | "info" | "neutral";

export interface StatusBadgeProps {
  status: StatusType;
  label: string;
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, { dot: string; badge: string }> = {
  success: {
    dot: "bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]",
    badge: "border-emerald-500/20 text-emerald-400 bg-emerald-500/10",
  },
  warning: {
    dot: "bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]",
    badge: "border-amber-500/20 text-amber-400 bg-amber-500/10",
  },
  error: {
    dot: "bg-rose-400 shadow-[0_0_5px_rgba(244,63,94,0.5)]",
    badge: "border-rose-500/20 text-rose-400 bg-rose-500/10",
  },
  info: {
    dot: "bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.5)]",
    badge: "border-blue-500/20 text-blue-400 bg-blue-500/10",
  },
  neutral: {
    dot: "bg-muted-foreground",
    badge: "border-border text-muted-foreground bg-muted",
  },
};

export function StatusBadge({
  status,
  label,
  showDot = true,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal border",
        config.badge,
        className
      )}
    >
      {showDot && (
        <div className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      )}
      {label}
    </span>
  );
}

// Common status mappings
export const orderStatusMap: Record<string, { status: StatusType; label: string }> = {
  fulfilled: { status: "success", label: "Fulfilled" },
  processing: { status: "warning", label: "Processing" },
  pending: { status: "info", label: "Pending" },
  refunded: { status: "error", label: "Refunded" },
  cancelled: { status: "error", label: "Cancelled" },
};

export function OrderStatusBadge({ orderStatus }: { orderStatus: string }) {
  const config = orderStatusMap[orderStatus.toLowerCase()] || {
    status: "neutral" as StatusType,
    label: orderStatus,
  };
  return <StatusBadge status={config.status} label={config.label} />;
}
