# Plan: adaptar «talent» (gestión de CVs) a la web de Greener

**Estado:** planificado, sin ejecutar (16 oct 2026). **Fase 0 cerrada el 19 oct 2026** (§5.1 y §5.2; el contrato de datos está en `contrato-datos-talent.md`). **Fase 1 (servidor) hecha el 19 oct 2026** (§3.1; `historial-fase-5.md` §2.85). Siguiente: fase 2 (paquete), que necesita el repo `talent` (§3.1, «Por contrastar»), y fase 3 (ABM); la puesta en marcha está en `docs/operaciones/talent-puesta-en-marcha.md`. Es el bloque D de `plan-pendientes-2026-10-16.md`. Regla de trabajo: primero se planifica y luego se ejecuta.

## 1. Punto de partida (revisado el 16 oct sobre el ZIP `talent.zip`)

Repo `talent`: React 19 + Vite 8, JavaScript, CSS Modules, unas 3.000 líneas. Compila bien (`vite build`, 716 KB); `eslint` da 52 errores de reglas de hooks de React (no bloquean). Sin tests, sin migraciones, sin `seed.sql` (aunque `config.toml` lo cita): **el esquema de Supabase no está en el repo**.

| Ruta | Qué hace | Cómo lo hace hoy |
| --- | --- | --- |
| `/` | Pide el email del candidato (es/ca/en) | `insert` en `candidates` (`email`, `status:'processed'`, `access_token` UUID generado en el navegador) y `POST` al webhook de n8n con `{access_token}`. n8n envía el email con el enlace. |
| `/form/:userId` | Formulario de 10 pasos; el token es el `access_token` | Lee `candidates` por token; sube CVs al bucket `cvs` (`uploads/<nombre>`; el código pide `getPublicUrl`, pero el bucket es privado); inserta `files`; actualiza `candidates`; borra y reinserta `projects`; si acepta la newsletter, llama a la función `subscribe-mailchimp` de Supabase (doble opt-in); `POST` al webhook de n8n con `{candidate_id}`. |
| `/privacy` | Política de privacidad propia (13 may 2026): responsable Xaga, conservación de 2 años desde la última interacción | Estática. |
| `/private` | Personal de Greener sube CVs (pdf/doc/docx/imagen, hasta 10) | Sube al bucket, inserta `candidates` (`status:'pending'`, `file_path`, `uploaded_by`) y llama al webhook de n8n (sin cuerpo). Acceso con Google OAuth y una lista de 4 emails dentro del código. |
| `/bckffc` | Buscador de candidatos (nombre/email/estado) con enlaces a los CVs | `select candidates, files(*)` con la clave anon. **Sin ninguna comprobación de acceso en la interfaz.** |

Lo que en la conversación se llamó «backend `/admin`» es `/private` + `/bckffc`: no hay código de servidor, son páginas que hablan con Supabase desde el navegador.

## 2. Decisiones de Greener (16 oct)

1. **Los datos se quedan en su proyecto de Supabase actual** (no pasan al de Greener).
2. **n8n tiene muchos nodos de Supabase que escriben según el esquema actual: el esquema no se toca.** Todo lo que escriba la web nueva tiene que ser idéntico en columnas, tipos y valores (`status`, formato de `profile`, `languages`, `socials`…).
3. **Los enlaces de los emails ya enviados no hace falta que sigan funcionando.**
4. **El texto de privacidad se decide más adelante** (junto al asesor legal).
5. **El bucket `cvs` es privado** (16 oct: confirmado). Los CVs se sirven siempre con URL firmada de vida corta, generada en el servidor.
6. **`yasmin@ffforward.ai` pierde el acceso** al buscador y a la subida de CVs: no pasa nada (autorización por dominio del ABM, solo Greener).

## 3. Arquitectura propuesta

**Por qué no puede ir «tal cual» como paquete.** La política de seguridad de los paquetes solo admite `connect-src 'self'`: Supabase, su función y los tres webhooks de n8n quedarían bloqueados. Ampliarla para todos los paquetes se descarta (abre cualquier paquete a esos orígenes, y la app hoy no tiene el acceso cerrado).

**Solución.** La parte pública se convierte en un paquete `variety` (página satélite) que solo habla con rutas del propio sitio; el servidor de Greener es el único que conoce Supabase-talent y n8n.

```
Navegador (paquete /variety/<slug>/app)
   │  fetch same-origin
   ▼
Greener web (Next.js)  /api/talent/*   ──►  Supabase «talent» (clave de servicio, solo servidor)
   │                                    ──►  webhooks de n8n (URL en variable de entorno)
   │                                    ──►  Mailchimp (audiencia de talent, módulo de newsletter)
   ▼
ABM  /admin/talent  (sesión de admin de Greener)  ──►  Supabase «talent»
```

