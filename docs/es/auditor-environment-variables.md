# Variables de entorno del auditor

Esta página documenta las variables de entorno que usan los componentes del auditor de skills.

## `DATABASE_URL`

- **Propósito:** cadena de conexión a la base de datos PostgreSQL principal.
- **Quién la usa:** los dos (la aplicación web y el worker).
- **Obligatoria:** sí.
- **Ejemplo:** `postgresql://rapidauth:rapidauth@127.0.0.1:5433/rapidauth?sslmode=disable`
- **Secreto:** sí.

## `GITHUB_TOKEN`

- **Propósito:** autentica las consultas a la API REST de GitHub (árboles de repositorios, descarga de tarballs y
  aumento del límite de peticiones).
- **Quién la usa:** los dos (la aplicación web y el worker).
- **Obligatoria:** no en desarrollo local; sí en AWS.
- **Cómo crearla:** en GitHub, abre **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
  Crea un token con acceso de solo lectura a repositorios públicos y configúralo como `GITHUB_TOKEN`. No concedas
  permisos de escritura.
- **Secreto:** sí. Guárdalo en el servidor; nunca lo expongas al navegador ni lo incluyas en el repositorio.

## `WORKER_POLL_SECONDS`

- **Propósito:** segundos que espera el worker entre consultas a la cola cuando no hay trabajos pendientes.
- **Quién la usa:** solo el worker.
- **Valor por defecto:** `3`.
- **Obligatoria:** no.
- **Secreto:** no.

## `WORKER_MAX_ATTEMPTS`

- **Propósito:** número máximo de intentos para procesar un trabajo antes de marcarlo como fallido con
  «Se agotaron los intentos».
- **Quién la usa:** solo el worker.
- **Valor por defecto:** `3`.
- **Obligatoria:** no.
- **Secreto:** no.

## `WORKER_TEST_DATABASE_URL`

- **Propósito:** cadena de conexión a la base de datos utilizada exclusivamente por pytest para ejecutar las pruebas de
  integración del worker (`@pytest.mark.db`).
- **Quién la usa:** solo las pruebas (nunca en producción ni en ejecución normal).
- **Valor por defecto:** ninguno (las pruebas de base de datos se saltan si no está configurada).
- **Obligatoria:** no.
- **Secreto:** sí.
