# Greener — Estado del proyecto y próximos pasos

Este documento resume el estado actual del repositorio `greener-web`, cómo verificarlo, y qué queda pendiente. Complementa (no sustituye) el documento de **Arquitectura técnica V1.3**, que sigue siendo la fuente de verdad de las decisiones de diseño.

**El relato detallado día a día de trabajo ya confirmado se archiva por separado, para que este documento se quede centrado en el estado actual y lo pendiente:**

- `historial-fases-0-2.md` — Fases 0-2: motor de feed, tools/insights sin iframe, esquema de Supabase, login del ABM, CRUD de content/media, estados editoriales, subida de paquetes HTML, escaneo antivirus, subida de pines. Archivado el 9 de septiembre de 2026.
- `historial-fases-3-4.md` — Fases 3-4: rediseño del formato de detalle (sustituye el editor de bloques A/B/C), construcción de las páginas públicas reales (home, `/work`, tipo A, Shell), panel de recomendaciones completo, verificación server-side de imágenes. Archivado el 23 de septiembre de 2026.

Este documento (`PROGRESO.md`) sigue siendo el único sitio a mirar para saber "¿qué queda por hacer?" — los archivos de historial son solo para el porqué de decisiones ya tomadas o el detalle de bugs ya cerrados. **Las referencias `§2.N`/`§3.N` que aparecen en el checklist (§4) y en el historial (§6)** apuntan a la numeración interna de esos archivos, no a las secciones 2/3 de aquí (que ahora son otra cosa, ver más abajo).

Sustituye a las versiones anteriores de `PROGRESO.md` y `CHECKLIST.md`. Actualízalo cuando cierres un bloque de trabajo real, no en cada commit menor; si algo que documenta deja de ser cierto, corrígelo aquí mismo en vez de dejarlo desactualizado.

**Nota de numeración (23 de septiembre):** este documento se reorganizó al archivar las antiguas §2 (rediseño de detalle) y §3 (construcción del sitio público) en `historial-fases-3-4.md` — la sesión de trabajo del 22-23 de septiembre ocupa ahora la §2, y todo lo que seguía se ha renumerado en consecuencia (antigua §4 → §3, §5 → §4, §6 → §5, §7 → §6).

Todas las referencias `§X` sin más contexto apuntan a secciones del documento de arquitectura. Última revisión: 23 de septiembre de 2026, verificada ejecutando el código real (no solo por lectura) — cierre de esta sesión de trabajo.

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

- **611 tests automáticos, todos en verde** (`npm test`, 65 ficheros).
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

---

## 3. Cómo verificar todo esto tú mismo

