# Greener — Estado del proyecto y próximos pasos

Este documento resume el estado actual del repositorio `greener-web`, cómo verificarlo, y qué queda pendiente. Complementa (no sustituye) el documento de **Arquitectura técnica V1.3**, que sigue siendo la fuente de verdad de las decisiones de diseño.

**El relato detallado día a día de las Fases 0-2 (ya completadas) se archivó por separado** el 9 de septiembre de 2026, para que este documento se quede centrado en el estado actual y lo pendiente: ver `historial-fases-0-2.md`, en la raíz del repo. Este documento (`PROGRESO.md`) sigue siendo el único sitio a mirar para saber "¿qué queda por hacer?" — el archivo es solo para el porqué de decisiones ya tomadas o el detalle de bugs ya cerrados. **Las referencias `§2.N` que aparecen repartidas por el resto de este documento** (en el checklist de §4 y en §5) apuntan a la numeración interna de ese archivo, no a la sección 2 de aquí — la única `## 2.` que queda en `PROGRESO.md` es la del rediseño en curso, más abajo.

Sustituye a las versiones anteriores de `PROGRESO.md` y `CHECKLIST.md`. Actualízalo cuando cierres un bloque de trabajo real, no en cada commit menor; si algo que documenta deja de ser cierto, corrígelo aquí mismo en vez de dejarlo desactualizado.

Todas las referencias `§X` apuntan a secciones del documento de arquitectura. Última revisión: 10 de septiembre de 2026, verificada ejecutando el código real (no solo por lectura).

---

## 1. Resumen ejecutivo

**Fases 0, 1 y 2 completas.** Motor de feed, tools/insights sin iframe, esquema de Supabase con RLS, login del ABM, CRUD completo de `content`/bloques/medios, estados editoriales (`draft`/`scheduled`/`published`), subida real de paquetes HTML con escaneo antivirus, y subida de pines (individual + carga masiva por CSV) — todo implementado, testeado y verificado ejecutando el código real. Detalle completo en `historial-fases-0-2.md`.

**10 de septiembre: implementado el rediseño completo del formato de detalle** (migraciones + código) que sustituye al repertorio de bloques A/B/C original — ver §2. El editor de bloques de contenido (`content_block`) ya no existe: tabla, funciones RPC y toda la UI del ABM que dependía de él se han borrado. Sigue pendiente, a propósito (fuera del alcance de esta sesión): la home real y las plantillas públicas de detalle (`/work/[slug]`, `/tools|insights/[slug]`) — el objetivo de hoy era dejar migraciones y código listos para poder empezar esas dos cosas, no construirlas.

De las decisiones de negocio pendientes con Greener, ya están cerradas: ADR-11 (ratios del feed), `'shop'` como hueco reservado, alcance de dominios del ABM (3, no 1), límites/plan de medios, escaneo antivirus/tamaño de ZIP, y el repertorio de bloques de caso (resuelto sustituyendo el enfoque entero, y ahora también implementado). Queda abierto, sin urgencia técnica, el mecanismo de publicación automática al llegar `publish_at` (§5).

**Cifras actuales, verificadas a fecha de hoy:**

- **330 tests automáticos, todos en verde** (`npm test`) — bajan desde 341 porque el test del editor de bloques (`contentBlockSchema.test.ts`) se borró entero junto con el propio editor; se han reescrito o añadido los tests de todo lo demás que cambió hoy.
- **0 errores de TypeScript**, **0 errores ni avisos de ESLint**, **build de producción limpio** (verificado con `npx next build` contra variables de entorno de prueba, ya que este repositorio no trae `.env.local` con credenciales reales).
- **34 migraciones SQL** de Supabase (25 + 9 nuevas hoy). Las 9 nuevas todavía no se han aplicado contra el proyecto Supabase real — pendiente de `supabase db push` (ver housekeeping más abajo).
- **50 casos + 9 episodios** de datos de demostración, regenerados hoy con el esquema nuevo (`node scripts/generate-demo-data.mjs`) — incluyen ya carrusel de detalle de caso. Pendiente cargarlos contra Supabase real tras aplicar las migraciones nuevas.

