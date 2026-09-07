# Greener — Estado del proyecto y próximos pasos

Este documento resume, paso a paso, todo lo construido hasta ahora en el repositorio `greener-web`, cómo verificarlo, y qué queda pendiente. Complementa (no sustituye) el documento de **Arquitectura técnica V1.3**, que sigue siendo la fuente de verdad de las decisiones de diseño; aquí se documenta la ejecución concreta de esa arquitectura, en orden de prioridad real.

Sustituye a las versiones anteriores de `PROGRESO.md` y `CHECKLIST.md` — a partir de ahora este es el único documento de estado. Actualízalo cuando cierres un bloque de trabajo real, no en cada commit menor; si algo que documenta deja de ser cierto, corrígelo aquí mismo en vez de dejarlo desactualizado (ya ha pasado una vez — ver §6).

Todas las referencias `§X` apuntan a secciones del documento de arquitectura. Última revisión: 7 de septiembre de 2026, verificada ejecutando el código real (no solo por lectura).

---

## 1. Resumen ejecutivo

La **Fase 0** del plan de ejecución (Anexo E) está completa: el motor de feed y el contrato de tools/insights sin iframe —las dos piezas de mayor riesgo técnico— están implementados, probados automáticamente y funcionando de extremo a extremo. El esquema de datos de Supabase está migrado y su seguridad (RLS) validada con casos reales.

**Novedad del 20-28 de agosto**: CRUD completo de `content` (borrador, edición, traducciones por idioma, bloques genéricos, detalle de caso) y subida de imagen/vídeo a Cloudinary desde el ABM, construidos por el equipo mientras se preparaba esta revisión — ver §2.13. Sin tests en ese momento; es la brecha que cierra la auditoría de hoy.

**Novedad del 7 de septiembre**: jornada de auditoría y cierre de la Fase 2, en tres bloques — (1) auditoría completa del CRUD/ABM/medios de agosto, con 95 tests nuevos y cinco correcciones reales (§2.14): auditoría que faltaba en dos funciones de mutación, versión de Node revertida por error, `Prettier` sin configurar (368 ficheros desalineados), medios huérfanos al sustituir imagen/vídeo, y límites de medios duplicados en tres sitios — de paso se destapó y cerró un hueco real: `register_image_for_block` no tenía tope de tamaño en SQL, a diferencia de vídeo; (2) login del ABM revisado y testeado por primera vez, con el middleware endurecido para cubrir también las rutas `/api/admin/*` (§2.9); (3) implementados los estados editoriales `draft`/`scheduled`/`published` en el ABM, con publicar-ahora, programar y despublicar (§2.15) — el cuarto estado, **preview firmado, queda deliberadamente aplazado a la Fase 3**, porque no existe todavía ninguna plantilla pública sobre la que montarlo.

Todo el housekeeping técnico detectado en la auditoría del 18 de agosto sigue resuelto y reverificado. De las decisiones de negocio pendientes con Greener, ya están cerradas: ADR-11 (ratios del feed), la permanencia de `'shop'` como hueco reservado, el alcance de dominios del ABM (3, no 1), y los límites/plan de medios (§2.6). Quedan abiertas, sin urgencia técnica, el repertorio de bloques de caso (depende de diseño) y un par de auditorías menores (ver §5).

**Cifras actuales, verificadas a fecha de hoy:**

- **224 tests automáticos, todos en verde** (`npm test`) — 76 previos + 95 de la auditoría de content/media/ABM (7 sep) + 13 del borrado de medios huérfanos + 20 del login/proxy + 20 de los estados editoriales.
- **0 errores de TypeScript**, **0 avisos de ESLint**, **`npm run format:check` en verde en los 368 ficheros del repo** (antes de hoy, nunca se había verificado formalmente), **build de producción limpio** (`npm run build`).
- **21 migraciones SQL** de Supabase (8 del esquema base + 9 del CRUD/ABM/medios de agosto + 4 de hoy: auditoría, medios huérfanos, tope de imagen y estados editoriales), aplicadas y probadas contra una base de datos real.
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

| Archivo                           | Contenido                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `..._enums.sql`                   | Tipos enumerados compartidos                                                        |
| `..._content_core.sql`            | Supertipo `content` + `content_translation`                                         |
| `..._content_blocks.sql`          | Bloques de contenido genéricos (`content_block`), reutilizables por `case` y `page` |
| `..._content_type_extensions.sql` | `case_detail`, `episode`, `html_package(_version)`                                  |
| `..._media_pins.sql`              | `media_asset`, `pin`, `pin_media`                                                   |
| `..._feed_taxonomy.sql`           | `tag`, `content_tag`, `feed_config`, `feed_session`, `feed_round`                   |
| `..._admin_access.sql`            | `admin_allowed_domain`, `admin_profile`, `redirect_301`, `audit_log`                |
| `..._rls_policies.sql`            | Función `is_admin()` + políticas de Row Level Security en **todas** las tablas      |

**Validación real, no solo revisión del SQL:** aplicadas contra PostgreSQL 16 real, probadas con un rol sin privilegios de superusuario (visitante anónimo → solo `published`; dominio autorizado → todo; dominio no autorizado → bloqueado; dos intentos de suplantación por substring de dominio → ambos rechazados).

**ADR-11 cerrado (18 ago):** confirmado con Greener el reparto 70% casos / 15% insights / 5% tools / 5% channel / 5% otros, ya usado por defecto en `feed_config`. Falta solo un housekeeping menor: quitar el comentario SQL de "provisional / pendiente de confirmar" de la migración `..._feed_taxonomy.sql`.

