# Catálogo, ficha de la skill e informe de análisis: plan de implementación

> **Para quien ejecuta:** Claude orquesta y revisa; un worker de Antigravity (`agy`, modelo `gemini-3.8-flash-high`)
> programa cada tarea en una ronda. Claude revisa el reporte y el diff, y corre lo que el sandbox del worker no deja:
> migraciones de Prisma, pytest con base de datos, Ruff, las pruebas de base de datos de TypeScript, lint, build,
> `theme:sync-classic`, el pre-commit y las capturas con Playwright. Los pasos usan casillas (`- [ ]`).

**Objetivo:** pasar a la app real lo que se aprobó en las maquetas: el catálogo en `/skills`, con todo resuelto en el
servidor; la portada del auditor en `/`; la ficha de cada skill en `/skills/<slug>` (versión básica, sin IA); y el
informe en `/skills/<slug>/analysis`, con la cabecera nueva y el botón «Reportar un problema».

**Arquitectura:**
- `Skill` guarda los datos de su última versión terminada (`latest*`) y un `searchText` normalizado. El worker
  actualiza `latest*` en la misma transacción en la que termina un análisis. Así el catálogo filtra, ordena y cuenta
  sobre una sola tabla, con SQL (`$queryRaw`) en una función que recibe el cliente como parámetro, para poder probarla
  contra una base de pruebas.
- Las páginas siguen el patrón de la plantilla: Server Component que lee `searchParams`, valida con `defineTableQuery`,
  consulta y pasa props serializables a un componente cliente que navega con `useTableUrlState`.
- La ficha se construye con una función pura (`toSkillDetailsView`) a partir de los datos de la base; las secciones de
  la IA llegan en un objeto aparte (`SkillAiDetails`), que hoy solo existe en la maqueta.

**Stack:** Next.js 16, Prisma 7 (adaptador `pg`), PostgreSQL 17 con `pg_trgm`, Bun test y Python 3.14 con psycopg y
pytest en el worker.

**Diseño:** `docs/superpowers/specs/2026-10-28-catalogo-y-ficha-design.md` (aprobado el 2026-10-28). Las maquetas de
referencia son `/mockups/catalog` y `/mockups/skill-details`.

## Restricciones globales

- **Repositorio y rama:** `~/Desktop/auditor-skills`, rama `feat/catalogo` (ya existe, con las maquetas).
- **Rutas siempre en inglés** (lo pidió la persona el 2026-10-28): el informe va en `/skills/<slug>/analysis` y las
  maquetas en `/mockups/catalog` y `/mockups/skill-details`. El texto visible sigue en español.
- **Orden de ejecución:** 0, 1, 2, 3, 4, 5, **7**, 6. Al hacer clic en una skill del catálogo se llega a la ficha, así
  que la ficha va justo después de mover el informe; la cabecera nueva del informe (tarea 6) va al final.
- **Todo en el servidor:** en el navegador no se filtra, ordena ni cuenta nada del catálogo; solo llegan las 20 filas
  de la página, el total y los recuentos.
- **Página:** 20 skills (`pageSize` por defecto de `defineTableQuery`).
- **Diseño de la web pública:** solo piezas de `components/auditor/ui` sobre shadcn; sin bordes en reposo; esquinas y
  rayas solo al pasar el ratón, al enfocar o en lo activo. Prohibido `<Card`, `bg-muted`, `rounded-*`, `shadow-*`,
  `border-radius` distinto de 0 y `<select>`, `<input>`, `<button>` o `<table>` sueltos. El nombre de la referencia
  visual no aparece en ningún sitio.
- **Textos:** el código en inglés; el texto visible en español con la ortografía correcta. Nunca «segura», «100 %» ni
  «confiable».
- **Prisma:** solo migraciones nuevas. Claude las crea con `bun run db:migrate -- --name <nombre>` en el contenedor de
  la app y después corre `bunx prisma generate` en el contenedor (memoria `cc70a020`).
- **Base de pruebas de TypeScript:** `auditor_test` en el PostgreSQL de Docker del auditor (puerto 5433), con las
  migraciones aplicadas. Las pruebas `*.db.test.ts` solo corren con `AUDITOR_TEST_DATABASE_URL` y se niegan a correr
  si el nombre de la base no termina en `_test`.
