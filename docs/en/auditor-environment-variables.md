# Auditor environment variables

This page documents environment variables used only by the skills auditor.

## `GITHUB_TOKEN`

- **Purpose:** Authenticates the web app's requests to the GitHub REST API, increasing its request limit.
- **Used by:** The web app only. The analysis worker does not use this variable.
- **Required:** No for local development. Required in AWS.
- **How to create:** In GitHub, open **Settings → Developer settings → Personal access tokens → Fine-grained
  tokens**. Create a token for public repositories with read-only access, then provide it to the web app as
  `GITHUB_TOKEN`. Do not grant write permissions.
- **Secret:** Yes. Keep it on the server and never expose it to the browser or commit it.
