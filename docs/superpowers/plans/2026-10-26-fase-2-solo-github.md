# Fase 2 · Solo GitHub: plan de implementación

> **Para quien ejecuta:** Claude orquesta y revisa; Codex (`gpt-6-luna`, razonamiento high) programa cada tarea en
> segundo plano. Los pasos usan casillas (`- [ ]`) para seguir el avance.

**Objetivo:** que al auditor solo se pueda entrar con GitHub y que el primer admin se cree con GitHub en `/auth/setup`.

**Arquitectura:** el cambio se hace directamente en el auditor, sin pasar por la plantilla (decisión de la persona del
2026-10-26). Better Auth queda solo con GitHub: el correo y la contraseña se apagan. Todo lo que dependía de la contraseña
se cierra en el servidor y desaparece de la interfaz. El primer admin usa el mismo camino que el registro con GitHub, con
una marca propia en el estado de OAuth.

**Stack:** Next.js 16, Better Auth 1.7, Prisma, shadcn/ui y Bun.

**Diseño:** `docs/superpowers/specs/2026-10-25-auditor-skills-design.md`, apartados 3.1, 17 (fase 2) y 18.2.

## Restricciones globales

- **Repositorio y rama:** `~/Desktop/auditor-skills`, rama `feat/solo-github`, creada desde `main`.
- **Rutas de Better Auth:** `/api/auth` sigue cerrado; la lista de rutas permitidas no se toca. El callback de GitHub ya
  está permitido.
- **Comprobación en el servidor:** toda server action que dependa de la contraseña se rechaza en el servidor. Que no
  aparezca en la interfaz no basta (decisión de la persona).
- **Tema Classic:** después de tocar `app/auth`, `components/auth` o `components/landing-content.tsx`, se ejecuta
  `bun run theme:sync-classic`.
- **Dependencias:** ninguna nueva. Tampoco `bunx shadcn add` ni cambios en `components/ui/`.
- **Codex no hace:**
  - Git de escritura ni `bun run dev`;
  - nada con Engram ni con `.playwright-mcp/`;
  - tocar contenedores o volúmenes `rapidauth*`;
  - controlar las aplicaciones de la persona.
- **Build:** con las variables de prueba de CI.
- **Git:** sin atribución a IA en los commits ni en el PR. La persona sube la rama e integra.
- **Idioma:** lo técnico, en inglés. Las pantallas de inicio de sesión de la plantilla siguen en inglés por ahora; su
  traducción es un pendiente aparte. Los textos nuevos van en el idioma de la pantalla donde aparecen.

## Decisiones de Claude (revísalas)

1. **Se cierran, no se borran:** las páginas y las acciones de la contraseña se quedan en el código, cerradas, para que
   traer mejoras de la plantilla dé menos conflictos. Sus páginas responden 404 (`notFound()`) y sus acciones devuelven
   un error. Las páginas son `forgot-password`, `reset-password`, `verify-email`, `email-verified`, `accept-invite`,
   `change-password` y `two-factor`. `/auth/register` sigue, porque desde ahí se acepta el aviso legal y se crea la cuenta
   con GitHub.
2. **Carrera entre dos primeros admins:** el ascenso a admin se hace después de crear el usuario, en una transacción
   `Serializable`, igual que hace hoy `first-admin.ts`. Si otra persona ganó la carrera, la segunda queda como usuario
   normal.
3. **Sin el id o el secreto de GitHub**, la app arranca igual (las pruebas de Docker de CI la arrancan sin ellos). El
   resumen de arranque muestra «GitHub: off», y el login, el registro y `/auth/setup` muestran el aviso «GitHub sign-in
   is not configured» en lugar del botón. Un par a medias sigue siendo un error de arranque, como en la plantilla.
4. **Pruebas:** el repositorio no tiene pruebas automáticas. Esta fase no añade un sistema de pruebas, porque no está
   pedido. Se valida con typecheck, lint, build y un recorrido en el navegador (tarea 4).

## Puntos que más pueden fallar (se revisan en la tarea 4)

