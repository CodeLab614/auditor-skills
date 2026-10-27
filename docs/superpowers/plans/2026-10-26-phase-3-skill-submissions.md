# Fase 3 · Enviar skills: plan de implementación

> **Para quien ejecuta:** Claude orquesta y revisa; Codex (`gpt-6-luna`, razonamiento high) programa cada tarea en
> segundo plano. Los pasos usan casillas (`- [ ]`) para seguir el avance.

**Objetivo:** que «Enviar una skill» funcione de verdad: validar la ruta, detectar las skills en GitHub, calcular la
huella (paso 1), respetar las skills ocultas, los repositorios bloqueados y el límite del mes, y dejar el trabajo en la
cola. Todavía no se analiza nada.

**Arquitectura:** el envío funciona en dos pasos, y los dos son server actions:
1. «Inspeccionar» consulta GitHub y devuelve qué skills hay y en qué estado está cada una.
2. «Enviar» vuelve a comprobarlo todo en el servidor y crea la versión y el trabajo.

La lógica pura vive en `lib/auditor/submission/` y tiene pruebas con `bun test`: leer la ruta, detectar las skills a
partir del árbol y calcular la huella. Las llamadas a GitHub están en un cliente aparte, `lib/auditor/github/`. Las
pantallas que ya existen (enviar, avance, «Mis envíos» y la cola del admin) dejan los datos inventados y leen la base.

**Stack:** Next.js 16, Prisma, Postgres, la API REST de GitHub (`fetch`, sin librerías nuevas) y `bun test`.

**Diseño:** `docs/superpowers/specs/2026-10-25-auditor-skills-design.md`, apartados 4, 5, 6 (envío y límite mensual),
13 (ocultar y bloquear) y 17 (fase 3).

## Restricciones globales

- **Repositorio y rama:** `~/Desktop/auditor-skills`, rama `feat/skill-submissions`.
- **Dependencias:** ninguna nueva. `bun test` viene con Bun.
- **Server actions:** cada acción exportada comprueba la sesión, y el rol cuando hace falta. Lo que llega del navegador
  no se da por bueno: el servidor vuelve a validar la ruta, el commit y las skills elegidas.
- **La web solo habla con la API de GitHub** (`api.github.com`). Nunca descarga URLs que salgan de una skill.
- **El worker que vacía la cola es la fase 4** (decisión de la persona del 2026-10-26). En esta fase los trabajos se
  quedan en `queued`.
- **Fuera de esta fase:** no se tocan el catálogo, la página de la skill ni las métricas del inicio, que siguen con datos
  inventados. Las acciones del admin (ocultar, bloquear y límites) son de la fase 7.
- **Rutas de demostración:** `/analysis/demo-*` y `/mockups` siguen funcionando con datos inventados.
- **Prisma:** solo migraciones nuevas, creadas con `bun run db:migrate -- --name <nombre>` contra la base local de
  Docker.
- **Variables propias del auditor:** se documentan en archivos propios (diseño, apartado 11):
  - `docs/en/auditor-environment-variables.md` y `docs/es/auditor-environment-variables.md`;
  - un bloque «Auditor de skills» al final de `.env.example` y de `docker/.env.example`;
  - la línea que las pasa al contenedor en `docker/app.yaml` y `docker/app.dev.yaml`.
- **Idioma:** lo técnico en inglés; el texto visible en español, con la ortografía correcta.
- **Codex no hace:**
  - Git de escritura ni `bun run dev`;
  - nada con Engram ni con `.playwright-mcp/`;
  - cambios en `components/ui/`;
  - controlar las aplicaciones de la persona;
  - tocar contenedores, salvo la migración que Claude le indique.
- **Formato:** 120 caracteres por línea. El nombre de la referencia visual no aparece en ningún sitio.
- **Commits:** sin atribución a IA. La persona sube la rama e integra.

## Decisiones de Claude (revísalas)

