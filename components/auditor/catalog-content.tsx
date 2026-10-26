"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/auditor/ui/button";
import { Heading } from "@/components/auditor/ui/heading";
import { Text } from "@/components/auditor/ui/text";
import {
  CornerBox,
} from "@/components/auditor/ui/corner-box";
import { NavLink } from "@/components/auditor/ui/nav-link";
import { SidebarSection } from "@/components/auditor/ui/sidebar-section";
import { SectionHeader } from "@/components/auditor/ui/section-header";
import { VerdictBadge } from "@/components/auditor/verdict-badge";
import { PageShell } from "@/components/auditor/page-shell";
import { PipelineIllustration } from "@/components/auditor/pipeline-illustration";
import { formatDate, pluralize, verdictLabel } from "@/lib/auditor/labels";
import type { CatalogEntry, Verdict } from "@/lib/auditor/types";

const verdicts: Array<{ id: Verdict | "all"; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "dangerous", label: verdictLabel.dangerous },
  { id: "review", label: verdictLabel.review },
  { id: "no-serious-findings", label: verdictLabel["no-serious-findings"] },
];

export function CatalogContent({
  catalog,
  initialQuery,
  initialVerdict,
}: {
  catalog: CatalogEntry[];
  initialQuery: string;
  initialVerdict: Verdict | "all";
}) {
  const [query, setQuery] = useState(initialQuery);
  const [verdict, setVerdict] = useState<Verdict | "all">(initialVerdict);
  const [activeSection, setActiveSection] = useState("top");
  const entries = useMemo(
    () =>
      catalog
        .filter((entry) => {
          const haystack =
            `${entry.name} ${entry.owner}/${entry.repo} ${entry.path}`.toLocaleLowerCase(
              "es",
            );
          return (
            haystack.includes(query.toLocaleLowerCase("es")) &&
            (verdict === "all" || entry.verdict === verdict)
          );
        })
        .toSorted((a, b) => b.analyzedAt.localeCompare(a.analyzedAt)),
    [catalog, query, verdict],
  );

  useEffect(() => {
    const sections = ["top", "how-it-works", "catalog"]
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .toSorted((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (current) setActiveSection(current.target.id);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.15, 0.4] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".auditor-hero__stats, .auditor-hero__panel, .auditor-process-section, " +
          ".auditor-results-section, .auditor-site-footer",
      ),
    );
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver((records) => {
      records.forEach((record) => {
        if (record.isIntersecting) {
          record.target.classList.add("is-visible");
          observer.unobserve(record.target);
        }
      });
    }, { threshold: 0.08 });
    sections.forEach((section) => {
      section.classList.add("auditor-reveal");
      observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  const warnings = catalog.reduce((count, entry) => count + entry.warnings, 0);
  const stats = [
    ["Skills analizadas", String(catalog.length)],
    [
      "Versiones",
      String(catalog.reduce((count, entry) => count + entry.versionCount, 0)),
    ],
    ["Avisos críticos", String(warnings)],
    ["Análisis en curso", "2"],
  ];

  const sidebar = (
      <>
        <SidebarSection title="Cifras">
          {stats.map(([label, value]) => (
            <li className="auditor-stat-row" key={label}>
              <span>{label}</span><strong>{value}</strong>
            </li>
          ))}
        </SidebarSection>
        <SidebarSection title="Veredicto">
          {verdicts.map((item) => (
            <li key={item.id}>
              <NavLink active={verdict === item.id} onClick={() => setVerdict(item.id)}
                count={item.id === "all" ? catalog.length :
                  catalog.filter((entry) => entry.verdict === item.id).length}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </SidebarSection>
        <SidebarSection title="Ordenar">
          <li><NavLink active onClick={() => undefined} count="↓">Más recientes</NavLink></li>
        </SidebarSection>
      </>
  );
  const toc = (
      <>
        <p className="auditor-mono-label">En esta página</p>
        <nav aria-label="Secciones de esta página">
          {[
            ["top", "Portada"],
            ["how-it-works", "Cómo funciona"],
            ["catalog", "Catálogo"],
          ].map(([id, label]) => (
            <NavLink key={id} href={`#${id}`} sectionId={id}
              active={activeSection === id} className="auditor-catalog-toc-link">
              {label}
            </NavLink>
          ))}
        </nav>
      </>
  );

  return (
    <PageShell left={sidebar} right={toc} className="auditor-catalog">

      <div className="auditor-catalog__main">
        <section id="top" className="auditor-hero">
          <CornerBox className="auditor-hero__stats">
            <span>{catalog.length} skills analizadas</span>
            <span>{catalog.reduce((count, entry) => count + entry.versionCount, 0)} versiones</span>
            <span>{warnings} avisos críticos</span>
          </CornerBox>
          <CornerBox className="auditor-hero__panel">
            <p className="auditor-mono-label">Análisis público de skills · por versión</p>
            <Heading as="h1" size="big">
              <span className="auditor-highlight">Entiende una skill</span>
              <span className="auditor-highlight">antes de instalarla</span>
            </Heading>
            <Text className="auditor-hero__lede">
              Explicamos cada línea de las skills de agentes y comprobamos si
              hacen lo que dicen.
            </Text>
            <div className="auditor-actions">
              <Button asChild size="lg">
                <Link href="/dashboard/submit">Enviar una skill</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="#catalog">Ver el catálogo</a>
              </Button>
            </div>
          </CornerBox>
        </section>

        <section id="how-it-works" className="auditor-process-section">
          <SectionHeader label="1 / Método" title="Del enlace al veredicto" />
          <CornerBox className="auditor-content-box auditor-process-box">
            <PipelineIllustration />
          </CornerBox>
        </section>

        <section id="catalog" className="auditor-results-section">
          <SectionHeader label="2 / Archivo público" title="Catálogo de skills"
            trailing={pluralize(entries.length, "resultado", "resultados")} />
          <CornerBox className="auditor-content-box auditor-results-box">
            <div className="auditor-search-row">
              <label className="auditor-search-box">
                <Search aria-hidden="true" />
                <Input
                  className="auditor-text-field__control"
                  aria-label="Buscar skill o repositorio"
                  placeholder="Buscar nombre o repositorio"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <span className="auditor-mono-label">Orden: más recientes</span>
            </div>
            <div className="auditor-skill-rows">
              {entries.length ? (
                entries.map((entry) => (
                <NavLink
                  key={entry.slug}
                  href={`/skills/${entry.slug}`}
                  bareChildren
                    className="auditor-skill-row auditor-link-box"
                >
                  <span className="auditor-skill-row__name">{entry.name}</span>
                  <span className="auditor-mono-label auditor-skill-row__repo">
                    {entry.owner}/{entry.repo} · {entry.path}
                  </span>
                  <span className="auditor-skill-row__verdict">
                    <VerdictBadge verdict={entry.verdict} warnings={entry.warnings} />
                  </span>
                  <span className="auditor-mono-label auditor-skill-row__date">
                    {formatDate(entry.analyzedAt)}
                  </span>
                  <span className="auditor-mono-label auditor-skill-row__versions">
                    {entry.versionCount} v.
                  </span>
                </NavLink>
              ))
            ) : (
              <p className="auditor-empty-row">
                No hay resultados. Prueba con otro nombre, repositorio o veredicto.
              </p>
            )}
            </div>
          </CornerBox>
        </section>
      </div>
    </PageShell>
  );
}
