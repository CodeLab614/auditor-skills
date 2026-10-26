"use client";

import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlatformLimits } from "@/lib/auditor/types";

const fields: { key: keyof PlatformLimits; label: string; min: number; step?: number }[] = [
  { key: "monthlyAnalyses", label: "Análisis gratuitos al mes", min: 1 },
  { key: "spendCapUsd", label: "Tope de gasto en IA (USD)", min: 0, step: 0.5 },
  { key: "maxPerSubmission", label: "Máximo de skills por envío", min: 1 },
  { key: "maxTotalMb", label: "Tamaño total (MB)", min: 1 },
  { key: "maxFiles", label: "Número máximo de archivos", min: 1 },
  { key: "maxFileKb", label: "Tamaño máximo por archivo (KB)", min: 1 },
];

export function LimitsContent({ limits }: { limits: PlatformLimits }) {
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Límites de la plataforma" description="Aplicados a análisis nuevos" />
      <Card className="mx-5 mt-5 max-w-3xl">
        <CardHeader><CardTitle>Cuotas y tamaño de las skills</CardTitle></CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              toast("Maqueta: los límites no se guardan todavía");
            }}
          >
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.key} className="grid gap-2">
                  <Label htmlFor={`limit-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`limit-${field.key}`}
                    type="number"
                    min={field.min}
                    step={field.step ?? 1}
                    defaultValue={limits[field.key]}
                  />
                </div>
              ))}
            </div>
            <div><Button type="submit">Guardar límites</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
