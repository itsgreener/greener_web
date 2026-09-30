# Greener — Estado del proyecto y próximos pasos

Este documento resume el estado actual del repositorio `greener-web`, cómo verificarlo, y qué queda pendiente. Complementa (no sustituye) el documento de **Arquitectura técnica V1.3**, que sigue siendo la fuente de verdad de las decisiones de diseño.

**El relato detallado día a día de trabajo ya confirmado se archiva por separado, para que este documento se quede centrado en el estado actual y lo pendiente:**

- `historial-fases-0-2.md` — Fases 0-2: motor de feed, tools/insights sin iframe, esquema de Supabase, login del ABM, CRUD de content/media, estados editoriales, subida de paquetes HTML, escaneo antivirus, subida de pines. Archivado el 9 de septiembre de 2026.
- `historial-fases-3-4.md` — Fases 3-4: rediseño del formato de detalle (sustituye el editor de bloques A/B/C), construcción de las páginas públicas reales (home, `/work`, tipo A, Shell), panel de recomendaciones completo, verificación server-side de imágenes. Archivado el 23 de septiembre de 2026.

Este documento (`PROGRESO.md`) sigue siendo el único sitio a mirar para saber "¿qué queda por hacer?" — los archivos de historial son solo para el porqué de decisiones ya tomadas o el detalle de bugs ya cerrados. **Las referencias `§2.N`/`§3.N` que aparecen en el checklist (§4) y en el historial (§6)** apuntan a la numeración interna de esos archivos, no a las secciones 2/3 de aquí (que ahora son otra cosa, ver más abajo).

Sustituye a las versiones anteriores de `PROGRESO.md` y `CHECKLIST.md`. Actualízalo cuando cierres un bloque de trabajo real, no en cada commit menor; si algo que documenta deja de ser cierto, corrígelo aquí mismo en vez de dejarlo desactualizado.

**Nota de numeración (23 de septiembre):** este documento se reorganizó al archivar las antiguas §2 (rediseño de detalle) y §3 (construcción del sitio público) en `historial-fases-3-4.md` — la sesión de trabajo del 22-23 de septiembre ocupa ahora la §2, y todo lo que seguía se ha renumerado en consecuencia (antigua §4 → §3, §5 → §4, §6 → §5, §7 → §6).

Todas las referencias `§X` sin más contexto apuntan a secciones del documento de arquitectura. Última revisión: 28 de septiembre de 2026, verificada ejecutando el código real (no solo por lectura) — ver §2.8 (caché de assets y contrato ZIP) y §4.8 (pendientes detectados en la auditoría del mismo día).

---

## 1. Resumen ejecutivo

**Fases 0-2 completas** (motor de feed, ABM base, Supabase con RLS) y **Fases 3-4 completas** (rediseño de formato de detalle, home/`/work`/tipo A/Shell reales, panel de recomendaciones, verificación de imágenes) — detalle completo en los dos archivos de historial enlazados arriba. El sitio público sirve sus rutas principales (`/`, `/work/[slug]`, `/tools/[slug]`, `/insights/[slug]`, `/variety/[slug]`) con datos reales de Supabase.

**22-23 de septiembre: sesión de trabajo con siete bloques cerrados**, detalle completo en §2:

1. Dotfiles restaurados (mismo problema de Finder de siempre) y formato normalizado en todo el repo.
2. El ABM redirige a la edición completa justo después de crear un contenido, en vez de a la lista — la creación deja de ser un paso "a medias".
3. Límites de caracteres decididos e implementados para Tipo A y Tipo B: contador blando en el ABM + `line-clamp`/elipsis en el frontend público.
4. Verificación server-side de vídeo en Cloudinary (`verifyCloudinaryVideoAsset`) — cierra la asimetría con imagen que quedó anotada el 22 sep.
5. Auditoría de cookies iniciada: hallazgo real (Vimeo sin `?dnt=1`) corregido, y **click-to-load construido para Vimeo/Spotify** — YouTube sigue directo.
6. **Preview firmado del ABM construido (§15.3)** — cierra la decisión pendiente desde el 7 de septiembre.
7. Integrado trabajo externo al hilo de esta sesión: analítica Plausible real (evento "Pin Click" disparado, 6 de 7 eventos de §18.2 aún sin cablear) — resuelto además un conflicto de git real entre ambos trabajos.

**Cifras actuales, verificadas a fecha de hoy:**

- **736 tests automáticos, todos en verde** (`npm run test`, 78 ficheros).
- **0 errores de TypeScript**, **0 errores ni avisos de ESLint**, **build de producción limpio**, **formato limpio** (`format:check`).
- **40 migraciones SQL** — sin cambios esta sesión, ninguno de los siete bloques necesitó tocar el esquema.

---

## 2. Sesión de trabajo — 22-23 de septiembre

### 2.1 Dotfiles y formato (22 sep)

Mismo problema de siempre: el zip compartido para esta sesión no traía `.gitignore`, `.nvmrc`, `.prettierrc`, `.prettierignore` ni `.env.local.example` (Finder no comprime ficheros ocultos por defecto — ya documentado varias veces en el historial de Fases 0-2). Restaurados con el contenido exacto que Greener confirmó tener en local. Con el `.prettierrc` real puesto, `format:check` pasó de fallar en 262 ficheros (sin config, Prettier usaba sus valores por defecto) a solo 31 — investigado a fondo: no eran violaciones reales de las reglas (nunca aparece un punto y coma, una comilla cambiada o una coma final), es reflow puro de línea por una décima de versión de Prettier (`^3.9.6` fijado en `package.json`, `3.9.8` instalado — Prettier no garantiza output idéntico entre versiones aunque sea el mismo major). `npm run format` sobre todo el repo, sin tocar lógica.

### 2.2 Redirect tras crear contenido (22 sep)

`createContentAction` (`app/admin/contents/actions.ts`) descartaba el id devuelto por `createDraft` y redirigía siempre a la lista. Ahora captura ese id y redirige a `/admin/contents/{id}/edit` — el formulario de creación se queda mínimo (tipo, título, slug, idioma), pero el editor completo (textos largos, SEO, medios) es lo primero que se ve tras crear, no un paso aparte que haya que recordar terminar. Decisión tomada explícitamente por el usuario en vez de duplicar el formulario de creación con todos los campos.

### 2.3 Límites de caracteres — Tipo A y Tipo B (22 sep)

Decididos con el usuario campo por campo, con el ancho de página, el comportamiento de overflow y las convenciones SEO estándar como criterios — no cifras arbitrarias. Mecanismo: **límite blando** en el ABM (contador, nunca bloquea el guardado) + **truncado con elipsis real** en el frontend público (`-webkit-line-clamp`), que es la protección de verdad del layout. Los `max-width` del texto se fijan en unidades `ch` (no `px`), a propósito: la medida de línea así no depende de cuánto ancho deje libre el medio (que varía mucho según el ratio del carrusel, §2 de la especificación de formato) ni del tamaño de fuente final, que todavía no está cerrado.

| Campo                                      | Líneas         | Límite blando                                                                             |
| ------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------- |
| `title` (caso/episodio/tool/insight/other) | 2              | 80 caracteres                                                                             |
| `highlight` (caso/episodio)                | 2              | 110 caracteres                                                                            |
| `body` (caso/episodio)                     | 8 (un párrafo) | 560 caracteres                                                                            |
| `client` (caso, no traducible)             | 1              | 60 caracteres                                                                             |
| `summary` (tool/insight/other)             | 3              | 200 caracteres — más corto que `body` a propósito: es una mini introducción, no un cuerpo |
| `seo_title`                                | —              | 60 caracteres (convención de truncado de Google, no depende del layout)                   |
| `seo_description`                          | —              | 160 caracteres (idem)                                                                     |

Implementado: `modules/content/domain/textLimits.ts` (fuente única de los números), `components/admin/CharCounter.tsx` + `useCharCount.ts` (contador en vivo sobre inputs no controlados, sin pelearse con el `FormData` del envío), cableado en `TranslationForm.tsx` y `CaseDetailForm.tsx`; `line-clamp` con los `max-width` en `ch` en `CaseDetail.module.css`, `EpisodeDetail.module.css` y `ToolInsightDetail.module.css`. `title` y `seo_title` (y `summary`/`seo_description`) son dos usos del mismo campo con propósitos distintos — `buildContentMetadata`/`buildWorkMetadata` ya usaban `seoTitle ?? title` como fallback, así que un título largo sin `seo_title` propio se trunca en Google aunque no se trunque en pantalla; documentado, no resuelto con un aviso en el ABM todavía.