- **El worker de Antigravity solo corre** `bun run typecheck` y `bun run test`. No hace Git, Prisma, Docker, lint,
  build, `uv`, ni lee `.env`, ni crea archivos fuera del repositorio. No toca `components/ui/`,
  `components/dashboard/` ni `lib/table-query.ts`.
- **Commits:** uno por tarea, que hace Claude, sin atribución a IA y sin `--no-verify`. Nunca push ni merge a `main`:
  la persona sube la rama. `.playwright-mcp/` va a `.git/info/exclude` (local), nunca a un commit.

## Decisiones de Claude (revísalas)

1. **`searchText` calculado en la web** en lugar de `unaccent` en la base (el diseño ya lo recoge en 3.4). La skill
   solo se crea en un sitio (lib/auditor/submission/service.ts) y su nombre y descripción no cambian después.
2. **Las columnas `latest*` admiten nulos**: una skill sin versión terminada las tiene a `NULL` y no sale en el
   catálogo. La misma sentencia SQL recalcula la última versión en la migración y en el worker.
3. **Pruebas de base de datos en TypeScript** en archivos `*.db.test.ts` que se saltan sin
   `AUDITOR_TEST_DATABASE_URL`. Las corre Claude en local; meterlas en CI queda como mejora aparte, para no cambiar
   ahora los trabajos de CI.
4. **La portada sigue en `app/page.tsx`**, porque el tema «Classic» de la plantilla vigila ese archivo
   (themes/classic/theme.json). Se renderiza dentro de un `AuditorShell` compartido con el layout del grupo
   `(auditor)`. `components/landing-content.tsx` se queda sin uso, pero no se borra porque el tema lo vigila.
5. **Enlaces del informe** con `encodeURIComponent` en `file` (`%20`, no `+`), como hoy.
6. **Mientras no exista la ficha (tareas 5 y 6)**, `/skills/<slug>` sin parámetros redirige al informe. La tarea 7 lo
   sustituye por la ficha.

## Puntos que más pueden fallar (cada uno con su prueba en la tarea indicada)

1. **Buscar `%`, `_` o `\`:** se buscan como texto literal, no como comodines (tarea 3).
2. **Buscar «ANALISIS» y encontrar «análisis-pdf»** y al revés: misma normalización al guardar y al buscar (tareas 1 y 3).
3. **Repositorio bloqueado con otras mayúsculas** (`Acme/Skills` frente a `acme/skills`): la skill no sale (tarea 3).
4. **Un análisis viejo que termina tarde** no pasa por delante del más reciente (tarea 2).
5. **Enlace antiguo con espacios y línea** (`/skills/x?v=2&file=a%20b.py#L49`): llega al mismo archivo, versión y
   línea del informe (tarea 5).

---

### Tarea 0: Guardar las maquetas y el diseño (Claude)

- [ ] **Paso 1:** añadir `.playwright-mcp/` a `.git/info/exclude`.
- [ ] **Paso 2:** `bun run lint`, `bun run typecheck` y `bun run test` sin errores.
- [ ] **Paso 3:** commit de las maquetas del catálogo y de la ficha, el documento de diseño y este plan:
  `feat(auditor): mock the catalog and the skill page`.

---

### Tarea 1: Datos de la última versión y texto de búsqueda

**Archivos:**
- Modificar: `prisma/schema.prisma` (modelo `Skill`). Migración `prisma/migrations/<fecha>_catalog_latest/` (Claude).
- Crear: `lib/auditor/search-text.ts`, `lib/auditor/search-text.test.ts`.
- Modificar: `lib/auditor/submission/service.ts` (el `tx.skill.create`, línea ~218).

**Interfaces:**
- Produce: en `Skill`, `latestVersionId String?`, `latestVerdict Verdict?`, `latestAnalyzedAt DateTime?`,
  `latestWarningCount Int?`, `latestHasRemoteScripts Boolean?` y `searchText String @default("")`; índices
  `@@index([latestAnalyzedAt])`, `@@index([name])`, `@@index([latestWarningCount])`, `@@index([latestVerdict])` y
  `@@index([searchText(ops: raw("gin_trgm_ops"))], type: Gin)`.
