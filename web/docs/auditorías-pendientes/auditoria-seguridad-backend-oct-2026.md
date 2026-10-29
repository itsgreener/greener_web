# Auditoría de seguridad del backend — web completa (admin + pública) · 23 oct 2026

Informe único que sustituye a los dos informes por zonas (el del backend de `/admin` y el del backend público). Es una auditoría de solo lectura: no se ha modificado ningún fichero del proyecto. Busca problemas de seguridad, vectores de ataque y código desorganizado o muerto. Los identificadores llevan prefijo de zona: **SEC-ADM-** (backend del ABM), **SEC-PUB-** (backend público) y **SEC-X-** (transversales, que afectan a las dos). Los tests propuestos son **SEC-T**. Los identificadores del informe del admin se conservan tal cual; tres de ellos (B1, G1 y G4) afectan también a la zona pública y han pasado a transversales como SEC-X-2, SEC-X-4 y SEC-X-3, por eso en la zona admin faltan esos números. Severidad: **Alta**, **Media**, **Baja** o **Info**. Prioridad: **M** (merece hacerse) o **B** (mejora menor).

## 1. Resumen

No hay ningún hallazgo de severidad Alta: no se ha encontrado una forma de leer ni escribir datos del ABM sin sesión de admin, ni de leer datos personales de talent sin el enlace personal. Lo que hay son huecos de defensa en profundidad, límites de abuso que se esquivan con facilidad, una frontera de origen más débil de lo que dice la documentación (los paquetes comparten origen con el ABM), dos faltas de higiene operativa en el admin (no hay cierre de sesión; el registro de actividad solo cubre talent) y deuda de organización.

| Zona | Alcance | Hallazgos | Media | Baja | Aplicados |
|------|---------|-----------|-------|------|-----------|
| Admin | `/admin`, `/api/admin/**`, las 35 Server Actions, el callback de OAuth y los módulos `media`, `packages`, `talent`, `audit`, `pin`, `content` que usan | 17 | 6 | 11 | 0 |
| Pública | `/api/feed`, `/api/analytics`, `/api/health`, `/api/talent`, las Server Actions de contacto y newsletter, las seis rutas de paquetes, `robots`, `llms.txt`, la CSP global y las trampas de bots | 10 | 2 | 8 | 0 |
| Transversales | Lo que afecta a las dos | 4 | 2 | 2 | 0 |
| **Total** | | **31** | **10** | **21** | **0** |

Lo más relevante, por este orden:

1. **Los paquetes (tools, insights, variety) se ejecutan en el mismo origen que el ABM (SEC-X-1).** Las cookies de sesión del admin se pueden leer desde JavaScript y la documentación de arquitectura da por hecho lo contrario. Un paquete con una librería comprometida podría tomar la sesión de un admin que lo abra.
2. **Los assets `.html` y `.svg` de un paquete se sirven sin CSP (SEC-PUB-B1)**, así que saltan la política que se aplica al documento principal.
3. **Los límites del feed se esquivan sin cookie (SEC-PUB-A1).** Comprobado: 60 de 60 peticiones sin cookie pasan; con cookie fija se cortan. Cada `POST /api/feed/sessions` anónimo escribe en la base de datos.
4. **No existe cierre de sesión (SEC-ADM-A1)**, y las cookies de sesión duran 400 días por defecto.
5. **Las páginas del ABM y las lecturas de talent dependen solo del proxy (SEC-ADM-A2).** Talent usa la clave secreta de su proyecto, sin RLS.
6. **El registro de actividad solo recoge talent (SEC-ADM-F1).**
7. **Cualquier POST anónimo puede obligar al servidor a recibir hasta 20–25 MB (SEC-X-2).**

## 1 bis. Estado de aplicación (27 oct 2026)

Primer lote aplicado: fases S1 a S4 del plan de ataque, todo lo que no necesitaba una decisión de Greener ni una capa nueva. Cada punto lleva su test.

