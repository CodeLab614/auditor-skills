import type { ReactNode } from "react";
import { Geist_Mono, Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--auditor-font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--auditor-font-mono",
  display: "swap",
});

export function AuditorTheme({
  children,
  fullHeight = false,
}: {
  children: ReactNode;
  fullHeight?: boolean;
}) {
  return (
    <div
      className={`auditor-theme ${inter.variable} ${geistMono.variable} ${fullHeight ? "auditor-public-site" : ""}`}
    >
      {children}
    </div>
  );
}