- **Módulo nuevo `modules/talent`** (dominio con esquemas zod, puerto del repositorio, infraestructura con su propio cliente de Supabase y cliente de n8n, casos de uso). Variables de entorno nuevas: `TALENT_SUPABASE_URL`, `TALENT_SUPABASE_SECRET_KEY` (la clave secreta nueva, no la heredada `service_role`), `TALENT_MAILCHIMP_AUDIENCE_ID`, una URL de webhook por cada uno de los tres usos.
- **Rutas del servidor** (todas con límite de peticiones por visitante e IP con la infraestructura existente, honeypot y respuestas genéricas):
  - `POST /api/talent/candidates`: valida el email, genera el token **en el servidor**, inserta igual que hoy y llama al webhook de n8n. Responde lo mismo exista o no el email.
  - `GET /api/talent/form/[token]`: devuelve solo los campos que el formulario necesita para ese candidato (hoy se descarga la fila entera con `select *`).
  - `PUT /api/talent/form/[token]`: valida con zod y ejecuta la misma secuencia de hoy (candidato, proyectos, newsletter, webhook), con control de errores en un solo sitio.
  - `POST` y `DELETE /api/talent/form/[token]/files`: **la subida pasa por el servidor**, porque el navegador no puede hablar con Supabase. Comprueba tipo, tamaño y número de ficheros, pasa el escaneo antivirus que ya existe para los ZIP (Cloudmersive), guarda en `cvs` con un nombre generado (no el del usuario) y registra en `files` solo lo que pertenece a ese token.
- **Paquete `variety`** (el repo `talent` sigue siendo su código fuente y gana un script `build:package`): rutas con `#` (`#/`, `#/form/<token>`), `base: './'`, todo bajo `assets/` (el `logo.svg` y las fuentes salen de la raíz), `manifest.json` con `kind: "variety"` y metadatos, sin Supabase ni Google en el bundle, sin las páginas de admin. El ZIP generado se valida con `validateHtmlPackageZip` antes de subirlo.
- **ABM `/admin/talent`**: buscador de candidatos (lo de `/bckffc`, con paginación y enlaces a los CVs firmados y de vida corta) y subida de CVs por el personal (lo de `/private`). Acceso con la sesión de admin de Greener; la lista de emails en el código desaparece.

### 3.1 Fase 1: lo que hay hecho y el contrato de las rutas (19 oct 2026)

Módulo `src/modules/talent` (dominio con esquemas zod y filas, casos de uso, repositorio de Supabase-talent con la clave secreta, cliente de n8n, adaptador de Mailchimp y antivirus) y las rutas de `src/app/api/talent`. Todas comparten:

- Solo del propio sitio (se rechaza `Sec-Fetch-Site` distinto de `same-origin`), con cookie técnica de visitante (`greener_visitor`, la del feed) y `Cache-Control: no-store`. Las que reciben JSON exigen `application/json` (un formulario HTML de otro sitio no pasa) y un cuerpo de hasta 64 KB.
- Errores como `{ "error": "<código>" }` (el paquete tiene los textos en es/ca/en): `invalid` (400, con `fieldErrors`), `forbidden` (403), `not_found` (404), `rate_limited` (429), `unavailable` (503, cuando falla Supabase-talent, n8n o el antivirus no puede comprobar), `too_large` (413) y `unsupported_media_type` (415).
- Honeypot: el campo `website` del cuerpo JSON. Relleno, la respuesta es un éxito idéntico y no se hace nada.

| Ruta | Cuerpo | Éxito |
| --- | --- | --- |
| `POST /api/talent/candidates` | `{ email }` | 200 `{ ok: true }`, **igual exista o no el email** |
| `GET /api/talent/form/[token]` | — | 200 `{ form }` con `email`, `name`, `phone`, `comment`, `profile`, `experience`, `workTypes`, `rateDay`, `rateHour`, `languages`, `socials`, `newsletterAccepted`, `projects` y `files` (`{ id, extension }`). Nunca salen el token, el estado, la ruta del CV ni el comentario de la IA |
| `PUT /api/talent/form/[token]` | `{ name, phone?, comment?, profile[1+], experience?, workTypes[], rateDay?, rateHour?, languages{}, socials{}, newsletterAccepted, projects[1+ de { link, comment? }] }` | 200 `{ ok: true }` |
| `POST /api/talent/form/[token]/files` | `multipart/form-data`, campo `file` (uno por petición) | 201 `{ file: { id, extension } }`; rechazos `file_empty` 400, `file_too_large` 413, `file_type` 415, `too_many_files` 409, `file_scan` 422 |
| `DELETE /api/talent/form/[token]/files?fileId=<uuid>` | — | 200 `{ ok: true }` (solo ficheros propios aún sin procesar) |