| Hallazgo | Qué se ha hecho | Test |
|----------|-----------------|------|
| SEC-ADM-A1 | Cierre de sesión en el menú del ABM (`signOutAction`, `signOut({ scope: 'local' })`, sin guard a propósito) | `signOutAction.test.ts`, `adminShell.test.tsx` |
| SEC-X-1a | Cookies de sesión `httpOnly`, `secure` en producción y vida máxima de 7 días (`sessionCookies.ts`, aplicado en `server.ts` y `proxy.ts`) | `sessionCookies.test.ts`, `supabaseCookieHardening.test.ts` (SEC-T9) |
| SEC-ADM-A3a | El callback de OAuth comprueba `is_admin()` y, si no lo es, cierra la sesión y devuelve a `/admin/login?error=unauthorized` | `authCallback.test.ts` |
| SEC-ADM-A4 | `isAdminRoute` única y a prueba de variantes (`/admin%2f`, `/admin;x`…), compartida con el proxy | `adminRoute.test.ts`, `proxy.test.ts` (SEC-T3) |
| SEC-PUB-B1, B2 | CSP y `nosniff` en los assets `.html` y `.svg`; HSTS, `nosniff` y `Referrer-Policy` también en 304, 404 y 503; `frame-ancestors`, `base-uri`, `form-action` y `object-src` en el documento | `packageSecurityHeaders.test.ts` (SEC-T7, T8), `packageRoutes.test.ts` |
| SEC-PUB-B1 (decisión 7) | La subida rechaza `.html` y `.htm` secundarios | `zipExtraHtml.test.ts` |
| SEC-ADM-D2 (decisión 2) | El enlace de preview dura 24 h (antes 7 días) | `previewToken.test.ts` |
| SEC-ADM-B3 (decisión 4) | El redirect de CV solo admite `https` | `talentAdminDomain.test.ts` |
| SEC-ADM-E1 (decisión 5) | `Permissions-Policy` con las capacidades sensibles cerradas y `Cross-Origin-Opener-Policy: same-origin` en `/admin` y `/api/admin`; `Cross-Origin-Resource-Policy: same-origin` también en `/admin` y `/api/admin` (añadida el 28 oct, cuarto lote; no afecta a las páginas públicas ni a los paquetes) | `securityHeaders.test.ts`, `proxy.test.ts` |
| SEC-ADM-B2, C1, C2, G3, SEC-X-3, SEC-X-4, SEC-ADM-A6 | `isUuid` en las acciones de paquetes y preview; tiempos máximos en Cloudmersive y Cloudinary; comprobación del tamaño antes de descargar de Cloudinary; `env` en lugar de `process.env` en la analítica; comentario de `serviceClient`; tipos sin uso y `createPinAction` eliminados (X-4: las funciones `allowsThirdParties`, `getFirstPinMedia` y `pickDetailWidth`, que solo usan sus tests, se dejan hasta decidir si se van a usar) | tests de cada fichero |
| SEC-ADM-D1 | `APP_SIGNING_SECRET` obligatoria en producción (`getSigningEnv`) y propósito (`cursor`/`preview`) en la firma | `signedToken.test.ts`, `serverEnv.test.ts` |
| SEC-ADM-A2, A5 | `requireAdminPage()` en las tres páginas de talent; sesión de admin con el email incluido y memoizada por petición | `adminSession.test.ts`, `adminGuardStructure.test.ts` |
| SEC-ADM-F1 | Corregido: la base ya anota contenidos, pines, medios y paquetes; se añade `preview_link` (el enlace no toca la base). Sin evento de login (lo guarda Supabase Auth) | `previewActionsUuid.test.ts` |
| SEC-PUB-C2 | El enlace personal de talent caduca a los 7 días (`access_token_expires_at`, renovada en cada reenvío); caducado = inexistente | `supabaseTalentRepository.test.ts`, `talentRows.contract.test.ts`, `registerCandidate.test.ts`, `talentAdminUseCases.test.ts` |
| SEC-T1, T2, T4 | Tests estructurales: guard en cada Server Action de admin y en cada ruta de `api/admin` (como primer `await`), y lista cerrada de importadores de `createServiceClient` | `tests/unit/security/adminGuardStructure.test.ts`, `serviceClientImporters.test.ts` |
| SEC-PUB-C1 | Los cuerpos de talent se leen contando bytes y se cortan al pasar el tope (`readBodyWithLimit`): JSON con `Content-Length` ausente o falso, y subida de ficheros del formulario. El techo efectivo sigue siendo el del proxy hasta S5 | `boundedBody.test.ts`, `talentRoutes.test.ts` |
| SEC-PUB-A3 | A `contact_submission.error` solo llega un código corto (`mailFailureCode`, p. ej. `ETIMEDOUT`, o `unknown`); el texto de nodemailer queda solo en el log del servidor | `submitContactForm.test.ts` |
| SEC-ADM-G5 | Los 32 `console.error` de `src/app/admin` pasan a la forma `Admin · <función>:` con el error como segundo argumento | revisión; cubierto por la suite |
| SEC-X-2 (parte del ZIP) | Subida directa del ZIP de paquetes a Storage con URL firmada; el cuerpo de la acción ya no lleva el fichero (límite de ~4,5 MB de Vercel). Los CV de talent no la necesitan: el tope baja a 3,5 MB (límite real del antivirus gratuito, §2.116), que cabe bajo el de Vercel | `stagedUpload.test.ts`, `supabasePackageUploadStaging.test.ts`, `packageUploadDirect.test.tsx`, `packageActions.test.ts` |
| SEC-PUB-A1 (S5) | Los límites del feed, la analítica, talent y la newsletter cuentan en un almacén compartido (Upstash Redis por REST, claves hasheadas con sal, caducidad automática) con respaldo en memoria si falla. El feed cuenta además por IP (60 sesiones y 300 lotes por minuto), solo acepta cookies de visitante de 1-64 caracteres `[A-Za-z0-9_-]` y limita su memoria de sesiones a 10.000 entradas. Sin las variables de Upstash todo sigue como antes y el arranque avisa (§2.117) | `sharedRateLimiter.test.ts`, `upstashRest.test.ts`, `feedRateLimit.test.ts`, `visitorCookie.test.ts`, `serverEnv.test.ts` |
| SEC-X-2 (topes) | `serverActions.bodySizeLimit` 5 MB y `proxyClientMaxBodySize` 6 MB (antes 20 y 25). El ZIP ya no viaja por una Server Action; el CV del ABM, 3,5 MB, sí | `packageSizeLimits.test.ts` |
| SEC-PUB-A2 | Sin cambios: el contacto ya cuenta sus envíos en Supabase (compartido por construcción); el coste de escribir una fila por intento queda aceptado y vigilado | — |
| SEC-ADM-D2 (revocación) | Botón «Revocar enlaces» en el ABM: `content.preview_revoked_at` + función `revoke_content_preview_links` (con registro `preview_revoke`), token con `issuedAt` y comprobación al abrir el preview antes de leer con privilegios. Cabeceras `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer` y `X-Robots-Tag` en las páginas con `?preview=`. Migración `20261029100000` (§2.118) | `previewRevocation.test.ts`, `previewToken.test.ts`, `resolvePreviewContext.test.ts`, `revokePreviewLinksAction.test.ts`, `proxyPreviewHeaders.test.ts` |
| Hallazgo 9 de «no verificado» | Ruta repetida en el ZIP: rechazo claro en lugar del error genérico. Además, aviso específico cuando se ha comprimido la carpeta del paquete en vez de su contenido (§2.119) | `zipValidation.test.ts` |
| SEC-PUB-A4 (health) | `GET /api/health` limita a 30 llamadas por minuto y por IP (almacén compartido; sin IP legible no se limita) y responde 429 antes de tocar la base | `healthRoute.test.ts` |
| Subidas huérfanas en `_incoming/` | Limpieza semanal (`/api/cron/cleanup-staging`, Vercel Cron, `CRON_SECRET`): borra las subidas de más de 24 h con la forma exacta de una subida preparada | `sweepStagedUploads.test.ts`, `supabaseStagedUploadSweeper.test.ts`, `cleanupStagingRoute.test.ts`, `bearerSecret.test.ts` |
| Restos del Finder en el ZIP | `__MACOSX/` y `.DS_Store` se descartan antes de validar (no cuentan para topes ni checksum ni se publican) | `zipValidation.test.ts` |
| SEC-X-1a (PKCE) | Las cookies del verificador PKCE del login viven 10 minutos y llevan `Secure` (adaptador `browserCookies.ts`); no pueden ser `HttpOnly` porque las crea el navegador | `browserCookies.test.ts` |
| SEC-ADM-A3b | Revisadas las políticas de las migraciones: ninguna se restringe por rol (`to authenticated`), así que un usuario autenticado que no sea admin no lee más que el público. `admin_all` va siempre con `is_admin()`; la lectura pública solo ve filas `published`, `ready` o `active`, y `tag`, `content_tag` y `feed_config` son de lectura abierta; `audit_log`, `feed_session` y `feed_round` son solo de admin; en Storage solo `html-packages` admite escritura, y solo de admin. Pendiente solo apagar el proveedor Email (ver §4.2 de PROGRESO) | lectura de `supabase/migrations/*.sql` |

Queda para los lotes siguientes (decisiones de Greener del 29 oct, §2.119 y §2.120): SEC-X-1d (paquetes en un subdominio, tras migrar el DNS a Cloudflare), SEC-ADM-C1 (pendiente de si se mantiene Cloudinary) y SEC-PUB-A5 (pendiente de comprobar con tráfico real). Cerrados el 29 oct: SEC-ADM-G2 (descartado: el test estructural ya garantiza la guarda), SEC-ADM-G3 (hecho en el segundo lote) y SEC-PUB-A4 (el puerto de PM2 deja de aplicar en Vercel; el límite de `/api/health` está hecho). SEC-PUB-C2 (caducidad del enlace de talent) está hecha en código y espera a que Greener ejecute el SQL de `docs/operaciones/talent-puesta-en-marcha.md` §4.6. Las comprobaciones externas de S0 se hicieron con Greener y están cerradas (RLS en todas las tablas, ninguna política de escritura abierta a `anon`, crons activos, `/ADMIN` da 404, cabeceras y cookies de la preview, Anonymous apagado); el proveedor Email de Supabase Auth queda apagado (Greener, 28 oct). SEC-PUB-C1 queda cortado en las rutas de talent y el techo del proxy baja a 6 MB (§2.117); antes el proxy aceptaba hasta 25 MB antes de que la ruta cuente nada.

## 2. Qué se ha comprobado y cómo

