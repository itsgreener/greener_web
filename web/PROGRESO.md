# Greener — Estado del proyecto y próximos pasos

Este documento resume, paso a paso, todo lo construido hasta ahora en el repositorio `greener-web`, cómo verificarlo, y qué queda pendiente. Complementa (no sustituye) el documento de **Arquitectura técnica V1.3**, que sigue siendo la fuente de verdad de las decisiones de diseño; aquí se documenta la ejecución concreta de esa arquitectura, en orden de prioridad real.

Sustituye a las versiones anteriores de `PROGRESO.md` y `CHECKLIST.md` — a partir de ahora este es el único documento de estado. Actualízalo cuando cierres un bloque de trabajo real, no en cada commit menor; si algo que documenta deja de ser cierto, corrígelo aquí mismo en vez de dejarlo desactualizado (ya ha pasado una vez — ver §6).

Todas las referencias `§X` apuntan a secciones del documento de arquitectura. Última revisión: 18 de agosto de 2026, verificada ejecutando el código real (no solo por lectura).

---

## 1. Resumen ejecutivo

La **Fase 0** del plan de ejecución (Anexo E) está completa: el motor de feed y el contrato de tools/insights sin iframe —las dos piezas de mayor riesgo técnico— están implementados, probados automáticamente y funcionando de extremo a extremo. El esquema de datos de Supabase está migrado y su seguridad (RLS) validada con casos reales. Además, ya existe una implementación funcional (sin tests todavía) del login del ABM con Google OAuth.

Todo el housekeeping detectado en la auditoría del 18 de agosto que bloqueaba o ensuciaba el proyecto está resuelto y reverificado a cierre de esa misma jornada: build roto, dependencias de test que faltaban, y la discrepancia de nombres de variables de entorno. Quedan abiertos, sin urgencia técnica, el parámetro `hd` del login y dos decisiones de negocio a cerrar con Greener (ver §4.1 y §5).

**Cifras actuales, verificadas a fecha de hoy:**

- **59 tests automáticos, todos en verde** (`npm test`).
- **0 errores de TypeScript**, **0 avisos de ESLint**, **build de producción limpio** (`npm run build`).
- **8 migraciones SQL** de Supabase, aplicadas y probadas contra una base de datos real.
- **50 casos + 9 episodios** de datos de demostración, generados, cargados y validados contra Postgres real, y consumidos con éxito por el motor de feed real.

---

## 2. Paso a paso de lo realizado

### 2.1 Scaffold del proyecto

- Next.js **16.3.x** (App Router, Turbopack) + React **19.2.8** + TypeScript, siguiendo la estructura de carpetas del Anexo B: `src/app`, `src/modules/{content,feed,media,packages,admin,analytics}` organizados en capas `domain/application/infrastructure` (§24.4), `src/components`, `src/lib`.
- Alias de imports `@/*` → `./src/*` configurado explícitamente en `tsconfig.json` (§24.6).
- **ESLint + Prettier** configurados y en verde en todo el proyecto.
- `src/lib/env.ts`: validación de variables de entorno con `zod` al arrancar la aplicación (§24.5), con los nombres reales (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) — corregido el 18 ago, y ya usado por `lib/supabase/{client,server,proxy}.ts` en vez de leer `process.env` directo.
- `.env.local.example`: plantilla de todas las variables necesarias (Supabase, Cloudinary), sin secretos reales — regenerada el 18 ago a partir del `.env.local` real.
- `next.config.ts`: `remotePatterns` configurado para que `next/image` pueda optimizar imágenes servidas desde Cloudinary.
- Fuente del sitio: se evitó `next/font/google` (requiere red en build time, arriesgado en el hosting de Dinahosting) a favor de fuentes de sistema.
- `src/proxy.ts` (no `middleware.ts`): Next.js 16 renombró el fichero de middleware a `proxy.ts` — está usado correctamente, no es un error a corregir.

### 2.2 Shell público (menú lateral)