**Qué hace cada una.**

- *Alta.* Valida el email y lo normaliza (sin espacios, minúsculas); si no existe, inserta `email`, `status = 'processed'` y un `access_token` UUID v4 del servidor y llama a `Enviar mail a candidato`. Si existe (la búsqueda no distingue mayúsculas y escapa `_` y `%`), reenvía el enlace con su token (genera uno si no lo tiene) salvo que esté en `pending` o `started`, que n8n está procesando. Dos altas a la vez no se pisan: si salta el índice único, la segunda sigue como reenvío y el error de Postgres no sale nunca.
- *Guardar el formulario.* Mismo orden de hoy: `candidates` (sin tocar `status`, `email` ni nada de n8n), `projects`, alta en la newsletter si la ha aceptado y webhook `Guardar archivos` con `{candidate_id}`. Los proyectos nuevos se insertan **antes** de borrar los antiguos (si falla la inserción, el candidato no se queda con cero). Un fallo de Mailchimp no impide terminar; un fallo del webhook sí (sin él la fila no llega a `closed`) y se pide reintentar, que es seguro porque todo se sobrescribe.
- *Ficheros.* Comprueba tamaño (10 MB decimales), extensión (pdf, doc, docx, png, jpg, jpeg, webp) **y contenido** (la firma del fichero tiene que coincidir con la extensión; el tipo MIME sale del contenido, no del navegador), cupo (10 sin procesar por candidato) y antivirus (Cloudmersive, bloqueante). Guarda en `cvs` como `uploads/<uuid>.<ext>` y registra la fila en `files`; si la fila falla, borra el objeto. El nombre que manda el visitante no se guarda: la pantalla puede mostrar la extensión, no el nombre.

**Límites de peticiones** (en memoria del proceso, como los del feed): alta, 20/h por IP, 10/h por visitante y 3/h por email; lectura del formulario, 120 cada 10 min por IP; guardado, 40/h por IP y 20/h por token; ficheros, 60/h por IP y 30/h por token. Las claves son el UUID de la cookie, el hash con sal de la IP y, para los límites por email y por token, el propio valor; todas viven solo en la memoria del proceso (no se escriben en disco ni en el log).

**Variables de entorno:** `TALENT_SUPABASE_URL`, `TALENT_SUPABASE_SECRET_KEY` (se rechaza cualquier clave que no sea `sb_secret_…`), tres URLs de webhook (la de `Procesar nuevo CV` es opcional hasta la fase 3), la pareja opcional de cabecera de autenticación (fase 4) y `TALENT_MAILCHIMP_AUDIENCE_ID`. Detalle y bloque para `.env.local.example` en `docs/operaciones/talent-puesta-en-marcha.md`.

**Suposiciones que hice y conviene confirmar** (todas están en los tests de contrato; cambiar una es cambiar una línea):

1. `files.access_token` y `projects.access_token` se escriben con el token del candidato (el esquema las tiene y n8n no las lee; el repo `talent` probablemente lo hacía). `files.type` no se escribe: lo pone n8n tras clasificar el fichero.
2. Newsletter: alta en la audiencia de talent como `pending` (doble opt-in) con la etiqueta `Greener Talent`. No tuve el código de la función `subscribe-mailchimp` (solo su huella), así que la etiqueta y los campos son los del módulo de newsletter de la web.
3. `languages`: las claves son las del contrato y el nivel es texto corto libre (hasta 40 caracteres), porque los valores reales no se han verificado (consulta del §7 del contrato). `workTypes`: hasta 20 etiquetas de hasta 60 caracteres. `socials`: solo las cuatro redes del contrato y enlaces `http(s)`.
4. Los cuerpos van en camelCase (`workTypes`, `rateDay`, `newsletterAccepted`); el paso a columnas está en `talentRows.ts`.

**Por contrastar en la fase 2 con el repo `talent`** (el repo se compartió el 16 oct en otra conversación y no está en esta: hay que volver a adjuntar `talent.zip`): los nombres y valores exactos que escribe hoy el formulario de 10 pasos (opciones de `work_types`, niveles de idioma, formato de `experience`, tarifas) y si escribía `files.type`. Si algo difiere, se ajusta el esquema o el paquete, no el contrato con n8n.

