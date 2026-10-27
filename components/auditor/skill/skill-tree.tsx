"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/auditor/ui/button";
import { NavLink } from "@/components/auditor/ui/nav-link";
import { SidebarSection } from "@/components/auditor/ui/sidebar-section";
import { pluralize } from "@/lib/auditor/labels";
import { X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SkillAnalysis, SkillFile } from "@/lib/auditor/types";

const sections = [
  ["summary", "Resumen"], ["install", "Instalación"],
  ["findings", "Hallazgos"], ["sandbox", "Ejecución aislada"],
  ["changes", "Cambios"],
] as const;

function riskTone(file: SkillFile, analysis: SkillAnalysis) {
  const rank = { critical: 4, high: 3, medium: 2, low: 1 };
  const finding = analysis.findings
    .filter((item) => item.file === file.path)
    .toSorted((a, b) => rank[b.severity] - rank[a.severity])[0];
  if (!finding) return "safe";
  return rank[finding.severity] >= 3 ? "critical" :
    rank[finding.severity] === 2 ? "medium" : "low";
}

function Tree({
  analysis, selected, onSelect, onOpenFile,
}: {
  analysis: SkillAnalysis;
  selected?: string;
  onSelect: (item: string) => void;
  onOpenFile: (path: string) => void;
}) {
  const [closed, setClosed] = useState<string[]>([]);
  const tree = useMemo(() => {
    const roots: Record<string, SkillFile[]> = {};
    for (const file of analysis.files) {
      const [folder] = file.path.split("/");
      (roots[folder] ??= []).push(file);
    }
    return Object.entries(roots);
  }, [analysis.files]);

  return (
    <div className="auditor-skill-tree">
      <SidebarSection title="Reporte">
        {sections.map(([id, label]) => (
          <li key={id}>
            <NavLink active={selected === id} onClick={() => onSelect(id)}
              count={id === "findings" ? analysis.findings.length : undefined}>
              {label}
            </NavLink>
          </li>
        ))}
      </SidebarSection>
      <SidebarSection title={pluralize(analysis.files.length, "archivo", "archivos")}>
        {tree.map(([folder, files]) => {
          const isFolder = !folder.includes(".");
          const opened = !closed.includes(folder);
          const selectedFile = files.find((file) => file.path === selected);
          if (isFolder) {
            return (
              <li key={folder}>
                <NavLink active={Boolean(selectedFile)} expanded={opened}
                  onClick={() => setClosed((current) => current.includes(folder)
                    ? current.filter((item) => item !== folder) : [...current, folder])}>
                  {folder}/
                </NavLink>
                {opened && <ul className="auditor-tree-children">
                  {files.map((file) => {
                    const name = file.path.split("/").slice(1).join("/") || file.path;
                    const count = analysis.findings.filter((finding) => finding.file === file.path).length;
                    return (
                      <Tooltip key={file.path}>
                        <TooltipTrigger asChild>
                          <li className="auditor-tree-child">
                            <NavLink active={selected === file.path} onClick={() => onSelect(file.path)}
                              icon={<span className={`auditor-risk-dot auditor-risk-dot--${riskTone(file, analysis)}`} />}
                              count={count || undefined}>
                              {name}
                            </NavLink>
                          </li>
                        </TooltipTrigger>
                        <TooltipContent side="right">{file.path}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </ul>}
              </li>
            );
          }
          const file = files[0];
          return (
            <Tooltip key={folder}>
              <TooltipTrigger asChild>
                <li>
                  <NavLink active={selected === file.path}
                    onClick={() => onSelect(file.path)}
                    icon={<span className={`auditor-risk-dot auditor-risk-dot--${riskTone(file, analysis)}`} />}>
                    {folder}
                  </NavLink>
                </li>
              </TooltipTrigger>
              <TooltipContent side="right">{file.path}</TooltipContent>
            </Tooltip>
          );
        })}
      </SidebarSection>
      {analysis.plugin && (
        <SidebarSection title={`Plugin ${analysis.plugin.pluginName}`}>
          {analysis.plugin.items.map((item) => (
            <li key={item.path}>
            <NavLink onClick={() => onOpenFile(item.path)}>
              {item.kind === "mcp" ? "Conexión MCP" : item.kind}: {item.path}
            </NavLink>
            </li>
          ))}
        </SidebarSection>
      )}
    </div>
  );
}

export function SkillTree({
  analysis, selected, onSelect, onOpenFile,
}: {
  analysis: SkillAnalysis;
  selected?: string;
  onSelect: (item: string) => void;
  onOpenFile: (path: string) => void;
}) {
  return (
    <>
      <aside className="auditor-skill-sidebar auditor-skill-sidebar--desktop">
        <ScrollArea className="auditor-skill-scroll">
          <Tree analysis={analysis} selected={selected} onSelect={onSelect} onOpenFile={onOpenFile} />
        </ScrollArea>
      </aside>
      <div className="auditor-skill-sidebar--mobile">
        <Sheet>
          <SheetTrigger asChild>
            <Button className="mb-3" variant="secondary" size="sm">Archivos y reporte</Button>
          </SheetTrigger>
          <SheetContent side="left" className="auditor-public-sheet overflow-y-auto" showCloseButton={false}>
            <SheetClose asChild>
              <Button className="auditor-public-sheet__close" variant="ghost" size="sm" aria-label="Cerrar">
                <X aria-hidden="true" />
              </Button>
            </SheetClose>
            <SheetHeader><SheetTitle>Reporte y archivos</SheetTitle></SheetHeader>
            <Tree analysis={analysis} selected={selected} onSelect={onSelect} onOpenFile={onOpenFile} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
