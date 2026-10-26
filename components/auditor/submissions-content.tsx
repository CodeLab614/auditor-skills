import Link from "next/link";
import { PageHeader } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, jobStateLabel } from "@/lib/auditor/labels";
import type { Quota, Submission } from "@/lib/auditor/types";

function progressIdFor(state: Submission["state"]): string {
  if (state === "queued" || state === "checking") return "demo-queued";
  if (state === "paused") return "demo-paused";
  return "demo-running";
}

function statusVariant(state: Submission["state"]) {
  if (state === "failed") return "destructive" as const;
  if (state === "done") return "default" as const;
  if (state === "paused") return "outline" as const;
  return "secondary" as const;
}

export function SubmissionsContent({
  submissions,
  quota,
}: {
  submissions: Submission[];
  quota: Quota;
}) {
  const remaining = quota.limit - quota.used;

  return (
    <>
      <PageHeader title="Mis envíos">
        <Badge variant="secondary">
          {remaining} de {quota.limit} disponibles
        </Badge>
      </PageHeader>
      <div className="flex flex-col gap-6 p-5">
        <p className="text-sm text-muted-foreground">
          Historial de las skills que enviaste. El cupo se renueva el{" "}
          {formatDate(quota.renewsOn)}.
        </p>
        {submissions.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
              <CardDescription>
                Consulta el análisis, el avance o el motivo de cada envío.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skill</TableHead>
                      <TableHead>Repositorio</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id} className="align-top">
                        <TableCell className="whitespace-normal break-words">
                          {submission.resultSlug ? (
                            <Link
                              className="underline underline-offset-4"
                              href={`/skills/${submission.resultSlug}`}
                            >
                              {submission.skillName}
                            </Link>
                          ) : (
                            submission.skillName
                          )}
                        </TableCell>
                        <TableCell className="break-all">
                          {submission.repo}
                        </TableCell>
                        <TableCell>
                          {formatDate(submission.submittedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(submission.state)}>
                            {jobStateLabel[submission.state]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {submission.resultSlug ? (
                            <Link
                              className="underline underline-offset-4"
                              href={`/skills/${submission.resultSlug}`}
                            >
                              Ver análisis
                            </Link>
                          ) : submission.state === "failed" ? (
                            submission.failureReason ?? "—"
                          ) : (
                            <Link
                              className="underline underline-offset-4"
                              href={`/analysis/${progressIdFor(submission.state)}`}
                            >
                              Ver avance
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Aún no tienes envíos</CardTitle>
              <CardDescription>
                Cuando envíes una skill, su estado aparecerá aquí.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/submit">Enviar una skill</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
