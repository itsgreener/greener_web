# Greener — Historial detallado, Fases 0-2 (completadas)

Archivo de detalle, separado de `PROGRESO.md` el 9 de septiembre de 2026 para aligerar ese documento. Contiene el relato completo, día a día, de cómo se construyeron las Fases 0, 1 y 2 (motor de feed, tools/insights sin iframe, esquema de Supabase, login del ABM, CRUD de content/media, estados editoriales, subida de paquetes HTML, escaneo antivirus, y subida de pines) — bugs reales encontrados, decisiones tomadas y por qué, y el histórico completo de correcciones al propio documento de estado.

**Nada de esto está pendiente.** Si buscas qué queda por hacer, está en `PROGRESO.md`, no aquí. Este archivo es para cuando haga falta el porqué de una decisión ya tomada, o el detalle de un bug ya cerrado.

Las referencias `§X` siguen apuntando al documento de arquitectura técnica V1.3. Las referencias `§2.N` de este archivo son internas, correspondientes a la numeración que tenían estas secciones en `PROGRESO.md` antes de archivarse.

---

## Paso a paso de lo realizado (Fases 0-2)

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

### 2.5 Tools/Insights sin iframe (completado y validado) — spike de la Fase 0, ver §2.18 para la subida real

Implementado en `src/modules/packages/` (domain/application/infrastructure, §24.4). Rutas servidas en `src/app/(public)/tools/[slug]/`, con CSP específico de ruta. Tool de ejemplo real (`fixtures/tools/pixel-palette/`): canvas + Web Worker + descarga — las tres capacidades de mayor riesgo de §22.

**10 tests**: 6 sobre composición del documento, 4 ejecutando el `worker.js` real dentro de un sandbox de Node. Validado también por HTTP real (`next build` + `next start` + `curl`).

**Problema real resuelto durante la implementación:** rutas relativas del paquete mal resueltas sin barra final en la URL — corregido inyectando `<base href>`.

**Nota del 8 sep**: esto sigue siendo el spike de Fase 0 tal cual se construyó — la composición del documento (`composeToolDocument.ts`) no ha cambiado. Lo que sí cambió es de dónde vienen los bytes: las rutas en vivo ya no leen de `fixtures/` sino de Supabase Storage real (§2.18); `fixtures/tools/pixel-palette/` y `localPackageSource.ts` se quedan como estaban, sin usarse desde ninguna ruta activa, por si hace falta un ejemplo offline sin Supabase.

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

### 2.16 Bug de zona horaria en "Programar" y endurecimiento del middleware — 7 sep (tarde)

Al correr la suite en local (macOS, zona horaria España) aparecieron 4 tests en rojo que en el sandbox de la revisión (UTC) pasaban limpios — la clase de fallo que solo se ve fuera de un entorno en UTC, exactamente el tipo de cosa que conviene coger antes de producción.

**Bug real, no de test: `<input type="datetime-local">` sin conversión de zona horaria.** El valor de ese input no lleva zona horaria ("2026-09-07T13:39"). `scheduleContentSchema` lo parseaba con `z.coerce.date()`, que interpreta una cadena así con la zona horaria del **proceso Node que la ejecuta** — en el navegador del admin (Madrid) es una cosa, en el servidor de producción (previsiblemente UTC en Dinahosting si nadie fija `TZ`) es otra, con 1-2 horas de diferencia según la época del año. Una fecha pensada como futura por el admin podía leerse como pasada en el servidor, o programarse en el momento equivocado sin que nadie se diera cuenta hasta que tocara.

**Arreglado convirtiendo en el navegador, no en el servidor**: `datetimeLocal.ts` (nuevo, `localDateTimeToIsoUtc`) usa el propio `new Date()` del navegador — que sí sabe la zona horaria real del admin, sea cual sea — para convertir el valor a una cadena ISO con `Z` explícito antes de enviarlo. `PublishControls.tsx` pasó de un `<input name="publishAt">` directo a un input controlado (sin `name`, solo UI) más un campo oculto con el valor ya convertido; el servidor nunca tiene que adivinar la zona horaria de nadie. `scheduleContentSchema` no cambió — ya aceptaba ISO con `Z` correctamente, el problema nunca estuvo ahí.

