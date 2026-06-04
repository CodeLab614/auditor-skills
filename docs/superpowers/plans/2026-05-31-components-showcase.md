# Components Showcase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear la página `/dashboard/components` que documenta todos los componentes instalados (shadcn/ui y custom) con previews reales, tabla de props y snippets de código.

**Architecture:** Página Client Component con split de dos paneles. Panel izquierdo: sidebar interno con buscador y dos secciones (shadcn/custom). Panel derecho: detalle con 3 tabs (Preview/Props/Código). Todos los datos de componentes viven en un registry estático tipado.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Lucide React

---

## File Map

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Crear | `app/dashboard/components/page.tsx` | Root Client Component, layout split |
| Crear | `app/dashboard/components/component-registry.ts` | Datos estáticos de todos los componentes |
| Crear | `components/dashboard/components-explorer/copy-button.tsx` | Botón de copiar al portapapeles |
| Crear | `components/dashboard/components-explorer/components-sidebar.tsx` | Sidebar interno con buscador |
| Crear | `components/dashboard/components-explorer/component-preview.tsx` | Renders reales de cada componente |
| Crear | `components/dashboard/components-explorer/component-detail.tsx` | Panel con tabs Preview/Props/Código |
| Crear | `components/dashboard/components-explorer/index.ts` | Barrel exports |
| Modificar | `components/dashboard/sidebar.tsx` | Añadir link "Components" con icono Blocks |
| Modificar | `components/dashboard/index.ts` | Exportar nuevos componentes |

---

## Task 1: Component Registry — Types + datos shadcn A–M

**Files:**
- Create: `app/dashboard/components/component-registry.ts`

- [ ] **Step 1: Crear el archivo con tipos e interfaces**

```typescript
// app/dashboard/components/component-registry.ts

export interface PropEntry {
  name: string
  type: string
  default?: string
  required: boolean
  description?: string
}

export interface VariantItem {
  label: string
  props: Record<string, unknown>
}

export interface VariantGroup {
  label: string
  items: VariantItem[]
}

export interface ComponentEntry {
  name: string
  path: string
  origin: "shadcn" | "custom"
  description: string
  props: PropEntry[]
  variantGroups: VariantGroup[]
  codeSnippet: string
}

export const COMPONENTS: ComponentEntry[] = [
  // ─── SHADCN/UI ───────────────────────────────────────────
  {
    name: "Accordion",
    path: "@/components/ui/accordion",
    origin: "shadcn",
    description: "Componente de acordeón que permite mostrar u ocultar secciones de contenido.",
    props: [
      { name: "type", type: '"single" | "multiple"', default: '"single"', required: false },
      { name: "collapsible", type: "boolean", default: "false", required: false },
      { name: "defaultValue", type: "string | string[]", required: false },
      { name: "value", type: "string | string[]", required: false },
      { name: "onValueChange", type: "(value: string | string[]) => void", required: false },
    ],
    variantGroups: [
      {
        label: "Ejemplo",
        items: [
          { label: "Single", props: {} },
        ],
      },
    ],
    codeSnippet: `import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>¿Es accesible?</AccordionTrigger>
    <AccordionContent>
      Sí. Cumple con WAI-ARIA.
    </AccordionContent>
  </AccordionItem>
</Accordion>`,
  },
  {
    name: "Alert",
    path: "@/components/ui/alert",
    origin: "shadcn",
    description: "Muestra mensajes importantes que requieren atención del usuario.",
    props: [
      { name: "variant", type: '"default" | "destructive"', default: '"default"', required: false },
    ],
    variantGroups: [
      {
        label: "Variantes",
        items: [
          { label: "Default", props: { variant: "default" } },
          { label: "Destructive", props: { variant: "destructive" } },
        ],
      },
    ],
    codeSnippet: `import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

<Alert>
  <Terminal className="h-4 w-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>Puedes añadir componentes vía CLI.</AlertDescription>
