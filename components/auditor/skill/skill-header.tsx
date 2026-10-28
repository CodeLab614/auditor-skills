"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/auditor/ui/button";
import { GitHubMark } from "@/components/auditor/ui/github-mark";
import { VerdictMark } from "@/components/auditor/verdict-mark";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { formatDay, isInstallable } from "@/lib/auditor/labels";
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
  className,
}: SkillHeaderProps) {
  const buttonText =
    current === "details"
      ? "Ver el informe de análisis →"
      : "Ver qué hace →";

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

          <span className="auditor-skill-header__sep" aria-hidden="true">
            {" "}·{" "}
          </span>

          <span className="auditor-skill-header__date">
            Analizada el {formatDay(analyzedAt)}
          </span>
        </div>
      </div>

      <div className="auditor-skill-header__action">
        <Button asChild variant="secondary">
          <Link href={otherHref}>{buttonText}</Link>
        </Button>
      </div>
    </header>
  );
}
