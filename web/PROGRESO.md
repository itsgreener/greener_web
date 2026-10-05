# Greener — Estado del proyecto y próximos pasos

Este documento resume el estado actual del repositorio `greener-web`, cómo verificarlo y qué queda pendiente. Complementa (no sustituye) el documento de **Arquitectura técnica V1.3**, que sigue siendo la fuente de verdad de las decisiones de diseño.

**El relato detallado del trabajo ya confirmado se archiva por separado, para que este documento se quede centrado en el estado actual y lo pendiente:**

- `historial-fases-0-2.md` — Fases 0-2: motor de feed, tools/insights sin iframe, esquema de Supabase, login del ABM, CRUD de content/media, estados editoriales, subida de paquetes HTML, escaneo antivirus, subida de pines. Archivado el 9 de septiembre de 2026.
- `historial-fases-3-4.md` — Fases 3-4: rediseño del formato de detalle, páginas públicas reales (home, `/work`, tipo A, Shell), panel de recomendaciones, verificación server-side de imágenes. Archivado el 23 de septiembre de 2026.
- `historial-fase-5.md` — Fase 5 (22 sep – 2 oct): cookies, preview firmado, analítica, despliegue con PM2, límite de peticiones, auditoría de estado y los cambios pedidos el día del lanzamiento (insights, tools, columnas, tipografías, episodios, contacto). Archivado el 5 de octubre de 2026.

Este documento (`PROGRESO.md`) sigue siendo el único sitio a mirar para saber «¿qué queda por hacer?»; los historiales son solo para el porqué de decisiones ya tomadas o el detalle de bugs ya cerrados.

**Cómo mantenerlo ligero (regla desde el 5 de octubre):** el detalle de un trabajo nuevo se escribe en el historial activo (`historial-fase-5.md`), con la siguiente numeración `§2.N` correlativa; aquí solo se añade **una fila al índice (§2)**, se actualiza el checklist (§4) y, si procede, el «Registro de cambios» (§6). Al cerrar una fase, el historial activo se cierra y se abre otro.

**Numeración de referencias.** Los `§2.N` que aparecen en este documento (checklist y registro) y en los comentarios del código («PROGRESO §2.16»…) son las secciones de **`historial-fase-5.md`**, que conservan su número; el índice de §2 los resuelve uno a uno. Las referencias `§X` sin más contexto apuntan al documento de arquitectura. Las citas «§4.8» son de la lista de pendientes del 28 de septiembre, que ya no existe (sus puntos están en §4.1-§4.4).

Sustituye a las versiones anteriores de `PROGRESO.md` y `CHECKLIST.md`. Actualízalo cuando cierres un bloque de trabajo real, no en cada commit menor; si algo que documenta deja de ser cierto, corrígelo aquí mismo en vez de dejarlo desactualizado.

Última revisión: 5 de octubre de 2026 (vídeos de demostración en las tools, §2.36; antes, reorganización de la documentación; el código y las cifras de §1 son los verificados el 2 de octubre ejecutando lint, `tsc`, tests, `next build`, `prettier` y `npm audit`).

---

## 1. Resumen ejecutivo

**Fases 0-4 completas** (motor de feed, ABM, Supabase con RLS, rediseño del formato de detalle, páginas públicas reales, panel de recomendaciones) y **Fase 5 completa** (22 sep – 2 oct: cookies, preview firmado, analítica, despliegue con PM2, límite de peticiones, auditoría de estado y cambios pedidos por Greener el día del lanzamiento). El sitio público sirve sus rutas principales (`/`, `/work/[slug]`, `/tools/[slug]`, `/insights/[slug]`, `/variety/[slug]`, `/contact`) con datos reales de Supabase. Lo que queda está en §4: las dos tareas prioritarias (vídeos de demostración en las tools y la prueba del formulario de contacto con el sitio en activo), los bloqueantes del despliegue real y la calidad pendiente.

**Cifras actuales, verificadas el 2 de octubre:**

