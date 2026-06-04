# Components Showcase — Design Spec
**Date:** 2026-05-31  
**Status:** Approved

---

## Overview

A developer-facing page inside the dashboard at `/dashboard/components` that lists every installed shadcn/ui component and every custom dashboard component, with full props documentation, live previews, and copy-ready code snippets.

---

## Route & Navigation

- **Route:** `/dashboard/components`
- **Sidebar link:** Added to the existing `DashboardSidebar` under the "Menu" section, icon `Blocks` (Lucide), visible to all authenticated users.

---

## Layout

Two-panel split inside the existing dashboard shell:

| Zone | Width | Description |
|------|-------|-------------|
| Component sidebar | 260px fixed | Internal nav — search + component list |
| Detail panel | flex-1 | Preview / Props / Code tabs for selected component |

The page is a Client Component (`"use client"`) because the sidebar selection and tab state are local UI state. No server data fetching needed.

---

## Component Sidebar

### Structure
```
[ 🔍 Search components... ]

SHADCN/UI  (46)
  Accordion
  Alert
  Alert Dialog
  …alphabetical…

CUSTOM  (8)
  ConfirmDialog
  DataTable
  InputGroup
  MetricCard
  PageHeader
  DashboardSidebar
  StatusBadge
  UserWelcome
```

### Behavior
- Buscador en tiempo real (filtra por nombre, case-insensitive, en ambas secciones)
- Si una sección queda vacía tras la búsqueda, se oculta su encabezado
- El primer componente de la lista se selecciona por defecto al cargar
- Componente activo: `bg-accent text-foreground rounded-md`
- Shadcn badge: `bg-blue-500/10 text-blue-400`
- Custom badge: `bg-purple-500/10 text-purple-400`

---

## Detail Panel

### Header (siempre visible)
```
[ComponentName]  [shadcn/ui | Custom]
@/components/ui/component-name        [📋 Copiar import]
```

### Tab: Preview
- Fondo `bg-muted rounded-lg` como escenario
- Renders **reales** del componente (no screenshots)
- Subsecciones por concepto: Variantes, Tamaños, Estados (disabled, loading, etc.)
- Cada subsección tiene un label pequeño en uppercase

### Tab: Props
Tabla con 4 columnas:

| Prop | Tipo | Default | Requerido |
|------|------|---------|-----------|
| `variant` | `"default" \| "outline" \| "ghost"` | `"default"` | No |

- Tipos coloreados: strings → `text-green-400`, booleans → `text-orange-400`, enums → `text-purple-400`, `ReactNode` → `text-blue-400`
- Si un componente no tiene props propias (solo pasa `...props` a un elemento HTML), se muestra un mensaje: *"Acepta todas las props nativas de `<element>`"*

### Tab: Código
- Snippet de uso básico con import incluido
- Fondo `#0d1117` (estilo GitHub Dark), syntax highlighting manual con spans coloreados
- Botón "Copiar" en la esquina superior derecha — usa `navigator.clipboard.writeText`
- El snippet muestra el caso de uso más común, no todos los props posibles

---

## Data Architecture

### `component-registry.ts`
Archivo estático en `app/dashboard/components/component-registry.ts`. Exporta un array tipado `ComponentEntry[]`.

```ts
interface PropEntry {
  name: string
  type: string
  default?: string
  required: boolean
  description?: string  // solo para custom components
}

interface VariantGroup {
  label: string           // "Variantes", "Tamaños", "Estados"
  items: {
    label: string
    props: Record<string, unknown>
  }[]
}

interface ComponentEntry {
  name: string            // "Button"
  path: string            // "@/components/ui/button"
  origin: "shadcn" | "custom"
  description: string     // una línea
  props: PropEntry[]
  variantGroups: VariantGroup[]
  codeSnippet: string     // JSX string listo para mostrar
}
```

Este archivo se mantiene a mano. No hay introspección en runtime — es la fuente de verdad de la documentación.

---

## File Structure

```
app/dashboard/components/
  page.tsx                          ← Client Component raíz

app/dashboard/components/
  component-registry.ts             ← Datos estáticos de todos los componentes

components/dashboard/
  components-explorer/
    index.ts                        ← Barrel exports
    components-sidebar.tsx          ← Sidebar interno + buscador
    component-detail.tsx            ← Panel con tabs
    component-preview.tsx           ← Renders reales por componente
    copy-button.tsx                 ← Botón de copiar reutilizable
```

---

## Components Covered

### shadcn/ui (46)
Accordion, Alert, AlertDialog, AspectRatio, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, ContextMenu, Dialog, Drawer, DropdownMenu, Form, HoverCard, Input, InputOTP, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner, Switch, Table, Tabs, Textarea, Toggle, ToggleGroup, Tooltip

### Custom (8)
ConfirmDialog, DataTable, InputGroup, MetricCard, PageHeader, DashboardSidebar, StatusBadge, UserWelcome

---

## Constraints

- No dependencies nuevas — syntax highlighting es manual con spans, no se instala `shiki` ni `prism`
- El `component-preview.tsx` importa los componentes reales, por lo que es un Client Component
- La página hereda el tema (light/dark) del sistema existente
- Los renders del Preview usan datos ficticios estáticos (no fetch)