**`'shop'` en `tag_section` — decidido (18 ago):** se mantiene en el enum de forma deliberada, como hueco reservado para una futura actualización de la página que reintroduzca Shop. No es código muerto por descuido, es una reserva consciente — documentado aquí para que quien lo lea más adelante no lo confunda con un olvido del ADR-10.

**Estado en el proyecto Supabase real (`web-greener`), confirmado el 18 ago:** las 8 migraciones ya están aplicadas contra el proyecto real, no solo contra una base de pruebas — `admin_allowed_domain` ya tiene los 3 dominios (`itsgreener.com`, `ffforward.ai`, `villamagia.com`); el resto de tablas existen con el esquema completo pero están vacías, a la espera de la Fase 2 (ABM) y la carga de contenido real.

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

### 2.6 Política de medios (Cloudinary) — confirmada oficialmente el 19 ago

`src/modules/media/`: `domain/mediaLimits.ts` (límites puros: 5 MB imagen, 100 MB / 3 min vídeo), `domain/mediaDelivery.ts` (regla "el feed nunca sirve el original": imagen 320-960px en feed vs hasta 1920px en detalle; vídeo poster/preview de 5s en feed vs completo en detalle), `infrastructure/cloudinaryUrl.ts` (construcción de URLs `q_auto`/`f_auto`).

Estos valores, que se implementaron como placeholder de trabajo antes de tener una decisión formal, se confirman **exactos** contra la "Política de subida y almacenamiento de contenido multimedia" recibida el 19 de agosto: límites de subida (5 MB / 100 MB / 3 min), formatos recomendados (WebP/AVIF, MP4/H.264), estrategia de feed-nunca-original y lazy loading (`loading="lazy"` ya en `PinCard`) coinciden punto por punto sin necesidad de tocar código.

**Plan de Cloudinary confirmado: Free** (25 credits/mes), cuenta ya creada y verificada — Plus (~99 USD/mes) queda como siguiente escalón si el consumo real en producción lo justifica, a decidir por métricas (almacenamiento, bandwidth, transformaciones, procesamiento de vídeo), no por número de casos.

**Hueco pendiente, no bloqueante**: `PinCard` solo renderiza pines de imagen por ahora. Las funciones de vídeo (`buildVideoPosterUrl`/`buildVideoPreviewUrl`/`buildVideoFullUrl`) ya existen en `cloudinaryUrl.ts` pero ningún componente las usa todavía — pendiente para cuando se aborden pines de vídeo/carrusel en `PinCard`.

### 2.7 Dataset de datos falsos (completado y validado)

`scripts/generate-demo-data.mjs`: generador determinista. 50 casos (219 pines), 9 episodios de Channel (vídeos de YouTube de terceros, solo para probar el embed), 6 imágenes de la cuenta demo de Cloudinary verificadas por HTTP real. Sin insights ni tools (se suben manualmente).

Salidas: `supabase/seed_demo_data.sql` (aplicado y validado con integridad referencial: 0 huérfanos) y `data/demo/feed-snapshot.json`. Cierra el ciclo con el motor de feed real vía `tests/unit/dataset/demoDataset.test.ts`.

### 2.8 Prototipo de masonry (completado y validado)

`src/modules/masonry/domain/`: `layout.ts` (shortest-column-first desde el ratio cerrado, sin medir DOM — breakpoints verificados exactos, byte a byte, contra la tabla de §10.1) y `virtualization.ts` (batch visible ± 2, espaciadores que conservan scroll).

`/api/feed/demo` — endpoint temporal del prototipo (no es el `/api/feed/sessions` final de §16.1: no persiste sesión/ronda, no firma cursor). Componentes React en `/preview/masonry`, ruta separada de la Home real.

**28 tests**, en 4 niveles: propiedad del layout (500 runs), virtualización, smoke test con `jsdom`/`@testing-library/react` (dependencias que faltaban en `package.json` hasta el 18 de agosto — añadidas y verificadas), y build + servidor real + `curl`.

### 2.9 Login del ABM — implementado, revisado y testeado (7 sep)

`src/app/admin/{page.tsx,login/page.tsx}`, `src/app/auth/callback/route.ts`, `src/lib/supabase/{client,server,proxy}.ts`, `src/proxy.ts`: flujo completo de login con Google vía Supabase Auth, con verificación de dominio server-side en cada request (`proxy.ts` + RLS `is_admin()`), usando `getClaims()` — el patrón actualmente recomendado por Supabase para SSR con Next.js, no código improvisado.

**Confirmado el 7 sep: se da por hecho.** Los 3 dominios (`itsgreener.com`, `ffforward.ai`, `villamagia.com`) ya están en `admin_allowed_domain` del proyecto Supabase real — confirmado el 18 ago, el resto de tablas existen (esquema completo migrado) pero están vacías, a la espera de contenido real. El parámetro `hd` de §15.2 se descarta deliberadamente: con 3 dominios reales autorizados, `hd` (que solo admite uno o `*`) no puede representarlos sin resultar engañoso en el selector de Google; la restricción real sigue siendo, sin cambios, `is_admin()` server-side.