- `src/components/shell/Shell/`: componente + hook (`useShell`) siguiendo la convención de carpeta de §24.2.
- `src/app/(public)/layout.tsx`: monta el `Shell` una única vez para toda la sección pública (§24.3).
- Menú confirmado fiel al brief: Home / Insights / Tools / Channel / Contacto — sin "Casos" ni "Shop".
- CSS Modules con nesting nativo (`&`) y variables globales en `src/app/globals.css` (§24.1).

### 2.3 Esquema de Supabase (completado y validado)

**8 migraciones** en `supabase/migrations/`, siguiendo el modelo de datos de §7:

| Archivo | Contenido |
| --- | --- |
| `..._enums.sql` | Tipos enumerados compartidos |
| `..._content_core.sql` | Supertipo `content` + `content_translation` |
| `..._content_blocks.sql` | Bloques de contenido genéricos (`content_block`), reutilizables por `case` y `page` |
| `..._content_type_extensions.sql` | `case_detail`, `episode`, `html_package(_version)` |
| `..._media_pins.sql` | `media_asset`, `pin`, `pin_media` |
| `..._feed_taxonomy.sql` | `tag`, `content_tag`, `feed_config`, `feed_session`, `feed_round` |
| `..._admin_access.sql` | `admin_allowed_domain`, `admin_profile`, `redirect_301`, `audit_log` |
| `..._rls_policies.sql` | Función `is_admin()` + políticas de Row Level Security en **todas** las tablas |

**Validación real, no solo revisión del SQL:** aplicadas contra PostgreSQL 16 real, probadas con un rol sin privilegios de superusuario (visitante anónimo → solo `published`; dominio autorizado → todo; dominio no autorizado → bloqueado; dos intentos de suplantación por substring de dominio → ambos rechazados).

**Nota pendiente de cierre formal:** `feed_config` ya usa por defecto los ratios reasignados de ADR-11 (70% casos / 15% insights / 5% tools / 5% channel / 5% otros), pero el propio comentario SQL de la migración y el Anexo A del documento de arquitectura siguen marcando esa decisión como "pendiente de confirmar". El código ya la da por hecha — falta cerrarla formalmente con Greener y limpiar el comentario.

**Nota pendiente de decisión:** el enum `tag_section` conserva el valor `'shop'` pese a que Shop está excluido por completo de V1 (ADR-10, §3 "sin código muerto"). Decidir si se retira o se documenta como hueco reservado a propósito.

**Decisión de negocio confirmada:** el "administrador único" del brief se reinterpretó como **rol único, multiusuario por dominio de correo**, no varias cuentas nombradas una a una.

### 2.4 Motor de feed (completado y validado)

Implementado en `src/modules/feed/domain/` como módulo de dominio puro (sin dependencia de Next.js ni Supabase, §24.4): `prng.ts`, `quotas.ts`, `rotateQueue.ts`, `constrainedMix.ts`, `generateRound.ts`, `continuousFeed.ts` (extensión para scroll continuo, concatena tandas bajo demanda).

**Todos exportados correctamente desde `src/modules/feed/domain/index.ts`** — este barrel dejó de reexportar `continuousFeed.ts` en algún punto del desarrollo, lo que rompía el build de producción entero (`getPinsInRange is not a function`) y 4 tests. Corregido el 18 de agosto.

**21+ tests** (`tests/unit/feed/` + `tests/property/feed/`, property-based con `fast-check`, 2000 ejecuciones por propiedad), verificando los criterios de §20.1: determinismo, terminación garantizada, conservación exacta de pines, separación mínima con relajación registrada, casos límite.

**Dos bugs de diseño reales, encontrados por tests de propiedad y corregidos** durante la implementación original: reparto de cuotas sobre el total en vez del hueco que dejan los casos; redistribución cuando un tipo de contenido no tiene ningún pin en el universo.

### 2.5 Tools/Insights sin iframe (completado y validado)

Implementado en `src/modules/packages/` (domain/application/infrastructure, §24.4). Rutas servidas en `src/app/(public)/tools/[slug]/`, con CSP específico de ruta. Tool de ejemplo real (`fixtures/tools/pixel-palette/`): canvas + Web Worker + descarga — las tres capacidades de mayor riesgo de §22.