1. **Pruebas con `bun test`:** viene con Bun, así que no añade dependencias. Se añade el script `"test": "bun test"` y un
   paso `bun test` en el job de calidad de CI. Solo se prueban las funciones puras de `lib/auditor/submission/`.
2. **Token de GitHub (`GITHUB_TOKEN`):** es opcional en local. Sin él, GitHub permite 60 consultas por hora, que bastan
   para probar los 3 repositorios, y el resumen de arranque lo avisa. En AWS (fase 10) será obligatorio.
3. **`SKILL.md` válido:** se comprueba con un lector propio, sin librería de YAML. La cabecera tiene que abrir y cerrar
   con `---` en las primeras líneas, y `name` y `description` tienen que ser claves de primer nivel con un valor no
   vacío. Se admiten valores en línea, entre comillas y en bloque (`>` o `|`).
4. **Límites del envío:** de momento son constantes en `lib/auditor/limits.ts`, con los valores de la maqueta: 10
   análisis al mes, 20 por envío, 500 archivos, 25 MB en total y 512 KB por archivo. En la fase 7 pasan a la base y al
   panel.
5. **Mes del límite:** el mes del calendario en UTC. Se renueva el día 1 a las 00:00 UTC.
6. **Dirección de cada skill:** `/skills/<slug>`, donde el slug es `<dueño>-<repo>-<carpeta>` en minúsculas y sin
   símbolos (por ejemplo `cloudflare-security-audit-skill-security-audit`). Si ya existe, se añade `-2`, `-3`…
7. **Plugins:** los extras de una skill son los del plugin más cercano. Ese plugin es la carpeta antepasada más cercana
   que tiene `.claude-plugin/plugin.json`; si no hay ninguna, la raíz del repositorio. Sus extras son estos archivos:
   - `.claude-plugin/**`
   - `hooks/**`
   - `.mcp.json`
   - `commands/**`
   - `agents/**`

   Los plugins cuyo origen está en otro repositorio no se siguen (eso lo cuenta el worker en la fase 4).
8. **Enlaces simbólicos y submódulos:** se guardan en la lista de archivos tal como vienen y los trata el worker en la
   fase 4. Esta fase no los rechaza.
9. **Repositorios demasiado grandes:** si GitHub devuelve el árbol truncado, el envío se rechaza con «El repositorio es
   demasiado grande para analizarlo».

## Puntos que más pueden fallar (cada uno tiene su prueba en la tarea indicada)

1. **Ramas con `/`** (`tree/feat/login/skills/x`): se prueba del prefijo más largo al más corto y no se confunden la rama
   y la carpeta (tarea 2).
2. **Dos envíos a la vez del mismo usuario con un solo análisis libre:** solo uno aparta el análisis; el otro recibe «Ya
   no te quedan análisis este mes» (tarea 3).
3. **Saltarse la interfaz:** si el navegador envía a «Enviar» una carpeta que no es una skill del árbol, un commit
   distinto del inspeccionado o más skills de las permitidas, el servidor lo rechaza (tarea 3).
4. **Reenviar la misma huella** mientras se analiza: lleva a la página de avance existente, sin crear otro trabajo ni
   gastar otro análisis (tarea 3).
5. **Repositorio privado, inexistente o sin `SKILL.md` válido:** mensaje claro, sin errores 500 y sin gastar el límite
   (tareas 2 y 3).

---

### Tarea 1: Modelo de datos y límites

**Archivos:**
- Modificar: `prisma/schema.prisma`.
- Crear: la migración `prisma/migrations/<fecha>_auditor_submissions/`.
- Crear: `lib/auditor/limits.ts`.

**Modelos** (los nombres de tablas y columnas siguen el estilo de los modelos de la plantilla):
- `Skill`:
  - `id`, `owner` y `repo` (en minúsculas), `path` (la carpeta; `""` si es la raíz);
  - `name` y `description` (del `SKILL.md`);
  - `slug` (único), `hiddenAt?` y `createdAt`;
  - `@@unique([owner, repo, path])`.
