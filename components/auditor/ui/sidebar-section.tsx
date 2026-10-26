import type { ReactNode } from "react";

export function SidebarSection({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="auditor-sidebar-section">
      <h2 className="auditor-sidebar-section__title">{title}</h2>
      <ul className="auditor-sidebar-section__list">{children}</ul>
    </section>
  );
}