**10 tests**: 6 sobre composición del documento, 4 ejecutando el `worker.js` real dentro de un sandbox de Node. Validado también por HTTP real (`next build` + `next start` + `curl`).

**Problema real resuelto durante la implementación:** rutas relativas del paquete mal resueltas sin barra final en la URL — corregido inyectando `<base href>`.

### 2.6 Política de medios (Cloudinary)

`src/modules/media/`: `domain/mediaLimits.ts` (límites puros: 5 MB imagen, 100 MB / 3 min vídeo), `domain/mediaDelivery.ts` (regla "el feed nunca sirve el original"), `infrastructure/cloudinaryUrl.ts` (construcción de URLs `q_auto`/`f_auto`).

### 2.7 Dataset de datos falsos (completado y validado)

`scripts/generate-demo-data.mjs`: generador determinista. 50 casos (219 pines), 9 episodios de Channel (vídeos de YouTube de terceros, solo para probar el embed), 6 imágenes de la cuenta demo de Cloudinary verificadas por HTTP real. Sin insights ni tools (se suben manualmente).

Salidas: `supabase/seed_demo_data.sql` (aplicado y validado con integridad referencial: 0 huérfanos) y `data/demo/feed-snapshot.json`. Cierra el ciclo con el motor de feed real vía `tests/unit/dataset/demoDataset.test.ts`.

### 2.8 Prototipo de masonry (completado y validado)

`src/modules/masonry/domain/`: `layout.ts` (shortest-column-first desde el ratio cerrado, sin medir DOM — breakpoints verificados exactos, byte a byte, contra la tabla de §10.1) y `virtualization.ts` (batch visible ± 2, espaciadores que conservan scroll).

`/api/feed/demo` — endpoint temporal del prototipo (no es el `/api/feed/sessions` final de §16.1: no persiste sesión/ronda, no firma cursor). Componentes React en `/preview/masonry`, ruta separada de la Home real.

**28 tests**, en 4 niveles: propiedad del layout (500 runs), virtualización, smoke test con `jsdom`/`@testing-library/react` (dependencias que faltaban en `package.json` hasta el 18 de agosto — añadidas y verificadas), y build + servidor real + `curl`.

### 2.9 Login del ABM — implementado, sin documentar hasta ahora, sin tests

`src/app/admin/{page.tsx,login/page.tsx}`, `src/app/auth/callback/route.ts`, `src/lib/supabase/{client,server,proxy}.ts`, `src/proxy.ts`: flujo completo de login con Google vía Supabase Auth, con verificación de dominio server-side en cada request (`proxy.ts` + RLS `is_admin()`), usando `getClaims()` — el patrón actualmente recomendado por Supabase para SSR con Next.js, no código improvisado.

**Qué falta**: tests (no hay ninguno todavía); el parámetro `hd` en `signInWithOAuth` (§15.2 lo especifica como sugerencia de UI, no es un fallo de seguridad porque la restricción real ya está bien implementada server-side); confirmar con quien lo esté llevando en el equipo que se puede dar por "hecho, pendiente de test".

### 2.10 Corrección de versiones

`package.json` refleja las versiones reales (`next@16.3.x`, `react@19.2.8`).

---

## 3. Cómo verificar todo esto tú mismo

```bash
npm install
npm run lint            # ESLint
npx next build            # build de producción — genera también los tipos de ruta (.next/types)
npx tsc --noEmit           # TypeScript — hazlo DESPUÉS de next build/dev, si no da falsos positivos de LayoutProps
npm test                   # 59 tests (unit + property-based + smoke con jsdom)
node scripts/generate-demo-data.mjs   # regenera el dataset (determinista)
```

Para probar la tool de ejemplo en vivo: `npm run build && npm run start` → `http://localhost:3000/tools/pixel-palette`.

Para aplicar el esquema contra un proyecto Supabase real: `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push` (instrucciones completas en `supabase/README.md`).

---

## 4. Próximos pasos — checklist por fases