**20 tests nuevos (7 sep)**, cerrando la brecha que quedaba abierta desde el 18 de agosto: `updateSession.test.ts` (8 — login libre en `/admin/login`, redirect en páginas, JSON 401/403 en rutas API, dominio no autorizado, fallo de `is_admin()` tratado como "no admin"), `authCallback.test.ts` (6 — intercambio de código, `next` relativo, protección open-redirect con origen absoluto, y el caso protocol-relative `//evil.com`, que resultó ser seguro por cómo se concatena con `origin` — no hizo falta tocar código, solo confirmarlo con un test), `mediaSignRoutes.test.ts` (6 — la segunda barrera de autenticación en las rutas de firma de Cloudinary, independiente del middleware).

**Endurecido de paso**: el middleware (`src/proxy.ts`) solo protegía `/admin/:path*`, no `/api/admin/:path*` — las rutas de firma se libraban porque comprobaban `is_admin()` ellas mismas, pero cualquier ruta nueva bajo `/api/admin/` que no se acordara de hacerlo se habría quedado sin proteger. Ampliado el `matcher` a `['/admin/:path*', '/api/admin/:path*']`, con un matiz: las rutas API no pueden recibir el mismo `redirect()` que las páginas (el cliente hace `fetch()` esperando JSON; seguir un redirect a `/admin/login` le devolvería la página de login como si fuera un 200 válido), así que `updateSession` ahora distingue por prefijo de ruta y devuelve JSON 401/403 en `/api/admin/*`.

### 2.10 Corrección de versiones

`package.json` refleja las versiones reales (`next@16.3.x`, `react@19.2.8`).

**Versión de Node fijada (20 ago)**: `npm install` avisaba (`EBADENGINE`) de que `jsdom@30` necesita Node `^22.22.2 || ^24.15.0 || >=26.0.0`, y el equipo estaba en 24.13.0 — por debajo del mínimo de la rama 24.x. Se decidió subir a **Node 24.15.0**, no saltar a Node 26: en agosto de 2026, Node 26 sigue siendo la rama Current, no entra en LTS hasta octubre — Node 24 es la Active LTS recomendada para producción.

- `package.json`: añadido `"engines": { "node": ">=24.15.0 <25.0.0" }` — el límite superior es deliberado, evita instalar Node 25 (rama impar, ya fin de vida) o saltar sin querer a Node 26 antes de que sea LTS.
- `@types/node` actualizado de `^20` a `^24.13.3`, para que los tipos coincidan con el runtime real.
- `.nvmrc` nuevo en la raíz, con `24.15.0` — para que `nvm use` funcione directo.

**Nota honesta sobre verificación**: el entorno donde se construyó esto solo tenía Node 22.22.2 disponible (sin red hacia nodejs.org para instalar otra versión), así que lint/tsc/tests/build se reverificaron ahí, no contra 24.15.0 exacto. El equipo sí lo verificó en su máquina con Node 24.15.0 real — todo correcto, salvo un fallo de configuración que apareció al hacerlo (ver más abajo).

**Bug de configuración encontrado y corregido al verificar en local (20 ago)**: `tests/unit/feed/cursor.test.ts` (y los otros dos tests nuevos de sesiones de feed) fallaban con `Configuración de entorno inválida` al ejecutar `npm test` en local. Causa: en la copia del equipo, `vitest.config.ts` no tenía la línea `setupFiles: ["./tests/setup.ts"]` — sin ella, Vitest nunca ejecuta `tests/setup.ts` aunque el archivo exista en el repo, así que cualquier test que dependa (aunque sea transitivamente) de `env.ts` revienta al no encontrar las variables de entorno. Con esa línea añadida, los 76 tests pasan también en local. Apuntado aquí porque es un fallo silencioso y fácil de repetir si alguien recrea `vitest.config.ts` desde cero más adelante.

### 2.11 Inventario de tools e insights en producción (18 ago)

Confirmado por Greener. Es el catálogo real a migrar bajo `/tools/[slug]` e `/insights/[slug]` (§12), y el input principal para el punto "inventario de URLs para 301" de la Fase 1 (§4.2) en lo que a tools/insights se refiere — falta todavía el inventario del resto del sitio actual (home, páginas sueltas, etc.).

**Tools** — origen `https://tools.itsgreener.com/tools/{slug}` (9):

`carousel-studio`, `contour-fill`, `cubica`, `destructor`, `pattern-foundry`, `pixel-stretch`, `plain-painter`, `reconstructor`, `rafaga`

**Insights** — origen `https://insight.itsgreener.com/insight/{slug}` (4):

`efectovozinha`, `algospeak`, `avanzadadulce`, `diccionarioemojis`

Pendiente de hacer con este listado (no bloquea nada de lo anterior, pero es trabajo real de la Fase 4, §12 y §16.1):

- Añadir una fila a `redirect_301` por cada uno de los 13 slugs: `tools.itsgreener.com/tools/{slug}` → `/tools/{slug}` y `insight.itsgreener.com/insight/{slug}` → `/insights/{slug}` (nota: el brief pluraliza "insights" en la ruta nueva, el origen actual usa singular "insight" — confirmar que es así y no un error de transcripción antes de cargar las redirecciones).
- Migrar el HTML real de cada una de las 9 tools y 4 insights al contrato de paquete ZIP de §12.2 (ninguna se ha migrado todavía — `pixel-palette`, la única tool que existe hoy en el repo, es una tool de ejemplo nueva construida para el spike de Fase 0, no una de estas 9).

### 2.12 API real de sesiones de feed — `/api/feed/sessions` (§16.1), 19 ago

Construida entera, con tests, primera pieza cerrada de la Fase 2. Sustituye a `/api/feed/demo` en lo arquitectónico (ese endpoint sigue existiendo tal cual, sin tocar — es el prototipo aislado de Fase 1, Anexo E.2).

