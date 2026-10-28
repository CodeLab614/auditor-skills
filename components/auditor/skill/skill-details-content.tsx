"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { PageShell } from "@/components/auditor/page-shell";
import { Button } from "@/components/auditor/ui/button";
import { InlineLink } from "@/components/auditor/ui/inline-link";
import { NavLink } from "@/components/auditor/ui/nav-link";
import { SectionHeader } from "@/components/auditor/ui/section-header";
import { SidebarSection } from "@/components/auditor/ui/sidebar-section";
import { SkillIcon } from "@/components/auditor/ui/skill-icon";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SkillHeader } from "./skill-header";
import { formatCount } from "@/lib/auditor/labels";
import { analysisHref } from "@/lib/auditor/skill-links";
import type { SkillDetails } from "@/lib/auditor/mock-skill-details";
import type { Verdict } from "@/lib/auditor/types";

const SECTION_LINKS = [
  { id: "en-pocas-palabras", title: "En pocas palabras" },
  { id: "para-que-sirve", title: "Para qué sirve y para qué no" },
  { id: "como-funciona", title: "Cómo funciona" },
  { id: "que-necesita", title: "Qué necesita" },
  { id: "sus-archivos", title: "Sus archivos" },
  { id: "comentarios", title: "Comentarios" },
] as const;

export interface SkillDetailsContentProps {
  analysis: {
    name: string;
    owner: string;
    repo: string;
    verdict: Verdict;
    analyzedAt: string;
  };
  details: SkillDetails;
  otherHref: string;
}

