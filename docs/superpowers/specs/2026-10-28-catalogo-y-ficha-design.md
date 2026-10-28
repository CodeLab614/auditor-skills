# Catálogo, ficha de la skill e informe de análisis: diseño

Fecha: 2026-10-28. Rama: `feat/catalogo`. Completa el documento principal
([2026-10-25-auditor-skills-design.md](2026-10-25-auditor-skills-design.md)); donde este diga otra cosa, manda este.

Las decisiones de la persona van sin marca. Las de Claude llevan **[decisión de Claude]** y el constructor puede
afinarlas sin cambiar lo que se construye.

## 1. Para qué

El catálogo público tiene que aguantar miles de skills y dejar claro, de un vistazo, qué hace cada una y si conviene
instalarla. Hoy pasan tres cosas:

- `/skills` lleva el catálogo dentro de la portada, con datos inventados, y filtra en el navegador. Con miles de skills
  eso no sirve.
- La página de una skill solo responde «¿es peligrosa?». No explica qué es ni para qué sirve.
- La cabecera de esa página confunde: un selector «Versión 2 · 1807207» que una persona normal no entiende y un botón
  «Soy el autor / reportar un error» que no dice qué pasa con la solicitud.

## 2. Objetivos, lo que no se hace y lo que sería un fracaso

**Objetivos**

1. Un catálogo con búsqueda, filtros, orden y paginación resueltos **siempre en el servidor**.
2. Dos páginas por skill, separadas y cada una con su diseño: la **ficha** (qué hace) y el **informe de análisis** (si
   es peligrosa y por qué).
3. Una cabecera de skill que se entienda sin saber qué es un commit.

**Lo que no se hace aquí**

- Comentarios en la ficha: la persona los quiere en el futuro y la ficha deja sitio, pero no se construyen ahora.
- El texto de la IA en la ficha llega con la fase 5. Aquí solo se prepara su sitio y su forma.
- Enviar de verdad las solicitudes de «Reportar un problema» y comprobar si quien la envía es el autor: es la fase 7.
- Ordenar por popularidad: no se guardan estrellas ni visitas.

**Sería un fracaso aunque funcione**

- Que llegue al navegador la lista entera de skills, o que se filtre, se ordene o se cuente en el navegador.
- Que la ficha parezca una garantía: la descripción del autor presentada como algo comprobado, o un «Instalable» que se
  lea como «segura».
- Mezclar la ficha y el informe en una sola página con pestañas.

## 3. Catálogo

### 3.1 Dónde vive

- `/skills` pasa a ser solo el catálogo completo (el de la maqueta `/mockups/catalogo`).
- `/` (la raíz, que hoy muestra la página «RAPID» de la plantilla) pasa a ser la **portada del auditor**: la
  presentación («Entiende una skill antes de instalarla», con «Enviar una skill» y «Ver el catálogo») y «Del enlace al
  veredicto», que hoy están encima del catálogo en `/skills`.
- La portada conserva `redirectToFirstRunIfNoAdmin()`, que hoy está en app/page.tsx. Como app/page.tsx es un archivo de
  la plantilla, después de cambiarlo hay que correr `bun run theme:sync-classic` (AGENTS.md, punto 9).
- En la portada, la columna izquierda deja solo «Cifras», con números reales de la base; los filtros de veredicto y el
  orden se van con el catálogo **[decisión de Claude]**.
- Los enlaces cambian: el logotipo y «Cómo funciona» (`/skills#how-it-works`) apuntan a `/` y `/#how-it-works`;
  «Catálogo» apunta a `/skills` (components/auditor/site-header.tsx y components/auditor/page-shell.tsx).

### 3.2 El estado vive en la dirección

`?q=&verdict=&remote=&sort=&page=`, con `defineTableQuery` (lib/table-query.ts) y `useTableUrlState`
(components/dashboard/table-view/use-table-url-state.ts), como en la maqueta (`catalogQuery` de
lib/auditor/mock-catalog.ts). Cada cambio navega; la página (Server Component) valida, consulta y pasa al cliente solo
la página pedida, el total y los recuentos.

- **Búsqueda:** en el nombre, la descripción y `dueño/repo`, sin distinguir mayúsculas ni acentos.
- **Filtros:** veredicto (Todos, Peligrosa, Revisar, Sin hallazgos graves) y scripts remotos (Todos, Con, Sin), uno por
  grupo, con su recuento al lado.
- **Recuentos:** los de veredicto se calculan con la búsqueda y el filtro de remotos, sin el de veredicto; los de
  remotos, al revés. Así cada número dice cuántos saldrían al elegirlo.
