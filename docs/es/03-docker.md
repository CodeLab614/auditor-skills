# Docker para principiantes

Esta guía inicia RapidAuth y su base PostgreSQL en tu computadora. No necesitas instalar Bun ni PostgreSQL en tu computadora. Sigue los pasos en orden.

## Docker en palabras simples

- Una **imagen** es un paquete con las instrucciones para una aplicación, como una maqueta dentro de su caja.
- Un **contenedor** es una copia en funcionamiento de esa imagen, como la maqueta ya armada.
- Un **volumen** es una caja de almacenamiento que conserva los datos cuando reemplazas un contenedor. La base usa un volumen con nombre.
- **Compose** es una lista de contenedores e instrucciones para iniciarlos juntos. Aquí inicia la app y la base de datos con un solo comando.

## 1. Instala e inicia un motor de Docker

Docker necesita un motor que ejecute contenedores, Compose versión 2 y Buildx con soporte para BuildKit.

- **macOS:** instala [Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/), [OrbStack](https://orbstack.dev/download) o [Colima](https://github.com/abiosoft/colima). Abre Docker Desktop u OrbStack y espera a que el motor esté funcionando. Con Colima, inícialo en Terminal con `colima start`.
- **Windows:** instala [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) y activa el motor WSL 2 cuando te lo pida. Abre Docker Desktop y espera a que indique que Docker está en funcionamiento.
- **Linux:** instala [Docker Engine](https://docs.docker.com/engine/install/) y el [plugin Docker Compose](https://docs.docker.com/compose/install/linux/). Si el motor está detenido, inícialo con `sudo systemctl start docker`.

Abre Terminal o PowerShell en la carpeta del proyecto y comprueba las tres herramientas:

```sh
docker version
docker compose version
docker buildx version
```

`docker version` debe mostrar las secciones Client y Server. Cada comando debe imprimir una versión. Si falta la sección Server, el motor no está iniciado. Si no reconoce Compose o Buildx, instala el plugin correspondiente o actualiza Docker.

## 2. Prepara `.env`

Copia el archivo de ejemplo desde la carpeta del proyecto:

```sh
cp .env.example .env
```

En PowerShell de Windows, usa `Copy-Item .env.example .env`. Abre `.env` en un editor de texto y configura:

- `RESEND_API_KEY`: tu clave de API de Resend. Es necesaria para las funciones de correo.
- `FROM_EMAIL`: un remitente aceptado por Resend. Verifica su dominio en Resend para entregar correos reales.
- `BETTER_AUTH_SECRET`: reemplaza el ejemplo por un secreto único. En macOS o Linux, puedes generarlo con `openssl rand -hex 32`.

Compose configura `DATABASE_URL` y `BETTER_AUTH_URL` para la app. Los valores de OAuth son opcionales. En desarrollo local, puedes dejar vacías las claves de Turnstile o usar las claves de prueba de Cloudflare; consulta [Cloudflare Turnstile](02-turnstile.md). Compose muestra un error si falta `.env`.

## 3. Inicia RapidAuth

Ejecuta este comando desde la raíz del proyecto. La primera vez descarga imágenes y prepara la app de desarrollo, así que puede tardar unos minutos:

```sh
docker compose -f docker/compose.yaml up --build
```

Deberías ver que PostgreSQL pasa la comprobación de salud, Prisma aplica el esquema con `db push`, termina el seed y Next.js queda listo en el puerto 3000. La primera vez, el seed crea `admin@admin.com` y muestra su contraseña generada en los logs de la app. Guárdala: el seed solo la muestra cuando crea esa cuenta.

Abre [http://localhost:3000](http://localhost:3000) e inicia sesión con `admin@admin.com` y la contraseña de los logs. Cámbiala después de entrar.

Para volver a ver los mensajes del seed, abre otra terminal en la raíz del proyecto y ejecuta:

```sh
docker compose -f docker/compose.yaml logs app
```

La contraseña solo aparece en los logs de la ejecución que creó el admin. Mantén esos logs privados.

También puedes iniciar Compose desde su carpeta:

```sh
cd docker
docker compose up --build
```

Si creas otro proyecto a partir de esta plantilla, cambia `name: rapidauth` en `docker/compose.yaml` por el nombre del nuevo proyecto para que no comparta contenedores ni base de datos con este.

Los comandos `bun run docker:up`, `bun run docker:logs`, `bun run docker:down` y `bun run docker:reset` son atajos opcionales. Requieren Bun en tu computadora; los comandos de Docker anteriores no.

## 4. Trabaja en la app

- Edita los archivos en tu computadora. Compose monta el proyecto dentro del contenedor. Next.js recarga la app cuando detecta tus cambios.
- `DOCKER_DEV_POLLING` controla el sondeo de archivos. Su valor predeterminado es `true` y revisa cambios una vez por segundo. Esto ayuda a Docker Desktop y otros motores con carpetas compartidas a detectar las ediciones. Usa un poco más de procesador. En Linux con Docker Engine nativo, puedes apagarlo:

  ```sh
  DOCKER_DEV_POLLING=false docker compose -f docker/compose.yaml up --build
  ```

  Si cambias esta opción mientras la app está activa, vuelve a crear el contenedor para aplicar el nuevo valor.
- Pueden aparecer avisos como `watch error ... NotFound` mientras se reemplazan archivos. Son inofensivos si la app se recarga y sigue funcionando.
- Para seguir los logs, ejecuta `docker compose -f docker/compose.yaml logs -f` en otra terminal.
- Presiona **Ctrl+C** para detener el comando actual. El volumen con nombre de la base permanece en el disco. También puedes detener los servicios con `docker compose -f docker/compose.yaml down`.
- Vuelve a iniciar con `docker compose -f docker/compose.yaml up --build`. Los cambios de código se recargan solos. La app sincroniza dependencias solo cuando cambia `bun.lock`.
- Después de editar un Dockerfile o Compose, usa `up --build` para reconstruir la imagen de la app.

## 5. Cambia los puertos de tu computadora

Los puertos predeterminados son app `3000`, base `5432` y Prisma Studio `5555`. Indica otro puerto antes del comando de Compose. Por ejemplo, en macOS o Linux:

```sh
APP_PORT=3001 docker compose -f docker/compose.yaml up --build
```

En PowerShell, configura `$env:APP_PORT = "3001"` y luego ejecuta el comando de Compose. Abre `http://localhost:3001`. También puedes usar `DB_PORT` y `STUDIO_PORT`. El número a la derecha de cada asignación no cambia dentro del contenedor.

## 6. Abre la base y usa comandos de Prisma

Prisma Studio se ejecuta dentro del contenedor de la app y Compose publica su puerto. Mantén los servicios activos. En otra terminal, ejecuta:

```sh
docker compose -f docker/compose.yaml exec app bunx prisma studio --port 5555 --browser none
```

Abre [http://localhost:5555](http://localhost:5555). Prisma Studio no tiene una opción de hostname en su línea de comandos, así que Compose define `HOST=0.0.0.0` en el contenedor. Eso permite acceder por el puerto publicado; no agregues una opción de hostname que Prisma no admite.

Puedes volver a ejecutar el seed mientras la app está activa:

```sh
docker compose -f docker/compose.yaml exec app bun run db:seed
```

El seed se puede repetir: si el admin ya existe, no crea otro. Para restablecer la contraseña de un usuario:

```sh
docker compose -f docker/compose.yaml exec app bun run scripts/reset-password.ts admin@admin.com
```

La nueva contraseña aparece una sola vez en el resultado del comando. Bun se ejecuta dentro del contenedor; no necesitas instalarlo en tu computadora.

## 7. Borrar la base local y empezar de nuevo

Para detener la app y la base, y borrar permanentemente sus datos almacenados, ejecuta:

```sh
docker compose -f docker/compose.yaml down -v
```

**La opción `-v` borra el volumen de la base local, incluidas las cuentas y sus datos.** El siguiente `up --build` crea tablas vacías y una cuenta admin nueva. Sin `-v`, la base se conserva para el próximo inicio.

## Problemas comunes

### “Cannot connect to the Docker daemon”

El motor está detenido. Abre Docker Desktop u OrbStack y espera a que funcione. Con Colima, ejecuta `colima start`. En Linux, ejecuta `sudo systemctl start docker`.

### Un puerto ya está ocupado

Elige otro puerto de tu computadora. Por ejemplo, inicia la app en 3001 con `APP_PORT=3001 docker compose -f docker/compose.yaml up --build`. Usa `DB_PORT` para la base y `STUDIO_PORT` para Studio. En PowerShell, define la variable `$env:...` correspondiente antes de Compose.

### Falta `.env` o falla el correo

Copia `.env.example` a `.env`. Comprueba que `RESEND_API_KEY` sea válida y que Resend acepte `FROM_EMAIL`. Revisa los mensajes de la app con `docker compose -f docker/compose.yaml logs app`.

### No aparecen los cambios

Espera un segundo y actualiza el navegador. Confirma que editaste archivos dentro de la carpeta del proyecto. Mantén `DOCKER_DEV_POLLING=true` en Docker Desktop. Si hace falta, reinicia la app con `docker compose -f docker/compose.yaml restart app`.

### Cambió una dependencia o un archivo de Docker

Ejecuta `docker compose -f docker/compose.yaml up --build`. Esto reconstruye la imagen de la app y conserva el volumen de la base. No uses `down -v` para reconstruir.

## Producción con Docker

La imagen de producción está separada del Compose de desarrollo. No incluye una base de datos. Conéctala a una base PostgreSQL de producción, por ejemplo Neon, y proporciona todas las variables al iniciar el contenedor.

Cada build de producción necesita claves reales de Turnstile. La site key pública se pasa como argumento de build. La clave secreta se monta con BuildKit y también se proporciona al ejecutar la imagen. El build usa valores ficticios para `DATABASE_URL`, `BETTER_AUTH_URL` y `BETTER_AUTH_SECRET` solo para cargar módulos. No se conecta a una base y esos valores no se guardan en la imagen final.

Configura las variables de Turnstile en tu terminal y crea la imagen desde la raíz del proyecto:

```sh
docker build \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY="$NEXT_PUBLIC_TURNSTILE_SITE_KEY" \
  --secret id=turnstile_secret_key,env=TURNSTILE_SECRET_KEY \
  -t rapidauth .
```

En PowerShell, configura `$env:NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `$env:TURNSTILE_SECRET_KEY`, y luego ejecuta el equivalente en una línea con `--build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=$env:NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `--secret id=turnstile_secret_key,env=TURNSTILE_SECRET_KEY`.

Crea un archivo protegido como `.env.production` con tu `DATABASE_URL` real de producción, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `FROM_EMAIL` y `TURNSTILE_SECRET_KEY`. Luego inicia la imagen:

```sh
docker run --env-file .env.production -p 3000:3000 rapidauth
```

La imagen se ejecuta con un usuario sin privilegios. Docker comprueba la salud con `/api/auth/ok`. Nunca conectes producción a la base local de Compose.

### Crear tablas de producción y el primer admin con Docker

Puedes usar la imagen de desarrollo para aplicar el esquema Prisma y crear el admin en una base externa, sin instalar Bun en tu computadora. Primero confirma que exista `.env`; Compose lo necesita para iniciar el servicio. Sustituye la URL de ejemplo por tu cadena de conexión de producción:

```sh
docker compose -f docker/compose.yaml run --rm \
  -e DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=verify-full" \
  app bunx prisma db push
```

Después crea el admin:

```sh
docker compose -f docker/compose.yaml run --rm \
  -e DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=verify-full" \
  app bun run db:seed
```

**Estos comandos apuntan a la base real indicada en `DATABASE_URL` y pueden cambiar datos de producción.** Revisa con cuidado el host y el nombre de la base antes de ejecutarlos. Guarda la contraseña que imprime el seed. Para restablecer esa cuenta después, mientras la app usa la URL de producción, ejecuta `docker compose -f docker/compose.yaml exec -e DATABASE_URL="<url-de-produccion>" app bun run scripts/reset-password.ts admin@admin.com`.

---

← [Cloudflare Turnstile](02-turnstile.md) · [Índice en español](README.md) · [Documentación del proyecto →](../README.md)