## 4. Fases

| Fase | Contenido | Quién | Depende de |
| --- | --- | --- | --- |
| **0. Datos para el contrato** | Ver §5. **Cerrada el 19 oct (§5.2); contrato en `contrato-datos-talent.md`.** Sin esto no se escribe código que toque el esquema. | Greener | — |
| **1. Servidor** | **Hecha el 19 oct (§3.1).** Módulo `talent`, rutas `/api/talent/*`, variables de entorno, límite de peticiones, honeypot, antivirus. Tests de contrato: las filas que escribe la web son idénticas, columna a columna, a las del contrato de datos (`tests/unit/talent/talentRows.contract.test.ts`). | Claude | 0 |
| **2. Paquete** | Adaptar el repo: rutas con `#`, `fetch` a `/api/talent`, eliminar admin y dependencias sin uso (`google-auth-library`, `@react-oauth/google`), limpiar `eslint`, script `build:package`, ZIP validado. Ajustar el enlace de privacidad según la decisión 4. | Claude | 1 |
| **3. ABM Talent** | `/admin/talent`: buscador y subida de CVs. | Claude | 1 |
| **4. Puesta en marcha** | Variables en producción; subir el ZIP como `other` de tipo página; cambiar en n8n la plantilla del email al enlace nuevo (`/variety/<slug>/app#/form/<token>`); prueba de extremo a extremo con un candidato real; **cerrar el acceso anon en Supabase-talent** (el bucket ya es privado). | Claude y Greener | 1, 2, 3 y la migración `20261016090000` |
| **5. Cierre** | Texto de privacidad (decisión 4), inventario de cookies y almacenamiento, documentación. Va con la fase 6 del plan de `other`. | Claude y asesor | 3 del plan de pendientes |

## 5. Fase 0: lo que necesito de Greener

1. **Esquema y políticas** de Supabase-talent (SQL Editor, resultados en texto o CSV):
   - `select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' order by 1, ordinal_position;`
   - `select tablename, policyname, roles, cmd, qual, with_check from pg_policies where schemaname in ('public','storage');`
   - `select id, name, public, file_size_limit, allowed_mime_types from storage.buckets;`
2. **Los workflows de n8n** que cuelgan de los tres webhooks, exportados en JSON (sin credenciales): qué leen y qué escriben en Supabase, y qué hacen con `status` de `candidates` y de `files`.
3. **Con qué credencial** trabajan los nodos de Supabase de n8n (clave de servicio o anon). Si fuese anon, cerrar el acceso anon rompería n8n.
4. **Un ejemplo real** (sin datos personales) de fila de `candidates`, `files` y `projects` ya completadas.
5. Las variables de la función `subscribe-mailchimp` (solo los nombres y a qué lista apuntan, no las claves) y si esa lista es la misma que la de la newsletter de Greener.
6. **Comprobación de acceso, hoy mismo:** desde una ventana sin sesión, ¿`/bckffc` en la app actual lista candidatos? Con el bucket privado los CVs no se abren, pero los datos de la tabla sí podrían verse: si lo hace, conviene cerrarlo sin esperar a esta migración.

### 5.1 Resultados de la fase 0 (19 oct 2026)

Recibido: los cuatro workflows de n8n (`Recibir datos candidato`, `Enviar mail a candidato`, `Guardar archivos`, `Procesar nuevo CV`), los índices, el bucket, el recuento de objetos, los secretos y la función de Supabase, y la comprobación de acceso anónimo. **Ninguna clave se copia a este documento.**

**Acceso anónimo (comprobado el 19 oct).** La clave anon, que viaja en el bundle de la web de talent, lee `candidates` (1.018 filas), `files` (2) y `projects` (0 visibles) y lista el bucket `cvs`. Es decir, hoy cualquiera puede descargar la tabla de candidatos (nombre, email, teléfono, comentario de la IA). Es el supuesto del punto 6 de arriba, confirmado. `/bckffc` no necesita ni sesión.

**Claves pegadas en los workflows.** Los nodos HTTP `Download files` (en `Guardar archivos` y en `Procesar nuevo CV`) llevan en la cabecera `Authorization` la **clave `service_role`** escrita a mano, y los nodos `Delete files`, `Delete image`, `Delete resume` (en `Guardar archivos`) y `Delete from storage` (en `Procesar nuevo CV`) llevan la **anon**. No son credenciales de n8n, son valores de un parámetro, y el export los incluye. Consecuencias: (1) la `service_role` se salta RLS y está en cualquier copia de esos JSON; (2) los borrados con anon solo funcionan si una política de `storage.objects` los permite, así que **cerrar el acceso anon rompería esos cuatro nodos** hasta que usen otra clave.

