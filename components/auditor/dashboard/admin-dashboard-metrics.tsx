"use client";

import Link from "next/link";
import { BarChart, MetricCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { getAdminAuditorDashboard } from "@/lib/auditor/mock-data";

type AdminDashboardData = Awaited<ReturnType<typeof getAdminAuditorDashboard>>;

function formatMoney(value: number): string {
  const minimumFractionDigits = Number.isInteger(value) ? 0 : 2;
  const formatted = value.toLocaleString("es-ES", { minimumFractionDigits, maximumFractionDigits: 2 });
  return `${formatted} USD`;
}

export function AdminDashboardMetrics({ data }: { data: AdminDashboardData }) {
  const budgetUse = data.monthlyBudgetUsd
    ? (data.monthlyCostUsd / data.monthlyBudgetUsd) * 100
    : 0;
  const metrics = [
    { title: "En cola ahora", value: data.queue.queued },
    { title: "En curso ahora", value: data.queue.running },
    { title: "Fallidos en las últimas 24 h", value: data.queue.failedLast24Hours },
    {
      title: "Reclamaciones pendientes",
      value: data.pendingClaims,
      href: "/dashboard/auditor/claims",
    },
  ];

  return (
    <section className="flex flex-col border-b border-border" aria-label="Auditor">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-sm font-medium text-muted-foreground">Auditor</h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/auditor/queue">Abrir cola de análisis</Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
        {metrics.map(({ href, ...metric }, index) => {
          const mobileBorderB = index < 2 ? "border-b border-border lg:border-b-0" : "";
          const borderClass = index === 3
            ? mobileBorderB
            : index === 1
              ? `${mobileBorderB} lg:border-r lg:border-border`
              : `${mobileBorderB} border-r border-border`;
          const card = <MetricCard {...metric} className={borderClass} />;

          return href ? (
            <Link className="block" href={href} key={metric.title}>
              {card}
            </Link>
          ) : (
            <div key={metric.title}>{card}</div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr]">
        <BarChart
          title="Análisis por día"
          description="Actividad durante el periodo seleccionado."
          data={data.chartData}
          formatValue={(value) => `${value} análisis`}
          className="min-w-0 border-b border-border lg:border-b-0 lg:border-r"
        />
        <Card className="rounded-none border-0 shadow-none">
          <CardContent className="p-0">
            <div className="flex flex-col gap-2 border-b border-border p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-muted-foreground">Coste de IA este mes</span>
                <strong className="text-right text-sm font-medium">
                  {formatMoney(data.monthlyCostUsd)} de {formatMoney(data.monthlyBudgetUsd)}
                </strong>
              </div>
              <Progress value={Math.min(100, budgetUse)} aria-label="Presupuesto mensual de IA" />
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <span className="text-sm text-muted-foreground">Tiempo medio</span>
              <strong className="text-right text-sm font-medium">
                {Math.floor(data.averageAnalysisSeconds / 60)} min {data.averageAnalysisSeconds % 60} s
              </strong>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <span className="text-sm text-muted-foreground">Tasa de fallos</span>
              <strong className="text-right text-sm font-medium">
                {data.failureRate.toLocaleString("es-ES")} %
              </strong>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <span className="text-sm text-muted-foreground">Retiradas este mes</span>
              <strong className="text-right text-sm font-medium">
                {data.takedownsThisMonth.toLocaleString("es-MX")}
              </strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