```bash
npm install
npm run lint               # ESLint
npm run format:check       # Prettier
npx next build              # build de producción — genera también los tipos de ruta (.next/types). Necesita variables de entorno reales o de prueba (ver src/lib/env.ts); sin ellas falla en "Collecting page data", no antes.
npx tsc --noEmit             # TypeScript — hazlo DESPUÉS de next build/dev, si no da falsos positivos de LayoutProps
npm test                     # 611 tests (unit + property-based + smoke con jsdom)
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
- [~] Inventario de URLs actuales para las redirecciones 301 — catálogo de tools (9) e insights (4) confirmado; falta el resto del sitio actual.
- [ ] Ajustar el algoritmo de layout masonry con el diseño real cuando esté disponible.

### 4.3 Fase 2 (hasta el 1 de septiembre) — ABM base

Completa, incluido `preview` (cerrado el 23 sep, §2.6) — ver historial Fases 0-2 y §2.6. Sin nada pendiente.

### 4.4 Fase 3 — home y `/work` (hasta el 15 de septiembre)

Completa — ver historial Fases 3-4. Único punto abierto:

- [ ] Primeras métricas reales de LCP/CLS — todavía no medido contra contenido real, solo contra el dataset de demo.

### 4.5 Fase 4 — tipo A y resto del sitio (hasta el 22 de septiembre)

Verificación server-side de imagen y vídeo en Cloudinary, cabeceras de seguridad globales, panel de recomendaciones, Tipo A y Channel — completos, ver historial Fases 3-4 y §2.4. Queda abierto:

- [~] Contacto — formulario real cerrado. Mailchimp (doble opt-in de newsletter) sigue fuera a propósito, es un flujo aparte.
- [~] Páginas legales — solo placeholder de `/privacy`. Sigue sin decidir cómo se gestionará el contenido real ni el resto (aviso legal, condiciones).
- [~] Analítica Plausible — **integración real cerrada el 23 sep (§2.7)**, pero solo dispara "Pin Click": faltan "Case Open", "Tool Open"/"Tool Used", "Insight Open", "Episode Play", "Newsletter Signup" y "Feed Depth" (§18.2).

### 4.6 Fase 5 (26-30 de septiembre) — QA y cierre

- [ ] Tests E2E de los criterios de aceptación críticos de §20.1.
- [~] Auditoría de cookies y consentimiento — **avanzada el 22-23 sep, §2.5**: hallazgo de Vimeo corregido (`dnt=1`), click-to-load construido para Vimeo/Spotify. Sigue abierta la decisión de fondo (banner/CMP, nivel de rigor) — explícitamente aplazada por el usuario, ver §5.
- [ ] Verificación de las redirecciones 301.
- [ ] Accesibilidad: teclado, foco, contraste, `prefers-reduced-motion`, menú solo-iconos con labels. `alt` de `case_detail_media` ya cerrado; pendiente el resto.
- [ ] Carga real de contenido por Greener contra el ABM ya terminado.

### 4.7 1 de octubre — Publicación y monitorización reforzada

---

## 5. Decisiones pendientes con Greener (Anexo A.2)

Ninguna depende de escribir código — bloquean trabajo posterior si no se cierran a tiempo.

| Decisión                                                                                                     | Bloquea                                                              | Estado                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auditoría de embeds y cookies de terceros — nivel de rigor (banner/CMP vs. mitigaciones técnicas sin banner) | Si hace falta consentimiento explícito antes de cargar Vimeo/Spotify | **Abierto, explícitamente aplazado por el usuario el 23 sep** ("de momento no es algo que te pueda decir ni resolver"). Mitigaciones técnicas ya construidas mientras tanto: `dnt=1` en Vimeo, click-to-load en Vimeo/Spotify (§2.5) |
| Traducción asistida por IA en el ABM (opcional)                                                              | Si se incluye en V1 o se deja fuera                                  | Abierto, no bloqueante                                                                                                                                                                                                               |

Decisiones ya cerradas: ver historial Fases 0-2, Fases 3-4, y §2/§6 de este documento para las de esta sesión.

---

## 6. Historial de correcciones a este documento

Archivado junto con el resto del detalle de las Fases 0-2 (`historial-fases-0-2.md`) y, desde el 23 de septiembre, también las Fases 3-4 (`historial-fases-3-4.md` — incluye su propio historial de correcciones, con todas las entradas del 9 al 22 de septiembre). Lo que sigue aquí es lo de esta sesión; en cuanto quede "viejo", se archiva igual.

- **22 sep 2026 (inicio de esta sesión)**: revisión exhaustiva del estado real del repositorio contra un zip nuevo — dotfiles restaurados (mismo problema de Finder de siempre), `format:check` corregido de 262 a 0 ficheros tras identificar que era deriva de versión de Prettier, no violación de reglas (§2.1). Redirect tras crear contenido: el ABM ya no deja la creación como un paso a medias (§2.2).
- **22 sep 2026 (continuación)**: decididos e implementados los límites de caracteres de Tipo A y Tipo B — contador blando en el ABM + `line-clamp`/elipsis en frontend, `max-width` en `ch` para no depender del ancho real disponible ni de la tipografía final (§2.3). Integrado trabajo externo que cierra la verificación server-side de vídeo en Cloudinary, cerrando la asimetría con imagen anotada horas antes (§2.4).
- **22-23 sep 2026**: auditoría de cookies iniciada — contrastado el estado real de YouTube/Vimeo/Spotify (no las guías de hace un año), hallazgo real corregido (Vimeo sin `dnt=1`), y click-to-load construido para Vimeo/Spotify vía integración de trabajo externo (§2.5). Decisión de fondo (nivel de rigor, banner/CMP) explícitamente aplazada por el usuario — ver §5.
- **23 sep 2026**: preview firmado del ABM construido de cero (§2.6) — cierra la decisión pendiente desde el 7 de septiembre. Token autocontenido sin estado (mismo mecanismo que el cursor del feed), caduca a los 7 días, `resolvePreviewContext` como único punto de entrada para las cuatro plantillas públicas. 15 tests nuevos, dos fallos propios corregidos antes de cerrar el bloque (estrechamiento de tipos, mocks sin limpiar entre tests).
- **23 sep 2026 (cierre de la sesión)**: resuelto un conflicto de git real entre el trabajo de esta sesión y el de un compañero en paralelo (`episodeDetail.smoke.test.tsx`), e integrada su analítica Plausible real — evento "Pin Click" disparado desde `PinCard`, cableado en los cuatro sitios donde se pinta un pin. Hallazgo real corregido al integrar: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` no estaba en el schema de `env.ts` pese a usarse en `layout.tsx`. Descartado un `Archivo.zip` suelto (backup accidental, no algo a integrar). **611 tests en verde (65 ficheros), `eslint` a 0, build y `tsc` limpios, `format:check` limpio.** Este mismo cierre incluyó archivar las antiguas §2/§3 (rediseño de detalle + construcción del sitio público, ambas confirmadas y completas) en `historial-fases-3-4.md`, reorganizando este documento para que vuelva a quedarse centrado en el estado actual — mismo criterio que el archivado del 9 de septiembre.