**Archivos nuevos**, capas `domain/application/infrastructure` (§24.4):

| Archivo                                                               | Qué hace                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/supabase/serviceClient.ts`                                   | Cliente con `SUPABASE_SECRET_KEY` (service role), exclusivo para `feed_session`/`feed_round` — esas dos tablas no tienen política pública de RLS a propósito (§8.5: "el cliente no puede alterar cuotas ni seed"), están gateadas solo por `is_admin()` a nivel de esquema.                                                         |
| `src/lib/supabase/publicReadClient.ts`                                | Cliente de lectura pública sin manejo de cookies, para el resto de tablas (sí tienen política pública).                                                                                                                                                                                                                             |
| `modules/feed/infrastructure/supabaseFeedSource.ts`                   | Construye el `FeedSnapshot` real desde `content`/`pin`/`pin_media`/`media_asset`/`case_detail` — sustituye al dataset demo, tal como preveía el propio comentario de `demoSnapshotSource.ts`. Incluye `getPinDirectoryByIds`, consulta ligera para enriquecer una ronda ya cacheada sin releer todo el catálogo.                    |
| `modules/feed/infrastructure/feedSessionRepository.ts`                | CRUD de `feed_session`/`feed_round`.                                                                                                                                                                                                                                                                                                |
| `modules/feed/infrastructure/cursor.ts`                               | Cursor opaco y firmado (HMAC-SHA256, reutiliza `SUPABASE_SECRET_KEY` como secreto — no hizo falta ninguna variable de entorno nueva).                                                                                                                                                                                               |
| `modules/feed/application/createFeedSession.ts`                       | Caso de uso de `POST /api/feed/sessions`.                                                                                                                                                                                                                                                                                           |
| `modules/feed/application/getFeedSessionBatch.ts`                     | Caso de uso de `GET /api/feed/{sessionId}?cursor=...`: si la ronda pedida ya existe en `feed_round`, la lee tal cual (inmutable — los pines ya servidos no cambian aunque cambie el contenido publicado después); si no existe, la calcula con `generateRound()` (el motor ya probado en Fase 0) y la persiste antes de devolverla. |
| `app/api/feed/sessions/route.ts`, `app/api/feed/[sessionId]/route.ts` | Route handlers.                                                                                                                                                                                                                                                                                                                     |

**Alcance deliberado**: solo `scope: "home"` por ahora (todo el catálogo publicado, sin filtro de etiqueta) — subhomes y `scope=related-cases` necesitan filtrado por tag y quedan para la Fase 3 (Anexo E.4), no están bloqueando nada de lo anterior.

**17 tests nuevos** (`tests/unit/feed/cursor.test.ts`, `createFeedSession.test.ts`, `getFeedSessionBatch.test.ts`): firma/verificación del cursor (incluye manipulación de payload y de firma por separado), validación de scope, hash de filtro estable sin importar el orden de claves, y el caso de uso completo contra un repositorio en memoria — cubre sesión inexistente, sesión caducada, primera ronda (genera y persiste), ronda ya cacheada (confirma que **no** se vuelve a leer el catálogo completo), cursor de otra sesión, cursor corrupto, y determinismo.

**Hallazgo de diseño corregido de paso**: `env.ts` valida de forma síncrona en cuanto se importa el módulo, no de forma perezosa. Cualquier test que tocara (aunque fuera transitivamente) `cursor.ts` o `serviceClient.ts` reventaba por falta de variables de entorno, aunque el test no usara Supabase para nada. Arreglado añadiendo `tests/setup.ts` (variables de entorno de prueba, sin secretos reales) registrado en `vitest.config.ts` — no se ha tocado el diseño de `env.ts` en producción, es puramente un fix del entorno de test.

**Verificado de extremo a extremo contra Supabase real (20 ago) — cerrado.** El equipo probó el flujo completo siguiendo las instrucciones de prueba aparte: creación de sesión, primer lote con datos insertados por SQL directo, avance de cursor a la ronda 1, 404 en sesión inexistente, y repetición de la ronda 0 devolviendo exactamente los mismos pines (confirma que se lee `feed_round` ya persistida, no se recalcula). El `select()` anidado `content → pin → pin_media → media_asset` funciona tal cual estaba escrito, sin ajustes. Único matiz observado: con `force` mayor que el número de pines disponibles en la cola de un caso, el mismo pin aparece repetido en el lote — comportamiento esperado y documentado en §4.3 del brief, no un bug.

### 2.13 CRUD de content, bloques y medios (Cloudinary) — 20-28 ago, sin tests hasta la auditoría del 7 sep

Construido por el equipo mientras se preparaba esta revisión, sin actualizar este documento en su momento (de ahí que no aparezca fechado día a día). Cubre gran parte de la Fase 2 (§4.3):

- **`src/modules/content/`** (domain/application/infrastructure, §24.4): CRUD completo de `content` (crear borrador, editar, borrar — solo en estado `draft`), `content_translation` por idioma (con la restricción de que un episodio solo admite su locale por defecto, §7.3), `content_block` genérico con su traducción por bloque, y `case_detail`. 9 migraciones nuevas (`20260820...` a `20260828...`), cada una con su función `security invoker` + `is_admin()` + `audit_log` — salvo dos que se quedaron sin auditoría, corregido hoy (§2.14).
- **`src/modules/media/`**: subida de imagen/vídeo a Cloudinary vía signed upload (firma en servidor, secret que nunca llega al navegador, exactamente como describe §9.2), con validación de límites (5 MB imagen, 100 MB / 180 s vídeo) en cliente, en el schema de zod y en la función SQL — aunque, hasta hoy, el límite de imagen faltaba en SQL (§2.14).
- **`src/app/admin/contents/`**: ABM funcional de principio a fin — listado, alta, edición con pestañas de traducción, editor de bloques con subida de imagen/vídeo inline, borrado protegido a solo-`draft` con confirmación. El carrusel queda pendiente ("se implementará en el siguiente bloque", visible en el propio editor) y no hay todavía estados `scheduled`/`published` ni preview firmado — sigue abierto en el checklist (§4.3).
- **Housekeeping encontrado y corregido en la auditoría, no en este bloque**: `@types/node` había vuelto a `^20` en algún punto (despiste, revertido hoy), y no existía `.prettierrc` — el código de este bloque usa comillas simples y sin punto y coma, el resto del repo usaba el estilo por defecto de Prettier (comillas dobles, con punto y coma); nunca se había verificado `npm run format:check`, y fallaba en los 368 ficheros del repo. Todo esto se resuelve en §2.14.

### 2.14 Auditoría de content/media/ABM y cinco correcciones — 7 sep

Repaso completo del bloque anterior: lectura de cada migración y cada fichero nuevo contra la arquitectura V1.3, `npm run lint` / `next build` / `tsc --noEmit` / `npm test` ejecutados de verdad, y 95 tests nuevos escritos donde no había ninguno. Además, cinco correcciones pedidas explícitamente y ya verificadas:

1. **Auditoría que faltaba** — `create_content_draft` y `update_content` no insertaban en `audit_log`, a diferencia del resto de funciones de mutación (incumplía §16.2). Corregido en `20260907090000_admin_content_audit_log_fix.sql`, redefiniendo ambas funciones sin tocar su firma ni el resto de su comportamiento.
2. **`@types/node`** — revertido a `^24.13.3` (el despiste era justo eso, un despiste; no hacía falta más investigación).
3. **Prettier sin configurar** — añadidos `.prettierrc` (`semi: false`, `singleQuote: true`, `trailingComma: "all"`) y `.prettierignore`, y corrido `prettier --write .` sobre todo el repo. Los 368 ficheros pasan `format:check` ahora; el cambio es puramente de formato (comillas y punto y coma), sin tocar lógica.
4. **Medios huérfanos al sustituir imagen/vídeo** — nueva función SQL `unlink_and_delete_media_asset` (`20260907091500_admin_unlink_delete_media_asset.sql`): desvincula el bloque y borra el `media_asset` en una transacción; si el medio sigue referenciado en otro bloque, otro pin o `content.og_media_id`, la propia FK de `content_block.media_id` (sin `ON DELETE CASCADE`) hace fallar el `DELETE` y se revierte todo — no hubo que reimplementar esa comprobación a mano. Nuevo flujo en el ABM (`ImageBlockMediaUpload.tsx`, `VideoBlockMediaUpload.tsx`, `mediaActions.ts` → `deleteBlockMediaAction`): al sustituir, primero se borra en Postgres, y solo si eso tiene éxito se borra el archivo real en Cloudinary (`deleteCloudinaryAsset`, nueva, requirió añadir `cloudinary.config()` global — antes solo se firmaban subidas). Si falla el borrado en Postgres, se aborta sin subir nada nuevo; si Postgres va bien pero Cloudinary falla, se avisa con un `warning` no bloqueante en vez de impedir la subida — **decisión de diseño discutible, revisar si en algún momento se prefiere que sea bloqueante**.
5. **Límites de medios duplicados** — `mediaAssetSchema.ts` (zod) ahora importa `IMAGE_LIMITS`/`VIDEO_LIMITS` desde `mediaLimits.ts` en vez de repetir los números. El lado SQL sigue necesariamente aparte (Postgres no puede importar TypeScript), documentado con comentarios que apuntan a `mediaLimits.ts` como fuente.

**Hallazgo real encontrado de propina, al hacer el punto 5**: `register_image_for_block` no tenía tope de tamaño en SQL — a diferencia de `register_video_for_block`, que sí comprobaba 100 MB. Cerrado en `20260907093000_admin_image_size_limit.sql` (5 MB, igual que el resto de capas) y en el zod schema correspondiente.

**95 tests nuevos**, en `tests/unit/content/` y `tests/unit/media/`:

- Schemas de zod puros, sin mocks: `contentSchema`, `contentBlockSchema`, `contentTranslationSchema`, `caseDetailSchema`, `mediaAssetSchema` (incluido `deleteBlockMediaSchema`), y `mediaLimits`/`cloudinaryUrl`.
- Capa de aplicación con el repositorio mockeado (`vi.mock`): a diferencia de `modules/feed/application/`, que recibe el repositorio como parámetro y por eso se testea con un repositorio en memoria (§2.12), `modules/content/` y `modules/media/` importan el repositorio concreto directamente — la interfaz (`ContentRepository`, `MediaAssetRepository`...) existe pero nada la usa para inyectar. No se ha tocado esa arquitectura, solo se ha mockeado el módulo para poder testear sin Supabase real; **queda anotado como inconsistencia con §24.4** ("repositorios sustituibles detrás de una interfaz") para quien retome esto.
- `tests/unit/admin/mediaActions.test.ts`: el server action `deleteBlockMediaAction` — orden Postgres→Cloudinary, aborto sin llamar a Cloudinary si Postgres falla, y el caso del `warning` no bloqueante.

**Zona sin tocar, sigue pendiente**: `data/demo/` y `fixtures/` no se habían revisado a fondo en esta auditoría — revisado el 7 sep (§2.15), limpio, sin acción necesaria.

### 2.15 Estados editoriales en el ABM y decisión sobre preview — 7 sep

Implementados los tres estados que faltaban del checklist de la Fase 2 (§4.3, §15.3): `draft` → `scheduled` → `published`, y vuelta a `draft` (`unpublish`).

- **Migración `20260907100000_admin_content_publish_states.sql`**: `publish_content` (marca `published`, fija `publish_at = now()`), `schedule_content` (marca `scheduled`, exige `publish_at` estrictamente futuro), `unpublish_content` (vuelve a `draft`, limpia `publish_at`). Las tres con `is_admin()` y `audit_log`, mismo patrón que el resto.
- **Sin lógica extra para la "ventana de gracia" del unpublish** (brief: "se retira de nuevas sesiones, manteniendo una ventana de gracia para sesiones existentes"): no hacía falta — `content_public_read` (RLS) ya comprueba `status = 'published'` en cada lectura nueva, y `feed_round` ya es inmutable una vez generada (§8.5), así que las sesiones de feed ya abiertas siguen viendo lo que tenían servido sin tocar nada de esto.
- **`src/modules/content/`**: `publishContentSchema`/`scheduleContentSchema` (con `z.coerce.date()` y validación de fecha futura)/`unpublishContentSchema` en el domain; `ContentRepository` extendida con `publish`/`schedule`/`unpublish`; `publishAt` añadido a `ContentDetail`/`ContentListItem` y a las dos consultas del repositorio.
- **ABM**: `publishActions.ts` (server actions) + `PublishControls.tsx` — publicar ahora / programar con un `<input type="datetime-local">` / despublicar, mostrando el estado actual y la fecha según corresponda. Colocado justo debajo del ID en el editor, por delante de los datos generales: es la acción más importante de la página. Columna "Publicación" añadida al listado.
- **41 tests nuevos**: schemas (fecha futura/pasada/exactamente-ahora/formato `datetime-local` del navegador), capa de aplicación con el repositorio mockeado, y los tres server actions.

**Preview — decisión tomada (7 sep): aplazado a la Fase 3, no se implementa ahora.** No existe todavía ninguna plantilla pública (`/work/[slug]` y el resto son Fase 3, bloqueados por el repertorio de bloques de diseño, §5). Se valoraron dos opciones: una infraestructura mínima ahora (token firmado con expiración, vista de solo-lectura sin maquetar) o esperar a que exista la plantilla real para montar el preview firmado sobre ella. Se eligió la segunda — el ABM se queda sin ese botón hasta entonces. **Pendiente real de §15.3, sin fecha todavía.**

---

## 3. Cómo verificar todo esto tú mismo

```bash
npm install
npm run lint               # ESLint
npm run format:check       # Prettier — nuevo desde el 7 sep, antes no se verificaba
npx next build              # build de producción — genera también los tipos de ruta (.next/types)
npx tsc --noEmit             # TypeScript — hazlo DESPUÉS de next build/dev, si no da falsos positivos de LayoutProps
npm test                     # 224 tests (unit + property-based + smoke con jsdom)
node scripts/generate-demo-data.mjs   # regenera el dataset (determinista)
```

Para probar la tool de ejemplo en vivo: `npm run build && npm run start` → `http://localhost:3000/tools/pixel-palette`.