- **924 tests automáticos, todos en verde** (`npm test`, 101 ficheros), verificado el 5 oct tras los vídeos de las tools. El zip que llegó el 5 oct traía 2 tests rojos en `tests/unit/contact/contact.smoke.test.tsx` (el título de `/contact` se rediseñó y el test seguía buscando «Contact» en el `h1`); corregidos el mismo día, el test ahora busca el título real del rediseño.
- **0 errores de TypeScript**, **0 errores ni avisos de ESLint**, **build de producción limpio**, **formato limpio** (`format:check`) y **`npm audit` sin vulnerabilidades**.
- **Next.js 16.3.8**, **Node 24.15.0** (`.nvmrc`), **42 migraciones SQL** (las 2 últimas, del 5 oct, **sin aplicar** todavía).

---

## 2. Índice de lo hecho — Fase 5 (22 sep – 5 oct)

Una fila por sección. **El detalle completo (qué, por qué, cómo se verificó) está en `historial-fase-5.md`, con el mismo número `§2.N`.**

| §    | Fecha     | Qué se hizo                                                                                                          |
| ---- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| 2.1  | 22 sep    | Dotfiles restaurados y formato normalizado en todo el repositorio.                                                   |
| 2.2  | 22 sep    | El ABM redirige a la edición completa justo después de crear un contenido.                                           |
| 2.3  | 22 sep    | Límites de caracteres Tipo A y Tipo B: contador blando en el ABM y recorte con elipsis en el frontend.               |
| 2.4  | 22 sep    | Verificación server-side de vídeo en Cloudinary (trabajo externo integrado).                                         |
| 2.5  | 22-23 sep | Auditoría de cookies: Vimeo sin `dnt` corregido y click-to-load para Vimeo y Spotify.                                |
| 2.6  | 23 sep    | Preview firmado del ABM (token HMAC sin estado); cierra §15.3 de la arquitectura.                                    |
| 2.7  | 23 sep    | Analítica Plausible («Pin Click») y resolución de un conflicto real de git.                                          |
| 2.8  | 28 sep    | Caché de assets de tools/insights corregida (ya no `immutable` bajo una URL no versionada) y contrato ZIP ampliado.  |
| 2.9  | 28 sep    | Despliegue `standalone`, metadatos, páginas 404/error y normalización de `SITE_URL`.                                 |
| 2.10 | 28 sep    | Despliegue real con PM2 y cron, tope de copia del proxy, hreflang y decisión sobre las redirecciones.                |
| 2.11 | 28 sep    | Cookies, opción A (sin banner); corregida una CSP que bloqueaba Plausible.                                           |
| 2.12 | 29 sep    | Integración de cambios externos: bug real de assets, tipos MIME ampliados y analítica.                               |
| 2.13 | 29 sep    | Escáner de dominios y validación estructural de `assets/` dentro del ZIP.                                            |
| 2.14 | 29 sep    | Rutas de demo bloqueadas en producción y menú lateral real en `/tools                                                | insights/[slug]/app`. |
| 2.15 | 29 sep    | «Tool Used» servidor a servidor (sustituido después, ver §2.18).                                                     |
| 2.16 | 29 sep    | Límite de peticiones al feed público, por visitante (cookie técnica anónima).                                        |
| 2.17 | 29 sep    | Integración de una segunda rama: ABM rediseñado, «Feed Depth» y un segundo «Tool Used».                              |
| 2.18 | 29 sep    | «Tool Used»: un solo mecanismo (script del paquete + `/api/analytics/package`).                                      |
| 2.19 | 30 sep    | Bug real: el límite de peticiones rompía el scroll de la home.                                                       |
| 2.20 | 2 oct     | Auditoría de estado y limpieza del repositorio; arreglado el `next build`, que fallaba por el campo `round`.         |
| 2.21 | 2 oct     | El pin de un insight abre directamente `/insights/{slug}/app`.                                                       |
| 2.22 | 2 oct     | Pie del pin de insight: título + «Insights by Greener» en negrita.                                                   |
| 2.23 | 2 oct     | El `summary` de tool/insight deja de truncarse con elipsis.                                                          |
| 2.24 | 2 oct     | Integración del zip compartido por Greener (portada de tool desde el pin, CTA del pin, `layout.ts`).                 |
| 2.25 | 2 oct     | CTA de la ficha de tool/insight anclado abajo a la derecha.                                                          |
| 2.26 | 2 oct     | Investigación: texto de la ficha limitado a una columna (implementada en §2.31).                                     |
| 2.27 | 2 oct     | Insights abiertos desde el detalle de una tool o un caso: causa y test de regresión.                                 |
| 2.28 | 2 oct     | Columnas 2/3/4/6 (6 desde 1200), versión de referencia de insights y test intermitente corregido.                    |
| 2.29 | 2 oct     | Reconciliación de `supabaseFeedSource.ts`: insights y tools con dos líneas en el pin.                                |
| 2.30 | 2 oct     | Tipografías: Helvetica Neue (general) y Kinder (título de caso y de contacto).                                       |
| 2.31 | 2 oct     | Texto de la ficha de tool/insight limitado a una columna.                                                            |
| 2.32 | 2 oct     | Pin de episodio: segunda línea «programa + tipo».                                                                    |
| 2.33 | 2 oct     | `npm audit fix`: Next.js 16.3.5 → 16.3.8, sin vulnerabilidades.                                                      |
| 2.34 | 2 oct     | Clase global `.text-body` para texto corrido.                                                                        |
| 2.35 | 2 oct     | Comprobación del formulario de contacto antes de publicar: 25 correctas y 3 problemas reales.                        |
| 2.36 | 5 oct     | Vídeos de demostración en las tools (en el flujo de pines), límites 8/15 s, reduced-motion y limpieza de Cloudinary. |