</Alert>`,
  },
  {
    name: "AlertDialog",
    path: "@/components/ui/alert-dialog",
    origin: "shadcn",
    description: "Diálogo modal que interrumpe al usuario y requiere confirmación.",
    props: [
      { name: "open", type: "boolean", required: false },
      { name: "onOpenChange", type: "(open: boolean) => void", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="outline">Abrir</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta acción no se puede deshacer.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction>Continuar</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`,
  },
  {
    name: "AspectRatio",
    path: "@/components/ui/aspect-ratio",
    origin: "shadcn",
    description: "Mantiene una relación de aspecto consistente para su contenido.",
    props: [
      { name: "ratio", type: "number", default: "1", required: false, description: "Ej: 16/9, 4/3, 1" },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "16/9", props: { ratio: 16 / 9 } }] },
    ],
    codeSnippet: `import { AspectRatio } from "@/components/ui/aspect-ratio"

<div className="w-[450px]">
  <AspectRatio ratio={16 / 9}>
    <img src="..." className="rounded-md object-cover w-full h-full" />
  </AspectRatio>
</div>`,
  },
  {
    name: "Avatar",
    path: "@/components/ui/avatar",
    origin: "shadcn",
    description: "Imagen de perfil circular con fallback de iniciales.",
    props: [
      { name: "src", type: "string", required: false, description: "URL de la imagen (en AvatarImage)" },
      { name: "alt", type: "string", required: false, description: "Texto alternativo (en AvatarImage)" },
    ],
    variantGroups: [
      {
        label: "Tamaños",
        items: [
          { label: "sm", props: { size: "sm" } },
          { label: "md", props: { size: "md" } },
          { label: "lg", props: { size: "lg" } },
        ],
      },
    ],
    codeSnippet: `import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

<Avatar>
  <AvatarImage src="https://..." alt="@usuario" />
  <AvatarFallback>JT</AvatarFallback>
</Avatar>`,
  },
  {
    name: "Badge",
    path: "@/components/ui/badge",
    origin: "shadcn",
    description: "Pequeña etiqueta para mostrar estado, categoría o conteo.",
    props: [
      { name: "variant", type: '"default" | "secondary" | "destructive" | "outline"', default: '"default"', required: false },
    ],
    variantGroups: [
      {
        label: "Variantes",
        items: [
          { label: "Default", props: { variant: "default" } },
          { label: "Secondary", props: { variant: "secondary" } },
          { label: "Destructive", props: { variant: "destructive" } },
          { label: "Outline", props: { variant: "outline" } },
        ],
      },
    ],
    codeSnippet: `import { Badge } from "@/components/ui/badge"

<Badge variant="secondary">Nuevo</Badge>`,
  },
  {
    name: "Breadcrumb",
    path: "@/components/ui/breadcrumb",
    origin: "shadcn",
    description: "Navegación jerárquica que muestra la ruta actual.",
    props: [],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Dashboard</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`,
  },
  {
    name: "Button",
    path: "@/components/ui/button",
    origin: "shadcn",
    description: "Botón interactivo con múltiples variantes y tamaños.",
    props: [
      { name: "variant", type: '"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"', default: '"default"', required: false },
      { name: "size", type: '"default" | "sm" | "lg" | "icon"', default: '"default"', required: false },
      { name: "asChild", type: "boolean", default: "false", required: false, description: "Renderiza como su hijo directo usando Slot" },
      { name: "disabled", type: "boolean", default: "false", required: false },
    ],
    variantGroups: [
      {
        label: "Variantes",
        items: [
          { label: "Default", props: { variant: "default" } },
          { label: "Secondary", props: { variant: "secondary" } },
          { label: "Outline", props: { variant: "outline" } },
          { label: "Ghost", props: { variant: "ghost" } },
          { label: "Destructive", props: { variant: "destructive" } },
          { label: "Link", props: { variant: "link" } },
        ],
      },
      {
        label: "Tamaños",
        items: [
          { label: "sm", props: { size: "sm" } },
          { label: "default", props: { size: "default" } },
          { label: "lg", props: { size: "lg" } },
        ],
      },
    ],
    codeSnippet: `import { Button } from "@/components/ui/button"

<Button variant="outline" size="sm">
  Guardar cambios
</Button>`,
  },
  {
    name: "Calendar",
    path: "@/components/ui/calendar",
    origin: "shadcn",
    description: "Selector de fecha con navegación mensual.",
    props: [
      { name: "mode", type: '"single" | "multiple" | "range"', default: '"single"', required: false },
      { name: "selected", type: "Date | Date[] | DateRange", required: false },
      { name: "onSelect", type: "(date: Date | undefined) => void", required: false },
      { name: "showOutsideDays", type: "boolean", default: "true", required: false },
      { name: "disabled", type: "Matcher | Matcher[]", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import { Calendar } from "@/components/ui/calendar"
import { useState } from "react"

export function CalendarDemo() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
    />
  )
}`,
  },
  {
    name: "Card",
    path: "@/components/ui/card",
    origin: "shadcn",
    description: "Contenedor con borde y sombra para agrupar contenido relacionado.",
    props: [
      { name: "className", type: "string", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  Card, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descripción opcional</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Contenido de la card.</p>
  </CardContent>
  <CardFooter>
    <Button>Acción</Button>
  </CardFooter>
</Card>`,
  },
  {
    name: "Carousel",
    path: "@/components/ui/carousel",
    origin: "shadcn",
    description: "Carrusel de contenido con navegación por flechas.",
    props: [
      { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', required: false },
      { name: "opts", type: "EmblaOptionsType", required: false, description: "Opciones de Embla carousel" },
      { name: "plugins", type: "EmblaPluginType[]", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  Carousel, CarouselContent, CarouselItem,
  CarouselNext, CarouselPrevious,
} from "@/components/ui/carousel"

<Carousel>
  <CarouselContent>
    {items.map((item) => (
      <CarouselItem key={item.id}>
        <Card>{item.content}</Card>
      </CarouselItem>
    ))}
  </CarouselContent>
  <CarouselPrevious />
  <CarouselNext />
</Carousel>`,
  },
  {
    name: "Checkbox",
    path: "@/components/ui/checkbox",
    origin: "shadcn",
    description: "Control de selección binaria accesible.",
    props: [
      { name: "checked", type: "boolean | 'indeterminate'", required: false },
      { name: "defaultChecked", type: "boolean", required: false },
      { name: "onCheckedChange", type: "(checked: boolean) => void", required: false },
      { name: "disabled", type: "boolean", default: "false", required: false },
      { name: "id", type: "string", required: false },
    ],
    variantGroups: [
      {
        label: "Estados",
        items: [
          { label: "Unchecked", props: { checked: false } },
          { label: "Checked", props: { checked: true } },
          { label: "Disabled", props: { disabled: true } },
        ],
      },
    ],
    codeSnippet: `import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

<div className="flex items-center gap-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Acepto los términos</Label>
</div>`,
  },
  {
    name: "Collapsible",
    path: "@/components/ui/collapsible",
    origin: "shadcn",
    description: "Sección expandible/colapsable con control manual.",
    props: [
      { name: "open", type: "boolean", required: false },
      { name: "defaultOpen", type: "boolean", required: false },
      { name: "onOpenChange", type: "(open: boolean) => void", required: false },
      { name: "disabled", type: "boolean", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"

<Collapsible>
  <CollapsibleTrigger asChild>
    <Button variant="ghost">Ver más</Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <p>Contenido oculto inicialmente.</p>
  </CollapsibleContent>
</Collapsible>`,
  },
  {
    name: "Command",
    path: "@/components/ui/command",
    origin: "shadcn",
    description: "Paleta de comandos con búsqueda, usada para comboboxes y menús.",
    props: [
      { name: "value", type: "string", required: false },
      { name: "onValueChange", type: "(value: string) => void", required: false },
      { name: "filter", type: "(value: string, search: string) => number", required: false },
      { name: "shouldFilter", type: "boolean", default: "true", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  Command, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"

<Command>
  <CommandInput placeholder="Buscar..." />
  <CommandList>
    <CommandEmpty>Sin resultados.</CommandEmpty>
    <CommandGroup heading="Sugerencias">
      <CommandItem>Dashboard</CommandItem>
      <CommandItem>Perfil</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>`,
  },
  {
    name: "ContextMenu",
    path: "@/components/ui/context-menu",
    origin: "shadcn",
    description: "Menú que aparece al hacer clic derecho.",
    props: [
      { name: "onOpenChange", type: "(open: boolean) => void", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  ContextMenu, ContextMenuContent,
  ContextMenuItem, ContextMenuTrigger,
} from "@/components/ui/context-menu"

<ContextMenu>
  <ContextMenuTrigger>Clic derecho aquí</ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>Editar</ContextMenuItem>
    <ContextMenuItem>Eliminar</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>`,
  },
  {
    name: "Dialog",
    path: "@/components/ui/dialog",
    origin: "shadcn",
    description: "Modal accesible con overlay, ideal para formularios y confirmaciones.",
    props: [
      { name: "open", type: "boolean", required: false },
      { name: "onOpenChange", type: "(open: boolean) => void", required: false },
      { name: "modal", type: "boolean", default: "true", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Editar perfil</DialogTitle>
      <DialogDescription>
        Realiza cambios en tu perfil aquí.
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>`,
  },
  {
    name: "Drawer",
    path: "@/components/ui/drawer",
    origin: "shadcn",
    description: "Panel deslizable desde el borde de la pantalla (Vaul).",
    props: [
      { name: "open", type: "boolean", required: false },
      { name: "onOpenChange", type: "(open: boolean) => void", required: false },
      { name: "direction", type: '"bottom" | "top" | "left" | "right"', default: '"bottom"', required: false },
      { name: "shouldScaleBackground", type: "boolean", default: "false", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  Drawer, DrawerContent, DrawerDescription,
  DrawerHeader, DrawerTitle, DrawerTrigger,
} from "@/components/ui/drawer"

<Drawer>
  <DrawerTrigger asChild>
    <Button>Abrir drawer</Button>
  </DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Editar</DrawerTitle>
      <DrawerDescription>Realiza cambios.</DrawerDescription>
    </DrawerHeader>
  </DrawerContent>
</Drawer>`,
  },
  {
    name: "DropdownMenu",
    path: "@/components/ui/dropdown-menu",
    origin: "shadcn",
    description: "Menú desplegable con opciones, grupos y submenús.",
    props: [
      { name: "open", type: "boolean", required: false },
      { name: "onOpenChange", type: "(open: boolean) => void", required: false },
      { name: "modal", type: "boolean", default: "true", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Opciones</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Perfil</DropdownMenuItem>
    <DropdownMenuItem variant="destructive">Cerrar sesión</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`,
  },
  {
    name: "Form",
    path: "@/components/ui/form",
    origin: "shadcn",
    description: "Wrapper de React Hook Form con validación, mensajes de error y accesibilidad.",
    props: [
      { name: "...form", type: "UseFormReturn<TFieldValues>", required: true, description: "Retorno de useForm() de react-hook-form" },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage,
} from "@/components/ui/form"

const schema = z.object({ email: z.string().email() })

export function MyForm() {
  const form = useForm({ resolver: zodResolver(schema) })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(console.log)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Enviar</Button>
      </form>
    </Form>
  )
}`,
  },
  {
    name: "HoverCard",
    path: "@/components/ui/hover-card",
    origin: "shadcn",
    description: "Tarjeta de información que aparece al hacer hover.",
    props: [
      { name: "open", type: "boolean", required: false },
      { name: "defaultOpen", type: "boolean", required: false },
      { name: "onOpenChange", type: "(open: boolean) => void", required: false },
      { name: "openDelay", type: "number", default: "700", required: false },
      { name: "closeDelay", type: "number", default: "300", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

<HoverCard>
  <HoverCardTrigger asChild>
    <Button variant="link">@shadcn</Button>
  </HoverCardTrigger>
  <HoverCardContent>
    <p>Información adicional sobre @shadcn.</p>
  </HoverCardContent>
</HoverCard>`,
  },
  {
    name: "Input",
    path: "@/components/ui/input",
    origin: "shadcn",
    description: "Campo de texto estilizado que acepta todas las props nativas de <input>.",
    props: [
      { name: "type", type: "string", default: '"text"', required: false },
      { name: "placeholder", type: "string", required: false },
      { name: "disabled", type: "boolean", default: "false", required: false },
      { name: "value", type: "string", required: false },
      { name: "onChange", type: "React.ChangeEventHandler<HTMLInputElement>", required: false },
    ],
    variantGroups: [
      {
        label: "Tipos",
        items: [
          { label: "Text", props: { type: "text", placeholder: "Texto..." } },
          { label: "Email", props: { type: "email", placeholder: "email@ejemplo.com" } },
          { label: "Password", props: { type: "password", placeholder: "••••••••" } },
          { label: "Disabled", props: { disabled: true, placeholder: "Deshabilitado" } },
        ],
      },
    ],
    codeSnippet: `import { Input } from "@/components/ui/input"

<Input type="email" placeholder="email@ejemplo.com" />`,
  },
  {
    name: "InputOTP",
    path: "@/components/ui/input-otp",
    origin: "shadcn",
    description: "Input especializado para códigos OTP/PIN de una sola vez.",
    props: [
      { name: "maxLength", type: "number", required: true },
      { name: "value", type: "string", required: false },
      { name: "onChange", type: "(value: string) => void", required: false },
      { name: "disabled", type: "boolean", default: "false", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "6 dígitos", props: { maxLength: 6 } }] },
    ],
    codeSnippet: `import {
  InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot,
} from "@/components/ui/input-otp"

<InputOTP maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
  </InputOTPGroup>
  <InputOTPSeparator />
  <InputOTPGroup>
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>`,
  },
  {
    name: "Label",
    path: "@/components/ui/label",
    origin: "shadcn",
    description: "Etiqueta accesible para campos de formulario.",
    props: [
      { name: "htmlFor", type: "string", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

<div className="grid gap-1.5">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
</div>`,
  },
  {
    name: "Menubar",
    path: "@/components/ui/menubar",
    origin: "shadcn",
    description: "Barra de menú horizontal estilo escritorio.",
    props: [
      { name: "value", type: "string", required: false },
      { name: "onValueChange", type: "(value: string) => void", required: false },
      { name: "loop", type: "boolean", default: "true", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  Menubar, MenubarContent, MenubarItem,
  MenubarMenu, MenubarTrigger,
} from "@/components/ui/menubar"

<Menubar>
  <MenubarMenu>
    <MenubarTrigger>Archivo</MenubarTrigger>
    <MenubarContent>
      <MenubarItem>Nuevo</MenubarItem>
      <MenubarItem>Abrir</MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</Menubar>`,
  },
]
```

- [ ] **Step 2: Verificar TypeScript**

```bash
bun run typecheck
```
Esperado: sin errores en `component-registry.ts`

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/components/component-registry.ts
git commit -m "feat: add component registry types and shadcn A-M entries"
```

---

## Task 2: Component Registry — shadcn N–Z + Custom

**Files:**
- Modify: `app/dashboard/components/component-registry.ts`

- [ ] **Step 1: Añadir las entradas restantes de shadcn y los componentes custom**

Añadir al array `COMPONENTS` después de la entrada `Menubar`:

```typescript
  {
    name: "NavigationMenu",
    path: "@/components/ui/navigation-menu",
    origin: "shadcn",
    description: "Menú de navegación principal con soporte para submenús y animaciones.",
    props: [
      { name: "value", type: "string", required: false },
      { name: "onValueChange", type: "(value: string) => void", required: false },
      { name: "delayDuration", type: "number", default: "200", required: false },
    ],
    variantGroups: [{ label: "Ejemplo", items: [{ label: "Default", props: {} }] }],
    codeSnippet: `import {
  NavigationMenu, NavigationMenuContent,
  NavigationMenuItem, NavigationMenuLink,
  NavigationMenuList, NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"

<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Componentes</NavigationMenuTrigger>
      <NavigationMenuContent>
        <NavigationMenuLink href="/docs">Documentación</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>`,
  },
  {
    name: "Pagination",
    path: "@/components/ui/pagination",
    origin: "shadcn",
    description: "Controles de paginación accesibles.",
    props: [],
    variantGroups: [{ label: "Ejemplo", items: [{ label: "Default", props: {} }] }],
    codeSnippet: `import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination"

<Pagination>
  <PaginationContent>
    <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
    <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
    <PaginationItem><PaginationLink href="#" isActive>2</PaginationLink></PaginationItem>
    <PaginationItem><PaginationEllipsis /></PaginationItem>
    <PaginationItem><PaginationNext href="#" /></PaginationItem>
  </PaginationContent>
</Pagination>`,
  },
  {
    name: "Popover",
    path: "@/components/ui/popover",
    origin: "shadcn",
    description: "Superposición flotante anclada a un trigger.",
    props: [
      { name: "open", type: "boolean", required: false },
      { name: "onOpenChange", type: "(open: boolean) => void", required: false },
    ],
    variantGroups: [{ label: "Ejemplo", items: [{ label: "Default", props: {} }] }],
    codeSnippet: `import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Abrir</Button>
  </PopoverTrigger>
  <PopoverContent>
    <p>Contenido del popover.</p>
  </PopoverContent>
</Popover>`,
  },
  {
    name: "Progress",
    path: "@/components/ui/progress",
    origin: "shadcn",
    description: "Barra de progreso para mostrar el avance de una tarea.",
    props: [
      { name: "value", type: "number", required: false, description: "Valor entre 0 y 100" },
      { name: "max", type: "number", default: "100", required: false },
    ],
    variantGroups: [
      {
        label: "Valores",
        items: [
          { label: "25%", props: { value: 25 } },
          { label: "50%", props: { value: 50 } },
          { label: "75%", props: { value: 75 } },
          { label: "100%", props: { value: 100 } },
        ],
      },
    ],
    codeSnippet: `import { Progress } from "@/components/ui/progress"

<Progress value={60} className="w-full" />`,
  },
  {
    name: "RadioGroup",
    path: "@/components/ui/radio-group",
    origin: "shadcn",
    description: "Grupo de opciones mutuamente excluyentes.",
    props: [
      { name: "value", type: "string", required: false },
      { name: "defaultValue", type: "string", required: false },
      { name: "onValueChange", type: "(value: string) => void", required: false },
      { name: "disabled", type: "boolean", default: "false", required: false },
      { name: "orientation", type: '"horizontal" | "vertical"', default: '"vertical"', required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

<RadioGroup defaultValue="option-1">
  <div className="flex items-center gap-2">
    <RadioGroupItem value="option-1" id="r1" />
    <Label htmlFor="r1">Opción 1</Label>
  </div>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="option-2" id="r2" />
    <Label htmlFor="r2">Opción 2</Label>
  </div>
</RadioGroup>`,
  },
  {
    name: "Resizable",
    path: "@/components/ui/resizable",
    origin: "shadcn",
    description: "Paneles redimensionables con handle de arrastre.",
    props: [
      { name: "direction", type: '"horizontal" | "vertical"', default: '"horizontal"', required: false },
      { name: "onLayout", type: "(sizes: number[]) => void", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from "@/components/ui/resizable"

<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={50}>
    <p>Panel izquierdo</p>
  </ResizablePanel>
  <ResizableHandle />
  <ResizablePanel defaultSize={50}>
    <p>Panel derecho</p>
  </ResizablePanel>
</ResizablePanelGroup>`,
  },
  {
    name: "ScrollArea",
    path: "@/components/ui/scroll-area",
    origin: "shadcn",
    description: "Área scrollable con scrollbar personalizado y consistente.",
    props: [
      { name: "type", type: '"auto" | "always" | "scroll" | "hover"', default: '"hover"', required: false },
      { name: "scrollHideDelay", type: "number", default: "600", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import { ScrollArea } from "@/components/ui/scroll-area"

<ScrollArea className="h-64 w-48 rounded-md border p-4">
  {Array.from({ length: 20 }, (_, i) => (
    <div key={i} className="py-1 text-sm">Item {i + 1}</div>
  ))}
</ScrollArea>`,
  },
  {
    name: "Select",
    path: "@/components/ui/select",
    origin: "shadcn",
    description: "Selector desplegable accesible con opciones y grupos.",
    props: [
      { name: "value", type: "string", required: false },
      { name: "defaultValue", type: "string", required: false },
      { name: "onValueChange", type: "(value: string) => void", required: false },
      { name: "disabled", type: "boolean", default: "false", required: false },
      { name: "open", type: "boolean", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"

<Select>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="Selecciona..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="admin">Admin</SelectItem>
    <SelectItem value="user">User</SelectItem>
    <SelectItem value="moderator">Moderator</SelectItem>
  </SelectContent>
</Select>`,
  },
  {
    name: "Separator",
    path: "@/components/ui/separator",
    origin: "shadcn",
    description: "Divisor visual horizontal o vertical.",
    props: [
      { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', required: false },
      { name: "decorative", type: "boolean", default: "true", required: false },
    ],
    variantGroups: [
      {
        label: "Orientación",
        items: [
          { label: "Horizontal", props: { orientation: "horizontal" } },
          { label: "Vertical", props: { orientation: "vertical" } },
        ],
      },
    ],
    codeSnippet: `import { Separator } from "@/components/ui/separator"

<Separator orientation="horizontal" />`,
  },
  {
    name: "Sheet",
    path: "@/components/ui/sheet",
    origin: "shadcn",
    description: "Panel deslizable desde cualquier lado de la pantalla.",
    props: [
      { name: "open", type: "boolean", required: false },
      { name: "onOpenChange", type: "(open: boolean) => void", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  Sheet, SheetContent, SheetDescription,
  SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"

<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Abrir</Button>
  </SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Detalle</SheetTitle>
      <SheetDescription>Información adicional.</SheetDescription>
    </SheetHeader>
  </SheetContent>
</Sheet>`,
  },
  {
    name: "Skeleton",
    path: "@/components/ui/skeleton",
    origin: "shadcn",
    description: "Placeholder animado para estados de carga.",
    props: [
      { name: "className", type: "string", required: false, description: "Clases para tamaño y forma (h-*, w-*, rounded-*)" },
    ],
    variantGroups: [
      {
        label: "Formas",
        items: [
          { label: "Texto", props: {} },
          { label: "Círculo", props: { circle: true } },
          { label: "Card", props: { card: true } },
        ],
      },
    ],
    codeSnippet: `import { Skeleton } from "@/components/ui/skeleton"

<div className="flex items-center gap-4">
  <Skeleton className="h-12 w-12 rounded-full" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-48" />
    <Skeleton className="h-4 w-32" />
  </div>
</div>`,
  },
  {
    name: "Slider",
    path: "@/components/ui/slider",
    origin: "shadcn",
    description: "Control deslizante para valores numéricos en un rango.",
    props: [
      { name: "value", type: "number[]", required: false },
      { name: "defaultValue", type: "number[]", required: false },
      { name: "onValueChange", type: "(value: number[]) => void", required: false },
      { name: "min", type: "number", default: "0", required: false },
      { name: "max", type: "number", default: "100", required: false },
      { name: "step", type: "number", default: "1", required: false },
      { name: "disabled", type: "boolean", default: "false", required: false },
    ],
    variantGroups: [
      {
        label: "Ejemplos",
        items: [
          { label: "40%", props: { defaultValue: [40] } },
          { label: "Range", props: { defaultValue: [20, 80] } },
        ],
      },
    ],
    codeSnippet: `import { Slider } from "@/components/ui/slider"

<Slider
  defaultValue={[50]}
  min={0}
  max={100}
  step={1}
  className="w-64"
/>`,
  },
  {
    name: "Sonner",
    path: "@/components/ui/sonner",
    origin: "shadcn",
    description: "Sistema de notificaciones toast (Sonner). Requiere <Toaster /> en el layout.",
    props: [
      { name: "position", type: '"top-left" | "top-right" | "top-center" | "bottom-left" | "bottom-right" | "bottom-center"', default: '"bottom-right"', required: false },
      { name: "richColors", type: "boolean", default: "false", required: false },
      { name: "expand", type: "boolean", default: "false", required: false },
      { name: "duration", type: "number", default: "4000", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `// En layout.tsx:
import { Toaster } from "@/components/ui/sonner"
<Toaster />

// En cualquier componente:
import { toast } from "sonner"

toast("Cambios guardados")
toast.error("Error al guardar")
toast.success("¡Listo!")`,
  },
  {
    name: "Switch",
    path: "@/components/ui/switch",
    origin: "shadcn",
    description: "Toggle on/off accesible.",
    props: [
      { name: "checked", type: "boolean", required: false },
      { name: "defaultChecked", type: "boolean", required: false },
      { name: "onCheckedChange", type: "(checked: boolean) => void", required: false },
      { name: "disabled", type: "boolean", default: "false", required: false },
    ],
    variantGroups: [
      {
        label: "Estados",
        items: [
          { label: "Off", props: { checked: false } },
          { label: "On", props: { checked: true } },
          { label: "Disabled", props: { disabled: true } },
        ],
      },
    ],
    codeSnippet: `import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

<div className="flex items-center gap-2">
  <Switch id="notifications" />
  <Label htmlFor="notifications">Notificaciones</Label>
</div>`,
  },
  {
    name: "Table",
    path: "@/components/ui/table",
    origin: "shadcn",
    description: "Tabla accesible y responsiva con partes composables.",
    props: [],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nombre</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Rol</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Jorge</TableCell>
      <TableCell>jorge@email.com</TableCell>
      <TableCell>Admin</TableCell>
    </TableRow>
  </TableBody>
</Table>`,
  },
  {
    name: "Tabs",
    path: "@/components/ui/tabs",
    origin: "shadcn",
    description: "Navegación por pestañas accesible.",
    props: [
      { name: "value", type: "string", required: false },
      { name: "defaultValue", type: "string", required: false },
      { name: "onValueChange", type: "(value: string) => void", required: false },
      { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Contenido tab 1</TabsContent>
  <TabsContent value="tab2">Contenido tab 2</TabsContent>
</Tabs>`,
  },
  {
    name: "Textarea",
    path: "@/components/ui/textarea",
    origin: "shadcn",
    description: "Campo de texto multilínea estilizado.",
    props: [
      { name: "placeholder", type: "string", required: false },
      { name: "disabled", type: "boolean", default: "false", required: false },
      { name: "rows", type: "number", required: false },
      { name: "value", type: "string", required: false },
      { name: "onChange", type: "React.ChangeEventHandler<HTMLTextAreaElement>", required: false },
    ],
    variantGroups: [
      {
        label: "Estados",
        items: [
          { label: "Default", props: { placeholder: "Escribe aquí..." } },
          { label: "Disabled", props: { disabled: true, placeholder: "Deshabilitado" } },
        ],
      },
    ],
    codeSnippet: `import { Textarea } from "@/components/ui/textarea"

<Textarea placeholder="Escribe tu mensaje aquí." rows={4} />`,
  },
  {
    name: "Toggle",
    path: "@/components/ui/toggle",
    origin: "shadcn",
    description: "Botón con estado presionado/no presionado.",
    props: [
      { name: "pressed", type: "boolean", required: false },
      { name: "defaultPressed", type: "boolean", required: false },
      { name: "onPressedChange", type: "(pressed: boolean) => void", required: false },
      { name: "variant", type: '"default" | "outline"', default: '"default"', required: false },
      { name: "size", type: '"default" | "sm" | "lg"', default: '"default"', required: false },
      { name: "disabled", type: "boolean", default: "false", required: false },
    ],
    variantGroups: [
      {
        label: "Variantes",
        items: [
          { label: "Default", props: { variant: "default" } },
          { label: "Outline", props: { variant: "outline" } },
        ],
      },
    ],
    codeSnippet: `import { Toggle } from "@/components/ui/toggle"
import { Bold } from "lucide-react"

<Toggle aria-label="Toggle bold">
  <Bold className="h-4 w-4" />
</Toggle>`,
  },
  {
    name: "ToggleGroup",
    path: "@/components/ui/toggle-group",
    origin: "shadcn",
    description: "Grupo de toggles con selección single o multiple.",
    props: [
      { name: "type", type: '"single" | "multiple"', required: true },
      { name: "value", type: "string | string[]", required: false },
      { name: "onValueChange", type: "(value: string | string[]) => void", required: false },
      { name: "variant", type: '"default" | "outline"', default: '"default"', required: false },
      { name: "size", type: '"default" | "sm" | "lg"', default: '"default"', required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Single", props: { type: "single" } }] },
    ],
    codeSnippet: `import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

<ToggleGroup type="single" defaultValue="center">
  <ToggleGroupItem value="left">Izq</ToggleGroupItem>
  <ToggleGroupItem value="center">Centro</ToggleGroupItem>
  <ToggleGroupItem value="right">Der</ToggleGroupItem>
</ToggleGroup>`,
  },
  {
    name: "Tooltip",
    path: "@/components/ui/tooltip",
    origin: "shadcn",
    description: "Texto informativo flotante que aparece al hacer hover.",
    props: [
      { name: "open", type: "boolean", required: false },
      { name: "defaultOpen", type: "boolean", required: false },
      { name: "onOpenChange", type: "(open: boolean) => void", required: false },
      { name: "delayDuration", type: "number", default: "700", required: false },
      { name: "side", type: '"top" | "right" | "bottom" | "left"', default: '"top"', required: false, description: "En TooltipContent" },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Hover aquí</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Texto explicativo</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>`,
  },

  // ─── CUSTOM ──────────────────────────────────────────────
  {
    name: "ConfirmDialog",
    path: "@/components/dashboard/confirm-dialog",
    origin: "custom",
    description: "Modal de confirmación con estado de loading y variante destructive.",
    props: [
      { name: "open", type: "boolean", required: true },
      { name: "onOpenChange", type: "(open: boolean) => void", required: true },
      { name: "title", type: "string", required: true },
      { name: "description", type: "string", required: true },
      { name: "confirmLabel", type: "string", default: '"Confirmar"', required: false },
      { name: "cancelLabel", type: "string", default: '"Cancelar"', required: false },
      { name: "variant", type: '"default" | "destructive"', default: '"default"', required: false },
      { name: "onConfirm", type: "() => Promise<void> | void", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"

<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="¿Eliminar usuario?"
  description="Esta acción no se puede deshacer."
  variant="destructive"
  confirmLabel="Eliminar"
  onConfirm={async () => {
    await deleteUser(userId)
    setOpen(false)
  }}
/>`,
  },
  {
    name: "DataTable",
    path: "@/components/dashboard/data-table",
    origin: "custom",
    description: "Tabla de datos con selección, paginación, enlaces de fila y acciones.",
    props: [
      { name: "columns", type: "Column<T>[]", required: true, description: "Definición de columnas. Cada Column tiene key, header, render?" },
      { name: "data", type: "T[]", required: true, description: "Array de objetos con campo `id: string`" },
      { name: "title", type: "string", required: false },
      { name: "description", type: "string", required: false },
      { name: "selectable", type: "boolean", default: "false", required: false },
      { name: "selectedIds", type: "string[]", required: false },
      { name: "onSelectionChange", type: "(ids: string[]) => void", required: false },
      { name: "viewAllHref", type: "string", required: false },
      { name: "viewAllLabel", type: "string", required: false },
      { name: "onRowClick", type: "(item: T) => void", required: false },
      { name: "embedded", type: "boolean", default: "false", required: false, description: "Sin Card wrapper cuando está dentro de otra card" },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import { DataTable, type Column } from "@/components/dashboard/data-table"

const columns: Column<User>[] = [
  { key: "name", header: "Nombre" },
  { key: "email", header: "Email" },
  {
    key: "role",
    header: "Rol",
    render: (user) => <Badge>{user.role}</Badge>,
  },
]

<DataTable
  title="Usuarios"
  columns={columns}
  data={users}
  selectable
  onRowClick={(user) => router.push(\`/dashboard/users/\${user.id}\`)}
/>`,
  },
  {
    name: "InputGroup",
    path: "@/components/ui/input-group",
    origin: "custom",
    description: "Wrapper para inputs con addons inline/block (iconos, botones, texto).",
    props: [
      { name: "children", type: "React.ReactNode", required: true, description: "InputGroupInput + InputGroupAddon(s)" },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "With Icon", props: {} }] },
    ],
    codeSnippet: `import {
  InputGroup, InputGroupAddon, InputGroupInput,
} from "@/components/ui/input-group"
import { Search } from "lucide-react"

<InputGroup>
  <InputGroupAddon align="inline-start">
    <Search className="size-4" />
  </InputGroupAddon>
  <InputGroupInput placeholder="Buscar..." />
</InputGroup>`,
  },
  {
    name: "MetricCard",
    path: "@/components/dashboard/metric-card",
    origin: "custom",
    description: "Tarjeta KPI con valor, tendencia y variación porcentual.",
    props: [
      { name: "title", type: "string", required: true },
      { name: "value", type: "string | number", required: true },
      { name: "change", type: "number", required: false, description: "Porcentaje de cambio (positivo/negativo)" },
      { name: "trend", type: '"up" | "down" | "neutral"', required: false },
      { name: "icon", type: "LucideIcon", required: false },
      { name: "prefix", type: "string", required: false, description: 'Ej: "$"' },
      { name: "suffix", type: "string", required: false, description: 'Ej: "k"' },
    ],
    variantGroups: [
      {
        label: "Tendencias",
        items: [
          { label: "Up", props: { trend: "up" } },
          { label: "Down", props: { trend: "down" } },
          { label: "Neutral", props: { trend: "neutral" } },
        ],
      },
    ],
    codeSnippet: `import { MetricCard } from "@/components/dashboard/metric-card"
import { Users } from "lucide-react"

<MetricCard
  title="Usuarios totales"
  value={1284}
  change={12.5}
  trend="up"
  icon={Users}
/>`,
  },
  {
    name: "PageHeader",
    path: "@/components/dashboard/page-header",
    origin: "custom",
    description: "Encabezado de página con título, descripción, selector de rango de fechas y acciones.",
    props: [
      { name: "title", type: "string", required: true },
      { name: "description", type: "string", required: false },
      { name: "dateRangeOptions", type: "DateRangeOption[]", required: false },
      { name: "selectedDateRange", type: "string", required: false },
      { name: "onDateRangeChange", type: "(value: string) => void", required: false },
      { name: "actions", type: "ActionButton[]", required: false },
      { name: "children", type: "React.ReactNode", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import { PageHeader } from "@/components/dashboard/page-header"
import { Plus } from "lucide-react"

<PageHeader
  title="Usuarios"
  description="Gestiona los usuarios de la plataforma"
  actions={[
    {
      label: "Add User",
      icon: Plus,
      variant: "default",
      onClick: () => setOpen(true),
    },
  ]}
/>`,
  },
  {
    name: "DashboardSidebar",
    path: "@/components/dashboard/sidebar",
    origin: "custom",
    description: "Sidebar principal del dashboard con navegación, perfil y soporte mobile.",
    props: [
      { name: "brandName", type: "string", default: '"A E T H E R"', required: false },
      { name: "navigation", type: "NavSection[]", required: false, description: "Array de secciones con items de navegación" },
      { name: "user", type: "UserProfile", required: false },
      { name: "onLogout", type: "() => void | Promise<void>", required: false },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import { DashboardSidebar } from "@/components/dashboard/sidebar"

<DashboardSidebar
  brandName="MI APP"
  navigation={[
    {
      title: "Menu",
      items: [
        { title: "Dashboard", href: "/dashboard", icon: Home },
        { title: "Users", href: "/dashboard/users", icon: Users },
      ],
    },
  ]}
  user={{ name: "Jorge", email: "j@email.com", role: "Admin" }}
  onLogout={handleLogout}
/>`,
  },
  {
    name: "StatusBadge",
    path: "@/components/dashboard/status-badge",
    origin: "custom",
    description: "Badge de estado con punto de color y variantes semánticas.",
    props: [
      { name: "status", type: '"success" | "warning" | "error" | "info" | "neutral"', required: true },
      { name: "label", type: "string", required: true },
      { name: "showDot", type: "boolean", default: "true", required: false },
    ],
    variantGroups: [
      {
        label: "Estados",
        items: [
          { label: "Success", props: { status: "success", label: "Active" } },
          { label: "Warning", props: { status: "warning", label: "Pending" } },
          { label: "Error", props: { status: "error", label: "Error" } },
          { label: "Info", props: { status: "info", label: "Info" } },
          { label: "Neutral", props: { status: "neutral", label: "Inactive" } },
        ],
      },
    ],
    codeSnippet: `import { StatusBadge } from "@/components/dashboard/status-badge"

<StatusBadge status="success" label="Active" />
<StatusBadge status="warning" label="Pending" showDot={false} />`,
  },
  {
    name: "UserWelcome",
    path: "@/components/dashboard/user-welcome",
    origin: "custom",
    description: "Bloque de bienvenida con avatar, nombre y rol del usuario.",
    props: [
      { name: "user", type: "{ name: string; email: string; role: string; image?: string }", required: true },
    ],
    variantGroups: [
      { label: "Ejemplo", items: [{ label: "Default", props: {} }] },
    ],
    codeSnippet: `import { UserWelcome } from "@/components/dashboard/user-welcome"

<UserWelcome
  user={{
    name: "Jorge Trejo",
    email: "jorge@email.com",
    role: "Admin",
  }}
/>`,
  },
]
```

- [ ] **Step 2: Verificar TypeScript**

```bash
bun run typecheck
```
Esperado: sin errores en `component-registry.ts`

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/components/component-registry.ts
git commit -m "feat: complete component registry with all 54 entries"
```

---

## Task 3: CopyButton

**Files:**
- Create: `components/dashboard/components-explorer/copy-button.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/dashboard/components-explorer/copy-button.tsx
"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  text: string
  className?: string
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copiado" : "Copiar"}
    </button>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/components-explorer/copy-button.tsx
git commit -m "feat: add CopyButton component"
```

---

## Task 4: ComponentsSidebar

**Files:**
- Create: `components/dashboard/components-explorer/components-sidebar.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/dashboard/components-explorer/components-sidebar.tsx
"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { COMPONENTS, type ComponentEntry } from "@/app/dashboard/components/component-registry"

interface ComponentsSidebarProps {
  selected: string
  onSelect: (name: string) => void
}

export function ComponentsSidebar({ selected, onSelect }: ComponentsSidebarProps) {
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase()
    return COMPONENTS.filter((c) => c.name.toLowerCase().includes(q))
  }, [search])

  const shadcnItems = filtered.filter((c) => c.origin === "shadcn")
  const customItems = filtered.filter((c) => c.origin === "custom")

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-background">
      {/* Search */}
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar componente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {shadcnItems.length > 0 && (
          <SidebarSection
            label="SHADCN/UI"
            count={shadcnItems.length}
            badgeClass="bg-blue-500/10 text-blue-400"
            items={shadcnItems}
            selected={selected}
            onSelect={onSelect}
          />
        )}

        {customItems.length > 0 && (
          <SidebarSection
            label="CUSTOM"
            count={customItems.length}
            badgeClass="bg-purple-500/10 text-purple-400"
            items={customItems}
            selected={selected}
            onSelect={onSelect}
            className={shadcnItems.length > 0 ? "mt-4" : ""}
          />
        )}

        {filtered.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            Sin resultados para &ldquo;{search}&rdquo;
          </p>
        )}
      </ScrollArea>
    </aside>
  )
}

function SidebarSection({
  label,
  count,
  badgeClass,
  items,
  selected,
  onSelect,
  className,
}: {
  label: string
  count: number
  badgeClass: string
  items: ComponentEntry[]
  selected: string
  onSelect: (name: string) => void
  className?: string
}) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-2 px-2 py-1">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", badgeClass)}>
          {count}
        </span>
      </div>
      {items.map((item) => (
        <button
          key={item.name}
          onClick={() => onSelect(item.name)}
          className={cn(
            "w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors",
            selected === item.name
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          {item.name}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/components-explorer/components-sidebar.tsx
git commit -m "feat: add ComponentsSidebar with search and sections"
```

---

## Task 5: ComponentPreview

**Files:**
- Create: `components/dashboard/components-explorer/component-preview.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/dashboard/components-explorer/component-preview.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { type VariantGroup } from "@/app/dashboard/components/component-registry"

// shadcn
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
// custom
import { StatusBadge } from "@/components/dashboard/status-badge"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { Terminal, Bold, AlignLeft, AlignCenter, AlignRight, Users } from "lucide-react"

interface ComponentPreviewProps {
  name: string
  variantGroups: VariantGroup[]
}

export function ComponentPreview({ name, variantGroups }: ComponentPreviewProps) {
  return (
    <div className="space-y-6">
      {variantGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {group.label}
          </p>
          <div className="rounded-lg border border-border bg-muted/30 p-6">
            <PreviewGroup name={name} group={group} />
          </div>
        </div>
      ))}
    </div>
  )
}

function PreviewGroup({ name, group }: { name: string; group: VariantGroup }) {
  switch (name) {
    case "Accordion":
      return (
        <Accordion type="single" collapsible className="w-full max-w-sm">
          <AccordionItem value="item-1">
            <AccordionTrigger>¿Es accesible?</AccordionTrigger>
            <AccordionContent>Sí. Cumple con WAI-ARIA.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>¿Es personalizable?</AccordionTrigger>
            <AccordionContent>Sí. Con Tailwind y variantes.</AccordionContent>
          </AccordionItem>
        </Accordion>
      )

    case "Alert":
      return (
        <div className="flex flex-wrap gap-4">
          {group.items.map((item) => (
            <Alert key={item.label} variant={item.props.variant as "default" | "destructive"} className="max-w-sm">
              <Terminal className="h-4 w-4" />
              <AlertTitle>{item.label}</AlertTitle>
              <AlertDescription>Mensaje de alerta tipo {item.label.toLowerCase()}.</AlertDescription>
            </Alert>
          ))}
        </div>
      )

    case "AlertDialog":
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">Abrir AlertDialog</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Continuar?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )

    case "AspectRatio":
      return (
        <div className="w-64">
          <AspectRatio ratio={16 / 9} className="bg-muted rounded-md overflow-hidden">
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              16 / 9
            </div>
          </AspectRatio>
        </div>
      )

    case "Avatar":
      return (
        <div className="flex items-center gap-4">
          <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">SM</AvatarFallback></Avatar>
          <Avatar className="h-10 w-10"><AvatarFallback>JT</AvatarFallback></Avatar>
          <Avatar className="h-14 w-14"><AvatarFallback className="text-lg">AD</AvatarFallback></Avatar>
        </div>
      )

    case "Badge":
      return (
        <div className="flex flex-wrap gap-2">
          {group.items.map((item) => (
            <Badge key={item.label} variant={item.props.variant as "default" | "secondary" | "destructive" | "outline"}>
              {item.label}
            </Badge>
          ))}
        </div>
      )

    case "Breadcrumb":
      return (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="#">Dashboard</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Componentes</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

    case "Button":
      if (group.label === "Tamaños") {
        return (
          <div className="flex items-center gap-3">
            {group.items.map((item) => (
              <Button key={item.label} size={item.props.size as "sm" | "default" | "lg"}>
                {item.label}
              </Button>
            ))}
          </div>
        )
      }
      return (
        <div className="flex flex-wrap gap-3">
          {group.items.map((item) => (
            <Button key={item.label} variant={item.props.variant as "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"}>
              {item.label}
            </Button>
          ))}
        </div>
      )

    case "Calendar":
      return <CalendarPreview />

    case "Card":
      return (
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Descripción de la card.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Contenido de la card.</p>
          </CardContent>
        </Card>
      )

    case "Checkbox":
      return (
        <div className="flex flex-wrap gap-6">
          {group.items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <Checkbox
                checked={item.props.checked as boolean}
                disabled={item.props.disabled as boolean}
              />
              <Label>{item.label}</Label>
            </div>
          ))}
        </div>
      )

    case "Collapsible":
      return <CollapsiblePreview />

    case "Dialog":
      return (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Abrir Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar perfil</DialogTitle>
              <DialogDescription>Realiza cambios en tu perfil.</DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Input placeholder="Nombre..." />
            </div>
          </DialogContent>
        </Dialog>
      )

    case "Input":
      return (
        <div className="flex flex-wrap gap-3 max-w-sm">
          {group.items.map((item) => (
            <Input
              key={item.label}
              type={item.props.type as string}
              placeholder={item.props.placeholder as string}
              disabled={item.props.disabled as boolean}
            />
          ))}
        </div>
      )

    case "InputOTP":
      return (
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      )

    case "Label":
      return (
        <div className="grid gap-1.5">
          <Label htmlFor="demo-input">Email</Label>
          <Input id="demo-input" type="email" placeholder="email@ejemplo.com" className="max-w-xs" />
        </div>
      )

    case "Pagination":
      return (
        <Pagination>
          <PaginationContent>
            <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
            <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
            <PaginationItem><PaginationLink href="#" isActive>2</PaginationLink></PaginationItem>
            <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>
            <PaginationItem><PaginationNext href="#" /></PaginationItem>
          </PaginationContent>
        </Pagination>
      )

    case "Popover":
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Abrir Popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <p className="text-sm">Contenido del popover.</p>
          </PopoverContent>
        </Popover>
      )

    case "Progress":
      return (
        <div className="flex flex-col gap-3 w-64">
          {group.items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{item.label}</span>
                <span>{item.props.value as number}%</span>
              </div>
              <Progress value={item.props.value as number} />
            </div>
          ))}
        </div>
      )

    case "RadioGroup":
      return (
        <RadioGroup defaultValue="opt1">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="opt1" id="r1" />
            <Label htmlFor="r1">Opción 1</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="opt2" id="r2" />
            <Label htmlFor="r2">Opción 2</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="opt3" id="r3" />
            <Label htmlFor="r3">Opción 3</Label>
          </div>
        </RadioGroup>
      )

    case "ScrollArea":
      return (
        <ScrollArea className="h-40 w-48 rounded-md border p-3">
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className="py-1 text-sm text-muted-foreground">Item {i + 1}</div>
          ))}
        </ScrollArea>
      )

    case "Select":
      return (
        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecciona..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      )

    case "Separator":
      return (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Horizontal</p>
            <Separator orientation="horizontal" className="w-48" />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Vertical:</p>
            <div className="flex h-8 items-center gap-2">
              <span className="text-sm">Item A</span>
              <Separator orientation="vertical" />
              <span className="text-sm">Item B</span>
            </div>
          </div>
        </div>
      )

    case "Sheet":
      return (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Abrir Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Detalle</SheetTitle>
              <SheetDescription>Panel lateral de detalle.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      )

    case "Skeleton":
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      )

    case "Slider":
      return (
        <div className="flex flex-col gap-6 w-64">
          {group.items.map((item) => (
            <div key={item.label}>
              <p className="text-xs text-muted-foreground mb-2">{item.label}</p>
              <Slider defaultValue={item.props.defaultValue as number[]} />
            </div>
          ))}
        </div>
      )

    case "Switch":
      return (
        <div className="flex flex-wrap gap-6">
          {group.items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <Switch checked={item.props.checked as boolean} disabled={item.props.disabled as boolean} />
              <Label>{item.label}</Label>
            </div>
          ))}
        </div>
      )

    case "Table":
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Jorge Trejo</TableCell>
              <TableCell>jorge@email.com</TableCell>
              <TableCell><Badge variant="outline">Admin</Badge></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Ana García</TableCell>
              <TableCell>ana@email.com</TableCell>
              <TableCell><Badge variant="secondary">User</Badge></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

    case "Tabs":
      return (
        <Tabs defaultValue="tab1" className="w-64">
          <TabsList>
            <TabsTrigger value="tab1">Cuenta</TabsTrigger>
            <TabsTrigger value="tab2">Seguridad</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <p className="text-sm text-muted-foreground pt-2">Configuración de cuenta.</p>
          </TabsContent>
          <TabsContent value="tab2">
            <p className="text-sm text-muted-foreground pt-2">Opciones de seguridad.</p>
          </TabsContent>
        </Tabs>
      )

    case "Textarea":
      return (
        <div className="flex flex-col gap-3 max-w-sm">
          {group.items.map((item) => (
            <Textarea
              key={item.label}
              placeholder={item.props.placeholder as string}
              disabled={item.props.disabled as boolean}
              rows={3}
            />
          ))}
        </div>
      )

    case "Toggle":
      return (
        <div className="flex gap-3">
          {group.items.map((item) => (
            <Toggle key={item.label} variant={item.props.variant as "default" | "outline"}>
              <Bold className="h-4 w-4" />
              {item.label}
            </Toggle>
          ))}
        </div>
      )

    case "ToggleGroup":
      return (
        <ToggleGroup type="single" defaultValue="center">
          <ToggleGroupItem value="left"><AlignLeft className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="center"><AlignCenter className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="right"><AlignRight className="h-4 w-4" /></ToggleGroupItem>
        </ToggleGroup>
      )

    case "Tooltip":
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover aquí</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Texto explicativo</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

    // ── Custom ──
    case "StatusBadge":
      return (
        <div className="flex flex-wrap gap-3">
          {group.items.map((item) => (
            <StatusBadge
              key={item.label}
              status={item.props.status as "success" | "warning" | "error" | "info" | "neutral"}
              label={item.props.label as string}
            />
          ))}
        </div>
      )

    case "MetricCard":
      return (
        <div className="flex flex-wrap gap-4">
          {group.items.map((item) => (
            <MetricCard
              key={item.label}
              title="Usuarios totales"
              value={1284}
              change={12.5}
              trend={item.props.trend as "up" | "down" | "neutral"}
              icon={Users}
            />
          ))}
        </div>
      )

    case "PageHeader":
      return (
        <PageHeader
          title="Usuarios"
          description="Gestiona los usuarios de la plataforma"
        />
      )

    case "ConfirmDialog":
      return <ConfirmDialogPreview />

    default:
      return (
        <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border">
          <p className="text-sm text-muted-foreground">Preview de {name}</p>
        </div>
      )
  }
}

// ── Sub-previews que necesitan estado local ──────────────────

function CalendarPreview() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  return <Calendar mode="single" selected={date} onSelect={setDate} />
}

function CollapsiblePreview() {
  const [open, setOpen] = React.useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-64">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2">
          {open ? "▾" : "▸"} Ver detalles
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 py-2 text-sm text-muted-foreground">
        Contenido expandido del collapsible.
      </CollapsibleContent>
    </Collapsible>
  )
}

function ConfirmDialogPreview() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Abrir ConfirmDialog
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Eliminar usuario?"
        description="Esta acción no se puede deshacer. El usuario será eliminado permanentemente."
        variant="destructive"
        confirmLabel="Eliminar"
        onConfirm={async () => setOpen(false)}
      />
    </>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/components-explorer/component-preview.tsx
git commit -m "feat: add ComponentPreview with real renders for all components"
```

---

## Task 6: ComponentDetail

**Files:**
- Create: `components/dashboard/components-explorer/component-detail.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/dashboard/components-explorer/component-detail.tsx
"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { type ComponentEntry } from "@/app/dashboard/components/component-registry"
import { ComponentPreview } from "./component-preview"
import { CopyButton } from "./copy-button"

interface ComponentDetailProps {
  component: ComponentEntry
}

export function ComponentDetail({ component }: ComponentDetailProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{component.name}</h1>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-medium",
              component.origin === "shadcn"
                ? "bg-blue-500/10 text-blue-400"
                : "bg-purple-500/10 text-purple-400"
            )}
          >
            {component.origin === "shadcn" ? "shadcn/ui" : "Custom"}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{component.description}</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {component.path}
          </code>
          <CopyButton text={`import { ${component.name} } from "${component.path}"`} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="preview" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="h-auto rounded-none border-b border-border bg-transparent px-6 justify-start gap-0 p-0">
          <TabsTrigger
            value="preview"
            className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Preview
          </TabsTrigger>
          <TabsTrigger
            value="props"
            className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Props
          </TabsTrigger>
          <TabsTrigger
            value="code"
            className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Código
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="flex-1 overflow-y-auto p-6 mt-0">
          <ComponentPreview
            name={component.name}
            variantGroups={component.variantGroups}
          />
        </TabsContent>

        {/* Props Tab */}
        <TabsContent value="props" className="flex-1 overflow-y-auto p-6 mt-0">
          {component.props.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este componente no tiene props propias. Acepta todas las props nativas de su elemento HTML subyacente.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Prop</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Default</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Requerido</th>
                  </tr>
                </thead>
                <tbody>
                  {component.props.map((prop, i) => (
                    <tr
                      key={prop.name}
                      className={cn(
                        "border-b border-border last:border-0",
                        i % 2 === 0 ? "bg-background" : "bg-muted/20"
                      )}
                    >
                      <td className="px-4 py-3 align-top">
                        <code className="font-mono text-xs text-blue-400">{prop.name}</code>
                        {prop.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{prop.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <PropType type={prop.type} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        {prop.default ? (
                          <code className="font-mono text-xs text-muted-foreground">{prop.default}</code>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {prop.required ? (
                          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">Sí</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Code Tab */}
        <TabsContent value="code" className="flex-1 overflow-y-auto p-6 mt-0">
          <div className="relative rounded-lg overflow-hidden border border-border">
            <div className="flex items-center justify-between bg-[#161b22] px-4 py-2 border-b border-[#30363d]">
              <span className="text-xs text-[#8b949e] font-mono">tsx</span>
              <CopyButton text={component.codeSnippet} />
            </div>
            <pre className="overflow-x-auto bg-[#0d1117] p-4 text-sm">
              <code className="font-mono text-[#e6edf3] leading-relaxed whitespace-pre">
                <SyntaxHighlight code={component.codeSnippet} />
              </code>
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Coloreado de tipos ──────────────────────────────────────

function PropType({ type }: { type: string }) {
  if (type === "boolean") {
    return <code className="font-mono text-xs text-orange-400">{type}</code>
  }
  if (type === "number") {
    return <code className="font-mono text-xs text-yellow-400">{type}</code>
  }
  if (type.startsWith('"') || type.includes('" | "')) {
    return <code className="font-mono text-xs text-purple-400 break-all">{type}</code>
  }
  if (type.includes("=>") || type.startsWith("(")) {
    return <code className="font-mono text-xs text-emerald-400 break-all">{type}</code>
  }
  return <code className="font-mono text-xs text-sky-400 break-all">{type}</code>
}

// ── Syntax highlighting básico (sin dependencias) ───────────

function SyntaxHighlight({ code }: { code: string }) {
  // Colorea: imports, JSX tags, strings, props JSX
  const lines = code.split("\n")
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          <HighlightLine line={line} />
          {i < lines.length - 1 && "\n"}
        </span>
      ))}
    </>
  )
}

function HighlightLine({ line }: { line: string }) {
  const escaped = line
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  // import / export statements
  if (line.trimStart().startsWith("import") || line.trimStart().startsWith("export")) {
    const html = escaped
      .replace(/\b(import|export|from|type)\b/g, '<span class="text-[#ff7b72]">$1</span>')
      .replace(/"([^"]*)"/g, '"<span class="text-[#a5d6ff]">$1</span>"')
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }

  // Lines with JSX tags
  if (escaped.includes("&lt;")) {
    const html = escaped
      .replace(/&lt;(\/?[A-Z][A-Za-z.]*)/g, '&lt;<span class="text-[#7ee787]">$1</span>')
      .replace(/\b([a-zA-Z]+)(?==\{|=")/g, '<span class="text-[#79c0ff]">$1</span>')
      .replace(/"([^"]*)"/g, '"<span class="text-[#a5d6ff]">$1</span>"')
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }

  // Comment lines
  if (line.trimStart().startsWith("//")) {
    return <span className="text-[#8b949e]">{line}</span>
  }

  // Lines with string literals
  if (line.includes('"') || line.includes("'")) {
    const html = escaped.replace(/"([^"]*)"/g, '"<span class="text-[#a5d6ff]">$1</span>"')
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }

  return <span>{line}</span>
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/components-explorer/component-detail.tsx
git commit -m "feat: add ComponentDetail with Preview/Props/Code tabs"
```

---

## Task 7: Barrel exports + page.tsx

**Files:**
- Create: `components/dashboard/components-explorer/index.ts`
- Create: `app/dashboard/components/page.tsx`

- [ ] **Step 1: Crear el barrel de exports**

```typescript
// components/dashboard/components-explorer/index.ts
export { ComponentsSidebar } from "./components-sidebar"
export { ComponentDetail } from "./component-detail"
export { ComponentPreview } from "./component-preview"
export { CopyButton } from "./copy-button"
```

- [ ] **Step 2: Crear la página**

```tsx
// app/dashboard/components/page.tsx
"use client"

import * as React from "react"
import { COMPONENTS } from "./component-registry"
import { ComponentsSidebar } from "@/components/dashboard/components-explorer/components-sidebar"
import { ComponentDetail } from "@/components/dashboard/components-explorer/component-detail"

export default function ComponentsPage() {
  const [selected, setSelected] = React.useState(COMPONENTS[0].name)

  const component = COMPONENTS.find((c) => c.name === selected) ?? COMPONENTS[0]

  return (
    <div className="flex h-full overflow-hidden">
      <ComponentsSidebar selected={selected} onSelect={setSelected} />
      <ComponentDetail component={component} />
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
bun run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/components-explorer/index.ts app/dashboard/components/page.tsx
git commit -m "feat: add components explorer page and barrel exports"
```

---

## Task 8: Navegación + exports del dashboard

**Files:**
- Modify: `components/dashboard/sidebar.tsx`
- Modify: `components/dashboard/index.ts`

- [ ] **Step 1: Añadir el icono Blocks al import en sidebar.tsx**

En `components/dashboard/sidebar.tsx`, cambiar la línea de imports de lucide-react:

```typescript
// Antes:
import {
  Home,
  Users,
  ChevronUp,
  User,
  LogOut,
  Menu,
  type LucideIcon,
} from "lucide-react";

// Después:
import {
  Home,
  Users,
  ChevronUp,
  User,
  LogOut,
  Menu,
  Blocks,
  type LucideIcon,
} from "lucide-react";
```

- [ ] **Step 2: Añadir el link de Components a defaultNavigation**

En `components/dashboard/sidebar.tsx`, cambiar `defaultNavigation`:

```typescript
// Antes:
const defaultNavigation: NavSection[] = [
  {
    title: "Menu",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: Home },
      { title: "Users", href: "/dashboard/users", icon: Users },
    ],
  },
  {
    title: "Account",
    items: [
      { title: "Profile", href: "/dashboard/profile", icon: User },
    ],
  },
];

// Después:
const defaultNavigation: NavSection[] = [
  {
    title: "Menu",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: Home },
      { title: "Users", href: "/dashboard/users", icon: Users },
      { title: "Components", href: "/dashboard/components", icon: Blocks },
    ],
  },
  {
    title: "Account",
    items: [
      { title: "Profile", href: "/dashboard/profile", icon: User },
    ],
  },
];
```

- [ ] **Step 3: Exportar los nuevos componentes del explorer en dashboard index.ts**

Añadir al final de `components/dashboard/index.ts`:

```typescript
// Components Explorer
export {
  ComponentsSidebar,
  ComponentDetail,
  ComponentPreview,
  CopyButton,
} from "./components-explorer"
```

- [ ] **Step 4: Verificar TypeScript y lint**

```bash
bun run typecheck && bun run lint
```
Esperado: 0 errores, 0 warnings

- [ ] **Step 5: Commit final**

```bash
git add components/dashboard/sidebar.tsx components/dashboard/index.ts
git commit -m "feat: add Components link to dashboard navigation and export explorer components"
```

---

## Task 9: Verificación visual

- [ ] **Step 1: Correr el servidor de desarrollo**

```bash
bun dev
```

- [ ] **Step 2: Verificar estos puntos en el navegador**

1. Navega a `http://localhost:3000/dashboard/components`
2. El sidebar muestra el link "Components" con icono de bloques
3. La página abre con el sidebar interno mostrando "SHADCN/UI (46)" y "CUSTOM (8)"
4. El primer componente (Accordion) está seleccionado y se ve el panel de detalle
5. La búsqueda filtra correctamente
6. Tab "Preview" muestra renders reales del Button con todas las variantes
7. Tab "Props" muestra la tabla con colores en los tipos
8. Tab "Código" muestra el snippet con botón "Copiar"
9. El botón Copiar funciona (pega el snippet en el portapapeles)
10. Switching entre componentes actualiza todo el panel
11. Funciona en modo oscuro y claro

- [ ] **Step 3: Si hay errores de TypeScript en runtime, corregir y commit**

```bash
git add -A
git commit -m "fix: resolve runtime issues in components explorer"
```