**El otro fallo (2 tests de `updateSession` con `/api/admin/*`): no reproducido en el sandbox de la revisión, primer intento de arreglo insuficiente — ver §2.17.**

**5 tests nuevos/reescritos** (`datetimeLocal.test.ts`), y el test de `contentSchema.test.ts` que asumía el comportamiento con bug reescrito para documentar el contrato correcto (ISO con `Z` explícito) en vez de afirmar algo que dependía de en qué zona horaria se ejecutara. **229/229 tests, `format:check`/`lint`/`tsc`/`build` limpios.**

### 2.17 Segunda vuelta al fallo de `/api/admin/*` y dos despistes propios — 7 sep (noche)

Segundo log de la misma máquina: dos fallos reales confirmados y corregidos, y el fallo de `updateSession` seguía exactamente igual.

- **`datetimeLocal.test.ts` fallaba con "Cannot find package"**: usaba un `import` estático de una ruta con `[id]` en medio (`@/app/admin/contents/[id]/edit/datetimeLocal`). En esa máquina, el resolvedor de alias de Vite falla con imports **estáticos** de rutas con corchetes, pero no con `await import(...)` **dinámico** — que es justo el patrón que ya usaban `mediaActions.test.ts` y `publishActions.test.ts` sin problema. Arreglado pasando los cuatro tests a import dinámico.
- **Despiste propio en `publishActions.test.ts`**: al arreglar el bug de zona horaria (§2.16) actualicé el test de `contentSchema.test.ts` pero se me olvidaron dos usos idénticos de la misma fecha ambigua (sin `Z`) en `publishActions.test.ts` — el mismo bug que acababa de documentar, colado en mi propio test. Corregido a `.toISOString()` completo en los tres sitios.
- **`updateSession` con `/api/admin/*`: el "arreglo" anterior no arreglaba nada.** Al leer el código fuente real de `NextRequest` (`node_modules/next/dist/server/web/spec-extension/request.js`), `request.url` **tampoco** es independiente de `NextURL` — el getter devuelve `nextUrl.toString()`, así que `new URL(request.url).pathname` seguía pasando por el mismo análisis interno de `NextURL` (i18n, `basePath`, etc.) que `request.nextUrl.pathname`. De ahí que el resultado no cambiara ni un poco entre el primer y el segundo intento: no era que la solución estuviera mal pensada, es que no era una solución distinta. **Se confirmó que era caché de Vite** (`node_modules/.vite`) sin invalidar tras sobrescribir ficheros fuera del flujo normal de un editor — al borrarla, el test pasó. Endurecida además la construcción de `NextRequest` en el test (string en vez de objeto `URL`), por higiene, aunque no era la causa real.

---

### 2.18 Subida real de paquetes HTML (§12.2, §12.5) — 8 sep

Sustituye `fixtures/` por Supabase Storage real como fuente de tools/insights en producción, con validación completa del contrato de paquete en la subida. Cierra el ítem de checklist "Subida de paquetes HTML" de la Fase 2 (§4.3), y de paso el hueco de que `/insights/[slug]` no existía como ruta pública — solo `/tools/[slug]` estaba construida.

**Esquema y RLS ya estaban listos desde el 6 de agosto** (`html_package`, `html_package_version`, con `html_package_public_read`/`html_package_version_public_read` filtrando por `status = 'published'`) — no hizo falta tocar el modelo de datos, solo construir el pipeline alrededor.