---

## 3. Cómo verificar todo esto tú mismo

```bash
npm install
npm run lint               # ESLint
npm run format:check       # Prettier
npx next build              # build de producción — genera también los tipos de ruta (.next/types). Necesita variables de entorno reales o de prueba (ver src/lib/env.ts); sin ellas falla en "Collecting page data", no antes.
npx tsc --noEmit             # TypeScript — hazlo DESPUÉS de next build/dev, si no da falsos positivos de LayoutProps
npm test                     # 835 tests (unit + property-based + smoke con jsdom)
npm audit                    # 0 vulnerabilidades desde el 2 oct (§2.33, en historial-fase-5.md)
node scripts/generate-demo-data.mjs   # regenera el dataset (determinista) — incluye alt del carrusel de caso desde el 14 sep
```

Para aplicar el esquema contra un proyecto Supabase real: `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push` (instrucciones completas en `supabase/README.md`, aunque ese fichero se quedó desactualizado en las migraciones que lista — la lista real y al día está en el historial de Fases 3-4).

Para cargar el dataset de demo contra un proyecto real: `supabase/seed_demo_data.sql` **no** lo aplica `db push` (no es una migración) — pégalo en el SQL Editor del dashboard o `psql -f supabase/seed_demo_data.sql` contra la cadena de conexión del proyecto. Las 6 imágenes del dataset son de la cuenta pública `demo` de Cloudinary, no de la vuestra — si `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` no es literalmente `demo`, esas imágenes concretas saldrán rotas. El dataset de demo **no incluye ninguna tool ni insight** — al visitar `/insights` o `/tools` contra este dataset verás "Todavía no hay contenido publicado en esta sección", no un error.

