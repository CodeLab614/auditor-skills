# Setup manual

Esta guía instala y configura RapidAuth sin ejecutar `bun run init:setup`. Sigue los pasos en orden.

## 1. Prepara los requisitos

- Instala [Bun](https://bun.sh/).
- Si ejecutas Next.js directamente con Node.js, usa la versión 20.9 o posterior.
- Ten acceso a una base de datos PostgreSQL, como Neon u otro proveedor de PostgreSQL.
- Crea una cuenta en [Resend](https://resend.com/) para enviar correo.
- Para compilar en producción, crea una cuenta gratis en Cloudflare y obtén claves reales de Turnstile. Consulta [Cloudflare Turnstile](02-turnstile.md).
- OAuth es opcional. Crea aplicaciones OAuth de Google o GitHub solo si quieres habilitar el inicio de sesión social.

Clona el proyecto y entra en su carpeta:

```sh
git clone https://github.com/yourusername/rapidauth-better-auth.git
cd rapidauth-better-auth
```

## 2. Instala las dependencias

```sh
bun install
```

El script `postinstall` ejecuta automáticamente `prisma generate`. No necesitas ejecutarlo por separado después de una instalación normal con `bun install`.

## 3. Crea y completa `.env`

Copia el archivo de ejemplo y luego edita `.env`:

```sh
cp .env.example .env
```

Usa la [referencia de variables de entorno](01-environment-variables.md) para completar la base de datos, Better Auth, correo y los demás valores. Genera un `BETTER_AUTH_SECRET` único con cualquiera de estos comandos:

```sh
openssl rand -hex 32
```

```sh
node -p "require('node:crypto').randomBytes(32).toString('hex')"
```

Pega en `.env` el valor hexadecimal de 64 caracteres. Para desarrollo local, configura `BETTER_AUTH_URL` como `http://localhost:3000`. En cada entorno publicado, usa su URL base pública.

## 4. Configura y comprueba el correo

Configura `RESEND_API_KEY` y `FROM_EMAIL`. En producción, verifica el dominio del remitente en Resend y usa una dirección de ese dominio. Puedes comprobar la API con un remitente y destinatario verificados:

```sh
export RESEND_API_KEY="re_reemplazar_con_tu_api_key"

curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"RapidAuth <noreply@example.com>","to":["you@example.com"],"subject":"Prueba de correo RapidAuth","html":"<p>El envío de correo funciona.</p>"}'
```

Sustituye el remitente y destinatario de ejemplo por direcciones que controles. Una respuesta exitosa incluye un ID de correo; comprueba también que llegue el mensaje.

## 5. Configura OAuth opcional

Para cada proveedor que quieras habilitar, configura su client ID y secret en `.env` y asigna `true` a su variable `NEXT_PUBLIC_*_ENABLED`. Usa `false` si el proveedor está deshabilitado. Agrega estas URLs de callback a la aplicación OAuth:

- Google: `<BETTER_AUTH_URL>/api/auth/callback/google`
- GitHub: `<BETTER_AUTH_URL>/api/auth/callback/github`

Por ejemplo, en desarrollo local el callback de Google es `http://localhost:3000/api/auth/callback/google`.

## 6. Configura Turnstile

Para `next dev`, puedes dejar Turnstile vacío o configurar claves de prueba de Cloudflare. Cada `next build` requiere ambas claves reales durante la compilación, incluso para staging, vistas previas o CI. Sigue la [guía de Turnstile](02-turnstile.md) para crear un widget, configurar `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`, y autorizar los hostnames desde los que se servirá la app.

## 7. Sincroniza el esquema y crea el admin

Con `DATABASE_URL` configurada en `.env`, ejecuta:

```sh
bun run db:push
bun run db:seed
```

El seed crea la primera cuenta de admin. `SEED_ADMIN_EMAIL` tiene como valor predeterminado `admin@admin.com`. Puedes configurar `SEED_ADMIN_PASSWORD` con una contraseña de al menos 8 caracteres antes de ejecutar el seed. Si no la defines, el seed genera una y la muestra una sola vez; guárdala porque el seed no volverá a mostrarla. Si el admin ya existe, el seed no crea otra cuenta.

## 8. Elige un tema de auth (opcional)

```sh
bun run theme:select
```

El selector de temas es opcional. Algunos temas premium requieren un token personal de acceso de GitHub. El selector lo solicita y lo guarda en `.env.local`; no hace falta para el tema gratis o predeterminado.

## 9. Inicia la app y comprueba el acceso de admin

```sh
bun dev
```

Abre [http://localhost:3000](http://localhost:3000), entra a la página de inicio de sesión e ingresa con `SEED_ADMIN_EMAIL` y la contraseña impresa o configurada durante el seed. Confirma que cargue el panel de admin.

## Antes de desplegar

- Configura un `BETTER_AUTH_SECRET` único, el `BETTER_AUTH_URL` público correcto y un `DATABASE_URL` de producción.
- Configura `RESEND_API_KEY` y un remitente `FROM_EMAIL` con dominio verificado.
- Proporciona claves reales de Turnstile a cada compilación, incluidas staging, vistas previas y CI. Con Docker, monta `TURNSTILE_SECRET_KEY` con BuildKit durante el build y vuelve a proporcionarla en runtime; pasa la site key pública como argumento de build. Consulta [Cloudflare Turnstile](02-turnstile.md).
- Agrega todos los hostnames desde donde se sirve la app, o un hostname padre que cubra sus subdominios, al widget de Turnstile.
- Si habilitaste OAuth, configura las URLs de callback con el `BETTER_AUTH_URL` publicado.
- Elige un email de admin y contraseña segura, o guarda la contraseña generada que solo se muestra una vez y cámbiala tras iniciar sesión.
- Mantén `.env`, `.env.local` y todos los secretos fuera del control de versiones y de los argumentos de build de imágenes.

---

← [Documentación del proyecto](../README.md) · [Índice en español](README.md) · [Siguiente: Variables de entorno →](01-environment-variables.md)
