# Greener — Estado del proyecto y próximos pasos

Este documento resume el estado actual del repositorio `greener-web`, cómo verificarlo, y qué queda pendiente. Complementa (no sustituye) el documento de **Arquitectura técnica V1.3**, que sigue siendo la fuente de verdad de las decisiones de diseño.

**El relato detallado día a día de las Fases 0-2 (ya completadas) se archivó por separado** el 9 de septiembre de 2026, para que este documento se quede centrado en el estado actual y lo pendiente: ver `historial-fases-0-2.md`, en la raíz del repo. Este documento (`PROGRESO.md`) sigue siendo el único sitio a mirar para saber "¿qué queda por hacer?" — el archivo es solo para el porqué de decisiones ya tomadas o el detalle de bugs ya cerrados. **Las referencias `§2.N` que aparecen repartidas por el resto de este documento** (en el checklist de §5 y en §6) apuntan a la numeración interna de ese archivo, no a la sección 2 de aquí.

Sustituye a las versiones anteriores de `PROGRESO.md` y `CHECKLIST.md`. Actualízalo cuando cierres un bloque de trabajo real, no en cada commit menor; si algo que documenta deja de ser cierto, corrígelo aquí mismo en vez de dejarlo desactualizado.

**Nota de numeración**: este documento se renumeró el 15 de septiembre al insertar la §3 nueva (antes, "Cómo verificar" era §3, el checklist era §4, etc. — todo lo que sigue usa la numeración nueva).

Todas las referencias `§X` sin más contexto apuntan a secciones del documento de arquitectura. Última revisión: 16 de septiembre de 2026, verificada ejecutando el código real (no solo por lectura).

---

## 1. Resumen ejecutivo

**Fases 0, 1 y 2 completas.** Motor de feed, tools/insights sin iframe, esquema de Supabase con RLS, login del ABM, CRUD completo de `content`/medios, estados editoriales (`draft`/`scheduled`/`published`), subida real de paquetes HTML con escaneo antivirus, y subida de pines (individual + carga masiva por CSV) — todo implementado, testeado y verificado ejecutando el código real. Detalle completo en `historial-fases-0-2.md`.

**10 de septiembre: implementado el rediseño completo del formato de detalle** (migraciones + código) que sustituye al repertorio de bloques A/B/C original — ver §2. El editor de bloques de contenido (`content_block`) ya no existe.

**14-15 de septiembre: construidas las páginas públicas reales sobre ese rediseño** — home con el feed real y persistencia entre navegaciones, `/work/[slug]` (caso y episodio), `/tools/[slug]` e `/insights/[slug]` (tipo A), y el `Shell` con los iconos y el CTA finales confirmados por diseño. Ver §3. De paso, cerrado un hueco de accesibilidad real (`case_detail_media` no tenía `alt`).

**El sitio público tiene ya sus cuatro rutas principales sirviéndose** (`/`, `/work/[slug]`, `/tools/[slug]`, `/insights/[slug]`), todas con datos reales de Supabase — pero con simplificaciones deliberadas en varios sitios (carrusel del feed, autoplay de vídeo, panel de recomendaciones de tipo A, variantes de idioma...). **§3 tiene el recap completo de qué es cada una** — es la lista de la que tirar en la próxima sesión.

De las decisiones de negocio pendientes con Greener, ya están cerradas: ADR-11 (ratios del feed), `'shop'` como hueco reservado, alcance de dominios del ABM (3, no 1), límites/plan de medios, escaneo antivirus/tamaño de ZIP, y el repertorio de bloques de caso. Queda abierto, sin urgencia técnica, el mecanismo de publicación automática al llegar `publish_at` (§6).

**Cifras actuales, verificadas a fecha de hoy:**

- **382 tests automáticos, todos en verde** (`npm test`).
- **0 errores de TypeScript**, **0 errores ni avisos de ESLint**, **build de producción limpio** (verificado con `npx next build` contra variables de entorno de prueba, ya que este repositorio no trae `.env.local` con credenciales reales).
- **34 migraciones SQL** de Supabase (25 + 9: 8 del 10 sep + 1 del 14 sep, el arreglo del `alt` de `case_detail_media`). Aplicadas contra el proyecto Supabase real por Greener a mediados de septiembre (`supabase db push`).
- **50 casos + 9 episodios** de datos de demostración — cargados por Greener contra Supabase real vía SQL Editor, con un par de idas y vueltas (ver §7, entradas del 15 sep): primero un `NOT NULL` en `alt` por estar usando una copia vieja del fichero, después confirmado que el editor de Supabase revierte todo el bloque si falla algo a medias.