- Produce: `normalizeSearchText(value: string): string` y
  `skillSearchText(input: { name: string; description: string; owner: string; repo: string }): string` (con `owner` y
  `repo` ya resueltos a los de mostrar).

- [ ] **Paso 1: Pruebas que fallan** en `lib/auditor/search-text.test.ts`:
  - `normalizeSearchText removes accents and lowercases`: `normalizeSearchText("Análisis ÑANDÚ")` es `"analisis nandu"`.
  - `skillSearchText joins name, description and owner/repo`:
    `skillSearchText({ name: "pdf-tools", description: "Lee PDFs", owner: "Acme", repo: "Skills" })` es
    `"pdf-tools lee pdfs acme/skills"`.
- [ ] **Paso 2:** `bun run test` → fallan porque el módulo no existe.
- [ ] **Paso 3:** implementar las dos funciones (`normalize("NFD")`, quitar `\p{M}`, `toLocaleLowerCase("es")`, espacios
  repetidos a uno y `trim`), los campos y los índices en `schema.prisma`, y `searchText: skillSearchText(...)` en el
  `tx.skill.create`, con `displayOwner ?? owner` y `displayRepo ?? repo`.
- [ ] **Paso 4:** `bun run typecheck` y `bun run test` → pasan.
- [ ] **Paso 5 (Claude): migración.** Crearla con `--create-only` y añadir a mano, en este orden: al principio
  `CREATE EXTENSION IF NOT EXISTS pg_trgm;`; al final, el relleno de `latest*` (la misma sentencia que la tarea 2) y el
  de `searchText` para las skills existentes:

  ```sql
  UPDATE "skill" SET "searchText" = lower(translate(
    "name" || ' ' || "description" || ' ' || coalesce("displayOwner", "owner") || '/' || coalesce("displayRepo", "repo"),
    'áàäâéèëêíìïîóòöôúùüûñçÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑÇ', 'aaaaeeeeiiiioooouuuuncAAAAEEEEIIIIOOOOUUUUNC'));
  ```

  Aplicarla, `bunx prisma generate` en el contenedor y comprobar que `prisma migrate dev` no propone otra migración
  (sin deriva del índice GIN).
- [ ] **Paso 6 (Claude):** crear la base `auditor_test` y aplicarle las migraciones.
- [ ] **Paso 7:** commit `feat(auditor): store each skill's latest analysis and search text`.

---

### Tarea 2: El worker actualiza la última versión

**Archivos:**
- Modificar: `worker/src/auditor_worker/store.py` (`save_analysis`, después del paso 4, «Update skill_version»).
- Modificar: `worker/tests/test_store.py`.

**Interfaces:**
- Consume: las columnas `latest*` de la tarea 1.
- Produce: `refresh_skill_latest(cur: psycopg.Cursor, version_id: str) -> None` en `store.py`.

- [ ] **Paso 1: Pruebas que fallan** (`@pytest.mark.db`, con `insert_skill`, `insert_version` e `insert_job` de
  `tests/factories.py`):
  - `test_store_updates_skill_latest`: tras `save_analysis`, la skill tiene `latestVersionId` = la versión,
    `latestVerdict` = `result.verdict`, `latestWarningCount` = número de hallazgos guardados,
    `latestHasRemoteScripts` = `result.has_remote_scripts` y `latestAnalyzedAt` no nulo.
  - `test_store_keeps_newer_version_as_latest`: se guarda la versión 1, se le pone `analyzedAt` = ahora + 1 día, se
    guarda la versión 2 → `latestVersionId` sigue siendo la versión 1.
  - `test_failed_job_leaves_skill_latest`: con una versión ya guardada, `fail_job` sobre otro trabajo de la misma skill
    no cambia ninguna columna `latest*`.