Para arrancar en local contra datos reales: `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDMERSIVE_API_KEY`, `CONTACT_SMTP_HOST`, `CONTACT_SMTP_PORT`, `CONTACT_SMTP_USER`, `CONTACT_SMTP_PASSWORD`, `CONTACT_EMAIL_TO`, `CONTACT_EMAIL_FROM` (formulario de contacto — sin ellas, `npm run dev`/`next build` fallan al arrancar), y opcionalmente `CONTACT_IP_HASH_SALT`, `NEXT_PUBLIC_SITE_URL` (usada por el link de preview, §2.6) y `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (nombres exactos en `src/lib/env.ts`) — `npm run dev` y abrir `/`.

---

## 4. Próximos pasos — checklist actualizado (2 de octubre de 2026)

Reorganizado el 2 oct: las antiguas fases por fecha (Fase 1 al 15 ago, Fase 5 del 26-30 sep…) ya están todas vencidas, así que el checklist se ordena ahora por **urgencia real**. Cruzado con el Anexo E del documento de arquitectura y con lo verificado ejecutando el código (§2.20). `[x]` hecho y verificado · `[~]` parcial o sin verificar del todo · `[ ]` pendiente.

Las referencias a «§4.8» que quedan en los historiales y en comentarios del código apuntan a la lista de pendientes del 28 sep, que ya no existe como tal: sus puntos se han redistribuido en §4.1-§4.4.

### 4.0 PRIORITARIO (añadido el 2 oct)

- [~] **Vídeos cortos de demostración en `/tools/{slug}`** (§2.36). **Implementado el 5 oct, pendiente de probar con datos reales.** El vídeo sustituye a la imagen de la ficha y entra por el flujo de pines (sin tabla ni sección nueva): 15 s / 15 MB en pines de tool, 8 s en el resto, no se anima en la home por encima de 8 s, mudo + bucle + botón de pausa, `reduced-motion`/`save-data`, `alt` obligatorio, sin analítica. Falta, por orden:
  1. **Aplicar las dos migraciones nuevas** (`20261005090000_pin_video_limits_by_content_type.sql` y `20261005091000_delete_pin_content_remove_orphan_media.sql`) con `npx supabase db push` **antes de desplegar el código**: sin la primera, el SQL antiguo sigue rechazando vídeos de más de 5 s; sin la segunda, borrar un pin sigue dejando filas de `media_asset`.
  2. **Probar en un navegador real** (no se ha hecho; jsdom no reproduce vídeo): subir un vídeo de ~6 s y otro de ~12 s a un pin de tool, ver que el de 6 s se anima en la home y el de 12 s se queda en poster, abrir ambos en `/tools/{slug}?pin=…` y comprobar autoplay mudo, bucle, botón de pausa, `prefers-reduced-motion`, un `.mov` y un vídeo con ratio que no encaje (debe salir el aviso del ABM).
  3. **Comprobar `image_metadata: true`** (candidato a arreglar la falta de `duration` de la Admin API; sin verificar): tras subir un vídeo, mirar el log del servidor; si **no** aparece «la Admin API no devolvió duration…», funciona y se puede quitar el `?? 10`; si aparece, hay que buscar otra vía. El `?? 10` sigue puesto.
  4. **Vigilar el consumo de Cloudinary Free** con las ~15 tools × ~3 vídeos: almacenamiento, ancho de banda de entrega y versiones derivadas de `f_auto`. Una mejora pendiente y barata: el feed reproduce hoy el original sin límite de ancho (`buildVideoFullUrl`); limitarlo con los anchos de feed reduciría el ancho de banda.
- [ ] **Ejecutar el reconciliador de Cloudinary** (§2.36): `node --env-file=.env.local scripts/reconcile-cloudinary.mjs` (simulación) y, si la lista es la esperada, repetir con `--delete`. Limpia la basura histórica que ya se había acumulado y lo que deje una subida interrumpida; conviene pasarlo de vez en cuando. Aún no se ha ejecutado contra Cloudinary y Supabase reales.
- [ ] **Probar el formulario de contacto con el sitio en activo.** Revisado de mi lado antes de publicar (§2.35: 25 comprobaciones correctas y 3 problemas reales). Pruebas a hacer en vivo, por orden:
  1. **Variables y base de datos de producción:** credenciales SMTP, `SUPABASE_SECRET_KEY`, `CONTACT_IP_HASH_SALT` propia y la migración `contact_submission` aplicada.
  2. **Un envío real de punta a punta:** que llegue a `hello@itsgreener.com` (en bandeja, no en spam), con el `Reply-To` del visitante y bien el remitente. Revisar SPF/DKIM/DMARC del dominio de `no-reply@itsgreener.com` y que el proveedor SMTP acepte ese remitente (muchos obligan a que coincida con la cuenta autenticada).
  3. **La IP real que entrega Dinahosting** (la misma comprobación que el punto 3 de `despliegue.md` §6): enviar desde dos redes (wifi y datos móviles) y comprobar en `contact_submission` que los `ip_hash` son **distintos**; si son todos iguales, el límite de 5 envíos/hora es de todo el sitio. Además, enviar con `curl -H "X-Forwarded-For: 1.2.3.4"` varias veces: si se esquiva el límite, el proxy no sobrescribe la cabecera (§2.35, punto 2).
  4. **El límite:** el 6º envío desde una IP se bloquea (cada envío de prueba consume cuota de esa IP durante una hora; se pueden borrar las filas `sent` de prueba).
  5. **La Server Action detrás del proxy** (sin 403 ni 500) y desde un **móvil real**.
  6. **El enlace «Privacy & Cookies policy»**, que hoy lleva a una página placeholder.
  - **Arreglos que salieron de la revisión (pendientes de aplicar; ordenados por impacto):**
    - [ ] Conservar lo escrito tras un error (hoy el formulario se vacía; §2.35, punto 1).
    - [ ] Leer la IP del proxy de confianza en vez del primer valor de `X-Forwarded-For`, que es falsificable (§2.35, punto 2); decidir tras ver qué hace Dinahosting.
    - [ ] Mensaje correcto cuando Supabase falla (hoy dice «demasiados mensajes»).
    - [ ] Unificar el idioma (etiquetas en inglés, mensajes en español) y traducir el error de nombre largo, que sale en inglés.
    - [ ] `autocomplete` y `maxlength` en los campos; `role="alert"` o `aria-live` en éxito y errores.
    - [ ] Retención de `contact_submission` y texto de privacidad (ya en §4.2).

### 4.1 Hoy, antes de apagar el sitio actual (bloqueantes de lanzamiento)

- [x] **`next build` en verde** — estaba roto por el campo `round` que faltaba en `FeedBatchResult` (§2.20). Corregido y con test. **Hay que desplegar desde este zip, no desde el del 1 oct.**
- [ ] **Supabase → Authentication → URL Configuration**: cambiar el _Site URL_ de `http://localhost:3000` a `https://itsgreener.com` y añadir las _Redirect URLs_ del dominio real (`https://itsgreener.com/auth/callback`). Sin esto el login del ABM en producción redirige a localhost.
- [ ] **Cliente OAuth de Google** (Google Cloud Console): añadir el origen y la URI de redirección de producción.
- [ ] **`.env.local` de producción**: confirmar `NEXT_PUBLIC_SITE_URL=https://itsgreener.com` (sin barra final), `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=itsgreener.com`, `CONTACT_IP_HASH_SALT` propia y `SUPABASE_SECRET_KEY` real.
- [ ] **Las tres comprobaciones del proxy de Dinahosting** (`despliegue.md` §6), que solo se ven desplegado: (1) subida de un ZIP de ~10 MB; (2) que las Server Actions funcionen tras el proxy; (3) que llegue la IP real del visitante (si no, el límite de 5 mensajes de contacto por hora se aplica al sitio entero).
- [ ] Confirmar el `HOSTNAME` que usa el proxy (127.0.0.1 o 0.0.0.0), que Node 24 vía nvm está activo para PM2 y contrastar el cron de reinicio que ya existe con el vigilante de `despliegue.md`.
- [ ] **Comprobar en navegador real, ya desplegado**, que Plausible recibe eventos (la CSP que lo bloqueaba se corrigió el 28 sep pero no se ha visto en producción) y recorrer `cookies-inventario.md` §6.
- [ ] **Textos legales en `/privacy`**: sigue siendo un placeholder (enlazado desde el menú y desde el formulario de contacto). Los aporta Greener; `cookies-inventario.md` recoge los hechos técnicos.
- [ ] **Carga real de contenido por Greener** contra el ABM (el dataset de demo no incluye ninguna tool ni insight; `/insights` y `/tools` salen vacías hasta entonces).
- [ ] **Insight Open tras el cambio de flujo (§2.21)**: decidir si se envía desde el servidor en `/insights/[slug]/app` (hoy no cuenta los clics del feed). Tampoco existe un «Insight Used»: la misma CSP que impide medir el uso de las tools impide medir el de los insights (§2.15), y un evento nuevo obliga a darlo de alta como objetivo en Plausible.
- [ ] Tras publicar: apagar las apps `tools.itsgreener.com` e `insight.itsgreener.com` (decidido sin 301) y, opcional, `site:` en Google para ver qué tenían indexado.