- `SkillVersion`:
  - `id`, `skillId`, `commitSha`, `submittedRef`;
  - `filesFingerprint` (paso 1) y `fingerprint?` (la final, que pone el worker);
  - `hasRemoteScripts` (por defecto `false`), `submittedById` (`User`) y `createdAt`;
  - `@@unique([skillId, fingerprint])` y `@@index([skillId, filesFingerprint])`.
- `AnalysisJob`:
  - `id`, `versionId`, `kind` (enum `analysis | fingerprint_check`), `status` (enum `queued | running | done | failed`);
  - `attempts` (por defecto 0) y `failureReason?`;
  - `userId` (quien envió), `creditMonth?` (`"2026-10"`) y `creditReturnedAt?`;
  - `createdAt`, `startedAt?` y `finishedAt?`;
  - `@@index([status, createdAt])` y `@@index([userId, creditMonth])`.
- `BlockedRepository`: `id`, `owner`, `repo`, `reason`, `createdAt`, `createdById?`; `@@unique([owner, repo])`.

**Interfaces que produce** (`lib/auditor/limits.ts`):
- `SUBMISSION_LIMITS = { monthlyAnalyses: 10, maxPerSubmission: 20, maxFiles: 500, maxTotalBytes: 25 * 1024 * 1024,
  maxFileBytes: 512 * 1024 }`.
- `currentCreditMonth(now?: Date): string`.
- `nextRenewal(now?: Date): Date`.

**Pasos:**
- [ ] Codex escribe los modelos. Claude crea la migración en el contenedor de la app y Codex la revisa.
- [ ] Validar: `bunx prisma validate`, typecheck y build, sin errores. La migración solo crea tablas, tipos e índices
  nuevos y no altera las de la plantilla.

### Tarea 2: Leer la ruta, cliente de GitHub, detectar skills y huella

**Archivos:**
- Crear `lib/auditor/submission/`:
  - `parse-github-url.ts`
  - `skill-manifest.ts`
  - `detect-skills.ts`
  - `fingerprint.ts`
  - y sus `*.test.ts`
- Crear `lib/auditor/github/client.ts`.
- Modificar `package.json` (script `test`) y `.github/workflows/ci.yml` (paso `bun test`).
- Variables: `GITHUB_TOKEN`, en los archivos de la restricción global y en un módulo propio, `lib/auditor/config.ts`
  (opcional; si falta, un aviso en el log del servidor). No va en `lib/env.ts`, que es de la plantilla.

**Interfaces que produce:**
- `parseGithubUrl(input: string): { ok: true; owner: string; repo: string; refAndPath: string[] | null } |
  { ok: false; reason: string }`. Acepta solo `https://github.com/<dueño>/<repo>` y `.../tree/<ref>/<ruta>`, con o sin
  `/` final. Rechaza otros dominios, `blob/`, `?` y `#`.
- `parseSkillManifest(text: string): { name: string; description: string } | null` (decisión 3).
- `type TreeEntry = { path: string; type: 'blob' | 'tree' | 'commit'; sha: string; size?: number; mode: string }`.
- `detectSkills(tree: TreeEntry[], manifests: Map<string, { name: string; description: string } | null>,
  basePath: string): { skills: DetectedSkill[] } | { error: string }`. Cada `DetectedSkill` lleva:
  - `path`, `name` y `description`;
  - `files: TreeEntry[]` (la carpeta de la skill y los extras de la decisión 7);
  - `nestedSkillPaths: string[]` y `totalBytes`.
- `filesFingerprint(files: TreeEntry[]): string`: el SHA-256 en hexadecimal de las líneas `ruta\0sha\n`, ordenadas por
  ruta.
