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

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- PostgreSQL database ([Neon](https://neon.tech) recommended)
- [Resend](https://resend.com) account for emails
- OAuth credentials (optional)

### Installation

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
4. OAuth providers (optional)
5. Database migration
6. Admin user creation

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

## Turnstile (Optional)

Set both keys to protect registration, verification email resends, and password reset. If either key is omitted, Turnstile is disabled.

Cloudflare's test keys work on `localhost` and development domains:

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
```

- Always pass: site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.
- Always fail: site key `2x00000000000000000000AB`, secret `2x0000000000000000000000000000000AA`.
- Duplicate-token response: secret `3x0000000000000000000000000000000AA`.

Test keys are rejected in production. Create real keys in the Cloudflare dashboard for production.

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

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Docker

```dockerfile
FROM oven/bun:1 as base
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

**Jorge Trejo** - [@jotredev](https://github.com/jotredev)

---

Built with [Better Auth](https://better-auth.com), [Next.js](https://nextjs.org), and [shadcn/ui](https://ui.shadcn.com).
