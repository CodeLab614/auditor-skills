"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/auditor/ui/button";
import { GitHubMark } from "@/components/auditor/ui/github-mark";
import { InlineLink } from "@/components/auditor/ui/inline-link";
import { NavLink } from "@/components/auditor/ui/nav-link";
import { VerdictMark } from "@/components/auditor/verdict-mark";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatDay, isInstallable } from "@/lib/auditor/labels";
import { analysisHref } from "@/lib/auditor/skill-links";
import type { Verdict } from "@/lib/auditor/types";
import { cn } from "@/lib/utils";

export interface SkillHeaderProps {
  name: string;
  owner: string;
  repo: string;
  verdict: Verdict;
  analyzedAt: string;
  current: "details" | "analysis";
  otherHref: string;
  slug: string;
  versions?: { number: number; commit: string; analyzedAt: string }[];
  currentVersion?: number;
  onReport?: () => void;
  className?: string;
}

export function SkillHeader({
  name,
  owner,
  repo,
  verdict,
  analyzedAt,
  current,
  otherHref,
  slug,
  versions,
  currentVersion,
  onReport,
  className,
}: SkillHeaderProps) {
  const buttonText =
    current === "details"
      ? "Ver el informe de análisis →"
      : "Ver qué hace →";

  const hasMultipleVersions = Boolean(versions && versions.length > 1);
  const previousCount = hasMultipleVersions && versions ? versions.length - 1 : 0;

  const sortedVersions = versions
    ? [...versions].toSorted((a, b) => {
        if (b.number !== a.number) return b.number - a.number;
        return new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime();
      })
    : [];

  const latestVersion = sortedVersions[0];
  const isViewingOlderVersion =
    currentVersion !== undefined &&
    latestVersion !== undefined &&
    currentVersion !== latestVersion.number;

  const currentVersionInfo = versions?.find((v) => v.number === currentVersion);
  const viewingDate = currentVersionInfo ? currentVersionInfo.analyzedAt : analyzedAt;

  return (
    <header className={cn("auditor-skill-header", className)}>
      <div className="auditor-skill-header__content">
        <Breadcrumb className="auditor-skill-breadcrumb">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/skills">Catálogo</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a
                  href={`https://github.com/${owner}/${repo}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {owner}/{repo}
                </a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="auditor-skill-header__title">{name}</h1>

        <div className="auditor-skill-header__meta auditor-mono-label">
          <span className="auditor-catalog-row__project">
            <GitHubMark className="auditor-catalog-row__project-icon" />
            <span className="auditor-catalog-row__owner">{owner}</span>
            <span className="auditor-catalog-row__slash" aria-hidden="true">
              {" "}/{" "}
            </span>
            <span className="auditor-catalog-row__repo">{repo}</span>
          </span>

          <span className="auditor-skill-header__sep" aria-hidden="true">
            {" "}·{" "}
          </span>

          <VerdictMark verdict={verdict} />

          <span className="auditor-skill-header__sep" aria-hidden="true">
            {" "}·{" "}
          </span>

          <span className="auditor-skill-header__installable">
            {isInstallable(verdict) ? (
              <>
                <Check
                  className="auditor-catalog-row__installable-icon auditor-catalog-row__installable-icon--safe"
                  size={14}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span>Instalable</span>
              </>
            ) : (
              <>
                <X
                  className={cn(
                    "auditor-catalog-row__installable-icon",
                    verdict === "dangerous"
                      ? "auditor-catalog-row__installable-icon--dangerous"
                      : "auditor-catalog-row__installable-icon--review",
                  )}
                  size={14}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span>No instalable</span>
              </>
            )}
          </span>
        </div>

        <div className="auditor-skill-header__history auditor-mono-label">
          <span className="auditor-skill-header__date">
            Analizada el {formatDay(analyzedAt)}
          </span>
          {hasMultipleVersions && (
            <>
              <span className="auditor-skill-header__sep" aria-hidden="true">
                {" "}·{" "}
              </span>
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="link"
                    className="auditor-skill-header__history-trigger"
                  >
                    Ver análisis anteriores ({previousCount})
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="auditor-public-sheet overflow-y-auto"
                  showCloseButton={false}
                >
                  <SheetClose asChild>
                    <Button
                      className="auditor-public-sheet__close"
                      variant="ghost"
                      size="sm"
                      aria-label="Cerrar"
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </SheetClose>
                  <SheetHeader>
                    <SheetTitle>Análisis anteriores</SheetTitle>
                  </SheetHeader>
                  <nav
                    aria-label="Análisis anteriores"
                    className="auditor-skill-header__versions-list"
                  >
                    {sortedVersions.map((version) => (
                      <NavLink
                        key={version.number}
                        href={analysisHref(slug, { version: version.number })}
                        active={currentVersion === version.number}
                        count={version.commit ? version.commit.slice(0, 7) : ""}
                      >
                        {formatDay(version.analyzedAt)}
                      </NavLink>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>

        {isViewingOlderVersion && (
          <p className="auditor-skill-header__legacy-note">
            Estás viendo el análisis del {formatDay(viewingDate)} ·{" "}
            <InlineLink href={analysisHref(slug)}>Ver el último</InlineLink>
          </p>
        )}
      </div>

      <div className="auditor-skill-header__action auditor-skill-header__actions">
        {onReport && (
          <Button variant="secondary" onClick={onReport}>
            Reportar un problema
          </Button>
        )}
        <Button asChild variant="secondary">
          <Link href={otherHref}>{buttonText}</Link>
        </Button>
      </div>
    </header>
  );
}