---

## 2. Rediseño del formato de detalle — migraciones y código (10 sep)

**Implementado el 10 de septiembre: migraciones SQL + capa domain/application/infrastructure + ABM + motor de feed.** El editor de bloques (`content_block`) construido en agosto ya no existe: tabla, funciones RPC y toda la UI del ABM que dependía de él se borraron (no se dejó como código muerto).

**Los dos documentos de referencia siguen viviendo en la raíz del repo** (`especificacion-final-formato-detalle.md`, `contrato-zip-tools-insights.md`) — son la fuente de verdad del diseño; este apartado resume qué se implementó a partir de ellos.

**Resumen de lo implementado:**

- `case_template_variant` ya no existe — el formato se infiere de `content.type`, siempre.
- `page` ya no existe como concepto propio: renombrado a `other` (`ALTER TYPE content_type RENAME VALUE 'page' TO 'other'`), hereda su 5% de cuota en el feed sin tocar `feed_config`.
- `case_detail` ya no tiene `template_variant`/`sector`/`services`/`year`/`credits`/`links`. Se queda con `force` + `client`.
- `content_translation` gana `highlight` y `body` (traducibles, usados por caso/episodio).
- `episode` gana `episode_kind` (enum ampliable, arranca en `podcast`) — sin ABM propio todavía (nunca lo tuvo).
- `content` gana `cover_media_id` (portada de tool/insight/`other`; imagen únicamente en tool/insight, imagen o vídeo en `other`).
- Nueva tabla `case_detail_media` — carrusel de detalle de un caso, 1-N imágenes/vídeos mixtos, sin tope, tabla independiente de `pin_media`. **14 sep: ganó `alt` obligatorio** — ver §3, era un hueco de accesibilidad real.
- `pin_type` (`fixed`/`animated`/`carousel`) ha desaparecido: hasta 8 medios por pin (imagen o vídeo ≤5 s mezclados) + flag `show_as_carousel` que decide si el feed lo muestra agrupado (una tarjeta con carrusel) o como N tarjetas independientes. El motor de feed (`constrainedMix`/`rotateQueue`/`generateRound`) no necesitó cambios: ya trataba cada pin como un id de texto opaco — el cambio real cayó en `modules/feed/infrastructure/supabaseFeedSource.ts`, que expande un pin en 1 o N "unidades" seleccionables (`pin.id` o `pin.id::media.id`) según el flag.
- `pin.cta` ha desaparecido: el CTA del feed es fijo por tipo de contenido (`Use` tool, `Read` insight, `Watch` caso/episodio/`other`), calculado en `getFeedSessionBatch.ts`, no almacenado.
- `pin.label` pasa a opcional (antes `NOT NULL` sin condición): obligatorio salvo en caso/episodio, validado en `create_pin`/`update_pin` según `content.type`.
- `pin_ratio` gana `4:3` (faltaba en el enum — la especificación cierra la lista en 7 valores). **14 sep: el mismo hueco existía también en `modules/masonry/domain/layout.ts`** (el dominio del layout de frontend tiene su propio enum de ratios, separado del de Postgres) — corregido a la vez que se construía la home.
- Episodio se unifica con caso bajo `/work/[slug]` — antes tenía su propia ruta `/channel/[slug]` en el código del motor de feed. **14-15 sep: la ruta ya existe de verdad, ver §3.**
- `/tools|insights/[slug]` deja de servir el HTML directamente: se mueve a `/tools|insights/[slug]/app`. **14-15 sep: la ruta sin `/app` ya tiene su página de detalle tipo A real, ver §3.**

**Dos hallazgos de housekeeping, no relacionados con el rediseño, corregidos de paso:**