- [ ] **Paso 2 (Claude):** `cd worker && WORKER_TEST_DATABASE_URL=… uv run pytest -m db tests/test_store.py` → fallan.
- [ ] **Paso 3:** implementar `refresh_skill_latest` con esta sentencia (la misma que rellena la migración) y llamarla
  dentro de la transacción de `save_analysis`, después de actualizar `skill_version`:

  ```sql
  UPDATE "skill" s
  SET ("latestVersionId", "latestVerdict", "latestAnalyzedAt", "latestHasRemoteScripts", "latestWarningCount") = (
    SELECT v."id", v."verdict", v."analyzedAt", v."hasRemoteScripts",
           (SELECT count(*) FROM "finding" f WHERE f."versionId" = v."id")::int
    FROM "skill_version" v
    WHERE v."skillId" = s."id" AND v."verdict" IS NOT NULL AND v."analyzedAt" IS NOT NULL
    ORDER BY v."analyzedAt" DESC, v."id" DESC
    LIMIT 1
  )
  WHERE s."id" = (SELECT "skillId" FROM "skill_version" WHERE "id" = %s)
  ```

- [ ] **Paso 4 (Claude):** pytest con base de datos y `uv run ruff check` → pasan.
- [ ] **Paso 5:** commit `feat(worker): keep each skill's latest analysis up to date`.

---

### Tarea 3: Consulta del catálogo

**Archivos:**
- Crear: `lib/auditor/catalog-query.ts`, `lib/auditor/catalog.ts`, `lib/auditor/catalog.db.test.ts`.
- Modificar: `lib/auditor/mock-catalog.ts` y su prueba (importan `catalogQuery` y los tipos de `catalog-query.ts`) y
  `lib/auditor/queries.ts`.

**Interfaces:**
- Consume: `normalizeSearchText` (tarea 1).
- Produce, en `catalog-query.ts` (sin Prisma): `catalogQuery` (movido tal cual desde mock-catalog.ts),
  `type CatalogFilter`, y

  ```ts
  interface CatalogRow { slug: string; name: string; description: string; owner: string; repo: string;
    verdict: Verdict; warnings: number; analyzedAt: string; versionCount: number; hasRemoteScripts: boolean }
  interface CatalogPage { rows: CatalogRow[]; total: number; catalogTotal: number; totalPages: number; page: number;
    verdictCounts: Record<Verdict | "all", number>; remoteCounts: Record<"all" | "yes" | "no", number> }
  ```

- Produce, en `catalog.ts`: `escapeLike(value: string): string` y
  `queryCatalog(client: { $queryRaw: PrismaClient["$queryRaw"] }, params: TableParams<CatalogFilter>): Promise<CatalogPage>`
  (no importa `lib/prisma.ts`). En `queries.ts`: `getCatalogPage(params) => queryCatalog(prisma, params)`.
- `MockCatalogEntry` pasa a ser `CatalogRow & { path: string }` y `queryMockCatalog` devuelve `CatalogPage`.

- [ ] **Paso 1: Pruebas que fallan.** En `lib/auditor/catalog.db.test.ts`, con `describe.skipIf(!url)`, un
  `PrismaClient` propio sobre `AUDITOR_TEST_DATABASE_URL` (adaptador `PrismaPg`, como lib/prisma.ts) y un error si la
  base no termina en `_test`. Cada prueba vacía `finding`, `skill_version`, `skill` y `blocked_repository` y crea sus
  datos con Prisma (con `searchText` de `skillSearchText` y las columnas `latest*` puestas a mano):
  - `search ignores accents and case`: skill «análisis-pdf»; `q: "ANALISIS"` → 1 fila.
  - `search treats percent and underscore literally`: skills «a_b» y «ab»; `q: "a_b"` → solo «a_b»; `q: "%"` → 0.
  - `verdict counts ignore the verdict filter` y `remote counts ignore the remote filter`.
  - `each sort orders as specified`: `recent` (fecha desc), `name` (A-Z, sin distinguir mayúsculas),
    `most-warnings` y `fewest-warnings` (desempate por fecha desc).
  - `page beyond the last one clamps to the last page`; `empty catalog gives one empty page` (`totalPages` 1).
  - `hidden, blocked and unfinished skills are excluded`: oculta, sin `latestVersionId` y una con repositorio
    bloqueado como `Acme/Skills` frente a la skill de `acme/skills`.
  - `version count only counts finished versions`.
  - `rows show the display owner and repo`.
  Además, en `lib/auditor/catalog.test.ts` (sin base): `escapeLike escapes percent, underscore and backslash`
  (`escapeLike("50%_a\\b")` es `"50\\%\\_a\\\\b"`).
