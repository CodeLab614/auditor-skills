# Variables de entorno

Esta referencia cubre todas las variables que leen la aplicación y los scripts de setup. El archivo `.env.example` sirve como plantilla para copiar. Nunca subas secretos reales al repositorio.

## Base de datos

### `DATABASE_URL`

- **Propósito:** Conexión PostgreSQL usada por la app, Prisma y los scripts de base de datos.
- **Obligatoria:** En desarrollo y producción.
- **Dónde obtenerla:** Copia la cadena de conexión del proveedor PostgreSQL, por ejemplo Neon.
- **Formato de ejemplo:** `postgresql://USUARIO:CONTRASENA@HOST:5432/BASE?sslmode=require`
- **Base local de Docker:** `postgresql://rapidauth:rapidauth@localhost:5432/rapidauth?sslmode=disable` (usa tu `DB_PORT` si lo cambiaste).
- **Advertencia:** `sslmode=disable` solo se usa con la base PostgreSQL local en Docker. Nunca lo uses en producción.
- **Secreta:** Sí. Contiene credenciales de la base de datos.

### `DOCKER_DATABASE`

- **Propósito:** Activa el inicio automático del servicio PostgreSQL local en Docker antes de que `bun dev` ejecute lint y Next.js.
- **Obligatoria:** No. Su valor predeterminado es `false`; `init:setup` la establece como `true` cuando eliges una base local en Docker.
- **Valores:** `true` o `false`. Solo el valor exacto `true` inicia Docker. Al elegir una base externa, el asistente elimina esta variable; al conservar una `DATABASE_URL` existente, también conserva su valor actual.
- **Secreta:** No.

## Better Auth

### `BETTER_AUTH_SECRET`

- **Propósito:** Firma y cifra los datos de sesión de Better Auth.
- **Obligatoria:** En desarrollo y producción.
- **Dónde obtenerla:** Genera un valor único con `openssl rand -hex 32` o `node -p "require('node:crypto').randomBytes(32).toString('hex')"`.
- **Formato de ejemplo:** `64-caracteres-hexadecimales-aleatorios`
- **Secreta:** Sí. Usa un valor diferente por entorno y nunca lo expongas al cliente.

### `BETTER_AUTH_URL`

- **Propósito:** URL base pública que Better Auth usa para crear callbacks y enlaces de correo.
- **Obligatoria:** En desarrollo y producción.
- **Dónde obtenerla:** Usa `http://localhost:3000` localmente y la URL HTTPS canónica de cada entorno publicado.
- **Formato de ejemplo:** `https://auth.example.com`
- **Secreta:** No. Debe coincidir con la URL desde la que se sirve la app.

## Correo

### `RESEND_API_KEY`

- **Propósito:** Autoriza el envío de correo mediante Resend.
- **Obligatoria:** Para enviar correos en desarrollo y producción; usa credenciales de producción en producción.
- **Dónde obtenerla:** Crea una API key en el panel de Resend.
- **Formato de ejemplo:** `re_reemplazar_con_tu_api_key`
- **Secreta:** Sí. Mantenla en el servidor.

### `FROM_EMAIL`

- **Propósito:** Nombre y dirección del remitente de correos de verificación y contraseñas.
- **Obligatoria:** En desarrollo hay un remitente de respaldo; para enviar correo en producción se requiere una dirección autorizada por Resend.
- **Dónde obtenerla:** Elige una dirección en un dominio verificado en Resend.
- **Formato de ejemplo:** `RapidAuth <noreply@example.com>`
- **Secreta:** No. Verifica el dominio antes de enviar correo en producción.

## Turnstile

### `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

- **Propósito:** Clave pública que muestra el widget en el navegador.
- **Obligatoria:** Opcional para `next dev`; se requiere una clave real en cada `next build`, incluidos producción, staging, vistas previas y CI.
- **Dónde obtenerla:** Crea un widget de Cloudflare Turnstile. Consulta [Cloudflare Turnstile](02-turnstile.md).
- **Formato de ejemplo:** `tu-site-key-real-de-turnstile`
- **Secreta:** No. Los valores `NEXT_PUBLIC_*` se incrustan en el bundle del cliente al compilar; cambiar esta clave requiere un build nuevo.

### `TURNSTILE_SECRET_KEY`

- **Propósito:** Valida en el servidor los tokens de Turnstile.
- **Obligatoria:** Opcional para `next dev`; se requiere una clave real en cada `next build` y en el servidor de producción en ejecución.
- **Dónde obtenerla:** Copia la Secret Key del mismo widget de Cloudflare Turnstile que la site key.
- **Formato de ejemplo:** `tu-secret-key-real-de-turnstile`
- **Secreta:** Sí. Mantenla en el servidor. En Docker, móntala con BuildKit durante el build y vuelve a proporcionarla al contenedor en ejecución.

## OAuth

Para cualquiera de los proveedores, agrega la URL de callback correspondiente a la aplicación OAuth: `<BETTER_AUTH_URL>/api/auth/callback/google` o `<BETTER_AUTH_URL>/api/auth/callback/github`. Por ejemplo, el callback local de Google es `http://localhost:3000/api/auth/callback/google`.