### 4.2 Primera semana tras el lanzamiento (riesgo real, arreglo corto)

- [ ] **Zip bomb**: el límite de 10 MB es sobre el `.zip` comprimido; `validateHtmlPackageZip` descomprime todo en memoria sin mirar el tamaño real. Comprobar `entry.header.size` antes de `getData()` y poner un tope total. Riesgo bajo (solo suben admins autenticados), arreglo barato.
- [ ] **Health check** (§19.2): no existe. Un `GET /api/health` que compruebe la conexión con Supabase basta, y permite que el cron/vigilante de PM2 compruebe algo más que «el proceso está vivo».
- [ ] **Limpieza de `feed_session`/`feed_round` caducadas**: nadie las borra (el único cron es el de publicación programada). El límite de peticiones frena el ritmo de crecimiento, no borra lo existente.
- [ ] **Retención de `contact_submission`** (§17.2): sin plazo definido ni purga; lo ideal es fijarlo junto con el texto de privacidad.
- [ ] **Observabilidad (§19.4) y CI (§19.2)**: no hay error tracking, logs estructurados ni alertas, y el zip no trae pipeline de CI (confirmar si existe fuera del repo).
- [ ] **Backups (§19.3)**: confirmar el plan de Supabase (copias diarias / PITR), la exportación periódica propia y la retención de Cloudinary antes de depender de ellas.
- [ ] **Límites del plan Free de Cloudinary** frente al volumen real (Anexo A.2): créditos de transformación y ancho de banda con ~500 pines, carruseles y posters.
- [ ] **ABM (§15.1) — módulos que faltan**: editor de `feed_config` con simulador de seed (§8.6), módulo de Acceso (`admin_allowed_domain`), Configuración y visor de `audit_log`. Hoy esas tablas solo se tocan por SQL. El dashboard, el listado y el editor de contenidos ya están rediseñados (§2.17). Redirecciones: descartado (§4.4).
- [ ] **Preview de una versión en borrador del paquete HTML**: `/app` solo lee la versión publicada, así que un admin no puede revisar un ZIP antes de publicarlo, y el botón «Use» de una tool en preview de contenido lleva a un 404.