- **Orden:** Más recientes (por defecto), Nombre (A-Z), Más avisos y Menos avisos; los dos últimos desempatan por fecha.
- **Página:** 20 skills. Si se pide una página que no existe, se muestra la última. Sin resultados: «No hay resultados
  para «…».» y «Quitar filtros».

### 3.3 Qué entra en el catálogo

Solo las skills que no están ocultas (`Skill.hiddenAt` nulo), cuyo repositorio no está bloqueado y que tienen al menos
una versión terminada. Cada fila muestra la **última versión terminada**.

- **Versión terminada** = `verdict` y `analyzedAt` no nulos, el mismo criterio que hoy usa `getSkillAnalysisFromDb`
  **[decisión de Claude]**.
- **Repositorio bloqueado:** el bloqueo vive en `BlockedRepository(owner, repo)`, no en `Skill`. La consulta lo excluye
  con un `NOT EXISTS` contra esa tabla, que tiene índice único por `(owner, repo)`; los dos lados guardan `owner` y
  `repo` normalizados igual (comprobarlo y, si no, comparar en minúsculas). No se desnormaliza en `Skill` para no tener
  que mantenerlo desde las acciones del admin **[decisión de Claude]**.

### 3.4 Datos y rendimiento

- **Columnas de la última versión en `Skill`** **[decisión de Claude]**: `latestVersionId`, `latestVerdict`,
  `latestAnalyzedAt`, `latestWarningCount` y `latestHasRemoteScripts`, solo las que hacen falta para filtrar, ordenar y
  contar sin unirse a `skill_version` ni a `finding`. Hoy no existen y el worker (`store.py`) no escribe en `skill`:
  es trabajo nuevo. Una migración rellena los valores de las skills que ya existen.
- **Cómo las actualiza el worker** **[decisión de Claude]**: al terminar un análisis, en la misma transacción, vuelve a
  calcular la última versión terminada de esa skill (la de `analyzedAt` mayor) a partir de la base, en lugar de suponer
  que la que acaba de terminar es la última. Así un reintento o un análisis que termina tarde no deja datos viejos. Si el
  análisis falla, no toca `skill`. Si el envío reutiliza una versión ya existente (paso 2 de la huella), no se crea
  versión y no cambia nada.
- **«Versiones analizadas»** no se guarda: se cuenta en la misma consulta solo para las 20 filas de la página, con el
  mismo criterio de «versión terminada» **[decisión de Claude]**.
- **Avisos** = número de hallazgos de la última versión: todas las gravedades, declarados o no. Es el mismo número que
  hoy enseña la página de la skill.
- **Índices** **[decisión de Claude]**: uno por cada orden (`latestAnalyzedAt`, `name`, `latestWarningCount`) y otro por
  `latestVerdict`.
