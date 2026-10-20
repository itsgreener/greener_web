# Contrato de datos de talent (Supabase-talent y n8n)

**Fecha:** 19 de octubre de 2026. **Fuente:** los pasos 8-16 de la fase 0 que dio Greener y los cuatro workflows de n8n exportados ese día (`Recibir datos candidato`, `Enviar mail a candidato`, `Guardar archivos` y `Procesar nuevo CV`, proyecto P26056).

**Para qué sirve.** Es lo que `/api/talent/*`, el ABM de Talent y los tests de contrato de la fase 1 de `plan-talent-careers.md` tienen que respetar. El esquema no se toca (decisión 2 del plan) y n8n lee y escribe según él, así que cualquier fila que escriba la web nueva tiene que ser indistinguible de las de hoy. Si algo cambia en n8n, se corrige aquí primero.

**Qué no se copia aquí.** Las rutas de los webhooks (el identificador de la URL es lo único que los protege hasta que se active la autenticación), los identificadores de carpetas de Drive y de credenciales de n8n, y la referencia del proyecto de Supabase. Los webhooks se citan con los ocho primeros caracteres.

## 1. Esquema

Tres tablas en `public`. En las tres, todas las columnas de texto son `text` (no hay enumerados en uso, ver §2). «n8n» indica qué hacen los workflows con la columna; «—» es que no la tocan.

### `candidates` (22 columnas; la posición 16 no existe, se borró una columna en su día)

| Columna | Tipo | Nulo | Por defecto | n8n |
| --- | --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` | filtra |
| `created_at` | timestamp sin zona | sí | `now()` | — |
| `file_path` | text | sí | — | escribe y lee |
| `status` | text | **no** | **ninguno** | escribe y filtra |
| `email` | text | sí | — | escribe y lee (índice único) |
| `name` | text | sí | — | escribe y lee |
| `comment` | text | sí | — | — |
| `phone` | text | sí | — | escribe |
| `profile` | text[] | sí | — | escribe y lee |
| `experience` | text | sí | — | — |
| `work_types` | text[] | sí | — | lee |
| `rate_day` | numeric | sí | — | — |
| `rate_hour` | numeric | sí | — | — |
| `languages` | jsonb | sí | — | lee |
| `socials` | jsonb | sí | — | lee |
| `access_token` | text | sí | — | escribe, lee y filtra |
| `newsletter_accepted` | boolean | sí | `false` | — |
| `uploaded_by` | text | sí | — | lee |
| `uploaded_by_id` | uuid | sí | — | — |
| `blocked` | boolean | sí | — | — |
| `ai_comment` | text | sí | — | escribe |
| `file_name` | text | sí | — | escribe y lee |

Como `status` es `NOT NULL` y no tiene valor por defecto, **todo `insert` en `candidates` tiene que enviar `status`**.

### `files` (7 columnas)

| Columna | Tipo | Nulo | Por defecto | n8n |
| --- | --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` | filtra |
| `candidate_id` | uuid | sí | — | filtra |
| `type` | text | sí | — | escribe |
| `path` | text | sí | — | escribe, lee y filtra |
| `created_at` | timestamp sin zona | sí | `now()` | — |
| `access_token` | text | sí | — | — |
| `status` | text | sí | `'pending'` | escribe |

### `projects` (6 columnas)