1. **Llamar a mano a una acción cerrada** (`signInAction`, `addUserAction`…): responde con error y no escribe en la base.
2. **Entrar con GitHub desde `/auth/setup` cuando ya hay admin** (otra pestaña, o la ventana de 15 minutos cerrada): no se
   asciende a nadie.
3. **Segunda cuenta de GitHub después del admin:** queda como usuario normal, sin acceso a `/dashboard/auditor/*`.
4. **GitHub con el correo oculto o sin verificar:** se ve el error en `/auth/login`, no una pantalla rota.
5. **Admin con GitHub:** `getAdminAccess` lo deja pasar sin el doble factor de la app, porque el doble factor lo pone
   GitHub (ya es así en la plantilla).

---

### Tarea 1: Solo GitHub en Better Auth y cerrar en el servidor lo que usa contraseña

**Archivos:**
- Crear: `lib/password-auth.ts` (sin `"use server"`).
- Modificar:
  - `lib/auth.ts` (`emailAndPassword.enabled: false`);
  - `lib/social-providers.ts` (solo GitHub);
  - `lib/env.ts`: sin Google (la lógica de los pares no cambia; ver la decisión 3);
  - las acciones de `actions/auth/sign-in.ts`, `sign-up.ts`, `password.ts`, `verify-email.ts`, `accept-invite.ts` y
    `first-admin.ts`, y de `actions/users.ts`;
  - las páginas de la decisión 1, en `app/auth/*/page.tsx`.

**Interfaces que produce:** en `lib/password-auth.ts`, `PASSWORD_AUTH_DISABLED_MESSAGE = 'Email and password sign-in
is disabled. Sign in with GitHub.'` y `passwordAuthDisabled()`. Esta función devuelve
`{ response: 'error', message: PASSWORD_AUTH_DISABLED_MESSAGE, data: null }`; donde la respuesta de una acción tenga otra
forma, se adapta.

**Pasos:**
- [ ] Al principio de cada acción de esta lista, antes de validar o de leer la base, devolver `passwordAuthDisabled()`:
  - `signInAction`, `resendVerificationCodeAction`, `signUpAction` y `verifyEmailCodeAction`;
  - `forgotPasswordAction`, `resetPasswordWithCodeAction` y `changePasswordAction`;
  - `acceptInviteAction` y `createFirstAdminAction`;
  - `addUserAction`, `resendUserInvitationAction` y `adminResetPasswordAction`.
- [ ] Las páginas de la decisión 1 llaman a `notFound()`.
- [ ] Validar:
  - typecheck, lint, build y `theme:sync-classic --check`, sin errores;
  - `grep -n "passwordAuthDisabled" actions/auth/*.ts actions/users.ts` da una llamada en cada acción de la lista.

### Tarea 2: Interfaz solo con GitHub

**Archivos:**
- Modificar:
  - `components/auth/login-form.tsx`, `register-form.tsx` y `register-fields.tsx`;
  - `app/auth/login/page.tsx` y `app/auth/register/page.tsx`;
  - la página y los componentes de usuarios del panel (`components/dashboard/users/*`, empezando por el botón «Add user»
    y por `user-actions.tsx`);
  - `components/landing-content.tsx` y `app/(legal)/privacy/page.tsx`, si alguno de sus enlaces o textos habla de la
    contraseña o de Google.
- Después, `bun run theme:sync-classic`.

**Pasos:**
- [ ] Login con un solo botón, «Continue with GitHub», y su texto de cabecera, sin estos elementos:
  - los campos y el botón «Sign in»;
  - el separador;
  - el enlace «Forgot password?»;
  - el botón de Google.
- [ ] Registro: la casilla del aviso legal, sacada de `RegisterFields` a su propio componente, y el botón de GitHub, que
  sigue apagado hasta marcarla.
- [ ] Panel de usuarios: sin «Add user», «Resend invitation» ni «Reset password».
- [ ] Validar:
  - typecheck, lint, build y `theme:sync-classic --check`, sin errores;
  - `git diff --stat` sin cambios en `components/ui/`.

### Tarea 3: Primer admin con GitHub en `/auth/setup`