1. **Admin.** Lectura del código de las rutas, las 35 Server Actions, el proxy, la sesión, los clientes de Supabase, los módulos de media, packages, talent y audit, las cabeceras de seguridad y la validación de entorno. Un script recorrió todos los `*actions.ts` de `src/app/admin`: 35 funciones exportadas en 17 ficheros, todas `async` y con `'use server'`. En 34 el primer paso es `isAdminRequest()` o `getAdminActor()`; en `discardUploadedMediaAction` primero se valida con zod (sin efectos) y la comprobación llega antes de cualquier operación.
2. **Pública.** Lectura de las ocho rutas `route.ts` públicas (`feed/sessions`, `feed/[sessionId]`, `analytics/package`, `health`, `talent/candidates`, `talent/form/[token]`, `talent/form/[token]/files`, `talent/purge`), las Server Actions de contacto y newsletter, las seis rutas de paquetes, `robots.ts`, `llms.txt`, la CSP global, las trampas de bots, y los módulos `feed`, `contact`, `newsletter`, `talent` (alta, formulario, límites) y `packages` (servicio de HTML y assets, tipos de contenido). Búsquedas con scripts de `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `target="_blank"` sin `noopener`, redirecciones, `process.env`, exports sin uso y cobertura de auditoría.
3. **Pruebas empíricas** en una copia aislada del proyecto (carpeta temporal, `next dev` con credenciales falsas, sin conexión real a Supabase). El original no se tocó. Resultados en los apartados 4.1 y 4.2.

Limitaciones (ver apartado 10): las migraciones SQL no están en el zip, así que **RLS, `is_admin` y las políticas de Storage no se han podido revisar**; tampoco está la carpeta `public/`; no se han ejecutado los tests del proyecto; no se ha probado ninguna operación autenticada ni ningún camino que necesite la base de datos real.

## 3. Lo que ya está bien

### 3.1 Admin

1. **Las 35 acciones comprueban la sesión al entrar** (auditoría del 8 oct, P0-1) y hay test que lo cubre para parte de ellas.
2. **Fallo cerrado.** `checkAdminSession` devuelve «no admin» ante cualquier excepción; el proxy responde 401/403 en JSON para `/api/admin` y redirige las páginas; las rutas repiten la comprobación como segunda barrera.
3. **Identificadores sacados de la base de datos, no del navegador.** Borrar un medio de Cloudinary usa el `public_id` guardado (`snapshotMedia`), nunca el que mande el cliente; el CV se resuelve por ids y se firma 60 s; la ruta de bucket se valida contra `uploads/` sin `..`.
4. **Auditar antes de abrir datos personales.** `/api/admin/talent/cv` registra el evento y, si no puede, no abre el fichero.
5. **Validación con zod en las acciones**, uuid donde toca, y errores traducidos con `adminErrorMessage` en lugar de volcar el error de Postgres al navegador.
6. **ZIP de paquetes bien defendido:** límites de entradas y tamaños declarados antes de descomprimir, bomba de descompresión que miente tratada como rechazo, zip-slip, symlinks, imagen OG verificada por contenido, antivirus bloqueante que falla cerrado, y documentos de paquete servidos con una CSP propia (aunque en el mismo origen, ver SEC-X-1).
7. **CV del personal con las mismas barreras que el formulario público:** extensión y contenido real, antivirus, ruta generada en servidor (`uploads/<uuid>.<ext>`), limpieza del objeto si falla la fila.
8. **Comparaciones en tiempo constante** (`timingSafeEqual`) en tokens firmados y en el secreto de purga; el secreto de purga exige 32 caracteres.
9. **`safeNextPath`** en el callback (bloquea `//` y `/\`) y redirección construida desde `NEXT_PUBLIC_SITE_URL`.
10. **Entorno validado por ámbitos** (Cloudinary, Cloudmersive, talent…) y claves legacy de Supabase rechazadas para talent.
11. **Cabeceras:** CSP con nonce y `strict-dynamic`, HSTS, nosniff, `Referrer-Policy: strict-origin-when-cross-origin`. Las respuestas de `/admin` llevan `Cache-Control: no-store` (comprobado).
12. **Timeouts en n8n, Mailchimp y Plausible** (`AbortSignal.timeout`): el patrón existe; los huecos están en SEC-ADM-C2.
13. **Los eventos de analítica ignoran `/admin` y `/auth`** y los previews no cuentan como apertura.
### 3.2 Pública

1. **Un formulario, una respuesta.** La newsletter responde lo mismo para alta nueva, pendiente de confirmar y ya suscrito (no se puede averiguar quién está en la lista); el alta de talent responde `{ ok: true }` exista o no el email; un token inexistente y uno mal formado dan el mismo 404.
2. **Honeypots que no delatan** en contacto, newsletter y talent: el bot recibe el mismo éxito y no se ejecuta nada.
3. **Contacto bien montado.** Validación con zod, HTML escapado en el correo, `replyTo` al email validado, la IP se guarda solo como hash con sal, y si no se puede comprobar el límite se rechaza (falla cerrado).
4. **Talent con tres llaves de límite.** Por IP (hash), por cookie de visitante y por email, con topes distintos para alta, lectura, guardado y subida. Solo se aceptan peticiones `same-origin` (`sec-fetch-site`), se exige `application/json`, y los CV pasan por extensión, contenido real y antivirus, con ruta generada en servidor. La purga solo responde con el secreto configurado (sin secreto: 503, comprobado).
5. **Feed con cursor firmado.** HMAC con `timingSafeEqual`, atado a la sesión (otro `sessionId` da 400), uuid comprobado antes de tocar Postgres, `size` limitado a cuatro dígitos y nunca mayor que el tamaño configurado, errores genéricos.
6. **Analítica de paquetes sin confianza en el cliente.** Slug y acción con patrón estricto, el id real del contenido se resuelve en servidor, `sec-fetch-site`, limitador por IP y tiempo máximo de 5 s hacia Plausible.
7. **CSP global estricta.** Nonce y `strict-dynamic`, `'unsafe-eval'` solo si `isDev`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, HSTS y `nosniff`. Comprobado en las rutas `/api/**`.
8. **Sin sumideros de XSS.** No hay `dangerouslySetInnerHTML`, `innerHTML`, `eval` ni `new Function` en todo `src/`; los enlaces con `target="_blank"` llevan `rel="noopener"`.
9. **Trampas de bots y sondas** (`/wp-admin`, `.env`, `.php`, la ruta señuelo) responden 404 y solo registran, con tope de 60 líneas por minuto.
10. **IP del visitante bien resuelta** detrás del proxy de Dinahosting (último valor de `X-Forwarded-For`, comprobado con el proveedor el 14 oct).
11. **Servicio de paquetes con cuidado.** Comprobación de `..` en la URL de los assets, distinción 404 / 503 con `Retry-After`, ETag por checksum y `Cache-Control: no-cache`.
12. **`/api/health`** no da detalles, no se cachea y responde 503 si no llega a la base.

## 4. Pruebas empíricas

### 4.1 Prueba empírica del proxy del admin (resultado)

Copia aislada, `next dev` 16.4.2, sin sesión. Estado y destino devueltos:

| Petición | Resultado |
|----------|-----------|
| `/admin`, `/admin/contents`, `/admin/../admin`, `/./admin`, `/%2e/admin`, `/admin%2f`, `/admin;x`, `/admin%00` | 307 → `/admin/login` |
| `/administrator` | 307 → `/admin/login` (SEC-ADM-A4) |
| `/%61dmin`, `/%61dmin/contents`, `/api/%61dmin/…`, `/api/Admin/…` | 404 (Next no los resuelve como `/admin`; no hay bypass) |
| `/api/admin/media/sign` (POST), `/api/admin/talent/cv?candidate=x` | 401 `{"error":"No autenticado"}` |
| `/ADMIN`, `/Admin` | 500 en la copia (cae en la ruta pública por slug y la base de datos falsa no responde; no es un fallo de seguridad, ver apartado 10) |
| POST anónimo con `Next-Action` falso, 18 MB | Aceptado y leído entero: 400 a los 1,7 s |
| Mismo POST, 30 MB | Rechazado en 0,05 s |

Conclusión: las variantes de ruta habituales no saltan el proxy, y el tamaño máximo anónimo es el de `proxyClientMaxBodySize` (25 MB).

