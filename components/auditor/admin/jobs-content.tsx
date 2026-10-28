"use client";

import Link from "next/link";
import {
  PageHeader,
  TableView,
  type BulkAction,
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
  queueTableQuery,
  type QueueTableFilter,
} from "@/lib/auditor/table-queries";
import type { AdminJob, JobState } from "@/lib/auditor/types";
import type { TableParams } from "@/lib/table-query";

function statusVariant(state: JobState) {
  if (state === "failed") return "destructive" as const;
  if (state === "done") return "default" as const;
  if (state === "paused") return "outline" as const;
  return "secondary" as const;
}

const QUEUE_FILTERS: TableViewFilter<QueueTableFilter>[] = [
  {
    key: "status",
    label: "Estado",
    options: JOB_STATUSES.map((status) => ({
      value: status,
      label: jobStateLabel[status],
    })),
  },
  {
    key: "kind",
    label: "Tipo",
    options: [
      { value: "analysis", label: "Análisis" },
      { value: "fingerprint_check", label: "Comprobación de huella" },
    ],
  },
];

const QUEUE_COLUMNS: TableViewColumn<AdminJob>[] = [
  {
    id: "skill",
    header: "Skill",
    required: true,
    render: (job) =>
      job.resultSlug ? (
        <Link
          className="underline underline-offset-4"
          href={analysisHref(job.resultSlug)}
        >
          {job.skillName}
        </Link>
      ) : (
        job.skillName
      ),
  },
  {
    id: "repo",
    header: "Repositorio",
    render: (job) => <span className="break-all">{job.repo}</span>,
  },
  {
    id: "kind",
    header: "Tipo",
    render: (job) =>
      job.kind === "fingerprint_check" ? "Comprobación de huella" : "Análisis",
  },
  {
    id: "state",
    header: "Estado",
    render: (job) => (
      <Badge variant={statusVariant(job.state)}>
        {jobStateLabel[job.state]}
      </Badge>
    ),
  },
  {
    id: "attempts",
    header: "Intentos",
    render: (job) => job.attempts,
  },
  {
    id: "submittedBy",
    header: "Enviada por",
    render: (job) => job.submittedBy,
  },
  {
    id: "createdAt",
    header: "Fecha",
    render: (job) => (
      <span className="font-mono text-[13px] text-muted-foreground">
        {formatDate(job.createdAt)}
      </span>
    ),
  },
  {
    id: "failureReason",
    header: "Motivo de fallo",
    render: (job) => job.failureReason ?? "—",
  },
];

interface JobsContentProps {
  jobs: AdminJob[];
  total: number;
  totalPages: number;
  params: TableParams<QueueTableFilter>;
  hiddenColumns: string[];
}

export function JobsContent({
  jobs,
  total,
  totalPages,
  params,
  hiddenColumns,
}: JobsContentProps) {
  const rowActions = (job: AdminJob): RowAction<AdminJob>[] => {
    if (
      job.state === "queued" ||
      job.state === "checking" ||
      job.state === "running"
    ) {
      return [
        {
          id: "progress",
          label: "Ver avance",
          href: `/analysis/${job.progressId ?? job.id}`,
        },
      ];
    }
    if (job.state === "done" && job.resultSlug) {
      return [
        {
          id: "analysis",
          label: "Ver análisis",
          href: analysisHref(job.resultSlug),
        },
      ];
    }
    return [];
  };

  const bulkActions: BulkAction[] = [
    {
      id: "retry",
      label: "Reintentar",
      disabled: true,
      hint: "Disponible en la fase 7",
    },
    {
      id: "cancel",
      label: "Cancelar",
      disabled: true,
      hint: "Disponible en la fase 7",
    },
  ];

  return (
    <>
      <PageHeader
        title="Cola de análisis"
        description="Solo lectura. Las acciones estarán disponibles en la fase 7."
      />
      <TableView
        tableId="auditor-queue"
        basePath="/dashboard/auditor/queue"
        query={queueTableQuery}
        params={params}
        rows={jobs}
        total={total}
        totalPages={totalPages}
        columns={QUEUE_COLUMNS}
        hiddenColumns={hiddenColumns}
        filters={QUEUE_FILTERS}
        rowActions={rowActions}
        bulkActions={bulkActions}
        labels={{
          ...auditorTableLabels(
            { singular: "trabajo", plural: "trabajos" },
            "No hay trabajos en la cola.",
          ),
          searchPlaceholder: "Buscar por skill, repositorio o usuario…",
        }}
      />
    </>
  );
}