- **Búsqueda rápida:** la extensión `pg_trgm` de PostgreSQL ([postgres/postgres](https://github.com/postgres/postgres),
  licencia PostgreSQL; búsqueda por trigramas con índice GIN), viene con PostgreSQL y está en RDS. Para buscar sin
  acentos, `Skill` guarda una columna `searchText` con el nombre, la descripción y `dueño/repo` ya normalizados (sin
  acentos y en minúsculas). La calcula la web al crear la skill, con la misma función que normaliza lo que se busca, y
  lleva un índice GIN `gin_trgm_ops` **[decisión de Claude]**. Se descartó `unaccent` con una columna generada porque
  Prisma no gestiona columnas generadas ni índices sobre expresiones y los borraría en la siguiente migración. La
  extensión se crea con `CREATE EXTENSION IF NOT EXISTS pg_trgm` escrito a mano en la migración.

### 3.5 La fila

Como en la maqueta `/mockups/catalogo`, en tabla con encabezados: «Skill», «Veredicto», «Instalable», «Avisos»,
«Versiones analizadas», «Último análisis». La columna por la que se ordena lleva la flecha.

- **Skill:** el icono de documento (el mismo en todas las filas), el nombre, la descripción en hasta 2 líneas con «…» y
  el icono de GitHub con `dueño / repo`.
- **Veredicto:** `VerdictMark`, un cuadrado de 8 px y el texto del color del tono, sin caja; en «Peligrosa», el cuadrado
  rayado. Sin línea roja en el borde de las filas peligrosas.
- **Instalable:** una paloma solo en «Sin hallazgos graves» y una cruz en «Revisar» y «Peligrosa»
  (`isInstallable`). Se avisó a la persona de que la paloma se puede leer como «segura», lo que el documento principal
  prohíbe, y lo eligió igualmente.
- Los números con separador de miles («1.240») y la fecha sin hora («24 oct 2026»).
- **Anchos:** desde 1.280 px, todas las columnas; de 768 a 1.279 px, sin «Avisos» ni «Versiones analizadas»; por
  debajo de 768 px, un bloque por skill (nombre a todo el ancho; luego la descripción, el proyecto, el veredicto con
  «Instalable» y, al final, avisos, versiones y fecha, sin partir ningún dato) y los filtros detrás del botón
  «Filtros · N».
- Cada fila enlaza a la **ficha** (`/skills/<slug>`).

## 4. Dos páginas por skill

| | Ficha | Informe de análisis |
|---|---|---|
| Responde a | «¿Qué es y me sirve?» | «¿Es peligrosa y por qué?» |
| Dirección | `/skills/<slug>` | `/skills/<slug>/analisis` |
| Diseño | Para leer, como un artículo largo | El actual: informe con editor de código |

Las dos comparten **solo** la cabecera (4.1). Desde el catálogo se llega a la ficha.

**Enlaces antiguos** **[decisión de Claude]**: `/skills/<slug>?section=…`, `?file=…` y `?v=…` redirigen a
`/skills/<slug>/analisis` con los mismos parámetros (y la misma `#L…`, que el navegador conserva), porque esos enlaces ya
existen en «Mis envíos», el panel de admin, la página de avance y los correos futuros. Los enlaces internos se cambian a
la dirección nueva: submissions-content.tsx, progress-content.tsx, admin/jobs-content.tsx, admin/moderation-content.tsx,
dashboard/user-dashboard-metrics.tsx y los de components/auditor/skill/.

### 4.1 Cabecera compartida (`SkillHeader`)

La de la maqueta (components/auditor/skill/skill-header.tsx): ruta de navegación (Catálogo › `dueño/repo` › nombre), el
nombre, y una línea con `dueño / repo`, el veredicto, «Instalable» o «No instalable» y «Analizada el 24 oct 2026». A la
derecha, un único botón que lleva a la otra página: «Ver el informe de análisis →» en la ficha y «Ver qué hace →» en el
informe. En el informe, además, el botón «Reportar un problema» (4.3).

- **Sin selector de versión.** Si la skill tiene más de un análisis, debajo de la fecha aparece «Ver análisis anteriores
  (N)», que abre un panel lateral (`Sheet`) con la lista: la fecha y el commit corto en pequeño; cada uno lleva a
  `/skills/<slug>/analisis?v=N` **[decisión de Claude]**. Con un solo análisis no aparece nada. Hoy no se guarda ningún
  «motivo del cambio» por versión, así que no se muestra; si la fase 6 lo añade, se pone en esa lista.
- **El número `N` de `?v=`** se sigue calculando al leer, como hoy en lib/auditor/skill-analysis.ts (posición por
  `analyzedAt` entre las versiones terminadas), para no romper los enlaces que ya existen **[decisión de Claude]**.
- El commit no se muestra en la cabecera; solo en esa lista y en el informe.
- Mirando una versión antigua, la cabecera lo dice: «Estás viendo el análisis del 3 may 2026 · Ver el último».

### 4.2 La ficha

Como la maqueta `/mockups/ficha`. Tres columnas: a la izquierda «En esta página» (se marca la sección visible al
bajar); en el centro, el artículo; a la derecha, «Datos». En móvil, el índice se abre desde el botón «En esta página» y
los datos van al final de la primera sección.

**Antes de la IA (desde ya)** se publica una ficha básica con lo que el análisis sin IA ya guarda:

| Sección | De dónde sale |
|---|---|
| En pocas palabras | `Skill.description` (la del `SKILL.md`), con la etiqueta **«Según el autor»** para que no parezca comprobada |
| Qué necesita | Los hallazgos de la última versión, agrupados por categoría: «Internet» (`net`), «Instala» (`dependencies` e `install`), «Ejecuta» (`exec`), «Archivos que toca» (`filesystem`) y «Claves y variables» (`secrets`). Las demás categorías (`markdown`, `obfuscation`, `structure`) no describen lo que necesita la skill y solo van en el informe. Ver el detalle debajo **[decisión de Claude]** |
| Sus archivos | `VersionFile`: ruta, lenguaje y número de líneas; cada uno enlaza a su código en el informe |
| Datos | Repositorio, carpeta, archivos, líneas, lenguajes, si usa internet (hay hallazgos `net`), si instala dependencias (hay `dependencies` o `install`) y fecha |

**Detalle de «Qué necesita» y de los datos** **[decisión de Claude]**:

- `Finding` no tiene un campo con el dominio o el paquete: solo `title` (la frase en español) y `evidence` (la línea
  citada). Cada elemento muestra el `title` y, debajo, en mono y gris, la `evidence` recortada a una línea. No se
  intenta sacar el dominio o el paquete del texto.
- Entran todos los hallazgos de esas categorías, de cualquier gravedad, declarados o no, sin mostrar la gravedad: eso es
  del informe.
- Los repetidos (mismo `ruleId` y misma `evidence`) se muestran una vez, con «en 3 archivos» si aparecen en varios. El
  enlace «Ver en el informe» lleva al primero por ruta y línea.
- «Usa internet» e «Instala dependencias» se calculan al abrir la ficha a partir de esos mismos hallazgos, sin columna
  nueva.

**Skills sin ficha:** la ficha y el informe responden igual que hoy la página de la skill: 404 si la skill no existe,
está oculta o no tiene ninguna versión terminada. Los enlaces antiguos redirigen y después se aplica la misma regla
**[decisión de Claude]**.

Las secciones que escribe la IA (el resumen con nuestras palabras, «Para qué sirve y para qué no», «Cómo funciona» y la
explicación de cada archivo) **no aparecen** hasta que existan: ni huecos vacíos ni «próximamente». Si un grupo de «Qué
necesita» no tiene datos, no se muestra.

**Con la IA (fase 5)** se completan con lo que añade la IA según el apartado 7.6 del documento principal. Hay que
**añadir a lo que se le pide a la IA**: para quién es, los casos en los que sirve y en los que no, y los pasos de cómo
funciona. Al final de la ficha, cuando haya texto de la IA: «Este texto lo generó la IA a partir de los archivos de la
skill; puede contener errores. Lo que se comprobó está en el informe de análisis».

**Comentarios:** no se muestran hasta que existan **[decisión de Claude]**. La maqueta lleva un «Pronto podrás comentar»
solo para que la persona viera dónde irían.

### 4.3 El informe de análisis

El contenido actual de `/skills/<slug>` se mueve tal cual a `/skills/<slug>/analisis`, con dos cambios en la cabecera:
`SkillHeader` en lugar de `SkillTopBar`, y el botón «Reportar un problema».

**«Reportar un problema»** sustituye a «Soy el autor / reportar un error»:

- Lo ve todo el mundo. Sin sesión, el formulario solo dice que hay que iniciar sesión y da el botón para entrar.
- El formulario usa los campos de la web (`TextField` y los componentes de components/auditor/ui), sin bordes
  redondeados. Motivo: «El análisis tiene un error», «Soy el autor y quiero retirarla» u «Otro»; y la explicación.
- Explica qué pasa: «Tu solicitud llega al equipo del auditor, que la revisa y te responde por correo».
- En la fase 7, al abrirlo, dirá si se reconoce a la persona como autora («Te reconocimos como dueño de
  `ejemplo-org/skills-demo`» o «No pudimos comprobar que seas el autor; el equipo lo revisará igualmente»), con la
  comprobación del apartado 13 del documento principal. Hasta la fase 7, el envío sigue sin guardarse, como hoy.

## 5. Componentes y diseño

Se reutilizan los de la rama: `VerdictMark`, `SkillIcon`, `GitHubMark`, `Pagination`, `SkillHeader`, `PageShell wide`,
`formatCount`, `formatDay` e `isInstallable`. Las reglas de diseño de la web pública siguen valiendo: solo piezas de
components/auditor/ui sobre shadcn, sin bordes en reposo, esquinas y rayas solo al pasar el ratón, al enfocar o en lo
activo, y nada de `<Card`, `bg-muted`, `rounded-*` ni `shadow-*`.

**Datos inventados de las páginas reales** **[decisión de Claude]**: `/skills` deja de usar `getCatalog()` de
mock-data.ts y consulta la base. La ficha y el informe mantienen el respaldo actual
(`getSkillAnalysisFromDb(...) ?? getSkillAnalysis(...)`), porque los enlaces de `/mockups` a `/skills/explicar-cambios`
y las demás skills inventadas lo necesitan. Ese respaldo se quita cuando se borren las maquetas, no en este trabajo.

Las maquetas `/mockups/catalogo` y `/mockups/ficha` se quedan como referencia hasta que las páginas reales estén hechas;
después se borran junto con sus datos inventados **[decisión de Claude]**.

## 6. Pruebas

- Consultas del catálogo contra la base de prueba (marca `db`): búsqueda sin acentos, cada filtro, los recuentos que
  ignoran su propio filtro, cada orden, la página fuera de rango y la exclusión de ocultas, bloqueadas y sin terminar.
- El worker actualiza las columnas de la última versión al terminar un análisis, y no las toca si falla.
- Las redirecciones de los enlaces antiguos.
- La ficha básica sin datos de la IA no muestra ninguna sección de la IA.

## 7. Lo que se deja al constructor

Los nombres exactos de columnas, índices y funciones; cómo rellenar las columnas nuevas en la migración; y el orden de
los grupos de «Qué necesita».