- [ ] **Paso 2 (Claude):** `AUDITOR_TEST_DATABASE_URL=… bun test lib/auditor/catalog` → fallan.
- [ ] **Paso 3: implementar `queryCatalog`** con `Prisma.sql`:
  - base: `"hiddenAt" IS NULL AND "latestVersionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "blocked_repository" b
    WHERE lower(b."owner") = lower(s."owner") AND lower(b."repo") = lower(s."repo"))`;
  - búsqueda: `"searchText" ILIKE '%' || ${escapeLike(normalizeSearchText(q))} || '%' ESCAPE '\'`;
  - `catalogTotal`: la base sin búsqueda ni filtros; recuentos con `GROUP BY` (veredicto sin su filtro, remotos sin el
    suyo); `total`, después `page = min(pedida, totalPages)` y las filas con `LIMIT 20 OFFSET …`;
  - órdenes: `recent` → `"latestAnalyzedAt" DESC, "id" DESC`; `name` → `lower("name") ASC, "id" ASC`;
    `most-warnings` / `fewest-warnings` → `"latestWarningCount" DESC|ASC, "latestAnalyzedAt" DESC, "id" DESC`;
  - `versionCount` con una subconsulta de versiones terminadas, solo para las filas devueltas.
- [ ] **Paso 4:** `bun run typecheck` y `bun run test`; Claude corre además las pruebas `*.db.test.ts` → pasan.
- [ ] **Paso 5:** commit `feat(auditor): query the catalog on the server`.

---

### Tarea 4: Portada en `/` y catálogo en `/skills`

**Archivos:**
- Crear: `components/auditor/auditor-shell.tsx`, `components/auditor/home-content.tsx`.
- Sustituir: `components/auditor/catalog-content.tsx` por el contenido de `catalog-mock-content.tsx` (que se borra),
  con la prop `basePath`.
- Modificar: `app/page.tsx`, `app/(auditor)/layout.tsx`, `app/(auditor)/skills/page.tsx`,
  `app/(auditor)/mockups/catalog/page.tsx`, `components/auditor/site-header.tsx`, `components/auditor/page-shell.tsx`,
  `components/auditor/index.ts` y `lib/auditor/queries.ts`; añadir una prueba a `lib/auditor/catalog.db.test.ts`.

**Interfaces:**
- Consume: `catalogQuery`, `CatalogPage` y `getCatalogPage` (tarea 3).
- Produce: `AuditorShell({ children })` (Server Component: importa `auditor.css`, `AuditorTheme fullHeight` y
  `SiteHeader` con la sesión); `HomeContent({ stats }: { stats: HomeStats })`;
  `CatalogContent(props: CatalogPage & { params: TableParams<CatalogFilter>; basePath: string })`;
  `getHomeStats(): Promise<HomeStats>` con
  `HomeStats = { skills: number; versions: number; criticalFindings: number; activeJobs: number }`.

- [ ] **Paso 1: Prueba que falla** en `catalog.db.test.ts`: `home stats count only listed skills` (las skills ocultas,
  bloqueadas o sin terminar no cuentan; `criticalFindings` cuenta solo los críticos de la última versión; `activeJobs`
  cuenta los trabajos `queued` y `running`). Para probarla sin `lib/prisma.ts`, `getHomeStats` delega en
  `queryHomeStats(client)` de `catalog.ts`.
- [ ] **Paso 2:** implementar `queryHomeStats` y `getHomeStats`.
- [ ] **Paso 3:** `HomeContent` con la presentación y «Del enlace al veredicto» que hoy están en catalog-content.tsx
  (`#top` y `#how-it-works`), la columna izquierda solo con «Cifras» (`stats`), la barra de cifras del héroe con los
  mismos números, el índice de la derecha con «Portada» y «Cómo funciona», y «Ver el catálogo» → `/skills`.