**Archivos:**
- Modificar:
  - `actions/auth/first-admin.ts` (acción nueva) y `actions/auth/index.ts` (exportarla);
  - `lib/auth.ts` (`hooks.before` y `databaseHooks.user.create.after`);
  - `lib/first-run-admin.ts` y `lib/first-run-admin-messages.ts`;
  - `app/auth/setup/page.tsx` y `components/auth/first-run-admin-form.tsx`;
  - `docs/en/00-manual-setup.md` y `docs/es/00-manual-setup.md` (el primer arranque).

**Interfaces que produce:**
- `startFirstAdminWithGithubAction(values: unknown): Promise<{ response: 'success' | 'error'; message: string; data:
  null }>`. Valida `{ acceptTerms: true }`, comprueba `getFirstRunState() === 'open'` y llama a `auth.api.signInSocial`
  con:
  - `provider: 'github'` y `requestSignUp: true`;
  - `additionalData: { termsAccepted: true, firstRunAdmin: true }`;
  - `callbackURL: '/dashboard'`;
  - `errorCallbackURL: '/auth/setup'`.
- En `lib/first-run-admin.ts`: `promoteFirstRunAdmin(userId: string): Promise<boolean>`. Hace una transacción
  `Serializable`:
  - si ya hay admin o la ventana está cerrada, devuelve `false`;
  - si no, pone `role: 'admin'` y escribe el `activityLog` `register` con `{ method: 'first-run', role: 'admin' }`.

  Un error P2034 devuelve `false`.

**Pasos:**
- [ ] En `hooks.before`: si `additionalData.firstRunAdmin === true`, añadir `firstRunAdmin: true` al contexto del
  servidor de OAuth, junto a `termsAccepted`.
- [ ] En `databaseHooks.user.create.after`: si la ruta empieza por `/callback/` y el estado de OAuth trae
  `firstRunAdmin`, llamar a `promoteFirstRunAdmin`.
- [ ] `/auth/setup`: la casilla del aviso legal y el botón «Create the administrator with GitHub», sin el formulario de
  correo.
- [ ] Validar: typecheck, lint, build y `theme:sync-classic --check`, sin errores.

### Tarea 4: Prueba en el navegador, documento de diseño y commit

**Requisito de la persona:** una OAuth App de GitHub para el entorno local. Claude le explica cuándo y cómo crearla. Su
id y su secreto van en `docker/.env` del auditor, que no se sube a Git y nunca va a Engram.

**Pasos:**
- [ ] Vaciar la base local del proyecto `auditor-skills` para que no haya admin. La persona ya lo autorizó; los volúmenes
  `rapidauth*` no se tocan.
- [ ] Recorrido con Playwright en http://localhost:3100:
  - las páginas de la decisión 1 dan 404;
  - el login y el registro solo muestran GitHub;
  - una llamada directa a `signInAction` y a `addUserAction` responde con error (punto 1).
- [ ] La persona entra con su GitHub desde `/auth/setup` y queda como admin, con acceso a `/dashboard/auditor/queue`.
  Una segunda cuenta queda como usuario (puntos 2, 3 y 4).
- [ ] Documento de diseño:
  - en el 3.1, se hace en el auditor y no en la plantilla, y así se crea el primer admin;
  - en el 18.2, el pendiente queda cerrado;
  - el texto sobre las invitaciones sin contraseña;
  - en el 11, se quita «el remoto `plantilla` se configura en la fase 2»;
  - en el 18.3, cerrado: el auditor tiene su propio proyecto en Engram, `auditor-skills`, desde el 2026-10-26.
- [ ] El commit incluye `.forge614/project.json` con la identidad nueva de Engram.
- [ ] Validar:
  - typecheck, lint, `theme:sync-classic --check`, `deps:check`, el comprobador del CSS del auditor y el build con las
    variables de prueba de CI;
  - la búsqueda del nombre de la referencia visual, vacía.
- [ ] Commit local, con el pre-commit, de este plan y del código: `feat(auth): solo GitHub y primer admin con GitHub`.

**Parada (la de la fase 2 en el diseño):** la persona entra con su GitHub en local y queda como admin. Después sube
`feat/solo-github`, abre el PR y lo integra.
