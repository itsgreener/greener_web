# Greener — Historial detallado, Fase 5: cookies, preview, despliegue, auditoría y cambios de lanzamiento (22 sep – 2 oct) (completada)

Archivo de detalle, separado de `PROGRESO.md` el 5 de octubre de 2026 para aligerar ese documento (pasó de 134 KB a unos 35 KB) — mismo criterio que se aplicó con `historial-fases-0-2.md` (9 de septiembre) e `historial-fases-3-4.md` (23 de septiembre). Contiene el relato completo, sección a sección, del trabajo hecho entre el 22 de septiembre y el 2 de octubre, **tal y como estaba en `PROGRESO.md`: el texto se ha movido sin reescribirlo**.

**Nada de esto está pendiente.** Si buscas qué queda por hacer, está en `PROGRESO.md` (§4), no aquí. Este archivo es para cuando haga falta el porqué de una decisión ya tomada, el detalle de un bug ya cerrado o cómo se verificó algo.

**Numeración.** Las referencias `§2.N` de este archivo conservan el número que tenían en `PROGRESO.md` y **no se han renumerado**, porque el código (comentarios como «PROGRESO §2.16») y otros documentos las citan. Ojo: `historial-fases-0-2.md` e `historial-fases-3-4.md` tienen su propia numeración `§2.N`; cuando se cite una sección conviene indicar el archivo. Las referencias `§X` sin más contexto apuntan al documento de arquitectura técnica V1.3. Las citas «§4.8» son de la lista de pendientes del 28 de septiembre, que ya no existe como tal (sus puntos se redistribuyeron en el checklist de `PROGRESO.md`).

---

## 2. Sesiones de trabajo — 22 de septiembre a 2 de octubre

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

### 2.14 Rutas de demo bloqueadas en producción y menú lateral real en tools/insights (29 sep)

Dos de los puntos de mayor visibilidad de la lista de pendientes (§4.8), priorizados porque son justo lo que se ve al probar las tools reales estos días.

**1. `/api/feed/demo` y `/preview/masonry`, bloqueadas.** Eran rutas públicas del prototipo de Fase 1 (Anexo E.2), sin ninguna guarda, sirviendo un dataset falso sin relación con el contenido real. Ahora ambas responden con 404 (la API) o `notFound()` (la página) cuando `NODE_ENV=production`, con el mismo patrón que ya usa `analytics.ts` para lo mismo. Siguen funcionando en desarrollo, que es donde de verdad sirven.

**2. Menú lateral de `/tools|insights/[slug]/app`, sustituido por el real.** Hasta ahora era una mini-nav aparte: cinco enlaces con solo la inicial como icono, "Contacto" en español, `lang="es"` fijo — visualmente distinta del resto del sitio en cada página de tool e insight, justo las páginas que se están probando ahora. `composeToolDocument.ts` ahora replica el Shell real (`components/shell/Shell`): los mismos nueve iconos y el mismo orden que `useShell.ts` (We did it, Podcasts, Insights, Tools / Contact, Instagram, YouTube, LinkedIn, Privacy & Cookies), los mismos ficheros SVG, el mismo hover con la pastilla del nombre, y `lang="en"` en vez de `es`. No puede compartir el componente React en sí: esta ruta compone un documento HTML aparte a mano con cheerio, no una página de Next. Queda un riesgo real, anotado en el propio código: si `useShell.ts` cambia el día de mañana, esta copia no se actualiza sola y ambas listas pueden divergir otra vez.

**Hallazgo relacionado, encontrado al revisar por qué estas rutas se saltan el proxy central.** `proxy.ts` las excluye enteras a propósito, con un comentario que explica el motivo real: su propia CSP (pensada para el contrato del ZIP) no debe mezclarse con la CSP global, porque dos cabeceras `Content-Security-Policy` en la misma respuesta se combinan, no se sustituyen. Pero ese salto dejaba fuera **también** HSTS y Referrer-Policy, que no chocan con nada y no tenían motivo para faltar. Añadidas directamente en las dos rutas, con los mismos valores que `securityHeaders.ts`.

**Pruebas.** 12 tests nuevos, sin ningún test previo para ninguna de las cuatro rutas tocadas. Roturas deliberadas comprobadas: quitar cada una de las dos guardas de producción, y quitar la cabecera HSTS de una de las rutas `/app`.

### 2.15 "Tool Used" servidor a servidor (29 sep)

Decisión del usuario, distinta de lo que proponía el contrato: `Tool Used` se dispara al **entrar** en `/tools/[slug]/app` (la tool en sí), no por algo que la tool reporte desde dentro. Tiene sentido además de ser la única vía que funciona: la CSP de esa ruta (`script-src 'self'; connect-src 'self'`) impide que el JS de la tool hable con Plausible o ejecute un script de seguimiento inline — la vía que proponía §12.3 del contrato nunca iba a funcionar sin abrir esa política.

**Cómo se hizo.** `serverAnalytics.ts`, nuevo módulo servidor (no `'use client'`): llama directamente a la API de eventos de Plausible (`POST https://plausible.io/api/event`) desde `route.ts`, sin pasar por el navegador. Cableado solo en `tools/[slug]/app/route.ts`, sin awaitar (no debe retrasar la respuesta al visitante; seguro porque la app corre como proceso Node persistente bajo PM2, no serverless), y solo en el camino de éxito (nunca en el 404 — entrar en una tool que no existe no es "usarla").

**Trampa real de la API de Plausible, documentada por ellos mismos: siempre responde 202, incluso cuando descarta el evento por su filtro antibot** — y ese filtro descarta casi cualquier petición sin un `User-Agent` de navegador real. Sin reenviar el `User-Agent` y la IP originales del visitante, el evento habría parecido funcionar (202) sin registrarse nunca — la misma clase de fallo silencioso que ya costó una sesión entera con la CSP bloqueando al tracker del navegador (§2.11). `serverAnalytics.ts` exige recibir ambos y los reenvía tal cual.

**Dos huecos que quedan abiertos, no decisiones mías:**

1. **Solo tools, no insights.** `AnalyticsEventMap` no define «Insight Used» — la misma razón (CSP) aplica igual a `insights/[slug]/app`, pero no se ha añadido un evento nuevo sin que el usuario lo confirme (afecta a qué hay que dar de alta como objetivo en el dashboard de Plausible).
2. **`toolId` es el slug, no el UUID de `content`.** `route.ts` solo conoce el paquete en Storage, no la fila de `content` — cruzar «Tool Open» (UUID) con «Tool Used» (slug) en el dashboard de Plausible no funciona directamente sin un mapeo aparte. Resolverlo del todo exigiría una consulta extra a Supabase en cada carga de tool; no se ha añadido por el coste en un camino tan caliente.

**Pruebas.** 6 tests de `serverAnalytics.ts` y 3 más en `appRoutes.test.ts` (payload correcto, reenvío de User-Agent/IP/referrer, fallback a `x-real-ip`, nada en el 404). Dos roturas deliberadas comprobadas: mandar un User-Agent falso en vez del real, y disparar el evento también en el 404 — ambas detectadas.

### 2.16 Límite de peticiones al feed público (29 sep)

Discutido y decidido con el usuario antes de construirlo, ronda por ronda: qué endpoints limitar, cómo identificar al visitante, qué pasa al superar el límite, y memoria o base de datos — con desacuerdos explícitos resueltos antes de escribir código (ver el historial de la conversación, no repetido aquí).

**Decisiones finales.** Dos límites independientes, por visitante (cookie anónima, no IP — evita que varias personas detrás del mismo NAT compartan cupo): **12 creaciones de sesión por minuto** (`POST /api/feed/sessions`) y **50 lotes por minuto** (`GET /api/feed/{sessionId}`) — números distintos a propósito, porque generar un lote cuesta más (una ronda completa del algoritmo de cuotas, §8) pero también es lo que dispara el scroll rápido, que necesita más margen. Todo en memoria de proceso, no en Supabase: evita una consulta a la base de datos en cada visita a la home, a cambio de no compartirse entre procesos ni sobrevivir a un reinicio — aceptado a propósito, es para amortiguar ruido, no una defensa real contra abuso deliberado.

**Qué pasa al superar cada límite, sin ningún error visible:**

- **Creación de sesión:** se devuelve la sesión más reciente de ese visitante en vez de crear una nueva (200 en vez de 201). Efecto secundario asumido: esa recarga concreta repite la secuencia anterior, en vez de una nueva — contradice, solo en ese caso límite, "home distinta en cada carga completa" (arquitectura §1). Solo le pasa a quien supera 12 creaciones en un minuto, muy por encima del uso normal.
- **Lotes:** se responde como si el catálogo se hubiera agotado (`hasMore: false`, sin pines) — reutiliza un comportamiento que el cliente (`useFeed.ts`) ya sabía manejar, cero cambios en el frontend.

**La cookie (`greener_visitor`, `visitorCookie.ts`).** httpOnly, SameSite=Lax, 24h renovables en cada respuesta (no una fecha fija desde la primera visita). Es una cookie técnica de seguridad — la guía de la AEPD pone justo este caso (detectar/limitar abuso) como ejemplo de lo exento de consentimiento bajo el art. 22.2 LSSI. **Pendiente:** añadirla a `cookies-inventario.md`, exenta o no de consentimiento, sigue habiendo que mencionarla.

**Fallo real encontrado y corregido al construir el limitador genérico.** La primera versión de `inMemoryRateLimiter.ts` reiniciaba la ventana en cada petición aceptada dentro de ella (no solo en la primera), lo que en el caso límite de un visitante con un ritmo bajo pero constante (una petición cada pocos segundos, sin hueco nunca de duración completa) lo habría dejado bloqueado para siempre en cuanto el contador llegara al máximo. El primer test que se escribió para probar justamente esto **no lo detectó** — pasaba igual con el fallo presente; hizo falta un segundo test, más preciso, que fija el instante exacto en que debe reabrirse la ventana, para que la mutación deliberada del comportamiento fallara donde debía.

**Pruebas.** 30 tests nuevos: el limitador genérico (incluida la ventana fija de verdad), la cookie, el módulo de feed (límites y "recordar sesión"), y las dos rutas HTTP completas — con `NextRequest`/`NextResponse` reales, no simulados: cabeceras `Set-Cookie` reales, conteo real hasta el límite, reinicio real pasado el minuto. Un intento de probarlo además contra un Supabase simulado real (como se hizo con el bug de `assets/`, §2.12) se abandonó por inestabilidad del entorno de pruebas, no del código — la cobertura de ruta ya ejercita los mecanismos reales de cookies y conteo, solo sin una base de datos de verdad detrás.

### 2.17 Integración de una segunda rama de trabajo: ABM rediseñado, Feed Depth y un segundo "Tool Used" (29 sep)

El usuario pasó un zip nuevo con cambios hechos en paralelo por otra parte del equipo, sobre una base anterior a la sesión de hoy (sin el límite de peticiones, sin el menú lateral real de tools/insights, sin "Tool Used" servidor). Mismo método que en la integración del 28-29 sep (§2.12): separar qué es solo diferencia de base de qué es trabajo real nuevo, antes de tocar nada.

**Integrado sin conflicto, adoptado tal cual:**

- **Rediseño completo del ABM**: `admin/layout.tsx` (nuevo, menú lateral propio), y los 9 ficheros del dashboard, listado y editor de contenidos reescritos, más ~1.700 líneas de CSS en `globals.css` (fusionado a mano para conservar mis propios comentarios de cabecera, no sobrescrito). Nunca se había tocado esta parte en esta sesión, así que no había nada que fusionar más allá de copiar.
- **`greener-package-analytics.js` + `POST /api/analytics/package`**: un segundo mecanismo para "Tool Used" (ver más abajo — no se activó en exclusiva, convive con el existente).
- **Evento "Feed Depth"**, cableado en `useFeed.ts`: se dispara con `{ section, round, batch: 0 }` al recibir un lote con pines; no en uno vacío (fin de catálogo real, o límite de peticiones superado — §2.16 — no cuentan como profundidad alcanzada). Necesitó añadir `round: number` a `FeedBatchResult` (`getFeedSessionBatch.ts`) y propagarlo también a la respuesta de mi propio límite de peticiones, que hasta entonces no lo llevaba.

**Descartado, regresión ya vista antes:** el fixture `pixel-palette/assets/main.js` volvía a traer la ruta rota del Worker (`./worker.js` en vez de `./assets/worker.js`, corregida el 28 sep, §2.8). Se mantiene la versión corregida.

**La decisión que queda abierta: dos mecanismos para "Tool Used".** El construido ayer en esta sesión (servidor, automático, en `route.ts`) y el integrado hoy (`greener-package-analytics.js`, disparado por la propia tool tras una interacción real) resuelven el mismo problema de formas distintas, con una diferencia real: el nuevo usa el UUID de `content` como `toolId` (resuelto server-side por slug+tipo+estado en `POST /api/analytics/package`), así que SÍ es cruzable con "Tool Open" — algo que el mecanismo de ayer no conseguía sin una consulta extra que no se quiso pagar en un camino tan caliente. A cambio, depende de que cada tool decida llamarlo; el de ayer se dispara siempre, lo use alguien o no. Ninguno de los dos se ha desactivado a propósito: la decisión es del usuario, no mía, sobre todo porque el mecanismo de ayer se construyó siguiendo una instrucción explícita suya. Anotado en el propio código (`composeToolDocument.ts`), no solo aquí.

**Pruebas.** Suite completa recorrida tras cada paso de la integración, no solo al final: 2 tests nuevos para el runtime de analítica en `composeToolDocument.test.ts` (presente en tools, ausente en insights), los tests ya existentes `feedDepth.test.tsx` y `packageAnalyticsRoute.test.ts` adoptados sin cambios, y los 10 tests ya existentes de `tests/unit/admin/` (lógica de Server Actions, no de las vistas) re-ejecutados para confirmar que el rediseño de las vistas no rompió nada por debajo.

### 2.18 "Tool Used": un solo mecanismo, decidido (29 sep)

Decisión del usuario sobre lo planteado en §2.17: quedarse con el mecanismo que SÍ cruza con «Tool Open» — `greener-package-analytics.js` + `POST /api/analytics/package`, con el UUID real de `content` como toolId. Retirado el otro: `serverAnalytics.ts` y su test eliminados, la llamada en `tools/[slug]/app/route.ts` quitada (el parámetro `request` vuelve a `_request`, sin uso), y el comentario de `composeToolDocument.ts` actualizado para dejar de hablar de una decisión pendiente.

Coste aceptado, con los ojos abiertos: a diferencia del mecanismo retirado (que se disparaba siempre, sin depender de nada), este exige que cada una de las tools llame explícitamente a `window.GreenerAnalytics.toolUsed(action)` o dispare `greener:tool-used`. Una tool que nunca lo haga —por lo que sea, un olvido al construirla— mostrará cero uso en Plausible aunque reciba visitas reales. No hay nada que avise de eso: es un silencio, no un error. Merece la pena tenerlo presente cuando se audite la analítica con las 30 tools ya construidas.

**Pruebas.** 9 tests menos (785, antes 794): los propios de `serverAnalytics.ts` y los tres del describe `"Tool Used"` en `appRoutes.test.ts`, todos retirados porque probaban un mecanismo que ya no existe. `packageAnalyticsRoute.test.ts` y `feedDepth.test.tsx` (del mecanismo que se queda) no cambian.

**`contrato-zip-tools-insights.md` actualizado el 30 sep** (se había quedado sin ninguna mención a esto): nueva sección "Reportar uso real (solo Tools): `window.GreenerAnalytics.toolUsed()`" en §6, con el patrón exacto de `action` verificado contra el regex real del script (`^[a-z0-9][a-z0-9:_-]{0,63}$`), y un punto nuevo en el checklist de §8. Documentado sin suavizarlo: una Tool que nunca llame a esto muestra cero uso sin ningún aviso.

### 2.19 Bug real: el límite de peticiones rompía el scroll de la home (30 sep)

Aviso del usuario: "el scroll de la home se rompió un poco... solo muestra una línea de casos... en tools e insights funciona bien". Las tres páginas usan el mismo componente (`<Feed scope="...">`), así que el fallo tenía que estar en algo que distinguiera home de las subhomes — o en algo que SOLO se manifestara con el patrón de tráfico de home.

**La causa real: una interacción entre dos piezas que no se conocían entre sí.** `appendBatch` (`FeedProvider.tsx`) ya tenía, de antes, una regla: un lote vacío (`items.length === 0`) corta `hasMore` a `false` **para siempre** — pensada para que una subhome sin contenido todavía (insights/tools al principio) no siga pidiendo rondas sin parar, ya que `generateRound` es determinista: si el pool de un tipo está vacío, toda ronda futura también lo estará. Es un corte permanente, a propósito.

El límite de peticiones del 29 sep (§2.16) **reutilizaba exactamente esa misma forma de respuesta** (lote vacío) para decir "espera, no ahora mismo" — algo temporal, no permanente. `appendBatch` no tenía forma de distinguir los dos casos: a sus ojos, un lote vacío por límite de peticiones superado era indistinguible de una subhome sin contenido, así que lo trataba igual — cortaba `hasMore` para siempre, en memoria **y en `sessionStorage`**.

Por qué solo se notaba en home: `useFeed.ts` auto-carga rondas mientras el sentinel de `IntersectionObserver` esté cerca del final (§10.3) — pero el observador solo reacciona a un **cambio** de intersección, no re-chequea solo porque pase el tiempo. Home mezcla tipos por cuota (§8.2) en vez de servir un único tipo denso como tools/insights, así que arrancar necesita más rondas seguidas para llenar la pantalla — más probable agotar el cupo (50/min) durante esa ráfaga inicial, sobre todo recargando varias veces seguidas en poco tiempo, que es justo lo que se estaba haciendo al cargar contenido. Una vez cortado, nada volvía a intentarlo solo: hacía falta un scroll manual para que el sentinel recalculara su posición y el observador volviera a dispararse — pero `hasMore` ya estaba en `false` para siempre, así que ni el scroll manual servía de nada, salvo que diera la casualidad de coincidir con una recarga completa (nuevo `pageLoadId`, estado limpio) fuera ya de la ventana de un minuto.