- [ ] **Paso 4:** `app/page.tsx` mantiene `redirectToFirstRunIfNoAdmin()` y renderiza
  `<AuditorShell><HomeContent stats={await getHomeStats()} /></AuditorShell>`; `app/(auditor)/layout.tsx` usa
  `AuditorShell`.
- [ ] **Paso 5:** `/skills` lee `searchParams`, `catalogQuery.parse`, `getCatalogPage` y renderiza
  `CatalogContent basePath="/skills"`; la maqueta usa `queryMockCatalog` con `basePath="/mockups/catalog"`.
- [ ] **Paso 6:** enlaces: el logotipo → `/`; «Catálogo» → `/skills`; «Cómo funciona» → `/#how-it-works`, en
  site-header.tsx y page-shell.tsx.
- [ ] **Paso 7:** `bun run typecheck` y `bun run test` → pasan.
- [ ] **Paso 8 (Claude):** `bun run theme:sync-classic` y después `bun run theme:sync-classic --check`; lint; pruebas de
  base de datos; capturas de `/` y `/skills` a 1.440, 1.200 y 390 px, con skills reales de la base.
- [ ] **Paso 9:** commit `feat(auditor): move the home page to / and show the real catalog`.

---

### Tarea 5: El informe pasa a `/skills/<slug>/analysis`

**Archivos:**
- Mover: `app/(auditor)/skills/[slug]/page.tsx` → `app/(auditor)/skills/[slug]/analysis/page.tsx` (sin cambios de
  lógica).
- Crear: `app/(auditor)/skills/[slug]/page.tsx` (redirección provisional), `lib/auditor/skill-links.ts` y
  `lib/auditor/skill-links.test.ts`.
- Modificar los enlaces: `components/auditor/submissions-content.tsx`, `progress-content.tsx`, `admin/jobs-content.tsx`,
  `admin/moderation-content.tsx`, `dashboard/user-dashboard-metrics.tsx`, `skill/skill-editor.tsx`,
  `skill/findings-section.tsx`, `skill/summary-section.tsx` y `skill/skill-top-bar.tsx`; y los de
  `app/(auditor)/mockups/page.tsx`.

**Interfaces:**
- Produce: `skillHref(slug: string): string` (`/skills/<slug>`);
  `analysisHref(slug: string, options?: { version?: number; section?: string; file?: string; line?: number }): string`;
  `legacyAnalysisRedirect(slug: string, search: Record<string, string | string[] | undefined>): string | null`.

- [ ] **Paso 1: Pruebas que fallan** en `skill-links.test.ts`:
  - `analysisHref builds version, file and line links`:
    `analysisHref("x", { version: 2, file: "scripts/a b.py", line: 49 })` es
    `"/skills/x/analysis?v=2&file=scripts%2Fa%20b.py#L49"`; `analysisHref("x", { section: "install" })` es
    `"/skills/x/analysis?section=install"`; `analysisHref("x")` es `"/skills/x/analysis"`.
  - `legacy links with v, file or section go to the analysis page`:
    `legacyAnalysisRedirect("x", { v: "2", file: "a b.py" })` es `"/skills/x/analysis?v=2&file=a%20b.py"`;
    `legacyAnalysisRedirect("x", {})` es `null`.
- [ ] **Paso 2:** `bun run test` → fallan.
- [ ] **Paso 3:** implementar `skill-links.ts`; el nuevo `[slug]/page.tsx` hace `redirect(legacyAnalysisRedirect(...)
  ?? analysisHref(slug))` (provisional, decisión 6); sustituir todos los enlaces de la lista por `analysisHref`.
- [ ] **Paso 4:** `bun run typecheck` y `bun run test` → pasan; `grep -rn '/skills/\${' components app` solo devuelve
  `skill-links.ts` y la fila del catálogo.
- [ ] **Paso 5 (Claude):** en el navegador, `/skills/explicar-cambios?v=2&file=scripts%2Fexplain.py#L49` abre el
  informe en ese archivo y esa línea; lint.
- [ ] **Paso 6:** commit `feat(auditor): move the analysis report to its own page`.

---

### Tarea 6: Cabecera del informe, análisis anteriores y «Reportar un problema»