Para probar la API real de sesiones de feed: ver el documento aparte de instrucciones de prueba (§2.12).

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
- [x] `hd` en el login de Google — **decidido el 18 ago: no se añade**. Hay 3 dominios reales autorizados (`itsgreener.com`, `ffforward.ai`, `villamagia.com`); `hd` de Google solo admite un dominio o el comodín `*`, así que fijar uno solo sería engañoso en el selector de cuentas. La restricción real ya vive enteramente en `is_admin()` / `admin_allowed_domain`, sin cambios.
- [x] Insertar `ffforward.ai` y `villamagia.com` en `admin_allowed_domain` del proyecto Supabase real (`web-greener`) — **confirmado el 18 ago: ya están los 3 dominios en la tabla real**. El resto del esquema está creado (8 migraciones aplicadas) pero sin datos todavía, a la espera de la Fase 2 (ABM) y la carga de contenido real.
- [x] Añadir `supabase/.temp/` al `.gitignore` — **hecho el 18 ago**. Pendiente aparte, sin urgencia: confirmar si `supabase/config.toml` existe localmente y, si es así, versionarlo para que el resto del equipo pueda levantar Supabase local.
- [x] Decidir y cerrar con Greener: `'shop'` en `tag_section` — **cerrado el 18 ago**: se queda como hueco reservado para futuras actualizaciones (Shop podría reintroducirse más adelante).
- [x] Cerrar formalmente ADR-11 (70/15/5/5/5) con Greener — **cerrado el 18 ago**. Queda pendiente solo limpiar el comentario "provisional" de la migración SQL (housekeeping cosmético, no bloqueante).
- [ ] Confirmar con quien lleve el login del ABM el estado real de esa parte y añadir tests.