### 4.2 Prueba empírica de las rutas públicas (resultado)

Misma copia aislada, sin base de datos real (el 500 de algunas filas es la capa de datos fallando, no un fallo de la ruta).

| Petición | Resultado |
|----------|-----------|
| 60 × `GET /api/feed/<uuid>` **sin cookie**, en paralelo | Las 60 llegan a la capa de datos: ninguna se limita (SEC-PUB-A1) |
| Las mismas 60 con `Cookie: greener_visitor=fixed-not-a-uuid` | 50 llegan a la capa de datos y 10 reciben 200 con `rateLimited`; la cookie con un valor que no es uuid se acepta |
| `GET /api/feed/not-a-uuid` | 404, con CSP, HSTS, `nosniff`, `Referrer-Policy` y `Set-Cookie: greener_visitor=…; HttpOnly; SameSite=lax`; sin cabeceras CORS |
| `/wp-admin/x`, `/.env`, `/x.php`, `/internal/client-list` | 404 |
| `POST /api/talent/candidates` sin `Content-Type`; con `Sec-Fetch-Site: cross-site`; con `{}` y `same-origin` | 415 `unsupported_media_type`; 403 `forbidden`; 400 `invalid` con `fieldErrors` |
| `GET /api/talent/form/zzz` | 404 `not_found` |
| `POST /api/analytics/package`: cross-site; slug `../x`; slug válido sin `action` | 403; 400 `slug inválido`; 400 `action inválida` |
| 70 POST a analítica sin `X-Forwarded-For` | 57 pasan, 13 reciben 429 |
| 70 POST a analítica con `X-Forwarded-For` distinto en cada uno | Pasan los 70 (sin proxy delante, el cliente fija la cadena; detrás de Dinahosting el último valor lo añade el proxy; SEC-PUB-A4) |
| `POST /api/talent/purge` sin secreto configurado | 503 `not_configured` |
| `GET /tools/x/app/assets/a.js` con Storage inaccesible | 503 con `Retry-After`, **sin ninguna cabecera de seguridad** (el proxy salta estas rutas; SEC-PUB-B2) |
| `GET /robots.txt` | Lista `/admin`, `/api/`, `/auth` y la ruta señuelo (decisión ya tomada; ver apartado 10) |

Conclusión: las defensas de formato y origen de las rutas públicas funcionan como describe el código; los límites del feed no resisten a un cliente que no devuelva la cookie, y las rutas de paquetes quedan fuera de las cabeceras globales.

## 5. Hallazgos del backend de `/admin`

### 5.1 A. Autenticación y autorización

**SEC-ADM-A1 · Media · M — No hay cierre de sesión.**
Evidencia: `grep signOut` en `src/` no devuelve nada; el `AdminShell` no tiene botón de salida. Las cookies de sesión de `@supabase/ssr` 0.12.7 se crean por defecto con `maxAge` de 400 días y legibles desde JavaScript (ver SEC-X-1); la sesión solo termina al expirar el refresh token.
Vector: equipo compartido o robado; cualquiera con el navegador abierto sigue siendo admin.
Propuesta: una Server Action `signOutAction` (con `supabase.auth.signOut()` y `redirect('/admin/login')`) y un botón en `AdminShell`. Test: tras la acción, `checkAdminSession` devuelve falso.

**SEC-ADM-A2 · Media · M — Las páginas del ABM y las lecturas de talent dependen solo del proxy.**
Evidencia: `app/admin/layout.tsx` y `(panel)/layout.tsx` no comprueban nada; `talentAdminQueries.ts` pasa directamente a `supabaseTalentAdminRepository`, que usa la clave `sb_secret_` del proyecto de talent y por tanto **no tiene RLS**. Las páginas de contenidos sí caen detrás de RLS (cliente con la sesión del usuario), pero talent no.
Vector: cualquier fallo futuro del proxy (cambio de matcher, error en `isAdminRoute`, regresión de Next; ha habido fallos de bypass de middleware en versiones anteriores de Next) deja a la vista nombres, emails y CVs de candidatos.
Propuesta: una capa de acceso a datos. Un `requireAdmin()` que lance si `checkAdminSession` falla, llamado al principio de cada función de `talentAdminQueries` (y de `resolveCvLink`). No basta con el layout: Next no vuelve a renderizar los layouts en cada navegación. Coste: una llamada por consulta; ver SEC-ADM-A5 para no multiplicar RPC.

**SEC-ADM-A3 · Media · M — El callback concede sesión a cualquier cuenta de Google.**
Evidencia: `app/auth/callback/route.ts` hace `exchangeCodeForSession` y redirige; no comprueba `is_admin`. La comprobación llega después, en el proxy.
Vector: una cuenta cualquiera obtiene una sesión `authenticated` en Supabase. Con la clave publishable, esa sesión puede llamar a PostgREST y a Storage directamente; lo que pueda ver o escribir depende **solo de las políticas RLS para el rol `authenticated`**, que no se han podido revisar.
Propuesta: (a) en el callback, tras el intercambio, llamar a `checkAdminSession` y, si no es admin, `signOut` y volver a `/admin/login?error=...`; (b) verificar con un test contra la base real (o con la migración) que un usuario `authenticated` sin `is_admin` no lee ni escribe nada que no sea público. Es la comprobación más importante que queda abierta.

**SEC-ADM-A4 · Baja · B — `isAdminRoute` usa `startsWith('/admin')`.**
Evidencia: `proxy.ts`; en la prueba, `/administrator` redirige al login del ABM.
Vector: ninguno (falla cerrado), pero trata como ABM rutas que no lo son y esconde a una futura página pública `/administracion` o `/admin-…`.
Propuesta: `pathname === '/admin' || pathname.startsWith('/admin/')`, y lo mismo para `/api/admin`. Añadir a `tests/unit/admin/proxy.test.ts` la tabla del apartado 4.1.

**SEC-ADM-A5 · Baja · B — Comprobaciones de sesión repetidas.**
Evidencia: `getAdminActor` llama a `checkAdminSession` (getClaims + `rpc('is_admin')`) y luego a `getClaims` otra vez. En `/api/admin/talent/cv`: `adminApiGuard` (1 getClaims + 1 rpc) + `getAdminActor` (2 getClaims + 1 rpc) + el proxy (1 getClaims + 1 rpc): hasta 4 `getClaims` y 3 `rpc('is_admin')` por petición.
Propuesta: que `checkAdminSession` devuelva también el email (ya sale de las claims) y que `getAdminActor` no vuelva a pedirlo; memoizar por petición con `React.cache`. Es un requisito previo para meter SEC-ADM-A2 sin encarecer las consultas.

**SEC-ADM-A6 · Baja · B — `createPinAction` es un endpoint vivo sin consumidor.**
Evidencia: nadie en `src/` la importa; solo la usan `pinActions.test.ts` y `editorLock.test.tsx`. Las acciones que usa la UI son `createPinWithImageAction` y `createPinWithVideoAction`.
Vector: una Server Action exportada es un POST público aunque no la use ninguna pantalla; hoy está protegida, pero es superficie que mantener.
Propuesta: borrarla y su test, o documentar por qué se conserva.

### 5.2 B. Entradas

**SEC-ADM-B2 · Baja · B — Dos acciones aceptan un id sin validar como uuid.**
Evidencia: `uploadHtmlPackageAction` (`contentId`: cualquier string no vacío) y `generatePreviewLinkAction` (`id`). El resto usa `z.uuid()`.
Impacto: ninguno explotable; en la subida, la consulta de la última versión falla por el tipo `uuid` antes de escribir en Storage. Pero la ruta de Storage se forma con ese valor (`${contentId}/v${n}/…`), y es mejor que el esquema lo impida.
Propuesta: `z.uuid()` en las dos, como en las demás.