---

## 2. Rediseño del formato de detalle — migraciones y código listos (10 sep)

**Implementado hoy: migraciones SQL + capa domain/application/infrastructure + ABM + motor de feed.** Sigue habiendo trabajo pendiente aparte — home real y plantillas públicas de detalle — pero eso era explícitamente el objetivo de la _siguiente_ sesión, no de esta. El editor de bloques (`content_block`) construido en agosto ya no existe: tabla, funciones RPC y toda la UI del ABM que dependía de él se han borrado (no dejado como código muerto).

**Los dos documentos de referencia siguen viviendo en la raíz del repo** (`especificacion-final-formato-detalle.md`, `contrato-zip-tools-insights.md`) — son la fuente de verdad del diseño; este apartado resume qué se implementó a partir de ellos.

**Resumen de lo implementado:**

- `case_template_variant` ya no existe — el formato se infiere de `content.type`, siempre.
- `page` ya no existe como concepto propio: renombrado a `other` (`ALTER TYPE content_type RENAME VALUE 'page' TO 'other'`), hereda su 5% de cuota en el feed sin tocar `feed_config`.
- `case_detail` ya no tiene `template_variant`/`sector`/`services`/`year`/`credits`/`links`. Se queda con `force` + `client`.
- `content_translation` gana `highlight` y `body` (traducibles, usados por caso/episodio).
- `episode` gana `episode_kind` (enum ampliable, arranca en `podcast`) — sin ABM propio todavía (nunca lo tuvo; fuera de alcance de hoy, igual que antes).
- `content` gana `cover_media_id` (portada de tool/insight/`other`; imagen únicamente en tool/insight, imagen o vídeo en `other`).
- Nueva tabla `case_detail_media` — carrusel de detalle de un caso, 1-N imágenes/vídeos mixtos, sin tope, tabla independiente de `pin_media`.
- `pin_type` (`fixed`/`animated`/`carousel`) ha desaparecido: hasta 8 medios por pin (imagen o vídeo ≤5 s mezclados) + flag `show_as_carousel` que decide si el feed lo muestra agrupado (una tarjeta con carrusel) o como N tarjetas independientes. El motor de feed (`constrainedMix`/`rotateQueue`/`generateRound`) no necesitó cambios: ya trataba cada pin como un id de texto opaco — el cambio real cayó en `modules/feed/infrastructure/supabaseFeedSource.ts`, que ahora expande un pin en 1 o N "unidades" seleccionables (`pin.id` o `pin.id::media.id`) según el flag.
- `pin.cta` ha desaparecido: el CTA del feed es fijo por tipo de contenido (`Use` tool, `Read` insight, `Watch` caso/episodio/`other`), calculado en `getFeedSessionBatch.ts`, no almacenado.
- `pin.label` pasa a opcional (antes `NOT NULL` sin condición): obligatorio salvo en caso/episodio, validado en `create_pin`/`update_pin` según `content.type`.
- `pin_ratio` gana `4:3` (faltaba en el enum — la especificación cierra la lista en 7 valores).
- Episodio se unifica con caso bajo `/work/[slug]` — antes tenía su propia ruta `/channel/[slug]` en el código del motor de feed.
- `/tools|insights/[slug]` deja de servir el HTML directamente: se mueve a `/tools|insights/[slug]/app`. La ruta sin `/app` queda reservada para la futura página de detalle tipo A (portada, summary, CTA) — todavía sin construir.

**Dos hallazgos de housekeeping, no relacionados con el rediseño, corregidos de paso:**

