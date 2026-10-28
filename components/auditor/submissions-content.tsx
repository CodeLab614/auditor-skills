"use client";

import Link from "next/link";
import {
  PageHeader,
  TableView,
  type RowAction,
  type TableViewColumn,
  type TableViewFilter,
} from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { formatDate, jobStateLabel } from "@/lib/auditor/labels";
import { analysisHref } from "@/lib/auditor/skill-links";
import { auditorTableLabels } from "@/lib/auditor/table-labels";
import {
  JOB_STATUSES,
  submissionsTableQuery,
  type SubmissionsTableFilter,
} from "@/lib/auditor/table-queries";
import type { Quota, Submission } from "@/lib/auditor/types";
import type { TableParams } from "@/lib/table-query";

function statusVariant(state: Submission["state"]) {
  if (state === "failed") return "destructive" as const;
  if (state === "done") return "default" as const;
  if (state === "paused") return "outline" as const;
  return "secondary" as const;
}

const SUBMISSION_FILTERS: TableViewFilter<SubmissionsTableFilter>[] = [
  {
    key: "status",
    label: "Estado",
    options: JOB_STATUSES.map((status) => ({
      value: status,
      label: jobStateLabel[status],
    })),
  },
];

const SUBMISSION_COLUMNS: TableViewColumn<Submission>[] = [
  {
    id: "skill",
    header: "Skill",
    required: true,
    render: (item) =>
      item.resultSlug ? (
        <Link
          className="underline underline-offset-4"
          href={analysisHref(item.resultSlug)}
        >
          {item.skillName}
        </Link>
      ) : (
        item.skillName
      ),
  },
  {
    id: "repo",
    header: "Repositorio",
    render: (item) => <span className="break-all">{item.repo}</span>,
  },
  {
    id: "submittedAt",
    header: "Fecha",
    render: (item) => (
      <span className="font-mono text-[13px] text-muted-foreground">
        {formatDate(item.submittedAt)}
      </span>
    ),
  },
  {
    id: "state",
    header: "Estado",
    render: (item) => (
      <Badge variant={statusVariant(item.state)}>
        {jobStateLabel[item.state]}
      </Badge>
    ),
  },
  {
    id: "failureReason",
    header: "Motivo",
    render: (item) => item.failureReason ?? "—",
  },
];

interface SubmissionsContentProps {
  submissions: Submission[];
  total: number;
  totalPages: number;
  params: TableParams<SubmissionsTableFilter>;
  quota: Quota;
  hiddenColumns: string[];
}

export function SubmissionsContent({
  submissions,
  total,
  totalPages,
  params,
  quota,
  hiddenColumns,
}: SubmissionsContentProps) {
  const remaining = Math.max(0, quota.limit - quota.used);
  const renewalMonth = new Intl.DateTimeFormat("es", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(quota.renewsOn));

  const rowActions = (item: Submission): RowAction<Submission>[] => {
    if (
      item.state === "queued" ||
      item.state === "checking" ||
      item.state === "running"
    ) {
      return [
        {
          id: "progress",
          label: "Ver avance",
          href: `/analysis/${item.progressId ?? item.id}`,
        },
      ];
    }
    if (item.state === "done" && item.resultSlug) {
      return [
        {
          id: "analysis",
          label: "Ver análisis",
          href: analysisHref(item.resultSlug),
        },
      ];
    }
    return [];
  };

  return (
    <>
      <PageHeader title="Mis envíos">
        <Badge variant="secondary">
          {remaining} de {quota.limit} disponibles
        </Badge>
      </PageHeader>
      <p className="px-5 py-2.5 text-sm text-muted-foreground">
        Te quedan {remaining} de {quota.limit} · se renueva el 1 de {renewalMonth}
      </p>
      <TableView
        tableId="auditor-submissions"
        basePath="/dashboard/submissions"
        query={submissionsTableQuery}
        params={params}
        rows={submissions}
        total={total}
        totalPages={totalPages}
        columns={SUBMISSION_COLUMNS}
        hiddenColumns={hiddenColumns}
        filters={SUBMISSION_FILTERS}
        rowActions={rowActions}
        labels={{
          ...auditorTableLabels(
            { singular: "envío", plural: "envíos" },
            "Todavía no has enviado ninguna skill.",
          ),
          searchPlaceholder: "Buscar por skill o repositorio…",
        }}
      />
    </>
  );
}