- `createGithubClient(token?: string)` con estas funciones:
  - `getRepo(owner, repo)`: 404 → «no existe o es privado»;
  - `resolveRefAndPath(owner, repo, segments)`, que devuelve `{ commitSha, ref, path }` y prueba del prefijo más largo
    al más corto contra ramas, etiquetas y commits;
  - `getTree(owner, repo, commitSha)`, recursivo, con `truncated`;
  - `getBlobText(owner, repo, sha)`.

**Pruebas:**
- `parse-github-url.test.ts`: los formatos válidos e inválidos de la sección 4, y la ruta `tree/feat/login/skills/x`.
- `skill-manifest.test.ts`:
  - válido en línea, entre comillas y en bloque;
  - sin cabecera, sin `name` y con `description` vacía devuelven `null`.
- `detect-skills.test.ts`, con árboles de ejemplo que imitan los 3 repositorios del diseño:
  - la raíz con `skills/explain-changes/` da 1 skill, y sus archivos no incluyen `tests/`, `docs/` ni `.github/`;
  - la carpeta de la skill da esa skill;
  - una carpeta sin `SKILL.md` da el error «No hay ninguna skill en esta carpeta»;
  - un `SKILL.md` dentro de otra skill queda en `nestedSkillPaths` de la exterior y no sale como skill propia;
  - un plugin con `hooks/hooks.json` añade el hook a todas sus skills;
  - en un marketplace con dos plugins, cada uno aporta sus extras solo a sus skills.
- `fingerprint.test.ts`: el orden de entrada no cambia la huella, y cambiar un `sha` sí la cambia.

**Pasos:**
- [ ] Escribir las pruebas y comprobar que fallan.
- [ ] Implementar hasta que `bun test` pase.
- [ ] Validar: typecheck, lint, `bun test` y build, sin errores.

### Tarea 3: Server actions de envío

**Archivos:**
- Crear: `actions/auditor/submissions.ts` (`"use server"`).
- Crear: `lib/auditor/submission/service.ts` (la lógica con la base de datos, sin `"use server"`).

**Interfaces que produce:**
- `inspectSubmissionAction(url: string)`. Si sale bien, devuelve `{ response: 'success', data }`, y `data` contiene:
  - `owner`, `repo`, `commitSha` y `ref`;
  - `skills: { path; name; description; state: 'new' | 'analyzed' | 'in-progress' | 'retired'; target?: string }[]`;
  - `remaining: number` y `maxPerSubmission: number`.

  Si falla: `{ response: 'error', message }`.
- `submitSkillsAction(input: { url: string; commitSha: string; paths: string[] })` devuelve
  `{ response: 'success', data: { redirectTo: string } }` o un error.

**Reglas** (diseño, apartados 4, 5, 6 y 13):
- **Sesión:** las dos acciones exigen sesión.
- **Rate limit** con `checkRateLimit`, por usuario:
  - inspeccionar: 30 cada 10 minutos;
  - enviar: 10 cada 10 minutos.
- **Repositorio bloqueado:** se comprueba antes de llamar a GitHub y responde «Esta skill fue retirada del catálogo».
  Una skill oculta aparece como `retired`.
- **Al enviar,** dentro de una transacción con `pg_advisory_xact_lock` por usuario:
  - se vuelve a leer el árbol en `commitSha` (que debe coincidir con lo que la ruta resuelve ahora o ser ese mismo
    commit);
  - se comprueba que cada ruta es una skill detectada y que no se piden más de `min(remaining, maxPerSubmission)`.
- **Según la huella de archivos**, para cada skill:
  - si hay una versión igual sin scripts remotos, va a `/skills/<slug>` y no gasta análisis;
  - si hay una versión igual con un trabajo `queued` o `running`, va a `/analysis/<jobId>` y no gasta análisis;
  - si hay una versión igual con scripts remotos, se crea un trabajo `fingerprint_check` que aparta un análisis;
  - si no hay ninguna, se crean la skill (si no existía), la versión y el trabajo `analysis` en `queued`, y se aparta un
    análisis (`creditMonth` del mes actual).