- `admin_allowed_domain` se referenciaba en RLS y en `seed.sql` pero ninguna migración la creaba. **La tabla real en Supabase está bien y ya tiene datos** (confirmado por Greener el 10 sep) — el hueco era solo la migración que la reproduce en un entorno nuevo. Migración correctiva con `create table if not exists`, esquema calcado del real (incluido `created_at`) — inofensiva en el proyecto real.
- `.prettierrc` no venía en el zip que se compartió para la sesión del 10 sep — Finder no comprime ficheros ocultos por defecto. **No es un hueco real del repo**: Greener confirmó que el fichero existe en local con `{"semi": false, "singleQuote": true, "trailingComma": "all", "tabWidth": 2}`. Recreado con ese contenido exacto como `.prettierrc.json`. De paso, añadido `.prettierignore` (`.next/`, `data/demo/feed-snapshot.json`, `supabase/.temp/`), que si no existía ya en local, sí es una adición nueva.

---

## 3. Home, `/work`, detalle tipo A y Shell construidos (14-15 sep)

Con las migraciones y el motor de feed ya listos desde el 10 sep, esta sesión fue la de construir las páginas públicas de verdad. **Todo lo de aquí está implementado, testeado (tests de humo por componente) y verificado con build real** — pero varias piezas se dejaron deliberadamente en su versión más simple posible para no bloquear el resto. La lista completa de "esto es un primer corte, no la versión final" está al final de esta sección — es el punto de partida natural de la próxima sesión.

### 3.1 Hueco de accesibilidad cerrado

`case_detail_media` no tenía `alt` propio (a diferencia de `pin`, que sí lo exige) — la página pública usaba un alt calculado a partir del título. Migración `20260914090000_case_detail_media_alt.sql`: `alt text not null` (con el patrón seguro `default ''` + `drop default`, para no romper filas ya cargadas), `add_case_carousel_image`/`add_case_carousel_video` lo exigen, `CaseCarouselManager` del ABM tiene ahora un campo de texto obligatorio antes de poder subir, y `CaseDetail.tsx` usa el alt real.

### 3.2 Persistencia del feed en la home (arquitectura §6.2)

`HomeFeedProvider` (contexto de React) vive en `app/(public)/layout.tsx`, que Next.js no desmonta al navegar de `/` a `/work/[slug]` y volver — solo desmonta `page.tsx`. Ahí vive el estado del feed (sesión, pines ya cargados, cursor, scroll), con `sessionStorage` como respaldo vinculado a un `pageLoadId` (constante de módulo, no estado de React: se genera una vez por carga real del documento y se mantiene estable durante toda la navegación interna). Al volver de un detalle, no se refetchea nada y se restaura el scroll exacto — criterio de aceptación §20.1 ("volver desde un detalle conserva orden, batches y posición") cumplido.

### 3.3 `/work/[slug]` (tipo B — caso y episodio)

- Lectura pública nueva (`modules/content/infrastructure/publicCaseSource.ts`, `publicEpisodeSource.ts`) — sobre `createPublicReadClient()`, no el repositorio del ABM. Primer código que lee la tabla `episode` en absoluto.
- `CaseDetail`: carrusel de `case_detail_media` (scroll nativo + `scroll-snap`), imagen o vídeo mixto, cliente/título/highlight/body.
- `EpisodeDetail`: embed responsive 16:9 por proveedor (`youtube-nocookie`, Vimeo, Spotify).
- `page.tsx`: resuelve `case`/`episode` por slug, 404 en cualquier otro caso, `generateMetadata` con SEO/OG.

### 3.4 `/tools/[slug]` e `/insights/[slug]` (tipo A)

- `ToolInsightDetail`, un único componente compartido (arquitectura §12: "el brief considera técnicamente equivalentes insights y tools") — portada + título + summary + CTA (`Use`/`Read`) hacia el HTML real en `/app`.
- `generateMetadata` compartido en `lib/contentMetadata.ts`.

### 3.5 `Shell` real

- Los 10 SVG confirmados por diseño en `public/icons/`, tres bloques (logo / navegación / redes) tal como la captura de referencia.
- `shop.svg` incluido en el código (`visible: false`) pero no se renderiza — así será el diseño final, pero Shop sigue fuera de alcance de V1.
- CTA con el azul y radio confirmados (`#1941F5`, `0.6875rem` ≈ 11px sobre base 16) como variables globales (`--color-cta`, `--radius-cta`), reutilizadas tanto en el CTA del feed como en el de tipo A.
- **15 sep**: `.sidebar` necesitaba `height: 100dvh` (si no, el grid la estira a la altura del feed completo y `margin-top: auto` del bloque de redes se va al final de todos los pines, no al final del viewport) y `position: sticky` (si no, se pierde al hacer scroll — el `height` fijo por sí solo no la fija en pantalla).

