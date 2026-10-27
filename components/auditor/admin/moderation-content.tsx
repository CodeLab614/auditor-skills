"use client";

import Link from "next/link";
import {
  PageHeader,
  TableView,
  type BulkAction,
  type RowAction,
  type TableViewColumn,
  type TableViewFilter,
} from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, verdictLabel } from "@/lib/auditor/labels";
import { auditorTableLabels } from "@/lib/auditor/table-labels";
import {
  blockedReposTableQuery,
  skillsTableQuery,
  type BlockedReposTableFilter,
  type SkillsTableFilter,
} from "@/lib/auditor/table-queries";
import type { BlockedRepo, ModeratedSkill } from "@/lib/auditor/types";
import type { TableParams } from "@/lib/table-query";

const SKILL_FILTERS: TableViewFilter<SkillsTableFilter>[] = [
  {
    key: "visibility",
    label: "Visibilidad",
    options: [
      { value: "visible", label: "Visible" },
      { value: "hidden", label: "Oculta" },
    ],
  },
];

const SKILL_COLUMNS: TableViewColumn<ModeratedSkill>[] = [
  {
    id: "name",
    header: "Skill",
    required: true,
    render: (item) => (
      <div className="flex flex-col">
        <Link
          className="underline underline-offset-4"
          href={`/skills/${item.slug}`}
        >
          {item.name}
        </Link>
        <span className="font-mono text-xs text-muted-foreground">
          {item.path}
        </span>
      </div>
    ),
  },
  {
    id: "repo",
    header: "Repositorio",
    render: (item) => <span className="break-all">{item.repo}</span>,
  },
  {
    id: "analyzedVersions",
    header: "Versiones analizadas",
    render: (item) => item.analyzedVersions,
  },
  {
    id: "latestVerdict",
    header: "Último veredicto",
    render: (item) =>
      item.latestVerdict ? (
        <Badge
          variant={
            item.latestVerdict === "dangerous"
              ? "destructive"
              : item.latestVerdict === "review"
                ? "secondary"
                : "default"
          }
        >
          {verdictLabel[item.latestVerdict]}
        </Badge>
      ) : (
        <span className="text-muted-foreground">Sin analizar</span>
      ),
  },
  {
    id: "visibility",
    header: "Visibilidad",
    render: (item) => (
      <Badge variant={item.hidden ? "secondary" : "default"}>
        {item.hidden ? "Oculta" : "Visible"}
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

const REPO_COLUMNS: TableViewColumn<BlockedRepo>[] = [
  {
    id: "repo",
    header: "Repositorio",
    required: true,
    render: (item) => <span className="break-all">{item.repo}</span>,
  },
  {
    id: "reason",
    header: "Motivo",
    render: (item) => item.reason,
  },
  {
    id: "blockedAt",
    header: "Bloqueado el",
    render: (item) => (
      <span className="font-mono text-[13px] text-muted-foreground">
        {formatDate(item.blockedAt)}
      </span>
    ),
  },
  {
    id: "blockedBy",
    header: "Bloqueado por",
    render: (item) => item.blockedBy,
  },
];

interface ModerationSkillsProps {
  view: "skills";
  skills: ModeratedSkill[];
  total: number;
  totalPages: number;
  params: TableParams<SkillsTableFilter>;
  hiddenColumns: string[];
}

interface ModerationReposProps {
  view: "repos";
  repos: BlockedRepo[];
  total: number;
  totalPages: number;
  params: TableParams<BlockedReposTableFilter>;
  hiddenColumns: string[];
}

export type ModerationContentProps =
  | ModerationSkillsProps
  | ModerationReposProps;

export function ModerationContent(props: ModerationContentProps) {
  const skillRowActions = (
    item: ModeratedSkill,
  ): RowAction<ModeratedSkill>[] => [
    {
      id: "view",
      label: "Ver página",
      href: `/skills/${item.slug}`,
    },
    {
      id: "toggle-hide",
      label: item.hidden ? "Mostrar" : "Ocultar",
      disabled: true,
      hint: "Fase 7",
    },
    {
      id: "block-repo",
      label: "Bloquear repositorio",
      disabled: true,
      hint: "Fase 7",
    },
  ];

  const skillBulkActions: BulkAction[] = [
    {
      id: "hide",
      label: "Ocultar",
      disabled: true,
      hint: "Disponible en la fase 7",
    },
  ];

  const repoRowActions = (): RowAction<BlockedRepo>[] => [
    {
      id: "unblock",
      label: "Desbloquear",
      disabled: true,
      hint: "Fase 7",
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Skills y repositorios"
        description="Moderación del catálogo"
      />
      <nav
        className="flex gap-2 px-5 py-4"
        aria-label="Secciones de moderación"
      >
        <Button
          variant={props.view === "skills" ? "secondary" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/dashboard/auditor/skills">Skills del catálogo</Link>
        </Button>
        <Button
          variant={props.view === "repos" ? "secondary" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/dashboard/auditor/skills?view=repos">
            Repositorios bloqueados
          </Link>
        </Button>
      </nav>

      {props.view === "skills" ? (
        <TableView
          tableId="auditor-skills"
          basePath="/dashboard/auditor/skills"
          query={skillsTableQuery}
          params={props.params}
          rows={props.skills}
          total={props.total}
          totalPages={props.totalPages}
          columns={SKILL_COLUMNS}
          hiddenColumns={props.hiddenColumns}
          filters={SKILL_FILTERS}
          rowActions={skillRowActions}
          bulkActions={skillBulkActions}
          labels={{
            ...auditorTableLabels(
              { singular: "skill", plural: "skills" },
              "No hay skills.",
            ),
            searchPlaceholder: "Buscar por skill o repositorio…",
          }}
        />
      ) : (
        <>
          <p className="px-5 py-2.5 text-sm text-muted-foreground">
            Bloquear impide analizar sus skills presentes y futuras.
          </p>
          <TableView
            tableId="auditor-blocked-repos"
            basePath="/dashboard/auditor/skills"
            query={blockedReposTableQuery}
            params={props.params}
            rows={props.repos}
            total={props.total}
            totalPages={props.totalPages}
            columns={REPO_COLUMNS}
            hiddenColumns={props.hiddenColumns}
            rowActions={repoRowActions}
            labels={{
              ...auditorTableLabels(
                { singular: "repositorio", plural: "repositorios" },
                "No hay repositorios bloqueados.",
              ),
              searchPlaceholder: "Buscar por repositorio o motivo…",
            }}
          />
        </>
      )}
    </div>
  );
}