| Columna | Tipo | Nulo | Por defecto | n8n |
| --- | --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` | — |
| `candidate_id` | uuid | sí | — | filtra |
| `link` | text | sí | — | lee |
| `comment` | text | sí | — | lee |
| `created_at` | timestamp sin zona | sí | `now()` | — |
| `access_token` | text | sí | — | — |

**Comprobado por script (19 oct):** todas las columnas que los nodos de Supabase de los cuatro workflows leen, filtran o escriben existen en este esquema. No hay deriva.

**Índices** (`paso-1.csv` correcto, 19 oct, 12:12). `candidates` tiene `candidates_pkey` (`id`), el índice único `idx_candidates_email_unique` sobre `email` (lo usa `Procesar nuevo CV` para descartar duplicados; un duplicado devuelve el error 23505, «duplicate key value») y otro no único y redundante, `idx_candidates_email`. `files` y `projects` solo tienen su clave primaria: no hay índice por `candidate_id`, que con estas cifras no hace falta.

**Disparadores y funciones:** ninguno (paso 3: las consultas sobre `information_schema.triggers` y `routines` no devuelven filas), así que nada reacciona a un `insert` o `update` salvo n8n. **No recibido:** claves foráneas y `CHECK` (consulta en §7). Un primer `paso-1.csv` era de la base de Greener y se descartó; el correcto solo trae índices. La fase 1 no depende de ello mientras la web conserve el orden de hoy (candidato, proyectos, ficheros).

## 2. Estados (`status`)

`status` es texto libre. Existe un enumerado `candidate_status` con `pending`, `processed` y `error`, pero **ninguna columna de las tres tablas lo usa** y no incluye `started`, `sent` ni `closed`, que son valores reales: no valida nada.

| Valor | Lo escribe | Cuándo | Siguiente |
| --- | --- | --- | --- |
| `pending` | Subida del personal (antes `/private`; ahora el ABM de Talent, fase 3) | Al subir un CV | `started` |
| `started` | `Procesar nuevo CV`, nodo `Update a row on start` | Al empezar a procesarlo | `processed` |
| `processed` | El alta por email de la web (hoy en `/`, mañana `POST /api/talent/candidates`) y `Procesar nuevo CV` al terminar | Alta lista, o CV analizado y token generado | `sent` |
| `sent` | `Enviar mail a candidato` | Email aceptado por el servidor de correo | `closed` |
| `completed` | La web al guardar el formulario (la web antigua ya lo hacía; la nueva lo mantiene) | El candidato ha enviado el formulario; aún falta que `Guardar archivos` termine | `closed` |
| `closed` | `Recibir datos candidato` | El candidato ha completado el formulario y se ha avisado a Greener | `sent` si se reenvía el enlace |
| `error` | `Procesar nuevo CV` y `Enviar mail a candidato` | Email inválido o rechazado, fallo al descargar el fichero, fallo al actualizar la fila | Ninguno: nadie lo reintenta |

`files.status` nace `pending` (valor por defecto) y n8n lo deja en `processed` tras subir el fichero a Drive.

**Efecto lateral que hay que conocer.** Reenviar el enlace a un candidato `closed` lo devuelve a `sent` (tras un envío aceptado, `Enviar mail a candidato` escribe `sent` sin mirar el estado anterior). Vuelve a `closed` cuando completa el formulario otra vez.

**Estados el 19 de octubre (1.018 filas):** `sent` 914 · `error` 62 · `started` 23 · `closed` 19 · `pending` 0 · `processed` 0.

## 3. Dónde está el CV (`file_path`)

Resultado del paso 12, cruzando el destino del CV con el estado:

| Destino | `sent` | `error` | `started` | `closed` | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Drive | 848 | 53 | — | 17 | 918 |
| Bucket `cvs` (`storage`) | 35 | 7 | 23 | — | 65 |
| Otro | 20 | 1 | — | — | 21 |
| Sin CV | 11 | 1 | — | 2 | 14 |
| **Total** | 914 | 62 | 23 | 19 | **1.018** |

Consecuencias para el ABM de Talent (implementadas en la fase 3: `classifyCvLocation` en `talentCvLocation.ts`):

1. **Cuatro tipos de enlace.** Un enlace de Drive (lo gobierna Drive, no hay URL firmada), una ruta `uploads/…` del bucket (se sirve con URL firmada de vida corta), «otro» (hay que mirar qué son esas 21 filas antes de decidir cómo se muestran) y ningún CV.
2. **Las 23 filas `started` están atascadas.** Todas tienen el CV en el bucket y el workflow solo recoge `pending`, así que nadie las volverá a procesar. El ABM necesita una acción «reprocesar» (devolver a `pending` y llamar **una vez** al webhook).
3. **65 candidatos conservan el CV en el bucket** cuando el flujo debería haberlo movido a Drive y borrado, y el bucket contiene **92 objetos** bajo `uploads/` (paso 4). Como mucho unos 67 están referenciados (65 candidatos y las 2 filas de `files` que ve `anon`), así que hasta unos 25 podrían ser huérfanos. Es una limpieza puntual y, además, datos personales que no tendrían que seguir ahí.

## 4. Reglas de escritura de la web nueva

Cada regla indica qué nodo de n8n falla si no se cumple.

| Campo | Regla | Qué se rompe si no |
| --- | --- | --- |
| `status` | El alta por email escribe `processed`; el guardado del formulario, `completed`; la subida del personal, `pending`. La web no escribe ningún otro valor. | `Procesar nuevo CV` solo recoge `pending`; `Enviar mail` solo actúa sobre una fila ya existente. |
| `email` | Único. Se busca sin distinguir mayúsculas ni espacios antes de insertar, y se guarda normalizado. Un duplicado no puede devolver el error de Postgres al visitante (hoy `/` enseña `duplicate key value…`). | El índice único rechaza la inserción; la respuesta delata si el email existe. |
| `access_token` | UUID v4 generado **en el servidor** (`crypto.randomUUID()`). Una fila sin token no se puede enviar por email: se genera y se guarda antes de reenviar. | `Enviar mail a candidato` busca la fila por token. |
| `profile` | `text[]` **no vacío**. Valores que n8n reconoce (cada uno es una carpeta de Drive): `cuentas`, `comercial`, `contenidos`, `copy`, `diseno`, `estrategia`, `produccion`, `programacion`, `video`, `otro`. Cualquier otro cae en la carpeta `otro`. n8n escribe `[perfil]` (un solo elemento) en los CVs que sube el personal. | El asunto del aviso usa `profile[0]`; `Guardar archivos` reparte el CV por cada elemento. |
| `work_types` | `text[]`, nunca `null` (puede ser `[]`). | El aviso final hace `work_types.join(', ')`. |
| `languages` | `jsonb` **objeto**, nunca `null` (puede ser `{}`). Las claves son el nombre del idioma en ese idioma y no se traducen ni se cambian por códigos. El formulario ofrece 23 (`Castellano`, `Català`, `Euskera`, `Galego`, `Valencià`, `English`, `Français`, `Deutsch`, `Italiano`, `Português`, `Nederlands`, `Polski`, `Română`, `Čeština`, `Svenska`, `中文`, `日本語`, `한국어`, `العربية`, `हिन्दी`, `Русский`, `Türkçe`, `Українська`; la lista está en `talentConstants.ts`). El valor es el nivel: `basico`, `intermedio`, `avanzado`, `bilingue` o `nativo` (valores internos del formulario, confirmados con el repo `talent` el 19 oct). **`English` se lee por nombre** («nivel de inglés»; si falta, el aviso dice «nulo»). | El aviso hace `languages.English` sin comprobar nada: con `null`, el último paso de `Recibir datos candidato` falla. |
| `socials` | `jsonb` **objeto**, nunca `null`. Claves que ofrece el formulario: `LinkedIn`, `GitHub`, `Behance`, `Instagram`, `X`, `TikTok`; el valor es la URL `http(s)`. Las filas antiguas solo tienen las cuatro primeras que se usaron (`LinkedIn`, `Behance`, `Instagram`, `TikTok`). | El aviso usa los valores del objeto como lista de enlaces. |
| `projects` | Se borran y se vuelven a insertar por candidato, como hoy. `link` obligatorio; `comment` puede ser `null` (el aviso escribe «no hay comentario»). **Al menos un proyecto por candidato:** `Get projects` no tiene «Always Output Data» (`Get files` sí) y un nodo de n8n que no devuelve filas detiene la rama. El formulario actual parece exigirlo (hay 19 candidatos `closed`); la web nueva lo mantiene, o se activa esa opción en el nodo. | `Get projects` lee todas las filas del candidato; con cero filas, la rama se detiene antes de `Send email` y el candidato no llega a `closed`. |
| Ficheros | Bucket `cvs`, ruta `uploads/<uuid>.<ext>`: nombre **generado, ASCII y sin espacios**. `files.path` lleva exactamente esa ruta. | `Guardar archivos` descarga por `files.path` y, en la rama de documentos, pide al modelo que devuelva el nombre del fichero y **borra del bucket (`Delete files`, `Delete resume`) según ese nombre devuelto**. Un nombre con espacios o acentos puede volver alterado y dejar el fichero huérfano (hipótesis para parte de las 65 filas del §3, sin verificar). |
| `name` | **La web no lo escribe.** Lo pone n8n al analizar el CV; el formulario solo lo lee para saludar. | Escribirlo desde el formulario pisaría lo que ha deducido la IA. |
| `experience`, `work_types`, `rate_day`, `rate_hour` | Tramos de experiencia: `0`, `0-1`, `1-3`, `3-5`, `5-10`, `10+`. Tipos de trabajo: `internship`, `parttime`, `fulltime`, `freelance`. Las tarifas solo se piden con `freelance` y son números (puede ser `null`). | Ningún nodo de n8n lee `experience` ni las tarifas; `work_types` va al aviso. |
| `uploaded_by` | Email de quien sube el CV, solo en la subida del personal (ABM, fase 3). En las altas por email no se escribe. | n8n lo usa como copia y destinatario de avisos. |
| `uploaded_by_id` | **La web no lo escribe** (la subida del personal envía solo `status = 'pending'`, `file_path` y `uploaded_by`). | Ningún nodo de n8n lo lee. |
| Tipos de fichero | pdf, doc, docx, png, jpg, jpeg, webp. | Defecto ya conocido de n8n: `FileType check` compara la extensión con `"pdf" \|\| "doc"` (siempre `pdf`), de modo que `.doc` y `.docx` entran por la rama de imagen. |

## 5. Webhooks (cómo se llaman)

Los tres devuelven 200 en cuanto reciben la petición (ninguno tiene nodo de respuesta): **el servidor de Greener no puede saber si el procesado falló**; la señal es el `status` de la fila y los correos de error de n8n. Ninguno tiene autenticación todavía (fase 4).

| Workflow | Webhook | Cuerpo | Qué hace |
| --- | --- | --- | --- |
| `Procesar nuevo CV` | `70cbbe1e…` | ninguno | Procesa **todas** las filas `pending`. Debe llamarse **una vez por lote**, después de insertar todas las filas: dos llamadas simultáneas procesarían las mismas filas dos veces (lee `pending` antes de que `Update a row on start` las marque). |
| `Enviar mail a candidato` | `4dbf2bf0…` | `{ "access_token": "…" }` | Envía «Completa tu perfil» con el enlace escrito en la plantilla (hoy el dominio antiguo de talent) y deja `sent` o `error`. También lo invoca `Procesar nuevo CV` como subworkflow. |
| `Guardar archivos` | `9199f431…` | `{ "candidate_id": "…" }` | Procesa los `files` del candidato y termina ejecutando `Recibir datos candidato`, que avisa a Greener y deja `closed`. |

El narrado completo de cada flujo está en el §5.1 de `plan-talent-careers.md`.

**Claves.** Los seis nodos HTTP que hablan con Storage (`Download files` ×2, `Delete files`, `Delete image`, `Delete resume`, `Delete from storage`) usan ya una credencial de n8n con la clave secreta de Supabase-talent en la cabecera `apikey`. El export de los cuatro workflows no contiene ninguna clave: 0 JWT, 0 `sb_secret_` o `sb_publishable_`, 0 cabeceras `Authorization`. Greener confirma (19 oct) que todas las claves están probadas en n8n con éxito.

## 6. Foto de los datos (19 de octubre de 2026)

- **1.018 candidatos.** 19 han completado el formulario (`closed`), unos 2 de cada 100 de los que recibieron el enlace (19 de 933, contando `sent` y `closed`). Cuadra con `languages`: 19 filas con `English` y 19 con `Castellano`.
- **Idiomas** (claves de `languages`): English 19, Castellano 19, Català 15, Italiano 5, Français 1, Euskera 1, 한국어 1, Galego 1.
- **Redes** (claves de `socials`): LinkedIn 15, Behance 11, Instagram 8, TikTok 2.
- **Fechas.** `created_at` solo se ve en 92 filas: mayo 1, junio 90, octubre 1. Las 926 restantes no aparecen en el paso 14; lo más probable es que `created_at` sea `NULL`, pero no se ha comprobado (consulta en §7). La más antigua con fecha es del 28 de mayo de 2026 y ninguna supera los 2 años; **el cero del paso 15 solo vale para esas 92**.
- **Extensiones** instaladas: `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`. **No hay `pg_cron` ni `pg_net`.**
- **Permisos de tabla** (paso 10): `anon` y `authenticated` tienen los siete privilegios (`DELETE`, `INSERT`, `REFERENCES`, `SELECT`, `TRIGGER`, `TRUNCATE`, `UPDATE`) sobre `candidates`, `files` y `projects`. Es el valor por defecto de Supabase: la protección depende por completo de las políticas RLS, que todavía no se han visto. Las claves heredadas están desactivadas desde el 19 de octubre y la web nueva solo usará la clave secreta, en servidor, así que ningún cliente necesita la publicable.
- **RLS y políticas** (19 oct, tarde; consultas del §7 ejecutadas por Greener). RLS está **activada** en `candidates`, `files` y `projects` (sin `FORCE`, que no afecta a la clave secreta). Pero hay políticas permisivas para el rol `public`, que incluye `anon`: en `candidates`, *allow update with token*, *allow_insert*, *allow_select* e *insert candidates public*; en `files`, *delete files secure*, *insert files with token* y *select files*; en `projects`, tres de inserción; y en `storage.objects`, *allow_delete_true 24bk_0*, *allow_delete_true 24bk_1* (de lectura, a pesar del nombre) y *allow_upload 24bk_0*. Son las que usaba la web antigua con la clave publicable. Con ellas, y los privilegios de arriba, la RLS no protege nada hasta que la fase 4 las borre (SQL del §4.3 de `talent-puesta-en-marcha.md`, que ya las cubre). Queda por mirar, antes de ejecutarlo, si las tres de `storage.objects` nombran el bucket `cvs` o son de todos los buckets: el §4.3 solo borra las que lo nombran.
- **Estado de los datos.** Greener confirma el 19 oct que ha reprocesado las filas atascadas en `started` (§3, punto 2; recuento de 23) y que la web antigua se cerrará en la fase 4. Los recuentos del §2 y del §3 son de la mañana y ya no valen para `started`: hay que volver a contarlos.
- **Bucket `cvs`** (paso 2): privado, sin límite de tamaño (`file_size_limit` nulo) y sin tipos MIME permitidos (`allowed_mime_types` nulo). Los 10 MB y la lista de tipos los impone el servidor; en la fase 4 se pueden fijar también en el bucket como segunda barrera. Bajo `uploads/` hay 92 objetos (paso 4).
- **Acceso anónimo** (paso 6, antes de desactivar las claves heredadas): `candidates` 1.018 filas visibles, `files` 2 y `projects` 0. Las 1.018 coinciden con el total, es decir, la política dejaba leer toda la tabla de candidatos sin sesión. Los 0 de `projects` son lo visible para `anon`, no el total: el paso 5 devolvió dos filas de junio con solo `id`, `candidate_id` y `created_at` y, como el SQL Editor solo enseña el último resultado, son casi seguro de `projects`.
- **Función `subscribe-mailchimp`** (paso 7): activa, versión 7, actualizada el 22 de mayo de 2026. Sus secretos propios son `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID` y `MAILCHIMP_SERVER_PREFIX`; el resto los inyecta Supabase. La huella (SHA-256) del prefijo coincide con **`us13`**: la cuenta de Mailchimp de talent está en ese centro de datos.
- **Audiencia de Mailchimp** (pasos 7 y 16): la huella del identificador de la audiencia de talent empieza por `23563a4` y no coincide con la de Greener (`cac8500…`). Son dos audiencias distintas **de la misma cuenta de Mailchimp** (Greener confirma el 19 oct, 12:23, que ambas están en el centro de datos `us13`), de modo que la web nueva usa la clave de API y el prefijo de Greener con un segundo identificador de audiencia, y la función `subscribe-mailchimp` queda sin uso.

## 7. Pendiente de comprobar (ninguno bloquea las fases 1 y 2)

Consultas para el SQL Editor **del proyecto de talent** (conviene mirar el nombre del proyecto arriba a la izquierda: un primer envío del paso 1 salió de la base de Greener). El editor solo enseña el resultado de la **última** sentencia, así que cada consulta se ejecuta por separado. Se piden para cerrar la fase 4 y la política de retención, no para escribir código. **Ya respondidas el 19 oct:** la de RLS y políticas (resultado en el §6) y el recuento de filas atascadas; no se repiten aquí.

```sql
-- Restricciones: claves foráneas y CHECK (§1)
select conrelid::regclass as tabla, conname, pg_get_constraintdef(oid) as definicion
from pg_constraint where connamespace = 'public'::regnamespace order by 1, 2;