**La corrección, en dos sitios:**

1. `api/feed/[sessionId]/route.ts`: la respuesta de límite superado ahora dice la verdad — `hasMore: true` (sí hay más, solo que no ahora) — y añade `rateLimited: true` como señal explícita.
2. `appendBatch`: si `batch.rateLimited` es verdadero, no toca el estado en absoluto — ni pines, ni cursor, ni `hasMore`. El siguiente intento (el próximo scroll, o el propio sentinel si hay ocasión) vuelve a probar con normalidad.

El comportamiento de "corte permanente para una subhome sin contenido real" **no cambia** — sigue intacto, solo ahora distinguible del caso temporal.

**Pruebas.** 6 tests nuevos en `feedProvider.test.tsx`, el primer test que existe para `appendBatch` (no tenía ninguno). Reproducida la mutación exacta del bug original (quitar la guarda de `rateLimited`) y confirmado que los tests la detectan — 2 de 6 fallan exactamente como deberían. Actualizada la aserción de `sessionBatchRoute.test.ts`, que yo mismo había fijado con el comportamiento incorrecto el día anterior.

### 2.20 Auditoría de estado y limpieza del repositorio (2 oct, día de lanzamiento)

Revisión completa del zip contra el código real: `npm ci`, ESLint, `tsc`, Vitest, `next build`, Prettier y una pasada con `knip` (código, ficheros y dependencias sin usar) más revisión a mano de carpetas, esquema y documentación.

**Hallazgo bloqueante, ya corregido: `next build` fallaba.** `useFeed.ts` lee `batch.round` para el evento «Feed Depth» (§2.17), pero `FeedBatchResult` (`getFeedSessionBatch.ts`) no tenía el campo ni el servicio lo devolvía. Las cuatro pruebas de humo que lo simulaban tampoco compilaban. Consecuencias: el paso de tipos del build fallaba (`TS2339`) y, aun forzándolo, el evento habría enviado `round: undefined` a Plausible. Se añade `round: number` al tipo, `getFeedSessionBatch` devuelve `round: roundIndex` y hay un test nuevo que lo fija (ronda 0 y ronda 1). Tras el arreglo: build limpio, `tsc` sin errores (salvo el falso positivo conocido de `LayoutProps` si se ejecuta antes del build, §3), ESLint a 0, 795 tests en verde. El zip del 1 oct, tal cual, **no desplegaba**: el «build limpio» anotado en §2.17-§2.19 no se re-comprobó tras integrar la segunda rama.

**Formato.** `format:check` fallaba en 9 ficheros reales (`BulkPinUpload.tsx`, `edit/page.tsx`, `PinList.tsx`, `login/page.tsx`, `globals.css`, `useMasonryPositions.ts`, `cloudinaryServer.ts`, `securityHeaders.test.ts`, `greener-package-analytics.js`), procedentes sobre todo del rediseño del ABM integrado el 29 sep. Reformateados con el `.prettierrc` real, sin cambios de lógica. Solo queda `next-env.d.ts`, que es generado y está en `.gitignore`.

**Carpetas vacías o con marcadores sin sentido** (propuestos para borrar, no se ha borrado nada):

