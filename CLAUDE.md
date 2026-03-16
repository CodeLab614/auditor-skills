# CLAUDE.md - Project Rules & Guidelines

## Project Overview
This is a **RapidAuth Boilerplate** - a Next.js 16+ application with Better Auth, designed for rapid application development with user management.

## Tech Stack
- **Framework**: Next.js 16+ (App Router)
- **UI**: shadcn/ui + Tailwind CSS v4
- **Auth**: Better Auth
- **Database**: Neon Postgres + Prisma
- **Forms**: React Hook Form + Zod
- **Payments**: Stripe
- **Email**: Resend

---

## MANDATORY: Always Use Skills

**BEFORE writing any code, you MUST invoke the relevant skill(s).**

### When to Use Each Skill:

| Task | Skill to Invoke |
|------|-----------------|
| UI components, pages, layouts | `frontend-design` |
| shadcn components | `shadcn` |
| Tailwind styling, design tokens | `tailwind-design-system` |
| UI/UX patterns, color palettes | `ui-ux-pro-max` |
| Authentication setup | `better-auth-best-practices` |
| Database schema, queries | `prisma-expert` |
| Database connection, Neon features | `neon-postgres` |
| Form validation | `react-hook-form-zod` |
| Payment integration | `stripe-best-practices` |
| Email sending | `resend` |
| Animations | `gsap` |
| React/Next.js performance | `vercel-react-best-practices` |

### Example Workflow:
```
User: "Create a login form"

1. Invoke `shadcn` skill for form components
2. Invoke `react-hook-form-zod` for form handling
3. Invoke `better-auth-best-practices` for auth integration
4. Then implement the feature
```

---

## Architecture Rules

### Server vs Client Components

#### Pages are ALWAYS Server Components
```typescript
// app/dashboard/page.tsx - Server Component (NO "use client")
import { ClientComponent } from "@/components/dashboard";

async function getData() {
  // Fetch from database here
  return { users: [...] };
}

export default async function Page() {
  const data = await getData();
  return <ClientComponent data={data} />;
}
```

#### Interactive Components are Client Components
```typescript
// components/dashboard/client-component.tsx
"use client";

import { useState } from "react";

export function ClientComponent({ data }) {
  const [state, setState] = useState();
  // Interactive logic here
}
```

### Key Rules:
1. **Pages (`app/**/page.tsx`)**: Always Server Components - fetch data here
2. **Layouts (`app/**/layout.tsx`)**: Server Components when possible
3. **UI Components**: Client Components only when needed (state, effects, events)
4. **Never pass functions as props** from Server to Client Components
5. **Icons**: Import Lucide icons inside Client Components, not in Server Components

### Data Flow Pattern:
```
Server Component (page.tsx)
    ↓ fetches data
    ↓ passes serializable props (objects, arrays, strings, numbers)
Client Component
    ↓ handles interactivity
    ↓ manages local state
```

---

## Component Structure

### Dashboard Components Location
```
components/
├── dashboard/
│   ├── index.ts              # Barrel exports
│   ├── dashboard-shell.tsx   # Client - main layout wrapper
│   ├── dashboard-content.tsx # Client - dashboard page content
│   ├── users-content.tsx     # Client - users page content
│   ├── profile-content.tsx   # Client - profile page content
│   ├── sidebar.tsx           # Client - navigation
│   ├── header.tsx            # Client - top bar
│   ├── metric-card.tsx       # Client - KPI cards
│   ├── data-table.tsx        # Client - tables
│   └── ...
└── ui/                       # shadcn components
```

### Creating New Pages

1. Create the page as Server Component:
```typescript
// app/dashboard/new-page/page.tsx
import { NewPageContent } from "@/components/dashboard";

async function getData() {
  // Fetch data
}

export default async function NewPage() {
  const data = await getData();
  return <NewPageContent data={data} />;
}
```

2. Create the Client Component:
```typescript
// components/dashboard/new-page-content.tsx
"use client";

export function NewPageContent({ data }) {
  // Interactive UI
}
```

3. Export from index:
```typescript
// components/dashboard/index.ts
export { NewPageContent } from "./new-page-content";
```

---

## shadcn/ui Usage

### Always use shadcn components
- Never create custom components when shadcn has one
- Customize via CSS variables in `globals.css`
- Extend components in `components/ui/` if needed

### Installing Components
```bash
bunx shadcn@latest add [component-name]
```

### Theme (AETHER Dark)
The project uses a custom dark theme defined in `app/globals.css`:
- Background: `#0c0c0b`
- Surface: `#111110`
- Border: `#1a1a19`
- Text: `#dcdacb`
- Muted: `#8a8981`

---

## Code Style

### Imports Order
```typescript
// 1. React/Next
import * as React from "react";
import { useRouter } from "next/navigation";

// 2. Components
import { Button } from "@/components/ui/button";
import { DashboardContent } from "@/components/dashboard";

// 3. Utils/Types
import { cn } from "@/lib/utils";
import type { User } from "@/types";

// 4. Icons (only in Client Components)
import { Users, Settings } from "lucide-react";
```

### Naming Conventions
- **Pages**: `page.tsx` (Next.js convention)
- **Client Components**: `*-content.tsx`, `*-form.tsx`, `*-shell.tsx`
- **Types**: PascalCase, suffix with `Props` for component props

---

## Commands

```bash
# Development
bun dev

# Build
bun run build

# Add shadcn component
bunx shadcn@latest add [component]

# Database
bunx prisma generate
bunx prisma db push
bunx prisma studio
```

---

## Remember

1. **Skills First**: Always invoke relevant skills before implementing
2. **Server by Default**: Pages are Server Components
3. **Client When Needed**: Only use "use client" for interactivity
4. **shadcn Always**: Use shadcn components, don't reinvent
5. **Data Down**: Fetch in Server, pass to Client as props