- **Bucket de Storage** (`20260908090000_admin_html_package_storage_bucket.sql`): `html-packages`, **privado** — el navegador nunca habla con Storage directamente (§12.1), así que no hace falta política de lectura pública en `storage.objects`, solo escritura de administrador (`is_admin()`).
- **Ciclo de vida de versión** (`20260908091500_admin_html_package_versions.sql`): `create_html_package_version` crea una versión en `draft` (nunca se hace pública sola); `publish_html_package_version` es la función que la hace la actual — la misma función sirve tanto para "publicar esta versión recién subida" como para "rollback a una versión antigua": ambas son, en la base de datos, exactamente la misma operación ("que la versión X sea la actual"), así que se implementaron como una sola función en vez de dos.
- **Validación real del ZIP** (`src/modules/packages/infrastructure/zipValidation.ts`, nueva dependencia `adm-zip`): estructura (`index.html` en raíz, `manifest.json` válido contra un schema de zod), protección zip-slip (rutas `..`/absolutas), symlinks rechazados, límite de tamaño, y dos comprobaciones de contenido best-effort — sin Service Worker registrado y sin URLs absolutas a dominios fuera de `externalDomains` del manifest. **No es análisis de JS real**: es un escaneo de texto con regex, así que no detecta URLs construidas dinámicamente — mejor que nada, no una garantía completa, documentado como tal en el propio código.
- **Antivirus/escaneo (§12.5): no implementado en su momento, cerrado el 9 sep — ver §2.19.**
- **Límite de tamaño del ZIP: 20 MB, cifra provisional.** El brief deja este número expresamente sin cerrar (Anexo A.2: "Tamaño Límite operativo definido en la especificación del 15 de agosto" — nunca llegó). Fuente única en `PACKAGE_LIMITS.maxZipSizeBytes`; también hubo que subir `experimental.serverActions.bodySizeLimit` en `next.config.ts` (por defecto 1 MB, insuficiente), que tiene que mantenerse igual o mayor que esa cifra.
- **`/insights/[slug]` y sus assets, nuevos** — hasta ahora solo existía `/tools/[slug]`. Son copias deliberadas del mismo contrato (§12: "el brief considera técnicamente equivalentes insights y tools... la diferencia es de negocio, no de aislamiento técnico"), con `'insight'` en vez de `'tool'` — no dos implementaciones distintas.
- **Checksum del paquete: del contenido, no del ZIP en crudo.** `sha256` sobre las rutas+bytes de las entradas ya extraídas y ordenadas, no sobre el buffer del ZIP completo — dos ZIPs con el mismo contenido pueden diferir byte a byte por metadatos internos (fechas por entrada, por ejemplo), así que hashear el buffer habría dado checksums distintos para el "mismo" paquete según cómo se comprimiera.
- **ABM**: `PackageUpload.tsx` + `packageActions.ts`, sección nueva en el editor de contenido (`page.tsx`) visible solo para `content.type === 'tool' | 'insight'` — subir ZIP, ver el listado de versiones con su estado, publicar una versión en borrador o volver a una anterior.

**Al escribir los tests de `zipValidation.ts` aparecieron dos cosas que merece la pena dejar anotadas** (no son bugs del código, son sobre cómo hay que testear esto):

- `adm-zip` **sanea las rutas al escribir** (`addFile('../fuera.txt', ...)` se guarda como `"fuera.txt"`) — un ZIP de prueba fabricado con la propia librería nunca contiene una ruta maliciosa de verdad, así que probar la protección zip-slip exige mutar `entryName` directamente sobre la entrada ya añadida, saltándose ese saneado.
- Un relleno de prueba como `"a".repeat(...)` **comprime a casi nada** con DEFLATE — para probar el límite de tamaño hace falta relleno incompresible (`crypto.randomBytes`), si no el ZIP resultante nunca llega a pesar lo que el test pretende simular.

**32 tests nuevos**: `manifestSchema.test.ts` (8), `zipValidation.test.ts` (12 — el más importante, construye ZIPs reales en memoria para cada caso), capa de aplicación (5) y los dos server actions (7). **261/261 tests, `format:check`/`lint`/`tsc`/`build` limpios.**

---