### 2.4 Verificación server-side de vídeo en Cloudinary (22 sep, trabajo externo integrado)

Llegó como cambio externo al hilo de esta sesión — un compañero cerró la asimetría anotada el 22 de septiembre por la mañana ("la verificación es solo de imagen"). `verifyCloudinaryVideoAsset` (nueva, en `cloudinaryServer.ts`) consulta la Admin API real de Cloudinary, valida que el `public_id` pertenece al directorio permitido de vídeos, y comprueba formato/ancho/alto/duración/peso contra `validateVideoUpload` (que ya existía en `mediaLimits.ts`, solo le faltaba quien la llamara desde el lado servidor). Integrada en los tres caminos de vídeo que quedaban sin verificar: `mediaActions.ts` (portada), `pinActions.ts` (vídeo de pin), `caseCarouselActions.ts` (vídeo de carrusel de caso) — mismo patrón que la verificación de imagen del 22 sep, con `CloudinaryVideoVerificationError` propio. Integrado sobre la copia de sesión sin conflicto (ningún fichero tocado por las otras seis piezas de esta sesión se solapaba). Dos tests nuevos (`cloudinaryServer.test.ts`, 554 líneas; `caseCarouselActions.test.ts`, 390 líneas) más reescritura sustancial de `mediaActions.test.ts`/`pinActions.test.ts`.

### 2.5 Auditoría de cookies — hallazgos reales y primeras mitigaciones (22-23 sep)

**Alcance real comprobado con grep, no supuesto**: solo Channel/episodio tiene contenido de terceros vivo hoy (YouTube, Vimeo, Spotify vía `<iframe>` en `EpisodeDetail.tsx`). Plausible y Mailchimp no estaban implementados todavía a esa fecha (Plausible se cerró parcialmente el mismo 23 sep, ver §2.7).

Contrastado contra el estado actual real de cada proveedor (no contra guías de hace un año):

- **YouTube** (`youtube-nocookie.com`, ya en uso): reduce el problema, no lo elimina — escribe en Local Storage un identificador de dispositivo al cargar, y planta cookie real al pulsar Play, consentimiento o no. Sin cambios de código, documentado.
- **Vimeo**: hallazgo real y corregido — el código no añadía `?dnt=1` a la URL del embed, así que Vimeo plantaba la cookie `vuid` (persistente, dos años) desde la carga. Arreglo de una línea en `embedUrl()`, con test actualizado.
- **Spotify**: sin mitigación técnica de una línea — planta varias cookies desde la carga (`sp_t`, `sp_ab`, `sp_landing`...), sin parámetro equivalente a `dnt`.

**Click-to-load construido para Vimeo y Spotify** (llegó como trabajo externo paralelo, integrado por resolución de un conflicto de git real — ver §2.7): el iframe no se monta hasta que el usuario pulsa "Cargar contenido de {proveedor}"; YouTube se sirve directo, su mitigación ya es la más fuerte de las tres. Nuevas clases `.embedConsent*` en `EpisodeDetail.module.css`, funciones `providerLabel`/`requiresClickToLoad` en `EpisodeDetail.tsx`.

**Decisión de fondo, explícitamente aplazada por el usuario** ("de momento no es algo que te pueda decir ni resolver"): el nivel de rigor a asumir — si con `dnt=1` + click-to-load basta, o si hace falta un banner/CMP real de consentimiento antes de cargar nada (que hoy no existe en el proyecto). Sigue en §5.

### 2.6 Preview firmado del ABM — construido (23 sep), cierra §15.3

Decisión pendiente desde el 7 de septiembre, aplazada entonces "hasta que exista una plantilla pública real" — ya existían las cuatro. Diseño: token **autocontenido y sin estado**, mismo mecanismo HMAC-SHA256 que el cursor firmado del feed (`modules/feed/infrastructure/cursor.ts`) — el propio token lleva firmados `contentId` y `expiresAt`, sin tabla ni migración nueva. Caduca a los **7 días** (decisión de sesión de trabajo). Contrapartida asumida a propósito: no se puede revocar un token antes de que caduque.

- `modules/content/infrastructure/previewToken.ts` — codifica/decodifica el token.
- `modules/content/domain/contentPath.ts` — resuelve la ruta pública (`/work`, `/tools`, `/insights`, `/variety`) según `content.type`.
- `modules/content/application/resolvePreviewContext.ts` — el resolver central: valida el token contra el slug pedido y, si coincide, usa `createServiceClient()` (salta RLS — `content` en `draft`/`scheduled` está completamente bloqueado para lectura pública) para leer el contenido; si no, cae al camino público normal. `getContentBySlug`, `getPublicCaseDetail`, `getPublicCaseCarousel` y `getPublicEpisode` ganaron un parámetro `client` opcional para que el carrusel y el embed de un episodio en preview también se lean con privilegios.
- Las cuatro páginas de detalle leen `?preview=<token>` y marcan `noindex` en la metadata cuando el preview es válido.
- Botón "Generar link de preview" en `PublishControls.tsx` (solo visible si el contenido no está publicado) — muestra la URL en un campo copiable para compartir a mano; no se envía por ningún canal automáticamente.
- Docstring de `serviceClient.ts` ampliado con este nuevo uso legítimo (antes solo documentaba `feed_session`/`feed_round`).

Preview es para revisar contenido **antes** de que pase por primera vez a `published` — no hay concepto de "borrador sobre lo publicado" (arquitectura §19.1: "no habrá staging persistente de contenido"), así que el botón no aparece una vez publicado. 15 tests nuevos: `previewToken.test.ts` (firma, manipulación, caducidad exacta a los 7 días con timers falsos), `contentPath.test.ts`, `resolvePreviewContext.test.ts` (token válido, token de otro contenido, token corrupto, contenido inexistente) — estos dos últimos revelaron un fallo real de estrechamiento de tipos de TypeScript y un descuido propio de mocks sin limpiar entre tests, ambos corregidos antes de dar el bloque por cerrado.

### 2.7 Analítica Plausible y resolución de un conflicto de git real (23 sep)

El usuario compartió un zip con trabajo de un compañero hecho en paralelo, más un conflicto de merge sin resolver (`<<<<<<< Updated upstream` / `>>>>>>> Stashed changes`) en `episodeDetail.smoke.test.tsx`, entre el test de Vimeo `dnt=1` de esta sesión y los tests nuevos de click-to-load del compañero. Resuelto reconstruyendo el fichero a mano: el test de YouTube ("Updated upstream") más los tests de click-to-load ya limpios del compañero — el `it.each` original quedó redundante, cubierto con más detalle por los suyos.

**Integrado del compañero**: `modules/analytics/analytics.ts` + `AnalyticsProvider.tsx` — integración real con `@plausible-analytics/tracker` (nueva dependencia), evento **"Pin Click"** disparado desde `PinCard` con `section`/`destinationType`/`pinType`, ya cableado en los cuatro sitios donde se pinta un pin (feed principal con `section: scope`, recomendaciones de caso/episodio/tool-insight con `section: 'recommendations'`). Solo producción, excluye `/admin` y `/auth` del tracking. Aplicado a mano sobre `PinCard/index.tsx` y las tres plantillas de detalle en vez de sobrescribir con la copia del compañero, para no perder los comentarios ya existentes que su copia no traía (partía de un snapshot distinto, sin git real de por medio que lo hubiera evitado).

