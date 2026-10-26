"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AdminTable } from "@/components/auditor/admin/admin-table";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/auditor/labels";
import type { BlockedRepo, ModeratedSkill } from "@/lib/auditor/types";

type ModerationTab = "skills" | "repos";

export function ModerationContent({ skills, repos }: {
  skills: ModeratedSkill[];
  repos: BlockedRepo[];
}) {
  const [skillRows, setSkillRows] = useState(() => skills.map((item) => ({ ...item, id: item.slug })));
  const [repoRows, setRepoRows] = useState(() => repos.map((item) => ({ ...item, id: item.repo })));
  const [tab, setTab] = useState<ModerationTab>("skills");
  const [pending, setPending] = useState<{ kind: "skill" | "repo"; id: string; action: string } | null>(null);
  const confirm = () => {
    if (!pending) return;
    if (pending.kind === "skill") {
      setSkillRows((rows) => rows.map((row) => row.slug === pending.id
        ? { ...row, hidden: pending.action === "ocultar" }
        : row));
    } else if (pending.action === "bloquear") {
      setRepoRows((rows) => [...rows, {
        id: pending.id,
        repo: pending.id,
        blockedAt: new Date().toISOString().slice(0, 10),
        reason: "Bloqueo de maqueta",
      }]);
    } else {
      setRepoRows((rows) => rows.filter((row) => row.repo !== pending.id));
    }
    toast("Maqueta: el cambio no se guarda todavía");
    setPending(null);
  };
  const skillTable = (
    <AdminTable label="Skills del catálogo" headers={["Skill", "Repositorio", "Visibilidad", "Acción"]}
      rows={skillRows.map((item) => ({
        id: item.id,
        cells: [
          item.name,
          item.repo,
          <Badge key="visibility" variant={item.hidden ? "secondary" : "default"}>
            {item.hidden ? "Oculta" : "Visible"}
          </Badge>,
          <div key="actions" className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setPending({
              kind: "skill", id: item.slug, action: item.hidden ? "mostrar" : "ocultar",
            })}>{item.hidden ? "Mostrar" : "Ocultar"}</Button>
            <Button size="sm" variant="outline" onClick={() => setPending({
              kind: "repo", id: item.repo, action: "bloquear",
            })}>Bloquear repositorio</Button>
          </div>,
        ],
      }))} />
  );
  const repoTable = repoRows.length ? (
    <AdminTable label="Repositorios bloqueados" headers={["Repositorio", "Bloqueado el", "Motivo", "Acción"]}
      rows={repoRows.map((item) => ({
        id: item.id,
        cells: [
          item.repo,
          formatDate(item.blockedAt),
          item.reason,
          <Button key="action" size="sm" variant="outline" onClick={() => setPending({
            kind: "repo", id: item.repo, action: "desbloquear",
          })}>Desbloquear</Button>,
        ],
      }))} />
  ) : <p className="text-sm text-muted-foreground">No hay repositorios bloqueados.</p>;
  const pendingTitle = pending
    ? `${pending.action === "ocultar" ? "Ocultar" : pending.action === "mostrar"
      ? "Mostrar" : pending.action === "bloquear" ? "Bloquear" : "Desbloquear"} ${
      pending.kind === "skill" ? "skill" : "repositorio"
    }`
    : "";

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Skills y repositorios" description="Moderación del catálogo" />
      <nav className="flex gap-2 px-5 py-4" aria-label="Secciones de moderación">
        <Button variant={tab === "skills" ? "secondary" : "outline"} size="sm"
          onClick={() => setTab("skills")}>Skills del catálogo</Button>
        <Button variant={tab === "repos" ? "secondary" : "outline"} size="sm"
          onClick={() => setTab("repos")}>Repositorios bloqueados</Button>
      </nav>
      {tab === "skills" ? (
        <Card className="mx-5 mb-5">
          <CardHeader><CardTitle>Skills del catálogo</CardTitle></CardHeader>
          <CardContent>{skillTable}</CardContent>
        </Card>
      ) : (
        <Card className="mx-5 mb-5">
          <CardHeader><CardTitle>Repositorios bloqueados</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground">Bloquear impide analizar sus skills presentes y futuras.</p>
            {repoTable}
          </CardContent>
        </Card>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={pendingTitle}
        description={pending?.action === "ocultar"
          ? "Las versiones futuras de esta skill no se analizarán."
          : pending?.action === "bloquear"
            ? "Las skills actuales y futuras de este repositorio no se analizarán."
            : "El elemento volverá a estar disponible para análisis."}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        variant={pending?.action === "ocultar" || pending?.action === "bloquear" ? "destructive" : "default"}
        onConfirm={confirm}
      />
    </div>
  );
}
