"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/auditor/ui/button";
import { Heading } from "@/components/auditor/ui/heading";
import { Text } from "@/components/auditor/ui/text";
import { CornerBox } from "@/components/auditor/ui/corner-box";
import { NavLink } from "@/components/auditor/ui/nav-link";
import { SidebarSection } from "@/components/auditor/ui/sidebar-section";
import { SectionHeader } from "@/components/auditor/ui/section-header";
import { PageShell } from "@/components/auditor/page-shell";
import { PipelineIllustration } from "@/components/auditor/pipeline-illustration";
import { formatCount, pluralize } from "@/lib/auditor/labels";
import type { HomeStats } from "@/lib/auditor/catalog-query";

export function HomeContent({ stats }: { stats: HomeStats }) {
  const [activeSection, setActiveSection] = useState("top");

  useEffect(() => {
    const sections = ["top", "how-it-works"]
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
    const observer = new IntersectionObserver(
      (records) => {
        records.forEach((record) => {
          if (record.isIntersecting) {
            record.target.classList.add("is-visible");
            observer.unobserve(record.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    sections.forEach((section) => {
      section.classList.add("auditor-reveal");
      observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  const statRows: Array<[string, string]> = [
    ["Skills analizadas", formatCount(stats.skills)],
    ["Versiones", formatCount(stats.versions)],
    ["Avisos críticos", formatCount(stats.criticalFindings)],
    ["Análisis en curso", formatCount(stats.activeJobs)],
  ];

  const sidebar = (
    <SidebarSection title="Cifras">
      {statRows.map(([label, value]) => (
        <li className="auditor-stat-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </li>
      ))}
    </SidebarSection>
  );

  const toc = (
    <>
      <p className="auditor-mono-label">En esta página</p>
      <nav aria-label="Secciones de esta página">
        {[
          ["top", "Portada"],
          ["how-it-works", "Cómo funciona"],
        ].map(([id, label]) => (
          <NavLink
            key={id}
            href={`#${id}`}
            sectionId={id}
            active={activeSection === id}
            className="auditor-catalog-toc-link"
          >
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
            <span>
              {pluralize(stats.skills, "skill analizada", "skills analizadas")}
            </span>
            <span>{pluralize(stats.versions, "versión", "versiones")}</span>
            <span>
              {pluralize(
                stats.criticalFindings,
                "aviso crítico",
                "avisos críticos",
              )}
            </span>
          </CornerBox>
          <CornerBox className="auditor-hero__panel">
            <p className="auditor-mono-label">
              Análisis público de skills · por versión
            </p>
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
                <Link href="/skills">Ver el catálogo</Link>
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
      </div>
    </PageShell>
  );
}
