# Greener — Informe de inconsistencias y problemas detectados

Fecha de la auditoría: 18 de agosto de 2026. Metodología: no me he limitado a leer `PROGRESO.md` — he instalado las dependencias reales (`npm install`), ejecutado `lint`, `tsc --noEmit`, `npm test` y `next build` contra el código tal cual está en el zip, y contrastado los puntos técnicos dudosos (convención `proxy.ts`, API `getClaims()`, formato de keys de Supabase) contra la documentación oficial vigente en este momento, no contra memoria.

Cada hallazgo indica cómo se verificó, para que puedas reproducirlo.

---

## 🔴 Bloqueante — hay que arreglarlo antes de seguir construyendo

### 1. El build de producción no compila

`npx next build` falla con:

```
Error: Export getPinsInRange doesn't exist in target module
./src/modules/feed/application/getDemoFeedBatch.ts:1:1
```

**Causa**: `src/modules/feed/domain/continuousFeed.ts` exporta `getPinsInRange`, pero el barrel `src/modules/feed/domain/index.ts` no reexporta ese fichero (le falta `export * from "./continuousFeed";`). `getDemoFeedBatch.ts` importa esa función desde el barrel (`@/modules/feed/domain`) en vez de desde el fichero directo, así que rompe.

**Impacto**: bloquea `/api/feed/demo`, por tanto el build entero, por tanto `npm run build` tal como lo documenta `PROGRESO.md` §3.

**Contradice**: `PROGRESO.md` línea 18 — *"0 errores de TypeScript, 0 avisos de ESLint, build de producción limpio."* El build no está limpio ahora mismo.

**Fix**: una línea en `feed/domain/index.ts`. No lo he tocado porque no me pediste modificar código en esta pasada, pero es el primer ítem del checklist.

### 2. Discrepancia de nombres de variables de entorno de Supabase

- `src/lib/env.ts` valida `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (nomenclatura *legacy* de Supabase).
- `src/lib/supabase/client.ts`, `server.ts` y `proxy.ts` leen `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` directamente, con `!` (non-null assertion), sin pasar por `env.ts`.
- Tu `.env.local` real confirma que el proyecto ya usa el formato **nuevo** de keys (`sb_publishable_...`, `sb_secret_...`), no el legacy.

**Impacto doble**:
1. `env.ts` nunca falla aunque falte `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (la variable que de verdad se usa), porque valida un nombre distinto que probablemente ni existe en tu `.env.local`. Eso anula el propósito explícito de §24.5 del documento de arquitectura: *"fallar de forma explícita si falta una variable en vez de descubrirlo en producción."*
2. Ningún fichero de `lib/supabase/` importa el objeto `env` validado — leen `process.env` a pelo con `!`, así que si falta la variable en runtime, el error que verás es un `TypeError` genérico de Supabase, no el mensaje explícito y controlado que `env.ts` está diseñado para dar.

**Fix recomendado**: actualizar `env.ts` a `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` (los nombres ya correctos que usa el resto del código), y hacer que `client.ts`/`server.ts`/`proxy.ts` importen `env` en vez de `process.env` directo.

*Ya he creado `.env.local.example` a partir de tu `.env.local` real (sin secretos), con los nombres correctos — está listo para copiar a la raíz del repo.*

### 3. La suite de tests no está realmente en verde

`npm test` da: **1 fichero falla, 4 tests fallan, 1 error no gestionado**, sobre 10 ficheros / 57 tests que llegan a ejecutarse (no 59 — el fichero de smoke tests ni arranca, ver más abajo).

- **4 tests en rojo** en `tests/unit/feed/getDemoFeedBatch.test.ts`: consecuencia directa del bug #1 (`getPinsInRange is not a function`).
- **1 fichero no arranca en absoluto**: `tests/unit/masonry/components.smoke.test.tsx` falla con `Cannot find package 'jsdom'`. Causa: `@testing-library/react`, `@testing-library/jest-dom` y `jsdom` no están en `devDependencies` de `package.json` (confirmado: no aparecen), y `vitest.config.ts` tiene `environment: "node"` en vez de `"jsdom"`. El "prueba de humo con jsdom" que describe `PROGRESO.md` §2.9 nunca se ha ejecutado con las dependencias que trae este zip.

