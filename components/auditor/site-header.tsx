"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/auditor/ui/button";
import { NavLink } from "@/components/auditor/ui/nav-link";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const accountHref = signedIn ? "/dashboard" : "/auth/login";
  const accountLabel = signedIn ? "Panel" : "Iniciar sesión";
  return (
    <header className="auditor-site-header">
      <nav className="auditor-site-header__nav" aria-label="Navegación principal">
        <div className="auditor-site-header__brand">
          <Link href="/" className="auditor-wordmark">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7z" />
              <path d="m13.5 17 3.5-3.5 3.5 3.5-3.5 3.5z" />
            </svg>
            <span>auditor de skills</span>
          </Link>
        </div>
        <div className="auditor-site-header__links">
          <NavLink className="auditor-header-link" href="/skills">Catálogo</NavLink>
          <NavLink className="auditor-header-link" href="/#how-it-works">
            Cómo funciona
          </NavLink>
          <NavLink className="auditor-header-link" href="/takedowns">Retiradas</NavLink>
        </div>
        <div className="auditor-site-header__actions">
          <Button asChild size="default">
            <Link href="/dashboard/submit">Enviar una skill</Link>
          </Button>
          <Button asChild size="default" variant="secondary">
            <Link href={accountHref}>{accountLabel}</Link>
          </Button>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button className="auditor-mobile-menu" variant="secondary" size="default">
              <Menu data-icon="inline-start" /> Menú
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="auditor-public-sheet" showCloseButton={false}>
            <SheetClose asChild>
              <Button className="auditor-public-sheet__close" variant="ghost" size="sm" aria-label="Cerrar">
                <X aria-hidden="true" />
              </Button>
            </SheetClose>
            <SheetHeader>
              <SheetTitle>Navegación</SheetTitle>
            </SheetHeader>
            <div className="auditor-mobile-links">
              <NavLink href="/skills">Catálogo</NavLink>
              <NavLink href="/#how-it-works">Cómo funciona</NavLink>
              <NavLink href="/takedowns">Retiradas</NavLink>
              <NavLink href="/dashboard/submit">Enviar una skill</NavLink>
              <NavLink href={accountHref}>{accountLabel}</NavLink>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