### 3.6 Recap — qué se dejó en su versión más simple, a propósito

Esto es la lista completa. Cuando se retome, empezar por aquí:

**Feed / home:**

- ~~Carrusel dentro de la tarjeta del feed~~ — **cerrado el 15 sep**: `PinCard` recorre de verdad los medios de un pin con `show_as_carousel=true`. 5 s por slide de imagen; un slide de vídeo se reproduce (muted, autoplay) y avanza al terminar (evento `ended`), no por el timer fijo. Sin flechas ni puntos manuales. En hover: imagen fija, vídeo en loop; al salir, el temporizador se reinicia desde cero. Esto es autoplay real de vídeo, pero acotado al slide activo de un carrusel ya decidido — el autoplay general del feed (`IntersectionObserver`, límite simultáneo 2 escritorio/1 móvil, §9.3) para pines de un solo vídeo sigue sin implementar, ver la línea de abajo.
- ~~Autoplay de vídeo en el feed fuera de un carrusel~~ — **cerrado el 15 sep**: un pin de un único vídeo respeta `pin.autoplayMode` (`viewport`/`hover`/`null` — campo que ya existía en el esquema y el ABM desde antes del rediseño, pero nunca llegaba al feed público hasta ahora). `'viewport'` compite por uno de los huecos globales del feed (`videoPlaybackCoordinator.ts`: 2 en escritorio, 1 en móvil, prioridad por % visible y cercanía al centro — arquitectura §9.3), `'hover'` reproduce solo con el puntero encima sin competir por ningún hueco, `null` se queda en poster estático como hasta ahora. El límite global **cuenta también el slide de vídeo activo de un carrusel**, no solo los pines de un único vídeo — si un carrusel no consigue hueco, su slide de vídeo se queda en poster y el carrusel avanza igualmente a los 5 s, como si fuera una imagen.
- ~~Scope del feed: solo `scope=home`~~ y ~~sin subhomes~~ — **ambas cerradas el 15 sep**: `createFeedSession` acepta `work`/`insights`/`tools`/`channel`, `getFeedDataset` filtra por tipo según el scope, `generateRound` ya no colapsa a una tanda de 0 pines cuando el universo no tiene ningún caso, y las cuatro páginas subhome (`/work`, `/insights`, `/tools`, `/channel`) existen y sirven su scope real. De paso, `HomeFeedProvider`/`useHomeFeed`/`HomeFeed` (solo sabían de `scope="home"`) se generalizaron a `FeedProvider`/`useFeed(scope)`/`Feed` — cada scope guarda su propio estado (sesión, pines, scroll) en el mismo Provider, así que la persistencia al volver de un detalle (§3.2) funciona igual en las subhomes que en la home, sin duplicar nada.

**`/work/[slug]`:**

- Sin variantes de idioma (`/work/{slug}/{locale}`) — solo se renderiza el `default_locale`.
- Embed de Spotify: `/embed/episode/{id}` es la mejor suposición (porque `episode_kind` hoy solo vale `podcast`), sin confirmar contra un episodio real de Spotify.
- Episodio sin imagen de compartición (OG) — no hay thumbnail propio del que tirar.

**`/tools/[slug]` e `/insights/[slug]`:**

- **Falta el panel de recomendaciones por completo** — el modelo de columnas (altura fija 66,7vh, ancho = altura × ratio, tope 83% del ancho útil) de la especificación no está construido; hoy la página es solo portada + texto + CTA, a ancho completo.
- El CTA no comprueba antes si existe un paquete HTML publicado — si no lo hay, se deja que `/app` devuelva su propio 404 al hacer clic, en vez de ocultar o deshabilitar el botón.
- `/tools|insights/[slug]/app` sigue sirviendo un viewport fijo hardcodeado (`1136×800`) en vez del tamaño real de pantalla — ver §5.5, es de antes del 10 sep.

**Shell:**

- Hover de los iconos: como los SVG traen `stroke="black"` fijo (no `currentColor`), el hover es un fondo circular detrás del icono, no un cambio de color del propio trazo — si diseño quiere que el icono cambie de color, hay que revisar el enfoque.
- El icono "Casos" (carpeta) enlaza a `/` — asunción sin confirmar del todo (no había un icono de "Home" explícito en el set).
- `/contacto` tiene entrada en el menú pero la página todavía no existe.

