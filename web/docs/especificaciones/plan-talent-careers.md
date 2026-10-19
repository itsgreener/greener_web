# Plan: adaptar «talent» (gestión de CVs) a la web de Greener

**Estado:** planificado, sin ejecutar (16 oct 2026). **Fase 0 recibida a medias el 19 oct** (§5.1: faltan columnas, políticas RLS, recuento por estado y una fila de muestra). Es el bloque D de `plan-pendientes-2026-10-16.md`. Regla de trabajo: primero se planifica y luego se ejecuta; la fase 0 depende de Greener y nada empieza sin ella.

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
   │                                    ──►  función subscribe-mailchimp
   ▼
ABM  /admin/talent  (sesión de admin de Greener)  ──►  Supabase «talent»
```

- **Módulo nuevo `modules/talent`** (dominio con esquemas zod, puerto del repositorio, infraestructura con su propio cliente de Supabase y cliente de n8n, casos de uso). Variables de entorno nuevas: `TALENT_SUPABASE_URL`, `TALENT_SUPABASE_SERVICE_ROLE_KEY`, una URL de webhook por cada uno de los tres usos.
- **Rutas del servidor** (todas con límite de peticiones por visitante e IP con la infraestructura existente, honeypot y respuestas genéricas):
  - `POST /api/talent/candidates`: valida el email, genera el token **en el servidor**, inserta igual que hoy y llama al webhook de n8n. Responde lo mismo exista o no el email.
  - `GET /api/talent/form/[token]`: devuelve solo los campos que el formulario necesita para ese candidato (hoy se descarga la fila entera con `select *`).
  - `PUT /api/talent/form/[token]`: valida con zod y ejecuta la misma secuencia de hoy (candidato, proyectos, newsletter, webhook), con control de errores en un solo sitio.
  - `POST` y `DELETE /api/talent/form/[token]/files`: **la subida pasa por el servidor**, porque el navegador no puede hablar con Supabase. Comprueba tipo, tamaño y número de ficheros, pasa el escaneo antivirus que ya existe para los ZIP (Cloudmersive), guarda en `cvs` con un nombre generado (no el del usuario) y registra en `files` solo lo que pertenece a ese token.
- **Paquete `variety`** (el repo `talent` sigue siendo su código fuente y gana un script `build:package`): rutas con `#` (`#/`, `#/form/<token>`), `base: './'`, todo bajo `assets/` (el `logo.svg` y las fuentes salen de la raíz), `manifest.json` con `kind: "variety"` y metadatos, sin Supabase ni Google en el bundle, sin las páginas de admin. El ZIP generado se valida con `validateHtmlPackageZip` antes de subirlo.
- **ABM `/admin/talent`**: buscador de candidatos (lo de `/bckffc`, con paginación y enlaces a los CVs firmados y de vida corta) y subida de CVs por el personal (lo de `/private`). Acceso con la sesión de admin de Greener; la lista de emails en el código desaparece.

## 4. Fases

| Fase | Contenido | Quién | Depende de |
| --- | --- | --- | --- |
| **0. Datos para el contrato** | Ver §5. Sin esto no se escribe código que toque el esquema. | Greener | — |
| **1. Servidor** | Módulo `talent`, rutas `/api/talent/*`, variables de entorno, límite de peticiones, honeypot, antivirus. Tests de contrato: las filas que escribe la web son idénticas, columna a columna, a las del repo actual (fixtures con los ejemplos de la fase 0). | Claude | 0 |
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

**Estado de las claves (19 oct, 11:05).** Greener probó el nodo `Supabase` de n8n con la clave secreta (conexión y operaciones reales) y **desactivó las claves heredadas** (`anon` y `service_role`). Consecuencias: (1) la web antigua de talent (`/`, `/form`, `/private`, `/bckffc`), que usa la `anon` heredada, **ya no funciona**, y la función `subscribe-mailchimp` no se puede invocar desde ella; (2) el acceso anónimo a la tabla queda cerrado en la práctica porque la clave pública que viajaba en el bundle ya no autentica, aunque las políticas `anon` siguen existiendo hasta retirarlas (fase 4); (3) **verificado el 19 oct, 11:24:** un nodo `Download files` con una credencial de cabecera `apikey` con la clave secreta descargó un fichero del bucket privado, así que Storage acepta la clave nueva solo por `apikey`; **sin confirmar** el resto: los seis nodos HTTP con la clave escrita a mano (`Download files` ×2, `Delete files`, `Delete image`, `Delete resume`, `Delete from storage`) deben haberse cambiado a una credencial con la secreta: si no, fallan con 401 y el procesado de CVs devuelve `error`. El hecho de que la tabla haya estado legible con una clave pública durante meses se comunica al asesor (posible incidencia de datos personales; se miran los logs de la API de Supabase mientras haya retención).

**Observaciones de n8n que no son de la web.** `FileType check` compara la extensión con `{{ "pdf" || "doc" }}`, que siempre vale `"pdf"`: un `.doc` o `.docx` entra por la rama de imagen. Y `candidates` tiene dos índices sobre `email` (`idx_candidates_email` y el único), uno redundante. El esquema no se toca.

**Todavía falta:** columnas, tipos, nulos y valores por defecto de las tres tablas, restricciones (`check`, claves foráneas, enumerados de `status`), `pg_policies` de `public` y `storage` con el estado de RLS por tabla, recuento de `candidates` por `status`, una fila `closed` sin datos personales, confirmación de que el nodo `Supabase` de n8n usa la `service_role` (el tipo de credencial de n8n pide esa clave) y prueba de que acepta la clave secreta nueva y si la lista de la función `subscribe-mailchimp` coincide con la de la newsletter de Greener (se compara el SHA-256 del identificador de lista).

## 6. Decisiones que quedan abiertas

- **Newsletter:** mantener la función de Mailchimp de talent o reutilizar el módulo de newsletter de Greener (depende de si son la misma lista).
- **Plazo de conservación.** La política promete 2 años; no hay nada en el código ni en el repo que borre. Hace falta una purga programada en Supabase-talent (como la de `feed_session`) o cambiar el texto.
- **Fuentes.** El repo incluye Coolvetica y Neue Haas Display. El paquete las serviría al público, así que entran en la comprobación de licencias (punto 17 del plan de pendientes).
- **Dónde se ve en el feed:** `other` de tipo página, con slug y frecuencia a decidir. El plan no cambia por ello.
- **Límites de subida:** hoy hasta 10 ficheros, pdf, doc, docx y png/jpg/jpeg/webp, sin tope de tamaño. Propuesta: 10 MB por fichero; confirmar.

## 7. Riesgos

- **Acoplamiento con n8n.** El mayor riesgo es escribir algo que n8n no espera. Mitigación: fase 0, tests de contrato con filas reales y prueba extremo a extremo antes de cerrar nada.
- **Clave de servicio de Supabase-talent en el servidor de Dinahosting.** Solo en variable de entorno del servidor, nunca en el bundle ni en el paquete.
- **Subida de ficheros por el servidor** (única instancia de PM2): con el tope de 10 MB y el límite de peticiones es asumible; si hubiera mucho volumen habría que revisarlo.
- **Datos personales de candidatos:** tratamiento distinto al del resto de la web; el asesor debe verlo (fase 5).