### 4.2 Fase 1 (hasta el 15 de agosto)

- [ ] **Repertorio de bloques y restricciones de las variantes A/B/C de caso** (§11.3) — bloqueado por diseño; bloquea a su vez la especificación de contenido (Anexo A.1) y el editor de bloques del ABM.
- [ ] Especificación de formatos para Greener (Anexo A.1) — depende del punto anterior.
- [~] Inventario de URLs actuales para las redirecciones 301 — catálogo de tools (9) e insights (4) confirmado por Greener el 18 ago (§2.11); falta el inventario del resto del sitio actual para completarlo.
- [ ] Ajustar el algoritmo de layout con el diseño real cuando esté disponible (breakpoints actuales: propuesta técnica confirmada fiel a §10.1, pendiente de validar por diseño).

### 4.3 Fase 2 (hasta el 1 de septiembre) — ABM base

- [x] Autenticación Google OAuth vía Supabase Auth — **confirmada y testeada el 7 sep** (§2.9), 20 tests nuevos. Middleware endurecido para cubrir también `/api/admin/*`.
- [x] CRUD de `content` y extensiones vía Server Actions + zod — **hecho (20-28 ago) y auditado con 95 tests el 7 sep** (§2.13, §2.14): borrador, edición, traducciones, bloques, case detail, e imagen/vídeo vía Cloudinary. El carrusel queda explícitamente para después.
- [ ] Subida de pines: alta individual, luego carga masiva por CSV (§15.4, ~500 pines iniciales) — sigue sin empezar; distinto de la subida de imagen/vídeo de bloques, que sí está hecha.
- [ ] Subida de paquetes HTML (ZIP) con validaciones §12.5, sirviendo desde Supabase Storage real en vez de `fixtures/`.
- [~] Estados `draft`/`scheduled`/`published`/`preview` + preview firmado — **`draft`/`scheduled`/`published` hechos y testeados el 7 sep** (§2.15): publicar ahora, programar, despublicar. **`preview` aplazado a la Fase 3 a propósito** (decisión del 7 sep): no hay plantilla pública sobre la que montarlo todavía. Pendiente aparte, sin resolver hoy: no existe mecanismo de publicación automática cuando llega la fecha programada (`publish_at`) — hace falta decidir cron externo vs. `pg_cron` en Supabase antes de que el primer contenido programado se quede esperando sin publicarse solo.
- [x] Cliente de Supabase browser/server extendido a `content`/`feed`/`media` — hecho como parte del CRUD (§2.13).
- [x] `/api/feed/sessions` real (§16.1): sustituye a `/api/feed/demo` — **hecho y verificado E2E contra Supabase real el 20 ago** (§2.12).

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