**Transversal / infraestructura:**

- ABM de `episode`: sigue sin existir (nunca existió) — hoy no hay forma de crear/editar episodios desde el panel.
- `.env.local.example`: sigue sin confirmarse si existe en local o se perdió en el mismo problema que `.prettierrc`.
- Redirecciones 301, analítica Plausible, contacto/Mailchimp, páginas legales, cabeceras de seguridad globales (hoy solo en `/tools`): ninguna empezada — ver checklist §5.5/§5.6.
- Preview firmado del ABM (§15.3): aplazado "hasta que exista una plantilla pública real" — **ya existen tres** (`/work`, `/tools`, `/insights`), así que esta decisión ya no tiene nada bloqueándola si se quiere retomar.

---

## 4. Cómo verificar todo esto tú mismo

```bash
npm install
npm run lint               # ESLint
npm run format:check       # Prettier
npx next build              # build de producción — genera también los tipos de ruta (.next/types). Necesita variables de entorno reales o de prueba (ver src/lib/env.ts); sin ellas falla en "Collecting page data", no antes.
npx tsc --noEmit             # TypeScript — hazlo DESPUÉS de next build/dev, si no da falsos positivos de LayoutProps
npm test                     # 382 tests (unit + property-based + smoke con jsdom)
node scripts/generate-demo-data.mjs   # regenera el dataset (determinista) — incluye alt del carrusel de caso desde el 14 sep
```

Para aplicar el esquema contra un proyecto Supabase real: `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push` (instrucciones completas en `supabase/README.md`, aunque ese fichero se quedó desactualizado en las migraciones que lista — la lista real y al día es la de §2 de este documento).

Para cargar el dataset de demo contra un proyecto real: `supabase/seed_demo_data.sql` **no** lo aplica `db push` (no es una migración) — pégalo en el SQL Editor del dashboard o `psql -f supabase/seed_demo_data.sql` contra la cadena de conexión del proyecto. Aviso real, encontrado el 15 sep: las 6 imágenes del dataset son de la cuenta pública `demo` de Cloudinary, no de la vuestra — si `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` no es literalmente `demo`, esas imágenes concretas saldrán rotas (no es un fallo de la carga en sí).

Para arrancar en local contra datos reales: `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDMERSIVE_API_KEY` (nombres exactos en `src/lib/env.ts`) — `npm run dev` y abrir `/`.

---

## 5. Próximos pasos — checklist por fases

Basado en el Anexo E ("paso a paso óptimo de ejecución") del documento de arquitectura, cruzado con el estado real verificado. `[x]` hecho y verificado · `[~]` hecho parcialmente / sin verificar del todo · `[ ]` pendiente.

### 5.1 Housekeeping inmediato

- [x] Arreglar el export roto en `feed/domain/index.ts` — **hecho el 18 ago**.
- [x] Añadir `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` a `devDependencies` — **hecho el 18 ago**.
- [ ] Crear/confirmar `.env.local.example` real — sin confirmar todavía si existe en local (mismo problema de exportación que `.prettierrc`, sin resolver).
- [x] Variables de entorno reales (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) en `src/lib/env.ts` — **hecho el 18 ago**.
- [x] Import relativo de `src/app/auth/callback/route.ts` con alias `@/*` — **hecho el 18 ago**.
- [x] `hd` en el login de Google — **decidido el 18 ago: no se añade** (3 dominios reales, `hd` solo admite uno o `*`). La restricción real vive en `is_admin()`/`admin_allowed_domain`.
- [x] `ffforward.ai`/`villamagia.com` en `admin_allowed_domain` real — **confirmado el 18 ago**.
- [x] `supabase/.temp/` en `.gitignore` — **hecho el 18 ago**; ampliado a `.gitignore` completo el 10 sep (ver más abajo).
- [x] `'shop'` en `tag_section` como hueco reservado — **cerrado el 18 ago**.
- [x] ADR-11 (70/15/5/5/5) — **cerrado el 18 ago**.
- [ ] Confirmar con quien lleve el login del ABM el estado real de esa parte y añadir tests.
- [x] `admin_allowed_domain` sin migración que la creara — **corregido el 10 sep**.
- [x] `.prettierrc.json`/`.prettierignore` — **corregido el 10 sep**.
- [x] `.gitignore` — **añadido el 10 sep** (no existía en el zip recibido esa sesión; mismo problema de Finder que `.prettierrc`).

