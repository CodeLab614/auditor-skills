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

## CRITICAL: Auto-Invoke Skills

**Skills MUST be invoked automatically based on context. DO NOT wait for user to ask.**

### Automatic Skill Triggers

| When you detect... | Auto-invoke skill |
|-------------------|-------------------|
| Creating/editing files in `actions/`, using `prisma.`, data fetching, mutations | `server-actions-patterns` |
| Database queries, schema changes, migrations | `prisma-expert` |
| Forms, `useActionState`, `formData`, validation | `react-hook-form-zod` |
| `auth.api.`, Better Auth, sessions, login, register, 2FA | `better-auth-best-practices` |
| Creating UI components, pages, layouts | `shadcn` + `frontend-design` |
| `<Button>`, `<Input>`, `<Card>`, any shadcn component | `shadcn` |
| Tailwind classes, styling, responsive design | `tailwind-design-system` |
| Colors, spacing, typography, UX decisions | `ui-ux-pro-max` |
| Neon, DATABASE_URL, connection pooling | `neon-postgres` |
| Stripe, payments, subscriptions, checkout | `stripe-best-practices` |
| Sending emails, Resend | `resend` |
| Animations, transitions, GSAP | `gsap` |
| Performance issues, optimization, React patterns | `vercel-react-best-practices` |

### Examples

```
User: "Create a page to list products"
→ Auto-invoke: `server-actions-patterns` + `shadcn`

User: "Add a contact form"
→ Auto-invoke: `server-actions-patterns` + `react-hook-form-zod` + `shadcn`

User: "Fix the login"
→ Auto-invoke: `better-auth-best-practices` + `server-actions-patterns`

User: "Query users from database"
→ Auto-invoke: `server-actions-patterns` + `prisma-expert`
```

---

## Architecture Rules

### Server vs Client Components

1. **Pages (`app/**/page.tsx`)**: Always Server Components - call server actions here
2. **Layouts (`app/**/layout.tsx`)**: Server Components when possible
3. **UI Components**: Client Components only when needed (state, effects, events)
4. **Never pass functions as props** from Server to Client Components
5. **Icons**: Import Lucide icons inside Client Components, not in Server Components

### Data Flow Pattern
```
Server Component (page.tsx)
    ↓ calls server action
    ↓ passes serializable props
Client Component
    ↓ handles interactivity
    ↓ uses router.refresh() after mutations
```

---

## Server Actions

> **Always invoke `server-actions-patterns` skill when working with server actions.**

The skill contains all rules for:
- File location (`actions/` folder)
- Try-catch patterns
- Return types (`{ success, data }` or `{ success, error }`)
- Form actions with `useActionState`
- Integration with pages and components

---

## Component Structure

```
components/
├── dashboard/
│   ├── index.ts              # Barrel exports - ALWAYS export new components here
│   ├── page-header.tsx       # Page titles
│   ├── data-table.tsx        # Tables
│   ├── confirm-dialog.tsx    # Confirmations
│   └── *-content.tsx         # Page content components
├── auth/
│   └── *-form.tsx            # Auth forms
└── ui/                       # shadcn components
```

---

## Dashboard UI Patterns

> **Always invoke `shadcn` skill for UI components.**

- **Page titles**: Use `PageHeader` component
- **Tables**: Use `DataTable` component
- **Details view**: Use `Sheet` (slides from right)
- **Confirmations**: Use `ConfirmDialog`

---

## Code Style

### Imports Order
```typescript
// 1. React/Next
// 2. Dashboard components
// 3. UI components (shadcn)
// 4. Actions
// 5. Utils/Types
// 6. Icons (only in Client Components)
```

### Naming Conventions
- **Pages**: `page.tsx`
- **Client Components**: `*-content.tsx`, `*-form.tsx`
- **Server Actions**: verb + noun (`getUsers`, `deleteUser`)

---

## Commands

```bash
bun dev                        # Development
bun run build                  # Build
bun run typecheck              # Type check
bunx shadcn@latest add [name]  # Add shadcn component
bunx prisma generate           # Generate Prisma client
bunx prisma db push            # Push schema to database
```

---

## Remember

1. **Auto-invoke skills** - Detect context, invoke skills automatically
2. **Server by Default** - Pages are Server Components
3. **Client When Needed** - Only use "use client" for interactivity
4. **shadcn Always** - Use shadcn components, don't reinvent
5. **Actions in `actions/`** - Never in `lib/` or page files
6. **Export from index** - Always add new components to barrel exports
7. **router.refresh()** - Reload server data after mutations
