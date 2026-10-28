"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/auditor/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TextField } from "@/components/auditor/ui/text-field";

export function ReportDialog({
  open,
  onOpenChange,
  signedIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signedIn: boolean;
}) {
  const [reason, setReason] = useState("error");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="auditor-public-dialog" showCloseButton={false}>
        <DialogClose asChild>
          <Button
            className="auditor-public-dialog__close"
            variant="ghost"
            size="sm"
            aria-label="Cerrar"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
        <DialogHeader>
          <DialogTitle>Reportar un problema</DialogTitle>
          <DialogDescription>
            Tu solicitud llega al equipo del auditor, que la revisa y te responde por correo.
          </DialogDescription>
        </DialogHeader>
        {signedIn ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onOpenChange(false);
              toast("Maqueta: la solicitud no se envía todavía");
            }}
            className="space-y-4"
          >
            <div className="grid gap-2 text-sm">
              <Label htmlFor="report-reason">Motivo</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger
                  id="report-reason"
                  className="auditor-report-dialog__select-trigger"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="auditor-public-select-content">
                  <SelectItem value="error">
                    El análisis tiene un error
                  </SelectItem>
                  <SelectItem value="takedown">
                    Soy el autor y quiero retirarla
                  </SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <TextField
              id="report-explanation"
              label="Explicación"
              as="textarea"
              required
              rows={5}
              placeholder="Describe la solicitud y la evidencia relevante."
              className="auditor-report-dialog__textarea"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Enviar solicitud</Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Inicia sesión para enviar una solicitud o informar de un error.
            </p>
            <Button asChild>
              <Link href="/auth/login">Iniciar sesión</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