### 2.19 Escaneo antivirus con Cloudmersive — 9 sep

Cierra el hueco de §12.5 que quedó documentado y sin resolver en §2.18. Decisión tomada con Greener: **Cloudmersive** (no VirusTotal — su API tiene límite por minuto y su licencia no permite uso comercial/en producto sin plan de pago), y **bloqueante**: si el servicio no responde, tarda, o no confirma explícitamente que el archivo está limpio, la subida se rechaza. Es la decisión contraria a la del borrado de medios huérfanos en Cloudinary (§2.14, ahí sí es best-effort) — la diferencia es que ahí lo que se arriesga al fallar en silencio es gasto de cuota, aquí sería publicar un archivo potencialmente malicioso.

- **`src/modules/packages/infrastructure/cloudmersiveVirusScan.ts`**: una única llamada HTTP `multipart/form-data` al endpoint de Cloudmersive, con `fetch`/`FormData`/`Blob` nativos de Node — **sin el SDK oficial** (`cloudmersive-virus-api-client`) para no añadir una dependencia más por una sola llamada. `CLOUDMERSIVE_API_KEY` nueva en `env.ts` (validada, sin `NEXT_PUBLIC_`: el escaneo es 100% servidor) y en `env.local.example`.
- Se engancha en `uploadHtmlPackage.ts` (aplicación) **después** de `validateHtmlPackageZip` y **antes** de subir nada a Storage — si el paquete ni siquiera tiene la estructura correcta, no tiene sentido gastar una llamada al escáner en él.
- Se escanea el **ZIP completo en crudo**, no las entradas ya descomprimidas — es literalmente lo que pide §12.5 ("Escaneo del ZIP antes de publicar").
- **Qué caza esto y qué no, para que quede explícito**: un escáner de firmas detecta malware "de catálogo" (un binario troyanizado, un exploit conocido) colado dentro del ZIP. No detecta que el propio admin escriba JavaScript malicioso a propósito — eso no es "virus" para un antivirus, es código que se ejecutará tal cual en el navegador de quien visite la tool, y ya está cubierto por otra capa (CSP por ruta, §17.1, y que solo 3 dominios de confianza pueden llegar a subir algo — `is_admin()` repetido en la función SQL, el server action, y el middleware). El escaneo cubre el escenario "una cuenta de alguno de esos 3 dominios se ve comprometida y sube algo infectado", no "el admin es la amenaza".
- `packageActions.ts` distingue el mensaje de error de `VirusScanError` del de `PackageValidationError` — al admin le interesa saber si el problema es "el ZIP está mal formado" o "el ZIP está infectado", son cosas distintas de arreglar.

**10 tests nuevos**: `cloudmersiveVirusScan.test.ts` (8 — limpio, infectado con nombre de virus, infectado sin detalle, HTTP no-ok, fallo de red, JSON inválido, `CleanResult` ausente tratado como no-limpio, y que la llamada lleva la Apikey y el multipart correctos), más uno en `applicationLayer.test.ts` (el escaneo bloquea antes de llegar al repositorio) y uno en `packageActions.test.ts` (mensaje específico de `VirusScanError`). **271/271 tests, `format:check`/`lint`/`tsc`/`build` limpios.**

---

### 2.20 Subida de pines (alta individual) — 9 sep

Cierra el último ítem abierto de la Fase 2 (§4.3, §15.4). Alcance: **alta individual completa** (crear, editar, borrar, subir su medio); **carga masiva por CSV queda fuera de esta tanda**, tal como el propio brief la secuencia ("alta individual primero, CSV después, sin que esto bloquee el resto", §21.1) — no es un descarte, es seguir el orden que ya estaba escrito.

