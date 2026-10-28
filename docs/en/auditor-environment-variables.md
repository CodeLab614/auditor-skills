# Auditor environment variables

This page documents environment variables used by the skills auditor components.

## `DATABASE_URL`

- **Purpose:** PostgreSQL connection string for the primary database.
- **Used by:** Both the web app and the worker.
- **Required:** Yes.
- **Example:** `postgresql://rapidauth:rapidauth@127.0.0.1:5433/rapidauth?sslmode=disable`
- **Secret:** Yes.

## `GITHUB_TOKEN`

- **Purpose:** Authenticates requests to the GitHub REST API (fetching repository trees, tarball downloads, and
  increasing rate limits).
- **Used by:** Both the web app and the worker.
- **Required:** No for local development. Required in AWS.
- **How to create:** In GitHub, open **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
  Create a token for public repositories with read-only access, then provide it as `GITHUB_TOKEN`. Do not grant write
  permissions.
- **Secret:** Yes. Keep it on the server and never expose it to the browser or commit it.

## `WORKER_POLL_SECONDS`

- **Purpose:** Number of seconds the worker waits between queue polling attempts when no jobs are available.
- **Used by:** The worker only.
- **Default:** `3`.
- **Required:** No.
- **Secret:** No.

## `WORKER_MAX_ATTEMPTS`

- **Purpose:** Maximum execution attempts allowed for a job before marking it failed with "Se agotaron los intentos".
- **Used by:** The worker only.
- **Default:** `3`.
- **Required:** No.
- **Secret:** No.

## `WORKER_TEST_DATABASE_URL`

- **Purpose:** Database connection string used exclusively by pytest to run worker integration tests
  (`@pytest.mark.db`).
- **Used by:** Tests only (never used in production).
- **Default:** None (database tests are skipped when not set).
- **Required:** No.
- **Secret:** Yes.
