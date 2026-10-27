"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { inspectSubmissionAction, submitSkillsAction } from "@/actions/auditor/submissions";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Quota } from "@/lib/auditor/types";
import type { SubmissionInspection } from "@/lib/auditor/submission/service";
import { formatDate } from "@/lib/auditor/labels";

const routeExamples = [
  "https://github.com/CodeLab614-AI/skills",
  "https://github.com/CodeLab614-AI/skills/tree/main/skills/explain-changes",
  "https://github.com/cloudflare/security-audit-skill",
] as const;

function statusLabel(state: SubmissionInspection["skills"][number]["state"]): string {
  if (state === "new") return "Nueva";
  if (state === "analyzed") return "Analizada";
  if (state === "in-progress") return "En curso";
  if (state === "retired") return "Retirada";
  return "No admitida";
}

export function SubmitContent({ quota }: { quota: Quota }) {
  const [route, setRoute] = useState("");
  const [message, setMessage] = useState("");
  const [inspection, setInspection] = useState<SubmissionInspection | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const remaining = Math.max(0, quota.limit - quota.used);
  const selectionLimit = inspection
    ? Math.min(inspection.remaining, inspection.maxPerSubmission)
    : 0;
  const hasMultipleSkills = (inspection?.skills.length ?? 0) > 1;

  const inspectAndSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    setMessage("");
    setInspection(null);
    setSelected([]);

    startTransition(async () => {
      try {
        const inspected = await inspectSubmissionAction(route.trim());
        if (inspected.response !== "success" || !inspected.data) {
          setMessage(inspected.message);
          return;
        }

        const data = inspected.data;
        if (data.skills.length === 1) {
          const skill = data.skills[0]!;
          if (skill.state === "analyzed" || skill.state === "in-progress") {
            if (skill.target) router.push(skill.target);
            return;
          }
          if (skill.state === "retired" || skill.state === "rejected") {
            setMessage(skill.reason ?? (skill.state === "retired"
              ? "Esta skill fue retirada del catálogo"
              : "Esta skill no se puede analizar"));
            return;
          }

          const submitted = await submitSkillsAction({
            url: route.trim(),
            commitSha: data.commitSha,
            paths: [skill.path],
          });
          if (submitted.response !== "success" || !submitted.data) {
            setMessage(submitted.message);
            return;
          }
          router.push(submitted.data.redirectTo);
          return;
        }

        setInspection(data);
      } catch {
        setMessage("No se pudo revisar el repositorio; inténtalo de nuevo");
      }
    });
  };

  const submitSelected = async () => {
    if (!inspection || selected.length === 0 || pending) return;
    setMessage("");
    startTransition(async () => {
      try {
        const submitted = await submitSkillsAction({
          url: route.trim(),
          commitSha: inspection.commitSha,
          paths: selected,
        });
        if (submitted.response !== "success" || !submitted.data) {
          setMessage(submitted.message);
          return;
        }
        router.push(submitted.data.redirectTo);
      } catch {
        setMessage("No se pudieron enviar las skills; inténtalo de nuevo");
      }
    });
  };

  const chooseRoute = (url: string) => {
    setRoute(url);
    setInspection(null);
    setSelected([]);
    setMessage("");
  };

  return (
    <>
      <PageHeader title="Enviar una skill">
        <Badge variant="secondary">GitHub público</Badge>
      </PageHeader>
      <div className="flex flex-col gap-6 p-5">
        <Card>
          <CardHeader>
            <CardTitle>Enviar una skill</CardTitle>
            <CardDescription>
              Indica el repositorio público o la carpeta de la skill que quieres
              analizar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={inspectAndSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="github-route">Repositorio o carpeta de la skill</Label>
                <Input
                  id="github-route"
                  value={route}
                  onChange={(event) => chooseRoute(event.target.value)}
                  placeholder="https://github.com/<dueño>/<repositorio>"
                  disabled={pending}
                />
                <p className="text-sm text-muted-foreground">
                  Formatos: https://github.com/&lt;dueño&gt;/&lt;repositorio&gt; o
                  https://github.com/&lt;dueño&gt;/&lt;repositorio&gt;/tree/&lt;rama&gt;/&lt;carpeta&gt;.
                  No se aceptan enlaces a archivos ni repositorios privados.
                </p>
              </div>
              {message && (
                <p role="alert" className="text-sm text-destructive">{message}</p>
              )}
              {inspection && hasMultipleSkills && (
                <fieldset className="flex flex-col gap-3" disabled={pending}>
                  <legend className="text-sm font-medium">
                    Se encontraron varias skills
                  </legend>
                  {inspection.skills.map((skill) => {
                    const canSelect = skill.state === "new";
                    const atLimit = selected.length >= selectionLimit;
                    const checked = selected.includes(skill.path);
                    const disabled = !canSelect || (atLimit && !checked) || pending;

                    return (
                      <div key={skill.path} className="flex items-start gap-3">
                        {canSelect ? (
                          <Checkbox
                            id={`skill-${skill.path}`}
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={(value) => setSelected((current) =>
                              value
                                ? [...current, skill.path]
                                : current.filter((path) => path !== skill.path))}
                          />
                        ) : <span className="w-4 shrink-0" aria-hidden="true" />}
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Label
                              htmlFor={canSelect ? `skill-${skill.path}` : undefined}
                              className={canSelect ? "cursor-pointer" : undefined}
                            >
                              {skill.name}
                            </Label>
                            <Badge variant={skill.state === "rejected" || skill.state === "retired"
                              ? "destructive"
                              : "secondary"}>
                              {statusLabel(skill.state)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{skill.description}</p>
                          <p className="break-all font-mono text-xs text-muted-foreground">
                            {skill.path || "/"}
                          </p>
                          {(skill.state === "analyzed" || skill.state === "in-progress") &&
                            skill.target && (
                              <Link className="text-sm underline underline-offset-4" href={skill.target}>
                                {skill.state === "analyzed" ? "Ver análisis" : "Ver avance"}
                              </Link>
                            )}
                          {(skill.state === "rejected" || skill.state === "retired") && skill.reason && (
                            <p className="text-sm text-destructive">{skill.reason}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-sm text-muted-foreground">
                    Puedes seleccionar hasta {selectionLimit} skills nuevas.
                  </p>
                  <div>
                    <Button
                      type="button"
                      disabled={pending || selected.length === 0}
                      onClick={submitSelected}
                    >
                      {pending
                        ? "Enviando…"
                        : `Analizar ${selected.length} ${selected.length === 1 ? "skill" : "skills"}`}
                    </Button>
                  </div>
                </fieldset>
              )}
              {(!inspection || !hasMultipleSkills) && (
                <div>
                  <Button type="submit" disabled={pending || !route.trim()}>
                    {pending ? "Revisando…" : "Revisar repositorio"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tu límite mensual</CardTitle>
              <CardDescription>
                {remaining} de {quota.limit} · se renueva el {formatDate(quota.renewsOn)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                className="text-sm underline underline-offset-4"
                href="/dashboard/submissions"
              >
                Ver mis envíos
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Prueba estas rutas</CardTitle>
              <CardDescription>
                Revisa repositorios públicos que contienen skills.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm">
                {routeExamples.map((url) => (
                  <li key={url} className="break-all">
                    <Button
                      className="h-auto justify-start whitespace-normal p-0 text-left"
                      type="button"
                      variant="link"
                      disabled={pending}
                      onClick={() => chooseRoute(url)}
                    >
                      {url}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <p className="text-sm">
          <Link
            className="underline underline-offset-4"
            href="/dashboard/submissions"
          >
            Consulta el estado de tus envíos
          </Link>
        </p>
      </div>
    </>
  );
}