**SEC-ADM-B3 · Baja · B — `externalCvUrl` redirige a cualquier http(s) guardado en `file_path`.**
Evidencia: `talentCvLocation.ts` acepta cualquier `http:`/`https:`; `resolveCvLink` lo devuelve y `/api/admin/talent/cv` responde 302 a esa URL.
Vector: solo si un valor ajeno llega a `file_path` (hoy lo escribe n8n y las filas antiguas del formulario viejo). Entonces el ABM actuaría de redirección abierta con la confianza del dominio de Greener.
Propuesta: redirigir solo a `https` y, si se quiere ir más lejos, a los hosts de Drive/Docs; el resto se muestra pero no se enlaza. Comprobar antes que ningún campo del formulario público pueda acabar en `file_path`.

### 5.3 C. Subidas y servicios externos

**SEC-ADM-C1 · Baja · B — La subida a Cloudinary se verifica después, no antes.**
Evidencia: `createSignedUpload` firma solo `{timestamp, folder}`; `verifyCloudinaryImageAsset` descarga `secure_url` entero a memoria y valida tipo y tamaño sobre los bytes, sin comparar antes `resource.bytes` con el tope.
Impacto: solo un admin obtiene firmas, así que es un riesgo de coste o de error, no de intrusión: se puede subir un original enorme a Cloudinary y el servidor lo bajará antes de rechazarlo.
Propuesta: comprobar `resource.bytes` y el formato antes de descargar; valorar restringir formatos en la firma (comprobar en la documentación de Cloudinary qué parámetros se pueden firmar; el tope de tamaño suele vivir en el upload preset).

**SEC-ADM-C2 · Baja · B — `fetch` sin tiempo máximo en Cloudmersive y en la verificación de Cloudinary.**
Evidencia: `cloudmersiveVirusScan.ts` y `cloudinaryServer.ts` no usan `AbortSignal.timeout`; n8n (`N8N_TIMEOUT_MS`), Mailchimp y Plausible sí. El comentario de Cloudmersive dice que se rechaza si el servicio «tarda demasiado», pero no hay nada que lo haga cumplir.
Impacto: una subida de ZIP o de CV queda colgada hasta el tope del servidor. Sigue fallando cerrado.
Propuesta: `AbortSignal.timeout` con una constante por servicio, como en n8n, y un test.

### 5.4 D. Tokens y secretos

**SEC-ADM-D1 · Media · M — `APP_SIGNING_SECRET` es opcional y cae a la clave de servicio.**
Evidencia: `lib/env.ts` lo declara opcional (en producción solo avisa); `signedToken.ts` usa `APP_SIGNING_SECRET ?? SUPABASE_SECRET_KEY`. El HMAC no lleva contexto: cursor del feed y token de preview se distinguen solo por la forma del payload.
Impacto: con el respaldo, la clave que salta RLS firma también tokens que viajan en URLs; rotar una obliga a rotar la otra. Y un token de un tipo podría aceptarse como otro si algún día los payloads coincidieran.
Propuesta: exigirlo en producción (`superRefine` en el esquema) y mezclar un propósito en la firma (`preview:`/`cursor:`). Invalida los enlaces vigentes (cursores 24 h, previews 7 días): asumible.

**SEC-ADM-D2 · Media · B — Enlaces de preview de 7 días, no revocables.**
Evidencia: `previewToken.ts` firma `{contentId, expiresAt}`; la URL es `${siteUrl}${path}?preview=${token}`. Con ese token, `resolvePreviewContext` lee con cliente de servicio.
Impacto: el borrador queda accesible 7 días para quien tenga el enlace, aunque Greener lo haya compartido por error. El token puede acabar en el historial, en capturas, en los logs de acceso del proxy (PM2/Dinahosting guardan la URL con query). La analítica no cuenta el preview, pero **no se ha verificado** si el script de Plausible envía la URL completa con la query.
Propuesta: caducidad más corta y configurable (decisión de Greener), posibilidad de revocar (un contador `preview_epoch` por contenido incluido en el token, o rotar la clave), y `Cache-Control: private, no-store` en las respuestas con `?preview` (la página de caso ya añade `noindex` a los borradores).

### 5.5 E. Cabeceras

**SEC-ADM-E1 · Baja · B — Faltan `Permissions-Policy`, `Cross-Origin-Opener-Policy` y `Cross-Origin-Resource-Policy`.**
Evidencia: `lib/securityHeaders.ts`.
Propuesta: `Permissions-Policy` restrictiva (cámara, micrófono, geolocalización fuera) en todo el sitio, teniendo en cuenta que los embeds de terceros necesitan `autoplay` y `fullscreen`; COOP `same-origin` en `/admin`. Test con el de cabeceras existente.

### 5.6 F. Registro de actividad

**SEC-ADM-F1 · Media · M — El registro de actividad solo cubre talent.** *(Corregido el 28 oct: con las migraciones a la vista, la base ya anota los cambios de contenido, pines, medios y paquetes; solo faltaba el enlace de preview, ya anotado. Ver §1 bis.)*
Evidencia: `recordAuditEvent` aparece en `talent/actions.ts` (6 usos) y en `/api/admin/talent/cv`; los otros 15 ficheros de acciones (crear, editar, publicar y borrar contenidos, pines, carruseles, traducciones, paquetes, generar enlace de preview, descartar subidas) no registran nada. Tampoco hay evento de inicio de sesión.
Impacto: ante «¿quién borró este caso?» o «¿quién generó este enlace?» no hay respuesta, y el enlace de preview da acceso a contenido sin publicar.
Propuesta: eventos mínimos sin datos personales (acción, entidad, id, actor): `content.create/update/publish/unpublish/delete`, `pin.delete(_all)`, `package.upload/publish/delete`, `preview.link`, `auth.login`. `recordAuditEvent` ya no lanza, así que no rompe ninguna acción. Para no repetir 20 líneas, un envoltorio `withAudit` (ver SEC-ADM-G2).

### 5.7 G. Código muerto y organización

**SEC-ADM-G2 · Baja · B — La misma plomería en 35 acciones.**
Evidencia: 35 guardas `if (!(await isAdminRequest())) return …` y 31 `console.error(error)` casi idénticos; el formato del resultado (`{ error }`, `{ formError }`, `{ ok:false }`) cambia de fichero en fichero.
Propuesta: un envoltorio `adminAction(handler)` que haga la guarda, capture y registre el error y (opcional) escriba la auditoría. Tiene dos ventajas de seguridad: la guarda deja de depender de que cada autor se acuerde, y el test estructural (SEC-T1) se reduce a «toda acción exportada pasa por el envoltorio». Es una refactorización mayor; no urge.

**SEC-ADM-G3 · Baja · B — Comentario desactualizado en `serviceClient.ts`.**
Evidencia: el comentario enumera como usos permitidos `feed_session`/`feed_round`, el preview y el calentamiento de vídeos. El cliente de servicio lo importan hoy además `serviceAuditRecorder`, `contactSubmissionLog`, `supabaseStorageSource` (paquetes) y el contenedor de talent (clave propia).
Propuesta: actualizar la lista, y proteger la lista real con un test (SEC-T4).

**SEC-ADM-G5 · Baja · B — Registro de errores heterogéneo.**
Evidencia: las acciones de contenido hacen `console.error(error)` sin contexto; talent y media usan prefijo (`'Talent: …'`, `'Audit: …'`). En PM2 cuesta filtrar.
Propuesta: prefijo de acción en el envoltorio de SEC-ADM-G2.