**Hallazgo real corregido al integrar**: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` se leía en `layout.tsx` pero no estaba declarada en `env.ts` — rompía la propia convención del proyecto (§24.5, fallar explícito si falta una variable). Añadida al schema (opcional) y a `.env.local.example`.

**Aviso honesto, no una crítica**: de los siete eventos que define `AnalyticsEventMap` (§18.2), solo **"Pin Click"** se dispara de verdad hoy. "Case Open", "Tool Open", "Tool Used", "Insight Open", "Episode Play", "Newsletter Signup" y "Feed Depth" existen como tipos pero nadie los llama todavía — la plomería está lista, falta cablear el resto.

También descartado un `Archivo.zip` suelto dentro del zip recibido (backup accidental del propio proyecto, no algo real que integrar), y copiados `package.json`/`package-lock.json` con la dependencia nueva.

**Verificación final de toda la sesión**: ESLint 0, `next build` y `tsc --noEmit` limpios, **65 ficheros / 611 tests** en verde, `format:check` limpio.

### 2.8 Caché de assets de tools/insights y ampliación del contrato ZIP (28 sep)

**Bug real corregido.** Los assets de un paquete (`/tools|insights/[slug]/app/assets/...`) se servían con `Cache-Control: public, max-age=31536000, immutable`, pero **su URL no lleva la versión del paquete**: la de la v1 y la de la v2 es la misma. Tras publicar una versión nueva (o hacer un rollback) los visitantes habrían seguido viendo el JS/CSS antiguo hasta un año. Una caché «para siempre» solo es correcta si la URL cambia cuando cambia el contenido.

Arreglo, sin migración ni cambio de esquema: **revalidación con ETag** usando el `checksum` de contenido que ya guarda `html_package_version` (inmutable por versión). `Cache-Control: public, no-cache` + `ETag`; con `If-None-Match` coincidente se responde **304 sin descargar nada de Storage**. Una versión nueva o un rollback cambian el checksum, y el navegador recibe el asset correcto en su siguiente carga. Sin necesidad de renombrar archivos (`main.v2.js`).

- `modules/packages/domain/assetCaching.ts` — dominio puro: `ASSET_CACHE_CONTROL`, `buildAssetEtag`, `isNotModified` (comparación débil `W/`, listas y `*`, RFC 9110).
- `modules/packages/infrastructure/assetResponse.ts` — `buildAssetResponse` (200/304 con cabeceras) y `contentTypeFor` (movido aquí sin cambios desde las rutas).
- `supabaseStorageSource.getStoragePackageAsset` ahora devuelve `{ notModified, etag, data? }` y acepta `ifNoneMatch`. Las dos rutas de assets quedan como capas finas (ADR-15) que solo delegan.

**Contrato `contrato-zip-tools-insights.md` ampliado** con las aclaraciones que se le dieron a quien prepara los paquetes, y con dos correcciones a lo que decía el propio contrato:

- **Todo recurso debe ir bajo `assets/`** — el contrato decía «subcarpetas libres», pero el servidor solo entrega lo que cuelga de `assets/`; un `style.css` en la raíz **pasa la subida y da 404**. Solo `.js/.css/.json/.png/.svg` tienen Content-Type propio.
- **Las rutas relativas escritas dentro del JS cuentan desde el `<base href>`, no desde el archivo**: `new Worker('./worker.js')` apuntaba a `/tools/{slug}/app/worker.js` (404). **La tool de ejemplo `fixtures/tools/pixel-palette` tenía exactamente ese fallo** y se ha corregido a `./assets/worker.js`.
- Qué cuenta el escáner de dominios (todo `http(s)://`, sin distinguir `href`/recurso/texto/comentario, dominio exacto, se declara el dominio y no cada enlace), y que `externalDomains` **no habilita** cargar nada de ese origen — solo permite que la subida pase y que los enlaces `<a href>` funcionen.
- Cómo se monta el HTML (se conserva el `<head>`; del `<body>` solo el interior; se pierden sus atributos y los de `<html>`; `body {}` afecta al body del sitio) y tabla de qué permite y qué no la CSP (scripts inline y `onclick=` no se ejecutan, `blob:` no vale para imágenes, fuentes `data:` bloqueadas…). Checklist ampliado.

**47 tests nuevos** (611 → 658): ETag y `If-None-Match`; resolución contra un Supabase simulado (incluido que un 304 **no descarga** de Storage, y que versión nueva y rollback invalidan la caché); las dos rutas con sus cabeceras reales; y **dos ficheros que fijan las afirmaciones del contrato contra el código** (`zipValidationContract.test.ts`, `composeToolDocumentContract.test.ts`) — si el validador o la composición cambian, el contrato deja de ser cierto y el test lo dice.

**Límite del ZIP: 10 MB, cerrado el mismo día.** El contrato decía 10 MB y el código admitía 20, y la decisión estaba abierta. Se cierra en **10 MB** por una razón técnica, no de preferencia: el ZIP entero se envía tal cual a Cloudmersive (§12.5) y su cuenta gratuita solo escanea ficheros de hasta 10 MB («requires paid account for >10MB»); como el escaneo es bloqueante, un ZIP mayor tampoco se podría publicar. Con un plan de pago de Cloudmersive el tope sube mucho, así que la cifra puede revisarse si hiciera falta. Detalles:

- **10 MB decimales (10.000.000 bytes), no MiB**: coincide con lo que muestra el Finder de macOS a quien prepare el ZIP, y queda bajo el tope del antivirus se cuente como se cuente (su documentación no aclara cuál de las dos).
- `PACKAGE_LIMITS.maxZipSizeBytes` baja a esa cifra y el mensaje de rechazo dice «10 MB».
- **Guarda nueva en `scanZipForViruses`** (`CLOUDMERSIVE_MAX_FILE_BYTES`): si un ZIP mayor llegara hasta ahí, se rechaza con mensaje claro y **sin enviarlo**, en vez de recibir un error opaco del servicio. Sigue siendo bloqueante.
- **`next.config.ts` se queda en `bodySizeLimit: '20mb'` a propósito**: tiene que ser igual o mayor que el límite (el cuerpo lleva el ZIP más los campos del formulario), y siendo más grande un ZIP de 10-20 MB llega al validador y recibe el mensaje claro en vez del error genérico de Next por cuerpo demasiado grande.
- `packageSizeLimits.test.ts` (7 tests) ata las tres cifras: falla si el límite del ZIP supera el del antivirus o si el cuerpo de la Server Action baja de ese límite. Comprobado a propósito forzando ambos desalineamientos.

### 2.9 Despliegue standalone, metadatos, 404/error y normalización de `SITE_URL` (28 sep)

**`output: 'standalone'`** activado en `next.config.ts` y **probado ejecutando `node server.js`** en un sandbox (Node 22), contrastado con la documentación oficial de Next. Verificado: `public/` va junto a `server.js` y `.next/static/` dentro de la carpeta `.next` del standalone (ninguna de las dos se copia sola); `.env.local` se lee cuando está junto a `server.js`, y sin él la app falla con el error de validación de `env.ts`; los estáticos y `public` se sirven (200) tras la copia manual. Guía completa en **`despliegue.md`**; la versión inicial incluía una plantilla de Nginx y de las redirecciones 301 que **se retiró después**, porque en Dinahosting el proxy no es editable (ver §2.10).

**Metadatos.** `metadataBase` en el layout raíz (desde `NEXT_PUBLIC_SITE_URL`), favicon, `src/app/sitemap.ts` y `src/app/robots.ts`, ambos dinámicos a propósito (dependen del contenido publicado y del entorno de ejecución, no del del build). El sitemap incluye las páginas fijas, el contenido publicado por su ruta pública y, para casos y episodios con varias traducciones, `/work/[slug]/[locale]` con hreflang; se lee con paginación para no truncarse en las 1.000 filas por defecto de PostgREST. `robots.txt` bloquea `/admin`, `/api/`, `/auth` y `/preview`. Probado contra el servidor real con un Supabase falso local: XML válido, dominio correcto y consulta con la forma esperada.

**`NEXT_PUBLIC_SITE_URL`.** Con una barra final (`https://itsgreener.com/`) el link de preview salía con `//`. `env.ts` la recorta ahora una sola vez, y en producción, si la variable falta, avisa en voz alta en vez de caer a localhost sin decir nada (no se hace obligatoria: rompería builds que hoy funcionan).

**404 y error básicos.** `StatusPage` (componente compartido, sin `<main>` porque el Shell ya lo aporta), `NotFoundPage` y `ErrorPage`; `not-found.tsx`, `error.tsx` y `global-error.tsx` en la raíz, y `not-found.tsx` y `error.tsx` en `(public)` para que dentro del Shell se mantenga el menú lateral. En inglés (§2.4: interfaz global en inglés), aunque los textos actuales del feed («Cargando…») están en español.

