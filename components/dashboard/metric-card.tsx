"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Package,
  Tag,
  MousePointer,
  type LucideIcon,
} from "lucide-react";

export type TrendDirection = "up" | "down" | "neutral";

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: TrendDirection;
  icon?: LucideIcon;
  prefix?: string;
  suffix?: string;
  className?: string;
}

const trendConfig = {
  up: {
    icon: ArrowUpRight,
    className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  down: {
    icon: ArrowDownRight,
    className: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
  neutral: {
    icon: ArrowUpRight,
    className: "text-muted-foreground bg-muted border-border",
  },
};

export function MetricCard({
  title,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  prefix = "",
  suffix = "",
  className,
}: MetricCardProps) {
  const trendData = trendConfig[trend];
  const TrendIcon = trendData.icon;

  return (
    <Card
      className={cn(
        "p-5 flex flex-col gap-4 relative overflow-hidden group dark:hover:border-accent transition-colors",
        className
      )}
    >
      <div className="flex justify-between items-center z-10">
        <span className="text-xs text-muted-foreground font-light tracking-widest uppercase">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-md bg-secondary dark:border dark:border-accent flex items-center justify-center group-hover:bg-accent transition-colors">
            <Icon className="h-[18px] w-[18px] text-foreground" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex items-end gap-3 z-10 mt-2">
        <span className="text-3xl font-normal tracking-tight">
          {prefix}
          {typeof value === "number" ? value.toLocaleString() : value}
          {suffix}
        </span>
        {change !== undefined && (
          <span
            className={cn(
              "text-xs font-light flex items-center gap-0.5 mb-1.5 px-1.5 py-0.5 rounded-full border",
              trendData.className
            )}
          >
            <TrendIcon className="h-3 w-3" strokeWidth={1.5} />
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </Card>
  );
}

// Preset metric cards for common use cases
export interface MetricGridProps {
  metrics: MetricCardProps[];
  className?: string;
}

export function MetricGrid({ metrics, className }: MetricGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6",
        className
      )}
    >
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}

// Example preset icons mapping
export const metricIcons = {
  revenue: DollarSign,
  orders: Package,
  price: Tag,
  conversion: MousePointer,
} as const;