- `admin_allowed_domain` se referenciaba en RLS y en `seed.sql` pero ninguna migración la creaba — un `db push` contra un proyecto nuevo o CI fallaba ahí mismo. **La tabla real en Supabase está bien y ya tiene datos** (confirmado por Greener el 10 sep) — el hueco era solo la migración que la reproduce en un entorno nuevo. Migración correctiva con `create table if not exists`, con el esquema calcado exacto del real (incluido `created_at`, que la primera versión de esta migración se dejó fuera) — inofensiva en el proyecto real.
- `.prettierrc` no venía en el zip que se compartió para esta sesión — Finder no comprime ficheros ocultos por defecto, así que se perdió al exportar el proyecto. **No es un hueco real del repo**: Greener confirmó el 10 sep que el fichero existe en local con `{"semi": false, "singleQuote": true, "trailingComma": "all", "tabWidth": 2}`. Recreado con ese contenido exacto como `.prettierrc.json` — mismo efecto, formato JSON explícito en vez de `.prettierrc` a secas; quien tenga ambos en su copia local puede quedarse solo con uno, son equivalentes. De paso, añadido `.prettierignore` (`.next/`, `data/demo/feed-snapshot.json`, `supabase/.temp/`), que si no existía ya en local, sí es una adición nueva.

**Lo que sigue pendiente, tal como estaba previsto:**

- ABM: no hay formulario propio para editar los campos de `episode` (nunca lo hubo — fuera de alcance).
- Home real con el feed real (`/`).
- Plantillas públicas de detalle: `/work/[slug]` (tipo B), y el contenido de `/tools|insights/[slug]` (tipo A, la página envolvente con portada — hoy esa ruta no tiene `page.tsx`, solo existe `/app` con el HTML del paquete).
- El layout de columnas de recomendaciones (altura fija 66,7vh, ancho = altura × ratio, tope 83% del ancho útil) es puramente CSS/frontend — no tocado hoy, vive en la implementación de la home/detalle.

**Cuando se retome, el orden lógico ya no es el mismo que el 9 de septiembre** (migraciones y motor de feed ya están hechos): (1) home (`/`) consumiendo `/api/feed/sessions` real, (2) plantilla `/work/[slug]` (tipo B), (3) plantilla `/tools|insights/[slug]` (tipo A, portada + CTA hacia `/app`).

---

## 3. Cómo verificar todo esto tú mismo