**Qué hace n8n (contrato que la web nueva no puede romper).**

| Webhook | Entrada | Efecto |
| --- | --- | --- |
| `70cbbe1e…` (`Procesar nuevo CV`) | sin cuerpo | Procesa **todas** las filas `status = 'pending'` (subidas desde `/private`): descarga del bucket, `started`, la IA extrae email, nombre, teléfono, perfil y `ai_comment`, genera un `access_token` nuevo, `processed`, lanza el email, sube el CV a Google Drive por carpeta de perfil y lo borra del bucket. Si el email ya existe (índice único) borra la fila `pending` y avisa a quien subió. |
| `4dbf2bf0…` (`Enviar mail a candidato`) | `{access_token}` | Lee la fila por token, valida el email, envía «Completa tu perfil» con el enlace `https://talent.itsgreener.com/form/{token}` escrito en la plantilla (copia a `uploaded_by`) y deja `status = 'sent'` (o `error`). |
| `9199f431…` (`Guardar archivos`) | `{candidate_id}` | Descarga de `cvs` cada fila de `files` (`path`), la IA clasifica el tipo, sube a Drive, actualiza `files` (`path` = enlace de Drive, `status = 'processed'`, `type`) y borra del bucket; si es un CV, lo copia a las carpetas de perfil, lo analiza (`name`, `ai_comment`, `file_path`, `file_name`) y borra la fila de `files`. Después ejecuta `Recibir datos candidato`. |
| (interno) `Recibir datos candidato` | `candidate_id` | Lee `candidates`, `files` y `projects`, envía a `contact@itsgreener.com` y a `uploaded_by` el resumen y deja `status = 'closed'`. |

Estados vistos: `pending`, `started`, `processed`, `sent`, `closed`, `error`. Campos que n8n lee: en `candidates`, `id`, `email`, `name`, `phone`, `status`, `access_token`, `profile` (**array** de texto; n8n escribe `[perfil]`), `ai_comment`, `file_path`, `file_name`, `uploaded_by`, `languages` (objeto con la clave `English`), `work_types` (array) y `socials` (objeto cuyos valores son los enlaces); en `projects`, `candidate_id`, `link`, `comment`; en `files`, `id`, `candidate_id`, `path`, `status`, `type`.

**Lo que cambia en el plan.**

1. **Los CVs acaban en Google Drive, no en Supabase.** El bucket `cvs` es solo tránsito: n8n mueve cada fichero a Drive (cuenta OAuth «srvr») y lo borra. `candidates.file_path` y `files.path` pasan a ser enlaces de Drive (`webViewLink`). El buscador del ABM mostrará enlaces de Drive (los gobierna Drive, no una URL firmada), y la URL firmada solo aplica a los ficheros que aún están en el bucket. La decisión 5 sigue siendo cierta (bucket privado) pero su alcance es menor de lo supuesto.
2. **La subida debe respetar `uploads/<nombre>`:** n8n descarga y borra por esa ruta (`files.path` y `candidates.file_path` en las filas nuevas).
3. **El índice único de `email` es parte del contrato** (`Procesar nuevo CV` lo usa para descartar duplicados). El alta del email de la web nueva no puede fallar con el error crudo: hoy `/` muestra `duplicate key value…` y delata que el email existe. Propuesta (a confirmar): respuesta neutra y, si ya existe, reenviar el enlace con su `access_token` actual.
4. **Los tres webhooks no tienen autenticación.** Cualquiera que conozca la URL puede lanzar el procesado (coste de OpenAI) o el envío. Con el servidor de Greener como único llamante se puede activar autenticación por cabecera en el nodo `Webhook` de n8n, **a la vez** que se retira la web antigua, que los llama directamente.
5. **Conservación de 2 años:** la purga tiene que alcanzar a Supabase (`candidates`, `files`, `projects`, sobrantes del bucket) **y a los ficheros de Drive**, que hoy nadie borra.
6. **Texto de privacidad (para el asesor):** los CVs se envían en base64 a OpenAI (`gpt-4.1-mini`) para extraer datos, se guardan en Google Drive y los emails salen por SMTP. Eso tiene que constar como encargados del tratamiento y, en su caso, transferencia internacional.
7. **Claves: se pasa a las nuevas (decisión de Greener, 19 oct).** En lugar de rotar la `service_role` y la `anon` heredadas, se crean la clave **secreta** y la **publicable** de Supabase-talent (Settings → API Keys) y se desactivan las heredadas. Reglas de la documentación de Supabase que condicionan el orden: las claves nuevas **no son JWT** y se envían en la cabecera `apikey`, no en `Authorization: Bearer`; crearlas no revoca las heredadas (conviven hasta desactivarlas, y la desactivación es reversible; borrar una clave secreta no); y la secreta no funciona desde un navegador. Orden: (a) crear ambas; (b) **probar en n8n, en una copia de un workflow, que los nodos `Supabase` aceptan la clave secreta** (es el punto sin garantía: el nodo manda la clave en las dos cabeceras); si no la aceptan, hay que cambiarlos por nodos HTTP con credencial de cabecera `apikey`, que es un trabajo mayor; (c) sustituir la clave de los seis nodos HTTP por una credencial de n8n (cabecera `apikey`, no escrita en el nodo); (d) la web nueva usa la secreta solo en el servidor (variable de entorno); la función `subscribe-mailchimp`, que hoy se invoca con la anon desde el navegador, se llama desde el servidor con `verify_jwt = false` y comprobación de la clave en el código, o se sustituye (decisión de newsletter, §6); (e) retirar las políticas anon de tablas y de `storage.objects`; (f) comprobar manualmente que nada usa las heredadas (workflows, la web antigua mientras exista, cron) y **desactivarlas**; (g) prueba de un candidato de extremo a extremo. Con (f) la `service_role` expuesta queda inútil.

