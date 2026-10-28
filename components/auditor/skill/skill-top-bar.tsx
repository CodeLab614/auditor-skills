"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/auditor/ui/button";
import { Panel } from "@/components/auditor/ui/panel";
import { VerdictBadge } from "@/components/auditor/verdict-badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate } from "@/lib/auditor/labels";
import { analysisHref } from "@/lib/auditor/skill-links";
import type { SkillAnalysis } from "@/lib/auditor/types";

export function SkillTopBar({
  analysis,
  onAuthor,
}: {
  analysis: SkillAnalysis;
  onAuthor: () => void;
}) {
  const router = useRouter();
  const current = analysis.versions.find((version) => version.number === analysis.version);
  const segments = analysis.path.split("/").filter(Boolean);
  const lastSegment = segments.at(-1) ?? analysis.slug;

  return (
    <header className="auditor-skill-top-bar">
      <Panel className="auditor-skill-heading-card" contentClassName="p-4 sm:p-5">
        <div className="auditor-skill-heading-layout">
          <div className="min-w-0 flex-1">
            <Breadcrumb className="auditor-skill-breadcrumb">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link href="/skills">Catálogo</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <a href={`https://github.com/${analysis.owner}/${analysis.repo}`}>
                      {analysis.owner}/{analysis.repo}
                    </a>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>{lastSegment}</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="auditor-skill-heading-title">
              <h1>{analysis.name}</h1>
              <VerdictBadge verdict={analysis.verdict} warnings={analysis.findings.length} />
            </div>
            <p className="auditor-skill-heading-meta">
              {analysis.path} · Analizada el {current ? formatDate(current.analyzedAt) : ""}
              {current?.commit && <> · {current.commit}</>}
            </p>
            {current?.reason && (
              <p className="auditor-skill-heading-change">
                <strong>Novedades de la versión {analysis.version}:</strong> {current.reason}
              </p>
            )}
          </div>
          <div className="auditor-skill-heading-actions">
            <Select
              value={String(analysis.version)}
              onValueChange={(value) =>
                router.push(
                  analysisHref(analysis.slug, { version: Number(value) }),
                )
              }
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectTrigger aria-label="Seleccionar versión"
                    className="auditor-version-select w-full sm:w-auto">
                    <SelectValue />
                  </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent>Cambiar la versión del análisis</TooltipContent>
              </Tooltip>
              <SelectContent>
                {analysis.versions.map((version) => (
                  <SelectItem key={version.number} value={String(version.number)}>
                    Versión {version.number} · {version.commit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="default" variant="secondary" onClick={onAuthor}>
              Soy el autor / reportar un error
            </Button>
          </div>
        </div>
      </Panel>
    </header>
  );
}