**Archivos:**
- Modificar: `components/auditor/skill/skill-header.tsx`, `components/auditor/skill/skill-editor.tsx` y
  `app/(auditor)/auditor.css`.
- Renombrar: `components/auditor/skill/author-dialog.tsx` → `report-dialog.tsx`.
- Borrar: `components/auditor/skill/skill-top-bar.tsx`.

**Interfaces:**
- Consume: `analysisHref` y `skillHref` (tarea 5).
- Produce: `SkillHeader` con, además de sus props actuales, `slug: string`,
  `versions?: { number: number; commit: string; analyzedAt: string }[]`, `currentVersion?: number` y
  `onReport?: () => void`; `ReportDialog({ open, onOpenChange, signedIn })`.

- [ ] **Paso 1:** `SkillEditor` usa `SkillHeader` con `current="analysis"`, `otherHref={skillHref(slug)}` («Ver qué hace
  →»), `versions`, `currentVersion` y `onReport`; `analyzedAt` es la fecha de la versión que se ve.
- [ ] **Paso 2:** en `SkillHeader`, si hay más de una versión, «Ver análisis anteriores (N)» con N = versiones − 1,
  que abre un `Sheet` (`auditor-public-sheet`) con cada análisis: fecha (`formatDay`) y commit corto (7 caracteres) en
  mono gris; cada uno es un `NavLink` a `analysisHref(slug, { version })`, el actual con `active`. Si
  `currentVersion` no es la última: «Estás viendo el análisis del <fecha> · Ver el último» con enlace a
  `analysisHref(slug)`. Con `onReport`, un `Button` secundario «Reportar un problema».
- [ ] **Paso 3:** `ReportDialog`: título «Reportar un problema»; descripción «Tu solicitud llega al equipo del auditor,
  que la revisa y te responde por correo.»; los mismos tres motivos y la explicación; el disparador del `Select` y el
  `textarea` sin radio y con el mismo borde y relleno que el buscador del catálogo; sin sesión, el texto y el botón
  «Iniciar sesión» de hoy. El envío sigue mostrando el aviso de hoy (se programa en la fase 7).
- [ ] **Paso 4:** `bun run typecheck` y `bun run test` → pasan.
- [ ] **Paso 5 (Claude):** capturas del informe con una y con varias versiones (las de `/mockups`), del panel de
  análisis anteriores y del formulario con y sin sesión; lint y el grep de estilos prohibidos.
- [ ] **Paso 6:** commit `feat(auditor): clearer analysis header and report form`.

---

### Tarea 7: La ficha de la skill en `/skills/<slug>`

**Archivos:**
- Crear: `lib/auditor/skill-details.ts` y `lib/auditor/skill-details.test.ts`.
- Modificar: `components/auditor/skill/skill-details-content.tsx`, `lib/auditor/mock-skill-details.ts` y su prueba,
  `app/(auditor)/mockups/skill-details/page.tsx`, `lib/auditor/queries.ts` y `app/(auditor)/skills/[slug]/page.tsx`.

**Interfaces:**
- Consume: `analysisHref` y `skillHref` (tarea 5) y el `SkillHeader` que ya existe (name, owner, repo, verdict,
  analyzedAt, current, otherHref); la tarea 6, que va después, le añade versiones y «Reportar un problema».
- Produce, en `skill-details.ts`:

  ```ts
  interface SkillDetailsView {
    slug: string; name: string; owner: string; repo: string; path: string; verdict: Verdict; analyzedAt: string;
    description: string;
    files: { path: string; language: string | null; lineCount: number }[];
    needs: { key: "net" | "install" | "exec" | "filesystem" | "secrets"; label: string;
      items: { title: string; evidence: string; fileCount: number; href: string }[] }[];
    facts: { repository: string; folder: string; fileCount: number; lineCount: number; languages: string[];
      usesInternet: boolean; installsDependencies: boolean; analyzedAt: string };
  }
  interface SkillAiDetails { summary: string; audience: string; goodFor: string[]; notFor: string[];
    steps: { title: string; text: string }[]; files: Record<string, { purpose: string; description: string }> }
  ```

  `toSkillDetailsView(input: SkillDetailsInput): SkillDetailsView`, con `SkillDetailsInput` =
  `{ skill: { slug, name, owner, repo, path, description }, version: { verdict, analyzedAt }, files: { path, language,
  lineCount }[], findings: { ruleId, category, title, evidence, filePath, line }[] }`; y
  `languageFromPath(path: string): string | null`.