- **`supabase/migrations/20260909090000_admin_pin_crud.sql`**: `create_pin`/`update_pin`/`delete_pin`. El tipo (`fixed`/`animated`/`carousel`) se bloquea tras crear — mismo criterio que `content` y `content_block`: el tipo determina qué medios admite el pin, cambiarlo a mitad de camino dejaría medios de un tipo que ya no aplica.
- **`supabase/migrations/20260909091500_admin_pin_media.sql`**: `attach_pin_image`, `attach_pin_video`, `detach_pin_media`. `detach_pin_media` reutiliza el mismo mecanismo que `unlink_and_delete_media_asset` (§2.16): la FK de `pin_media.media_id` sin `ON DELETE CASCADE` hace fallar el borrado si el medio sigue en uso en otro sitio, sin tener que comprobarlo a mano.
- **Decisión de diseño — pin animado, un solo vídeo**: §9.1 pide "MP4 + WebM, máximo 5 s... y poster" para un pin animado. En vez de exigir tres archivos por pin, se sube **un único vídeo** y se deja que Cloudinary resuelva el formato de entrega (`f_auto`) y el poster por transformación de URL — el mismo patrón ya usado para el vídeo de un bloque de contenido (§2.13) y coherente con el principio que se repite en toda la arquitectura ("Cloudinary resuelve por URL", §9.2). Es una lectura razonable del brief, no una desviación arbitraria, pero queda anotada aquí por si alguien esperaba ver dos archivos subidos.
- **Límite de animación: 5 segundos, no 180.** Nuevo `PIN_ANIMATION_LIMITS` en `mediaLimits.ts` (junto a `IMAGE_LIMITS`/`VIDEO_LIMITS`, misma fuente única) y `validatePinAnimationUpload()` — un pin animado es un loop corto tipo GIF, no el vídeo de un caso; reutilizar el límite de 180 s habría sido un error real, no una simplificación razonable.
- **Carrusel: hasta 8 imágenes** (`slideOrder` 0-7, `attachPinImageSchema` lo valida en el propio schema además de en SQL).
- **Reutilización total de la infraestructura de Cloudinary que ya existía**: las rutas de firma (`/api/admin/media/sign`, `/api/admin/media/sign-video`) y el cliente de subida (`cloudinaryUpload.ts`) son genéricos — no hizo falta tocar ni una línea ahí para que sirvieran también para pines.
- **`src/modules/pin/`**: domain (`pinSchema.ts`, `pinMediaSchema.ts`, interfaces `PinRepository`/`PinMediaRepository`), infrastructure (`supabasePinRepository.ts` — incluye el `select` anidado `pin → pin_media → media_asset` para listar con sus medios en una sola consulta —, `supabasePinMediaRepository.ts`), application (7 funciones finas, mismo patrón de siempre).
- **ABM**: `pinActions.ts` (CRUD + adjuntar/quitar medios) + `NewPinForm.tsx` + `PinList.tsx` (listado, edición inline, borrado con confirmación) + `PinMediaManager.tsx` (imagen fija / vídeo animado / hasta 8 slides de carrusel, con el mismo criterio de borrar-antes-de-sustituir y warning no bloqueante en Cloudinary que ya se usa en bloques de contenido, §2.16). Sección nueva en el editor de contenido, visible para **todos** los tipos de contenido — los pines no son exclusivos de `case`/`page`, cualquier contenido puede tener los suyos (brief §2: "convertir cualquier pin en una posible puerta de entrada a Greener").

**55 tests nuevos**: `pinSchema.test.ts` (15), `pinMediaSchema.test.ts` (11), `mediaLimits.test.ts` ampliado con `validatePinAnimationUpload` (5 más), capa de aplicación del módulo pin (11), y `pinActions.test.ts` (13). **326/326 tests, `format:check`/`lint`/`tsc`/`build` limpios.**

**Pendiente en ese momento, cerrado a continuación (§2.21)**: carga masiva por CSV (§15.4 — alta, asociar a contenido, campos comunes, excepciones, errores por archivo, ~500 pines iniciales).

---

### 2.21 Carga masiva de pines por CSV — 9 sep, cierra la Fase 2