```bash
npm install
npm run lint               # ESLint
npm run format:check       # Prettier — .prettierrc.json añadido el 10 sep con el contenido real que ya tenías en local (se había perdido al exportar el zip, Finder no comprime ocultos — ver §2); .prettierignore es nuevo de verdad
npx next build              # build de producción — genera también los tipos de ruta (.next/types). Necesita variables de entorno reales o de prueba (ver src/lib/env.ts); sin ellas falla en "Collecting page data", no antes.
npx tsc --noEmit             # TypeScript — hazlo DESPUÉS de next build/dev, si no da falsos positivos de LayoutProps
npm test                     # 330 tests (unit + property-based + smoke con jsdom)
node scripts/generate-demo-data.mjs   # regenera el dataset (determinista) — actualizado el 10 sep al esquema nuevo (incluye carrusel de caso)
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
- [ ] Crear `.env.local.example` real — marcado como hecho el 18 ago; no llegó en el zip de esta sesión, pero dado que también le pasó a `.prettierrc` (§2, oculto, Finder no lo comprime) es más probable que sea el mismo problema de exportación que un hueco real del repo. Sin confirmar todavía — pendiente de que Greener lo compruebe en local, igual que con `.prettierrc`.
- [x] Actualizar `src/lib/env.ts` a los nombres reales de variable (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) y hacer que `lib/supabase/{client,server,proxy}.ts` importen `env` en vez de leer `process.env` directo — **hecho el 18 ago**. Nota: el primer intento solo añadió el import sin sustituir los usos de `process.env.X!`, lo que dejaba 3 avisos de ESLint (`no-unused-vars`) y no resolvía el problema de fondo; corregido reemplazando `process.env.X!` por `env.X` en los tres archivos.
- [x] Corregir el import relativo de `src/app/auth/callback/route.ts` para usar el alias `@/*` — **hecho el 18 ago**.
- [x] `hd` en el login de Google — **decidido el 18 ago: no se añade**. Hay 3 dominios reales autorizados (`itsgreener.com`, `ffforward.ai`, `villamagia.com`); `hd` de Google solo admite un dominio o el comodín `*`, así que fijar uno solo sería engañoso en el selector de cuentas. La restricción real ya vive enteramente en `is_admin()` / `admin_allowed_domain`, sin cambios.
- [x] Insertar `ffforward.ai` y `villamagia.com` en `admin_allowed_domain` del proyecto Supabase real (`web-greener`) — **confirmado el 18 ago: ya están los 3 dominios en la tabla real**. El resto del esquema está creado (8 migraciones aplicadas) pero sin datos todavía, a la espera de la Fase 2 (ABM) y la carga de contenido real.
- [x] Añadir `supabase/.temp/` al `.gitignore` — **hecho el 18 ago**. Pendiente aparte, sin urgencia: confirmar si `supabase/config.toml` existe localmente y, si es así, versionarlo para que el resto del equipo pueda levantar Supabase local.
- [x] Decidir y cerrar con Greener: `'shop'` en `tag_section` — **cerrado el 18 ago**: se queda como hueco reservado para futuras actualizaciones (Shop podría reintroducirse más adelante).
- [x] Cerrar formalmente ADR-11 (70/15/5/5/5) con Greener — **cerrado el 18 ago**. Queda pendiente solo limpiar el comentario "provisional" de la migración SQL (housekeeping cosmético, no bloqueante).
- [ ] Confirmar con quien lleve el login del ABM el estado real de esa parte y añadir tests.
- [x] `admin_allowed_domain` referenciada en RLS/`seed.sql` pero sin migración que la creara — **corregido el 10 sep** (migración `create table if not exists`, esquema calcado del real, ver §2). La tabla real en sí siempre estuvo bien; solo faltaba la migración.
- [x] `.prettierrc.json`/`.prettierignore` — **corregido el 10 sep** (ver §2): el `.prettierrc` real existía en local pero no llegó en el zip de esta sesión (oculto, Finder no lo comprimió); recreado con el contenido exacto que confirmó Greener. `.prettierignore` sí es nuevo.

### 4.2 Fase 1 (hasta el 15 de agosto)

- [x] **Repertorio de bloques y restricciones de las variantes A/B/C de caso** (§11.3) — **resuelto el 9 sep sustituyendo el enfoque entero**, no ajustando el original (§2 de este documento), **e implementado el 10 sep** (migraciones + código + ABM). Ya no bloquea nada ni queda pendiente.
- [ ] Especificación de formatos para Greener (Anexo A.1) — ahora depende de implementar §2, no de una decisión de diseño pendiente.
- [~] Inventario de URLs actuales para las redirecciones 301 — catálogo de tools (9) e insights (4) confirmado por Greener el 18 ago (§2.11); falta el inventario del resto del sitio actual para completarlo.
- [ ] Ajustar el algoritmo de layout con el diseño real cuando esté disponible (breakpoints actuales: propuesta técnica confirmada fiel a §10.1, pendiente de validar por diseño).

### 4.3 Fase 2 (hasta el 1 de septiembre) — ABM base

- [x] Autenticación Google OAuth vía Supabase Auth — **confirmada y testeada el 7 sep** (§2.9), 20 tests nuevos. Middleware endurecido para cubrir también `/api/admin/*`.
- [x] CRUD de `content` y extensiones vía Server Actions + zod — **hecho (20-28 ago) y auditado con 95 tests el 7 sep** (§2.13, §2.14): borrador, edición, traducciones, case detail, e imagen/vídeo vía Cloudinary. El editor de bloques genérico que existía en esta línea se borró por completo el 10 sep, sustituido por el rediseño de formato (§2): cover media (tool/insight/`other`) y el carrusel de detalle de caso, que ya no queda pendiente.
- [x] Subida de pines: alta individual, luego carga masiva por CSV (§15.4, ~500 pines iniciales) — **alta individual el 9 sep** (§2.20): crear/editar/borrar, imagen, vídeo (5 s), hasta 8 medios por pin. **Carga masiva por CSV cerrada el mismo día** (§2.21): varios archivos + CSV opcional, tabla editable, subida secuencial con error por archivo sin tumbar el lote. **10 sep**: `pin_type` (fixed/animated/carousel) desaparece, sustituido por `show_as_carousel` — ver §2.
- [x] Subida de paquetes HTML (ZIP) con validaciones §12.5, sirviendo desde Supabase Storage real en vez de `fixtures/` — **hecho y testeado el 8 sep** (§2.18), completado del todo el 9 sep con el escaneo antivirus (§2.19): validación de estructura/zip-slip/symlinks/manifest, escaneo con Cloudmersive, versionado con publicación y rollback, `/insights/[slug]` construida de la nada junto con `/tools/[slug]`. Límite de 20 MB confirmado por Greener.
- [~] Estados `draft`/`scheduled`/`published`/`preview` + preview firmado — **`draft`/`scheduled`/`published` hechos y testeados el 7 sep** (§2.15): publicar ahora, programar, despublicar. **`preview` aplazado a la Fase 3 a propósito** (decisión del 7 sep): no hay plantilla pública sobre la que montarlo todavía. Pendiente aparte, sin resolver hoy: no existe mecanismo de publicación automática cuando llega la fecha programada (`publish_at`) — hace falta decidir cron externo vs. `pg_cron` en Supabase antes de que el primer contenido programado se quede esperando sin publicarse solo.
- [x] Cliente de Supabase browser/server extendido a `content`/`feed`/`media` — hecho como parte del CRUD (§2.13).
- [x] `/api/feed/sessions` real (§16.1): sustituye a `/api/feed/demo` — **hecho y verificado E2E contra Supabase real el 20 ago** (§2.12).

### 4.4 Fase 3 (hasta el 15 de septiembre)

- [ ] Home y subhomes con el feed real — **migraciones y motor de feed ya listos (10 sep, §2)**: `/api/feed/sessions` + `/api/feed/[sessionId]` ya devuelven pines multi-tarjeta con CTA calculado; falta construir la página `/` que los consuma.
- [ ] Página de caso — **migraciones y código de backend ya listos (10 sep, §2)**: `case_detail` simplificado, `case_detail_media` (carrusel) y su gestión en el ABM ya existen. Falta construir la plantilla pública `/work/[slug]` en sí. Especificación completa en `especificacion-final-formato-detalle.md` (raíz del repo).
- [ ] Restauración de scroll y semilla de sesión contra datos reales.
- [ ] Primeras métricas reales de LCP/CLS.

### 4.5 Fase 4 (hasta el 22 de septiembre)

- [~] Insights y Tools en producción sobre Supabase Storage real — **hecho el 8-9 sep** (§2.18, §2.19), adelantado respecto al calendario original de esta fase. **10 sep**: la ruta que sirve el HTML del paquete se movió de `/tools|insights/[slug]` a `/tools|insights/[slug]/app` (§2) — deja libre la ruta sin `/app` para la futura página de detalle tipo A. **Pendiente real, descubierto el 9 sep (noche) al escribir el contrato de tamaño para quien construye tools**: `/tools|insights/[slug]/app/route.ts` sirve siempre un viewport fijo hardcodeado (`1136×800`), no el tamaño real de pantalla del visitante — el propio código ya lo marcaba como placeholder desde el spike de Fase 0 (§12.3), pero no estaba explícito aquí como pendiente. No bloquea publicar tools hoy (documentado en `contrato-zip-tools-insights.md` §6, construir contra las variables CSS y no contra el número fijo evita tener que rehacer nada el día que esto se cierre) — pero si alguna tool necesita de verdad más de 1136×800 para verse bien, hoy no lo va a tener.
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
| Auditoría de embeds y cookies de terceros (Vimeo, Spotify)                              | Si hace falta banner de consentimiento antes de Channel | Abierto                                                                                                                                                       |
| Traducción asistida por IA en el ABM (opcional)                                         | Si se incluye en V1 o se deja fuera                     | Abierto, no bloqueante                                                                                                                                        |
| Mecanismo de publicación automática al llegar `publish_at` (cron externo vs. `pg_cron`) | Que el contenido programado se publique solo            | Abierto — no bloquea usar el ABM hoy (publicar/programar/despublicar manual funciona), pero bloquea que "programar" cumpla su promesa sin intervención humana |

Cerrada el 9 de septiembre (tarde): repertorio de bloques y restricciones de variantes A/B/C — resuelto sustituyendo el enfoque entero, no ajustándolo. Ver §2 de este documento y `especificacion-final-formato-detalle.md`.

Cerrada el 9 de septiembre: escaneo antivirus de los ZIP subidos (§12.5) — Cloudmersive, bloqueante, ver §2.19 del historial. Y el límite de tamaño del ZIP (Anexo A.1) — confirmados los 20 MB puestos como valor de partida.

Cerrada el 7 de septiembre: preview firmado (§15.3) — se aplaza a la Fase 3, cuando exista una plantilla pública real sobre la que montarlo (§2.15). No es una decisión de Greener, es una secuenciación técnica.

Cerradas el 18 de agosto: reasignación 5% Shop → Channel (ADR-11, 70/15/5/5/5); permanencia de `'shop'` en `tag_section` como hueco reservado (§2.3); alcance del dominio permitido en el ABM — **son 3 dominios reales, no uno**: `itsgreener.com`, `ffforward.ai`, `villamagia.com` (§4.1) — no sub-allowlist de contratistas, los 3 tienen el mismo nivel de acceso.

Cerradas el 19 de agosto: pesos/bitrates máximos de imagen y vídeo, y plan de Cloudinary — política de subida y almacenamiento recibida oficialmente (§2.6), confirma exactos los valores ya implementados (5 MB imagen, 100 MB / 3 min vídeo) y fija plan **Free** de Cloudinary, cuenta ya creada y verificada.

---

## 6. Historial de correcciones a este documento

Archivado junto con el resto del detalle de las Fases 0-2 — ver `historial-fases-0-2.md`. A partir de la entrada del 9 de septiembre sobre el archivado, las nuevas correcciones a este documento se registran aquí de nuevo.

- **9 sep 2026 (noche)**: aligerado este documento — el relato detallado de las Fases 0-2 (antes §2.1-§2.21) y el historial de correcciones hasta esta fecha se movieron a `historial-fases-0-2.md`. `PROGRESO.md` queda centrado en el estado actual, la planificación del rediseño pendiente de implementar, y el checklist de lo que falta. Nada de contenido se ha perdido, solo reorganizado.
- **10 sep 2026**: implementado el rediseño de formato de detalle planificado el 9 sep — 9 migraciones SQL nuevas, capa domain/application/infrastructure de `content`/`pin`/`media`/`feed` actualizada, editor de bloques borrado (tabla + funciones + UI), ABM adaptado y con gestores nuevos de cover media y carrusel de caso, rutas de tools/insights movidas a `/app`. 330 tests en verde, 0 errores de TypeScript/ESLint, build de producción limpio. De paso, corregida la migración de `admin_allowed_domain` que faltaba (la tabla real siempre estuvo bien) y recreado `.prettierrc.json` con el contenido real que Greener confirmó tener en local (se había perdido solo en el zip de esta sesión, no en el repo). Detalle completo en §2. Sigue pendiente, a propósito: home real y plantillas públicas de detalle (`/work/[slug]`, `/tools|insights/[slug]`) — ver §4.4.