## 6. Hallazgos del backend público

### 6.1 A. Abuso y límites

**SEC-PUB-A1 · Media · M — Los límites del feed dependen de una cookie que fija el cliente.**
Evidencia: `getOrCreateVisitorId` devuelve el valor de `greener_visitor` tal cual (cualquier cadena, sin comprobar que sea un uuid) o un uuid nuevo si no hay cookie; `canCreateSession` y `canFetchBatch` cuentan por ese valor. Un cliente que no devuelve la cookie (curl, un script) es un visitante distinto en cada petición. Prueba (apartado 4.2): 60 de 60 peticiones sin cookie llegaron a la capa de datos; con una cookie fija se cortaron las 10 últimas tras 50. Cada `POST /api/feed/sessions` inserta una fila en `feed_session` con la clave de servicio, y el primer lote de cada ronda ejecuta el algoritmo contra todo el catálogo (lo dice el propio `feedRateLimit.ts`).
Vector: escritura anónima e ilimitada en la base de datos y carga de CPU y consultas. Además `lastSessionByVisitorAndScope` guarda una entrada por (cookie, scope) durante 24 h: con cookies rotatorias crece sin tope práctico, porque la purga solo borra por antigüedad. El diseño asume que el limitador es para «amortiguar ruido», pero la petición sin cookie se salta incluso eso.
Propuesta, dentro de lo ya decidido el 14 oct (sin pedir cabeceras de navegador al feed): añadir como llave el hash de la IP (`hashClientIp(clientIpFromHeaders(request.headers))`, como ya hace talent con `ipKey`), exigir uuid válido en la cookie (si no lo es, se trata como visitante nuevo), y poner un tope de entradas a los dos mapas. Comprobar que `feed_session` caduca y se purga: en el código no se ve y puede ser una tarea de base de datos. Con varios procesos PM2 el límite en memoria se multiplica (ya documentado).

**SEC-PUB-A2 · Baja · B — El formulario de contacto escribe en la base de datos en cada intento.**
Evidencia: en `submitContactForm`, el honeypot, el límite superado y el fallo de envío ejecutan `log.record(...)`, un INSERT con clave de servicio por petición; el límite de 5 por hora cuenta solo los envíos `sent`, y cada intento válido hace además una consulta de recuento.
Vector: un bot que rellene el honeypot o supere el límite escribe una fila por petición y hace crecer la tabla. Aparte, el límite por IP solo frena 5 correos por hora y por IP: un enjambre distribuido llenaría la bandeja de Greener (no hay captcha, solo honeypot). Es aceptable mientras no haya tráfico raro, y conviene vigilarlo.
Propuesta: un limitador en memoria delante del registro (el de `botTraps.ts` ya limita a 60 líneas por minuto) y, si aparece spam distribuido, decidir una barrera adicional (Turnstile u otra) solo entonces.

**SEC-PUB-A3 · Baja · B — El mensaje de error del SMTP se guarda en la base de datos.**
Evidencia: `submitContactForm` pasa `error.message` a `log.record(ipHash, 'failed', …)` y acaba en la columna `error` de `contact_submission`.
Impacto: no llega al navegador (la respuesta es genérica), pero el texto de nodemailer puede incluir el host o la respuesta del servidor SMTP, y queda en una tabla que se lee con clave de servicio.
Propuesta: guardar un código de fallo, o cortar el texto a una longitud corta; revisar las filas que ya existan.

**SEC-PUB-A4 · Baja · B — Las defensas por IP suponen que el origen solo se alcanza por el proxy.**
Evidencia: `clientIpFromHeaders` usa el último valor de `X-Forwarded-For` (comprobado con Dinahosting). Prueba (apartado 4.2): sin proxy delante, 70 POST con `X-Forwarded-For` cambiante pasaron los 70 por el limitador de analítica. Lo mismo valdría para el límite de contacto (5 por hora) y los de talent por IP.
Impacto: si el puerto de PM2 se pudiera alcanzar directamente (IP del servidor y puerto), cualquiera esquivaría todos los límites por IP.
Propuesta: comprobar desde fuera que ese puerto no responde, y si el proxy no lo garantiza, aceptar solo conexiones desde el proxy (cortafuegos) o una cabecera secreta que el proxy añada, si Dinahosting lo permite. De paso: `/api/health` hace una lectura a la base por llamada, sin caché ni límite; barato, pero anónimo.

**SEC-PUB-A5 · Baja · B — Cada visita a un paquete descarga el HTML y los assets de Storage.**
Evidencia: `getStoragePackage` y `getStoragePackageAsset` cachean la fila de versión (`unstable_cache`), pero el HTML se baja con `downloadFile` (clave de servicio) y se recompone con cheerio en cada GET; los assets se bajan enteros salvo que el navegador mande un `If-None-Match` válido. No hay limitador.
Vector: GET anónimos repetidos, con cabeceras de caché ignoradas, consumen transferencia de Storage y CPU.
Propuesta: cachear el HTML compuesto por checksum de versión (la misma estrategia del ETag), `max-age` corto para el HTML y un limitador por IP en las rutas de assets.

### 6.2 B. Paquetes (tools, insights, variety)

**SEC-PUB-B1 · Media · M — Los assets `.html`, `.htm` y `.svg` de un paquete se sirven sin CSP en el mismo origen.**
Evidencia: `packageFiles.ts` da `text/html` y `image/svg+xml` a esas extensiones; `buildAssetResponse` solo pone `ETag`, `Cache-Control` y `Content-Type`; las rutas `/…/app/assets/**` están fuera del proxy y no heredan la CSP global; la CSP restrictiva viaja únicamente en la respuesta del documento principal; `zipValidation` no restringe extensiones (solo escanea el texto de las de código). La respuesta de error de esas rutas no lleva ninguna cabecera de seguridad (apartado 4.2).
Vector: un paquete con un `assets/x.html`, o un SVG con `<script>`, abierto por su URL directa ejecuta scripts en línea y sin límite de `connect-src`, en el origen del sitio, saltándose el «sin scripts inline» del contrato. Requiere un ZIP hostil o con una dependencia comprometida; junto con SEC-X-1 es el camino más corto hasta la sesión de un admin.
Propuesta: en `buildAssetResponse`, `X-Content-Type-Options: nosniff` siempre y `Content-Security-Policy: default-src 'none'; sandbox` para `html`, `htm` y `svg` (la CSP de un recurso solo importa cuando se abre como documento: no afecta a un SVG cargado con `<img>`); y valorar rechazar `.html/.htm` secundarios en la validación del ZIP, porque el contrato solo exige `index.html`. Probar con una tool y un insight reales antes de publicar.

**SEC-PUB-B2 · Baja · B — La CSP del documento del paquete es incompleta y las cabeceras solo van en el 200.**
Evidencia: el literal `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self'; img-src 'self' data:;` está copiado en tools, insights y variety, y no define `base-uri`, `form-action`, `frame-ancestors` ni `object-src 'none'` (de esas, las tres primeras no heredan de `default-src`). HSTS y `Referrer-Policy` se ponen a mano en el 200 y faltan en 404, 503, 304 y en todos los assets.
Impacto: la tool puede enmarcarse desde otro sitio (clickjacking) y un formulario inyectado puede enviar a cualquier URL. El contrato dice que no hay iframes. El `<base href>` lo inyecta el servidor (`composeToolDocument`), así que `base-uri 'self'` es compatible.
Propuesta: una constante compartida con la CSP actual más `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`, aplicada también a las respuestas de error (ver SEC-PUB-D1). Probar con los paquetes publicados: la regla de no mezclar con la CSP global se mantiene.

### 6.3 C. Talent público