-- Ejemplo de fila completada, sin datos personales ('closed' es el estado final; 'completed' es transitorio)
select jsonb_strip_nulls(to_jsonb(c) - 'email' - 'phone' - 'name' - 'comment' - 'access_token'
  - 'file_path' - 'file_name' - 'ai_comment' - 'socials' - 'uploaded_by')
from public.candidates c where status = 'closed' order by created_at desc nulls last limit 2;

-- Valores reales de nivel en languages y tipo de valor en socials (§4). No devuelve datos personales.
select key, value, count(*) from public.candidates, jsonb_each(languages)
where jsonb_typeof(languages) = 'object' group by 1, 2 order by 1, 3 desc;
select key, jsonb_typeof(value) as tipo, count(*) from public.candidates, jsonb_each(socials)
where jsonb_typeof(socials) = 'object' group by 1, 2 order by 1;

-- ¿Cuántas filas no tienen fecha? (§6)
select count(*) filter (where created_at is null) as sin_fecha, count(*) as total from public.candidates;

-- ¿Qué son las 21 filas con destino «otro»? (§3). Ajustar el criterio al que usó el paso 12.
select left(file_path, 40) as inicio, count(*) from public.candidates
where file_path is not null and file_path not like 'https://drive.google.com/%' and file_path not like 'uploads/%'
group by 1 order by 2 desc;
```
