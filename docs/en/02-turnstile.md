# Cloudflare Turnstile

RapidAuth requires real Cloudflare Turnstile keys in production. Development can use the test keys below. The production build fails if either key is missing or a test key is configured.

## Create a widget

1. Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com/). You do not need to move your domain to Cloudflare.
2. Find **Turnstile** in the dashboard menu, or press **Cmd + K** on Mac / **Ctrl + K** on Windows and search for Turnstile.
3. Select **Add widget** and enter a name, such as `RapidAuth`.
4. Under **Hostnames**, add `localhost` and the hostnames from which the app will be served, without `https://` (for example, `example.com` or `app.example.com`). Cloudflare does not accept `*` wildcards. Adding a hostname also authorizes its subdomains: adding `example.com` covers `app.example.com` and `staging.example.com`; adding `app.example.com` does not cover `example.com` or sibling hostnames. Add each unrelated hostname, or create a separate widget for each environment. See [Cloudflare's hostname management guide](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/).
5. Set **Widget Mode** to **Managed** and **Pre-clearance** to **No**.
6. Create the widget and copy its **Site Key** and **Secret Key**.

Set the keys in your environment:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-site-key"
TURNSTILE_SECRET_KEY="your-secret-key"
```

The site key is public and is embedded into the client bundle at compile time. The secret key must stay server-side.

## Production deployment

Every environment that runs `next build` needs both real keys available while compiling: production, staging, preview deployments, and CI pipelines. The build fails if either key is missing or if either is a Cloudflare test key. Configure the keys in your hosting provider or CI secret store before the build starts.

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` is embedded in the client bundle during compilation. Changing it requires a new build. This applies to hosting platforms such as Vercel, Netlify, Railway, Render, and Coolify, as well as to Docker images built for a VPS.

For Docker, pass the public key as a build argument and mount `TURNSTILE_SECRET_KEY` as a BuildKit secret. The running container also needs the secret at runtime. Follow the [Docker guide](03-docker.md#production-with-docker) for the complete Dockerfile and commands. See [Docker's Build secrets documentation](https://docs.docker.com/build/building/secrets/).

For example, in Vercel add both variables under **Project Settings → Environment Variables** for every environment that builds the app, including Preview when used. In CI, provide the public key as a build variable and the secret key as a protected CI secret to the build step.

The `bun run init:setup` wizard also asks for Turnstile keys and can save real or local test keys in `.env`.

## Cloudflare test keys

Test keys are for local development only. Do not use them in production; production builds reject them.

| Site key | Secret key | Result |
| --- | --- | --- |
| `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` | Always approves |
| `2x00000000000000000000AB` | `2x0000000000000000000000000000000AA` | Always rejects |
| `1x00000000000000000000AA` | `3x0000000000000000000000000000000AA` | Always rejects with `timeout-or-duplicate` |

Other Cloudflare test site keys: `1x00000000000000000000BB`, `2x00000000000000000000BB`, and `3x00000000000000000000FF`. Cloudflare publishes the full [test key reference](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

## Check that it works

Start the app locally, open [`/auth/forgot-password`](http://localhost:3000/auth/forgot-password), and confirm the Turnstile widget shows a checkmark after verification.

## Troubleshooting

### “Invalid domain”

Make sure the hostname is listed on the widget exactly as the browser uses it. Enter only the hostname, without `https://`, a path, or a trailing slash. Add `localhost` for local development.

### “Captcha verification failed”

Confirm that the Site Key and Secret Key belong to the same widget and that the hostname is allowed. Test keys only work with their documented test combinations. Also check that the server action is receiving the widget token.

### The app will not start

In production, the app stops if only one Turnstile key is configured or if test keys are used. Set both real keys in the hosting environment and restart or redeploy.

### The production build fails because of Turnstile

Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in the hosting provider before building. Replace test keys with real widget keys, then start a fresh deployment. See [Create a widget](#create-a-widget) above.

---

← [Environment variables](01-environment-variables.md) · [English index](README.md) · [Next: Docker →](03-docker.md) · [Project docs →](../README.md)