| Decisión                                                                                | Bloquea                                                 | Estado                                                                                                                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repertorio de bloques y restricciones de variantes A/B/C                                | Editor de bloques del ABM + especificación de contenido | Abierto — depende de diseño                                                                                                                                   |
| Auditoría de embeds y cookies de terceros (Vimeo, Spotify)                              | Si hace falta banner de consentimiento antes de Channel | Abierto                                                                                                                                                       |
| Traducción asistida por IA en el ABM (opcional)                                         | Si se incluye en V1 o se deja fuera                     | Abierto, no bloqueante                                                                                                                                        |
| Mecanismo de publicación automática al llegar `publish_at` (cron externo vs. `pg_cron`) | Que el contenido programado se publique solo            | Abierto — no bloquea usar el ABM hoy (publicar/programar/despublicar manual funciona), pero bloquea que "programar" cumpla su promesa sin intervención humana |

Cerrada el 7 de septiembre: preview firmado (§15.3) — se aplaza a la Fase 3, cuando exista una plantilla pública real sobre la que montarlo (§2.15). No es una decisión de Greener, es una secuenciación técnica.

Cerradas el 18 de agosto: reasignación 5% Shop → Channel (ADR-11, 70/15/5/5/5); permanencia de `'shop'` en `tag_section` como hueco reservado (§2.3); alcance del dominio permitido en el ABM — **son 3 dominios reales, no uno**: `itsgreener.com`, `ffforward.ai`, `villamagia.com` (§4.1) — no sub-allowlist de contratistas, los 3 tienen el mismo nivel de acceso.

Cerradas el 19 de agosto: pesos/bitrates máximos de imagen y vídeo, y plan de Cloudinary — política de subida y almacenamiento recibida oficialmente (§2.6), confirma exactos los valores ya implementados (5 MB imagen, 100 MB / 3 min vídeo) y fija plan **Free** de Cloudinary, cuenta ya creada y verificada.

---

## 6. Historial de correcciones a este documento

- **7 sep 2026**: jornada de auditoría y cierre de la Fase 2, en tres bloques.

  1. Auditado el bloque de CRUD de content/media/ABM construido entre el 20 y el 28 de agosto, que se había quedado sin reflejar en este documento y sin ningún test (§2.13). Escritos 95 tests nuevos y resueltas cinco correcciones pedidas explícitamente (§2.14): auditoría que faltaba en `create_content_draft`/`update_content`, `@types/node` revertido de `^20` a `^24.13.3`, `.prettierrc`/`.prettierignore` añadidos y todo el repo reformateado (368 ficheros, antes nunca verificado), medios huérfanos resueltos con `unlink_and_delete_media_asset` + borrado en Cloudinary antes de subir el sustituto, y límites de medios unificados en `mediaLimits.ts` como fuente única del lado TypeScript. De propina, se encontró y cerró un límite de tamaño que faltaba en `register_image_for_block` (SQL).
  2. Login del ABM confirmado y testeado por primera vez (§2.9): 20 tests nuevos (middleware, callback OAuth, rutas de firma). Middleware ampliado a `/api/admin/*`, distinguiendo JSON 401/403 en rutas API de `redirect()` en páginas.
  3. Implementados los estados editoriales `draft`/`scheduled`/`published` en el ABM (§2.15): publicar ahora, programar con fecha futura, despublicar — 20 tests nuevos. Preview (el cuarto estado de §15.3) se aplaza deliberadamente a la Fase 3 por falta de plantilla pública; queda además pendiente, sin resolver hoy, decidir el mecanismo de publicación automática cuando llega `publish_at` (§5).

  **224/224 tests en verde**, `format:check`/`lint`/`tsc`/`build` limpios en cada uno de los tres bloques.