Basado en el Anexo E ("paso a paso óptimo de ejecución") del documento de arquitectura, cruzado con el estado real verificado. `[x]` hecho y verificado · `[~]` hecho parcialmente / sin verificar del todo · `[ ]` pendiente.

### 4.1 Housekeeping inmediato

- [x] Arreglar el export roto en `feed/domain/index.ts` (bloqueaba el build y 4 tests) — **hecho el 18 ago**.
- [x] Añadir `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` a `devDependencies` — **hecho el 18 ago**, no hizo falta tocar `vitest.config.ts` (el test ya usaba `// @vitest-environment jsdom` por fichero).
- [x] Crear `.env.local.example` real — **hecho el 18 ago**.
- [x] Actualizar `src/lib/env.ts` a los nombres reales de variable (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) y hacer que `lib/supabase/{client,server,proxy}.ts` importen `env` en vez de leer `process.env` directo — **hecho el 18 ago**. Nota: el primer intento solo añadió el import sin sustituir los usos de `process.env.X!`, lo que dejaba 3 avisos de ESLint (`no-unused-vars`) y no resolvía el problema de fondo; corregido reemplazando `process.env.X!` por `env.X` en los tres archivos.
- [x] Corregir el import relativo de `src/app/auth/callback/route.ts` para usar el alias `@/*` — **hecho el 18 ago**.
- [ ] Añadir `queryParams: { hd: '...' }` al `signInWithOAuth` de `admin/login/page.tsx`.
- [x] Añadir `supabase/.temp/` al `.gitignore` — **hecho el 18 ago**. Pendiente aparte, sin urgencia: confirmar si `supabase/config.toml` existe localmente y, si es así, versionarlo para que el resto del equipo pueda levantar Supabase local.
- [ ] Decidir y cerrar con Greener: `'shop'` en `tag_section` — ¿se retira o se documenta como reservado?
- [ ] Cerrar formalmente ADR-11 (70/15/5/5/5) con Greener y limpiar el comentario de "pendiente" en la migración.
- [ ] Confirmar con quien lleve el login del ABM el estado real de esa parte y añadir tests.

### 4.2 Fase 1 (hasta el 15 de agosto)

- [ ] **Repertorio de bloques y restricciones de las variantes A/B/C de caso** (§11.3) — bloqueado por diseño; bloquea a su vez la especificación de contenido (Anexo A.1) y el editor de bloques del ABM.
- [ ] Especificación de formatos para Greener (Anexo A.1) — depende del punto anterior.
- [ ] Inventario de URLs actuales para las redirecciones 301 — no depende de nada más, se puede hacer ya.
- [ ] Ajustar el algoritmo de layout con el diseño real cuando esté disponible (breakpoints actuales: propuesta técnica confirmada fiel a §10.1, pendiente de validar por diseño).

### 4.3 Fase 2 (hasta el 1 de septiembre) — ABM base

- [~] Autenticación Google OAuth vía Supabase Auth — código presente, sin tests, sin confirmar (§2.9).
- [ ] CRUD de `content` y extensiones vía Server Actions + zod.
- [ ] Subida de pines: alta individual, luego carga masiva por CSV (§15.4, ~500 pines iniciales).
- [ ] Subida de paquetes HTML (ZIP) con validaciones §12.5, sirviendo desde Supabase Storage real en vez de `fixtures/`.
- [ ] Estados `draft`/`scheduled`/`published`/`preview` + preview firmado.
- [ ] Cliente de Supabase browser/server extendido a `content`/`feed`/`media` (hoy solo cubre auth).
- [ ] `/api/feed/sessions` real (§16.1): sustituye a `/api/feed/demo`.

### 4.4 Fase 3 (hasta el 15 de septiembre)

- [ ] Home y subhomes con el feed real.
- [ ] Página de caso con las tres variantes (bloqueado hasta que Fase 1 cierre el repertorio de bloques).
- [ ] Restauración de scroll y semilla de sesión contra datos reales.
- [ ] Primeras métricas reales de LCP/CLS.

### 4.5 Fase 4 (hasta el 22 de septiembre)

