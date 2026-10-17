# Dependency updates

RapidAuth keeps every direct dependency at an exact version in `package.json`. This makes installs predictable and ensures a dependency changes only in a reviewed update. Bun uses `bunfig.toml` (`[install] exact = true`), and Dependabot uses `versioning-strategy: increase` so its pull requests keep exact specifiers. Do not merge an update until the required CI checks pass.

## Review a Dependabot pull request

For each proposed update:

1. Read the release notes and linked changes for the package and every package in the group. Look for breaking changes, removed or renamed APIs, migration steps, security fixes, supported runtime versions, and changes to peer dependencies.
2. Confirm the new version is stable, supported by this project, and compatible with the other changed packages. Check the exact versions in `package.json` and the resolved changes in `bun.lock`.
3. Review the CI results and the generated diff. Accept the pull request only when the change is understood, the required checks pass, and the checklist for its update stage is complete.
4. Close or defer it when it is a prerelease, violates a toolchain limit, needs a migration that is not included, breaks a check, or its behavior cannot be verified. Record the reason and revisit it in the relevant planned stage.

Dependabot groups minor and patch updates. A grouped pull request can be split when a package needs separate investigation.

## Large upgrades in stages

The October 2026 upgrade is the model: first minor and patch releases, then critical libraries such as Better Auth, then major releases, and finally shadcn components. Keep each stage isolated and finish its checklist before beginning the next one. For **every stage**, require all of these checks:

- [ ] CI is green, including lint, type checking, production build, dependency audit, theme synchronization, and Docker jobs.
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

Add a dependency with an exact version, such as `bun add package@1.2.3`; `bunfig.toml` makes exact installs the default. For a deliberate upgrade, change to the selected exact version, run `bun install`, and review that `bun.lock` changes only as expected. Follow the applicable stage and full checklist above. Keep `bun install --frozen-lockfile` passing so CI installs the committed resolution without changing it.