### 5.2 Fase 1 (hasta el 15 de agosto)

- [x] Repertorio de bloques y restricciones de las variantes A/B/C de caso — **resuelto el 9 sep sustituyendo el enfoque entero, implementado el 10 sep**.
- [ ] Especificación de formatos para Greener (Anexo A.1).
- [~] Inventario de URLs actuales para las redirecciones 301 — catálogo de tools (9) e insights (4) confirmado el 18 ago; falta el resto del sitio actual.
- [ ] Ajustar el algoritmo de layout masonry con el diseño real cuando esté disponible.

### 5.3 Fase 2 (hasta el 1 de septiembre) — ABM base

- [x] Autenticación Google OAuth vía Supabase Auth — **confirmada el 7 sep**.
- [x] CRUD de `content` y extensiones — **hecho 20-28 ago, auditado el 7 sep**; el editor de bloques que vivía aquí se borró el 10 sep, sustituido por cover media + carrusel de caso.
- [x] Subida de pines, individual y masiva por CSV — **hecho el 9 sep**; `pin_type` sustituido por `show_as_carousel` el 10 sep.
- [x] Subida de paquetes HTML con escaneo antivirus — **hecho el 8-9 sep**.
- [~] Estados `draft`/`scheduled`/`published`/`preview` — los tres primeros **hechos el 7 sep**; `preview` aplazado a cuando hubiera plantilla pública real — **ya la hay (§3), decisión lista para retomar** (§6). Pendiente aparte: publicación automática al llegar `publish_at` (§6).
- [x] Cliente de Supabase browser/server extendido a `content`/`feed`/`media`.

### 5.4 Fase 3 — home y `/work` (hasta el 15 de septiembre)

- [x] Home con el feed real — **construida el 14-15 sep** (§3.2): `FeedProvider` (generalizado el 15 sep de `HomeFeedProvider`, que solo sabía de `scope="home"`), persistencia entre navegaciones, scroll restaurado.
- [x] Página de caso/episodio (`/work/[slug]`) — **construida el 14-15 sep** (§3.3).
- [x] Restauración de scroll y semilla de sesión contra datos reales — **hecho el 14-15 sep**, ver §3.2 (con test dedicado).
- [x] Subhomes `/work`, `/insights`, `/tools`, `/channel` — **construidas el 15 sep**, junto con el filtro por scope del motor de feed que las desbloqueó (ver arriba, en §6).
- [ ] Primeras métricas reales de LCP/CLS — todavía no medido contra contenido real, solo contra el dataset de demo.
- [x] Carrusel dentro de la tarjeta del feed — **cerrado el 15 sep** (ver arriba).
- [x] Autoplay general del feed para pines de un solo vídeo, con límite simultáneo (2 escritorio/1 móvil) — **cerrado el 15 sep** (ver arriba). Primeras métricas reales de LCP/CLS contra este vídeo en producción, sin medir todavía.

### 5.5 Fase 4 — tipo A y resto del sitio (hasta el 22 de septiembre)

- [x] Insights y Tools en producción sobre Supabase Storage real — **hecho el 8-9 sep**; ruta `/app` separada de la página de detalle el 10 sep.
- [x] Página de detalle tipo A (`/tools/[slug]`, `/insights/[slug]`) — **construida el 14-15 sep** (§3.4).
- [ ] Panel de recomendaciones de tipo A (columnas, 66,7vh, tope 83%) — **no construido**, ver recap §3.6. Es la pieza más grande que falta de todo el detalle.
- [ ] `/tools|insights/[slug]/app` sirve un viewport fijo hardcodeado (`1136×800`) en vez del real — pendiente desde antes del 10 sep, documentado en `contrato-zip-tools-insights.md` §6 para que construir tools no dependa de que esto se cierre.
- [x] Channel, subhome básica — **construida el 15 sep**: `/channel` sirve el scope real, sin afinidad de episodios todavía (§13.1: mismo programa, etiquetas compartidas, invitado/empresa, proximidad temporal + mezcla — hoy es solo el orden determinista normal del feed, sin ese scoring extra).
- [ ] Contacto y Mailchimp con doble opt-in — `/contacto` está en el menú, la página no existe.
- [ ] Páginas legales.
- [ ] Analítica Plausible.
- [ ] Cabeceras de seguridad globales (HSTS, CSP, `frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options`) — hoy solo en `/tools|insights/[slug]/app`.