- En `queries.ts`: `getSkillDetailsFromDb(slug: string): Promise<SkillDetailsView | null>` (`null` si no existe, está
  oculta o no tiene `latestVersionId`; usa la versión `latestVersionId`). En `mock-skill-details.ts`:
  `getMockSkillDetailsView(slug)` (desde la skill de mock-data.ts, con `lines.length` y `languageFromPath`) y
  `getMockSkillAi(slug): SkillAiDetails | null` (los textos de la maqueta; solo `explicar-cambios`).

- [ ] **Paso 1: Pruebas que fallan** en `skill-details.test.ts`:
  - `needs group findings by category in a fixed order`: con hallazgos `secrets`, `net` y `install` → claves
    `["net", "install", "secrets"]`, con etiquetas «Internet», «Instala» y «Claves y variables»; `dependencies` va en
    `install`, `exec` es «Ejecuta» y `filesystem` es «Archivos que toca».
  - `needs skip markdown, obfuscation and structure findings`.
  - `repeated findings show once with their file count and link to the first one`: mismo `ruleId` y `evidence` en
    `b.py:9` y `a.py:20` → un elemento con `fileCount` 2 y `href` `analysisHref(slug, { file: "a.py", line: 20 })`.
  - `facts sum lines and list languages without duplicates`.
  - `uses internet only when there are net findings`.
  - `languageFromPath guesses common languages`: `.py` → «Python», `.md` → «Markdown», `.sh` → «Shell», `.rs` →
    `null`.
- [ ] **Paso 2:** `bun run test` → fallan.
- [ ] **Paso 3:** implementar `skill-details.ts`, `getSkillDetailsFromDb` y las funciones de la maqueta.
- [ ] **Paso 4:** `SkillDetailsContent({ details, ai, showCommentsPlaceholder })`:
  - sin `ai`: «En pocas palabras» muestra `details.description` bajo la etiqueta «Según el autor»; no se muestran
    «Para qué sirve y para qué no» ni «Cómo funciona»; en «Sus archivos» va solo ruta, lenguaje y líneas; no hay nota
    final;
  - con `ai`: todo como en la maqueta, y la nota final;
  - «Qué necesita» con los `needs`: cada elemento con su `title`, la `evidence` en mono gris recortada a una línea,
    «en N archivos» si N > 1 y «Ver en el informe →» (`href`); un grupo sin elementos no se muestra, y la sección
    entera tampoco si no hay ninguno;
  - el índice «En esta página» solo lista las secciones que se muestran; «Comentarios» solo con
    `showCommentsPlaceholder` (la maqueta lo pasa, la página real no).
- [ ] **Paso 5:** `/skills/[slug]/page.tsx`: `legacyAnalysisRedirect` primero (si devuelve algo, `redirect`); después
  `getSkillDetailsFromDb(slug) ?? getMockSkillDetailsView(slug)`, `notFound()` si no hay nada, y
  `ai = getMockSkillAi(slug)`; metadata «<nombre> · Auditor de skills». La maqueta `/mockups/skill-details` usa las mismas
  funciones con `showCommentsPlaceholder`.
- [ ] **Paso 6:** `bun run typecheck` y `bun run test` → pasan.
- [ ] **Paso 7 (Claude):** capturas de la ficha de una skill real (sin IA) y de `explicar-cambios` (con los textos de la
  maqueta) a 1.440 y 390 px; desde el catálogo, una fila lleva a la ficha y «Ver el informe de análisis →» al informe;
  lint, `bun run build` y el pre-commit.
- [ ] **Paso 8:** commit `feat(auditor): add the skill page that explains what a skill does`.

---

## Al terminar

Claude enseña a la persona las páginas reales con capturas y lenguaje sencillo (memoria `679fc782`), y la persona
sube la rama `feat/catalogo` y abre el PR. La fase 5 (IA) añade `SkillAiDetails` reales y lo que pide el diseño en 4.2.
