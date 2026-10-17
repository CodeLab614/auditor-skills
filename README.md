# RapidAuth - Better Auth Boilerplate

A production-ready Next.js 16+ authentication boilerplate with Better Auth, designed for rapid application development.

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![Better Auth](https://img.shields.io/badge/Better_Auth-1.5.5-purple?style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-7.5.0-2D3748?style=flat-square&logo=prisma)

## Features

### Authentication
- Email/Password authentication with strong password validation
- OAuth integration (Google & GitHub)
- Email verification with Resend
- Two-Factor Authentication (TOTP) with backup codes
- Password recovery flow
- Session management with IP & User Agent tracking

### Dashboard
- Admin user management (CRUD)
- Activity logging & monitoring
- Profile management
- Active sessions management
- Role-based access control (admin, moderator, user)

### Developer Experience
- Interactive setup wizard (`bun run init:setup`)
- TypeScript strict mode
- ESLint with zero warnings policy
- Husky git hooks
- shadcn/ui components

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 20.9+
- PostgreSQL database ([Neon](https://neon.tech) recommended)
- A Docker engine with Compose v2 and Buildx (Docker Desktop, OrbStack, Colima, or Docker Engine; the Docker setup includes a local database and does not require Bun or PostgreSQL on your computer)
- [Resend](https://resend.com) account for emails
- OAuth credentials (optional)

### Recommended: Setup wizard

```bash
# Clone the repository
git clone https://github.com/yourusername/rapidauth-better-auth.git
cd rapidauth-better-auth

# Install dependencies
bun install

# Run the interactive setup wizard
bun run init:setup
```

The setup wizard will guide you through:
1. Database connection
2. Better Auth configuration
3. Email service setup
4. Cloudflare Turnstile
5. OAuth providers (optional)
6. Database setup and admin user creation
7. Optional auth theme selection

### Manual setup

To configure each step yourself, follow the [English manual setup guide](docs/en/00-manual-setup.md) or the [guía de setup manual en español](docs/es/00-manual-setup.md).

### Docker

To start the app and a local PostgreSQL database with Docker, follow the [English Docker guide](docs/en/03-docker.md) or the [guía de Docker en español](docs/es/03-docker.md).

Browse all guides from the [documentation index](docs/README.md).

### Admin Account

The setup seed prints a randomly generated admin password once. Save it and change it after your first login. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to customize the seed credentials; a configured password must be at least 8 characters. If the admin already exists, the seed keeps its current password. To reset it, run `bun run scripts/reset-password.ts [email]` (defaults to `admin@admin.com`); the new password is printed once.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16+ (App Router, Server Actions) |
| Language | TypeScript 5.x |
| Auth | Better Auth 1.5.5 |
| Database | PostgreSQL + Prisma 7.5.0 |
| UI | shadcn/ui + Tailwind CSS 4.x |
| Forms | React Hook Form + Zod |
| Email | Resend + React Email |
| Runtime | Bun |

## Project Structure

```
rapidauth-better-auth/
├── app/                    # Next.js App Router
│   ├── api/auth/           # Better Auth API routes
│   ├── auth/               # Authentication pages
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   ├── verify-email/
│   │   └── two-factor/
│   └── dashboard/          # Protected dashboard
│       ├── profile/
│       ├── activity/
│       └── users/          # Admin only
├── actions/                # Server Actions
│   ├── auth/               # Auth actions
│   ├── dashboard.ts
│   ├── profile.ts
│   ├── sessions.ts
│   ├── activity.ts
│   └── users.ts            # Admin CRUD
├── components/
│   ├── auth/               # Auth components
│   ├── dashboard/          # Dashboard components
│   └── ui/                 # shadcn/ui
├── lib/
│   ├── auth.ts             # Better Auth config
│   ├── prisma.ts           # Prisma client
│   └── email.ts            # Email functions
├── prisma/
│   └── schema.prisma       # Database schema
├── validations/            # Zod schemas
├── scripts/
│   ├── setup.ts            # Setup wizard
│   └── seed.ts             # Database seed
└── middleware.ts           # Route protection
```

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Better Auth
BETTER_AUTH_SECRET="auto-generated"
BETTER_AUTH_URL="http://localhost:3000"
# BETTER_AUTH_URL is required; without it every auth request fails with a clear error.

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
FROM_EMAIL="RapidAuth <noreply@yourdomain.com>"

# OAuth (Optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

## Turnstile (Required in production)

Turnstile protects registration, verification email resends, and password reset. `bun run init:setup` asks for the two keys and can use test keys for local development. Production builds require both real keys and fail if either is missing or a test key is used.

Setup guides: [English](docs/en/02-turnstile.md) · [Español](docs/es/02-turnstile.md).

Cloudflare's test keys work on `localhost` and development domains:

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
```

- Always pass: site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.
- Always fail: site key `2x00000000000000000000AB`, secret `2x0000000000000000000000000000000AA`.
- Duplicate-token response: secret `3x0000000000000000000000000000000AA`.

Test keys are only for local development. Create real keys in the Cloudflare dashboard for production; see the guides above.

## Available Scripts

```bash
# Development
bun dev                 # Start dev server (with lint & typecheck)
bun run build          # Production build
bun run start          # Start production server

# Code Quality
bun run lint           # ESLint (zero warnings)
bun run typecheck      # TypeScript check

# Database
bun run db:generate    # Generate Prisma Client
bun run db:push        # Push schema to database
bun run db:migrate     # Create migration
bun run db:studio      # Open Prisma Studio
bun run db:seed        # Seed database

# Setup
bun run init:setup     # Interactive setup wizard
```

## Database Schema

```prisma
model User {
  id               String    @id @default(cuid())
  name             String
  email            String    @unique
  emailVerified    Boolean   @default(false)
  image            String?
  role             String    @default("user")
  status           String    @default("active")
  twoFactorEnabled Boolean?  @default(false)

  sessions         Session[]
  accounts         Account[]
  twoFactors       TwoFactor[]
  activityLogs     ActivityLog[]
}

model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime
  token     String   @unique
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(...)
}

model Account {
  id         String  @id @default(cuid())
  accountId  String
  providerId String  // google, github, credential
  password   String? // For email/password
  userId     String
  user       User    @relation(...)
}

model TwoFactor {
  id          String @id @default(cuid())
  secret      String
  backupCodes String
  userId      String
  user        User   @relation(...)
}

model ActivityLog {
  id        String   @id @default(cuid())
  userId    String
  action    String   // login, logout, register, etc.
  details   String?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  user      User     @relation(...)
}
```

## Authentication Flow

### Email/Password
1. User registers with email/password
2. Verification email sent via Resend
3. User verifies email
4. User can log in

### OAuth
1. User clicks Google/GitHub button
2. Redirected to provider
3. Account linked/created automatically
4. User logged in

### Two-Factor Authentication
1. User enables 2FA in profile
2. QR code generated for authenticator app
3. Backup codes provided
4. On login, TOTP code required

## Route Protection

The middleware automatically protects routes:

| Route | Access |
|-------|--------|
| `/auth/*` | Public (redirects if logged in) |
| `/dashboard/*` | Authenticated users |
| `/dashboard/users` | Admin only |

## Server Actions

All mutations use Next.js Server Actions with consistent return types:

```typescript
type ActionResponse<T = void> = {
  response: 'success' | 'error';
  message: string;
  data?: T;
};
```

## Customization

### Adding OAuth Providers

Edit `lib/auth.ts`:

```typescript
socialProviders: {
  google: { ... },
  github: { ... },
  // Add more providers here
}
```

### Modifying Roles

Edit the User model and update:
- `prisma/schema.prisma`
- `validations/users.ts`
- `components/dashboard/users/`

### Email Templates

Edit templates in `emails/`:
- `verification-email.tsx`

## Deployment

### Before deploying

Set these required environment variables in the runtime environment of each deployment:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (real Cloudflare key)
- `TURNSTILE_SECRET_KEY` (real Cloudflare key)

OAuth credentials are optional. Additionally, every environment running `next build` (production, staging, previews, and CI) needs real Turnstile keys during compilation; test keys make the build fail. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is embedded during compilation, so changing it requires a new build. For Docker, pass the public site key as `ARG`/`--build-arg` and mount `TURNSTILE_SECRET_KEY` as a BuildKit secret during the build; also provide the secret to the running container.

This applies across hosting providers, including Vercel, Netlify, Railway, Render, Coolify, Docker on a VPS, and any CI pipeline that runs the build. For example, Vercel variables are configured under **Project Settings → Environment Variables**; CI should provide both as secrets to the build step.

Every hostname serving the app must be covered by the widget's **Hostnames**. Cloudflare does not support `*` wildcards, but adding a hostname covers its subdomains. For example, `example.com` covers `staging.example.com`; adding only `app.example.com` does not cover its parent or sibling subdomains. Add unrelated hostnames individually or use separate widgets per environment. See [Cloudflare's hostname management guide](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/).

### Example: Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Docker

Use the [Docker guide](docs/en/03-docker.md) for local development and production builds, or read the [guía en español](docs/es/03-docker.md). It covers BuildKit secrets and runtime environment variables.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License.

## Author

**Jorge Trejo** - [@jotredev](https://github.com/jotredev)

---

Built with [Better Auth](https://better-auth.com), [Next.js](https://nextjs.org), and [shadcn/ui](https://ui.shadcn.com).
