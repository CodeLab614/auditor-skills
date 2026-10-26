"use client";

import type { ReactNode, PointerEvent } from "react";
import Link from "next/link";
import { CornerBox } from "./ui/corner-box";
import { NavLink } from "./ui/nav-link";

export function PageShell({
  children,
  left,
  right,
  className = "",
}: {
  children: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const main = event.currentTarget.querySelector<HTMLElement>(".auditor-page-shell__main");
    if (!main) return;
    const bounds = main.getBoundingClientRect();
    main.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
    main.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
  };

  return (
    <div
      className={`auditor-page-shell ${className}`}
      onPointerMove={onPointerMove}
    >
      <aside className="auditor-page-shell__left" aria-hidden={!left}>
        <div className="auditor-page-shell__left-content">{left}</div>
      </aside>
      <main className="auditor-page-shell__main">{children}</main>
      <aside className="auditor-page-shell__right" aria-hidden={!right}>
        <div className="auditor-page-shell__right-content">{right}</div>
      </aside>
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

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.05
        c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76
        -1.09-.75.08-.74.08-.74 1.2.09 1.83 1.23 1.83 1.23
        1.07 1.83 2.8 1.3 3.49.99.11-.77.42-1.3.76-1.6
        -2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.23-3.22
        -.13-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5
        0 0 1 6 0c2.29-1.55 3.29-1.23 3.29-1.23.66 1.65.25
        2.87.13 3.17.77.84 1.23 1.91 1.23 3.22 0 4.62-2.81
        5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58
        A12 12 0 0 0 12 .5Z"
      />
    </svg>
  );
}