**SEC-PUB-C1 · Baja · B — Los topes de tamaño de talent se comprueban después de leer el cuerpo.**
Evidencia: `readJsonBody` mira `Content-Length` (0 si falta, como con `Transfer-Encoding: chunked`) y luego lee `request.text()` entero; mide `text.length` (caracteres, no bytes); `files/route.ts` hace lo mismo con `formData()`.
Impacto: el techo real es el del proxy (25 MB), no el de talent. Se resuelve del todo con SEC-X-2.
Propuesta: leer el flujo con un contador de bytes y cortar al pasar el tope, y medir con `Buffer.byteLength`.

**SEC-PUB-C2 · Baja · B — El enlace personal de talent es un UUID en la URL sin caducidad.**
Evidencia: `GET /api/talent/form/[token]` devuelve nombre, email, teléfono, redes, tarifas y proyectos a quien tenga el token, y el token solo deja de valer cuando se purga al candidato. Hay límite por IP (120 cada 10 minutos) y 122 bits de entropía.
Impacto: un enlace reenviado, copiado a un chat o guardado en los registros del proxy abre esos datos personales indefinidamente.
Propuesta: caducidad del token (el plazo, con el asesor legal, junto con la retención que ya existe) y `Referrer-Policy: no-referrer` en la página que aloja el formulario.

### 6.4 D. Código desorganizado

**SEC-PUB-D1 · Baja · B — Seis rutas gemelas para servir paquetes.**
Evidencia: `tools|insights|variety/[slug]/app/route.ts` (61–69 líneas, iguales salvo el tipo) y sus tres `assets/[...file]/route.ts` (39 líneas, idénticas salvo el tipo); la CSP y las cabeceras están copiadas tres veces. Coincide con TSX-PUB-C1 del informe de componentes.
Propuesta: un helper `servePackageDocument(kind, slug)` y otro `servePackageAsset(kind, …)` en `lib/http`. Es la condición para arreglar SEC-PUB-B1 y SEC-PUB-B2 en un solo sitio, así que conviene hacerlo antes.

## 7. Hallazgos transversales

**SEC-X-1 · Media · M — Los paquetes corren en el mismo origen que el ABM y las cookies de sesión se leen desde JavaScript.**
Evidencia: (1) `/tools|insights|variety/[slug]/app` se sirven en el origen del sitio, sin iframe ni `sandbox` (arquitectura §12.1), y el navegador envía las cookies de `/admin` a cualquier ruta del mismo origen; (2) `@supabase/ssr` 0.12.7 crea las cookies de sesión con `httpOnly: false` y `maxAge` de 400 días (`dist/main/utils/constants.js`), y el proyecto no las sobrescribe (`lib/supabase/server.ts` y `proxy.ts` pasan `options` tal cual); (3) el cliente de navegador solo se usa en el login; (4) la CSP del paquete bloquea `fetch` y balizas a otros dominios, pero no la navegación (`location = …`), y deja llamar al propio sitio, incluidas las Server Actions y `/api/admin` (`connect-src 'self'`); (5) el §12.4 de la arquitectura dice que las rutas públicas «nunca incluyen esas cookies»: es verdad del lado servidor, pero el navegador sí las manda.
Vector: JavaScript de un paquete (código propio con una dependencia comprometida, o un ZIP manipulado) que se ejecute en el navegador de un admin con la sesión abierta puede leer los tokens de sesión o invocar acciones del ABM. El modelo de amenaza del §12.1 («administrador único de confianza») cubre el ZIP, no las librerías que lleva dentro, y ni el escaneo de dominios ni el antivirus las detectan. Con SEC-PUB-B1 la CSP se puede esquivar.
Propuesta, de menos a más cambio: (a) marcar las cookies de sesión como `httpOnly` en el `setAll` de `lib/supabase/server.ts` y de `proxy.ts` (el navegador no las necesita; probar el login: la cookie del verificador PKCE la crea el navegador y no se toca); (b) cerrar sesión (SEC-ADM-A1) y acortar la vida de la sesión; (c) arreglar SEC-PUB-B1 y B2; (d) servir los paquetes desde otro origen (un subdominio) o añadir `sandbox allow-scripts allow-downloads` a la CSP del documento, lo que rompería `localStorage`, los `Worker` del propio origen y los `fetch` a los assets propios salvo que se añada CORS: es una decisión de arquitectura que habría que probar con tools reales. (a), (b) y (c) son baratas y reducen mucho el riesgo.

**SEC-X-2 · Media · M — Cuerpos de hasta 20–25 MB para cualquier POST anónimo.** *(antes SEC-ADM-B1)*
Evidencia: `next.config.ts` fija `serverActions.bodySizeLimit: '20mb'` y `proxyClientMaxBodySize: '25mb'`; la prueba del apartado 4.1 lo confirma (18 MB anónimos, leídos antes de responder). Los ids de las Server Actions viajan en los chunks públicos de `/_next/static`, así que no son secretos. En `uploadHtmlPackageAction` y `uploadStaffCvAction` el `FormData` se parsea antes de llegar a `isAdminRequest()`. En la zona pública afecta a las acciones de contacto y newsletter (que necesitan unos pocos KB), a `POST /api/feed/sessions` (`request.json()` sin tope propio) y a las rutas de talent (SEC-PUB-C1).
Vector: consumo de memoria, CPU y ancho de banda sin autenticar. El limitador en memoria protege otros endpoints, no este.
Propuesta, de menos a más cambio: (a) tope en el proxy inverso (Dinahosting) para los POST; (b) mover la subida de ZIP y de CV a rutas `api/admin/**` con `adminApiGuard` antes de leer el cuerpo y bajar `bodySizeLimit` a 1–2 MB; (c) mantener todo y aceptar el riesgo. Es decisión de Greener: (b) obliga a tocar dos formularios y sus tests (`packageSizeLimits.test.ts` guarda la relación actual entre límites).

**SEC-X-3 · Baja · B — `process.env` leído fuera de `env.ts`.** *(antes SEC-ADM-G4)*
Evidencia: `app/auth/callback/route.ts` (`NEXT_PUBLIC_SITE_URL`) y `app/api/analytics/package/route.ts` (`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`); además `NODE_ENV` se lee en seis sitios (`analytics.ts`, la ruta de analítica, `newsletterActions.ts`, `visitorCookie.ts`, `proxy.ts`) con la misma condición de producción.
Propuesta: pasar las dos variables por `env` como el resto, para que la validación las cubra, y exportar un `isProduction` único.

**SEC-X-4 · Baja · B — Exports sin consumidor en producción.** *(antes SEC-ADM-G1; cubre todo `src/`)*
Evidencia (con búsqueda en `src` y `tests`): tipos sin ningún uso (`TextLimitField`, `MediaAsset`, `NewsletterInput`, `PinImageUpload`, `SignupInput`) y funciones que solo usan los tests (`allowsThirdParties`, `getFirstPinMedia`, `pickDetailWidth`), además de `createPinAction` (SEC-ADM-A6). `resetEditorLockForTests` es un ayudante de test legítimo. Otros 150 exports que solo se usan dentro de su fichero son en su mayoría tipos públicos de módulo y no se proponen para borrar.
Propuesta: borrar los cinco tipos y las tres funciones con sus tests si ya no representan comportamiento deseado.

## 8. Tests que impedirían que vuelva a pasar

