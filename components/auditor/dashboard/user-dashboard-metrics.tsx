"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTable,
  MetricCard,
  type Column,
} from "@/components/dashboard";
import { formatDate, jobStateLabel, verdictLabel } from "@/lib/auditor/labels";
import type { getUserAuditorDashboard } from "@/lib/auditor/mock-data";
import type { Submission } from "@/lib/auditor/types";

type UserDashboardData = Awaited<ReturnType<typeof getUserAuditorDashboard>>;

function progressHref(submission: Submission): string {
  const id = submission.progressId ??
    (submission.state === "checking" ? "demo-checking" : "demo-running");
  return `/analysis/${id}`;
}

function statusVariant(state: Submission["state"]) {
  if (state === "failed") return "destructive" as const;
  if (state === "done") return "default" as const;
  if (state === "paused") return "outline" as const;
  return "secondary" as const;
}

const submissionColumns: Column<Submission>[] = [
  {
    key: "skillName",
    header: "Skill",
    className: "w-[24%]",
    headerClassName: "w-[24%]",
    render: (submission) => submission.resultSlug ? (
      <Link className="underline underline-offset-4" href={`/skills/${submission.resultSlug}`}>
        {submission.skillName}
      </Link>
    ) : submission.skillName,
  },
  {
    key: "submittedAt",
    header: "Fecha",
    className: "w-[20%]",
    headerClassName: "w-[20%]",
    render: (item) => formatDate(item.submittedAt),
  },
  {
    key: "state",
    header: "Estado",
    className: "w-[17%]",
    headerClassName: "w-[17%]",
    render: (item) => <Badge variant={statusVariant(item.state)}>
      {jobStateLabel[item.state]}
    </Badge>,
  },
  {
    key: "detail",
    header: "Detalle",
    className: "w-[39%] whitespace-normal break-words",
    headerClassName: "w-[39%]",
    render: (item) => item.resultSlug ? (
      <Link className="underline underline-offset-4" href={`/skills/${item.resultSlug}`}>
        Ver análisis
      </Link>
    ) : item.state === "failed" ? (
      item.failureReason ?? "Fallido"
    ) : (
      <Link className="underline underline-offset-4" href={progressHref(item)}>
        Ver avance
      </Link>
    ),
  },
];

export function UserDashboardMetrics({ data }: { data: UserDashboardData }) {
  const available = Math.max(0, data.quota.limit - data.quota.used);
  const metrics = [
    { title: "Análisis disponibles este mes", value: available, href: "/dashboard/submit" },
    { title: "En cola", value: data.byState.queued },
    { title: "En curso", value: data.byState.running },
    { title: "Terminados", value: data.byState.done },
    { title: "Fallidos", value: data.byState.failed },
  ];
  const verdicts = [
    { label: verdictLabel.dangerous, count: data.verdicts.dangerous, variant: "destructive" as const },
    { label: verdictLabel.review, count: data.verdicts.review, variant: "secondary" as const },
    { label: verdictLabel["no-serious-findings"], count: data.verdicts.clear, variant: "default" as const },
  ];
  const verdictTotal = verdicts.reduce((total, verdict) => total + verdict.count, 0);

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-2 border-b border-border sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map(({ href, ...metric }, index) => {
          const className = [
            "border-b border-r border-border sm:border-r lg:border-b-0 lg:border-r",
            index % 2 === 1 ? "border-r-0" : "",
            index % 3 === 2 || index === metrics.length - 1 ? "sm:border-r-0" : "",
            index === metrics.length - 1 ? "lg:border-r-0" : "",
          ].filter(Boolean).join(" ");
          const card = <MetricCard {...metric} className={className} />;

          return href ? (
            <Link className="block" href={href} key={metric.title}>
              {card}
            </Link>
          ) : (
            <div key={metric.title}>{card}</div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 items-start border-b border-border lg:grid-cols-2">
        <Card className="w-full rounded-none border-0 border-b border-border shadow-none lg:border-b-0 lg:border-r">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Tus skills por veredicto</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {verdicts.map((verdict) => {
              const percentage = verdictTotal > 0 ? verdict.count / verdictTotal * 100 : 0;

              return (
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3" key={verdict.label}>
                  <Badge variant={verdict.variant}>{verdict.label}</Badge>
                  <div
                    aria-label={`${verdict.label}: ${percentage.toFixed(0)} %`}
                    className="h-1 overflow-hidden rounded-full bg-muted"
                    role="img"
                  >
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <strong className="text-sm tabular-nums">{verdict.count}</strong>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <div className="min-w-0 w-full">
          <DataTable
            title="Últimos envíos"
            description="Consulta el análisis o el avance de cada envío."
            columns={submissionColumns}
            data={data.recentSubmissions}
            viewAllHref="/dashboard/submissions"
            viewAllLabel="Ver todos"
            tableClassName="min-w-0 w-full table-fixed"
          />
        </div>
      </div>
      {data.openClaims.length > 0 && (
        <Card className="rounded-none border-x-0 border-b-0 shadow-none">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-[15px]">Reclamaciones abiertas</CardTitle>
            <Badge variant="secondary">{data.openClaims.length}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.openClaims.map((claim) => (
              <p key={claim.id} className="text-sm text-muted-foreground">
                {claim.skillName} · {claim.kind === "takedown" ? "Solicitud de retirada" : "Error del análisis"}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