**Hallazgo: el 404 de una página pública llega con el `<body>` vacío** (ver §4.8). Se aisló con una serie de experimentos de compilación y, al final, con una aplicación Next mínima creada desde cero: reproduce lo mismo, así que no es del proyecto.

**Pruebas.** 34 tests nuevos (`tests/unit/seo`, `tests/unit/status`), con roturas deliberadas para comprobar que detectan la normalización de la URL, la paginación, el hreflang y el `robots`. Total: 692 tests en 75 ficheros.

**Dos fallos de método propios, anotados para no repetirlos:** (1) una prueba sirvió una copia antigua del build porque mis comandos con `pkill -f "node server.js"` se mataban a sí mismos antes de copiar; se detectó comparando los `BUILD_ID`. (2) Tras `npm run build` con `output: 'standalone'`, `next start` ya no vale: hay que usar `node .next/standalone/server.js`.

### 2.10 Despliegue real (PM2 + cron), tope de copia del proxy, hreflang y redirecciones (28 sep)

**Un error mío de partida, corregido.** La ayuda de Dinahosting que se consultó («Utilizar versión personalizada de NodeJs») describe «Otras aplicaciones» con Passenger, y la tomé como el modelo de despliegue. **No lo es: no sirve para Next.** El despliegue real, que el usuario ya había descrito antes y que contradije, es **PM2 manual + un cron de vigilancia**, con un proxy Nginx que gestiona Dinahosting y que no se puede modificar (solo se enciende y se espera al puerto que asigna). `despliegue.md` se ha reescrito **dos veces**: la primera versión asumía un Nginx editable, la segunda Passenger; la actual parte de lo que el usuario describe y solo afirma lo que se ha probado. Se retira la plantilla de Nginx y el plan de 301 en Nginx.

**PM2, verificado con PM2 7.0.4 y una release real del proyecto.** Un `ecosystem.config.cjs` con `PORT`, `cwd` por el enlace simbólico e `interpreter` por ruta absoluta arranca la app; lee el `.env.local` aunque sea un enlace simbólico a un fichero compartido; PM2 la levanta tras un `kill -9`; y con varias releases, cambiar el enlace `current` **no** cambia el proceso en marcha hasta `pm2 restart` (tras lo cual sí sale de la release nueva). El `PATH` mínimo del cron es una trampa real: `pm2` empieza por `#!/usr/bin/env node` y falla sin Node en el `PATH` (`env: 'node': No such file or directory`), así que el vigilante lo fija.

**Fallo real encontrado en mi propio vigilante.** La primera versión no funcionaba en el caso para el que existe: con el daemon de PM2 muerto, `pm2 pid` lo arranca y escribe su aviso («[PM2] Spawning PM2 daemon…») en la salida estándar; mi script lo leía como un PID válido y no hacía nada. Corregido aceptando solo una línea numérica y **reprobado en cinco escenarios** bajo un entorno mínimo tipo cron: daemon muerto (la app responde en unos 2 s), app en marcha (no toca nada), parada, borrada de PM2 y proceso que muere. Lección de método: la primera prueba dio resultados ambiguos porque medía con un tiempo fijo; el fallo solo quedó claro esperando a que el puerto respondiera y leyendo qué imprimía `pm2 pid`.

**Redirecciones de las apps antiguas: descartadas (28 sep).** Se llegó a construir un redirector de 95 líneas (y se probó con 9 tests) como alternativa a tocar las apps viejas, porque las redirecciones del panel de Dinahosting solo admiten subdominio o dominio entero. **Se ha eliminado** al decidirse que no hacen falta: `tools.itsgreener.com` e `insight.itsgreener.com` eran pruebas de un proyecto que no llegó a terminarse, sin visitas, y sus contenidos no tienen equivalente en la web nueva (ninguna de las 9 tools antiguas coincide con las 12 nuevas; de los 4 insights, 3 tienen equivalente). Un redirector sin uso era código muerto, contra el principio de §3 de la arquitectura. Queda anotado en `despliegue.md` §7, junto con el matiz de que `permanent: true` de Next devuelve un 308, no un 301.

**Defecto propio encontrado y corregido.** Al leer el config serializado de `server.js` apareció `proxyClientMaxBodySize: 10485760`. Confirmado con la documentación de Next y varios casos reales, y **reproducido**: con `src/proxy.ts` cuyo matcher cubre las Server Actions, Next copia en memoria el cuerpo de cada petición no-GET con un tope de 10 MiB y por encima trunca en silencio. Sonda con `POST /api/feed/sessions`: 5 MB llegaba entero, 12 y 18 MB llegaban cortados a 10 MB («Request body exceeded 10MB… Only the first 10MB will be available»). Con `proxyClientMaxBodySize: '25mb'`, 12 y 18 MB llegan enteros y el aviso desaparece. `packageSizeLimits.test.ts` amplía la guarda: el tope del proxy debe ser ≥ el de las Server Actions y dejar sitio a un ZIP de 10 MB más la cabecera multipart.

**hreflang verificado.** Con un Supabase falso local que imita PostgREST y `SITE_URL` con barra final a propósito, `/work/destroyer`, `/work/destroyer/en` y `/work/destroyer/ca` emiten los tres `<link rel="alternate" hreflang>` con el dominio completo y consistentes entre sí. Se observa además que **no se emite `canonical`** (anotado en §4.8).

**Pruebas.** 694 tests en 75 ficheros. Las roturas deliberadas del tope del proxy se detectan.

### 2.11 Cookies: opción A construida, y una CSP que bloqueaba Plausible (28 sep)

**Decisión.** Opción A, sin banner: ningún embed de tercero se carga hasta que el visitante pulsa, **YouTube incluido** (antes se servía directo). Aviso **en inglés** (§2.4), sin recordar la elección, con enlace a «Privacy & Cookies». La preocupación de que sea repetitivo (un clic por vídeo) queda asumida por ahora; a futuro puede sustituirse por un banner global. Base: guía de la AEPD de mayo de 2024, que reconoce pedir el consentimiento justo antes de descargar un vídeo (§3.2.3 d).

**Qué se hizo.** `EpisodeDetail` deja de tener una excepción para YouTube y muestra un aviso concreto: nombra al proveedor, dice qué ocurre al cargarlo (IP, cookies y tecnologías propias del tercero, sus propios fines) y evita el lenguaje vago que la guía desaconseja («puede», «podría»). Un icono «Privacy & Cookies» en el menú lateral (siempre visible: un pie de página no serviría con el feed infinito), la casilla del formulario de contacto enlaza a la política, y `cookies-inventario.md` reúne los hechos técnicos para que el asesor legal redacte la política y señala lo que necesita su criterio.

**Fallo real encontrado al preparar el inventario.** El tracker de Plausible publica cada evento con `fetch` en `https://plausible.io/api/event`, y la CSP (añadida el 22 sep, un día antes que Plausible) no lo permitía en `connect-src`: **en producción el navegador habría descartado todos los eventos en silencio**. Ahora `connect-src` abre ese origen solo si `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` está definida (mínimo privilegio), con test. Además, se comprobó que el tracker no escribe cookies ni almacenamiento (0 apariciones de `cookie`; solo lee `localStorage.plausible_ignore`).

**Corrección a mi propia guía de despliegue.** Al probar con y sin la variable descubrí que `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` **se lee en tiempo de ejecución** del `.env.local` del servidor, no del build: con la variable solo en el build, el cliente no recibía dominio y la CSP no abría `plausible.io`. Lo mismo vale para `NEXT_PUBLIC_SITE_URL`. Solo **tres** `NEXT_PUBLIC_*` se incrustan al compilar (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `CLOUDINARY_CLOUD_NAME`, las únicas referenciadas de forma literal). Yo había escrito, en la guía y en el `.env.local.example`, que las cinco se fijaban en el build; corregido en `despliegue.md` §2 y §6 y en el ejemplo.

**Pruebas.** Cuatro roturas deliberadas fallan como deben: YouTube cargando directo, guardar la elección, lenguaje vago en el aviso y quitar Plausible de la CSP. Hay tests que fijan que no se persiste nada (ni cookies ni `setItem`) y que un nuevo montaje vuelve a preguntar.

**Sin comprobar.** El comportamiento real de los proveedores hoy: los hechos de YouTube/Vimeo/Spotify son de la auditoría del 22-23 sep y no se pudieron repetir sin un navegador (`cookies-inventario.md` §6). Tampoco se ha podido ver la CSP actuando en un navegador.

