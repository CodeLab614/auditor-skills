"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminTable } from "@/components/auditor/admin/admin-table";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  takedownKindLabel,
  takedownStatusLabel,
  formatDate,
} from "@/lib/auditor/labels";
import type { TakedownRequest } from "@/lib/auditor/types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type RequestFilter = "all" | TakedownRequest["status"];

export function TakedownsContent({
  requests,
}: {
  requests: TakedownRequest[];
}) {
  const [selected, setSelected] = useState<TakedownRequest | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [filter, setFilter] = useState<RequestFilter>("all");
  const filteredRequests = useMemo(
    () => requests.filter((request) => filter === "all" || request.status === filter),
    [filter, requests],
  );
  const act = (action: string) => {
    toast(`Maqueta: ${action.toLocaleLowerCase("es")} no se ejecuta todavía`);
    setSelected(null);
  };

  return (
      <div className="flex min-h-full flex-col">
      <PageHeader title="Reclamaciones" description="Solicitudes de autores y reportes" />
      <nav className="flex flex-wrap gap-2 px-5 py-4" aria-label="Filtrar reclamaciones">
        {([
          ["all", "Todas"], ["pending", "Pendientes"],
          ["resolved", "Resueltas"], ["rejected", "Rechazadas"],
        ] as [RequestFilter, string][]).map(([value, label]) => (
          <Button key={value} size="sm" variant={filter === value ? "secondary" : "outline"}
            onClick={() => setFilter(value)}>
            {label}
          </Button>
        ))}
      </nav>
      <Card className="mx-5 mb-5"><CardContent>
        <AdminTable label="Reclamaciones" headers={[
          "Skill", "Solicitante", "Verificación", "Tipo", "Estado", "Detalle",
        ]} rows={filteredRequests.map((item) => ({
          id: item.id,
          cells: [
            item.skillName,
            item.requester,
            <Badge key="verified" variant={item.verified ? "default" : "secondary"}>
              {item.verified ? "Autor verificado" : "Sin verificar"}
            </Badge>,
            takedownKindLabel[item.kind],
            <Badge key="status" variant={item.status === "rejected" ? "destructive" : "secondary"}>
              {takedownStatusLabel[item.status]}
            </Badge>,
            <Button key="detail" variant="ghost" size="sm" onClick={() => setSelected(item)}>
              Abrir solicitud
            </Button>,
          ],
        }))} />
      </CardContent></Card>
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selected?.skillName}</SheetTitle>
            <SheetDescription>
              {selected?.requester} · {selected ? formatDate(selected.createdAt) : ""}
              {" · "}{selected ? takedownKindLabel[selected.kind] : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 p-4">
            <p className="auditor-admin-dialog-copy text-sm">{selected?.message}</p>
            {pendingAction === "Rechazar" && (
              <div className="grid gap-2">
                <Label htmlFor="rejection-reason">Motivo de rechazo</Label>
                <Textarea id="rejection-reason" value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Explica por qué se rechaza la solicitud." />
              </div>
            )}
          </div>
          <SheetFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPendingAction("Ocultar la skill")}>
              Ocultar la skill
            </Button>
            <Button variant="outline" onClick={() => setPendingAction("Bloquear el repositorio")}>
              Bloquear el repositorio
            </Button>
            <Button variant="outline" onClick={() => setPendingAction("Pedir un reanálisis")}>
              Pedir un reanálisis
            </Button>
            <Button onClick={() => setPendingAction("Rechazar")}>Rechazar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title={`Confirmar: ${pendingAction ?? ""}`}
        description={pendingAction === "Rechazar"
          ? `La solicitud se marcará como rechazada. Motivo: ${rejectionReason || "sin motivo indicado"}.`
          : `Se aplicará la acción «${pendingAction ?? ""}» a esta solicitud.`}
        confirmLabel="Confirmar acción"
        cancelLabel="Volver"
        variant={pendingAction === "Rechazar" ? "destructive" : "default"}
        onConfirm={() => {
          if (pendingAction) act(pendingAction);
          setPendingAction(null);
          setRejectionReason("");
        }}
      />
    </div>
  );
}
