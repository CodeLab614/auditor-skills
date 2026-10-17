# Manual setup

This guide installs and configures RapidAuth without running `bun run init:setup`. Follow the steps in order.

## 1. Prepare the requirements

- Install [Bun](https://bun.sh/).
- If you use Node.js directly for the Next.js runtime, use version 20.9 or newer.
- Have access to a PostgreSQL database, such as Neon or another PostgreSQL provider.
- Create a [Resend](https://resend.com/) account for email delivery.
- For production builds, create a free Cloudflare account and real Turnstile keys. See [Cloudflare Turnstile](02-turnstile.md).
- OAuth credentials are optional. Create Google and/or GitHub OAuth applications only if you want social sign-in.

Clone the project and enter its directory:

```sh
git clone https://github.com/yourusername/rapidauth-better-auth.git
cd rapidauth-better-auth
```

## 2. Install dependencies

```sh
bun install
```

The `postinstall` script automatically runs `prisma generate`. You do not need to run it separately after a normal `bun install`.

## 3. Create and fill `.env`

Copy the example file, then edit `.env`:

```sh
cp .env.example .env
```

Use the [environment variable reference](01-environment-variables.md) to fill in the database, Better Auth, email, and other values. Generate a unique `BETTER_AUTH_SECRET` with either command:

```sh
openssl rand -hex 32
```

```sh
node -p "require('node:crypto').randomBytes(32).toString('hex')"
```

Paste the generated 64-character hexadecimal value into `.env`. Set `BETTER_AUTH_URL` to `http://localhost:3000` for local development. Set it to the public base URL in each deployed environment.

## 4. Configure and check email

Set `RESEND_API_KEY` and `FROM_EMAIL`. For production, verify the sender domain in Resend and use an address on that domain. You can make a minimal API check with a verified sender and recipient:

```sh
export RESEND_API_KEY="re_replace_with_your_resend_key"

curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"RapidAuth <noreply@example.com>","to":["you@example.com"],"subject":"RapidAuth email test","html":"<p>Email delivery works.</p>"}'
```

Replace the example sender and recipient with addresses you control. A successful response includes an email ID; also check that the message arrives.

## 5. Configure optional OAuth

For each provider you want to enable, set its client ID and secret in `.env` and set the corresponding `NEXT_PUBLIC_*_ENABLED` value to `true`. Set it to `false` when the provider is disabled. Add these callback URLs to the OAuth application:

- Google: `<BETTER_AUTH_URL>/api/auth/callback/google`
- GitHub: `<BETTER_AUTH_URL>/api/auth/callback/github`

For local development, for example, the Google callback is `http://localhost:3000/api/auth/callback/google`.

## 6. Configure Turnstile

For `next dev`, Turnstile may be left empty or configured with Cloudflare test keys. Every `next build` requires both real keys at build time, even for staging, previews, or CI. Follow the [Turnstile guide](02-turnstile.md) to create a widget, set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`, and authorize the hostnames where the app will be served.

## 7. Push the schema and seed the admin

With `DATABASE_URL` set in `.env`, run:

```sh
bun run db:push
bun run db:seed
```

The seed creates the first admin account. `SEED_ADMIN_EMAIL` defaults to `admin@admin.com`. You can set `SEED_ADMIN_PASSWORD` to a password of at least 8 characters before seeding. If it is unset, the seed generates a password and prints it once; save it because the seed will not show it again. If the admin already exists, the seed skips creating another account.

## 8. Optionally select an auth theme

```sh
bun run theme:select
```

The theme selector is optional. Some premium themes require a GitHub personal access token. The selector prompts for it and saves it to `.env.local`; it does not need to be set for the free/default theme.

## 9. Start the app and verify the admin login

```sh
bun dev
```

Open [http://localhost:3000](http://localhost:3000), go to the sign-in page, and log in with `SEED_ADMIN_EMAIL` and the password printed or configured during seeding. Confirm that the admin dashboard loads.

## Before deploying

- Set a unique `BETTER_AUTH_SECRET`, the correct public `BETTER_AUTH_URL`, and a production `DATABASE_URL` in the target environment.
- Set `RESEND_API_KEY` and a verified `FROM_EMAIL` sender.
- Provide real Turnstile keys to every build, including staging, previews, and CI. For Docker, mount `TURNSTILE_SECRET_KEY` with BuildKit during the build and provide it again at runtime; pass the public site key as a build argument. See [Cloudflare Turnstile](02-turnstile.md).
- Add every serving hostname, or a parent hostname that covers its subdomains, to the Turnstile widget.
- Set OAuth callback URLs to the deployed `BETTER_AUTH_URL` if social sign-in is enabled.
- Use a deliberate admin email and secure seed password, or save the one-time generated password and change it after the first login.
- Keep `.env`, `.env.local`, and all secret values out of version control and image build arguments.

---

← [Project docs](../README.md) · [English index](README.md) · [Next: Environment variables →](01-environment-variables.md)
