# Cloudflare Turnstile

RapidAuth requiere claves reales de Cloudflare Turnstile en producción. En desarrollo puedes usar las claves de prueba de abajo. El build de producción falla si falta alguna clave o si hay una clave de prueba configurada.

## Crear un widget

1. Crea una cuenta gratis en [dash.cloudflare.com](https://dash.cloudflare.com/). No necesitas mover tu dominio a Cloudflare.
2. Busca **Turnstile** en el menú del panel, o presiona **Cmd + K** en Mac / **Ctrl + K** en Windows y busca Turnstile.
3. Selecciona **Add widget** y escribe un nombre, por ejemplo `RapidAuth`.
4. En **Hostnames**, agrega `localhost` y los hostnames desde donde se servirá la app, sin `https://` (por ejemplo, `example.com` o `app.example.com`). Cloudflare no acepta comodines `*`. Al agregar un hostname también se autorizan sus subdominios: `example.com` cubre `app.example.com` y `staging.example.com`; `app.example.com` no cubre `example.com` ni otros subdominios hermanos. Agrega cada hostname no relacionado o crea un widget separado para cada entorno. Consulta la [guía de administración de hostnames de Cloudflare](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/).
5. Configura **Widget Mode** en **Managed** y **Pre-clearance** en **No**.
6. Crea el widget y copia la **Site Key** y la **Secret Key**.

Configura las claves en tu entorno:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY="tu-site-key"
TURNSTILE_SECRET_KEY="tu-secret-key"
```

La site key es pública y se incrusta en el código del cliente al compilar. La secret key debe permanecer solo en el servidor.

## Despliegue en producción

Todo entorno que ejecute `next build` necesita ambas claves reales disponibles durante la compilación: producción, staging, vistas previas y pipelines de CI. El build falla si falta una clave o si alguna es de prueba de Cloudflare. Configúralas en el hosting o en los secretos de CI antes de iniciar la compilación.

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` se incrusta en el bundle del cliente durante la compilación. Cambiarla requiere compilar de nuevo. Esto aplica a plataformas como Vercel, Netlify, Railway, Render y Coolify, además de imágenes Docker para un VPS.

Con Docker, pasa la clave pública como argumento de build y monta `TURNSTILE_SECRET_KEY` como secreto de BuildKit. El contenedor también necesita la clave secreta al ejecutarse. Sigue la [guía de Docker](03-docker.md#produccion-con-docker) para ver el Dockerfile y los comandos completos. Consulta la [documentación de secretos de build de Docker](https://docs.docker.com/build/building/secrets/).

Por ejemplo, en Vercel agrega ambas variables en **Project Settings → Environment Variables** para cada entorno que compile la app, incluidas las vistas previas si se usan. En CI, proporciona la clave pública como variable de build y la clave secreta como secreto protegido para el paso de compilación.

El asistente `bun run init:setup` también pide las claves de Turnstile y puede guardar claves reales o de prueba para uso local en `.env`.

## Claves de prueba de Cloudflare

Las claves de prueba son solo para desarrollo local. No las uses en producción: el build de producción las rechaza.

| Site key | Secret key | Resultado |
| --- | --- | --- |
| `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` | Siempre aprueba |
| `2x00000000000000000000AB` | `2x0000000000000000000000000000000AA` | Siempre rechaza |
| `1x00000000000000000000AA` | `3x0000000000000000000000000000000AA` | Siempre rechaza con `timeout-or-duplicate` |

Otras site keys de prueba de Cloudflare: `1x00000000000000000000BB`, `2x00000000000000000000BB` y `3x00000000000000000000FF`. Cloudflare publica la [referencia completa de claves de prueba](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

## Comprobar que funciona

Inicia la app local, abre [`/auth/forgot-password`](http://localhost:3000/auth/forgot-password) y confirma que el widget de Turnstile muestre una palomita después de verificar.

## Solución de problemas

### “Invalid domain”

Asegúrate de que el hostname aparezca exactamente como lo usa el navegador. Escribe solo el hostname, sin `https://`, rutas ni diagonal final. Agrega `localhost` para el desarrollo local.

### “Captcha verification failed”

Confirma que la Site Key y la Secret Key pertenezcan al mismo widget y que el hostname esté permitido. Las claves de prueba solo funcionan con las combinaciones documentadas. Revisa también que la server action reciba el token del widget.

### La app no arranca

En producción, la app se detiene si solo configuraste una de las claves de Turnstile o si usas claves de prueba. Configura ambas claves reales en el entorno del hosting y reinicia o vuelve a desplegar.

### El build de producción falla por Turnstile

Configura `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` en el proveedor de hosting antes de compilar. Sustituye las claves de prueba por las claves reales del widget y comienza un despliegue nuevo. Consulta [Crear un widget](#crear-un-widget).

---

← [Variables de entorno](01-environment-variables.md) · [Índice en español](README.md) · [Siguiente: Docker →](03-docker.md) · [Documentación del proyecto →](../README.md)