- **20 ago 2026**: cerrada del todo la verificación E2E de `/api/feed/sessions` contra Supabase real (§2.12) — el equipo confirmó el flujo completo con datos insertados por SQL. Fijada la versión de Node del proyecto en 24.15.0 LTS (§2.10): `engines` en `package.json`, `.nvmrc`, `@types/node` actualizado. Encontrado y corregido un fallo de configuración al verificar en local: faltaba `setupFiles: ["./tests/setup.ts"]` en `vitest.config.ts`, sin lo cual los tests nuevos de feed sessions fallaban por falta de variables de entorno aunque `tests/setup.ts` existiera en el repo.

- **19 ago 2026 (2)**: implementado `/api/feed/sessions` real (§16.1) — primera pieza cerrada de la Fase 2 (§2.12). 17 tests nuevos, 76/76 en verde. De paso, corregido un problema de diseño en el entorno de test: `env.ts` validaba de forma síncrona al importarse, lo que rompía cualquier test que tocara transitivamente un módulo relacionado con Supabase aunque no lo usara — arreglado con `tests/setup.ts`, sin tocar `env.ts` de producción. Pendiente: verificar contra el proyecto Supabase real (sin salida de red desde el entorno de desarrollo actual a `supabase.co`).

- **19 ago 2026**: recibida la "Política de subida y almacenamiento de contenido multimedia" oficial. Confirma exactos los límites que ya estaban implementados como placeholder en `src/modules/media/` (5 MB imagen, 100 MB / 3 min vídeo, WebP/AVIF, MP4/H.264, feed-nunca-original, lazy loading) — no hizo falta ningún cambio de código. Cierra las dos últimas filas de la tabla de decisiones pendientes relacionadas con medios: pesos/bitrates y plan de Cloudinary (**Free**, cuenta creada y verificada por el equipo).

- **18 ago 2026 (noche, 2)**: confirmado que el proyecto Supabase real (`web-greener`) ya tiene las 8 migraciones aplicadas y los 3 dominios cargados en `admin_allowed_domain`; el resto de tablas están creadas pero vacías. Cierra del todo el punto de `admin_allowed_domain` abierto en la entrada anterior.
- **18 ago 2026 (noche)**: aclarado que el acceso al ABM cubre 3 dominios reales (`itsgreener.com`, `ffforward.ai`, `villamagia.com`), no uno solo. Decisión: no añadir `hd` al login de Google (solo admite un dominio o `*`, y ninguno de los dos representa bien 3 dominios reales sin resultar engañoso) — la restricción sigue siendo enteramente server-side vía `is_admin()`. Corregido `supabase/seed.sql`, que solo insertaba `itsgreener.com`; pendiente aplicar los 3 dominios también en el proyecto Supabase real.
- **18 ago 2026 (tarde)**: cerradas dos decisiones de negocio con Greener — ADR-11 confirmado con los valores ya implementados (70/15/5/5/5) y `'shop'` se mantiene en `tag_section` como hueco reservado para una futura reintroducción de Shop, no por descuido. Añadido el inventario real de 9 tools y 4 insights en producción (§2.11), input para las redirecciones 301 de la Fase 1.
- **18 ago 2026 (cierre de jornada)**: aplicados y reverificados de extremo a extremo (lint, `tsc --noEmit`, 59/59 tests, `next build`) los cuatro fixes de housekeeping abiertos por la mañana:
  - Export roto en `feed/domain/index.ts` (bloqueaba el build entero).
  - Dependencias de test que faltaban (`@testing-library/react`, `@testing-library/jest-dom`, `jsdom`).
  - `env.ts` con los nombres reales de variable, y `client.ts`/`server.ts`/`proxy.ts` usando `env.X` en vez de `process.env.X!` (el primer intento solo añadió el import sin sustituir los usos; quedaban 3 avisos de ESLint hasta completarlo).
  - Import relativo largo en `auth/callback/route.ts`, ahora con el alias `@/*`.

  Quedan abiertos sin urgencia: el parámetro `hd` en el login de Google, y las dos decisiones de negocio con Greener (§5). El `.gitignore` ya incluye `/supabase/.temp/`.

- **18 ago 2026 (mañana)**: fusión de `PROGRESO.md` y `CHECKLIST.md` en un único documento. Se corrigieron afirmaciones que ya no eran ciertas ("59 tests todos en verde", "0 errores de TypeScript", "build de producción limpio" — no lo estaban en ese momento por un export roto y dependencias de test que faltaban; ambos corregidos y reverificados el mismo día). Se documentó por primera vez el login del ABM, que ya tenía código funcional sin reflejar en el documento anterior.
- Decisiones y confirmaciones previas: admin como rol único multiusuario por dominio; `client`/`sector`/`services` de caso sin traducir; Cloudinary sustituye a Supabase Storage para imagen/vídeo; tools/insights sin iframe, validado con una tool real; Next.js 16.3.x / React 19.2.8 confirmados como versiones reales del proyecto; dataset de demostración sin insights ni tools.
