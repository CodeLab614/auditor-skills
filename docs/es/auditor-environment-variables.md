# Variables de entorno del auditor

Esta página documenta las variables que usa exclusivamente el auditor de skills.

## `GITHUB_TOKEN`

- **Propósito:** autentica las consultas de la aplicación web a la API REST de GitHub y aumenta su límite de
  peticiones.
- **Quién la usa:** solo la aplicación web. El worker de análisis no usa esta variable.
- **Obligatoria:** no en desarrollo local; sí en AWS.
- **Cómo crearla:** en GitHub, abre **Settings → Developer settings → Personal access tokens → Fine-grained
  tokens**. Crea un token con acceso de solo lectura a repositorios públicos y configúralo como `GITHUB_TOKEN` en
  la aplicación web. No concedas permisos de escritura.
- **Secreto:** sí. Guárdalo en el servidor; nunca lo expongas al navegador ni lo incluyas en el repositorio.