### 2.12 Integración de cambios externos del 28 sep — bug real de assets, MIME y analítica (29 sep)

El usuario pasó un zip con cambios hechos por otra persona del equipo el 28 de septiembre, sobre una copia mía **anterior a la sesión de cookies** (sin `.env.local.example`, sin `cookies-inventario.md`, sin el enlace a `/privacy`). Antes de tocar nada se comparó ese zip contra mi entrega para separar "diferencias porque su base es más vieja que la mía" de "cambios reales que hay que traer" — evitando así revertir por accidente mi propio trabajo de cookies al fusionar.

**El hallazgo importante: un bug real, presente desde el primer zip.** Las rutas `/tools|insights/[slug]/app/assets/[...file]` pedían a Storage el fichero sin el prefijo `assets/`, porque Next.js ya consume ese segmento como parte fija de la ruta antes de pasar el resto como parámetro `file` — pero en Storage el fichero SÍ vive bajo `assets/`, ya que el ZIP se sube conservando su estructura interna (`assets/main.js` en el ZIP → `<storage_path>/assets/main.js` en Storage). Con esto, **todo asset de toda tool o insight habría dado 404** contra Storage real. Nunca lo detectaron mis tests porque mockean Storage directamente y no comprueban qué ruta exacta se pide. El equipo lo encontró y arregló anteponiendo `'assets'` en la ruta; aquí se ha integrado, reescrito el comentario explicando el porqué, corregido el test que sin querer daba por buena la ruta rota (`assetRoutes.test.ts` esperaba la llamada SIN el prefijo), y **verificado contra un servidor real**: con un Storage simulado (servidor HTTP propio, no un mock de Vitest) y el build real servido con `node server.js`, se confirmó que la petición HTTP que sale ahora del servidor lleva `/assets/` en la ruta, para una tool y para un insight, incluida una fuente `.woff2`.

**Tipos MIME ampliados.** `assetResponse.ts` ahora sirve `.woff`, `.woff2`, `.jpg`, `.jpeg` y `.webp` con su Content-Type real (antes, `application/octet-stream`), con normalización a minúsculas. Los insights reales llegaron con tipografía Coolvetica en WOFF2, que sin esto no se habría aplicado en el navegador. Pendiente: `contrato-zip-tools-insights.md` §1 sigue sin actualizar con la lista ampliada.

**Cuatro eventos de analítica nuevos, cableados de verdad:** `Case Open`, `Tool Open`, `Insight Open` (vía un componente nuevo, `ContentOpenTracker`, montado en `ToolInsightDetail.tsx` y en `work/[slug]/page.tsx` para el caso) y `Episode Play` (en `EpisodeDetail.tsx`). Incluyen atribución de la sección de origen: `PinCard` guarda en `sessionStorage` (30 min, consumido una sola vez, atado a la ruta de destino) desde qué sección se hizo clic, vía un módulo nuevo `navigationAttribution.ts`; el detalle la recupera al montarse. Los previews firmados (`?preview=`) quedan excluidos de todas las métricas. `Episode Play` se fusionó a mano con el rediseño de cookies del 28 sep (aviso en inglés, clic también en YouTube): el equipo lo había escrito sobre la versión anterior, en español y sin ese clic para YouTube — el resultado final lleva el texto y el gate nuevos, más el `?autoplay=1` (en YouTube y Vimeo) y el tracking que ellos añadieron, ya que con el gate delante, pulsar "cargar" ya es la intención explícita de reproducir. Añadido el campo `program` a `PublicEpisode` (`publicEpisodeSource.ts`), que necesita el evento.

**Un retroceso que no se adoptó.** El fixture `pixel-palette/assets/main.js` había vuelto a `new Worker('./worker.js')`, la ruta rota que ya se había corregido a `'./assets/worker.js'` en la sesión del 28 de septiembre (§2.8). Se mantiene la versión corregida; queda avisado al usuario, no aplicado en silencio.

**Pruebas.** Todo lo integrado se reescribió con tests propios en vez de adoptar los suyos tal cual (llegaban con un formato muy distinto al del proyecto, sin salto de línea final, y en el caso de `assetRoutes.test.ts` con una aserción que ocultaba el propio bug). 25 tests nuevos, con roturas deliberadas comprobadas para: el prefijo `assets/` en las rutas, y la exclusión de `Episode Play` durante un preview. Un fichero de test duplicado que llegó en una ubicación incorrecta (`tests/packages/`, fuera de `tests/unit/`) no se adoptó.

### 2.13 Escáner de dominios y validación estructural de assets/ (29 sep)

Dos de los puntos que llevaban tiempo en la lista de pendientes (§4.8), abordados juntos porque viven en el mismo validador (`zipValidation.ts`):

**1. Falso positivo del namespace SVG, corregido.** `xmlns="http://www.w3.org/2000/svg"` (y el resto de namespaces XML estándar: XLink, XHTML, `xmlns:xmlns`, `xml:` y MathML) ya no cuenta como dominio externo. El escaneo reconoce esas cadenas exactas y las ignora, con un límite de palabra al final (`(?![A-Za-z0-9.-])`): sin ese límite, una URL genuinamente distinta como `http://www.w3.org/2000/svgx/otra-cosa` se habría colado también como "namespace conocido", por ser el namespace un prefijo textual suyo — hay un test que fija justo ese caso. **Las cabeceras de licencia de librerías (`threejs.org`, `github.com`…) siguen sin resolverse**, a propósito: no hay ninguna forma fiable de distinguir por texto "esto es un comentario de licencia" de "esto es una referencia real" sin analizar JS de verdad, y una heurística de comentarios sería frágil y podría ocultar referencias genuinas. Sigue documentado en el contrato como limitación conocida.

**2. Ficheros fuera de `assets/`, ahora rechazados al subir.** Antes, un archivo mal colocado en la raíz del ZIP (por ejemplo `style.css` en vez de `assets/style.css`) pasaba la validación sin avisar y solo se descubría como 404 en la página publicada — justo el mismo tipo de fallo silencioso que el bug de las rutas de assets (§2.12), aunque de origen distinto (aquí es la validación de subida la que no comprobaba nada, no el servido). Ahora se rechaza con un mensaje que dice qué archivo está mal y qué debería pasar.

**3. Deduplicación de avisos.** Un dominio sin declarar que aparece muchas veces en un mismo archivo (citas repetidas a la misma fuente en un insight) antes generaba un aviso por cada aparición — cien enlaces a un dominio no declarado producían cien líneas casi idénticas, capaces de ahogar cualquier otro problema real en la lista. Ahora es un aviso por (archivo, dominio).

**Pruebas.** 8 tests nuevos y 3 reescritos (los que construían un ZIP con un archivo en la raíz para probar otra cosa — el escaneo de Service Worker y de dominios — tuvieron que moverlo a `assets/` para seguir probando lo que probaban, no la regla nueva). Cuatro roturas deliberadas comprobadas: quitar el límite de palabra del namespace, quitar la regla estructural, y quitar la deduplicación — las tres detectadas por tests existentes o añadidos para la ocasión.

---

## 3. Cómo verificar todo esto tú mismo

```bash
npm install
npm run lint               # ESLint
npm run format:check       # Prettier
npx next build              # build de producción — genera también los tipos de ruta (.next/types). Necesita variables de entorno reales o de prueba (ver src/lib/env.ts); sin ellas falla en "Collecting page data", no antes.
npx tsc --noEmit             # TypeScript — hazlo DESPUÉS de next build/dev, si no da falsos positivos de LayoutProps
npm test                     # 736 tests (unit + property-based + smoke con jsdom)
node scripts/generate-demo-data.mjs   # regenera el dataset (determinista) — incluye alt del carrusel de caso desde el 14 sep
```

Para aplicar el esquema contra un proyecto Supabase real: `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push` (instrucciones completas en `supabase/README.md`, aunque ese fichero se quedó desactualizado en las migraciones que lista — la lista real y al día está en el historial de Fases 3-4).