### 5.6 Fase 5 (26-30 de septiembre) — QA y cierre

- [ ] Tests E2E de los criterios de aceptación críticos de §20.1.
- [ ] Auditoría de cookies y consentimiento (Plausible, YouTube-nocookie, Vimeo, Spotify) — más relevante ahora que el embed de episodio ya es real (§3.3).
- [ ] Verificación de las redirecciones 301.
- [ ] Accesibilidad: teclado, foco, contraste, `prefers-reduced-motion`, menú solo-iconos con labels. `alt` de `case_detail_media` ya cerrado (§3.1); pendiente el resto.
- [ ] Carga real de contenido por Greener contra el ABM ya terminado.

### 5.7 1 de octubre — Publicación y monitorización reforzada

---

## 6. Decisiones pendientes con Greener (Anexo A.2)

Ninguna depende de escribir código — bloquean trabajo posterior si no se cierran a tiempo.

| Decisión                                                                                | Bloquea                                                 | Estado                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auditoría de embeds y cookies de terceros (Vimeo, Spotify)                              | Si hace falta banner de consentimiento antes de Channel | Abierto — más urgente ahora que `/work/[slug]` ya embebe episodios de verdad (§3.3)                                                                                                                 |
| Traducción asistida por IA en el ABM (opcional)                                         | Si se incluye en V1 o se deja fuera                     | Abierto, no bloqueante                                                                                                                                                                              |
| Mecanismo de publicación automática al llegar `publish_at` (cron externo vs. `pg_cron`) | Que el contenido programado se publique solo            | Abierto — no bloquea usar el ABM hoy (publicar/programar/despublicar manual funciona)                                                                                                               |
| Preview firmado del ABM (§15.3)                                                         | —                                                       | Ya no tiene nada bloqueándolo técnicamente: existen tres plantillas públicas reales (`/work`, `/tools`, `/insights`) sobre las que montarlo — antes se aplazaba precisamente por no existir ninguna |
| Panel de recomendaciones de tipo A (modelo de columnas, §3.6)                           | El detalle de tools/insights se queda incompleto sin él | Sin cerrar cuándo se retoma — es la pieza de UI más grande que falta de todo el rediseño de formato                                                                                                 |

Cerrada el 14 sep: iconos finales del `Shell` (10 SVG, tres bloques) y especificación del botón CTA (`#1941F5`, radio 11px) — confirmados por diseño, implementados el mismo día (§3.5).

Cerrada el 9 de septiembre (tarde): repertorio de bloques y restricciones de variantes A/B/C — resuelto sustituyendo el enfoque entero. Ver §2 y `especificacion-final-formato-detalle.md`.

Cerrada el 9 de septiembre: escaneo antivirus de los ZIP subidos (Cloudmersive, bloqueante) y límite de tamaño del ZIP (20 MB).

Cerrada el 7 de septiembre: preview firmado (§15.3) — se aplazaba a cuando existiera una plantilla pública real. **Ya existe (§3) — ver la fila de arriba, la decisión está lista para retomarse.**

Cerradas el 18 de agosto: reasignación 5% Shop → Channel (ADR-11); permanencia de `'shop'` en `tag_section` como hueco reservado; alcance del dominio permitido en el ABM — 3 dominios reales (`itsgreener.com`, `ffforward.ai`, `villamagia.com`), mismo nivel de acceso para los tres.

Cerradas el 19 de agosto: pesos/bitrates máximos de imagen y vídeo (5 MB imagen, 100 MB / 3 min vídeo) y plan de Cloudinary (**Free**, cuenta ya creada y verificada).

---

## 7. Historial de correcciones a este documento

Archivado junto con el resto del detalle de las Fases 0-2 — ver `historial-fases-0-2.md`. A partir de la entrada del 9 de septiembre sobre el archivado, las nuevas correcciones a este documento se registran aquí de nuevo.

