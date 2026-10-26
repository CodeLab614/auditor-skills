"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { formatDate } from "@/lib/auditor/labels";

export function SubmitContent({ quota }: { quota: Quota }) {
  const [route, setRoute] = useState("");
  const [message, setMessage] = useState("");
  const [multiple, setMultiple] = useState(false);
  const [selected, setSelected] = useState<string[]>(["explicar-cambios"]);
  const [alreadyAnalyzed, setAlreadyAnalyzed] = useState(false);
  const router = useRouter();
  const remaining = quota.limit - quota.used;

  const evaluateRoute = (candidate: string) => {
    setMessage("");
    setAlreadyAnalyzed(false);
    setMultiple(false);
    if (
      !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\/tree\/[\w./-]+)?\/?$/.test(
        candidate.trim(),
      )
    ) {
      setMessage(
        "Formato inválido. Usa https://github.com/<dueño>/<repositorio> o " +
          "https://github.com/<dueño>/<repositorio>/tree/<rama>/<carpeta>.",
      );
      return;
    }
    if (candidate.endsWith("/tree/main")) {
      setMultiple(true);
      return;
    }
    if (candidate.includes("sincronizador")) {
      setMessage("Esta skill ya fue retirada del catálogo.");
      return;
    }
    if (candidate.includes("skills-demo")) {
      setMessage("Esta versión ya está analizada.");
      setAlreadyAnalyzed(true);
      return;
    }
    router.push("/analysis/demo-queued");
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (multiple) {
      router.push("/analysis/demo-queued");
      return;
    }
    evaluateRoute(route);
  };

  const routeExamples = [
    ["Formato inválido", "https://github.com/sin-ruta"],
    ["Retirada", "https://github.com/ejemplo-org/sincronizador"],
    ["Ya analizada", "https://github.com/ejemplo-org/skills-demo"],
    ["Varias skills", "https://github.com/ejemplo-org/skills-demo/tree/main"],
    ["Nueva", "https://github.com/ejemplo-org/skill-nueva"],
  ] as const;

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
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="github-route">Repositorio o carpeta de la skill</Label>
                <Input
                  id="github-route"
                  value={route}
                  onChange={(event) => setRoute(event.target.value)}
                  placeholder="https://github.com/<dueño>/<repositorio>"
                />
                <p className="text-sm text-muted-foreground">
                  Formatos: https://github.com/&lt;dueño&gt;/&lt;repositorio&gt; o
                  https://github.com/&lt;dueño&gt;/&lt;repositorio&gt;/tree/&lt;rama&gt;/&lt;carpeta&gt;.
                  No se aceptan enlaces a archivos ni repositorios privados.
                </p>
              </div>
              {message && (
                <p role="alert" className="text-sm text-destructive">
                  {message}{" "}
                  {alreadyAnalyzed && (
                    <Link
                      className="underline underline-offset-4"
                      href="/skills/explicar-cambios"
                    >
                      Ver análisis existente
                    </Link>
                  )}
                </p>
              )}
              {multiple && (
                <fieldset className="flex flex-col gap-3">
                  <legend className="text-sm font-medium">
                    Se encontraron varias skills
                  </legend>
                  {[
                    "explicar-cambios",
                    "revisar-rutas",
                    "ordenar-documentos",
                  ]
                    .slice(0, Math.min(3, remaining))
                    .map((skill) => (
                      <div key={skill} className="flex items-center gap-2">
                        <Checkbox
                          id={`skill-${skill}`}
                          checked={selected.includes(skill)}
                          onCheckedChange={(checked) =>
                            setSelected((current) =>
                              checked
                                ? [...current, skill]
                                : current.filter((item) => item !== skill),
                            )
                          }
                        />
                        <Label htmlFor={`skill-${skill}`}>{skill}</Label>
                      </div>
                    ))}
                  <p className="text-sm text-muted-foreground">
                    Puedes elegir hasta {Math.min(20, remaining)} skills, según
                    el cupo mensual disponible.
                  </p>
                </fieldset>
              )}
              <div>
                <Button type="submit">
                  {multiple ? "Analizar las skills seleccionadas" : "Continuar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tu límite mensual</CardTitle>
              <CardDescription>
                {remaining} de {quota.limit} · se renueva el{" "}
                {formatDate(quota.renewsOn)}
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
                Comprueba los estados del formulario con estos ejemplos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm">
                {routeExamples.map(([label, url]) => (
                  <li key={label} className="break-all">
                    <Button
                      className="h-auto justify-start whitespace-normal p-0 text-left"
                      type="button"
                      variant="link"
                      onClick={() => {
                        setRoute(url);
                        evaluateRoute(url);
                      }}
                    >
                      {label}: {url}
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
