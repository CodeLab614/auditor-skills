"use client";

import type { ReactNode, PointerEvent } from "react";
import Link from "next/link";
import { CornerBox } from "./ui/corner-box";
import { NavLink } from "./ui/nav-link";
import { GitHubMark } from "./ui/github-mark";
import { cn } from "@/lib/utils";

export { GitHubMark } from "./ui/github-mark";

export function PageShell({
  children,
  left,
  right,
  className = "",
  wide = false,
}: {
  children: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const main = event.currentTarget.querySelector<HTMLElement>(".auditor-page-shell__main");
    if (!main) return;
    const bounds = main.getBoundingClientRect();
    main.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
    main.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
  };

  const hasNoRight = (wide || className.includes("auditor-page-shell--no-right")) && !right;

  return (
    <div
      className={cn(
        "auditor-page-shell",
        hasNoRight && "auditor-page-shell--no-right",
        className,
      )}
      onPointerMove={onPointerMove}
    >
      <aside className="auditor-page-shell__left" aria-hidden={!left}>
        <div className="auditor-page-shell__left-content">{left}</div>
      </aside>
      <main className="auditor-page-shell__main">{children}</main>
      {!hasNoRight && (
        <aside className="auditor-page-shell__right" aria-hidden={!right}>
          <div className="auditor-page-shell__right-content">{right}</div>
        </aside>
      )}
      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="auditor-site-footer">
      <CornerBox className="auditor-site-footer__box">
        <div className="auditor-site-footer__social">
          <Link
            href="https://github.com/CodeLab614/auditor-skills"
            aria-label="Repositorio de Auditor de skills en GitHub"
            target="_blank"
            rel="noreferrer"
          >
            <GitHubMark />
          </Link>
        </div>
        <div className="auditor-site-footer__columns">
          <FooterColumn title="Producto">
            <NavLink href="/skills">Catálogo</NavLink>
            <NavLink href="/skills#how-it-works">Cómo funciona</NavLink>
            <NavLink href="/dashboard/submit">Enviar una skill</NavLink>
          </FooterColumn>
          <FooterColumn title="Tu cuenta">
            <NavLink href="/dashboard">Panel</NavLink>
            <NavLink href="/dashboard/submissions">Mis envíos</NavLink>
          </FooterColumn>
          <FooterColumn title="Ayuda">
            <NavLink href="/takedowns">Retiradas</NavLink>
            <NavLink href="/mockups">Índice de maquetas</NavLink>
          </FooterColumn>
        </div>
        <div className="auditor-site-footer__legal auditor-mono-label">
          <NavLink href="/terms">Términos</NavLink>
          <NavLink href="/privacy">Privacidad</NavLink>
        </div>
        <div className="auditor-site-footer__meta auditor-mono-label">
          <span>© 2026 Auditor de skills</span>
          <NavLink
            href="https://github.com/CodeLab614/auditor-skills"
            target="_blank"
            rel="noreferrer"
          >
            Código abierto · GitHub
          </NavLink>
        </div>
      </CornerBox>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="auditor-site-footer__column">
      <h2 className="auditor-mono-label">{title}</h2>
      <nav aria-label={title}>{children}</nav>
    </section>
  );
}
