import type { NavSection } from "@/components/dashboard/sidebar";
import {
  Activity,
  Archive,
  BookOpen,
  Gauge,
  Inbox,
  Send,
  ShieldAlert,
} from "lucide-react";

export function getAuditorNavigation(isAdmin: boolean): NavSection[] {
  return [
    {
      title: "Auditor",
      items: [
        { title: "Enviar una skill", href: "/dashboard/submit", icon: Send },
        { title: "Mis envíos", href: "/dashboard/submissions", icon: Inbox },
        { title: "Catálogo", href: "/skills", icon: BookOpen },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: "Administración del auditor",
            items: [
              {
                title: "Cola",
                href: "/dashboard/auditor/queue",
                icon: Activity,
              },
              {
                title: "Skills",
                href: "/dashboard/auditor/skills",
                icon: Archive,
              },
              {
                title: "Reclamaciones",
                href: "/dashboard/auditor/claims",
                icon: ShieldAlert,
              },
              {
                title: "Límites",
                href: "/dashboard/auditor/limits",
                icon: Gauge,
              },
            ],
          },
        ]
      : []),
  ];
}
