"use client";

import { useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/auditor/ui/button";
import { CornerBox } from "@/components/auditor/ui/corner-box";
import { NavLink } from "@/components/auditor/ui/nav-link";
import { SidebarSection } from "@/components/auditor/ui/sidebar-section";
import { SectionHeader } from "@/components/auditor/ui/section-header";
import { VerdictMark } from "@/components/auditor/verdict-mark";
import { SkillIcon } from "@/components/auditor/ui/skill-icon";
import { GitHubMark } from "@/components/auditor/ui/github-mark";
import { PageShell } from "@/components/auditor/page-shell";
import { Pagination } from "@/components/auditor/ui/pagination";
import {
  formatCount,
  formatDay,
  isInstallable,
  verdictLabel,
} from "@/lib/auditor/labels";
import {
  catalogQuery,
  type CatalogFilter,
  type CatalogPage,
} from "@/lib/auditor/catalog-query";
import type { TableParams } from "@/lib/table-query";
import { useTableUrlState } from "@/components/dashboard/table-view/use-table-url-state";
import { cn } from "@/lib/utils";

export type CatalogContentProps = CatalogPage & {
  params: TableParams<CatalogFilter>;
  basePath: string;
};

export function CatalogContent({
  rows,
  total,
  catalogTotal,
  totalPages,
  page,
  verdictCounts,
  remoteCounts,
  params,
  basePath,
}: CatalogContentProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const {
    searchQuery,
    setSearchQuery,
    filters,
    toggleFilterValue,
    removeFilterValue,
    clearAll,
    getPageHref,
    isPending,
  } = useTableUrlState({
    basePath,
    query: catalogQuery,
    params,
    onChange: () => {},
  });

  const activeVerdict = filters.verdict[0];
  const activeRemote = filters.remote[0];
  const activeSort = filters.sort[0] || "recent";

  const activeFiltersCount = (activeVerdict ? 1 : 0) + (activeRemote ? 1 : 0);
  const filterButtonLabel =
    activeFiltersCount > 0
      ? `Filtros · ${formatCount(activeFiltersCount)}`
      : "Filtros";

  const filterContent = (
    <>
      <SidebarSection title="Veredicto">
        <li>
          <NavLink
            active={!activeVerdict}
            onClick={() => {
              if (activeVerdict) removeFilterValue("verdict", activeVerdict);
              setMobileSheetOpen(false);
            }}
            count={formatCount(verdictCounts.all)}
          >
            Todos
          </NavLink>
        </li>
        <li>
          <NavLink
            active={activeVerdict === "dangerous"}
            onClick={() => {
              toggleFilterValue("verdict", "dangerous");
              setMobileSheetOpen(false);
            }}
            count={formatCount(verdictCounts.dangerous)}
          >
            {verdictLabel.dangerous}
          </NavLink>
        </li>
        <li>
          <NavLink
            active={activeVerdict === "review"}
            onClick={() => {
              toggleFilterValue("verdict", "review");
              setMobileSheetOpen(false);
            }}
            count={formatCount(verdictCounts.review)}
          >
            {verdictLabel.review}
          </NavLink>
        </li>
        <li>
          <NavLink
            active={activeVerdict === "no-serious-findings"}
            onClick={() => {
              toggleFilterValue("verdict", "no-serious-findings");
              setMobileSheetOpen(false);
            }}
            count={formatCount(verdictCounts["no-serious-findings"])}
          >
            {verdictLabel["no-serious-findings"]}
          </NavLink>
        </li>
      </SidebarSection>

      <SidebarSection title="Scripts remotos">
        <li>
          <NavLink
            active={!activeRemote}
            onClick={() => {
              if (activeRemote) removeFilterValue("remote", activeRemote);
              setMobileSheetOpen(false);
            }}
            count={formatCount(remoteCounts.all)}
          >
            Todos
          </NavLink>
        </li>
        <li>
          <NavLink
            active={activeRemote === "yes"}
            onClick={() => {
              toggleFilterValue("remote", "yes");
              setMobileSheetOpen(false);
            }}
            count={formatCount(remoteCounts.yes)}
          >
            Con scripts remotos
          </NavLink>
        </li>
        <li>
          <NavLink
            active={activeRemote === "no"}
            onClick={() => {
              toggleFilterValue("remote", "no");
              setMobileSheetOpen(false);
            }}
            count={formatCount(remoteCounts.no)}
          >
            Sin scripts remotos
          </NavLink>
        </li>
      </SidebarSection>

      <SidebarSection title="Ordenar">
        <li>
          <NavLink
            active={activeSort === "recent"}
            onClick={() => {
              if (filters.sort[0]) removeFilterValue("sort", filters.sort[0]);
              setMobileSheetOpen(false);
            }}
          >
            Más recientes
          </NavLink>
        </li>
        <li>
          <NavLink
            active={activeSort === "name"}
            onClick={() => {
              toggleFilterValue("sort", "name");
              setMobileSheetOpen(false);
            }}
          >
            Nombre (A-Z)
          </NavLink>
        </li>
        <li>
          <NavLink
            active={activeSort === "most-warnings"}
            onClick={() => {
              toggleFilterValue("sort", "most-warnings");
              setMobileSheetOpen(false);
            }}
          >
            Más avisos
          </NavLink>
        </li>
        <li>
          <NavLink
            active={activeSort === "fewest-warnings"}
            onClick={() => {
              toggleFilterValue("sort", "fewest-warnings");
              setMobileSheetOpen(false);
            }}
          >
            Menos avisos
          </NavLink>
        </li>
      </SidebarSection>
    </>
  );

  const hasActiveFilterOrSearch = Boolean(
    searchQuery.trim() || activeVerdict || activeRemote,
  );
  const trailingText = hasActiveFilterOrSearch
    ? `${formatCount(total)} ${
        total === 1 ? "resultado" : "resultados"
      } de ${formatCount(catalogTotal)} skills`
    : `${formatCount(catalogTotal)} skills`;

  const skillHeader = activeSort === "name" ? "Skill ↑" : "Skill";
  const avisosHeader =
    activeSort === "most-warnings"
      ? "Avisos ↓"
      : activeSort === "fewest-warnings"
        ? "Avisos ↑"
        : "Avisos";
  const dateHeader =
    activeSort === "recent" ? "Último análisis ↓" : "Último análisis";

  return (
    <PageShell wide left={filterContent} className="auditor-catalog">
      <div className="auditor-catalog__main">
        <section id="catalog" className="auditor-results-section">
          <SectionHeader
            label="Archivo público"
            title="Catálogo de skills"
            trailing={trailingText}
          />
          <div className="auditor-catalog__mobile-filters">
            <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="secondary" size="sm">
                  {filterButtonLabel}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
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
                  <SheetTitle>Filtros y orden</SheetTitle>
                </SheetHeader>
                <div className="auditor-catalog-filters">{filterContent}</div>
              </SheetContent>
            </Sheet>
          </div>
          <CornerBox className="auditor-content-box auditor-results-box">
            <div className="auditor-search-row">
              <label className="auditor-search-box">
                <Search aria-hidden="true" />
                <Input
                  className="auditor-text-field__control"
                  aria-label="Buscar skill o repositorio"
                  placeholder="Buscar por nombre o repositorio"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
            </div>
            <div className="auditor-catalog-table">
              <div
                className="auditor-catalog-table__head auditor-mono-label"
                aria-hidden="true"
              >
                <span className="auditor-catalog-table__th auditor-catalog-table__th--skill">
                  {skillHeader}
                </span>
                <span className="auditor-catalog-table__th auditor-catalog-table__th--verdict">
                  Veredicto
                </span>
                <span className="auditor-catalog-table__th auditor-catalog-table__th--installable">
                  Instalable
                </span>
                <span className="auditor-catalog-table__th auditor-catalog-table__th--warnings">
                  {avisosHeader}
                </span>
                <span className="auditor-catalog-table__th auditor-catalog-table__th--versions">
                  Versiones analizadas
                </span>
                <span className="auditor-catalog-table__th auditor-catalog-table__th--date">
                  {dateHeader}
                </span>
              </div>
              {rows.length > 0 ? (
                <ul
                  className={cn(
                    "auditor-catalog-table__rows",
                    isPending && "is-pending",
                  )}
                  aria-busy={isPending}
                >
                  {rows.map((entry) => (
                    <li
                      key={entry.slug}
                      className="auditor-catalog-table__item"
                    >
                      <NavLink
                        href={`/skills/${entry.slug}`}
                        bareChildren
                        className="auditor-catalog-row auditor-link-box"
                      >
                        <span className="auditor-catalog-row__skill">
                          <SkillIcon />
                          <span className="auditor-catalog-row__skill-content">
                            <span className="auditor-catalog-row__name">
                              {entry.name}
                            </span>
                            <span className="auditor-catalog-row__desc">
                              {entry.description}
                            </span>
                            <span className="auditor-mono-label auditor-catalog-row__project">
                              <GitHubMark className="auditor-catalog-row__project-icon" />
                              <span className="auditor-catalog-row__owner">
                                {entry.owner}
                              </span>
                              <span
                                className="auditor-catalog-row__slash"
                                aria-hidden="true"
                              >
                                {" "}
                                /{" "}
                              </span>
                              <span className="auditor-catalog-row__repo">
                                {entry.repo}
                              </span>
                            </span>
                          </span>
                        </span>
                        <span className="auditor-catalog-row__verdict auditor-mono-label">
                          <span className="auditor-catalog-row__verdict-badge">
                            <VerdictMark verdict={entry.verdict} /><span
                              className="auditor-catalog-row__mobile-sep"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                          </span>
                          <span className="auditor-catalog-row__mobile-installable">
                            {isInstallable(entry.verdict) ? (
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
                                    entry.verdict === "dangerous"
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
                        </span>
                        <span className="auditor-catalog-row__installable">
                          {isInstallable(entry.verdict) ? (
                            <>
                              <Check
                                className="auditor-catalog-row__installable-icon auditor-catalog-row__installable-icon--safe"
                                size={16}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              <span className="sr-only">Instalable: sí</span>
                            </>
                          ) : (
                            <>
                              <X
                                className={cn(
                                  "auditor-catalog-row__installable-icon",
                                  entry.verdict === "dangerous"
                                    ? "auditor-catalog-row__installable-icon--dangerous"
                                    : "auditor-catalog-row__installable-icon--review",
                                )}
                                size={16}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              <span className="sr-only">Instalable: no</span>
                            </>
                          )}
                        </span>
                        <span className="auditor-catalog-row__meta auditor-mono-label">
                          <span className="auditor-catalog-row__warnings">
                            <span className="auditor-catalog-row__meta-prefix">
                              Avisos{" "}
                            </span>
                            <span className="sr-only">Avisos: </span>
                            {formatCount(entry.warnings)}<span
                              className="auditor-catalog-row__mobile-sep"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                          </span>
                          <span className="auditor-catalog-row__versions">
                            <span className="auditor-catalog-row__meta-prefix">
                              Versiones analizadas{" "}
                            </span>
                            <span className="sr-only">
                              Versiones analizadas:{" "}
                            </span>
                            {formatCount(entry.versionCount)}<span
                              className="auditor-catalog-row__mobile-sep"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                          </span>
                          <span className="auditor-catalog-row__date">
                            <span className="sr-only">
                              Último análisis:{" "}
                            </span>
                            {formatDay(entry.analyzedAt)}
                          </span>
                        </span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="auditor-empty-row">
                  {searchQuery ? (
                    <>No hay resultados para «{searchQuery}». </>
                  ) : (
                    <>No hay resultados con estos filtros. </>
                  )}
                  <NavLink
                    onClick={clearAll}
                    className="auditor-empty-row__action"
                  >
                    Quitar filtros
                  </NavLink>
                </p>
              )}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={params.pageSize}
              getPageHref={getPageHref}
            />
          </CornerBox>
        </section>
      </div>
    </PageShell>
  );
}