### `GOOGLE_CLIENT_ID`

- **Propósito:** Identifica la aplicación OAuth de Google.
- **Obligatoria:** No, salvo que habilites el inicio con Google, en desarrollo o producción.
- **Dónde obtenerla:** Google Cloud Console → APIs & Services → Credentials.
- **Formato de ejemplo:** `1234567890-ejemplo.apps.googleusercontent.com`
- **Secreta:** No. Configura la URL de callback indicada arriba.

### `GOOGLE_CLIENT_SECRET`

- **Propósito:** Autoriza a RapidAuth ante la aplicación OAuth de Google.
- **Obligatoria:** No, salvo que habilites el inicio con Google, en desarrollo o producción.
- **Dónde obtenerla:** Google Cloud Console, junto con el client ID.
- **Formato de ejemplo:** `reemplazar-con-google-client-secret`
- **Secreta:** Sí. Mantenla en el servidor.

### `GITHUB_CLIENT_ID`

- **Propósito:** Identifica la aplicación OAuth de GitHub.
- **Obligatoria:** No, salvo que habilites el inicio con GitHub, en desarrollo o producción.
- **Dónde obtenerla:** GitHub Settings → Developer settings → OAuth Apps.
- **Formato de ejemplo:** `Iv1.ejemplocliente`
- **Secreta:** No. Configura la URL de callback indicada arriba.

### `GITHUB_CLIENT_SECRET`

- **Propósito:** Autoriza a RapidAuth ante la aplicación OAuth de GitHub.
- **Obligatoria:** No, salvo que habilites el inicio con GitHub, en desarrollo o producción.
- **Dónde obtenerla:** Configuración de la OAuth App de GitHub, junto con el client ID.
- **Formato de ejemplo:** `reemplazar-con-github-client-secret`
- **Secreta:** Sí. Mantenla en el servidor.

### `NEXT_PUBLIC_GOOGLE_ENABLED`

- **Propósito:** Controla si aparece el botón de inicio con Google.
- **Obligatoria:** No; usa `true` cuando Google esté configurado y `false` cuando esté deshabilitado.
- **Dónde obtenerla:** Asígnala en `.env`.
- **Formato de ejemplo:** `false`
- **Secreta:** No. Esta opción `NEXT_PUBLIC_*` se incrusta al compilar. Usa `true` solo si configuraste las credenciales de Google correspondientes.

### `NEXT_PUBLIC_GITHUB_ENABLED`

- **Propósito:** Controla si aparece el botón de inicio con GitHub.
- **Obligatoria:** No; usa `true` cuando GitHub esté configurado y `false` cuando esté deshabilitado.
- **Dónde obtenerla:** Asígnala en `.env`.
- **Formato de ejemplo:** `false`
- **Secreta:** No. Esta opción `NEXT_PUBLIC_*` se incrusta al compilar. Usa `true` solo si configuraste las credenciales de GitHub correspondientes.

## Seed

Estas variables solo las lee `bun run db:seed`; no hacen falta en la app después de crear el admin.

### `SEED_ADMIN_EMAIL`

- **Propósito:** Correo de la cuenta admin inicial.
- **Obligatoria:** No. El seed usa `admin@admin.com` si no la configuras.
- **Dónde obtenerla:** Elige una dirección de correo que controles.
- **Formato de ejemplo:** `admin@example.com`
- **Secreta:** No. Solo la usa el script de seed.

### `SEED_ADMIN_PASSWORD`

- **Propósito:** Contraseña de la cuenta admin inicial.
- **Obligatoria:** No. Si no la configuras, el seed genera una contraseña y la muestra una sola vez.
- **Dónde obtenerla:** Elige una contraseña única de al menos 8 caracteres.
- **Formato de ejemplo:** `reemplazar-con-contrasena-unica`
- **Secreta:** Sí. Solo la usa el seed. No dejes activo un valor de ejemplo en un `.env` real.

## Temas

### `GITHUB_TOKEN`

- **Propósito:** Permite que el selector opcional de temas descargue temas premium de GitHub.
- **Obligatoria:** No se necesita para la app ni para los temas gratis o predeterminados.
- **Dónde obtenerla:** Crea un token personal de acceso de GitHub con acceso al repositorio del tema solicitado. El selector solicita el token y lo guarda en `.env.local`.
- **Formato de ejemplo:** `github_pat_reemplazar_con_tu_token`
- **Secreta:** Sí. El selector la lee de `.env.local`; la app en ejecución no la necesita.

## Valores públicos y momento de compilación

Todos los valores `NEXT_PUBLIC_*` son públicos y se compilan dentro del bundle del cliente. Configura los valores deseados antes de compilar; cambiar uno requiere ejecutar de nuevo `next build` y desplegar. Los builds de producción requieren claves reales de sitio y secret de Turnstile.

---

← [Setup manual](00-manual-setup.md) · [Índice en español](README.md) · [Siguiente: Cloudflare Turnstile →](02-turnstile.md)