Último ítem abierto de la Fase 2 (§4.3). Reutiliza al máximo lo ya construido: la subida a Cloudinary es la misma del alta individual (firma + subida directa desde el navegador), y el único código de servidor nuevo es una función que junta `create_pin` + `attach_pin_image` en una sola llamada.

- **`src/modules/pin/domain/pinCsv.ts`**: parser de CSV propio, sin dependencia nueva (`papaparse` u otra) — el formato que hace falta soportar (cabecera + filas, comillas para escapar comas) no lo justifica. Alias de cabecera tolerantes (`queue_order`, `queueorder`, `queueOrder` → la misma clave); columnas desconocidas se ignoran en vez de romper la carga. **Bug real encontrado al escribir el test, no al usarlo**: la primera versión pasaba toda la cabecera a minúsculas (`queueOrder` → `queueorder`), perdiendo el campo en tiempo de ejecución porque el tipo `PinCsvRow` lo declaraba en camelCase — se corrigió con un mapeo explícito de alias antes de que llegara a ningún sitio que lo pudiera usar mal.
- **Columnas del CSV**: `filename,label,cta,ratio,language,alt,queueOrder` — exactamente las que pide §15.4 ("rótulo, CTA, ratio, idioma, alt y queue_order"). El tipo no está en la lista del brief a propósito: la carga masiva es de imágenes (`fixed`), no de carruseles ni animaciones.
- **`pinActions.ts` → `createPinWithImageAction`**: crea el pin y adjunta la imagen en una sola llamada de servidor, dado que el archivo ya se subió a Cloudinary desde el navegador. Si crear el pin falla, no se intenta nada más. Si el pin se crea pero adjuntar la imagen falla, **el pin no se pierde**: se devuelve su id igualmente para que el admin pueda localizarlo en el listado normal y subirle la imagen a mano, en vez de tener que repetir todo el lote.
- **`BulkPinUpload.tsx`**: selección de varios archivos + CSV opcional → tabla editable (una fila por archivo, valores resueltos del CSV si hay match por nombre de archivo, si no de los "campos comunes" del formulario — ratio/idioma/orden de cola por defecto) → subida secuencial, no en paralelo (a propósito: un lote de cientos de archivos en paralelo satura la conexión del admin sin necesidad, y la carga masiva no es una ruta de latencia crítica) → estado por fila (pendiente/subiendo/hecho/error) sin que el fallo de un archivo detenga el resto del lote, tal como pide §15.4 explícitamente.
- **Validación de fila antes de subir nada**: si a alguna fila le falta rótulo o alt, se avisa y no se empieza el lote — mejor que descubrirlo a mitad de 50 subidas.

**16 tests nuevos**: `pinCsv.test.ts` (11 — parseo, comillas, comillas escapadas, filas sin filename descartadas, alias de cabecera, columnas desconocidas ignoradas) y 4 nuevos en `pinActions.test.ts` para `createPinWithImageAction` (éxito, datos de pin inválidos, fallo de `createPin`, y el caso del pin creado sin imagen). **341/341 tests, `format:check`/`lint`/`tsc`/`build` limpios.**

**Con esto, la Fase 2 del checklist (§4.3) queda completa del todo** — sin ítems abiertos, incluida la carga masiva que había quedado pendiente.

---

## 6. Historial de correcciones a este documento

- **9 sep 2026 (tarde)**: cerrada la planificación completa del rediseño de formato de detalle que sustituye al repertorio de bloques A/B/C original — ver §2.22. Sin cambios de código; dos documentos nuevos en la raíz del repo (`especificacion-final-formato-detalle.md`, `contrato-zip-tools-insights.md`) que quedan como referencia para cuando se implemente. Corregida la referencia obsoleta a "repertorio de bloques pendiente de diseño" en el resumen ejecutivo y en el checklist de la Fase 3 — ya no aplica, se sustituyó el enfoque entero.