1. **SEC-T1 · Guarda en toda Server Action.** Recorrer `src/app/**/*actions.ts`, y por cada función exportada comprobar que el primer `await` es `isAdminRequest`/`getAdminActor` (o que pasa por el envoltorio de SEC-ADM-G2). Hoy `adminGuard.test.ts` cubre 3 de 35. Sigue el patrón de `tests/unit/architecture/useServerExports.test.ts`.
2. **SEC-T2 · Guarda en toda ruta de `api/admin`.** Cada `route.ts` bajo `src/app/api/admin` importa y llama a `adminApiGuard` antes de leer la petición.
3. **SEC-T3 · Tabla de rutas del proxy.** Los casos del apartado 4.1 como filas de `proxy.test.ts`.
4. **SEC-T4 · Lista cerrada de importadores de `createServiceClient`.** El test falla si aparece un fichero nuevo, para que alguien lo revise.
5. **SEC-T5 · Cobertura de auditoría.** Una acción de las que cambian datos sin `recordAuditEvent` falla, salvo lista explícita de excepciones.
6. **SEC-T6 · El limitador del feed cuenta las peticiones sin cookie.** Dos peticiones sin cookie desde la misma IP comparten cubo, y una cookie que no es uuid se trata como visitante nuevo.
7. **SEC-T7 · Cabeceras de las seis rutas de paquetes.** El documento (200, 404, 503) y los assets llevan `nosniff` y HSTS, y el documento lleva `frame-ancestors`, `base-uri` y `form-action`.
8. **SEC-T8 · Un asset `.html` o `.svg` sale con `Content-Security-Policy` y `nosniff`.**
9. **SEC-T9 · Las cookies de sesión de Supabase salen `httpOnly`.** Sobre el `setAll` de `server.ts` y de `proxy.ts`.

## 9. Orden de ataque propuesto

1. **Sin decisiones y de bajo riesgo:**
   SEC-ADM-A1 (cierre de sesión), SEC-X-1a (cookies `httpOnly`), SEC-ADM-A3a (comprobar admin en el callback), SEC-PUB-A1 (llave por IP y cookie uuid), SEC-PUB-D1 seguido de SEC-PUB-B1 y B2 (un helper y las cabeceras de paquetes), SEC-ADM-A4, B2, C2, G3, SEC-X-3, SEC-X-4 y los tests SEC-T1 a T4 y T6 a T9.
2. **Con una decisión de Greener:**
   SEC-X-2 (dónde poner el tope de tamaño), SEC-ADM-D2 (duración del preview), SEC-ADM-F1 (qué eventos se registran), SEC-ADM-E1 (política de permisos), SEC-PUB-C2 (caducidad del enlace de talent), SEC-PUB-A2 (barrera anti-spam si aparece) y SEC-X-1d (otro origen para los paquetes).
3. **Con más trabajo:**
   SEC-ADM-A2 con SEC-ADM-A5 (capa de acceso en talent con sesión memoizada), SEC-ADM-D1 (clave obligatoria y propósito en la firma), SEC-ADM-G2 (envoltorio de acciones), SEC-PUB-A5 (caché del HTML de paquetes).
4. **Antes de nada, comprobación externa:**
   SEC-ADM-A3b (RLS de `authenticated`), SEC-PUB-A4 (que el puerto de PM2 no responda desde fuera) y que `feed_session` se purgue.

## 10. Pendiente de revisión y no verificado

1. **Migraciones SQL, RLS, `is_admin` y políticas de Storage.** `supabase/migrations` no está en el zip aunque los tests la referencian. Es la mayor laguna: todo lo que se dice de «detrás de RLS» es lo que declara el código. Incluye las tablas `feed_session`, `feed_round`, `contact_submission` y las de talent.
2. **La carpeta `public/` no está en el zip** (el script `greener-package-analytics.js`, iconos, etc.). Lo que ese script envía a `/api/analytics/package` no se ha podido leer.
3. **Ninguna operación autenticada ni ningún camino con base de datos real se ha ejecutado.** El comportamiento de las acciones con sesión, el éxito del contacto, el alta de talent, Mailchimp, n8n, Cloudmersive y los 200 de las rutas de paquetes se han deducido de la lectura. Que el 200 del documento y de los assets lleve las cabeceras que dice el código no se ha visto en una respuesta real.
4. **Tests del proyecto no ejecutados.**
5. **`/ADMIN` y `/Admin` devuelven 500 en la copia de pruebas.** Lo más probable es que caigan en la ruta pública por slug y que la base falsa no responda; conviene comprobarlo con la base real (que sea 404 y no 500).
6. **`'unsafe-eval'`.** Resuelto por lectura: `securityHeaders.ts` solo lo añade con `isDev`. Queda confirmarlo en un build de producción.
7. **Cookies `httpOnly: false` en producción.** Confirmado en el código de `@supabase/ssr` 0.12.7 y en que el proyecto no las sobrescribe; falta verlo en las herramientas del navegador de producción.
8. **Plausible y el parámetro `?preview=`.** No verificado si el tracker envía la query al servicio (SEC-ADM-D2). La página de caso ya añade `noindex` a los borradores con `?preview`.
9. **Entradas duplicadas en el ZIP** *(resuelto el 29 oct, §2.119)*. `adm-zip` lanza un error con una ruta exactamente repetida (en `getEntries()`, que estaba fuera del `try`): ahora se rechaza con «El ZIP contiene dos ficheros con la misma ruta». Con mayúsculas distintas las acepta como ficheros distintos, sin problema.
10. **Parámetros firmables de Cloudinary** (SEC-ADM-C1): afirmaciones por contrastar con su documentación.
11. **Rutas de talent y purga.** La purga usa secreto con comparación en tiempo constante, pero `readJsonBody` lee el cuerpo entero antes de comprobar su tamaño y no hay limitador por intentos fallidos (con 32 caracteres de secreto no es explotable). `purgeExpiredCandidates`, `talentMailchimp` y `mailchimpNewsletter` se leyeron solo por encima.
12. **Páginas públicas (Server Components).** Solo usan entrada del usuario en los slugs y `?preview`; no se ha auditado si exponen contenido sin publicar, que depende de RLS.
13. **`robots.txt` lista `/admin`, `/api/` y la ruta señuelo.** Decisión de la política de bots; no se propone cambiarla. El login del ABM es público de todas formas.
14. **Límites en memoria y por proceso** (feed, talent, analítica, contacto de trampas): con más de un proceso PM2 el límite real se multiplica y un reinicio lo pone a cero. Ya está documentado en el código.
15. **Copia de pruebas.** Vive en la carpeta temporal de la sesión y no forma parte del proyecto.

## 11. Decisiones pendientes para Greener

1. ¿Subida de ZIP y de CV por rutas `api/admin` (más seguro, más cambio) o se acepta el tope global de 20–25 MB? (SEC-X-2)
2. ¿Cuánto debe durar un enlace de preview y se necesita poder revocarlo? (SEC-ADM-D2)
3. ¿Qué acciones deben quedar en Actividad? (SEC-ADM-F1)
4. ¿Se quiere restringir el redirect de CV a Drive y Docs, sabiendo que los enlaces antiguos de otros dominios dejarían de abrirse con un clic? (SEC-ADM-B3)
5. ¿Política de `Permissions-Policy` para los embeds? (SEC-ADM-E1)
6. ¿Se acepta que los paquetes sigan en el mismo origen que el ABM si se aplican las medidas baratas (cookies `httpOnly`, CSP en assets, cierre de sesión), o se quiere estudiar un subdominio aparte? (SEC-X-1)
7. ¿Se rechazan `.html` y `.htm` secundarios dentro de los ZIP? (SEC-PUB-B1)
8. ¿Caduca el enlace personal de talent y en cuánto tiempo? (SEC-PUB-C2)
9. ¿Se añade una barrera anti-spam en contacto, o se espera a ver tráfico real? (SEC-PUB-A2)
