# Docker for beginners

This guide starts RapidAuth and its PostgreSQL database on your computer. You do not need Bun or PostgreSQL installed on your computer. Follow the steps in order.

## Docker in simple words

- An **image** is a packaged recipe for an application, like a boxed model kit.
- A **container** is a running copy made from that image, like the assembled model.
- A **volume** is a storage box that keeps data when you replace a container. The database uses a named volume.
- **Compose** is a list of containers and instructions that starts them together. Here it starts the app and database with one command.

## 1. Install and start a Docker engine

Docker needs an engine that runs containers, plus Compose version 2 and Buildx with BuildKit support.

- **macOS:** install [Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/), [OrbStack](https://orbstack.dev/download), or [Colima](https://github.com/abiosoft/colima). Open Docker Desktop or OrbStack and wait until its engine is running. With Colima, start it in Terminal with `colima start`.
- **Windows:** install [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) and enable its WSL 2 engine when prompted. Open Docker Desktop and wait until it says Docker is running.
- **Linux:** install [Docker Engine](https://docs.docker.com/engine/install/) and the [Docker Compose plugin](https://docs.docker.com/compose/install/linux/). Start the engine with `sudo systemctl start docker` if it is stopped.

Open Terminal or PowerShell in the project folder and check all three tools:

```sh
docker version
docker compose version
docker buildx version
```

`docker version` should show both a Client and a Server section. Each command should print a version. If the Server section is missing, the engine is not running. If Compose or Buildx is not found, install its plugin or update your Docker installation.

## 2. Prepare `.env`

Copy the example file from the project folder:

```sh
cp .env.example .env
```

In Windows PowerShell, use `Copy-Item .env.example .env`. Open `.env` in a text editor and set:

- `RESEND_API_KEY`: your Resend API key, required for email features.
- `FROM_EMAIL`: a sender accepted by Resend. Verify its domain in Resend to deliver real email.
- `BETTER_AUTH_SECRET`: replace the example with a unique secret. On macOS or Linux, generate one with `openssl rand -hex 32`.

Compose sets `DATABASE_URL` and `BETTER_AUTH_URL` for the app. OAuth values are optional. Local development can use empty Turnstile keys or Cloudflare test keys; see [Cloudflare Turnstile](02-turnstile.md). Compose reports an error if `.env` is missing.

## 3. Start RapidAuth

Run this command from the project root. The first start downloads images and builds the development app, so it may take a few minutes:

```sh
docker compose -f docker/compose.yaml up --build
```

You should see PostgreSQL become healthy, Prisma apply the schema with `db push`, the seed finish, and Next.js become ready on port 3000. The first seed creates `admin@admin.com` and prints its generated password in the app logs. Save it; the seed prints it only when it creates that account.

Open [http://localhost:3000](http://localhost:3000) and sign in with `admin@admin.com` and the password from the logs. Change the generated password after signing in.

To find the seed output later, open another terminal in the project root and run:

```sh
docker compose -f docker/compose.yaml logs app
```

The password appears only in the logs from the run that created the admin. Keep those logs private.

You can also start Compose from its folder:

```sh
cd docker
docker compose up --build
```

If you create another project from this template, change `name: rapidauth` in `docker/compose.yaml` to the new project name so it does not share containers or a database with this project.

The `bun run docker:up`, `bun run docker:logs`, `bun run docker:down`, and `bun run docker:reset` commands are optional shortcuts. They require Bun on the host; the Docker commands above do not.

## 4. Work on the app

- Edit files on your computer. Compose mounts the project into the app container. Next.js reloads the app when it detects your edits.
- `DOCKER_DEV_POLLING` controls file polling. It defaults to `true` and checks for changes once per second, which helps Docker Desktop and other file-sharing engines notice edits. It uses a little extra CPU. On Linux with native Docker Engine, you can turn it off:

  ```sh
  DOCKER_DEV_POLLING=false docker compose -f docker/compose.yaml up --build
  ```

  If you change this setting while the app is already running, recreate the app container for the new value to take effect.
- Messages such as `watch error ... NotFound` can appear while files are being replaced. They are harmless if the app reloads and continues running.
- To follow logs, run `docker compose -f docker/compose.yaml logs -f` in another terminal.
- Press **Ctrl+C** to stop the attached command. The named database volume stays on disk. You can also stop the services with `docker compose -f docker/compose.yaml down`.
- Start again with `docker compose -f docker/compose.yaml up --build`. Code edits reload automatically. The app syncs dependencies only when `bun.lock` changes.
- After editing a Dockerfile or Compose settings, use `up --build` to rebuild the app image.

## 5. Change the host ports

The defaults are app `3000`, database `5432`, and Prisma Studio `5555`. Set a different host port before the Compose command. For example, on macOS or Linux:

```sh
APP_PORT=3001 docker compose -f docker/compose.yaml up --build
```

In PowerShell, use `$env:APP_PORT = "3001"` and then run the Compose command. Open `http://localhost:3001`. The same settings are available as `DB_PORT` and `STUDIO_PORT`. The number on the right side of each mapping stays fixed inside the container.

## 6. View the database and use Prisma commands

Prisma Studio runs inside the app container, and Compose publishes its port. Keep the app stack running. In a second terminal, run:

```sh
docker compose -f docker/compose.yaml exec app bunx prisma studio --port 5555 --browser none
```

Open [http://localhost:5555](http://localhost:5555). Prisma Studio's CLI has no hostname option, so Compose sets `HOST=0.0.0.0` on the app container. That makes Studio reachable through the published host port; do not add an unsupported hostname flag.

You can run the seed again while the app is running:

```sh
docker compose -f docker/compose.yaml exec app bun run db:seed
```

The seed is safe to repeat; if the admin exists, it skips creating another one. To reset a user's password, run:

```sh
docker compose -f docker/compose.yaml exec app bun run scripts/reset-password.ts admin@admin.com
```

The new password is printed once in the command output. These commands run Bun inside the container, so Bun is not required on your computer.

## 7. Remove the local database and start over

To stop the app and database and permanently erase their stored data, run:

```sh
docker compose -f docker/compose.yaml down -v
```

**The `-v` option deletes the local database volume, including accounts and data.** The next `up --build` creates empty tables and a new admin account. Without `-v`, the database stays available for the next start.

## Common problems

### “Cannot connect to the Docker daemon”

The engine is stopped. Open Docker Desktop or OrbStack and wait until it is running. With Colima, run `colima start`. On Linux, run `sudo systemctl start docker`.

### A port is already in use

Choose another host port. For example, start the app on 3001 with `APP_PORT=3001 docker compose -f docker/compose.yaml up --build`. Use `DB_PORT` for the database and `STUDIO_PORT` for Studio. In PowerShell, set the matching `$env:...` variable before running Compose.

### `.env` is missing or email fails

Copy `.env.example` to `.env`. Check that `RESEND_API_KEY` is valid and `FROM_EMAIL` is allowed by your Resend account. Read app messages with `docker compose -f docker/compose.yaml logs app`.

### Changes do not appear

Wait one second and refresh the browser. Confirm the edited files are inside the project folder. Keep `DOCKER_DEV_POLLING=true` for Docker Desktop. Restart the app with `docker compose -f docker/compose.yaml restart app` if needed.

### A dependency or Docker file changed

Run `docker compose -f docker/compose.yaml up --build`. This rebuilds the app image and keeps the database volume. Do not use `down -v` for a rebuild.

## Production with Docker

The production image is separate from the development Compose stack. It does not contain a database. Point it at a production PostgreSQL database, such as Neon, and provide all runtime settings when you start it.

Every production build needs real Turnstile keys. The public site key is passed as a build argument. The secret key is mounted with BuildKit and must also be provided at runtime. The build uses dummy `DATABASE_URL`, `BETTER_AUTH_URL`, and `BETTER_AUTH_SECRET` values only for module loading. It does not connect to a database, and the dummy values are not saved in the final image.

Set the Turnstile variables in your shell, then build from the project root:

```sh
docker build \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY="$NEXT_PUBLIC_TURNSTILE_SITE_KEY" \
  --secret id=turnstile_secret_key,env=TURNSTILE_SECRET_KEY \
  -t rapidauth .
```

For PowerShell, set `$env:NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `$env:TURNSTILE_SECRET_KEY`, then run the equivalent one-line `docker build` command with `--build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=$env:NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `--secret id=turnstile_secret_key,env=TURNSTILE_SECRET_KEY`.

Create a protected runtime file such as `.env.production` with your real production `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `FROM_EMAIL`, and `TURNSTILE_SECRET_KEY`. Then start the image:

```sh
docker run --env-file .env.production -p 3000:3000 rapidauth
```

The image runs as an unprivileged user. Docker checks `/api/auth/ok` for health. Never connect production to the local Compose database.

### Create production tables and the first admin with Docker

You can use the development image to apply the Prisma schema and seed an external database, without installing Bun on your computer. First make sure `.env` exists so Compose can build and start the app service. Replace the example URL with your real production connection string:

```sh
docker compose -f docker/compose.yaml run --rm \
  -e DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=verify-full" \
  app bunx prisma db push
```

Then create the admin:

```sh
docker compose -f docker/compose.yaml run --rm \
  -e DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=verify-full" \
  app bun run db:seed
```

**These commands point at the real database in `DATABASE_URL` and can change production data.** Check the host and database name carefully before running them. Save the generated admin password from the seed output. To reset that account later while the app is running with the production URL, use `docker compose -f docker/compose.yaml exec -e DATABASE_URL="<production-url>" app bun run scripts/reset-password.ts admin@admin.com`.

---

← [Cloudflare Turnstile](02-turnstile.md) · [English index](README.md) · [Project docs →](../README.md)