Para cargar el dataset de demo contra un proyecto real: `supabase/seed_demo_data.sql` **no** lo aplica `db push` (no es una migración) — pégalo en el SQL Editor del dashboard o `psql -f supabase/seed_demo_data.sql` contra la cadena de conexión del proyecto. Las 6 imágenes del dataset son de la cuenta pública `demo` de Cloudinary, no de la vuestra — si `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` no es literalmente `demo`, esas imágenes concretas saldrán rotas. El dataset de demo **no incluye ninguna tool ni insight** — al visitar `/insights` o `/tools` contra este dataset verás "Todavía no hay contenido publicado en esta sección", no un error.

Para arrancar en local contra datos reales: `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDMERSIVE_API_KEY`, `CONTACT_SMTP_HOST`, `CONTACT_SMTP_PORT`, `CONTACT_SMTP_USER`, `CONTACT_SMTP_PASSWORD`, `CONTACT_EMAIL_TO`, `CONTACT_EMAIL_FROM` (formulario de contacto — sin ellas, `npm run dev`/`next build` fallan al arrancar), y opcionalmente `CONTACT_IP_HASH_SALT`, `NEXT_PUBLIC_SITE_URL` (usada por el link de preview, §2.6) y `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (nombres exactos en `src/lib/env.ts`) — `npm run dev` y abrir `/`.

---

## 4. Próximos pasos — checklist por fases

Basado en el Anexo E ("paso a paso óptimo de ejecución") del documento de arquitectura, cruzado con el estado real verificado. `[x]` hecho y verificado · `[~]` hecho parcialmente / sin verificar del todo · `[ ]` pendiente.

### 4.1 Housekeeping inmediato

Completo — ver `historial-fases-0-2.md` y `historial-fases-3-4.md` para el detalle. Único punto que seguía abierto ahí, sin relación con esta sesión:

- [ ] Confirmar con quien lleve el login del ABM el estado real de esa parte y añadir tests.

### 4.2 Fase 1 (hasta el 15 de agosto)

- [~] Especificación de formatos para Greener (Anexo A.1) — **límites de caracteres cerrados e implementados el 22 sep, ver §2.3**. Sigue sin cerrar el resto: ratios/dimensiones por breakpoint, códecs de vídeo, contrato ZIP definitivo (aunque `contrato-zip-tools-insights.md` ya cubre buena parte).
- [x] Inventario de URLs actuales para las redirecciones 301 — **cerrado sin hacer** (28 sep): ni las apps antiguas de tools e insights ni el sitio corporativo actual se redirigen; ver §4.8.
- [ ] Ajustar el algoritmo de layout masonry con el diseño real cuando esté disponible.

### 4.3 Fase 2 (hasta el 1 de septiembre) — ABM base

Completa, incluido `preview` (cerrado el 23 sep, §2.6) — ver historial Fases 0-2 y §2.6. Sin nada pendiente.

### 4.4 Fase 3 — home y `/work` (hasta el 15 de septiembre)

Completa — ver historial Fases 3-4. Único punto abierto:

- [ ] Primeras métricas reales de LCP/CLS — todavía no medido contra contenido real, solo contra el dataset de demo.

### 4.5 Fase 4 — tipo A y resto del sitio (hasta el 22 de septiembre)

Verificación server-side de imagen y vídeo en Cloudinary, cabeceras de seguridad globales, panel de recomendaciones, Tipo A y Channel — completos, ver historial Fases 3-4 y §2.4. Queda abierto:

- [~] Contacto — formulario real cerrado. Mailchimp (doble opt-in de newsletter) sigue fuera a propósito, es un flujo aparte.
- [~] Páginas legales — solo placeholder de `/privacy`, **ya enlazada** desde el menú lateral y desde el formulario de contacto (28 sep). Falta el contenido real (aviso legal, privacidad y cookies, condiciones), que aporta Greener; `cookies-inventario.md` recoge los hechos técnicos para redactarlo.
- [~] Analítica Plausible — **integración real cerrada el 23 sep (§2.7)**, pero solo dispara "Pin Click": faltan "Case Open", "Tool Open"/"Tool Used", "Insight Open", "Episode Play", "Newsletter Signup" y "Feed Depth" (§18.2).

### 4.6 Fase 5 (26-30 de septiembre) — QA y cierre

- [ ] Tests E2E de los criterios de aceptación críticos de §20.1.
- [x] Auditoría de cookies y consentimiento — **decidido y construido el 28 sep, opción A sin banner** (§2.11): ningún embed de tercero (YouTube incluido) se carga hasta que el visitante pulsa, con aviso en inglés, sin recordar la elección y con enlace a «Privacy & Cookies». Queda lo que no depende del código: los textos legales de Greener y la comprobación en navegador de `cookies-inventario.md` §6.
- [x] Verificación de las redirecciones 301 — no aplica: no habrá redirecciones (28 sep, §4.8).
- [ ] Accesibilidad: teclado, foco, contraste, `prefers-reduced-motion`, menú solo-iconos con labels. `alt` de `case_detail_media` ya cerrado; pendiente el resto.
- [ ] Carga real de contenido por Greener contra el ABM ya terminado.

### 4.7 1 de octubre — Publicación y monitorización reforzada

### 4.8 Pendientes detectados en la auditoría del 28 de septiembre

Comprobados leyendo y ejecutando el código, no supuestos. Lo que ya figura arriba (E2E, cookies/CMP, accesibilidad, LCP/CLS, legales, Mailchimp) no se repite.

- [ ] **Sin tope al tamaño descomprimido del ZIP**: el límite de 10 MB es sobre el `.zip` comprimido; `validateHtmlPackageZip` descomprime todas las entradas en memoria sin mirar su tamaño real, así que un ZIP pequeño con mucha redundancia (zip bomb) podría agotar memoria. Riesgo bajo (solo suben admins autenticados), arreglo barato: comprobar `entry.header.size` antes de `getData()` y un tope total.
- [x] **Escáner de dominios — falso positivo del namespace SVG corregido el 29 sep (§2.13).** `xmlns="http://www.w3.org/2000/svg"` y los otros namespaces XML estándar (XLink, XHTML, MathML…) ya no cuentan como dominio externo; una URL real de w3.org que no sea exactamente uno de esos namespaces sigue contando. Las cabeceras de licencia de librerías (`threejs.org`, `github.com`…) **siguen sin poder distinguirse por texto** de una referencia real — se mantiene documentado en el contrato, hay que seguir declarándolas.
- [x] **Bug real de raíz, corregido el 29 sep — todo asset de toda tool/insight daba 404 en producción.** Las rutas `/tools|insights/[slug]/app/assets/[...file]` pedían a Storage `<versión>/<fichero>` en vez de `<versión>/assets/<fichero>`: Next.js consume `assets` como segmento fijo de la ruta, así que no llegaba en el parámetro `file`, pero en Storage el fichero SÍ vive bajo `assets/` (el ZIP se sube conservando su estructura interna). Bug presente desde el primer zip, nunca detectado por los tests porque mockean Storage. **Encontrado y corregido por el equipo el 28 sep, integrado y verificado aquí el 29 sep contra un servidor real** (§2.12): con un Storage simulado real (no solo mocks de Vitest) y `node server.js` sirviendo el build, se confirmó que la petición HTTP ahora sí lleva `/assets/`. Relacionado y cerrado el mismo día (§2.13): la subida ahora **rechaza** directamente cualquier fichero fuera de `assets/` (que no sea `index.html`/`manifest.json`), en vez de aceptarlo y descubrirlo como 404 más tarde.
- [x] **Tipos de archivo ampliados (29 sep, §2.12):** WOFF2, WOFF, JPEG y WebP ahora se sirven con su Content-Type real (antes salían como `application/octet-stream`); necesario para que una tipografía propia (Coolvetica, usada en los insights reales) se aplique. La extensión se normaliza a minúsculas. `contrato-zip-tools-insights.md` §1 sigue sin actualizar (dice "solo js/css/json/png/svg") — pendiente.
- [ ] **Menú lateral en `/tools|insights/[slug]/app`**: es una mini-nav hecha a mano (iniciales, «Contacto» en español, `lang="es"` fijo), no el Shell real con iconos y «We did it»/«Podcasts». Además esas rutas se saltan el proxy entero (sin HSTS ni `frame-ancestors`).
- [ ] **Sin preview de una versión en borrador del paquete**: `/app` solo lee la versión publicada, así que un admin no puede revisar el HTML antes de publicarlo; y el botón «Use» de una tool en preview de contenido lleva a un 404.
- [x] **Redirecciones 301: CERRADO, no se harán (28 sep).** Ni para `tools.itsgreener.com`/`insight.itsgreener.com` (pruebas sin visitas y sin contenido equivalente, §2.10) ni para el sitio corporativo actual de `itsgreener.com`: tiene demasiadas URLs para inventariarlas y **desaparece por completo el viernes 2 de octubre**, sustituido en el mismo dominio por esta web. **Asumido a propósito**: tras el cambio, las URLs del sitio actual darán 404 y su posicionamiento en Google se irá perdiendo hasta que se reindexe el nuevo. Sin módulo en el ABM; la tabla `redirect_301` se conserva sin uso. Solo queda, opcional y barato: buscar `site:tools.itsgreener.com` y `site:insight.itsgreener.com`, y apagar esas dos apps cuando se publique la web nueva.
- [x] **`sitemap.xml`, `robots.txt`, `metadataBase` y favicon** (28 sep, §2.9): hechos y probados contra el servidor real.
- [x] **404 y error básicos** (28 sep, §2.9): `not-found.tsx`, `error.tsx` y `global-error.tsx`, en inglés y con el mismo tono que el «Cargando…» del feed. Ver el punto siguiente sobre el 404 de páginas públicas.
- [x] **404 de una página pública (`/work/no-existe`)**: el HTML del servidor llega con el `<body>` vacío (código 404 y `noindex` correctos). **No es del proyecto**: una aplicación Next 16.3.5 recién creada, sin nada nuestro, se comporta igual. **Comprobado en un navegador real, en local (28 sep): se ve correctamente la página de `not-found` de `(public)`**, es decir, el cliente la pinta con JavaScript. Descartado uno a uno: mis páginas de 404, el layout `(public)`, proveedores y Shell, `await headers()`, `proxy.ts`, `output: 'standalone'` y el User-Agent (incluido Googlebot).
- [ ] **`/api/feed/demo` y `/preview/masonry`** siguen públicos en producción.
- [ ] **Health check** (§19.2): no existe.
- [~] **Analítica**: `Pin Click`, `Case Open`, `Tool Open`, `Insight Open` y `Episode Play` ya se disparan (los cuatro últimos, del 28-29 sep — §2.12, con atribución de la sección de origen vía `navigationAttribution.ts`). Quedan sin cablear **`Tool Used`, `Newsletter Signup` y `Feed Depth`** (3 de 8). El fallo de la CSP que bloqueaba a Plausible en producción (§2.11) sigue sin comprobarse desplegado (`despliegue.md` §6, punto 4).
- [x] **La CSP bloqueaba a Plausible en producción** (28 sep, §2.11): el tracker publica con `fetch` en `https://plausible.io/api/event` y `connect-src` no lo permitía, así que el navegador descartaba todos los eventos en silencio. Corregido abriendo ese origen solo si hay analítica configurada, con test. Sin comprobar en un navegador real: es semántica estándar de CSP, pero no había forma de ejecutarlo en el sandbox.
- [x] **`/privacy` no estaba enlazada desde ninguna parte** y la casilla del formulario de contacto pedía aceptarla sin enlace (28 sep, §2.11). Ahora hay un icono «Privacy & Cookies» siempre visible en el menú lateral y la casilla enlaza a la política. La página sigue siendo un placeholder hasta que Greener aporte los textos.
- [ ] **ABM (§15.1)**: solo existe el CRUD de contenidos. Faltan editor de `feed_config` con simulador, etiquetas, módulo de Acceso (`admin_allowed_domain`), Redirecciones, Configuración y visor de `audit_log`; el dashboard es una página de 13 líneas.
- [x] **Etiquetas del feed**: cerrado con lo anterior, fuera de la V1 (28 sep).
- [ ] **Límites del plan de Cloudinary** frente al volumen real (Anexo A.2): no consta en §5.
- [~] **Despliegue (§19.1-19.2)**: `output: 'standalone'` activado y probado; guía verificada con PM2 real en `despliegue.md` (ecosystem, cambio de release con enlace simbólico, `.env.local`, vigilante de cron probado en cinco escenarios). Quedan **tres cosas del proxy de Dinahosting que solo se pueden comprobar desplegado** (`despliegue.md` §6), porque no es modificable: el límite de tamaño de la subida de ZIP, que las Server Actions funcionen tras el proxy y que llegue la IP del visitante (si no, el límite de 5 mensajes de contacto por hora se aplicaría al sitio entero). Por confirmar: el `HOSTNAME` que use el proxy (127.0.0.1 o 0.0.0.0), Node 24 vía nvm y contrastar el cron de reinicio que ya existe con el vigilante de la guía. Punto aparte: el health check.
- [x] **Tope de copia del proxy de Next (`proxyClientMaxBodySize`) — defecto de mi diseño anterior, corregido el 28 sep** (§2.10): con `proxy.ts` presente, Next copia el cuerpo de las peticiones no-GET con un tope de 10 MiB y por encima **trunca en silencio**. Un ZIP válido (≤10 MB) cabía, pero uno de 10-20 MB llegaba cortado y fallaba con un error confuso en vez del mensaje claro. Ahora `proxyClientMaxBodySize: '25mb'`, con test de guarda.
- [~] **Entorno de producción**: `CONTACT_IP_HASH_SALT` ya existe en el `.env.local` real; `NEXT_PUBLIC_SITE_URL` sin barra final (además, desde el 28 sep `env.ts` la recorta si viene con ella y avisa en producción si falta); dominios del ABM ya insertados en `admin_allowed_domain`. Por confirmar: redirect URLs del dominio real en Supabase Auth y en el cliente OAuth de Google, y `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`.
- [ ] **`feed_session`**: no hay limpieza de sesiones expiradas (el único cron es el de publicación programada) ni límite de peticiones en `POST /api/feed/sessions`, que es público: la tabla y `feed_round` crecen sin freno.
- [x] **Despublicar: inmediato** (decidido el 28 sep). Se mantiene el comportamiento actual: el detalle da 404 al instante, y quien tenga el feed abierto y pulse un pin recién despublicado ve un 404. Sin cambios de código.
- [ ] **`prefers-reduced-motion` y `save-data`/conexión lenta (§9.3)**: no aparecen en ningún sitio del código; el autoplay de vídeo y los carruseles no se desactivan. `<html lang="en">` fijo aunque haya contenido en es/ca.
- [x] **Filtros por etiquetas: fuera de la V1** (decidido el 28 sep). No hay filtros dentro de cada categoría en el diseño manejado; la navegación por categorías (All, We did it, Podcasts, Insights, Tools) ya existe. Las tablas `tag`/`content_tag` y el parámetro `filter` de la sesión quedan sin usar; sin filtros, el conflicto entre `program` y `episode_kind` no aplica.
- [ ] **`feed_config.video_limit_*` no se lee**: el límite 2/1 está fijo en código según el ancho (<640 px), así que lo «editable desde el ABM» no tiene efecto para vídeos.
- [~] **SEO**: `metadataBase` resuelto y **hreflang verificado en el HTML real** (28 sep): las tres versiones de un caso (`/work/x`, `/work/x/en`, `/work/x/ca`) emiten los tres `<link rel="alternate" hreflang>` con el dominio completo y sin `//`, aunque `SITE_URL` llegara con barra final. Falta: `<link rel="canonical">` (no se emite ninguno; conviene uno autorreferente por versión de idioma) y `x-default`; y sigue sin haber JSON-LD (`VideoObject`/`PodcastEpisode`, §18.1).
- [ ] **Evento «Tool Used»**: el contrato no explica cómo lo reporta un paquete (§12.3 propone el cliente de analítica o un evento DOM). Definirlo y documentarlo antes de que se construyan las 30 tools.
- [ ] **Retención de `contact_submission` (§17.2)**: sin plazo definido ni purga.
- [ ] **Observabilidad (§19.4) y CI (§19.2)**: no hay error tracking, logs estructurados ni alertas, y el zip no trae pipeline de CI (confirmar si existe fuera del repo).