export function SkillDetailsContent({
  analysis,
  details,
  otherHref,
}: SkillDetailsContentProps) {
  const [activeSection, setActiveSection] = useState<string>(SECTION_LINKS[0].id);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const intersectingMapRef = useRef(new Map<string, boolean>());

  useEffect(() => {
    const elements = SECTION_LINKS.map(({ id }) =>
      document.getElementById(id),
    ).filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          intersectingMapRef.current.set(entry.target.id, entry.isIntersecting);
        }

        for (const { id } of SECTION_LINKS) {
          if (intersectingMapRef.current.get(id)) {
            setActiveSection(id);
            break;
          }
        }
      },
      {
        rootMargin: "-80px 0px -55% 0px",
        threshold: [0, 0.1],
      },
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const tocNavigation = (
    <SidebarSection title="En esta página">
      {SECTION_LINKS.map((section) => (
        <li key={section.id}>
          <NavLink
            href={`#${section.id}`}
            active={activeSection === section.id}
            onClick={() => setActiveSection(section.id)}
          >
            {section.title}
          </NavLink>
        </li>
      ))}
    </SidebarSection>
  );

  const factsContent = (
    <SidebarSection title="Datos">
      {details.facts.map((fact) => (
        <li key={fact.label} className="auditor-skill-details__fact-item">
          <span className="auditor-mono-label auditor-skill-details__fact-label">
            {fact.label}
          </span>
          <span className="auditor-skill-details__fact-value">
            {fact.value}
          </span>
        </li>
      ))}
    </SidebarSection>
  );

  return (
    <PageShell
      left={tocNavigation}
      right={factsContent}
      className="auditor-skill-details-page"
    >
      <article className="auditor-skill-details">
        <SkillHeader
          name={analysis.name}
          owner={analysis.owner}
          repo={analysis.repo}
          verdict={analysis.verdict}
          analyzedAt={analysis.analyzedAt}
          current="details"
          otherHref={otherHref}
        />

        <div className="auditor-skill-details__mobile-toc">
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm">
                En esta página
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
                <SheetTitle>En esta página</SheetTitle>
              </SheetHeader>
              <nav aria-label="Secciones del artículo">
                <ul className="flex flex-col gap-1 pt-3">
                  {SECTION_LINKS.map((section) => (
                    <li key={section.id}>
                      <NavLink
                        href={`#${section.id}`}
                        active={activeSection === section.id}
                        onClick={() => {
                          setActiveSection(section.id);
                          setMobileSheetOpen(false);
                        }}
                      >
                        {section.title}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <div className="auditor-skill-details__body">
          {/* 1. En pocas palabras */}
          <section id="en-pocas-palabras" className="auditor-skill-details__section">
            <SectionHeader label="01 / Resumen" title="En pocas palabras" />
            <div className="auditor-skill-details__prose">
              <p className="auditor-skill-details__summary">{details.summary}</p>
              <p className="auditor-skill-details__audience">
                <strong className="auditor-skill-details__audience-label">
                  Para quién es:{" "}
                </strong>
                {details.audience}
              </p>
            </div>

            {/* Mobile Datos block at the end of En pocas palabras */}
            <div className="auditor-skill-details__mobile-facts">
              <h3 className="auditor-mono-label auditor-skill-details__mobile-facts-heading">
                Datos rápidos
              </h3>
              <dl className="auditor-skill-details__mobile-facts-grid">
                {details.facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="auditor-skill-details__mobile-fact-item"
                  >
                    <dt className="auditor-mono-label auditor-skill-details__fact-label">
                      {fact.label}
                    </dt>
                    <dd className="auditor-skill-details__fact-value">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* 2. Para qué sirve y para qué no */}
          <section id="para-que-sirve" className="auditor-skill-details__section">
            <SectionHeader
              label="02 / Casos de uso"
              title="Para qué sirve y para qué no"
            />
            <div className="auditor-skill-details__prose">
              <div className="auditor-skill-details__columns">
                <div className="auditor-skill-details__column">
                  <h3 className="auditor-skill-details__column-title">
                    Sirve para
                  </h3>
                  <ul className="auditor-skill-details__use-case-list">
                    {details.goodFor.map((item) => (
                      <li
                        key={item}
                        className="auditor-skill-details__use-case"
                      >
                        <Check
                          className="auditor-skill-details__check-icon"
                          size={16}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="auditor-skill-details__column">
                  <h3 className="auditor-skill-details__column-title">
                    No sirve para
                  </h3>
                  <ul className="auditor-skill-details__use-case-list">
                    {details.notFor.map((item) => (
                      <li
                        key={item}
                        className="auditor-skill-details__use-case"
                      >
                        <X
                          className="auditor-skill-details__x-icon"
                          size={16}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Cómo funciona */}
          <section id="como-funciona" className="auditor-skill-details__section">
            <SectionHeader label="03 / Proceso" title="Cómo funciona" />
            <div className="auditor-skill-details__prose">
              <ol className="auditor-skill-details__steps">
                {details.steps.map((step, index) => {
                  const stepNumber = String(index + 1).padStart(2, "0");
                  return (
                    <li key={step.title} className="auditor-skill-details__step">
                      <div
                        className="auditor-skill-details__step-num auditor-mono-label"
                        aria-hidden="true"
                      >
                        {stepNumber}
                      </div>
                      <div className="auditor-skill-details__step-body">
                        <h3 className="auditor-skill-details__step-title">
                          {step.title}
                        </h3>
                        <p className="auditor-skill-details__step-text">
                          {step.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          {/* 4. Qué necesita */}
          <section id="que-necesita" className="auditor-skill-details__section">
            <SectionHeader label="04 / Requisitos" title="Qué necesita" />
            <div className="auditor-skill-details__prose">
              <dl className="auditor-skill-details__requirements">
                {details.requirements.map((req) => (
                  <div
                    key={req.label}
                    className="auditor-skill-details__requirement-group"
                  >
                    <dt className="auditor-mono-label auditor-skill-details__requirement-label">
                      {req.label}
                    </dt>
                    <dd className="auditor-skill-details__requirement-items">
                      <ul className="auditor-skill-details__requirement-list">
                        {req.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* 5. Sus archivos */}
          <section id="sus-archivos" className="auditor-skill-details__section">
            <SectionHeader label="05 / Archivos" title="Sus archivos" />
            <ul className="auditor-skill-details__file-list">
              {details.files.map((file) => {
                const lastSlash = file.path.lastIndexOf("/");
                const folder =
                  lastSlash !== -1 ? file.path.slice(0, lastSlash + 1) : "";
                const filename =
                  lastSlash !== -1 ? file.path.slice(lastSlash + 1) : file.path;

                return (
                  <li
                    key={file.path}
                    className="auditor-skill-details__file-wrapper"
                  >
                    <NavLink
                      href={analysisHref("explicar-cambios", { file: file.path })}
                      bareChildren
                      className="auditor-skill-details__file-item auditor-link-box"
                    >
                      <div className="auditor-skill-details__file-content">
                        <div className="auditor-skill-details__file-header">
                          <SkillIcon className="auditor-skill-details__file-icon" />
                          <div className="auditor-skill-details__file-headings">
                            <span className="auditor-mono-label auditor-skill-details__file-path">
                              {folder && (
                                <span className="auditor-skill-details__file-folder">
                                  {folder}
                                </span>
                              )}
                              <span className="auditor-skill-details__file-name">
                                {filename}
                              </span>
                            </span>
                            <span className="auditor-mono-label auditor-skill-details__file-meta">
                              {file.language} · {formatCount(file.lineCount)}{" "}
                              {file.lineCount === 1 ? "línea" : "líneas"}
                            </span>
                          </div>
                        </div>
                        <p className="auditor-skill-details__file-purpose">
                          {file.purpose}
                        </p>
                        <p className="auditor-skill-details__file-desc">
                          {file.description}
                        </p>
                      </div>
                      <div className="auditor-skill-details__file-action-wrap">
                        <span className="auditor-mono-label auditor-skill-details__file-action">
                          Ver el código explicado →
                        </span>
                      </div>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 6. Comentarios */}
          <section id="comentarios" className="auditor-skill-details__section">
            <SectionHeader label="06 / Comunidad" title="Comentarios" />
            <div className="auditor-skill-details__prose">
              <p className="auditor-skill-details__comments-placeholder">
                Pronto podrás comentar esta skill.
              </p>
            </div>
          </section>

          {/* Disclaimer at the end of article */}
          <footer className="auditor-mono-label auditor-skill-details__disclaimer">
            Este texto lo generó la IA a partir de los archivos de la skill; puede
            contener errores. Lo que se comprobó está en el{" "}
            <InlineLink href={analysisHref("explicar-cambios", { section: "summary" })}>
              informe de análisis
            </InlineLink>
            .
          </footer>
        </div>
      </article>
    </PageShell>
  );
}