- [ ] Insights y Tools en producción sobre Supabase Storage real.
- [ ] Channel, con afinidad de episodios (§13.1).
- [ ] Contacto y Mailchimp con doble opt-in.
- [ ] Páginas legales.
- [ ] Analítica Plausible (§18.2).
- [ ] Cabeceras de seguridad globales (HSTS, CSP, `frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options`) para el resto del sitio — hoy solo están en `/tools`.

### 4.6 Fase 5 (26-30 de septiembre) — QA y cierre

- [ ] Tests E2E de los criterios de aceptación críticos de §20.1.
- [ ] Auditoría de cookies y consentimiento (Plausible, YouTube-nocookie, Vimeo, Spotify).
- [ ] Verificación de las redirecciones 301.
- [ ] Accesibilidad: teclado, foco, `alt`, contraste, `prefers-reduced-motion`, carrusel, menú solo-iconos con labels.
- [ ] Carga real de contenido por Greener contra el ABM ya terminado.

### 4.7 1 de octubre — Publicación y monitorización reforzada

---

## 5. Decisiones pendientes con Greener (Anexo A.2)

Ninguna depende de escribir código — bloquean trabajo posterior si no se cierran a tiempo.

| Decisión | Bloquea | Estado |
| --- | --- | --- |
| Reasignación 5% Shop → Channel (ADR-11): 70/15/5/5/5 | Datos de prueba del feed | Implementado en código; falta cierre formal |
| Repertorio de bloques y restricciones de variantes A/B/C | Editor de bloques del ABM + especificación de contenido | Abierto — depende de diseño |
| Pesos y bitrates máximos de imagen/vídeo | LCP y consumo móvil predecibles | Abierto |
| Alcance real del dominio permitido en el ABM (§15.2) | Módulo de Acceso del ABM | Abierto — ¿todo el dominio corporativo o sub-allowlist para contratistas? |
| Límites del plan de Cloudinary frente al volumen real | `eager transformations` vs bajo demanda | Abierto |
| Auditoría de embeds y cookies de terceros (Vimeo, Spotify) | Si hace falta banner de consentimiento antes de Channel | Abierto |
| Traducción asistida por IA en el ABM (opcional) | Si se incluye en V1 o se deja fuera | Abierto, no bloqueante |

---

## 6. Historial de correcciones a este documento

- **18 ago 2026 (cierre de jornada)**: aplicados y reverificados de extremo a extremo (lint, `tsc --noEmit`, 59/59 tests, `next build`) los cuatro fixes de housekeeping abiertos por la mañana:
  - Export roto en `feed/domain/index.ts` (bloqueaba el build entero).
  - Dependencias de test que faltaban (`@testing-library/react`, `@testing-library/jest-dom`, `jsdom`).
  - `env.ts` con los nombres reales de variable, y `client.ts`/`server.ts`/`proxy.ts` usando `env.X` en vez de `process.env.X!` (el primer intento solo añadió el import sin sustituir los usos; quedaban 3 avisos de ESLint hasta completarlo).
  - Import relativo largo en `auth/callback/route.ts`, ahora con el alias `@/*`.

  Quedan abiertos sin urgencia: el parámetro `hd` en el login de Google, y las dos decisiones de negocio con Greener (§5). El `.gitignore` ya incluye `/supabase/.temp/`.

- **18 ago 2026 (mañana)**: fusión de `PROGRESO.md` y `CHECKLIST.md` en un único documento. Se corrigieron afirmaciones que ya no eran ciertas ("59 tests todos en verde", "0 errores de TypeScript", "build de producción limpio" — no lo estaban en ese momento por un export roto y dependencias de test que faltaban; ambos corregidos y reverificados el mismo día). Se documentó por primera vez el login del ABM, que ya tenía código funcional sin reflejar en el documento anterior.
- Decisiones y confirmaciones previas: admin como rol único multiusuario por dominio; `client`/`sector`/`services` de caso sin traducir; Cloudinary sustituye a Supabase Storage para imagen/vídeo; tools/insights sin iframe, validado con una tool real; Next.js 16.3.x / React 19.2.8 confirmados como versiones reales del proyecto; dataset de demostración sin insights ni tools.