**Estado de las claves (19 oct, 11:05).** Greener probó el nodo `Supabase` de n8n con la clave secreta (conexión y operaciones reales) y **desactivó las claves heredadas** (`anon` y `service_role`). Consecuencias: (1) la web antigua de talent (`/`, `/form`, `/private`, `/bckffc`), que usa la `anon` heredada, **ya no funciona**, y la función `subscribe-mailchimp` no se puede invocar desde ella; (2) el acceso anónimo a la tabla queda cerrado en la práctica porque la clave pública que viajaba en el bundle ya no autentica, aunque las políticas `anon` siguen existiendo hasta retirarlas (fase 4); (3) **verificado el 19 oct, 11:24:** un nodo `Download files` con una credencial de cabecera `apikey` con la clave secreta descargó un fichero del bucket privado, así que Storage acepta la clave nueva solo por `apikey`; **sin confirmar** el resto: los seis nodos HTTP con la clave escrita a mano (`Download files` ×2, `Delete files`, `Delete image`, `Delete resume`, `Delete from storage`) deben haberse cambiado a una credencial con la secreta: si no, fallan con 401 y el procesado de CVs devuelve `error`. **Confirmado el 19 oct por la tarde: los seis usan ya una credencial de n8n y los JSON no llevan ninguna clave (§5.2).** El hecho de que la tabla haya estado legible con una clave pública durante meses se comunica al asesor (posible incidencia de datos personales; se miran los logs de la API de Supabase mientras haya retención).

**Observaciones de n8n que no son de la web.** `FileType check` compara la extensión con `{{ "pdf" || "doc" }}`, que siempre vale `"pdf"`: un `.doc` o `.docx` entra por la rama de imagen. Y `candidates` tiene dos índices sobre `email` (`idx_candidates_email` y el único), uno redundante. El esquema no se toca.

**Lo que faltaba al recibir esta parte** (columnas, enumerados, permisos, recuentos, fechas, extensiones y la comparación de la lista de Mailchimp) llegó el mismo día y se resume en el §5.2; el detalle está en `contrato-datos-talent.md`. Sigue sin recibirse: restricciones y disparadores, estado de RLS y `pg_policies`, y los valores reales de `languages` (consultas en el §7 del contrato). Ninguno condiciona la fase 1.

### 5.2 Cierre de la fase 0 (19 oct 2026, tarde)

**Veredicto: fase 0 cerrada.** Con lo recibido se puede escribir la fase 1 sin tocar el esquema. Los datos, los estados y las reglas de escritura están en un documento propio, `contrato-datos-talent.md`, que es el que usarán los tests de contrato. Lo que sigue sin comprobar no condiciona la fase 1; cada punto tiene su fase en la lista del final.

**Verificado el 19 oct.**