- **9 sep 2026 (noche)**: aligerado este documento — el relato detallado de las Fases 0-2 se movió a `historial-fases-0-2.md`.
- **10 sep 2026**: implementado el rediseño de formato de detalle — 9 migraciones SQL nuevas (8 de esta fecha + 1 del 14 sep), capa domain/application/infrastructure de `content`/`pin`/`media`/`feed` actualizada, editor de bloques borrado, ABM adaptado, rutas de tools/insights movidas a `/app`. Corregidos de paso `admin_allowed_domain` (migración que faltaba) y `.prettierrc.json` (se había perdido solo en el zip de la sesión).
- **14 sep 2026**: cerrado el hueco de accesibilidad de `case_detail_media.alt` (§3.1); construida la persistencia del feed en la home (§3.2); recibidos y aplicados los iconos y el CTA finales del `Shell` (§3.5), con un fix de CSS al día siguiente (sticky + `height: 100dvh`, sin el cual el `margin-top: auto` del bloque de redes se iba al final de todos los pines en vez de al final del viewport).
- **15 sep 2026**: construidas `/work/[slug]` (§3.3) y `/tools|insights/[slug]` (§3.4) — las cuatro rutas públicas principales del sitio ya sirven datos reales. Detectado y corregido un despiste al cargar el dataset de demo contra Supabase real: el fichero pegado en el SQL Editor era una copia de antes del arreglo del `alt` (14 sep) — no un fallo de los datos en sí. Este documento se reorganizó (nueva §3, renumeración del resto) para que el recap de simplificaciones deliberadas quede como punto de partida explícito de la siguiente sesión (§3.6). Más tarde el mismo día: hover nuevo de los iconos del `Shell` (color + tamaño + pastilla con el nombre, sobre `mask-image` porque los SVG traen `stroke="black"` fijo) y placeholder de Contacto; labels del `Shell` traducidos al inglés (arquitectura §2.4) y ruta renombrada `/contacto` → `/contact`; `AuxNav` nuevo (menú auxiliar de texto de la home, confirmado por captura de referencia). Detectado y corregido `kitten_fighting`: resultó ser un GIF animado de la cuenta demo de Cloudinary (no una imagen estática), así que se reproducía solo en el feed — no era ningún autoplay del código, era el propio formato del archivo; sacado del dataset de demo. Cerrado el filtro por etiqueta/scope del motor de feed (`createFeedSession` acepta `work`/`insights`/`tools`/`channel`; `getFeedDataset` filtra por tipo; `generateRound` ya no colapsa a 0 pines en un universo sin casos) — era el prerrequisito real antes de repartir el resto del trabajo entre dos personas. Por último, construidas las cuatro subhomes (`/work`, `/insights`, `/tools`, `/channel`) sobre ese filtro recién cerrado, generalizando `HomeFeedProvider`/`useHomeFeed`/`HomeFeed` (solo sabían de `scope="home"`) a `FeedProvider`/`useFeed(scope)`/`Feed` — cada scope guarda su propio estado en el mismo Provider, así que la persistencia al volver de un detalle funciona igual en las subhomes que en la home. Y para cerrar el día: `PinCard` recorre de verdad el carrusel cuando `show_as_carousel=true` y hay más de un medio — 5 s por slide de imagen, un slide de vídeo avanza al terminar (autoplay real, pero acotado al slide activo de un carrusel ya decidido), pausa en hover (imagen fija / vídeo en loop) y reinicio del temporizador al salir.
- **16 sep 2026**: autoplay real para pines de un único vídeo, respetando `pin.autoplay_mode` (`viewport`/`hover`/`null`) — campo que llevaba en el esquema y el ABM desde antes del rediseño de formato pero nunca se hilvanaba hasta el feed público; lo hizo falta hacerlo ahora (`supabaseFeedSource.ts` → `getFeedSessionBatch.ts` → `PinCardData`). Nuevo `videoPlaybackCoordinator.ts`: límite global de vídeos simultáneos (2 escritorio/1 móvil, arquitectura §9.3, prioridad por % visible y cercanía al centro), que cuenta también el slide de vídeo activo de un carrusel, no solo los pines de un único vídeo — si un carrusel no consigue hueco, su slide de vídeo se queda en poster y avanza igual a los 5 s. De paso, investigado un "1 error" intermitente en la suite completa (sin relación aparente con ningún test ni stack trace localizable en 9 de 11 pasadas limpias) — sin causa confirmada, probablemente ruido del entorno de pruebas, no un fallo real.
