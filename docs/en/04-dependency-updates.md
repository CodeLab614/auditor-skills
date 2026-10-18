# Dependency updates

RapidAuth keeps every direct dependency at an exact version in `package.json`. This makes installs predictable and ensures a dependency changes only in a reviewed update. Bun uses `bunfig.toml` (`[install] exact = true`), and Dependabot uses `versioning-strategy: increase` so its pull requests keep exact specifiers. A pull request is accepted only when CI is green, including the end-to-end tests.

## Review a Dependabot pull request

For each proposed update:

1. Read the release notes and linked changes for the package and every package in the group. Look for breaking changes, removed or renamed APIs, migration steps, security fixes, supported runtime versions, and changes to peer dependencies.
2. Confirm the new version is stable, supported by this project, and compatible with the other changed packages. Check the exact versions in `package.json` and the resolved changes in `bun.lock`.
3. Review the CI results and the generated diff. Accept the pull request only when the change is understood, every required CI job is green (including E2E), and the checklist for its update stage is complete.
4. Close or defer it when it is a prerelease, violates a toolchain limit, needs a migration that is not included, breaks a check, or its behavior cannot be verified. Record the reason and revisit it in the relevant planned stage.

Dependabot groups minor and patch updates. A grouped pull request can be split when a package needs separate investigation.

## Large upgrades in stages

The October 2026 upgrade is the model: first minor and patch releases, then critical libraries such as Better Auth, then major releases, and finally shadcn components. Keep each stage isolated and finish its checklist before beginning the next one. For **every stage**, require all of these checks:

- [ ] CI is green, including lint, exact dependency versions, type checking, E2E, production build, dependency audit, theme synchronization, and Docker jobs.
- [ ] Sign in and sign out work with valid and invalid credentials.
- [ ] Password creation, change, and recovery work, including the verification steps used by those flows.
- [ ] Email verification and verification email resend work.
- [ ] Turnstile works on registration, email resend, and password recovery; invalid or missing tokens are rejected.
- [ ] Review the main pages visually against the previous version and inspect any changed areas.
- [ ] Build the production Docker image and run its health check or the project’s Docker smoke checks.

### Stage 1: minor and patch releases

Review Dependabot’s grouped updates and keep compatible minor and patch changes together. Split packages out when their release notes or CI results need individual investigation. Complete the full checklist above before accepting the stage.

### Stage 2: critical libraries such as Better Auth

Update one critical library at a time. Read its migration and security notes, verify the auth configuration and adapters, and exercise login, sessions, passwords, and email flows. Complete the full checklist above before accepting each library update.

**Stage 2 completed (October 18, 2026):** Better Auth is pinned to 1.7.10. Its coordinated runtime and adapter packages are also resolved to 1.7.10; `@better-auth/utils` remains at 0.5.0 because it follows an independent version line and has no 1.7.10 release. The 1.7 schema comparison required only the `verified`, `failedVerificationCount`, and `lockedUntil` fields on `twoFactor`; `account` remains unchanged from 1.6 and `rateLimit` retains `id`, `key`, `count`, and `lastRequest`. The TypeScript, ESLint, and Node.js limits below remain in force, and dependencies remain pinned to exact versions.

#### Update an existing installation to Better Auth 1.7

For **each environment** (development, staging, and production), run `bun run db:push` to add `verified`, `failedVerificationCount`, and `lockedUntil` to `twoFactor`, then run `bun run db:seed` to normalize legacy password accounts. Without this step, an admin created by an older seed cannot sign in with Better Auth 1.7. The seed is safe to repeat and does not delete data.

### Stage 3: major releases

Upgrade one major package or a tightly coupled package set at a time. Follow its migration guide, update project code and configuration, and check peer dependency requirements. Complete the full checklist above before accepting each major upgrade.

### Stage 4: shadcn components

Use the project's pinned shadcn CLI to update or add the affected components, for example `bunx shadcn add button`. Review the generated diff against local customizations and restore or merge those customizations deliberately; do not replace customized components blindly. Then run `bun run theme:sync-classic` to copy the shared UI changes into the Classic theme, inspect the result, and run `bun run theme:sync-classic --check`. Complete the full checklist above before accepting the component updates.

## Toolchain limits

- **TypeScript:** keep it below 6.1 while the project’s TypeScript ESLint tooling does not support 6.1 or newer. Check the installed tooling’s peer dependency range before selecting an update.
- **ESLint:** stay on version 9. The `eslint-plugin-react` version included by `eslint-config-next` currently supports ESLint 9, so review that compatibility before moving to a newer major.
- **Node.js:** use an active LTS release. Dependabot major updates for Node are ignored so the project can move deliberately to the next LTS.

To move Node to the next LTS, update the Node base image in every stage of `Dockerfile` and in `docker/Dockerfile.dev`, update `@types/node` to the matching major, and check any Node version declarations used by CI or project configuration. Keep `packageManager` in `package.json` aligned if the Bun version is also being changed; it identifies Bun in this project, not Node. CI reads the Bun version from `package.json`. Rebuild and validate both development and production Docker images and complete the full checklist above. Update the Dependabot Node exclusions only if the project intentionally changes its manual LTS upgrade policy.

## Add or update a dependency

Add a dependency with its complete exact version, such as `bun add package@1.2.3`, or omit the version with `bun add package`. Do not use incomplete versions such as `bun add package@7`, which Bun stores as a range. `bunfig.toml` makes exact installs the default and `bun run deps:check` verifies every direct dependency. For a deliberate upgrade, change to the selected exact version, run `bun install`, and review that `bun.lock` changes only as expected. Follow the applicable stage and full checklist above. Keep `bun install --frozen-lockfile` passing so CI installs the committed resolution without changing it.

## Run end-to-end tests locally

Start the dedicated PostgreSQL test container on port `55432`, then run the E2E suite:

```bash
bun run test:e2e:db
bun run test:e2e
```

The test setup refuses non-local database URLs, requires `sslmode=disable`, and uses a separate port from the development database. It starts `next dev` with test Turnstile keys and a filesystem email outbox. E2E tests run in CI on every pull request without repository secrets, including Dependabot pull requests.