### 4.3 Calidad: lo que el brief exigía y no está

- [ ] **Tests E2E de los criterios de aceptación críticos de §20.1** (misma seed → misma secuencia, recargar → seed nueva, volver desde un detalle conserva orden y posición…). Hoy hay 924 tests unitarios/de propiedad/de humo, ninguno de navegador.
- [ ] **Accesibilidad**: teclado, foco, contraste y menú solo-iconos con labels. `alt` de `case_detail_media` ya cerrado; falta el resto.
- [~] **`prefers-reduced-motion` y `save-data`/conexión lenta (§9.3)**: desde el 5 oct existe `useMotionPreferences` (§2.36) y lo usa **solo** el vídeo de la ficha de las tools. Siguen sin respetarlo el autoplay de los pines del feed y los carruseles.
- [ ] **`<html lang="en">` fijo** aunque haya contenido en es/ca.
- [ ] **`feed_config.video_limit_*` no se lee**: el límite 2/1 está fijo en `videoPlaybackCoordinator.ts` según el ancho (<640 px). O se conecta con la config, o se retiran las columnas y se dice en el ABM que no es editable.
- [ ] **Primeras métricas reales de LCP/CLS** con contenido real (solo medido con el dataset de demo).
- [~] **SEO**: hreflang verificado. Falta `<link rel="canonical">` autorreferente por versión de idioma, `x-default` y JSON-LD (`VideoObject`/`PodcastEpisode`, §18.1).
- [~] **Analítica (§18.2)**: disparados `Pin Click`, `Case Open`, `Tool Open`, `Insight Open`, `Episode Play`, `Feed Depth` (ahora sí con `round` real, §2.20) y `Tool Used` (un solo mecanismo, §2.18: depende de que cada tool llame a `window.GreenerAnalytics.toolUsed(action)` o dispare `greener:tool-used`; una tool que no lo haga mostrará cero usos). Sin cablear: `Newsletter Signup`, porque no hay newsletter.
- [x] CTA de la ficha de tool/insight anclado abajo a la derecha (§2.25).
- [~] **Contacto**: formulario real cerrado. **Mailchimp** (doble opt-in) sigue fuera a propósito, es un flujo aparte; si se quiere en la V1.0 del lanzamiento hay que decidirlo ya, porque arrastra el evento `Newsletter Signup`.
- [~] **Especificación de formatos para Greener (Anexo A.1)**: límites de caracteres cerrados (§2.3). Sin cerrar: ratios y dimensiones por breakpoint, códecs/bitrate de vídeo, contrato ZIP definitivo (`contrato-zip-tools-insights.md` cubre buena parte).
- [ ] **Tests del login del ABM**: confirmar con quien lo llevó el estado real y añadir tests (único punto abierto del antiguo «housekeeping»).
- [ ] **Masonry y diseño móvil con el diseño real**: en pausa por decisión de Greener (28 sep); ajustar `layout.ts` cuando llegue.
- [x] Texto de la ficha de tool limitado a una columna (§2.31).
- [ ] **Móvil: el texto de tool/insight mide 0 px** (§2.31): ya pasaba antes; necesita el rediseño móvil (apilar imagen y texto).
- [ ] **Revisar con diseño la imagen de tablet** (§2.31): con «texto = 1 columna» queda de ~1 columna en 640–899 de contenedor.
- [ ] **Tests de `?pin=`/`slide=`** de la ficha de tool (§2.24): `getToolPinCover` y el `slide` de `PinCard` no tienen cobertura.
- [ ] **Texto del `summary` largo y recomendaciones** (§2.23, §2.31): el panel de recomendaciones se siembra con la altura de la imagen, no con la del bloque imagen + texto. Con el texto limitado a una columna, un `summary` largo crece más en vertical y podría solaparse con la primera fila de recomendaciones. Con descripciones cortas no debería pasar; si aparece, medir el bloque real con un `ResizeObserver`.
- [ ] **Licencias de las tipografías** (§2.30): los metadatos de los OTF no traen texto de licencia (Helvetica Neue `fsType` 0, Kinder `fsType` 8). Confirmar que cubren uso web autoalojado y que convertirlas a WOFF2 y recortarlas está permitido.
- [ ] **Menú lateral de los documentos `/app` sin las fuentes nuevas** (§2.30): `composeToolDocument.ts` no define `font-family`, así que las etiquetas flotantes de ese menú no coinciden con las del Shell. Habría que servir las fuentes con una URL estable (`public/fonts`), porque las de `next/font` llevan hash.
- [ ] **Decidir si el admin conserva su tipografía anterior** (§2.30): hereda Helvetica Neue y sus pesos intermedios (650-900) se aplanan a Bold; aislarlo es una línea en el layout del admin.
- [ ] **Segunda línea del pin de episodio cortada** (§2.32): es de una sola línea con puntos suspensivos; «Brand into Europe Podcast» (~168 px) se corta en móvil y en una rendija de viewport de ~1296-1307 px. Salida: permitir dos líneas para episodios (CSS + estimación de altura en `useMasonryPositions` y `useRecommendationMasonry`).
- [ ] **Añadir `text-body` al párrafo del rediseño de contacto** (§2.34), en la copia de Greener.
- [ ] **Pin de tool sin descripción no pinta ningún texto** (§2.29) y el campo del ABM sigue llamándose «Frase gancho» aunque ahora es la descripción superior. El ABM la exige, así que solo pasaría con datos antiguos.
- [ ] **Documento de arquitectura §10.1 desactualizado** (§2.28): sigue diciendo 5 columnas entre 1200 y 1599; ahora la retícula es 2/3/4/6 con 6 desde 1200.