- **Redirección:** con una sola skill, a su destino; con varias, a `/dashboard/submissions`.
- **Análisis restantes:** `monthlyAnalyses` menos los trabajos del usuario con `creditMonth` del mes actual y sin
  `creditReturnedAt`.

**Pasos:**
- [ ] Implementar `service.ts` y las dos acciones.
- [ ] Validar: typecheck, lint, `bun test` y build, sin errores. Claude prueba los puntos 2, 3 y 4 contra la base local
  (tarea 5).

### Tarea 4: Pantallas con datos reales

**Archivos:**
- Modificar:
  - `components/auditor/submit-content.tsx` y `app/dashboard/submit/page.tsx`;
  - `app/(auditor)/analysis/[id]/page.tsx` y `components/auditor/progress-content.tsx`;
  - `app/dashboard/submissions/page.tsx` y `components/auditor/submissions-content.tsx`;
  - `app/dashboard/auditor/queue/page.tsx` y su componente de `components/auditor/admin/`.
- Crear: `lib/auditor/queries.ts` (lecturas para las páginas, sin `"use server"`).
- Crear: `actions/auditor/progress.ts`, con `getAnalysisProgressAction(id)`. Es pública y devuelve solo datos públicos,
  sin quién envió.

**Pasos:**
- [ ] **Enviar:**
  - la ruta pasa por `inspectSubmissionAction`;
  - si hay varias skills, se muestra la lista con casillas, su estado y el límite de selección;
  - los mensajes de error salen de la acción;
  - el bloque «Prueba estas rutas» pasa a los 3 repositorios reales del diseño.
- [ ] **Avance:** los ids que no empiezan por `demo-` se leen de la base. El componente pregunta el estado cada 2,5 s con
  `getAnalysisProgressAction` mientras el trabajo esté en `queued` o `running`, y deja de preguntar al terminar. Un
  trabajo `fingerprint_check` se muestra como «Comprobando…».
- [ ] **«Mis envíos»:** los trabajos del usuario y la línea «Te quedan N de 10 · se renueva el 1 de <mes>».
- [ ] **Cola del admin:** los trabajos reales, con quién envió, el estado, los intentos y la fecha. Solo lectura; las
  acciones son de la fase 7.
- [ ] Validar: typecheck, lint, `bun test`, build, `theme:sync-classic --check` y el comprobador de CSS del auditor, sin
  errores.

### Tarea 5: Prueba en el navegador y commit

**Pasos:**
- [ ] Aplicar la migración a la base local, en el contenedor (`bun run db:deploy`).
- [ ] La persona pega en `/dashboard/submit`:
  1. `https://github.com/CodeLab614-AI/skills`: lista con `explain-changes`;
  2. `https://github.com/CodeLab614-AI/skills/tree/main/skills/explain-changes`: va al avance «En cola»;
  3. `https://github.com/cloudflare/security-audit-skill`: lista con `security-audit`.
- [ ] Claude comprueba:
  - reenviar la ruta 2 lleva al mismo avance, sin gastar otro análisis (punto 4);
  - dos envíos simultáneos con 1 análisis libre: uno pasa y el otro no (punto 2);
  - una llamada directa a `submitSkillsAction` con una carpeta inventada y con otro commit: rechazada (punto 3);
  - un repositorio inexistente, uno bloqueado (insertado a mano en la base local) y una carpeta sin skill dan su mensaje
    (punto 5);
  - «Mis envíos» y la cola del admin muestran los trabajos.
- [ ] Validar: el pre-commit completo y la búsqueda del nombre de la referencia visual, vacía.
- [ ] Commit local del plan y del código: `feat(auditor): submit skills and queue analysis jobs`.

**Parada (la de la fase 3 en el diseño):** la persona pega los 3 repositorios de prueba y comprueba que detecta bien las
skills. Después sube `feat/skill-submissions`, abre el PR y lo integra.
