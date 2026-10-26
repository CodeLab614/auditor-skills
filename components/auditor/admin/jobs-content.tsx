"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { AdminTable } from "@/components/auditor/admin/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, jobStateLabel } from "@/lib/auditor/labels";
import type { AdminJob } from "@/lib/auditor/types";

export function JobsContent({ jobs }: { jobs: AdminJob[] }) {
  const [filter, setFilter] = useState<"all" | "failed">("all");
  const rows = useMemo(
    () => jobs.filter((job) => filter !== "failed" || job.state === "failed"),
    [filter, jobs],
  );
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Cola de análisis"
        description="Solo lectura. Las acciones estarán disponibles en la fase 7."
      />
      <div className="flex flex-wrap gap-2 px-5 py-4">
        <Button variant={filter === "all" ? "secondary" : "outline"} size="sm"
          onClick={() => setFilter("all")}>Todos</Button>
        <Button variant={filter === "failed" ? "secondary" : "outline"} size="sm"
          onClick={() => setFilter("failed")}>Fallidos</Button>
      </div>
      <Card className="mx-5 mb-5">
        <AdminTable label="Cola de análisis" headers={[
          "Skill", "Repositorio", "Estado", "Intentos", "Enviada por", "Fecha", "Motivo de fallo",
        ]} rows={rows.map((job) => ({
          id: job.id,
          cells: [
            job.skillName,
            job.repo,
            <Badge key="state" variant={job.state === "failed" ? "destructive" : "secondary"}>
              {jobStateLabel[job.state]}
            </Badge>,
            job.attempts,
            job.submittedBy,
            formatDate(job.createdAt),
            job.failureReason ?? "—",
          ],
        }))} />
      </Card>
    </div>
  );
}