### 4.4 Cerrado o descartado a propósito (no reabrir sin motivo)

- [x] Redirecciones 301: no se harán, ni del sitio actual ni de las apps antiguas (28 sep). La tabla `redirect_301` se conserva sin uso.
- [x] Filtros por etiquetas: fuera de la V1 (28 sep). `tag`/`content_tag` y el parámetro `filter` de la sesión quedan sin usar.
- [x] Despublicar: inmediato (el detalle da 404 al instante).
- [x] Cookies: opción A, sin banner, click-to-load también en YouTube (§2.11).
- [x] Traducción asistida por IA en el ABM: aplazada a después de publicar.
- [x] Preview firmado del ABM (§2.6), caché de assets y contrato ZIP (§2.8), `standalone` y despliegue con PM2 (§2.9-§2.10), 404/error, sitemap, robots, favicon, rutas demo bloqueadas en producción (§2.14), límite de peticiones del feed y su bug del scroll (§2.16, §2.19), escáner de dominios y validación de `assets/` (§2.13), bug de assets 404 (§2.12).

### 4.5 Limpieza del repositorio (propuesta de §2.20, no ejecutada)

- [ ] Borrar los directorios vacíos `tools/[slug]/assets/` e `insights/[slug]/assets/` y `supabase/policies/`.
- [ ] Borrar los `.gitkeep` de carpetas que ya tienen ficheros, y las carpetas solo-`.gitkeep` que nunca se usaron (`components/case-blocks`, `lib/auth`, `lib/validation`, `lib/security`, `modules/admin`) — o decidir que se quedan como estructura prevista.
- [ ] Borrar `localPackageSource.ts` (y las dos referencias en comentarios).
- [ ] Quitar de `package.json` `next-cloudinary`, `react-hook-form`, `@hookform/resolvers` y revisar `@types/adm-zip`; regenerar `package-lock.json`.
- [ ] Implementar o eliminar `ADMIN_ALLOWED_DOMAIN_FALLBACK` (`env.ts` y `.env.local.example`).
- [x] `historial-fases-0-2.md`, `historial-fases-3-4.md`, `CLAUDE.md` e `INFORME_INCONSISTENCIAS.md`: existen en el repositorio (solo faltan en los zips compartidos); no hay nada que recuperar.
- [ ] Regenerar o eliminar `estructura-src.txt`; actualizar `supabase/README.md` y §1 de `contrato-zip-tools-insights.md`.
- [ ] No incluir `__MACOSX/`, `.DS_Store`, `tsconfig.tsbuildinfo`, `next-env.d.ts` ni `supabase/.temp/` al empaquetar.