- **9 sep 2026 (bloque 3)**: cerrada la carga masiva de pines por CSV (§2.21) — último ítem abierto de la Fase 2. Parser de CSV propio sin dependencia nueva, con un bug real corregido antes de que llegara a ningún sitio (cabecera pasada a minúsculas perdía `queueOrder`). `createPinWithImageAction` junta crear pin + adjuntar imagen en una llamada. Subida secuencial con error por archivo sin tumbar el lote. 16 tests nuevos, 341/341 en total. **La Fase 2 del checklist (§4.3) queda completa.**

- **9 sep 2026 (bloque 2)**: cerrada la subida de pines — alta individual (§2.20). CRUD completo + imagen fija/vídeo animado/carrusel, reutilizando toda la infraestructura de Cloudinary ya construida para bloques de contenido. Decisión de diseño documentada: un pin animado se resuelve con un solo vídeo (Cloudinary negocia formato y poster por URL), no con tres archivos. Límite de animación propio de 5 s, distinto del de 180 s de vídeo de bloque. 55 tests nuevos, 326/326 en total. Carga masiva por CSV queda fuera, explícitamente pospuesta.

- **9 sep 2026**: cerrados los dos huecos abiertos ayer en la subida de paquetes HTML — ver §2.19. Escaneo antivirus con Cloudmersive (decisión de Greener: se descartó VirusTotal por límite de peticiones por minuto y licencia no apta para uso comercial), bloqueante por ser una comprobación de seguridad, no de limpieza. Límite de 20 MB del ZIP confirmado como definitivo. 10 tests nuevos, 271/271 en total.

- **8 sep 2026**: subida real de paquetes HTML — ver §2.18. Sustituye `fixtures/` por Supabase Storage como fuente de tools/insights en producción: bucket privado, validación completa del ZIP (estructura, zip-slip, symlinks, manifest, allowlist de dominios externos — esta última y la comprobación de Service Worker son escaneo de texto best-effort, no análisis real de JS), versionado con publicación y rollback (misma función para ambas), y `/insights/[slug]` construida desde cero junto con sus assets — antes solo existía `/tools/[slug]`. Dos huecos reales quedan documentados y sin resolver: no hay escaneo antivirus (§12.5 lo exige) y el límite de 20 MB del ZIP es un valor de partida, no una cifra confirmada por Greener. 32 tests nuevos, 261/261 en total.

- **7 sep 2026 (noche)**: segundo log de tests en local. Dos fallos reales confirmados y corregidos (§2.17): import estático de una ruta con `[id]` fallando en `datetimeLocal.test.ts` (pasado a import dinámico, igual que el resto), y un despiste propio — dos usos de una fecha ambigua sin `Z` que se me olvidaron actualizar en `publishActions.test.ts` al arreglar el bug de zona horaria de la tarde. El fallo de `updateSession` en `/api/admin/*` seguía igual pese al cambio anterior; investigado a fondo (código fuente real de `NextRequest`/`NextURL`), se descubrió que `request.url` tampoco es independiente de `NextURL` — de ahí que el primer "arreglo" no cambiara nada. Sigue sin reproducirse en el sandbox de la revisión; pedido borrar caché de Vite como diagnóstico antes de seguir adivinando a ciegas.

- **7 sep 2026 (tarde)**: al ejecutar la suite en local (macOS, zona horaria España) aparecieron 4 tests en rojo que en el entorno de la revisión (UTC) pasaban — ver §2.16. Arreglado un bug real: "Programar" no convertía el `<input type="datetime-local">` a UTC antes de enviarlo, así que el servidor lo interpretaba con su propia zona horaria en vez de la del admin — con el hosting previsiblemente en UTC, una fecha pensada en Madrid podía leerse 1-2 horas antes o después. Arreglado convirtiendo en el navegador (`datetimeLocal.ts`), no en el servidor. El otro fallo (JSON 401/403 en `/api/admin/*`) no se pudo reproducir para confirmar la causa; el middleware se endureció de todos modos calculando el pathname con `URL` estándar en vez de `nextUrl.pathname`. 229/229 tests, resto de la verificación limpia.

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