1. Los cuatro workflows se han vuelto a exportar. Los seis nodos HTTP usan ya la credencial de n8n con la clave secreta y los JSON no contienen ninguna clave (0 JWT, 0 `sb_secret_` o `sb_publishable_`, 0 cabeceras `Authorization`). Greener confirma que todas las claves están probadas en n8n con éxito: queda cerrado lo que el §5.1 dejaba «sin confirmar».
2. Todas las columnas que los nodos de Supabase leen, filtran o escriben existen en el esquema (comprobado por script contra el paso 8): no hay deriva entre lo que supone n8n y lo que hay en la base.
3. Los recuentos cuadran entre sí: 1.018 filas por estado, por destino del CV y por `languages` (19 `closed`, 19 con `English`, 19 con `Castellano`).

**Qué cambia en el plan** (continúa la numeración del §5.1).

8. **`status` es texto libre.** El enumerado `candidate_status` (`pending`, `processed`, `error`) no lo usa ninguna columna y no recoge `started`, `sent` ni `closed`. La web solo escribe `processed` (alta por email) y `pending` (subida del personal); el resto es de n8n. Como `status` es `NOT NULL` y sin valor por defecto, toda inserción lo envía.
9. **El ABM tiene que manejar cuatro tipos de CV** (Drive 918, bucket 65, otro 21, sin CV 14) y ofrecer «reprocesar»: hay **23 filas atascadas en `started`**, con el CV en el bucket, que nadie volverá a procesar porque el workflow solo recoge `pending`. Los 65 CVs que siguen en el bucket son datos personales fuera de sitio y piden una limpieza puntual; además, el bucket tiene 92 objetos bajo `uploads/` (paso 4), así que hasta unos 25 no los referencia nadie.
10. **El nombre del fichero lo decide el servidor** (`uploads/<uuid>.<ext>`, sin espacios ni acentos): en la rama de documentos, n8n borra del bucket según el nombre que le devuelve el modelo. Es una hipótesis razonable para parte de esas 65 filas, sin verificar.
11. **Los campos que lee n8n no pueden ser `null`:** `languages` y `socials` son objetos, `work_types` y `profile` son arrays y `profile` no está vacío; la clave de idioma es literalmente `English`. Con `null`, el aviso final a Greener falla y la fila no llega a `closed`.
12. **Newsletter: dos audiencias de la misma cuenta de Mailchimp** (Greener, 19 oct, 12:23: mismo centro de datos, `us13`). Son audiencias distintas (paso 16) pero de la misma cuenta, así que se reutiliza el módulo de newsletter de Greener: se amplía con un segundo identificador de audiencia (variable `TALENT_MAILCHIMP_AUDIENCE_ID`), con la misma clave de API y el mismo prefijo, y conserva el doble opt-in, el tiempo máximo de 8 s y los tests. La función `subscribe-mailchimp` de Supabase-talent deja de hacer falta y se retira en la fase 4 junto con sus secretos. Antes de escribir el adaptador se contrasta con el código de esa función (llegó en la primera entrega) para reproducir el alta: estado, campos y etiquetas. El identificador de la audiencia no se escribe en ningún documento: va en la variable de entorno.
13. **Retención de 2 años.** Supabase-talent no tiene `pg_cron` (paso 11) y los CVs están en Drive, que SQL no puede borrar: la purga tiene que ser un **workflow programado de n8n**, que ya tiene las credenciales de Drive y de Supabase. Además falta el dato base: `created_at` solo se ve en 92 de las 1.018 filas (el cero del paso 15 solo vale para esas) y no existe una columna de última interacción, que es lo que promete la política. Sin saber cuántas filas no tienen fecha no se puede fijar el criterio. No condiciona la fase 1.
14. **Permisos.** `anon` y `authenticated` tienen los siete privilegios sobre las tres tablas (valor por defecto de Supabase), de modo que la protección depende solo de RLS, que no se ha visto. Con las claves heredadas desactivadas hoy no hay clave pública que lo aproveche; en la fase 4 se revocan igualmente y se confirma que RLS está activa. Ese SQL **no va en `supabase/migrations`** de este repo: esas migraciones se aplican con `db push` al proyecto de Greener, no al de talent.
15. **Reenviar el enlace a un candidato `closed` lo devuelve a `sent`** hasta que complete el formulario otra vez (n8n escribe `sent` sin mirar el estado anterior). Afecta al recuento, no rompe nada.
16. **Primera mitad de la fase 0 (pasos 1-7, integrada ese mismo día).** Confirma: el bucket `cvs` es privado y no tiene límite de tamaño ni lista de tipos (los 10 MB los impone el servidor); no hay disparadores ni funciones en `public`; la función `subscribe-mailchimp` está activa (versión 7, 22 de mayo) y su prefijo de servidor es `us13`. Corrige o matiza: (a) el primer `paso-1.csv` era de la base de Greener y se sustituyó a las 12:12 por el correcto (solo índices: clave primaria de las tres tablas y los dos índices de `email`), que no cambia nada; (b) los 0 de `projects` en la comprobación anónima son lo visible para `anon`, no el total (el paso 5 enseña dos filas); (c) el paso 5 buscaba `status = 'completed'`, que no existe (el estado real es `closed`), así que sigue sin haber un ejemplo de fila de `candidates`.
17. **`Get projects` no tiene «Always Output Data»** (`Get files` sí). Con un candidato sin proyectos, la rama se detiene antes de enviar el aviso a Greener y la fila no llega a `closed`. El formulario actual parece exigir al menos un proyecto; la web nueva lo mantiene o se activa esa opción en el nodo. Es una observación de n8n, no de la web.