---

## 5. Decisiones pendientes con Greener (Anexo A.2)

Ninguna depende de escribir código — bloquean trabajo posterior si no se cierran a tiempo.

| Decisión                                                   | Bloquea | Estado                                                                                                                            |
| ---------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Auditoría de embeds y cookies de terceros — nivel de rigor | Nada    | **Cerrado el 28 sep: opción A, sin banner** (§2.11). Se revisa si se añaden etiquetas de marketing o se prefiere un banner global |
| Traducción asistida por IA en el ABM (opcional)            | Nada    | **Aplazada a después de publicar**, si se hace (28 sep)                                                                           |

Decisiones ya cerradas: ver `historial-fases-0-2.md`, `historial-fases-3-4.md` e `historial-fase-5.md` (índice en §2).

---

---

## 6. Registro de cambios de este documento

Más reciente primero. El registro anterior (22 sep – 2 oct, ~15 KB) está archivado en `historial-fase-5.md`, sección «Historial de correcciones de `PROGRESO.md`».

- **5 oct 2026 (vídeos de las tools)**: añadida la fila §2.36 al índice y su detalle en `historial-fase-5.md`. §4.0: el ítem de vídeos pasa de `[ ]` a `[~]` con los 4 pasos que quedan (migraciones, navegador real, `image_metadata`, consumo de Cloudinary) y se añade el reconciliador; §4.3: `prefers-reduced-motion` pasa a `[~]`; §1: tests 835 → 924, todos en verde (corregido el test de `/contact`, que ya fallaba antes del cambio). La especificación de detalle (§1, §3 y §8) se corrige: una tool puede llevar un vídeo en lugar de la imagen.
- **5 oct 2026 (reorganización)**: `PROGRESO.md` pasa de 134 KB a unos 35 KB. El relato de las secciones §2.1-§2.35 y el registro de correcciones anterior se mueven, **sin reescribirlos**, al nuevo `historial-fase-5.md`; aquí queda un índice con una fila por sección, el checklist, las decisiones y cómo verificar. Rescatados al checklist (§4.1 y §4.3) ocho pendientes que solo estaban en el relato (solape del `summary`, licencias de las tipografías, menú de los documentos `/app`, tipografía del admin, línea de episodio cortada, `text-body` en contacto, pin de tool sin descripción, §10.1 de la arquitectura) y la nota sobre «Insight Used».
