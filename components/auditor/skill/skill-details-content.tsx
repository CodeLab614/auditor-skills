"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SkillHeader } from "./skill-header";
import { formatCount, formatDay } from "@/lib/auditor/labels";
import { analysisHref } from "@/lib/auditor/skill-links";
import {
  skillSummary,
  type SkillAiDetails,
  type SkillDetailsView,
} from "@/lib/auditor/skill-details";

export interface SkillDetailsContentProps {
  details: SkillDetailsView;
  ai: SkillAiDetails | null;
  showCommentsPlaceholder?: boolean;
}

export function SkillDetailsContent({
  details,
  ai,
  showCommentsPlaceholder = false,
}: SkillDetailsContentProps) {
  const [authorTextOpen, setAuthorTextOpen] = useState(false);
  const activeSections = useMemo(() => {
    const list: { id: string; category: string; title: string }[] = [];
    list.push({
      id: "en-pocas-palabras",
      category: "Resumen",
      title: "En pocas palabras",
    });
    if (ai) {
      list.push({
        id: "para-que-sirve",
        category: "Casos de uso",
        title: "Para qué sirve y para qué no",
      });
      list.push({
        id: "como-funciona",
        category: "Proceso",
        title: "Cómo funciona",
      });
    }
    if (details.needs.length > 0) {
      list.push({
        id: "que-necesita",
        category: "Requisitos",
        title: "Qué necesita",
      });
    }
    list.push({
      id: "sus-archivos",
      category: "Archivos",
      title: "Sus archivos",
    });
    if (showCommentsPlaceholder) {
      list.push({
        id: "comentarios",
        category: "Comunidad",
        title: "Comentarios",
      });
    }

    return list.map((item, index) => ({
      ...item,
      label: `${String(index + 1).padStart(2, "0")} / ${item.category}`,
    }));
  }, [ai, details.needs.length, showCommentsPlaceholder]);

  const [activeSection, setActiveSection] = useState<string>(
    activeSections[0]?.id ?? "en-pocas-palabras",
  );
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const intersectingMapRef = useRef(new Map<string, boolean>());

  useEffect(() => {
    const elements = activeSections
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          intersectingMapRef.current.set(entry.target.id, entry.isIntersecting);
        }

        for (const { id } of activeSections) {
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
  }, [activeSections]);

  const labelFor = (id: string) =>
    activeSections.find((item) => item.id === id)?.label ?? "";

  const factItems = useMemo(() => {
    const items: { label: string; value: string }[] = [
      { label: "Repositorio", value: details.facts.repository },
      { label: "Carpeta", value: details.facts.folder },
      { label: "Archivos", value: formatCount(details.facts.fileCount) },
      { label: "Líneas", value: formatCount(details.facts.lineCount) },
    ];
    if (details.facts.languages.length > 0) {
      items.push({
        label: "Lenguajes",
        value: details.facts.languages.join(", "),
      });
    }
    items.push(
      { label: "Usa internet", value: details.facts.usesInternet ? "Sí" : "No" },
      {
        label: "Instala dependencias",
        value: details.facts.installsDependencies ? "Sí" : "No",
      },
      { label: "Analizada", value: formatDay(details.facts.analyzedAt) },
    );
    return items;
  }, [details.facts]);

  const tocNavigation = (
    <SidebarSection title="En esta página">
      {activeSections.map((section) => (
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
      {factItems.map((fact) => (
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
          name={details.name}
          owner={details.owner}
          repo={details.repo}
          verdict={details.verdict}
          analyzedAt={details.analyzedAt}
          current="details"
          otherHref={analysisHref(details.slug)}
          slug={details.slug}
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
                  {activeSections.map((section) => (
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
            <SectionHeader
              label={labelFor("en-pocas-palabras")}
              title="En pocas palabras"
            />
            <div className="auditor-skill-details__prose">
              {ai ? (
                <>
                  <p className="auditor-skill-details__summary">{ai.summary}</p>
                  <p className="auditor-skill-details__audience">
                    <strong className="auditor-skill-details__audience-label">
                      Para quién es:{" "}
                    </strong>
                    {ai.audience}
                  </p>
                </>
              ) : (
                <>
                  <p className="auditor-skill-details__summary">
                    {skillSummary(details)}
                  </p>
                  {details.description && (
                    <Collapsible
                      open={authorTextOpen}
                      onOpenChange={setAuthorTextOpen}
                      className="auditor-skill-details__author"
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {authorTextOpen
                            ? "Ocultar la descripción original del autor"
                            : "Ver la descripción original del autor"}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <p className="auditor-skill-details__author-text">
                          {details.description}
                        </p>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </>
              )}
            </div>

            {/* Mobile Datos rápidos */}
            <div className="auditor-skill-details__mobile-facts">
              <h3 className="auditor-mono-label auditor-skill-details__mobile-facts-heading">
                Datos rápidos
              </h3>
              <dl className="auditor-skill-details__mobile-facts-grid">
                {factItems.map((fact) => (
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

          {/* 2. Para qué sirve y para qué no (solo con ai) */}
          {ai && (
            <section id="para-que-sirve" className="auditor-skill-details__section">
              <SectionHeader
                label={labelFor("para-que-sirve")}
                title="Para qué sirve y para qué no"
              />
              <div className="auditor-skill-details__prose">
                <div className="auditor-skill-details__columns">
                  <div className="auditor-skill-details__column">
                    <h3 className="auditor-skill-details__column-title">
                      Sirve para
                    </h3>
                    <ul className="auditor-skill-details__use-case-list">
                      {ai.goodFor.map((item) => (
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
                      {ai.notFor.map((item) => (
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
          )}

          {/* 3. Cómo funciona (solo con ai) */}
          {ai && (
            <section id="como-funciona" className="auditor-skill-details__section">
              <SectionHeader
                label={labelFor("como-funciona")}
                title="Cómo funciona"
              />
              <div className="auditor-skill-details__prose">
                <ol className="auditor-skill-details__steps">
                  {ai.steps.map((step, index) => {
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
          )}

          {/* 4. Qué necesita (solo si hay needs) */}
          {details.needs.length > 0 && (
            <section id="que-necesita" className="auditor-skill-details__section">
              <SectionHeader
                label={labelFor("que-necesita")}
                title="Qué necesita"
              />
              <div className="auditor-skill-details__prose">
                <dl className="auditor-skill-details__requirements">
                  {details.needs.map((group) => (
                    <div
                      key={group.key}
                      className="auditor-skill-details__requirement-group"
                    >
                      <dt className="auditor-mono-label auditor-skill-details__requirement-label">
                        {group.label}
                      </dt>
                      <dd className="auditor-skill-details__requirement-items">
                        <ul className="auditor-skill-details__need-list">
                          {group.items.map((item) => (
                            <li
                              key={`${item.title}:::${item.evidence}`}
                              className="auditor-skill-details__need-item"
                            >
                              <div className="auditor-skill-details__need-title-row">
                                <span className="auditor-skill-details__need-title">
                                  {item.title}
                                </span>
                                {item.fileCount > 1 && (
                                  <span className="auditor-mono-label auditor-skill-details__need-count">
                                    en {item.fileCount} archivos
                                  </span>
                                )}
                              </div>
                              <div className="auditor-skill-details__need-evidence-row">
                                <code
                                  className="auditor-skill-details__need-evidence"
                                  title={item.evidence}
                                >
                                  {item.evidence}
                                </code>
                                <InlineLink
                                  href={item.href}
                                  className="auditor-skill-details__need-link"
                                >
                                  Ver en el informe →
                                </InlineLink>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}

          {/* 5. Sus archivos */}
          <section id="sus-archivos" className="auditor-skill-details__section">
            <SectionHeader
              label={labelFor("sus-archivos")}
              title="Sus archivos"
            />
            <ul className="auditor-skill-details__file-list">
              {details.files.map((file) => {
                const lastSlash = file.path.lastIndexOf("/");
                const folder =
                  lastSlash !== -1 ? file.path.slice(0, lastSlash + 1) : "";
                const filename =
                  lastSlash !== -1 ? file.path.slice(lastSlash + 1) : file.path;
                const fileAi = ai?.files[file.path];

                return (
                  <li
                    key={file.path}
                    className="auditor-skill-details__file-wrapper"
                  >
                    <NavLink
                      href={analysisHref(details.slug, { file: file.path })}
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
                              {file.language ? `${file.language} · ` : ""}
                              {formatCount(file.lineCount)}{" "}
                              {file.lineCount === 1 ? "línea" : "líneas"}
                            </span>
                          </div>
                        </div>
                        {fileAi?.purpose && (
                          <p className="auditor-skill-details__file-purpose">
                            {fileAi.purpose}
                          </p>
                        )}
                        {fileAi?.description && (
                          <p className="auditor-skill-details__file-desc">
                            {fileAi.description}
                          </p>
                        )}
                      </div>
                      <div className="auditor-skill-details__file-action-wrap">
                        <span className="auditor-mono-label auditor-skill-details__file-action">
                          Ver el código →
                        </span>
                      </div>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 6. Comentarios (solo con showCommentsPlaceholder) */}
          {showCommentsPlaceholder && (
            <section id="comentarios" className="auditor-skill-details__section">
              <SectionHeader
                label={labelFor("comentarios")}
                title="Comentarios"
              />
              <div className="auditor-skill-details__prose">
                <p className="auditor-skill-details__comments-placeholder">
                  Pronto podrás comentar esta skill.
                </p>
              </div>
            </section>
          )}

          {/* Nota final de la IA (solo con ai) */}
          {ai && (
            <footer className="auditor-mono-label auditor-skill-details__disclaimer">
              Este texto lo generó la IA a partir de los archivos de la skill; puede
              contener errores. Lo que se comprobó está en el{" "}
              <InlineLink
                href={analysisHref(details.slug, { section: "summary" })}
              >
                informe de análisis
              </InlineLink>
              .
            </footer>
          )}
        </div>
      </article>
    </PageShell>
  );
}