**Valores por defecto de la fase 1** (se aplican salvo que Greener diga otra cosa).

- Alta con un email que ya existe: respuesta neutra e idéntica exista o no; si existe, se reenvía el enlace con su `access_token` (se genera uno si no lo tiene) llamando a `Enviar mail a candidato` (§5.1, punto 3).
- Subida de ficheros: hasta 10 por candidato, 10 MB cada uno; pdf, doc, docx, png, jpg, jpeg y webp (§6).

**Pendiente, sin bloquear la fase 1.**

| Qué | De quién | Para cuándo |
| --- | --- | --- |
| Identificador de la audiencia de talent en Mailchimp, para la variable `TALENT_MAILCHIMP_AUDIENCE_ID` (por variable de entorno, no por documento) | Greener | Puesta en marcha (fase 4); no bloquea el código de la fase 1 |
| Valores reales de `languages` (consulta del §7 del contrato) | Greener | Fase 1: esquema de validación del formulario; si no llega, se acepta cualquier cadena corta |
| Resto de consultas del §7 del contrato, ejecutadas **en el proyecto de talent** y una a una: restricciones, RLS y políticas, recuentos reales, ejemplo de fila `closed`, filas sin fecha y destino «otro» | Greener | Fases 3 y 4 |
| Reprocesar o descartar las 23 filas `started` y limpiar los 65 CVs del bucket | Greener | Fases 3 y 4 |
| Autenticación por cabecera en los tres webhooks de n8n, a la vez que se retira la web antigua | Greener | Fase 4 |
| SQL para revocar los privilegios de `anon` y `authenticated` y retirar las políticas | Claude lo escribe, Greener lo ejecuta | Fase 4 |
| Criterio de retención (qué fecha cuenta y qué se hace con las filas sin fecha) y workflow de purga en n8n | Greener y asesor | Fase 5 |

## 6. Decisiones que quedan abiertas

- **Newsletter:** resuelto el 19 oct (12:23): son dos audiencias de la misma cuenta de Mailchimp (`us13`), así que se reutiliza el módulo de Greener con un segundo identificador de audiencia (§5.2, punto 12). Queda decidir el texto de consentimiento junto con el de privacidad (decisión 4).
- **Plazo de conservación.** La política promete 2 años; no hay nada en el código ni en el repo que borre. Hace falta una purga programada o cambiar el texto. La de `feed_session` (`pg_cron`) no sirve aquí: Supabase-talent no tiene `pg_cron` y los CVs están en Drive, así que sería un workflow programado de n8n, y antes hay que resolver las fechas (§5.2, punto 13).
- **Fuentes.** El repo incluye Coolvetica y Neue Haas Display. El paquete las serviría al público, así que entran en la comprobación de licencias (punto 17 del plan de pendientes).
- **Dónde se ve en el feed:** `other` de tipo página, con slug y frecuencia a decidir. El plan no cambia por ello.
- **Límites de subida:** hoy hasta 10 ficheros, pdf, doc, docx y png/jpg/jpeg/webp, sin tope de tamaño. Propuesta, que se aplica por defecto en la fase 1: 10 MB por fichero; confirmar.

## 7. Riesgos

- **Acoplamiento con n8n.** El mayor riesgo es escribir algo que n8n no espera. Mitigación: fase 0, tests de contrato con filas reales y prueba extremo a extremo antes de cerrar nada.
- **Clave de servicio de Supabase-talent en el servidor de Dinahosting.** Solo en variable de entorno del servidor, nunca en el bundle ni en el paquete.
- **Subida de ficheros por el servidor** (única instancia de PM2): con el tope de 10 MB y el límite de peticiones es asumible; si hubiera mucho volumen habría que revisarlo.
- **Datos personales de candidatos:** tratamiento distinto al del resto de la web; el asesor debe verlo (fase 5).