**Contradice**: `PROGRESO.md` línea 15 — *"59 tests automáticos, todos en verde."*

### 4. `tsc --noEmit` da errores reales hoy

Ejecutando `npx tsc --noEmit` tal cual (sin build previo) salen 6 errores. De ellos:

- 2 son el mismo bug del punto #1 (`getPinsInRange` no existe + un `any` implícito derivado de ahí).
- 5 son por los tipos de `@testing-library/react`/`jest-dom` que faltan (mismo problema que el punto #3).
- 1 (`Cannot find name 'LayoutProps'`) **no es un bug real**: `LayoutProps<'/'>` es el tipo de rutas tipadas que genera automáticamente Next.js 16 en `.next/types/`. Si ejecutas `tsc` sin haber corrido antes `next dev` o `next build`, ese tipo aún no existe y el error es un falso positivo. Lo confirmé generando los tipos con `next dev` y repitiendo `tsc`: el error desaparece. Vale la pena documentar en el flujo de verificación que hay que generar tipos antes de este paso (o correr `tsc` después de `next build`, no antes, como sugiere ahora mismo `PROGRESO.md` §3).

**Contradice**: `PROGRESO.md` línea 18 — *"0 errores de TypeScript."*

**Lo que sí se sostiene**: `npm run lint` da 0 errores y 0 avisos, tal cual lo documenta `PROGRESO.md`. Ese punto está verificado y es correcto.

---

## 🟡 Inconsistencias de código / documentación — no bloquean, pero conviene resolverlas

### 5. El módulo de autenticación del ABM existe y no está documentado

`src/app/admin/page.tsx`, `src/app/admin/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/lib/supabase/{client,server,proxy}.ts` y `src/proxy.ts` implementan ya el flujo completo de login con Google vía Supabase Auth, con verificación de dominio server-side en cada request (middleware/proxy + RLS `is_admin()`).

`PROGRESO.md` §4.4 dice únicamente: *"Autenticación del ABM con Google OAuth — en curso, a cargo de otra persona del equipo."* No menciona que ya hay código funcional, no hay ningún test sobre él, y no aparece en la sección "2. Paso a paso de lo realizado".

**Nota técnica positiva**: el patrón usado (`getClaims()` para verificación local vía JWKS cacheado, cliente separado para browser/server/proxy con manejo de cookies vía `@supabase/ssr`) es exactamente el patrón que la documentación oficial de Supabase recomienda ahora mismo para Next.js — no es código improvisado, está bien orientado. Lo que falta es integrarlo en el relato de progreso y cubrirlo de tests.

**Acción sugerida**: habla con tu compañera antes de tocar esos archivos, y decidid juntos si ya se puede dar por "hecho, pendiente de test" en `PROGRESO.md`.

### 6. Import que rompe la convención del alias `@/*`

`src/app/auth/callback/route.ts`:

```ts
import { createClient } from '../../../../src/lib/supabase/server'
```

Funciona (resuelve bien a `src/lib/supabase/server.ts`), pero ignora la convención fijada en §24.6 de la arquitectura, que existe precisamente para evitar rutas relativas largas. Debería ser `import { createClient } from '@/lib/supabase/server'`.

### 7. Falta el parámetro `hd` en el login de Google

`src/app/admin/login/page.tsx` llama a `signInWithOAuth` sin `queryParams: { hd: '...' }`. El documento de arquitectura (§15.2) especifica explícitamente ese parámetro como sugerencia de UI para limitar qué cuentas ofrece Google en el selector — no es un fallo de seguridad (la restricción real ya está bien implementada vía `is_admin()`), pero es una desviación literal de la especificación, fácil de arreglar.

### 8. `tag_section` conserva el valor `'shop'` pese a la exclusión total de Shop

La migración `20260806090000_enums.sql` define `tag_section as enum ('home', 'insights', 'tools', 'channel', 'shop')`. Esto viene heredado tal cual del propio documento de arquitectura (§7.5), que en este punto se contradice a sí mismo: el principio §3 dice *"no se implementan tablas ni endpoints de Shop 'por si acaso'"* y el ADR-10 excluye Shop por completo, pero el enum sigue reservando el valor.

No es grave (es un valor de enum, no una tabla ni un endpoint), pero conviene una decisión explícita: ¿se retira, o se deja documentado como hueco reservado a propósito para cuando Shop se aborde como módulo posterior?

### 9. ADR-11 (reasignación 70/15/5/5/5) implementado pero no cerrado formalmente

La migración `20260806090500_feed_taxonomy.sql` ya usa los ratios propuestos (70/15/5/5/5) como valor por defecto de `feed_config`, pero su propio comentario SQL dice *"Ratios provisionales: ADR-11 pendiente de confirmar (Anexo A)"*, y el Anexo A del documento de arquitectura sigue listando esa decisión como pendiente con fecha límite "antes del kickoff técnico (8 ago)" — fecha ya pasada. El código da la decisión por hecha; el papel, no. Cerradlo explícitamente con Greener y limpiad el comentario.

### 10. `supabase/.temp/` expone identificadores del proyecto real

Ese directorio (generado por la CLI de Supabase al hacer `supabase link`) contiene, en texto plano dentro del zip que me compartiste: el `project-ref` real (`tsznseudpcnfixfwpxag`), el nombre del proyecto (`web-greener`), el `organization_id`/slug, y la pooler URL de conexión (sin contraseña — la CLI la guarda aparte, así que esto en concreto no es una fuga de credenciales, pero sí de identificadores). El `.gitignore` que confirmas que usáis es el básico de `create-next-app` y no cubre `supabase/.temp/` (la CLI de Supabase normalmente genera su propio `supabase/.gitignore` con esa carpeta al hacer `supabase init`, y aquí no está).

**Acción sugerida**: añadir `supabase/.temp/` (y `supabase/.branches/` si algún día usáis branching) al `.gitignore`, y evitar compartir esa carpeta en zips o capturas hacia fuera del equipo.

### 11. No hay `supabase/config.toml` en el repo

Sin él, nadie más del equipo puede levantar el entorno local de Supabase de forma reproducible con `supabase start` (puertos, providers de auth locales, etc. quedan sin fijar). Puede que exista en tu máquina y simplemente no se haya incluido en el zip — confírmalo y, si es así, añádelo al repo.

### 12. `supabase/policies/` existe vacía

El Anexo B contempla una carpeta separada para políticas RLS, pero la implementación real las mete todas dentro de la migración `..._rls_policies.sql` — que de hecho es la práctica estándar recomendada por Supabase (las políticas son parte del esquema versionado). No es un error, es mejor que la propuesta original del Anexo B. Sugerencia: borrar la carpeta vacía o añadir una nota en el Anexo B de que se descarta esa subdivisión, para que no quede como "trabajo pendiente" fantasma.

---

## 🟢 Housekeeping menor

- `src/modules/feed/application/` tiene un `.gitkeep` residual conviviendo con `getDemoFeedBatch.ts`, que ya no hace falta.
- Cabeceras globales de seguridad (§17.1: HSTS, CSP, `frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options`) solo están puestas en la ruta de tools; el resto del sitio (público y `/admin`) todavía no las tiene. No es una inconsistencia — sencillamente no se ha llegado ahí todavía —, pero apúntalo para la fase de hardening (§20, Fase 5).

---

## Lo que la auditoría confirma que SÍ está bien

Para que quede claro que esto no es solo una lista de problemas:

- El motor de feed (`src/modules/feed/domain/`) es dominio puro, sin dependencias de Next.js/Supabase, tal como pide §24.4 — confirmado leyendo el código, no solo el `PROGRESO.md`.
- Los breakpoints de masonry (`BREAKPOINTS` en `layout.ts`) coinciden exactamente, byte a byte, con la tabla de §10.1 del documento de arquitectura.
- El menú lateral (`useShell.ts`) tiene exactamente las 5 entradas del brief, sin "Casos" ni "Shop" — coincide con la especificación.
- Las políticas RLS (`is_admin()` + políticas por tabla) siguen fielmente el modelo de §15.2/§17.1: lectura pública solo de `published`, escritura solo para dominios en `admin_allowed_domain`.
- `src/proxy.ts` es la convención correcta y actual de Next.js 16 (verificado contra la documentación oficial) — no es un error, aunque a primera vista pueda parecerlo si esperas `middleware.ts`.
- `getClaims()` en el flujo de auth es el método actualmente recomendado por Supabase para este patrón SSR, no una API improvisada.