| Ruta                                                                                                | Qué es                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(public)/tools/[slug]/assets/[...file]/` y `insights/[slug]/assets/[...file]/`             | Directorios vacíos, resto de la ruta antigua. Las rutas reales viven en `.../[slug]/app/assets/[...file]/route.ts`.                                     |
| `supabase/policies/`                                                                                | Vacía: las políticas RLS están dentro de las migraciones (`20260806090700_rls_policies.sql`). El documento de arquitectura (Anexo B) la preveía.        |
| `src/components/case-blocks/`                                                                       | Solo `.gitkeep`. El editor de bloques se descartó (migración `drop_content_block_editor`).                                                              |
| `src/lib/auth/`, `src/lib/validation/`, `src/lib/security/`, `src/modules/admin/`                   | Solo `.gitkeep`: estructura del Anexo B que nunca se llegó a usar (la auth vive en `lib/supabase/` y `proxy.ts`; los schemas zod, junto a cada módulo). |
| `.gitkeep` en `modules/analytics/`, `modules/content/infrastructure/`, `modules/media/application/` | Carpetas que ya tienen ficheros: el marcador sobra.                                                                                                     |

**Código y ficheros sin uso:**

- `src/modules/packages/infrastructure/localPackageSource.ts`: nada lo importa (solo lo citan dos comentarios). Es el origen de paquetes desde disco de la época de los spikes; hoy todo va por `supabaseStorageSource.ts`. El fixture `fixtures/tools/pixel-palette/` **sí** se usa (`pixelPaletteWorker.test.ts`), así que se queda.
- Dependencias que nadie importa: `next-cloudinary`, `react-hook-form` y `@hookform/resolvers` (el §24.5 las preveía; los formularios del ABM usan Server Actions con zod directamente) y `@types/adm-zip` en devDependencies (revisar: `adm-zip` sí se usa).
- `ADMIN_ALLOWED_DOMAIN_FALLBACK`: está en `env.ts` y en `.env.local.example`, pero ningún código la lee. O se implementa el respaldo o se retira de ambos.
- Iconos: **todos** los SVG de `public/icons/` se usan (el Shell los compone por nombre). `shop.svg` va con el item «Shop» oculto a propósito.
- Exports que solo se usan dentro de su propio fichero (`getVideoSlotLimit`, `buildFeedUnitsForPin`, `RATE_LIMIT_WINDOW_MS`, `pinLocaleSchema`…) y 33 tipos exportados sin importador: ruido, sin impacto; no merece tocarlos hoy.
- Se conservan a propósito, aunque nada de producción los use: `scripts/generate-demo-data.mjs`, `data/demo/feed-snapshot.json`, `supabase/seed_demo_data.sql` y las rutas `/api/feed/demo` y `/preview/masonry` (404 en producción, §2.14) — son el entorno de pruebas del feed.
- Tablas sin uso en el código, conservadas por decisión: `redirect_301`, `tag`/`content_tag` (filtros fuera de V1), `admin_profile`. `audit_log` y `admin_allowed_domain` solo las tocan las funciones SQL, no el código TypeScript — correcto, pero no hay visor (§4).
- `feed_config.video_limit_*` existe en el esquema pero no se lee (ver §4).

**Basura que no debería viajar en el zip:** `.DS_Store` (7 ficheros), `tsconfig.tsbuildinfo` (224 KB, ignorado por git), `next-env.d.ts` (generado), y `supabase/.temp/` (incluye `linked-project.json` y `pooler-url`, ya en `.gitignore`). El zip llega con la carpeta `__MACOSX/`, que además hace fallar ESLint (318 «errores» de parseo): hay que borrarla antes de lintar.

**Documentación desactualizada o ausente:**

- ~~Faltan en el zip `historial-fases-0-2.md`, `historial-fases-3-4.md`, `CLAUDE.md` e `INFORME_INCONSISTENCIAS.md`.~~ **Aclarado el 2 oct (§2.24): existen en el repositorio**; solo faltaban en los zips compartidos.
- `estructura-src.txt` está obsoleto (le faltan 20 o más ficheros, entre ellos todo lo de preview, rate limit, sitemap y analítica); `estructura-migrations.txt` sí coincide (40). Son volcados generados: o se regeneran o se eliminan.
- `supabase/README.md` lista migraciones antiguas (ya anotado en §3).
- `contrato-zip-tools-insights.md` §1 sigue diciendo «solo js/css/json/png/svg» pese a la ampliación del 29 sep.

---

### 2.21 Insights: el pin del feed abre directamente `/insights/[slug]/app` (2 oct)

Cambio de flujo pedido por Greener, **solo para insights**: home → clic en el pin → `/insights/{slug}/app` (contenido real), sin pasar por la página de detalle. Por prisa, la página `/insights/{slug}` **se mantiene tal cual** (sigue existiendo, es la URL canónica del sitemap, la del preview firmado y la que se comparte); solo cambia a dónde apunta el pin.

**Dónde:** `feedPinDestination()` (nuevo, `modules/content/domain/contentPath.ts`) devuelve `${publicContentPath}/app` para `insight` y `publicContentPath` para el resto; `destinationFor` de `getFeedSessionBatch.ts` delega en ella. `publicContentPath` no se toca, así que sitemap, preview y enlaces del ABM siguen apuntando al detalle. Las tools **no** cambian (siguen yendo a `/tools/[slug]`).

**Alcance real:** el cambio vive en la API del feed, así que afecta a **todo pin de insight**: home, subhome `/insights` y los feeds de «relacionados» de las páginas de detalle (casos, episodios, tools, insights). Se decidió así para que un insight se comporte igual venga de donde venga. Si Greener quisiera solo la home, habría que filtrar por `scope` en `getFeedSessionBatch`.

**Pruebas:** 3 tests nuevos en `contentPath.test.ts` y actualizada la aserción de `getFeedSessionBatch.test.ts` (insight → `/insights/insight-1-slug/app`, tool sigue en `/tools/tool-1-slug`). 798 tests, build, ESLint, `tsc` y Prettier limpios.

**Efectos colaterales conocidos (no se han tocado):**

1. **«Insight Open» deja de contarse para los clics del feed.** Lo dispara `ContentOpenTracker` dentro de la página de detalle, y `/app` es un documento HTML autónomo con CSP `script-src 'self'` y sin el tracker del sitio. «Pin Click» con `destinationType: insight` y `section` sí sigue disparándose desde el pin, así que el interés por insights se sigue midiendo, pero «Insight Open» solo contará a quien llegue al detalle por URL directa. Arreglo posible: enviarlo desde el servidor en `insights/[slug]/app/route.ts` (como «Tool Used» antes de §2.18), con cuidado de no duplicar cuando el visitante venga del detalle.
2. **El CTA del pin sigue diciendo «Read»** (`ctaFor`); sigue siendo coherente.
3. **Sin preview de borrador en `/app`** (ya anotado en §4.2): un insight en preview firmado se abre en su detalle, pero el pin del feed solo existe si está publicado, así que no hay 404 por esto (la migración `block_publish_tool_insight_without_package` impide publicar un insight sin paquete).

### 2.22 Insights: nuevo pie del pin en el feed — título + «Insights by Greener» (2 oct)

Petición de Greener (solo insights): bajo la imagen del pin se muestra el **título del insight** y, debajo, **«Insights by Greener» en negrita**, en vez de la frase gancho. Es el mismo formato que un caso (título + cliente), con la diferencia de que el texto en negrita es **fijo** para todos los insights.

**Cómo se renderiza un pin de caso (y por qué bastó con una rama nueva):** `derivedFeedText()` (`supabaseFeedSource.ts`) rellena `displayTitle` (título de la traducción, según el idioma del pin) y `displaySecondary` (cliente) → `getFeedSessionBatch` los pasa tal cual al cliente → `PinCard` pinta `labelPrimary` (regular, 2 líneas) y `labelSecondary` (negrita, 1 línea) → `useMasonryPositions` y `useRecommendationMasonry` estiman el alto del pie a partir de `displayTitle`. Todo ese camino es genérico, así que para insights solo hacía falta que `derivedFeedText` devolviera esos dos campos.

**Cambios:**

1. `derivedFeedText`: rama nueva para `insight` con `label: null`, `displayTitle` = título y `displaySecondary` = constante `INSIGHT_PIN_SECONDARY_TEXT` (`'Insights by Greener'`, exportada). La frase gancho antigua (`pin.label`) queda ignorada para insights, como ya ocurría con casos y episodios.
2. ABM: en `NewPinForm`, `PinList` y `BulkPinUpload` los insights pasan a `derivedLabel` — ya no piden «Frase gancho» (ni en alta, ni en edición, ni en carga masiva, ni en el CSV) y muestran un aviso de que el texto es automático. Antes el campo era obligatorio y no tenía efecto, lo cual era engañoso.
3. Tests: `tests/unit/feed/feedPinText.test.ts` (nuevo, 4 tests): insight → título + texto fijo y sin gancho; título según idioma del pin con caída al idioma por defecto; caso sin cambios; tool conserva su gancho. 802 tests, build, ESLint, `tsc` y Prettier limpios.

**Alcance:** solo insights. Tools y «other» siguen usando la frase gancho. Al salir de la API del feed, el nuevo pie se ve en la home, en `/insights` y en los «relacionados» de las páginas de detalle. No se ha comprobado en navegador: el alto del pie se calcula con la misma estimación que los casos (título hasta 2 líneas + 1 línea de negrita).

**Efectos colaterales:**

- El texto está **hardcodeado en inglés** (la interfaz global lo está, §2.4); no es editable desde el ABM ni varía por idioma. Si algún día debe cambiar, es una constante en un solo sitio.
- Las `label` ya guardadas en pines de insight quedan en base de datos sin uso. No molestan, y se podrían limpiar con un `update pin set label = null` sobre pines de insight si se quiere ordenar.
- **El título pasa a ser obligatorio en la práctica:** si un insight no tuviera traducción con título, el pie saldría vacío. El ABM ya exige la traducción por defecto, así que no debería pasar.

### 2.23 Tools/insights: la descripción (`summary`) deja de truncarse con elipsis (2 oct)

Hallazgo con captura de la página de detalle de una tool («Cubicator»): la descripción acababa en «Sigue generando hast…». **Causa:** `.summary` en `ToolInsightDetail.module.css` llevaba `line-clamp: 3` + `overflow: hidden`, decidido el 22 sep (§2.3) como protección de layout; con el ancho real de la columna de texto, una frase legítima de la tool ocupaba más de 3 líneas y se cortaba. La misma plantilla sirve tools e insights, así que afectaba a los dos.

**Cambio:** quitado el `line-clamp` y el `overflow` de `.summary`; se conserva `max-width: 70ch`. El título (`.title`) sigue limitado a 2 líneas. Actualizados los comentarios del CSS y de `textLimits.ts` (el `summary` es ahora la excepción a «protección real del layout = elipsis»). El aviso blando de ~200 caracteres del ABM se mantiene como guía para el editor.

**Alcance:** solo `summary` de la página de detalle de tool/insight. No tocados: `body` de casos/episodios (8 líneas), títulos, ni el pie de los pines del feed. 802 tests, build, ESLint y Prettier limpios; sin test nuevo (es un cambio de CSS, y los tests con jsdom no calculan estilos). No comprobado en navegador.

**Riesgo conocido, no tocado:** el panel de recomendaciones se siembra con la altura de la IMAGEN, no con la del bloque imagen+texto (límite ya anotado en `useRecommendationMasonry.ts`). Con el recorte, el texto tenía un tope de alto; ahora, si un `summary` es largo y la imagen es baja (por ejemplo 16:9 con la columna de texto estrecha), el texto podría solaparse con la primera fila de recomendaciones. Con descripciones cortas, como las actuales, no debería darse; si apareciera, la solución es medir el bloque con un `ResizeObserver`.

### 2.24 Integración del zip compartido (2 oct)

Se comparó el zip recibido con la versión de trabajo, fichero a fichero, y se fusionó. Resultado:

**Cambios del zip recibido, adoptados tal cual** (no construidos aquí; revisados y compilados, pero **no vistos en navegador**):

- **Tools: la ficha usa como portada el medio del pin desde el que se abrió.** `getFeedSessionBatch` añade `?pin=<unitId>` al destino de los pines de tool; `PinCard` añade `&slide=<n>` si el pin es un carrusel y se pulsa en un slide concreto; `tools/[slug]/page.tsx` resuelve ese pin (filtrado por `content_id`, así que no se puede usar `?pin=` para colar el medio de otra tool) y se lo pasa a `ToolInsightDetail` como `coverMediaOverride`/`coverRatioOverride`. Insights y «other» no cambian.
- **El CTA del pin** (`PinCard.module.css`, `.cta`) pasa de la esquina inferior izquierda a la **superior derecha** del medio.
- **Masonry:** el `layout.ts` del zip recibido eliminaba el tramo de 5 columnas (2/3/4/6). Se restauró el original (2/3/4/5/6) y, después, Greener decidió **6 columnas a partir de 1200** (ver §2.28), que deja el escalonado en 2/3/4/6. Hubo cambios de criterio entre 5 y 6 en el pasado; no se ha investigado, a petición de Greener.
- `composeToolDocument.ts`: `.greener-shell` pasa de `min-height: 100dvh` a `height: 100dvh`. No consta el motivo.

**Cosas de nuestra versión que el zip recibido había pisado y se han recuperado:**

- `getFeedSessionBatch.ts` volvía a la versión anterior a nuestros cambios: sin el campo `round` (otra vez rompía `next build`, §2.20) y con el insight apuntando a `/insights/{slug}` en vez de `/insights/{slug}/app` (§2.21). Fusionado: se conserva su lógica de `?pin=` para tools, `round`, y `feedPinDestination` para insights.
- `textLimits.ts` y `ToolInsightDetail.module.css` volvían a tener el `line-clamp: 3` del `summary` (§2.23): se mantiene nuestra versión sin truncar.
- `tests/unit/feed/feedPinText.test.ts` (§2.22) no venía en el zip: se mantiene.
- `public/greener-package-analytics.js`: solo difería en el salto de línea final (Prettier): se mantiene la versión formateada.
- `PROGRESO.md` del zip recibido terminaba en §2.22: se mantiene el nuestro.

**Test que fallaba por los cambios del zip y se ha actualizado** (la lógica es la nueva, el test era el viejo): `getFeedSessionBatch.test.ts` (el destino de la tool es `/tools/tool-1-slug?pin=pin-t`). `layout.property.test.ts` se tocó un momento y se ha revertido al original (ver arriba). Prettier reformateó 3 ficheros del zip recibido (`tools/[slug]/page.tsx`, `ToolInsightDetail.tsx`, `PinCard.module.css`).

**Sin cubrir por tests:** la resolución de `?pin=`/`slide=` (`getToolPinCover`, no exportada) y el `slide` de `PinCard` no tienen test. Pendiente.

**Aclaración sobre los historiales:** `historial-fases-0-2.md`, `historial-fases-3-4.md`, `CLAUDE.md` e `INFORME_INCONSISTENCIAS.md` **sí existen en el repositorio** (solo faltaban en los zips compartidos). Se retira el aviso de §2.20 y el punto correspondiente de §4.5.

### 2.25 CTA de la ficha de tool/insight anclado abajo a la derecha (2 oct)

**Causa real del problema.** No era que el contenedor esté en `position: absolute`: un elemento absoluto sigue siendo un contenedor flex normal, y `margin-top: auto` / `margin-left: auto` funcionan igual, sin necesidad de `width: 100%`. El bloqueo era que `.contentBlock` tenía `align-items: flex-start`, así que la columna de texto (`.text`) medía solo lo que ocupaba su contenido y **no había espacio libre en vertical** que repartir; el CTA se quedaba justo debajo del texto y pegado a la izquierda.

**Solución (verificada midiendo en Chromium con el CSS real del proyecto, no solo razonada):**

- `.contentBlock`: `align-items: stretch`, para que `.text` mida como mínimo lo que la portada, que tiene alto fijo en línea.
- `.cover`: `align-self: flex-start`, para que la portada conserve su comportamiento anterior.
- `.cta`: `margin-top: auto; margin-left: auto` en lugar de `margin-top: var(--space-sm)`.
- `.summary`: `margin-bottom: var(--space-sm)`, que mantiene la separación mínima con el CTA cuando no sobra espacio.

**Medido** (portada 280×350, bloque de 700 px): CTA a 0 px del borde inferior de la portada y a 0 px del borde derecho de la columna de texto. Con una portada 16:9 baja o un texto largo el bloque crece y el CTA queda debajo de la portada pero siempre alineado a la derecha. Sin portada: alineado a la derecha. Este cambio no empeora el solape con las recomendaciones (§2.23): en el caso 16:9 el bloque mide 190 px frente a 206 antes.

El CTA queda pegado al borde derecho de la columna; si se quiere aire, un `margin-right` en `.cta`.

### 2.26 Investigación: texto de la ficha limitado a una columna (2 oct) — implementada en §2.31

Objetivo: el texto de tools ocupa siempre **una columna de la retícula** (aunque sobre aire a la derecha) y nunca queda aplastado.

**Diagnóstico.** Hoy el ancho del texto es «lo que sobra»: reservado − ancho de imagen − 16 px (`flex: 1 1 0`). La imagen se limita al **83 %** del ancho reservado (especificación §2, punto 2). Eso no garantiza ni un mínimo ni un máximo. Con la retícula vigente (2/3/4/6, 6 columnas desde 1200 de ancho de contenedor, §2.28), estimado con 64 px de menú y 32 de padding, el texto queda **aplastado (menos de una columna)** con imágenes **4:3 y 16:9**:

| Viewport  | Columnas | Texto / columna (solo los casos < 1) |
| --------- | -------- | ------------------------------------ |
| 1280×720  | 4        | 4:3 → 0,80                           |
| 1366×768  | 6        | 4:3 → 0,71, 16:9 → 0,81              |
| 1440×800  | 6        | 4:3 → 0,77, 16:9 → 0,81              |
| 1536×864  | 6        | 4:3 → 0,75, 16:9 → 0,82              |
| 1920×1080 | 6        | 4:3 → 0,80, 16:9 → 0,82              |
| 2560×1300 | 6        | ninguno                              |

Las verticales (4:5, 3:4, 2:3, 9:16) dejan más de una columna, hasta ~2, es decir, texto demasiado ancho. Son cálculos, no mediciones en pantalla.

**Propuesta (confirmada por Greener como primera solución a aplicar, aún sin implementar).** Dos piezas, que van juntas:

1. **Máximo:** `.text` con ancho fijo igual a una columna (`flex: 0 0 auto` + `width` en píxeles). La columna la calcula `useRecommendationMasonry` (ya existe como `columnWidth` dentro del hook, pero no se devuelve) y la recibe `ToolInsightDetail` como estilo en línea, igual que ya hace con el ancho y el alto de la portada. Una sola fuente de verdad en JS, sin duplicar la fórmula en CSS.
2. **Mínimo:** cambiar el tope de la imagen en `contentBlockImageDimensions` (dominio puro, `detailLayout.ts`) de `reservado × 0,83` a `min(reservado × 0,83, reservado − columna − 16)`. Así el texto siempre cabe en una columna completa; si la imagen no cabe, se recorta la **altura renderizada** y se respeta el ratio, igual que hoy. Es una función pura con tests de propiedades fáciles (texto ≥ 1 columna para todo ratio y viewport, ratio conservado).

**Coste visual (cálculo):** solo se encogen las imágenes que hoy dejan menos de una columna: 4:3 entre un 6 % y un 9 % y 16:9 un 4 %; las demás no cambian.

**Hay que validar con diseño:** el 83 % sale de medidas de diseño sobre capturas reales (especificación §2); este cambio lo sustituye por «una columna para el texto» en los casos en que el 83 % deja menos. Habría que actualizar el §2 de la especificación.

**Alternativas descartadas:** (a) limitar con `max-width` en `ch` (como `summary`): no se alinea con la retícula y no arregla el texto aplastado; (b) CSS puro con `container-type` y variables `--cols`/`--gap`: duplica la fórmula de columnas en CSS y JS y no puede tocar el tope de la imagen, que es lo que causa el aplastamiento; (c) dejar encoger la portada con CSS: rompería el ratio.

**Pendiente aparte (móvil):** por debajo de 640 px la imagen ocupa todo el ancho reservado y el texto, al ir a su lado, se queda sin espacio. Es el placeholder de móvil ya documentado (§2 de la especificación); una regla de «una columna» en móvil necesitaría apilar imagen y texto, y por tanto el rediseño móvil.

### 2.27 Insights abiertos desde el detalle de una tool o un caso (2 oct)

Aviso de Greener: al abrir un insight desde la página de detalle de una tool o de un caso se abría `/insights/{slug}` en vez de `/insights/{slug}/app`.

**Qué se ha comprobado:** esos paneles de «recomendaciones» piden su sesión con `POST /api/feed/sessions { scope: 'home', excludeContentId }` y `PinCard` pinta tal cual el `destination` que devuelve la API; no hay ningún otro sitio que construya un enlace a un insight (revisado en todo `src`). Es el mismo camino que la home. En la versión fusionada el destino ya es `/insights/{slug}/app`.

**Causa más probable:** el `getFeedSessionBatch.ts` del zip recibido había vuelto a la versión anterior a §2.21 (insight → `/insights/{slug}`), así que _cualquier_ pin de insight iba al detalle. Se corrigió en la fusión de §2.24. No he podido reproducir otro camino; si con la versión de este zip sigue pasando, habría que saber desde qué enlace exacto se hace clic.

**Test nuevo** (`getFeedSessionBatch.test.ts`): una sesión de recomendaciones (`scope: home` + `excludeContentId`) devuelve para los insights `/insights/{slug}/app`, tanto al generar la ronda como al releerla ya guardada.

### 2.28 Columnas (6 desde 1200), versión de referencia y test intermitente (2 oct)

**Columnas.** Decisión de Greener: en escritorio, **6 columnas a partir de 1200**. `BREAKPOINTS` queda en `<640: 2`, `<900: 3`, `<1200: 4`, resto: 6. El umbral se compara con el **ancho del contenedor del feed** (viewport − 64 px de menú − 32 de padding), no con el del viewport: 6 columnas desde **~1300 px de viewport**, y un portátil de 1280 se queda en 4. Si «1200» se refería al viewport, el umbral correcto sería ~1104 (una sola cifra en `layout.ts`). Con 6 desde 1200 el tramo de 5 columnas no tiene hueco (es el mismo `layout.ts` que traía el zip recibido); si se quiere un escalón de 5 entre medias hay que mover los umbrales de 4. El §10.1 de la arquitectura sigue diciendo 5 columnas entre 1200 y 1599 y queda desactualizado. Test de breakpoints actualizado (1199 → 4, 1200 → 6).

**Esta versión es la de referencia para los insights** (§2.21 y §2.27): los pines de insight apuntan a `/insights/{slug}/app` en home, subhome y recomendaciones, y hay tests que lo fijan.

**Compilación.** Los fallos de build y tests de la versión anterior de Greener venían del desfase de versiones: `useFeed.ts` leía `batch.round` pero su `getFeedSessionBatch.ts` no lo tenía (error de TypeScript en el build y en 4 pruebas de humo), y había tests que esperaban la lógica nueva. Verificado en una **copia limpia del zip** con **Node 24.15.0** (el que fija `engines`): `npm ci`, ESLint y Prettier limpios, `next build` correcto (incluido el paso de tipos), `tsc` limpio y 3 ejecuciones seguidas de 803 tests en verde.

**Test intermitente encontrado y corregido** (`generateRound.property.test.ts`, «seeds distintas producen, casi siempre, secuencias distintas»). Falló una vez en una ejecución completa y en ninguna de 40 ejecuciones sueltas. Medido: con universos pequeños dos seeds distintas **coinciden por casualidad ~1 de cada 10.000 universos** (p. ej. un único caso de 5 pines con fuerza 4), y el test generaba 100 por ejecución, así que fallaba en torno a 1 de cada 50 ejecuciones sin que hubiera ningún bug. Ahora compara cada secuencia con 4 seeds alternativas y exige que **al menos una** difiera. Comprobado: 0 fallos en 20.000 universos y, con una mutación (seed ignorada), el test sigue fallando como debe.

### 2.29 Reconciliación de `supabaseFeedSource.ts`: insights + tools con dos líneas (2 oct)

Comparado el `supabaseFeedSource.ts` actual de Greener con el nuestro. Diferencias reales (el resto del fichero —`getFeedDataset`, `getPinDirectoryByIds`, `getFeedConfig`— coincide): su versión **añade la rama de tools** y **no tiene la rama de insights** (§2.22) ni la constante `INSIGHT_PIN_SECONDARY_TEXT`; es decir, la rama de insights se había pisado sin querer. Ojo: el `supabaseFeedSource.ts` del zip anterior sí la tenía, así que este pisotón es posterior a ese zip y **puede haber afectado a más ficheros** de su copia (ver abajo).

**Resultado fusionado en `derivedFeedText`:**

| Tipo                  | Línea 1                                       | Línea 2 (negrita)                                      |
| --------------------- | --------------------------------------------- | ------------------------------------------------------ |
| Case                  | título del caso                               | cliente                                                |
| Episode               | título del episodio                           | `episode_kind`                                         |
| **Insight** (nuestro) | título del insight                            | «Insights by Greener» (fijo)                           |
| **Tool** (suyo)       | descripción del pin (`pin.label`, recortada)  | nombre de la tool (traducción según el idioma del pin) |
| Other                 | rótulo del admin (`label`), sin segunda línea | —                                                      |

Comentarios de `PinDirectoryEntry` fusionados para describir los cuatro casos.

**Tests** (`feedPinText.test.ts`, de 4 a 7): insight (título + texto fijo, idioma del pin), tool (descripción arriba + nombre abajo; idioma del pin y recorte de espacios; sin descripción), case y other sin cambios. El test que fijaba el comportamiento anterior de tools («sigue usando el gancho») se ha sustituido. Comprobado con una mutación que quitar la rama de insights rompe 2 tests, así que otro pisotón se detectaría. 806 tests, build, ESLint y Prettier limpios.

**Caso límite de tools (no tocado):** si el pin de una tool no tiene descripción, `displayTitle` es nulo y `PinCard` (`displayTitle || label`) no pinta nada, ni siquiera el nombre de la tool. El ABM exige la frase en tools, así que solo pasaría con datos antiguos o vacíos. Además, el campo del ABM sigue llamándose «Frase gancho» aunque ahora sea la descripción superior.

**Ficheros donde viven nuestros cambios del 2 oct** (para comprobar que no se hayan pisado en otras copias): `getFeedSessionBatch.ts` (`round`, `feedPinDestination`, `?pin=`), `contentPath.ts`, `supabaseFeedSource.ts`, `NewPinForm.tsx`, `PinList.tsx`, `BulkPinUpload.tsx`, `ToolInsightDetail.module.css` (summary sin `line-clamp`, CTA abajo a la derecha), `textLimits.ts`, `layout.ts` (6 columnas desde 1200) y los tests `feedPinText`, `getFeedSessionBatch`, `contentPath`, `layout.property` y `generateRound.property`.

### 2.30 Tipografías: Helvetica Neue (general) y Kinder (títulos de caso y de contacto) (2 oct)

**Pesos necesarios (comprobado en el código):** el CSS público usa `font-weight` **400, 600 y 700**; no hay cursivas. Basta con **Regular (400) y Bold (700)**: el 600 (CTA, botones, etiquetas de formulario…) no tiene cara propia y el navegador lo resuelve al Bold. Medium, Light, Italic, etc. del zip no se usan y no se incluyen. El panel de admin usa pesos intermedios (650, 750, 800, 850, 900) que ahora también se resuelven todos a Bold, es decir, **se aplanan visualmente** porque el admin hereda la fuente del `body` (no se ha aislado; si no se quiere, es una línea en el layout del admin).

**Cómo se cargan:** `next/font/local` en `src/lib/fonts.ts` (autoalojadas, URL con hash e `immutable`, tipografía de respaldo con métricas ajustadas contra el CLS, y `font-src 'self'` ya estaba en la CSP). Ficheros en `src/fonts/` (con `README.md` y los comandos para regenerarlos). Los OTF originales no están en el repo.

- **Tamaño:** los OTF de Helvetica Neue pesaban **615 KB (Regular) y 595 KB (Bold)** por traer 2340 glifos; se convirtieron a WOFF2 con el juego latino (ASCII, Latin-1, Latin Extended-A, puntuación tipográfica, €, ™, flechas): **31 KB y 24 KB**. Kinder (39 KB) se convirtió a WOFF2 sin recortar: 26 KB. Verificado que no falta ningún carácter del español, catalán o inglés. Kinder no trae `ŀ` (U+0140) ni `ª º`; el catalán normal usa `·`, que sí está.
- **Kinder con `preload: false`:** la home no descarga una fuente que solo usan los casos y contacto.

**CSS (convención §24.1):** variables en `:root` de `globals.css`: `--font-body` (Helvetica Neue + respaldos) y `--font-display` (Kinder + respaldos); `body` usa `--font-body`. **Clase global `.text-display`** (Kinder, `font-weight: 400`, `font-synthesis: none`): Kinder solo existe en Regular y un `h1` es negrita por defecto, así que sin esa clase el navegador fabricaría una negrita falsa. Los módulos CSS no escriben nombres de fuente (hay un test que lo vigila).

**Aplicado en:** el `h1` de `CaseDetail` (título de la ficha de caso) y el `h1` de `/contact`. **No** en: título de episodios (`EpisodeDetail`), ni el texto de los pines del feed (incluido el título de un pin de caso), ni nada más. Si «título de los casos» incluía el pin del feed, hay que añadir `text-display` a `PinCard`.

**Verificado** en Chromium real contra el servidor de producción (`/contact`): las 3 fuentes se piden (200, `font/woff2`) y quedan `loaded`, sin avisos de CSP, `h1` en Kinder 400 sin síntesis, resto en Helvetica Neue. El título de la ficha de caso no se pudo ver renderizado (necesita datos de Supabase); sí está cubierto por test (lleva `text-display`) y comparte la misma clase.

**Pendiente / a tener en cuenta:**

- **Licencias:** los metadatos de los OTF no traen texto de licencia (Helvetica Neue: `fsType` 0; Kinder: `fsType` 8). Conviene confirmar que cubren uso web autoalojado, y que convertirlas a WOFF2 y recortarlas está permitido.
- **Documentos HTML de tools/insights (`composeToolDocument.ts`, `/app`):** el menú lateral que replica el Shell **no** usa estas fuentes (no define `font-family`), así que sus etiquetas flotantes no coinciden tipográficamente con las del Shell. Habría que servir las fuentes con URL estable (`public/fonts`) porque las de `next/font` llevan hash. No tocado.
- **Fuera de alcance de hoy:** rediseño de la página de contacto (se hablará luego) y texto de la ficha de tool en una columna (pospuesto).

**Tests nuevos (2 + 5), y un doble de `next/font/local` en `tests/setup.ts`** (esa función solo funciona con la transformación de Next, y `siteMetadata.test.ts` importa el layout raíz): el título de caso y el de contacto llevan `text-display`; `typographyCss.test.ts` fija en `globals.css` que `.text-display` fuerza peso 400 y sin síntesis (comprobado con mutación), que `body` y las variables parten de Helvetica Neue y Kinder, que los 3 WOFF2 existen y que ningún módulo CSS escribe nombres de fuente.

### 2.31 Texto de la ficha de tool/insight limitado a una columna — implementado (2 oct)

Implementada la primera solución de §2.26 (ancho fijo precalculado), en dos piezas que van juntas:

1. **Máximo — una columna de la retícula.** `.text` (`ToolInsightDetail.module.css`) tiene `max-width: var(--text-column-width, none)`. La variable la pone `ToolInsightDetail` con el ancho de una columna que calcula el hook. Se usa `max-width` y no un ancho fijo: `.text` sigue ocupando «lo que sobra» (`flex: 1 1 0`) con ese techo, así que nunca desborda el bloque.
2. **Mínimo — la imagen cede sitio.** `contentBlockImageDimensions` admite un cuarto parámetro `textReserve`; con él, el tope de la imagen es el **menor** entre el 83 % y «ancho útil − columna − 16 px». Se respeta el ratio y se recorta la altura renderizada, como siempre.

**Refactor necesario:** la fórmula del bloque (ancho reservado, imagen, columna) vivía dentro de un `useMemo` del hook; ahora es la función pura `computeContentBlockGeometry` en `detailLayout.ts` (con `CONTENT_BLOCK_TEXT_GAP_PX = 16`), probada sin React. El hook solo la llama y devuelve `contentBlockTextWidth`. Opt-in por `options.textColumn`: **solo `ToolInsightDetail` lo activa.**

**Alcance:** la ficha de tool, la de insight (aunque hoy el flujo salte a `/app`, §2.21) y la de contenido libre (`/variety`), porque comparten componente. **Casos y episodios no cambian** (hay un test que lo fija y otro de equivalencia con la fórmula antigua). **Móvil (<3 columnas) no se toca.**

**Verificado en Chromium real** (CSS real de la ficha + geometría real del proyecto, 9 tamaños de pantalla × 7 ratios × texto corto y largo = 252 casos): con ≥3 columnas el texto mide **exactamente una columna en 56 de 56 casos**, con texto corto y largo, y **cero desbordes**. Con las capturas a la vista, el CTA queda abajo a la derecha de la columna. No se ha visto con una ficha real (necesita datos de Supabase).

**Coste visual (la imagen se encoge solo donde el texto quedaba aplastado):**

| Viewport         | Columnas | Cambio de la imagen                                                             |
| ---------------- | -------- | ------------------------------------------------------------------------------- |
| 1280×720         | 4        | 4:3 −9 %                                                                        |
| 1366–1920        | 6        | 4:3 −6/−8 %, 16:9 −4 %; el resto sin cambio                                     |
| 2560×1300        | 6        | ninguno                                                                         |
| 1000×800         | 4        | 16:9 −11 %, 1:1 −17 %, 4:3 −21 %                                                |
| 800×900 (tablet) | 3        | 16:9, 1:1 y 4:3 −21 %; verticales −34 % a −42 % (la imagen queda de ~1 columna) |

En **tablet** (640–899 de contenedor) el bloque de contenido solo reserva 2 columnas con ratios verticales, así que «texto = 1 columna» deja a la imagen otra columna: es el precio de la regla. Si no gusta, la salida es no aplicarla por debajo de 4 columnas.

**Hallazgo (ya existía, no lo introduce este cambio):** en **móvil** (<640 de contenedor, ~736 px de viewport) la imagen ocupa el 100 % del bloque y el texto queda con **0 px de ancho**; midiendo con el CSS y la geometría reales, el texto de tool/insight no se ve en un móvil (7 de 7 casos). Es el «placeholder de móvil» ya documentado, pero con ese efecto. Pendiente del rediseño móvil (lo razonable es apilar imagen y texto).

**Tests (+12):** propiedades con fast-check sobre todos los ratios/viewports/anchos (imagen + hueco + texto ≤ ancho útil; ratio conservado; la imagen nunca crece frente a la regla antigua; sin `textReserve` el resultado es el de siempre), equivalencia con la fórmula original sin `textColumn`, el texto mide exactamente una columna con `textColumn`, móvil intacto, y guardas de CSS (el `gap` real de `.contentBlock` coincide con la constante; `.text` usa la variable). Comprobado con mutaciones: quitar el tope de la imagen o activar la columna también en casos/episodios rompe tests. Smoke de la ficha: recibe `--text-column-width` (190 px con un contenedor de 1200); smoke de caso: no la recibe.

**Especificación actualizada:** `especificacion-final-formato-detalle.md` §2, punto 2 (excepción para tipo A).

### 2.32 Pin de episodio: «programa + tipo» en la segunda línea (2 oct)

Petición de Greener: en el pin de un episodio, la línea en negrita bajo el título pasa de «tipo de episodio» a **«<programa> <tipo>»**, p. ej. «Carlos Lledó nos cuenta su visión del mercado» / **«Brand the Future Podcast»**. El programa es el campo **«Programa»** del ABM (`episode.program`); el tipo sigue siendo «Tipo de episodio» (`episode.episode_kind`), al final.

**Cambios:**

- `modules/content/domain/episodeLabels.ts` (nuevo): única fuente de los nombres legibles — `EPISODE_PROGRAM_LABEL` («Brand the Future», «Brand into Europe», «Brand to Table»), `EPISODE_KIND_LABEL` («Podcast») y `episodePinSecondaryText(program, kind)`. Si falta uno de los dos, sale solo el otro; si faltan ambos, no hay segunda línea; un valor desconocido se muestra tal cual en vez de romper.
- `supabaseFeedSource.ts`: las **dos** consultas del feed piden ahora `episode ( program, episode_kind )` — la de ronda nueva (`getFeedDataset`) y la de ronda ya guardada (`getPinDirectoryByIds`); `derivedFeedText` usa `episodePinSecondaryText`.
- Dedup: el desplegable «Programa» del ABM (`EpisodeDetailForm`) y la ficha pública (`EpisodeDetail`, que tenía su propio `episodeKindLabel`) usan ahora esas mismas etiquetas; antes los nombres estaban duplicados en privado.

**Efecto colateral:** el pin mostraba el valor crudo del tipo (**«podcast»**, en minúscula); ahora sale **«Podcast»**, como en la ficha del episodio y en el ejemplo de Greener.

**Tests (+9):** etiquetas (hay una para cada programa y tipo del esquema; nombres iguales a los del ABM), pin de episodio (cada programa), y dos pruebas con un cliente de Supabase falso que captura el `select` de cada consulta — comprobado con mutaciones: olvidar `program` en cualquiera de las dos las rompe (importante: si faltara en la de rondas guardadas, esas rondas mostrarían solo «Podcast»). 834 tests.

**Límite conocido (medido con Helvetica Neue Bold real y el CSS real del pin):** la segunda línea es de **una sola línea con puntos suspensivos** (`white-space: nowrap`). La más larga, «Brand into Europe Podcast», ocupa ~168 px: cabe en escritorio y tablet, **salvo** una rendija de viewport de ~1296–1307 px (6 columnas recién activadas) y los **móviles** (columnas de ~141 px), donde las tres combinaciones se cortan («Brand the Future Po…»). No se ha tocado el CSS (la misma clase sirve para el cliente de los casos). Si molesta, la salida es dejar esa línea en 2 líneas para episodios (CSS + estimación de altura en `useMasonryPositions` y `useRecommendationMasonry`).

### 2.33 `npm audit fix`: Next.js 16.3.5 → 16.3.8 (2 oct)

Greener ejecutó `npm audit fix` tras detectar una vulnerabilidad crítica y compartió el `package-lock.json` resultante. **Integrado y verificado.**

**Qué cambia exactamente:** solo **`next` 16.3.5 → 16.3.8** y sus 9 binarios nativos (`@next/env` y `@next/swc-*`). No se añade ni se elimina ningún paquete, `package.json` no cambia (el rango `^16.3.0` ya lo cubre) y la sección raíz del lock es idéntica. Además el lock nuevo trae el campo `libc` (glibc/musl) en los binarios de Linux: npm instala solo el que corresponde (507 paquetes en vez de 508 en un Linux glibc). Es una mejora, no un riesgo.

**Verificado en una copia limpia con Node 24.15.0 y Next 16.3.8:**

- `npm audit`: **0 vulnerabilidades** (todas las dependencias).
- `npm ci`, ESLint, Prettier, `tsc` y `next build` limpios (el build sigue avisando de los dos experimentos, `proxyClientMaxBodySize: 25mb` y `serverActions`); 834 tests en verde, tres ejecuciones seguidas.
- Servidor **`standalone`** (como se despliega, con Next 16.3.8 dentro de `.next/standalone`): `/contact` 200, `/privacy` 200, `/robots.txt` 200, `/api/feed/demo` y `/preview/masonry` 404 en producción; cabeceras de seguridad (CSP con **nonce distinto por petición**, HSTS, nosniff, Referrer-Policy) presentes.
- **Comparado con la versión anterior de Next bajo las mismas condiciones** (con un Supabase falso mínimo): los 404 de `/work`, `/tools` e `/insights` y los tamaños de respuesta son **idénticos byte a byte**. El comportamiento del 404 de las páginas públicas documentado en §4.8 (cuerpo vacío en el HTML del servidor, la página de `not-found` pintada por el cliente) **no ha cambiado** con 16.3.8.
- En Chromium: `/contact` con las 3 fuentes cargadas (200), sin errores ni avisos de CSP, y `/work/no-existe` pinta «Page not found» dentro del Shell.

**No verificado aquí:** el despliegue real en Dinahosting (proxy, PM2, tamaño de subida de ZIP y las tres comprobaciones de `despliegue.md` §6), que siguen pendientes. Al subir la carpeta `standalone` nueva, esta ya lleva Next 16.3.8.

**Notas:** `despliegue.md` menciona «Next 16.3.5» como versión con la que se verificó la guía (sigue siendo cierto en lo que dice, solo es una versión anterior). Conviene ejecutar `npm audit` de vez en cuando; hoy sale limpio.

### 2.34 Clase global `.text-body` para texto corrido (2 oct)

Petición de Greener (párrafo de introducción del **rediseño de `/contact`**, que no está en esta copia): que tenga los estilos de un texto normal, como el de las tarjetas de la home.

**Causa:** un `<p>` sin clase hereda de `body` solo la familia y el color; el tamaño es el del navegador (16 px), el interlineado `normal` y lleva márgenes de 1em, así que se ve más grande y apretado que el texto de las tarjetas (`PinCard.module.css`: `font-size: 0.8rem`, `line-height: 1.3`, peso 400).

**Solución:** clase global **`.text-body`** en `globals.css` (junto a `.text-display`, sección «TIPOGRAFÍA»): Helvetica Neue Regular (`var(--font-body)`), `0.8rem`, `line-height: 1.3`, color de texto y `margin: 0`. Sin ancho máximo: el espaciado y la medida son del layout de cada página (en un contenedor ancho, a 0.8rem la línea sale larga; conviene limitarla con `max-width` en el módulo de la página). Uso: `<p className="text-body">…</p>`; se mantiene el `{`…`}` con plantilla del párrafo, que evita el error de ESLint `react/no-unescaped-entities` con los apóstrofos.

**Verificado** en Chromium (CSS real + fuentes reales): con la clase, familia, tamaño, interlineado, peso y color **coinciden con el texto de una tarjeta de la home**. **Test** (`typographyCss.test.ts`): `.text-body` toma de `PinCard.module.css` el mismo tamaño, interlineado y peso, y no lleva `max-width`; comprobado con mutación (cambiar el tamaño rompe el test). 835 tests.

**Pendiente:** el párrafo en sí vive en el rediseño de contacto de Greener; basta con añadirle la clase. Si el texto de tarjetas cambia de tamaño en el futuro, el test avisa de que hay que actualizar `.text-body`.

### 2.35 Comprobación del formulario de contacto antes de publicar (2 oct)

Greener pidió revisar el formulario antes de probarlo en el sitio activo. Se montó un **banco de pruebas** con el servidor de producción (`standalone`, Next 16.3.8, Node 24) + un **SMTP falso** (`aiosmtpd`, guarda cada correo recibido) + un **Supabase falso** que emula `contact_submission` (insertar y contar con `count=exact`) y se atacó con Chromium: 12 escenarios y 37 comprobaciones. El banco no está en el repositorio (vive fuera, en `/tmp`); se puede añadir si se quiere repetir.

**Resultado: 25 correctas, 4 fallos reales (3 problemas distintos) y 8 observaciones.**

**Lo que funciona (verificado):**

- **Camino feliz:** el visitante ve el mensaje de éxito; llega **exactamente un correo** con `From`/`To` correctos y `Reply-To` = email del visitante; cuerpo con todos los datos, con acentos, ñ, emoji y «€» bien codificados; el HTML del correo **escapa** `<script>` y `<b>`, y conserva los saltos de línea.
- **Registro:** una fila `sent` con `ip_hash` SHA-256; no guarda ni la IP en crudo ni nombre, email, teléfono o mensaje.
- **Validación:** el navegador bloquea el formulario vacío (campos `required`); si se salta, el servidor devuelve un error por campo (incluido el consentimiento) y no sale ningún correo; nombre, teléfono y mensaje fuera de límite se rechazan.
- **Honeypot:** relleno → el bot ve «éxito», no sale correo y se registra `honeypot`.
- **Límite por IP:** los 5 primeros envíos salen, el 6º se bloquea sin correo y se registra `rate_limited`.
- **SMTP caído:** el visitante ve un error claro, se registra `failed` con el motivo y, al volver el SMTP, reenviar funciona. Con **Supabase caído no se envía correo** (falla cerrado, a propósito).
- **Doble clic** en «Send»: un solo correo. **Inyección de cabeceras:** un nombre con saltos de línea (`Bcc:`, `X-Injected:`) no añade cabeceras ni destinatarios; nodemailer los neutraliza.
- **Navegador:** ni un solo error o aviso en la consola (CSP incluida) durante todas las pruebas.

**Lo que falla o conviene arreglar (no se ha tocado código):**

1. **El formulario se vacía tras cualquier error.** React 19 reinicia los campos de un `<form action>` al terminar la acción, aunque haya fallado: si el SMTP falla, el email es inválido o el mensaje pasa de 5000 caracteres, **el visitante pierde todo lo escrito**. Es el fallo con más impacto de cara al usuario. Arreglo: devolver los valores enviados en el estado de la acción y pintarlos como `defaultValue`.
2. **El límite por IP se puede esquivar falsificando `X-Forwarded-For`.** `clientIp.ts` toma el **primer** valor de la cabecera, que controla el cliente si el proxy añade su valor al final (el comportamiento por defecto de nginx). En la prueba, 8 de 8 envíos desde la misma IP real pasaron con límite 5. Si el proxy de Dinahosting **sobrescribe** la cabecera, no hay problema; **hay que comprobarlo en vivo**. Arreglo: leer el valor que añadió el proxy de confianza (el último, o contar saltos).
3. **Sin `X-Forwarded-For`, el límite es de todo el sitio** (ya anotado en `despliegue.md` §6, punto 3, ahora confirmado): tras 5 envíos de una persona, otra distinta queda bloqueada.

**Observaciones (menores):**

- **Con Supabase caído el visitante lee «Has enviado demasiados mensajes»**, que es engañoso (es una avería, no un abuso); el comportamiento de fallar cerrado es correcto, el texto no.
- **Idiomas mezclados:** etiquetas y botón en inglés (§2.4), pero éxito y errores en español; y el error de «nombre de más de 200 caracteres» sale en **inglés** por el mensaje por defecto de zod («Too big: expected string…»).
- Los campos **no llevan `autocomplete`** (`name`, `tel`, `email`) ni `maxlength` (el visitante solo se entera del límite al enviar, y entonces pierde el texto: ver 1). Por lectura del código (no probado con lector de pantalla), éxito y errores no usan `role="alert"` ni `aria-live`.
- El campo trampa está fuera de pantalla (`x: -9999`), con `tabIndex=-1` y `aria-hidden`: correcto.

**No se puede comprobar desde aquí (hay que hacerlo en vivo, ver §4.0):** que el correo llegue de verdad (bandeja o spam, SPF/DKIM/DMARC del dominio de `no-reply@`, y que el proveedor SMTP acepte ese remitente), la IP que entrega el proxy de Dinahosting, que la Server Action funcione tras el proxy, las variables y la migración de `contact_submission` en producción, y el enlace de privacidad (hoy un placeholder).

### 2.36 Vídeos de demostración en las tools (5 oct)

**Qué se pidió.** Poder enseñar en la ficha de una tool un vídeo corto que muestre cómo funciona. Tras un primer plan (tabla propia y fila de vídeos bajo el texto) Greener lo **descartó**: el funcionamiento de una tool no cambia — varios pines, el usuario abre uno desde la home y llega a `/tools/{slug}?pin=…` con ese pin cargado — y el vídeo debe **sustituir a la imagen** del bloque imagen + texto, entrando por el flujo de pines que ya existe. Sin tabla nueva, sin sección nueva en el ABM, sin carrusel, sin fila inferior.

**Decisiones (Greener, 5 oct).**

- **Límites.** Vídeo de pin de **tool: 15 s y 15 MB**. Resto de pines (caso, insight, episodio, other): **8 s** (antes 5; la mayoría de los vídeos duran 5-7 s) y 100 MB. 8 s es además el umbral de animación en el feed: un vídeo más largo **no se anima en la home**, se queda en su poster y solo se reproduce en la ficha.
- **Formatos de entrada:** MP4, WebM y MOV (Cloudinary sirve WebM o MP4 con `f_auto`). **Ratios:** los 7 cerrados; el ABM avisa (sin bloquear) si el vídeo subido no encaja con el ratio de su pin, porque se recortaría con `object-fit: cover`.
- **En la ficha:** mismo cuadro que la imagen (`computeContentBlockGeometry`, sin tocar la geometría); mudo, en bucle, con botón de pausa siempre visible y `alt` del pin (obligatorio, sin pie). El ancho que se pide a Cloudinary sale de los **mismos anchos de entrega de detalle que las imágenes** (`pickDetailWidth`), no de una constante nueva. Fuera del `videoPlaybackCoordinator`, **sin analítica** nueva, insights sin tocar, `/variety` (portada de vídeo con controles) sin cambios.
- **`prefers-reduced-motion` y `save-data`/2G** (§9.3 de la arquitectura, que no existían en ninguna parte): módulo nuevo `src/lib/useMotionPreferences.ts`; con cualquiera de las dos el vídeo de la ficha no arranca solo (poster + «Play», sin precarga). Los pines del feed podrán adoptarlo después.
- **Cloudinary Free: no se tolera basura.** Se revisaron todos los puntos de subida (ver abajo).

**Qué se cambió.**

- `mediaLimits.ts`: `PIN_ANIMATION_LIMITS` 5 → 8 s, `TOOL_PIN_VIDEO_LIMITS` (15 s / 15 MB), `pinVideoLimitsFor`, `validatePinVideoUpload`, `canAnimateInFeed`. `pinMediaSchema.ts` usa el techo absoluto (15 s); el límite por tipo lo aplica SQL.
- **Migración `20261005090000_pin_video_limits_by_content_type.sql`**: `attach_pin_video` lee el tipo del contenido del pin y aplica 15 s/15 MB (tool) u 8 s/100 MB. Un test comprueba que las constantes TypeScript y SQL coinciden.
- **Feed:** `supabaseFeedSource` lleva `duration_seconds` (solo vídeo) al cliente; `PinCard` no anima ni compite por hueco si `!canAnimateInFeed`.
- **Ficha:** `ToolCoverVideo` (+ hook y CSS), usado por `ToolInsightDetail` solo si `content.type === 'tool'`; `page.tsx` de la tool lee el `alt` del pin y lo pasa como `coverAltOverride`.
- **ABM:** `PinMediaManager` recibe `contentType` y `pinRatio` (límites por tipo, textos, aviso de ratio).

**Limpieza de Cloudinary (revisión de todos los puntos de subida).** Antes ya borraban el archivo: sustituir portada, quitar un medio del carrusel de caso y desvincular un medio de pin. Dejaban basura y ahora **ya no**:

- **Borrar un pin** (`delete_pin` dejaba los `media_asset` «deliberadamente»): migración `20261005091000_delete_pin_content_remove_orphan_media.sql` los borra en la misma transacción si nadie más los usa (otro pin, carrusel, portada u og); la Server Action lee los medios **antes**, y borra los archivos **después** (`cleanupMedia.ts`).
- **Borrar un contenido (draft)**: igual, con portada, og, pines y carrusel.
- **Fallo después de subir** (pin, carrusel, portada y carga masiva): `discardUploadedMediaAction` borra el archivo si no está registrado. Exige `is_admin()` (es un endpoint público) y solo actúa dentro de `greener/content/`. Cubre también que el admin cancele la sustitución de una portada de vídeo ya subida. Los mensajes de error ya no dicen «ya subido a Cloudinary».
- **Todo lo demás** (pestaña cerrada a medias, restos históricos): `scripts/reconcile-cloudinary.mjs`. Simulación por defecto; solo borra con `--delete`; ignora archivos de menos de 1 h (subida en curso) y todo lo que esté fuera de `greener/content/`. Uso: `node --env-file=.env.local scripts/reconcile-cloudinary.mjs`.

Todo es best-effort: un fallo de Cloudinary nunca deshace ni impide la operación de Postgres; si no se puede comprobar qué sigue en uso, **no se borra nada**.

**`?? 10` de `verifyCloudinaryVideoAsset` (parche temporal de Greener, se mantiene).** Conflicto encontrado: si la Admin API no devuelve `duration`, todo vídeo de pin se guardaría con 10 s y, con el umbral de 8 s, **se quedaría en poster en el feed**. Solución sin tocar el parche: `verifyCloudinaryVideoAsset` devuelve `durationAssumed` y `attachPinVideoAction` usa en ese caso la duración real que Cloudinary entregó al navegador al subir (que el esquema ya exigía). **Candidato a solución definitiva, SIN verificar con Cloudinary real:** se añadió `image_metadata: true` a la llamada `api.resource` (el soporte de Cloudinary indica que la duración de un vídeo ya subido se obtiene así; el SDK 2.11.0 lo admite). Si funciona, el aviso «la Admin API no devolvió duration…» deja de salir en el log del servidor; si sigue saliendo, esa opción no basta y hay que probar otra vía (p. ej. la Search API). El `?? 10` no se ha quitado.

**Cómo se verificó (y qué NO).**

- 924 tests, **todos en verde**. El zip de partida traía 2 rojos en `contact.smoke.test.tsx` (el título de `/contact` se rediseñó y el test seguía buscando «Contact» en el `h1`); se corrigieron aquí: ahora busca «We should have a brand together», y el `<title>` de la pestaña sigue siendo «Contact». ESLint y `tsc` sin errores (`tsc` tras `next build`/dev, sin el falso positivo `LayoutProps`). `next build` limpio (con variables de prueba y **Node 22**, el del entorno de trabajo; el proyecto fija Node 24.15, conviene repetirlo allí). Prettier correcto sobre todos los ficheros tocados.
- ~90 tests nuevos o ajustados: límites por tipo y su coherencia con el SQL, ratio, anchos de entrega, preferencias de movimiento, `PinCard` con vídeo largo, reproductor (arranque, reduced-motion, pausa manual, pausa fuera de pantalla), limpieza y reconciliador (incluido «nunca tocar fuera de `greener/content/`»), acciones de servidor (borrar pin/contenido, descartar subida con y sin sesión de admin).
- **NO se ha comprobado:** (1) las dos migraciones **contra un Postgres/Supabase real** — hay que aplicarlas antes de desplegar; (2) la reproducción en un **navegador real** (los tests usan jsdom, que no reproduce vídeo); (3) `image_metadata: true` con Cloudinary real; (4) el reconciliador contra Cloudinary y Supabase reales (solo se ha probado su lógica pura).

**Corrección posterior (5 oct): vídeo de 5 s rechazado con «supera los 15 segundos».** Primera prueba real: un vídeo de 5 s y poco peso en un pin de tool fallaba. Causa: `readVideoDuration` (copiada en `PinMediaManager`, `CaseCarouselManager` y `CoverMediaUpload`) devolvía `video.duration` tal cual, y para un WebM sin cabecera de duración (típico de grabadores de pantalla y de `MediaRecorder`, o sea, justo el vídeo de demostración de una tool) el navegador responde `Infinity` o `NaN`; el parche del 30 sep solo tolera que la lectura _falle_, no que devuelva un valor no finito, y `Infinity > 15` rechazaba el vídeo antes de subirlo. Era un fallo anterior a este trabajo (con el límite de 5 s habría pasado igual). Arreglo: helper compartido `src/modules/media/infrastructure/readLocalVideoDuration.ts`, que devuelve `null` («no se sabe», no se bloquea) si la duración no es un número finito positivo, si el archivo no se puede decodificar o si el navegador no responde en 5 s (antes el formulario podía quedarse en «Subiendo…» indefinidamente); la duración que manda es la que devuelve Cloudinary tras subir. Las tres copias se sustituyen por el helper. Tests: el helper, y un caso de regresión en el carrusel de casos y otro en `PinMediaManager` (nuevo `pinMediaManager.test.tsx`: Infinity/NaN con 5 s se sube, 12 s vale en tool y no en caso, 20 s reales se rechazan con «15 segundos» y se descarta el archivo, más de 15 MB, aviso de ratio); comprobado que fallan con el comportamiento antiguo. La Admin API y el `?? 10` no tienen relación con este fallo. Con este arreglo: 103 ficheros y 952 tests, todos en verde.

**Carga masiva con vídeo (5 oct).** El botón «Carga masiva» no dejaba subir ningún vídeo: no era solo el `accept="image/*"`, todo el flujo era de imágenes (validación, firma de subida y la acción que crea el pin con su medio). Ahora el selector acepta imágenes y vídeos (MP4, WebM y MOV; `.mov` también por extensión, porque algunos sistemas no informan de su MIME) y un lote puede mezclarlos. Cada fila se clasifica por tipo; los vídeos pasan por las mismas reglas que `PinMediaManager` (15 s / 15 MB en tools, 8 s en el resto, `readLocalVideoDuration`, validación final con la duración de Cloudinary, aviso no bloqueante de ratio) y por una Server Action nueva, `createPinWithVideoAction`. Diferencias deliberadas con la de imagen: verifica el vídeo **antes** de crear el pin y, si adjuntarlo falla (p. ej. el límite por tipo en SQL), **borra el pin recién creado**, para no acumular pines vacíos en un lote de cientos. Campo común nuevo «Reproducción de los vídeos en el feed» (al entrar en pantalla / al pasar el ratón; por defecto, al entrar en pantalla): sin él un pin de vídeo con `autoplayMode: null` nunca se animaría en la home. Nota: `createPinWithImageAction` **no** limpia el pin si falla el adjuntado de la imagen (comportamiento anterior, no tocado); un fallo en la carga masiva de imágenes puede dejar un pin sin medio.

**Caso y episodio: bloque de contenido en flujo (5 oct).** El diseño pide un margen mayor entre el bloque de contenido y las recomendaciones, y un `margin-bottom` no funcionaba: `.contentBlock` era `position: absolute` dentro del lienzo, así que no empujaba a nadie; las recomendaciones se colocaban por JS a `altura del embed/carrusel + 12 px`, y `.canvas` llevaba altura inline. Decisión: en tipo B (caso y episodio) el bloque pasa a **flujo normal, encima del lienzo**, y el lienzo solo contiene las recomendaciones, sembradas a 0 (`useRecommendationMasonry` con `fullWidthContent`: sin siembra y `totalHeight` = altura del masonry). Efectos: el margen es un `margin-bottom` de CSS (token global `--detail-block-gap`, hoy `var(--space-xl)` = 40 px, **provisional hasta fijar el valor del diseño**; se suma al gap de 24 px de `.article`, así que la distancia total es 64 px); y desaparece el solape que se daba cuando el texto del episodio caía debajo del embed (a ~1100×900 y ~1150×900, donde al texto le quedan menos de 240 px al lado). **Tool/insight/other no cambian**: bloque en absoluto dentro del lienzo, sin el margen nuevo, con el espacio que ya tenían (un test lo fija). Tests nuevos `detailBlockFlow.test.tsx` (estructura del DOM, posiciones, CSS); comprobado que 3 de ellos fallan con el comportamiento antiguo.

Con esto: 105 ficheros y 985 tests, todos en verde.

**Ficha de episodio según el documento de diseño (5 oct).** Cuatro cambios, además del margen inferior (ya hecho al pasar el bloque a flujo):

1. **Dos grupos de texto, con menos espacio.** La columna de texto se divide en `.heading` (tipo de episodio + título) y `.details` (highlight + cuerpo). Dentro de cada grupo el hueco es de 4 px (`--space-xs`); entre grupos, 12 px (`--space-sm` + `--space-xs`); antes todo iba a 8 px. Son dos variables locales de `.text` (`--episode-gap-inner`, `--episode-gap-groups`) para ajustarlos en un sitio. Si el episodio no tiene highlight ni cuerpo, el segundo grupo no se pinta (no deja un hueco vacío).
2. **Título en Kinder**, con la clase global `text-display`, igual que en caso.
3. **Negritas y tamaño.** Tipo de episodio y highlight en `font-weight: 700` (Helvetica Neue 700 existe de verdad). El título **no** va en negrita: Kinder solo existe en peso 400 y `text-display` impide la sintética; destaca por tamaño, `clamp(2rem, 16cqw, 3.75rem)`. Se dimensiona con `cqw` (porcentaje del ancho de **su columna**, no de la ventana) porque esa columna es lo que sobra junto al embed y varía mucho (a 1440×900 son ~250 px): un título enorme en una columna estrecha se partiría palabra a palabra. Para ello `.text` es `container-type: inline-size`; hay un `font-size: 2rem` de respaldo para navegadores sin esas unidades. El recorte pasa de 2 a 4 líneas: un título del límite blando (80 caracteres) necesita más con este cuerpo, y el recorte ya no protege de ningún solape, porque el bloque va en flujo y crece con su contenido.
4. **Segundo CTA «Watch more»** (spec §1 y §7: «no es un campo, sale automático según `provider`»; nunca se había implementado). Enlace externo en pestaña nueva (`target="_blank"`, `rel="noopener noreferrer"`) al episodio en su plataforma: YouTube `youtube.com/watch?v=ID`, Vimeo `vimeo.com/ID`, Spotify `open.spotify.com/episode/ID` (`episodeExternalUrl`, con el id escapado). Mismo aspecto que el CTA de tool/insight y colocado abajo a la derecha de la columna: para ello `.contentBlock` pasa de `align-items: flex-start` a `stretch` (la columna mide lo mismo que el embed) y el CTA lleva `margin-top/left: auto`. Es un enlace, no un embed: no carga nada de terceros; el embed sigue pidiendo consentimiento. Nombre accesible «Watch more on YouTube (opens in a new tab)». **Sin analítica nueva** (no se pidió).

No se ha tocado el hueco de 24 px entre el embed y la columna de texto (`.contentBlock { gap }`). Tests: `episodeDetail.design.test.tsx` y `episodeLinks.test.ts`; comprobado que fallan sin `text-display` y sin la negrita. Con esto: 107 ficheros y 1005 tests, todos en verde.

**Reconciliador: filas de `media_asset` sin referencias (5 oct).** Primera ejecución real del reconciliador: salieron sobre todo vídeos (hipótesis: subidas fallidas de las pruebas, anteriores al descarte automático). Aclaración de qué buscaba: **solo archivos de Cloudinary sin ninguna fila en `media_asset`**; el estado del contenido nunca se miraba y los medios de contenido en draft o despublicado no se tocaban. Pero una fila que ya no cuelga de nada (lo que dejaban `delete_pin` y `delete_content` antes de la migración `20261005091000`, que solo actúa hacia delante) contaba como «registrada» y su archivo se quedaba para siempre. Decisión de Greener: no tiene sentido conservar un medio que no referencia nadie solo porque esté en la tabla. Ahora el script distingue dos tipos y los muestra siempre por separado:

1. **Archivos sin fila** (como antes): se borran con `--delete`.
2. **Filas de `media_asset` que nada referencia**: ni `pin_media`, ni `case_detail_media`, ni `content.cover_media_id`, ni `content.og_media_id` (las cuatro únicas claves foráneas hacia `media_asset`). Se borran **fila y archivo** con `--delete --include-unreferenced`. La simulación las lista siempre.

Garantías: el **estado del contenido no interviene** (los ids de referencia se leen sin filtrar por `status`; un test lo fija con un cliente que lanzaría si se filtrara); solo se toca `greener/content/`; se respeta la antigüedad mínima (1 h, con `media_asset.created_at` para las filas); y las FK hacia `media_asset` son `NO ACTION`, así que Postgres rechaza borrar una fila que de pronto vuelva a estar referenciada (el lote se reintenta fila a fila y solo falla esa). Orden deliberado: **primero la fila, después el archivo, y solo el de las filas que de verdad se borraron**; lo peor que puede quedar a medias es un archivo sin fila, que recoge el tipo 1 en la siguiente pasada. Una fila sin archivo en Cloudinary se borra solo de la tabla. La parte destructiva se extrajo a `applyCleanup` para probarla con fakes; la lectura paginada ahora lleva orden estable. Tests ampliados de 9 a 38; comprobado que fallan si se borra el archivo de una fila que no se pudo borrar. Con esto: 107 ficheros y 1034 tests, todos en verde.

**Margen derecho del masonry en caso y episodio (6 oct).** Greener detectó que las tarjetas de recomendaciones de la ficha de episodio (y, se sospechaba, de caso) se pegaban al borde derecho; el padding existía pero el contenedor parecía medir más del 100 %; en el lado izquierdo y en tools estaba bien. **Reproducido en un Chromium real** (ver método abajo): con 1440×900 y barra de scroll de 15 px, `scrollWidth` 1440 frente a `clientWidth` 1425 (**scroll horizontal**), `main` sin encogerse y la tarjeta más a la derecha a **1 px** del borde visible en vez de 16 px; igual en todos los tamaños probados, en caso y en episodio; la tool siempre bien.

_Causa (regresión mía del §2.36, «bloque en flujo»)._ El bloque de caso/episodio, ya en flujo, llevaba `style={{ width: <px medidos por el hook> }}`. La página arranca corta, sin barra de scroll, y el hook mide el lienzo (1344 px) y lo fija como ancho del bloque. Al llegar las recomendaciones la página crece y aparece la barra (−15 px), pero la columna del `Shell` es un hijo de grid con pista `1fr` (= `minmax(auto, 1fr)`): no baja de su ancho mínimo de contenido, que el bloque con ancho rígido fijaba en 1344 px. `main` no se encoge, el lienzo sigue midiendo 1344, las tarjetas se calculan para un ancho que ya no existe y se salen 15 px hacia el padding derecho (bucle de realimentación ancho medido → ancho fijado → ancho que no se puede corregir). La tool no lo sufre porque su bloque es `position: absolute` y no cuenta para el ancho mínimo. Que el caso de prueba saliera bien a veces era azar: si el contenido ya es lo bastante largo para que la barra exista desde el principio, el ancho medido es el bueno.

_Arreglo, en dos piezas._ (1) `CaseDetail` y `EpisodeDetail` ya no ponen el ancho en píxeles inline; `.contentBlock` usa `width: 100%` por CSS (en tipo B el ancho reservado es siempre el 100 % del contenedor, así que es exacto). Solo con esto quedaba bien a partir de ~800 px, pero a 700 px y menos fallaba igual: en móvil el vídeo/carrusel ocupa el 100 % con un ancho en píxeles y volvía a fijar el mínimo. (2) `Shell.module.css`: `.content { min-width: 0 }`, el arreglo canónico del «blowout» de grid: la columna puede encogerse siempre, el ancho medido es siempre el real y los anchos en píxeles se corrigen en el siguiente render. Es un cambio global del Shell (todas las páginas públicas); si alguna tuviera contenido rígido más ancho que la pantalla, ahora se desborda en lugar de ensanchar la columna.

_Verificación._ 35 combinaciones (episodio y caso, con cuerpo corto y largo, más tool; 1920, 1440, 1100, 800, 700, 600 y 420 px): todas con 16 px de margen y sin scroll horizontal; además redimensionado en caliente (1440→1000→700→1600→1280→900): bien. Tests de regresión en `detailBlockFlow.test.tsx` (sin ancho inline en el bloque, `width: 100%`, `min-width: 0` en `.content`); comprobado que fallan si se deshace el arreglo. jsdom no calcula layout, así que esos tests fijan las piezas del arreglo, no el resultado visual.

_Método de medida (fuera del repo, repetible)._ `esbuild` empaqueta los componentes reales (`Shell`, `EpisodeDetail`, `CaseDetail`, `ToolInsightDetail`) con el CSS real y stubs de `next/link` y `next/navigation`; `fetch` se sustituye por datos de prueba con 300 ms de retraso para que la barra de scroll aparezca después del primer layout; `puppeteer-core` con `@sparticuz/chromium` (Chromium empaquetado en npm, con barra de scroll clásica de 15 px) mide `scrollWidth`, el ancho de `main` y del lienzo y el borde derecho de la tarjeta más a la derecha. No usa `next/font`, así que las capturas salen con tipografía de respaldo.

_Ajustes de diseño de Greener integrados (6 oct)._ Huecos de la columna de texto del episodio (`--episode-gap-inner` 16 px, `--episode-gap-groups` 8 + 24 = 32 px), sin opacidad en el tipo de episodio, `margin-bottom` y `margin-right` de `var(--space-md)` en el CTA del episodio y en el de tool/insight; título de tool/insight en negrita con `margin-top` y **como `<p>` en lugar de `<h1>`**; reset de márgenes y padding de `p` y `h1` en `globals.css`; ajustes de la página de contacto. Tests ajustados: los de tool buscan el título por texto, no por rol `heading`, y el de huecos del episodio usa los valores nuevos. **Efecto a vigilar:** la ficha de tool (y la de contenido libre) ya no tiene ningún `<h1>`, algo que conviene tener por accesibilidad y SEO; con el reset global de `h1` basta volver a `<h1 className={styles.title}>` con `font-size: 1rem` para conservar el aspecto.

Con esto: 107 ficheros y 1039 tests, todos en verde.

**Sincronización con los cambios de Greener del 6 oct (tercera tanda).** (1) La ficha de tool recupera su `<h1>` (`<h1 className={styles.title}>` con `font-size: 1rem`, que compensa el 2em por defecto; los márgenes ya los resetea `globals.css`). Greener quitó además `font-weight: bold` de `.title`: el título sigue saliendo en 700 porque es el valor por defecto del navegador para `h1` (comprobado en Chromium: `H1`, 16 px, peso 700, un único `h1` en la página). (2) El highlight de caso y episodio **ya no se recorta**: se quitan `display: -webkit-box`, `-webkit-box-orient`, `-webkit-line-clamp: 2`, `line-clamp: 2` y `overflow: hidden` de `.highlight`. Con el recorte, un highlight corto ya se cortaba, porque la columna de texto junto al embed mide ~250-350 px y 50-60 caracteres ocupan tres líneas; en Chromium, un highlight de ~110 caracteres sale ahora entero (3 líneas, columna de 356 px, `line-clamp: none`, sin desbordamiento). Tests nuevos: el título de tool es el único `h1` de la página, y `.highlight` de caso y episodio no lleva clamp. El comentario de `textLimits.ts` («`title`, `highlight`: 2 líneas ≈ 40-55ch») queda desfasado para el highlight; no se ha tocado, para no divergir del repo de Greener.

**Corrección a mi hallazgo del 1440×900.** El texto del episodio cayendo bajo el embed a 1440×900 era un artefacto de mi medida: usé un viewport de 900 px de **alto**, imposible en un monitor de 1440×900 (con la interfaz del navegador quedan ~770-800 px). Medido a 1440 de ancho con barra de scroll clásica: el texto va al lado hasta 890 px de alto de viewport (columna de 250 px) y cae debajo desde 900; con barras superpuestas el corte se mueve a ~910 px. Solo afecta a ventanas muy altas de ~1440 de ancho. La cantidad de texto no influye: lo decide el `flex-basis` de 240 px, y al cruzarlo la columna pasa de ~250 px al ancho completo de golpe.

Con esto: 107 ficheros y 1042 tests, todos en verde.

### 2.37 Rendimiento de los medios en Cloudinary Free: diagnóstico, presupuesto y plan de la fase 1 (6 oct)

**Qué se planteó.** Probando los vídeos de las tools (§2.36), Greener observó que se reproducen bien en pines y ficha pero **tardan en cargarse completamente** y, al entrar en pantalla, van **laggy** unos segundos hasta que se ven fluidos. Pidió investigar las opciones de Cloudinary porque la fluidez de la página es crucial. **Todo lo decidido y el plan operativo viven en `contrato-medios-fase-1.md`** (documento de traspaso para la siguiente conversación); aquí queda el relato y el porqué.

**Diagnóstico (del código y la documentación; no se pudo medir contra Cloudinary).** (1) El feed descarga el vídeo a tamaño original (`buildVideoFullUrl` sin ancho). (2) El `<video>` solo se monta al conseguir hueco de reproducción, o sea al entrar en pantalla: arranca sin buffer. (3) La primera petición de cada versión se genera al vuelo, con retraso para el primer visitante y, según Cloudinary, vídeos rotos para los demás mientras se genera: riesgo de lanzamiento. Hallazgos de código añadidos: el póster de cualquier vídeo es un único JPG de 960 px; el `src` de las imágenes del feed lleva el ancho exacto de la tarjeta; las miniaturas del ABM piden `w_200`/`w_300` sueltos; los vídeos del carrusel de caso y de contenido libre no tienen tope de tamaño.

**Opciones de Cloudinary estudiadas** (documentación oficial, 6 oct): redimensionar al tamaño necesario y `q_auto` (con `eco` y `low` más agresivos; `Save-Data` activa `eco` solo); `f_auto` en vídeo (WebM/VP9 o MP4/AV1 en la mayoría de navegadores, HEVC en Safari, H.264 de reserva; una derivada por formato servido); **transformaciones eager** para generar versiones al subir (hay que pedir cada formato y códec por separado: **`f_auto` no tiene efecto en un eager** y solo calienta la caché si coincide exactamente con la URL de entrega), con `eager_async` para no retener la subida; streaming adaptativo (HLS/DASH), **descartado** para clips de 5-15 s (423 hasta que se procesa, pocas transformaciones combinables, reproductor extra).

**Presupuesto (el dato que cambió el enfoque).** Panel de Greener: 4,76 de 25 créditos; 3,2 K transformaciones (≈ 8 por asset con unos 400 assets), 1,28 GB de almacenamiento y 341,81 MB de ancho de banda en 7 días; la web aún no está abierta al público. Los créditos se gastan sobre todo en versiones únicas (no en visitas), y al lanzar escalarán el ancho de banda y el catálogo. **Greener descarta Plus** (225 créditos, ~89-99 $/mes) y se comprobó que **no existe pago por uso razonable**: solo Pro PAYG cobra exceso (1.099 $/mes con 2.750 créditos incluidos y 0,45 $ por crédito extra); Free, Plus y Advanced no tienen cargo por exceso y, según fuentes de terceros no verificadas oficialmente, un exceso puede suspender la cuenta. **Decisión: seguir en Free**, fijar el contrato de entrega **una sola vez** (cada cambio de URL regenera versiones y deja las viejas ocupando almacenamiento) y reducir el peso de origen por parte de Greener. Corregí una afirmación mía anterior: la fase 1 **no** es gratuita en créditos (cada rendición nueva cuenta, aunque sustituya a una descarga más pesada).

**Contrato acordado (resumen).** Imágenes del feed con escalera 320/480/640 y `src` de escalera; pósters con `srcset` en vez del JPG de 960; vídeo del feed con **un solo ancho (480)** y dos fuentes explícitas (WebM/VP9 y MP4/H.264, sin `f_auto`); vídeo de la ficha con **dos escalones por área, M (≈0,92 MP) y L (≈1,44 MP)**, elegido según la caja real y el DPR; los vídeos de caso entran en el contrato (escalón M, con audio). **Corrección de mi propuesta inicial:** el «ancho fijo de 1280 px» era un error para ratios que no son 16:9, porque la caja se dimensiona por altura (66,7 vh); por eso el tope es por área. Cajas calculadas con la geometría real (px CSS, alturas supuestas): 1080p a 100 % → 1126×634 en 16:9; MacBook DPR 2 → 878×494; 1440p → 1553×874; 4K → 2372×1334. Tras una pregunta de Greener se añadieron al contrato las filas que faltaban (imágenes de la ficha y del carrusel de caso, OG, vídeo de caso, miniaturas del ABM).

**Hallazgo nuevo: límite de 40 MB en Free.** La tabla de planes da a Free un máximo de 40 MB por transformación de vídeo; nuestro tope de subida era de 100 MB. Se propone bajarlo a 40 MB para los vídeos de caso (**pendiente de probar y aprobar**).

**Conexiones lentas.** Con supuestos explícitos (clip de 7 s; 0,3 MB en el feed y 1,5 MB en la ficha), un clip arranca sin cortes si `descarga − duración ≤ 0`: a 2 Mbps todo va bien y a 1 Mbps la ficha arranca tras ~5 s. Que «nunca se reproduzca» es improbable salvo por debajo de ~0,5 Mbps; para eso se diseñó un comportamiento defensivo (tiempo máximo de ~10 s con póster, reintentos ante error, sin prefetch con ahorro de datos o conexión lenta). La generación al vuelo no depende de la conexión del visitante: se resuelve calentando las versiones **al publicar** (fase 2, propuesta: llamar a `explicit` con `eager` desde el servidor, no probada).

**Pesos de subida.** Greener reducirá por su lado el peso de los originales; se le entregó una tabla de tamaños, formatos y fps por cada uno de los 7 ratios (en `contrato-medios-fase-1.md` §5). Reducir el origen ahorra almacenamiento y tiempo de la primera transformación, pero **no reduce por sí solo el ancho de banda facturado**, que decide la rendición servida. La plantilla de `ffmpeg` se **verificó** instalando un `ffmpeg` empaquetado por `pip` (clip sintético 1920×1080 a 60 fps con audio → 1280×720, H.264 High, 30 fps, sin audio, `faststart`), y se probó el recorte y la reducción de imágenes con Pillow. Claude puede convertir los ficheros que Greener suba al chat, pero no subirlos a Cloudinary ni al ABM.

**Estado al cerrar el día.** Fase 1 **no empezada** (se aplica el 7 oct). Esta tarde se convierten imágenes y vídeos de tools. No hay cambios de código: el repositorio es el zip del 6 oct (107 ficheros de test, 1042 tests en verde); lo nuevo son `contrato-medios-fase-1.md`, esta sección, `PROGRESO.md`, la especificación y los ficheros de estructura regenerados. Decisiones abiertas en `contrato-medios-fase-1.md` §12.

### 2.38 Fase 1 del contrato de medios: implementación (6-7 oct)

**Qué se hizo.** El contrato de `contrato-medios-fase-1.md` §4 y el comportamiento de §6, en código, con el contrato congelado por un test de cadenas exactas. Pasos 2-12 del plan §7, salvo lo señalado como pendiente abajo.

**Sintaxis confirmada (§4.6).** `ac_none` (documentación de audio: `none` quita el canal) confirmado. **`fps` NO se usa:** su sintaxis es `fps_<mín>[-<máx>]`, un _rango aceptable_ con mínimo obligatorio, no un tope; sin sintaxis segura de «máximo 30», los 30 fps los garantiza la fuente (tabla de subida). Un test fija que ninguna URL lleva `fps_`. El orden de componentes (`ac_none/c_limit,…/f_…/q_…`) sigue los ejemplos oficiales, **pero ninguna cadena está probada contra Cloudinary real** (el entorno no llega): lo comprueba Greener (200 y `Content-Type`).

**Dominio** (`modules/media/domain`).

- `mediaDelivery.ts`: escalera del feed 320/480/640; `pickFeedImageWidth` (el `src` de reserva es un escalón, nunca el ancho de la tarjeta); `FEED_VIDEO_WIDTH` 480; `VIDEO_PROFILES` (`feed`, `toolDetail`, `caseDetail`: calidad y audio); `DETAIL_VIDEO_RUNGS` con la tabla exacta de §4.3 y `pickDetailVideoRung` (necesario = lado mayor de la caja × min(DPR, 2); L si > 1,09 × lado mayor de M); `ADMIN_THUMBNAIL_WIDTH` (= primer escalón). **`MEDIA_QUALITY` es el punto único de la prueba A/B**: hoy todo `auto`.
- `videoPlayback.ts` (nuevo): todas las constantes de §6 (billetes 3/2, 10 s, reintentos 3 s y 8 s, 1,5 Mbps, umbrales de prefetch) y `videoLoadReducer`, máquina de estados pura (`loading → ready | retrying → gaveup`).

**URLs** (`cloudinaryUrl.ts`): `buildVideoSources` (WebM/VP9 y MP4/H.264, sin `f_auto`), `buildFeedVideoSources`, `buildVideoPosterUrl(id, tamaño)`, `buildVideoPosterSrcSet` y `buildVideoTransformations` (las cadenas que usará el eager de la fase 2: una sola fuente de verdad). **Eliminadas** `buildVideoFullUrl`, `buildVideoDetailUrl` y `buildVideoPreviewUrl` (esta última era código muerto con `f_auto` sin tope).

**Feed.** `videoPlaybackCoordinator` gana los billetes de prefetch (presupuesto aparte de los huecos; quien suena siempre tiene billete; desempate estable por id). `usePinVideo` (nuevo): prefetch con histéresis (se adquiere a una pantalla, se suelta a dos), vídeo oculto bajo el póster hasta `readyState ≥ 3` + `playing`, tiempo máximo, reintentos y liberación del elemento (`releaseVideoElement`). `PinCard`: póster siempre como capa de base, `<video>` con `<source>` encima. `useMotionPreferences` gana `slowConnection` y `feedAutoplayAllowed` (la ficha **no** se ve afectada por la conexión lenta).

**Ficha de tool.** `ToolCoverVideo` recibe `ratio` y la caja completa; escalón M/L, póster del tamaño del escalón, capa de póster hasta `playing`, tiempo máximo con botón de reproducir, reintentos. **Vídeo de caso y de `other`:** escalón M del ratio propio del vídeo, dos fuentes, audio conservado. **Miniaturas del ABM:** escalón 320.

**Bugs propios encontrados por los tests y corregidos.**

1. Un pin de vídeo con `autoplayMode: null` (no se anima nunca) hacía prefetch: ancho de banda tirado.
2. Tras pasar de un slide de vídeo a uno de imagen el `<video>` seguía montado hasta resolverse un microtask (billete obsoleto).
3. **React hace burbujear el `error` de un `<source>` hasta el `onError` del `<video>`:** el fallo de una sola fuente (que el navegador resuelve probando la otra) se trataba como fallo total y habría reintentado y descartado vídeos que sí funcionaban. Ahora el `onError` del vídeo solo cuenta si `event.target === event.currentTarget`. Test de regresión comprobado: falla sin el arreglo.
4. El efecto de reinicio por escalón de la ficha se ejecutaba también en el montaje y pisaba eventos tempranos; ahora solo reinicia cuando el escalón cambia.

**Cambio de comportamiento intencionado.** Un slide de vídeo de un carrusel que aún no suena (cargando o fallando) avanza por el temporizador de 5 s; antes bloqueaba el carrusel hasta `ended`. Un test lo fija.

**Verificación.** `eslint`, `tsc` y `prettier --end-of-line crlf` limpios; **112 ficheros y 1155 tests en verde** (partía de 107 y 1042). Tests nuevos: `mediaContract` (cadenas exactas y propiedades), `mediaDelivery` (tabla M/L y selección por pantalla), `videoPlayback`, `videoPlaybackCoordinator`, `pinVideoLifecycle` y ampliaciones de ficha, caso y preferencias de movimiento.

**Chromium real (Anexo B del contrato; clip sintético 480×600 generado con ffmpeg, «Cloudinary» local por HTTPS, 30 pines).**

- **Cumplido:** nunca más de **3** `<video>` montados (en todo el scroll); en la carga solo se piden los 3 primeros; **ningún vídeo visible antes de haber estado listo** (el código anterior sí lo mostraba: 18 muestras); con una red de 2 KB/s no se reproduce nada y los vídeos se abandonan; 1 petición por vídeo.
- **NO cumplido, y no resuelto: `droppedVideoFrames` ≤ 2 en los primeros 2 s.** Primeros vídeos tras cargar: **0-12 fotogramas perdidos según la ejecución** (7 ejecuciones del código nuevo), frente a **1-5** del código anterior en las mismas condiciones (5 ejecuciones). Es decir, **en este arnés el código nuevo no es mejor que el anterior en esa métrica y parece algo peor.** Descartado como causa (con medidas): la transición de `opacity`, el tercer decodificador (límite 2) y revelar tras N fotogramas presentados con `requestVideoFrameCallback` (probado y revertido: no mejoró). Tampoco son peticiones extra. Hay paradas de buffer (`readyState` 2) tras empezar que no he podido explicar.
- **Por qué hay que tomarlo con cautela:** Chromium _headless_ con decodificación por software en un sandbox compartido, clip sintético, y ejecuciones idénticas que varían entre 0 y 12. **Greener debe medirlo en hardware real** (DevTools → `getVideoPlaybackQuality()`). Si se confirma, la hipótesis a investigar es el flujo «precargar y llamar a `play()` después» (el navegador suspende la precarga y la reanuda) frente al `autoplay` directo.

**Prueba A/B de calidad: decidida el 7 oct (misma jornada).** Greener probó `q_auto` frente a `q_auto:eco` con piezas reales: vídeo 720×1280 744→424 KB (-43 %; medido por mí, SSIM 0,968 y PSNR 36 dB), imágenes -10 %, -11 % y -20 % sin diferencia visible (solo una levísima pérdida en degradados de sombras de piel). Decisión: **`auto:eco` en el feed** (imagen, póster y vídeo; las miniaturas del ABM lo heredan porque usan el escalón de 320 del feed) y **`auto` en las fichas** de tool y caso. El ABM no tiene preview de vídeo servida por Cloudinary, así que no hay nada más que cambiar ahí.

Cambios: `MEDIA_QUALITY` (`feedImage` y `feedVideo` a `auto:eco`, `detailVideo` sigue en `auto`); **el póster de vídeo tenía `q_auto` escrito a mano en la URL** y se habría quedado fuera, así que `buildVideoPosterUrl` recibe ahora un `context` (`'feed'`/`'detail'`, obligatorio para que un olvido no pase en silencio) y toma la calidad de `IMAGE_DELIVERY[context]`. Tests: cadenas exactas del feed a `q_auto:eco` y tres tests nuevos de «calidad por contexto» (todo el feed en eco, ninguna ficha en eco, miniaturas del ABM compartiendo versión con el escalón de 320). Comprobado por mutación: poner eco en las fichas rompe 5 tests.

**Aviso de fps.** Los dos clips de la prueba iban a **50 fps**, no a 30 (`ffprobe`), con lo que el contrato de «la fuente ya viene a 30 fps» (§4.6) no se cumplía en ellos. Se supone que eran medios antiguos, no la tanda nueva: **comprobar con `ffprobe` que la tanda nueva va a 30 fps antes de subirla**, porque `fps` no se puede acotar por URL.

**Pendiente.** Comprobar las cadenas contra Cloudinary real; tope de 40 MB de vídeos de caso (no tocado); fase 2 (eager al publicar); medir en hardware real lo anterior.

### 2.39 Keys duplicadas en el masonry y alta de pines de insight (7 oct)

Dos fallos encontrados por Greener en la misma jornada; ninguno se había visto antes de usar el ABM con insights ni de mirar la consola con un feed largo.

**A. «Encountered two children with the same key», cientos de veces.**

- **Causa.** La `key` de cada tarjeta era `item.pinId`, pero el feed es infinito y recicla pines (colas circulares, `getFeedSessionBatch` sirve rondas consecutivas y `appendBatch` las concatena sin filtrar), así que el `pinId` no es único en la lista. Medido con el motor real y un catálogo parecido al de la arquitectura (150 casos de 5 pines, 5 insights de 2 pines, 30 tools, 6 de channel, 4 de otros): **34 repetidos de 215 ya en la ronda 0** (insight 22, other 7, channel 5: tipos con pocos pines frente a su cuota, p. ej. 5 insights aportan 10 pines para 32 posiciones) y **939 claves duplicadas de 1.720 tras 8 rondas** (el catálogo se agota hacia la ronda 5). En la subhome de tools con 30 tools, la primera ronda de 40 ya trae 10 repetidas. Las repeticiones son el comportamiento previsto del motor; lo incorrecto era usar el `pinId` como identidad de una tarjeta.
- **No era solo un aviso.** El coordinador de vídeo (`videoPlaybackCoordinator`) indexa sus candidatos y billetes por id, y ese id era el `pinId`. Con el mismo pin montado dos veces, la segunda tarjeta le pisaba el registro a la primera (que quedaba sin hueco ni billete) y al desmontarse una se llevaba el registro de la que seguía en pantalla: un vídeo que no arranca sin motivo. React además avisa de que con claves duplicadas puede duplicar u omitir hijos al actualizar.
- **Arreglo.** `useMasonryPositions` y `useRecommendationMasonry` asignan a cada elemento posicionado una `key` de posición, `` `${índice}:${pinId}` ``: el índice global la hace única y estable (la lista solo crece por el final y un ítem nunca cambia de sitio; el `pinId` es solo para leerla en las DevTools). Se usa en los cinco sitios que pintan tarjetas (`Feed`, `MasonryFeed`, `CaseDetail`, `EpisodeDetail`, `ToolInsightDetail`) y se pasa a `PinCard` como `instanceId`, que es lo que registra en el coordinador de vídeo. Sin `instanceId` (un `PinCard` suelto) se usa el `pinId` como hasta ahora.
- **Tests** (`uniqueKeys.test.tsx`, `pinDuplicateInstances.test.tsx`): sin aviso de claves con pines repetidos dentro de un lote y entre lotes; un test de control con el `pinId` como key (el código anterior) que sí provoca el aviso; al añadir un lote las tarjetas ya pintadas conservan su nodo DOM; dos tarjetas del mismo pin consiguen cada una su vídeo y desmontar una no se lleva el de la otra. **Comprobado por mutación:** volviendo a usar el `pinId` en `PinCard` fallan 2 de 3. Aviso para futuros tests: el `IntersectionObserver` simulado debe avisar de forma **asíncrona**; uno síncrono (dentro del `useEffect`) ocultaba el bug porque cada tarjeta conseguía su billete antes de que la siguiente le pisara el registro, y el primer intento de test pasaba también sin el arreglo.
- **No tocado: el motor.** Que 5 insights se repitan unas 3 veces por ronda (el 15 % de cuota con tan poco catálogo) es una decisión de producto que Greener ha dejado para cuando haya contenido en masa.

**B. «El rótulo del pin es obligatorio para este tipo de contenido» al subir pines a un insight.**

- **Causa.** Cuando el texto del pie del pin de insight se automatizó (título del insight + «Insights by Greener», sin la frase gancho) se adaptaron el feed (`supabaseFeedSource`) y los tres formularios del ABM (alta, lista y carga masiva envían el rótulo vacío), pero las funciones SQL `create_pin` y `update_pin` (migración del 10 sep) siguieron exigiendo rótulo para todo tipo salvo `case` y `episode`. **Toda alta o edición de un pin de insight fallaba** (la edición también: `PinList` manda el rótulo oculto vacío). La hipótesis inicial apuntaba a los `try/catch` del backend; esos solo agravaban el síntoma.
- **Segundo problema, el de los `try/catch`.** `createPinWithImageAction` y `createPinWithVideoAction` convertían cualquier excepción en «No se ha podido crear el pin.», de modo que un rechazo de validación que dice exactamente qué falta era indistinguible de una caída. El log del servidor sí tenía el motivo; la persona del ABM no. Además la subida a Cloudinary ya estaba hecha y se descartaba, bien: no quedan huérfanos.
- **Arreglo.** (1) Migración `20261007100000_pin_label_optional_for_insight.sql`: redefine `create_pin` y `update_pin` (misma firma y permisos) añadiendo `insight` a la lista. (2) `DERIVED_PIN_LABEL_TYPES` y `hasDerivedPinLabel` (`modules/pin/domain/derivedPinLabel.ts`): una sola lista en TypeScript en lugar de la condición copiada a mano en los tres formularios. (3) `pinCreationErrorMessage` (`modules/pin/application`): los rechazos de validación de la base de datos (errcode `22023`, mensajes ya escritos para el equipo) se muestran tal cual y cualquier otro error (permisos, conexión, inesperado) sigue siendo el genérico, para no enseñar texto interno de Postgres.
- **Test que habría cazado el bug** (`derivedPinLabel.test.ts`): lee la ÚLTIMA migración que define cada función y comprueba que los tipos exonerados de rótulo coinciden exactamente con `DERIVED_PIN_LABEL_TYPES`. Comprobado por mutación: sin la migración nueva falla en 3 sitios. Más los tests de `pinCreationErrorMessage`.
- **Hay que aplicar la migración** (`npx supabase db push`) antes de poder subir pines de insight: el arreglo de TypeScript solo no basta. Las migraciones no se pueden probar en este entorno (sin Postgres), solo se comprueba su texto.

**Verificación.** `eslint`, `tsc` y `prettier --end-of-line crlf` limpios; ver cifras de tests en el registro de `PROGRESO.md`.

---

## Historial de correcciones de `PROGRESO.md` (hasta el 2 de octubre)

Registro fechado de las correcciones y cambios que se fueron anotando en `PROGRESO.md` mientras se escribían las secciones anteriores. Se archivó aquí el 5 de octubre; a partir de esa fecha, los cambios nuevos se anotan en el «Registro de cambios» de `PROGRESO.md`.

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
- **29 sep 2026 (después de la integración, continuación)**: bloqueadas en producción `/api/feed/demo` y `/preview/masonry` (404/notFound según `NODE_ENV`). Sustituido el menú lateral hecho a mano de `/tools|insights/[slug]/app` por una réplica fiel del Shell real (mismos iconos, mismo orden, inglés). Añadidas HSTS y Referrer-Policy a esas dos rutas, que se saltaban enteras el proxy central sin motivo para perder esas dos cabeceras en concreto. 748 tests.
- **29 sep 2026 (continuación, Tool Used)**: cableado el evento "Tool Used" servidor a servidor, disparado desde `tools/[slug]/app/route.ts` al servir la tool (no desde la tool misma: su CSP lo impide). Reenvía User-Agent e IP reales del visitante — sin ellos, la API de Plausible responde 202 pero descarta el evento en silencio. Sin resolver: falta "Insight Used" y el toolId no es cruzable con "Tool Open" (slug vs UUID). 757 tests.
- **29 sep 2026 (continuación, límite de peticiones)**: cerrado el límite de POST /api/feed/sessions (12/min) y GET /api/feed/{sessionId} (50/min) por visitante (cookie anónima, en memoria de proceso), con degradación silenciosa en los dos casos (repite la última sesión / hasMore:false). Corregido un fallo real propio en el limitador genérico (la ventana se prolongaba en vez de ser fija) detectado solo tras escribir un segundo test más preciso que el primero. 787 tests.
- **29 sep 2026 (integración de una segunda rama de trabajo)**: integrado un zip con cambios paralelos — rediseño completo del ABM (dashboard, listado y editor de contenidos, ~1.700 líneas de CSS), evento "Feed Depth" cableado en useFeed.ts (campo `round` nuevo en FeedBatchResult), y un SEGUNDO mecanismo para "Tool Used" (`greener-package-analytics.js` + `POST /api/analytics/package`) que resuelve el UUID real de content, cruzable con "Tool Open" — a diferencia del mecanismo servidor de ayer. Los dos conviven bajo el mismo nombre de evento; decisión pendiente del usuario sobre cuál mantener. Descartada de nuevo la regresión del fixture pixel-palette (ruta del Worker). 794 tests.
- **29 sep 2026 (decisión «Tool Used»)**: elegido un único mecanismo para «Tool Used» — el que dispara la propia tool y cruza con «Tool Open» por UUID (`greener-package-analytics.js` + `POST /api/analytics/package`). Retirado el mecanismo servidor del día anterior (`serverAnalytics.ts`, sus tests, y la llamada en `tools/[slug]/app/route.ts`). 785 tests.
- **30 sep 2026 (scroll de la home roto)**: encontrado y corregido un bug real — el límite de peticiones del feed (29 sep, §2.16) reutilizaba la misma forma de respuesta que "esta sección no tiene contenido", y appendBatch cortaba hasMore para siempre en ambos casos sin distinguirlos. Solo se notaba en home (mezcla tipos, necesita más rondas para llenar la pantalla) y no en tools/insights (un único tipo denso). Corregido con una marca explícita rateLimited que appendBatch ahora respeta sin tocar el estado. 794 tests.
- **2 oct 2026 (auditoría de lanzamiento)**: revisado el zip entero contra el código real. Encontrado y corregido un fallo que impedía desplegar: `next build` no compilaba porque `FeedBatchResult` no tenía el campo `round` que lee el evento «Feed Depth» (integración de la segunda rama del 29 sep, §2.17); añadido el campo, el valor en `getFeedSessionBatch` y un test. Reformateados 9 ficheros que incumplían `format:check`. Informe de carpetas vacías, código, dependencias y documentos sobrantes o ausentes en §2.20 (propuesto, sin borrar). Checklist de §4 reescrito por urgencia. 795 tests.
- **2 oct 2026 (flujo de insights)**: el pin de un insight en el feed abre directamente `/insights/[slug]/app` en vez de su detalle (`feedPinDestination`, §2.21); el detalle se mantiene intacto. Tools sin cambios. Anotado que «Insight Open» ya no cuenta esos clics. 798 tests.
- **2 oct 2026 (pie del pin de insight)**: el pin de un insight muestra ahora título + «Insights by Greener» en negrita (texto fijo), igual que un caso muestra título + cliente (`derivedFeedText`, §2.22). El ABM deja de pedir frase gancho en insights. 802 tests.
- **2 oct 2026 (descripción de tools sin elipsis)**: quitado el `line-clamp: 3` de `.summary` en el detalle de tool/insight, que cortaba la descripción con «…» (§2.23). Anotado el riesgo de solape con las recomendaciones si un `summary` fuese largo. 802 tests.
- **2 oct 2026 (integración, CTA e investigación)**: integrado el zip compartido (tools con portada desde el pin, CTA del pin arriba a la derecha, sin tramo de 5 columnas, `height: 100dvh` en el documento de tools) recuperando lo que ese zip había pisado de nuestra versión (`round`, destino `/app` de insights, summary sin truncar) y actualizando 2 tests (§2.24). CTA de la ficha anclado abajo a la derecha, verificado en Chromium (§2.25). Investigado, sin implementar, el ancho de una columna para el texto de tools (§2.26). 802 tests.
- **2 oct 2026 (columnas e insights desde el detalle)**: restaurado el escalonado de columnas 2/3/4/5/6 (`layout.ts` original; el zip recibido lo había perdido) y revertido el test que se cambió; recalculados los números de §2.26 con ese escalonado; test de regresión de insights abiertos desde las recomendaciones (§2.27). 803 tests.
- **2 oct 2026 (6 columnas desde 1200 y compilación)**: columnas a 2/3/4/6 con 6 desde 1200 de ancho de contenedor (§2.28); recalculados los números de §2.26; corregido un test de propiedades intermitente (~1 de cada 50 ejecuciones) y verificado todo en una copia limpia con Node 24.15.0. 803 tests.
- **2 oct 2026 (reconciliación de supabaseFeedSource)**: fusionada la rama de tools de Greener (descripción del pin + nombre de la tool en negrita) con la de insights (título + «Insights by Greener»), que se había pisado; tests ampliados y comprobados con mutación (§2.29). 806 tests.
- **2 oct 2026 (tipografías)**: Helvetica Neue Regular/Bold como fuente general y Kinder en el título de caso y de contacto (clase global `.text-display`), con `next/font/local` y WOFF2 recortados (de ~1,2 MB a ~56 KB en Helvetica); aviso de licencias y de los pesos del admin (§2.30).
- **2 oct 2026 (texto a una columna)**: el texto de la ficha de tool/insight/contenido libre mide una columna de la retícula (`max-width` por variable CSS) y la imagen cede sitio (`textReserve`); geometría extraída a `computeContentBlockGeometry`; verificado en Chromium (56/56) y con tests de propiedades; hallazgo del texto a 0 px en móvil (§2.31).
- **2 oct 2026 (pin de episodio)**: la segunda línea del pin de un episodio pasa a «<programa> <tipo>» (p. ej. «Brand the Future Podcast»), con etiquetas compartidas entre feed, ABM y ficha pública; las dos consultas de Supabase piden `program`; límite de una línea medido en móvil (§2.32). 834 tests.
- **2 oct 2026 (npm audit fix)**: integrado el `package-lock.json` de Greener: Next.js 16.3.5 → 16.3.8 (solo `next` y sus binarios), `npm audit` a 0 vulnerabilidades; verificado en copia limpia con Node 24 (build, 834 tests, servidor standalone, CSP, 404 idéntico a la versión anterior) (§2.33).
- **2 oct 2026 (texto corrido de contacto)**: clase global `.text-body` (mismos valores que el texto de las tarjetas de la home) para el párrafo del rediseño de contacto, con test de coherencia con `PinCard` (§2.34). 835 tests.
- **2 oct 2026 (prioridades y formulario de contacto)**: añadidas al checklist (§4.0) dos tareas prioritarias: vídeos cortos de demostración en `/tools/{slug}` y prueba del formulario de contacto con el sitio activo. Revisión previa del formulario con un banco de pruebas (servidor de producción + SMTP y Supabase falsos + Chromium): 25 comprobaciones correctas, 3 problemas reales (el formulario se vacía tras un error, el límite por IP se esquiva falsificando `X-Forwarded-For`, y es global si el proxy no envía la IP) y 8 observaciones (§2.35). Sin cambios de código.

### 2.40 Portada (miniatura) eliminada de tool e insight (7 oct)

**Motivo.** Tool genera su miniatura dinámicamente con `?pin=<pinId>` (reutiliza el medio del pin) e insight se salta la ficha y va directo a `/app`, así que la portada subida a mano ya no pintaba nada para ellos.

**Qué se quita.** El bloque «Portada» del ABM deja de aparecer en tool e insight (`supportsCoverMedia = content.type === 'other'`). Migración `20261007110000_remove_tool_insight_cover.sql`: (1) pone `cover_media_id` y `cover_ratio` a NULL en tool/insight y borra el `media_asset` si ningún pin, carrusel de caso, otra portada ni imagen de OG lo usa; (2) `register_cover_image` pasa a aceptar solo `other` (`register_cover_video` ya era solo `other`); (3) CHECK `content_cover_only_for_other` en `content`, de modo que ninguna ruta futura pueda reintroducirla.

**Qué NO se quita, y por qué.** El tipo `other` (variety) usa la portada (imagen o vídeo) como contenido principal de su ficha, así que la columna `cover_media_id`, `cover_ratio`, las RPC y `ToolInsightDetail` (que también sirve a `other` y a tool con `?pin=`) se conservan. Quitar la columna entera exigiría decidir antes cómo se sustituye en `other`.

**Efectos a vigilar.** (a) Los recursos de Cloudinary de las portadas antiguas quedan huérfanos: `scripts/reconcile-cloudinary.mjs` los detecta y se pueden borrar para recuperar almacenamiento. (b) **Imagen de OG resuelta**: tool e insight la sacan del primer medio de su primer pin (`getFirstPinMedia`, orden `queue_order` y luego `created_at`; si es vídeo, su póster jpg a 1200 de ancho). En tool, un `?pin=` en la URL manda sobre el primer pin, de modo que compartir un pin concreto muestra ese pin. `other` mantiene su portada, que tiene prioridad. Una lectura fallida nunca tumba la página. Tests: `tests/unit/media/coverOnlyForOther.test.ts` y `tests/unit/seo/contentMetadata.test.ts`.

### 2.41 Pin = un medio, máximo 8 pines por contenido, sin carrusel de pines (7 oct)

**Decisión.** El modelo original era «un pin es un medio y cada contenido tiene como máximo 8 pines». La rediseñada §3/§6 del 10 sep había dado a cada pin hasta 8 medios y un flag `show_as_carousel` (activo por defecto) que los agrupaba en una tarjeta con carrusel. Nadie lo pidió, y para este catálogo agrupar piezas pierde el sentido (la web busca mostrar mucho contenido distinto). Se quita; si algún día se necesita, se diseñará a nivel de contenido, no de pin. Sin pines con varios medios en los datos reales, la migración no cambia ninguno.

**Migración `20261007120000_pins_single_media_no_carousel.sql`.** (1) Comprobación previa que **avisa y aborta** (no trunca ni borra) si algún pin tiene más de un medio o algún contenido más de 8 pines. (2) Elimina `pin.show_as_carousel` y `pin.speed_ms` (velocidad del carrusel); `autoplay_mode` se conserva porque el feed lo usa para decidir cuándo reproduce el vídeo de un pin suelto. (3) Índice único `pin_media(pin_id)` y trigger con mensaje legible («Un pin admite un solo medio»); `attach_pin_image/video` no cambian de firma. (4) Trigger `pin_max_per_content`: máximo 8 pines por contenido en todos los tipos (errcode 22023, así el ABM muestra el mensaje). (5) `create_pin`/`update_pin` sin `p_show_as_carousel` ni `p_speed_ms`, conservando el rótulo opcional de insight de la `20261007100000`.

**Código.** Dominio y repositorios sin `showAsCarousel`/`speedMs`/`slideOrder` (la BBDD rellena `slide_order` con 0). Feed: una unidad por pin con `unitId = pinId`; desaparece `pinId::mediaId` y el motor no se toca. `PinCard` pierde el carrusel (temporizador de 5 s, slides, loop en hover); el vídeo reproduce según `autoplayMode`. La ficha de tool deja de leer `?slide=` y solo usa `?pin=`. Analítica: `pinType` ya no tiene `carousel`. ABM: sin checkbox de carrusel ni velocidad; contador «N / 8 pines»; alta y carga masiva bloqueadas al llegar a 8 (la carga masiva descarta los archivos que sobran y avisa); `PinMediaManager` ofrece un único medio (para cambiarlo se quita y se sube otro). Constante compartida en `modules/pin/domain/pinLimits.ts`. Seed y generador de demo sin el flag.

**Pendiente de ti.** Aplicar la migración (`npx supabase db push`). Si avisa de pines con varios medios o contenidos con más de 8, hay que corregirlos a mano antes. Una sesión de feed ya abierta con ids antiguos `pinId::mediaId` (no debería haber ninguna: todos los pines eran de carrusel) simplemente no encontraría su entrada.

Tests: `tests/unit/pin/singleMediaPins.test.ts`, bloque de límite en `bulkPinUpload.test.tsx`, y reescritos los de carrusel (`components.smoke`, `pinClick`, `feedVideoDuration`, esquemas y capa de aplicación).

### 2.42 Retoques del ABM: crear pines con medio, quitar filas del lote, summary de episodio (7 oct)

**Crear pines.** El formulario «Crear un pin» creaba un pin vacío (sin medio) y obligaba a subir el medio después desde «Editar». Se elimina `NewPinForm` y la creación pasa a un único bloque «Crear pines» (el antiguo de carga masiva, que ya sube medio + pin juntos y sirve para 1 o N archivos). El orden en cola inicial del lote ya no arranca en 0 sino a continuación de los pines que tiene el contenido. `createPinAction` (pin sin medio) queda sin uso en la interfaz.

**Quitar filas del lote.** Cada fila pendiente o con error tiene un botón «Quitar» (antes solo se podía recargar todo). El archivo sale también de la lista interna: si no, cambiar un valor por defecto regeneraba las filas y lo resucitaba. Las filas ya subidas no se pueden quitar (su pin ya existe).

**Columna «Orden» (`queue_order`): se conserva.** No es del carrusel. Es el orden del pin dentro de la cola circular de su contenido, que el motor del feed usa para decidir qué pin de ese contenido sale después (`supabaseFeedSource`, orden por `queue_order`) y que `getFirstPinMedia` usa para elegir el primero. Quitarla cambiaría el comportamiento del motor.

**Summary en episodios.** El campo no se muestra para episodios (`showSummary`). Highlight y Body siguen en su formulario y se pintan en la ficha pública del episodio (`EpisodeDetail`). El summary solo servía de respaldo de la meta descripción cuando no hay `seoDescription`. La columna en base de datos no se toca. Case sigue mostrándolo: queda decidir si también sobra.

Tests: `bulkPinUpload.test.tsx` (quitar filas, orden inicial) y `translationFormSummary.test.tsx`.

### 2.43 Orden en cola automático y summary fuera de case y episodio (7 oct)

**Orden en cola.** `queue_order` (orden del pin dentro de la cola circular de su contenido, que lee el motor) ya no se pide en ningún formulario del ABM (alta, edición, carga masiva ni columna del CSV) ni se muestra en la lista. Migración `20261007130000_pin_queue_order_auto.sql`: `create_pin` asigna el siguiente libre del contenido (`max + 1`, con bloqueo por contenido para que dos altas simultáneas no empaten), `update_pin` ya no lo toca (cambian las firmas, sin `p_queue_order`) y los pines existentes se renumeran por contenido (0, 1, 2…) respetando su orden actual y desempatando por antigüedad. En un lote, el orden sale de la posición de las filas. El motor no cambia: sigue leyendo `pin.queue_order`. Contrapartida asumida: ya no se puede reordenar un pin a mano; para cambiar el orden hay que borrar y volver a subir.

**Summary.** El campo desaparece también de case (antes solo de episodio): ninguno lo usaba más que como respaldo de la meta descripción. Para case y episodio la descripción SEO es solo `seoDescription` (`workContent.ts`); tool, insight y other mantienen su summary. Al guardar la traducción de un case o episodio el summary guardado se vacía, porque el campo ya no viaja en el formulario. La columna no se toca.

Tests: bloque de la migración y del ABM en `singleMediaPins.test.ts`, `bulkPinUpload.test.tsx`, `translationFormSummary.test.tsx`, `pinCsv.test.ts`.

### 2.44 Corrección de los vídeos de tools (7 oct)

La conversión del 6 oct deformó 23 de los 63 vídeos de tools: sus WebM originales cambian de resolución a mitad de fichero (la grabación se hizo mientras se redimensionaba la ventana) y la conversión fijó el tamaño con el primer fotograma. Se rehicieron cortando por tramos de tamaño constante y quedándose solo con los que encajan con una de las 6 proporciones (aviso nuevo en el Anexo A de `contrato-medios-fase-1.md`: medir fotograma a fotograma antes de convertir).

Se eliminaron además todos los vídeos de 2 s o menos, que Greener no puede usar: `flowbars` 4:3, `halo` 4:5, `lyrics` 3:4, `slabs` 16:9 y `slabs` 3:4. Resultado: 68 vídeos, 45 MB. **Proporciones de tools sin vídeo**: `lyrics` 16:9 y 3:4, `flowbars` 4:3, `halo` 4:5, `slabs` 16:9 y 3:4. Con un único vídeo corto (menos de 3 s): `flap` 4:5, `glitch` 4:3 y `slabs` 4:5. Sin cambios de código.

### 2.45 Formulario de episodio reducido a lo que se usa (7 oct)

Auditoría de los 11 campos de «Datos del episodio»: solo programa, tipo, proveedor e ID del embed los lee algo (ficha, texto del pin en el feed, analítica «Episode Play», embed y enlace «Watch more»). Número, invitado, cargo, empresa, fecha, duración e idioma no los lee ninguna página; `publicEpisodeSource` los dejaba sin leer pensando en un listado de Channel que no existe (`/channel` es un feed de pines).

Se ocultan del ABM, sin tocar la BBDD ni el RPC `upsert_episode`: `saveEpisodeAction` carga el episodio guardado y reenvía esos siete valores tal cual, porque el upsert reemplaza la fila entera y, si no, los pisaría con `null`. En un episodio nuevo los opcionales van a `null` y el idioma (NOT NULL en BBDD) toma el `default_locale` del contenido. Si el contenido ya no existe, la acción avisa. Pendiente: decidir qué hacer con `episode.language` cuando se plantee el multiidioma de la web.

Tests: `tests/unit/admin/episodeActions.test.ts`.

### 2.46 Ratio leído del nombre del archivo en la carga masiva (7 oct)

La carga masiva de pines lee ahora la proporción del nombre del archivo, siguiendo la convención `[nombre]-[proporción]-[tipo de medio].ext` (`ratioFromFilename.ts`). Formas válidas: `1x1`, `4x3`, `4x5`, `3x4`, `2x3`, `9x16`, `16x9` (mayúsculas o `×` también) y la compacta `11`, `43`, `45`, `34`, `23`, `916`, `169`. La compacta solo se acepta en el penúltimo bloque del nombre (la posición de la convención), para que un número del nombre (`caso-11-...`) no se lea como proporción fuera de ahí; la forma con `x` vale en cualquier posición.

Prioridad: CSV, nombre del archivo, ratio por defecto. Si el nombre no trae una proporción legible, o no es una de las 7 cerradas (`5x7`, `21x9`), no se aplica nada y queda el ratio por defecto. La fila indica «detectado del nombre» y el admin puede corregirlo a mano antes de subir. Aplica a imágenes y vídeos, y el aviso de recorte de los vídeos compara con el ratio resultante.

Ampliación del mismo día:

1. **Aviso de proporción** (`ratioMismatchMessage`): tras subir, si el ratio del pin no encaja con las dimensiones reales (tolerancia del 5 %), la fila queda en «Hecho. Aviso: …». Si el ratio vino del nombre, el aviso lo dice («El nombre del archivo indica 4:5, pero mide 1080×1080…»). Ahora también para imágenes, con cualquier origen del ratio (antes solo vídeos). No bloquea: el pin ya está creado.
2. **Portada de `other`** (`CoverMediaUpload`): lee el nombre igual que la carga masiva y, si trae proporción, la pone en el selector (si no, sigue sugiriendo la de las dimensiones). Como ahí las dimensiones se leen antes de subir, el aviso de desajuste sale antes de subir nada. La carga masiva ya servía para `other`.
3. **Convención documentada**: no estaba escrita en ningún sitio; añadida en `contrato-medios-fase-1.md` §10.4. De paso, ese contrato aún citaba `queueOrder` en el CSV y el orden en cola como dato de entrada, que ya no existen desde §2.43: corregido.

Contadores al final del nombre (7 oct, tarde): `elonmuskeizer-43-image-2.webp` no se leía porque el `-2` desplazaba el tipo de medio a la posición de la proporción. Ahora se descartan los bloques numéricos del final (`-2`, `_3`, ` (2)`) antes de buscar; cualquier otro sufijo (`-final`, `-v2`) sigue sin admitirse a propósito, porque obligaría a adivinar y a leer números del nombre como proporciones.

Arreglo de paso: al cambiar el ratio o el idioma por defecto, las filas se regeneraban con el valor anterior (el estado aún no se había actualizado); ahora usan el recién elegido. Sin migraciones.

Tests: `tests/unit/media/ratioFromFilename.test.ts` y bloque nuevo en `bulkPinUpload.test.tsx`.

### 2.47 Comprobación del rótulo automático en case (7 oct)

Revisión de que el fallo de insight (§2.40: `create_pin`/`update_pin` exigían rótulo para un tipo que el ABM ya enviaba vacío) no se repite en case. Resultado: **no se repite**. En la última versión de ambas funciones (migración `20261007130000`) la lista de tipos sin rótulo obligatorio es `case`, `episode`, `insight`; `pin.label` admite null desde el rediseño del 10 sep; `pinSchema` acepta rótulo vacío o ausente; el feed ignora `pin.label` en case y deriva el texto de título + cliente; la edición de pines envía el rótulo vacío en los tres tipos. `derivedPinLabel.test.ts` ya impedía que TypeScript y SQL se separen.

Único hueco encontrado: ningún test comprobaba que la carga masiva envía `label: null` en cada tipo derivado. Añadido para case, episode e insight (imagen y vídeo), más la comprobación contraria para tool y other. Sin cambios de código ni migraciones.

### 2.48 Botón «Borrar todos los pines» (7 oct)

La lista de pines de cualquier contenido (tool, case, episode, insight y other comparten `PinList`) tiene ahora el botón «Borrar todos los pines (N)», visible solo si hay pines, con confirmación que avisa de que se borran también los archivos y de que el contenido dejará de aparecer en el feed hasta que haya pines nuevos.

`deleteAllPinsAction` (en `pinActions.ts`) lista los pines del contenido y llama a `delete_pin` pin a pin (máximo 8), leyendo los medios de cada uno antes de borrarlo; al terminar purga Cloudinary una sola vez con todos los archivos. Sin migración: reutiliza `delete_pin`, que ya borra en Postgres los `media_asset` huérfanos. No es atómico entre pines: si uno falla, se detiene, dice cuántos se borraron (por ejemplo «1 de 3») y purga igualmente los archivos de los ya borrados; si Cloudinary no puede borrar alguno, los pines se dan por borrados y se avisa (los recoge `scripts/reconcile-cloudinary.mjs`). Un contenido sin pines devuelve un aviso y no hace nada. El carrusel de un case (`case_detail_media`) no son pines y queda fuera de ese botón, pero tiene el suyo: «Quitar todas las diapositivas (N)» (`removeAllCaseCarouselMediaAction`, en `caseCarouselActions.ts`). Lee la lista en servidor, desvincula cada medio con `remove_case_carousel_media` (como al quitarlos de uno en uno) y después borra de Cloudinary solo los archivos de los medios ya desvinculados. Mismo comportamiento ante fallos que el de pines: se detiene, informa de cuántas se quitaron («1 de 3») y borra los archivos de las ya quitadas; si Cloudinary falla en alguno, avisa con el recuento. Sin migración.

Tests: `tests/unit/admin/deleteAllPins.test.tsx`, y bloques nuevos en `caseCarouselActions.test.ts` y `caseCarouselManager.test.tsx`.

### 2.49 Borrar versiones anteriores de los paquetes de tools e insights (7 oct)

Hasta hoy una versión de paquete (zip) solo se podía publicar o recuperar («Volver a esta versión»), nunca eliminar, así que las versiones y sus ficheros del bucket `html-packages` se acumulaban sin límite.

- **Migración `20261007140000_delete_html_package_version.sql`**: función `delete_html_package_version(p_content_id, p_version_id)`. Exige admin, que la versión sea de ese paquete y que **no sea la activa** (ni `published` ni `current_version_id`: error P0001 con mensaje para el admin). Borra la fila, deja rastro en `audit_log` (`delete_package_version`) y devuelve la ruta de Storage.
- **Repositorio** (`supabaseHtmlPackageRepository.deleteVersion`): primero la RPC y, solo si va bien, los ficheros de Storage bajo esa ruta, con listado **recursivo y paginado** (Storage no lista subcarpetas por sí solo). Best-effort: si Storage falla, la versión ya no existe y se avisa de cuántos ficheros quedaron huérfanos.
- **ABM** (`PackageUpload`): botón «Borrar versión» en cada borrador y versión anterior (nunca en la activa), y «Borrar versiones anteriores (N)» que borra solo las `rolled_back` (los borradores son trabajo pendiente, no versiones anteriores). Ambos piden confirmación; el masivo va una a una y, si falla alguna, se detiene e informa («1 de 3»).
- **Numeración**: la siguiente subida calcula `max(version) + 1`, así que borrar la versión más alta libera su número. Si en ese caso Storage dejó ficheros huérfanos, la subida con ese número puede fallar (`upsert: false`); el aviso lo indica.

Tests: `tests/unit/packages/deletePackageVersion.test.ts`, `deleteOldVersions.test.ts` y `tests/unit/admin/packageVersionDelete.test.tsx`. Sin probar contra Postgres ni Storage reales.

### 2.50 Fallo: «Quitar» una fila de la carga masiva devolvía a pendiente las ya subidas (7 oct)

**Síntoma** (subiendo medios de una tool): un archivo falla en Cloudinary, se pulsa «Quitar» en esa fila y todas las filas ya subidas vuelven a aparecer como «Pendiente», mientras los mismos pines ya figuran en la lista de pines (que es correcto: sí se habían creado).

**Causa**: `removeRow` (añadido en §2.43) y `regenerateRows` reconstruían todas las filas desde la lista de archivos con `buildRow`, que siempre crea la fila en estado `pending`. El pin de las filas ya subidas existía, pero la interfaz lo olvidaba; con esa lista, el siguiente «Subir» habría **duplicado esos pines**. El mismo fallo se producía al cambiar el ratio o el idioma por defecto, o al cargar un CSV, después de una subida parcial.

**Arreglo** (`BulkPinUpload.tsx`): «Quitar» ya no reconstruye nada, solo elimina esa fila, así que las demás conservan su estado y lo que se hubiera editado en ellas. `regenerateRows` (defaults, CSV) conserva sin tocar las filas `ok` y `uploading`, reconociéndolas por el archivo y no por la clave (que lleva el índice y cambia al quitar filas). Las filas pendientes o con error sí se regeneran con los valores nuevos, como antes.

Tests (`bulkPinUpload.test.tsx`): quitar el fallido no resucita las subidas; volver a subir no duplica pines; quitar conserva las ediciones de las demás; cambiar el ratio por defecto tras subida parcial no resucita filas. Los cuatro fallaban antes del arreglo. Sin migraciones.
