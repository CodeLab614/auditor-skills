"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  PageHeader,
  TableView,
  type RowAction,
  type TableViewColumn,
  type TableViewFilter,
} from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDate,
  takedownKindLabel,
  takedownStatusLabel,
} from "@/lib/auditor/labels";
import { auditorTableLabels } from "@/lib/auditor/table-labels";
import {
  CLAIM_KINDS,
  CLAIM_STATUSES,
  claimsTableQuery,
  type ClaimsTableFilter,
} from "@/lib/auditor/table-queries";
import type { TakedownRequest } from "@/lib/auditor/types";
import type { TableParams } from "@/lib/table-query";

const CLAIMS_FILTERS: TableViewFilter<ClaimsTableFilter>[] = [
  {
    key: "status",
    label: "Estado",
    options: CLAIM_STATUSES.map((status) => ({
      value: status,
      label: takedownStatusLabel[status],
    })),
  },
  {
    key: "kind",
    label: "Tipo",
    options: CLAIM_KINDS.map((kind) => ({
      value: kind,
      label: takedownKindLabel[kind],
    })),
  },
  {
    key: "verified",
    label: "Verificación",
    options: [
      { value: "verified", label: "Autor verificado" },
      { value: "unverified", label: "Sin verificar" },
    ],
  },
];

const CLAIMS_COLUMNS: TableViewColumn<TakedownRequest>[] = [
  {
    id: "skillName",
    header: "Skill",
    required: true,
    render: (item) => item.skillName,
  },
  {
    id: "requester",
    header: "Solicitante",
    render: (item) => item.requester,
  },
  {
    id: "verified",
    header: "Verificación",
    render: (item) => (
      <Badge variant={item.verified ? "default" : "secondary"}>
        {item.verified ? "Autor verificado" : "Sin verificar"}
      </Badge>
    ),
  },
  {
    id: "kind",
    header: "Tipo",
    render: (item) => takedownKindLabel[item.kind],
  },
  {
    id: "status",
    header: "Estado",
    render: (item) => (
      <Badge
        variant={item.status === "rejected" ? "destructive" : "secondary"}
      >
        {takedownStatusLabel[item.status]}
      </Badge>
    ),
  },
  {
    id: "createdAt",
    header: "Fecha",
    render: (item) => (
      <span className="font-mono text-[13px] text-muted-foreground">
        {formatDate(item.createdAt)}
      </span>
    ),
  },
];

interface TakedownsContentProps {
  requests: TakedownRequest[];
  total: number;
  totalPages: number;
  params: TableParams<ClaimsTableFilter>;
  hiddenColumns: string[];
}

export function TakedownsContent({
  requests,
  total,
  totalPages,
  params,
  hiddenColumns,
}: TakedownsContentProps) {
  const [selected, setSelected] = useState<TakedownRequest | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const act = (action: string) => {
    toast(`Maqueta: ${action.toLocaleLowerCase("es")} no se ejecuta todavía`);
    setSelected(null);
  };

  const rowActions = (item: TakedownRequest): RowAction<TakedownRequest>[] => [
    {
      id: "open",
      label: "Abrir solicitud",
      onSelect: () => setSelected(item),
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Reclamaciones"
        description="Solicitudes de autores y reportes"
      />
      <TableView
        tableId="auditor-claims"
        basePath="/dashboard/auditor/claims"
        query={claimsTableQuery}
        params={params}
        rows={requests}
        total={total}
        totalPages={totalPages}
        columns={CLAIMS_COLUMNS}
        hiddenColumns={hiddenColumns}
        filters={CLAIMS_FILTERS}
        rowActions={rowActions}
        onRowClick={(item) => setSelected(item)}
        labels={{
          ...auditorTableLabels(
            { singular: "reclamación", plural: "reclamaciones" },
            "No hay reclamaciones.",
          ),
          searchPlaceholder: "Buscar por skill o solicitante…",
        }}
      />

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
            <p className="auditor-admin-dialog-copy text-sm">
              {selected?.message}
            </p>
            {pendingAction === "Rechazar" && (
              <div className="grid gap-2">
                <Label htmlFor="rejection-reason">Motivo de rechazo</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Explica por qué se rechaza la solicitud."
                />
              </div>
            )}
          </div>
          <SheetFooter className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setPendingAction("Ocultar la skill")}
            >
              Ocultar la skill
            </Button>
            <Button
              variant="outline"
              onClick={() => setPendingAction("Bloquear el repositorio")}
            >
              Bloquear el repositorio
            </Button>
            <Button
              variant="outline"
              onClick={() => setPendingAction("Pedir un reanálisis")}
            >
              Pedir un reanálisis
            </Button>
            <Button onClick={() => setPendingAction("Rechazar")}>
              Rechazar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title={`Confirmar: ${pendingAction ?? ""}`}
        description={
          pendingAction === "Rechazar"
            ? `La solicitud se marcará como rechazada. Motivo: ${rejectionReason || "sin motivo indicado"}.`
            : `Se aplicará la acción «${pendingAction ?? ""}» a esta solicitud.`
        }
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
