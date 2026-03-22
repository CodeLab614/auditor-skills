"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface BarChartData {
  label: string;
  value: number;
  displayValue?: string;
}

export interface BarChartProps {
  title: string;
  description?: string;
  data: BarChartData[];
  tabs?: { label: string; value: string }[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  formatValue?: (value: number) => string;
  highlightIndex?: number;
  showLabels?: boolean;
  className?: string;
}

const defaultFormatValue = (value: number) => `$${(value / 1000).toFixed(0)}k`;

export function BarChart({
  title,
  description,
  data,
  tabs,
  activeTab,
  onTabChange,
  formatValue = defaultFormatValue,
  highlightIndex,
  showLabels = true,
  className,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <Card className={cn("p-6 flex flex-col", className)}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-base font-normal tracking-tight mb-1">{title}</h2>
          {description && (
            <span className="text-xs text-muted-foreground font-light">
              {description}
            </span>
          )}
        </div>
        {tabs && tabs.length > 0 && (
          <div className="hidden sm:flex items-center bg-secondary rounded-md p-1 dark:border dark:border-accent">
            {tabs.map((tab) => (
              <Button
                key={tab.value}
                variant="ghost"
                size="sm"
                onClick={() => onTabChange?.(tab.value)}
                className={cn(
                  "px-3 py-1 h-auto text-xs",
                  activeTab === tab.value
                    ? "bg-background text-foreground shadow-sm font-normal"
                    : "text-muted-foreground hover:text-foreground font-light"
                )}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="flex-1 min-h-[240px] flex items-end justify-between gap-1 sm:gap-2 mt-auto border-b border-border pb-2 relative">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pb-2 pointer-events-none opacity-20">
          <div className="w-full border-t border-muted-foreground border-dashed" />
          <div className="w-full border-t border-muted-foreground border-dashed" />
          <div className="w-full border-t border-muted-foreground border-dashed" />
          <div className="w-full border-t border-muted-foreground border-dashed" />
        </div>

        {/* Bars */}
        {data.map((item, index) => {
          const heightPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const isHighlighted = highlightIndex === index;
          const displayVal = item.displayValue || formatValue(item.value);

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-full rounded-t-sm relative group z-10 transition-colors cursor-pointer",
                    isHighlighted
                      ? "bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(220,218,203,0.2)]"
                      : "bg-secondary hover:bg-primary"
                  )}
                  style={{ height: `${heightPercent}%` }}
                >
                  {isHighlighted && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs py-1 px-2 rounded font-medium whitespace-nowrap">
                      {displayVal}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-primary text-primary-foreground font-medium"
              >
                {displayVal}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground font-light mt-3 uppercase tracking-widest px-1">
          {data.map((item, index) => (
            <span
              key={index}
              className={cn(
                index % 2 !== 0 && "hidden sm:inline"
              )}
            >
              {item.label}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

// Monthly revenue chart preset
export const monthlyLabels = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function createMonthlyData(values: number[]): BarChartData[] {
  return values.map((value, index) => ({
    label: monthlyLabels[index] || `M${index + 1}`,
    value,
  }));
}