---

## 5. Decisiones pendientes con Greener (Anexo A.2)

Ninguna depende de escribir código — bloquean trabajo posterior si no se cierran a tiempo.

| Decisión                                                   | Bloquea | Estado                                                                                                                            |
| ---------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Auditoría de embeds y cookies de terceros — nivel de rigor | Nada    | **Cerrado el 28 sep: opción A, sin banner** (§2.11). Se revisa si se añaden etiquetas de marketing o se prefiere un banner global |
| Traducción asistida por IA en el ABM (opcional)            | Nada    | **Aplazada a después de publicar**, si se hace (28 sep)                                                                           |

Decisiones ya cerradas: ver historial Fases 0-2, Fases 3-4, y §2/§6 de este documento para las de esta sesión.

---

## 6. Historial de correcciones a este documento

Archivado junto con el resto del detalle de las Fases 0-2 (`historial-fases-0-2.md`) y, desde el 23 de septiembre, también las Fases 3-4 (`historial-fases-3-4.md` — incluye su propio historial de correcciones, con todas las entradas del 9 al 22 de septiembre). Lo que sigue aquí es lo de esta sesión; en cuanto quede "viejo", se archiva igual.

- **22 sep 2026 (inicio de esta sesión)**: revisión exhaustiva del estado real del repositorio contra un zip nuevo — dotfiles restaurados (mismo problema de Finder de siempre), `format:check` corregido de 262 a 0 ficheros tras identificar que era deriva de versión de Prettier, no violación de reglas (§2.1). Redirect tras crear contenido: el ABM ya no deja la creación como un paso a medias (§2.2).
- **22 sep 2026 (continuación)**: decididos e implementados los límites de caracteres de Tipo A y Tipo B — contador blando en el ABM + `line-clamp`/elipsis en frontend, `max-width` en `ch` para no depender del ancho real disponible ni de la tipografía final (§2.3). Integrado trabajo externo que cierra la verificación server-side de vídeo en Cloudinary, cerrando la asimetría con imagen anotada horas antes (§2.4).
- **22-23 sep 2026**: auditoría de cookies iniciada — contrastado el estado real de YouTube/Vimeo/Spotify (no las guías de hace un año), hallazgo real corregido (Vimeo sin `dnt=1`), y click-to-load construido para Vimeo/Spotify vía integración de trabajo externo (§2.5). Decisión de fondo (nivel de rigor, banner/CMP) explícitamente aplazada por el usuario — ver §5.
- **23 sep 2026**: preview firmado del ABM construido de cero (§2.6) — cierra la decisión pendiente desde el 7 de septiembre. Token autocontenido sin estado (mismo mecanismo que el cursor del feed), caduca a los 7 días, `resolvePreviewContext` como único punto de entrada para las cuatro plantillas públicas. 15 tests nuevos, dos fallos propios corregidos antes de cerrar el bloque (estrechamiento de tipos, mocks sin limpiar entre tests).
- **23 sep 2026 (cierre de la sesión)**: resuelto un conflicto de git real entre el trabajo de esta sesión y el de un compañero en paralelo (`episodeDetail.smoke.test.tsx`), e integrada su analítica Plausible real — evento "Pin Click" disparado desde `PinCard`, cableado en los cuatro sitios donde se pinta un pin. Hallazgo real corregido al integrar: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` no estaba en el schema de `env.ts` pese a usarse en `layout.tsx`. Descartado un `Archivo.zip` suelto (backup accidental, no algo a integrar). **611 tests en verde (65 ficheros), `eslint` a 0, build y `tsc` limpios, `format:check` limpio.** Este mismo cierre incluyó archivar las antiguas §2/§3 (rediseño de detalle + construcción del sitio público, ambas confirmadas y completas) en `historial-fases-3-4.md`, reorganizando este documento para que vuelva a quedarse centrado en el estado actual — mismo criterio que el archivado del 9 de septiembre.
- **28 sep 2026**: corregido un fallo real de caché — los assets de tools/insights se servían `immutable` durante un año bajo una URL sin versión, así que una versión nueva o un rollback no habrían llegado a los visitantes; ahora revalidan con ETag a partir del checksum de la versión (§2.8). Contrato ZIP ampliado y dos afirmaciones suyas corregidas (estructura bajo `assets/`, rutas de `Worker`/`fetch` relativas a la base); la tool de ejemplo tenía ese mismo fallo del Worker y se ha corregido. 40 tests nuevos, 651 en total. Añadida §4.8 con los pendientes detectados en la auditoría del día.
- **28 sep 2026 (después)**: cerrado el límite del ZIP en **10 MB** (decimales) por el tope del antivirus — guarda nueva en el escaneo y un test que ata el límite, el del antivirus y el `bodySizeLimit` de Next (§2.8). Restaurados los dotfiles del proyecto (`.gitignore`, `.nvmrc`, `.prettierrc`, `.prettierignore`, `.env.local.example`); con el `.prettierrc` real, `format:check` completo pasa limpio. 658 tests.
- **28 sep 2026 (tercera parte)**: activado `output: 'standalone'` y verificada su estructura real (§2.9, `despliegue.md`); `metadataBase`, `sitemap.xml`, `robots.txt` y favicon; 404 y error básicos; `SITE_URL` normalizada. Decidido que las redirecciones 301 sean reglas estáticas y sin módulo en el ABM, conservando la tabla sin uso (el «cómo» se corrigió después: no hay Nginx editable, ver la cuarta parte). Aislado con una aplicación Next mínima que el `<body>` vacío en el 404 de páginas públicas es comportamiento de Next 16.3.5, no del proyecto. 692 tests.
- **28 sep 2026 (cuarta parte)**: corregido un error de método mío: se tomó la ayuda de Dinahosting sobre Passenger («Otras aplicaciones») como el modelo de despliegue, y no sirve para Next; el real es PM2 manual + cron con un Nginx no editable. `despliegue.md` reescrito con lo verificado con PM2 real, incluido un fallo propio del vigilante (el aviso de arranque del daemon se leía como PID). Defecto propio corregido: `proxyClientMaxBodySize` (10 MiB por defecto) truncaba en silencio los ZIP de 10-20 MB. Hreflang verificado en el HTML real. Confirmado por el usuario en navegador que el 404 de páginas públicas se ve bien. 694 tests.
- **28 sep 2026 (quinta parte)**: decidido no redirigir las apps antiguas `tools.` e `insight.` (pruebas sin visitas y sin contenido equivalente en la web nueva); eliminado el redirector que se había construido para ello, por ser código muerto. Anotado que `permanent: true` de Next da un 308, no un 301. 694 tests.
- **28 sep 2026 (sexta parte)**: cerrado definitivamente el tema de las redirecciones 301: no se harán tampoco para el sitio corporativo actual (demasiadas URLs y desaparece por completo el viernes 2 de octubre, sustituido en el mismo dominio). Se asume que sus URLs darán 404 tras el cambio. Sin cambios de código.
- **28 sep 2026 (séptima parte)**: decididas las pendientes de Greener: filtros por etiquetas fuera de la V1, despublicar inmediato, diseño móvil y masonry en pausa, traducción por IA tras publicar y **cookies: opción A sin banner, con clic también en YouTube y aviso en inglés** (§2.11). Encontrado y corregido un fallo real: la CSP bloqueaba los eventos de Plausible en producción. `/privacy` pasa a estar enlazada. Añadido `cookies-inventario.md` para el asesor legal. 704 tests.
- **29 sep 2026**: integrados los cambios del 28 sep hechos por otra persona del equipo sobre una copia anterior a mi sesión de cookies. Corregido un bug real presente desde el primer zip (las rutas de assets de tools/insights daban 404 contra Storage real por faltarles el prefijo `assets/`), verificado contra un servidor y un Storage simulados de verdad, no solo con mocks. Tipos MIME ampliados (WOFF2/WOFF/JPEG/WebP). Cuatro eventos de analítica nuevos cableados (`Case Open`, `Tool Open`, `Insight Open`, `Episode Play`), fusionando `Episode Play` a mano con el rediseño de cookies. Descartado un retroceso del fixture de ejemplo. 729 tests.
- **29 sep 2026 (después de la integración)**: corregido el falso positivo del namespace SVG en el escáner de dominios (con límite de palabra para no colar URLs reales parecidas) y añadida la validación que rechaza al subir cualquier fichero fuera de `assets/` (antes pasaba y daba 404 en la página publicada). Deduplicados los avisos repetidos del mismo dominio sin declarar. Las cabeceras de licencia de librerías siguen sin poder distinguirse por texto, documentado como limitación conocida. 736 tests.
