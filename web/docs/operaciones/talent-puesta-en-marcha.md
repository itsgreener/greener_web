# Talent: puesta en marcha (variables, n8n y Supabase-talent)

**Fecha:** 19 de octubre de 2026 (fases 1 y 2 de `especificaciones/plan-talent-careers.md`). **Para quién:** Greener, que es quien tiene acceso a n8n, al SQL Editor de Supabase-talent y al `.env.local` de producción.

**Qué es y qué no.** Los pasos que el código de la fase 1 necesita fuera del repositorio. Nada de esto va en `supabase/migrations`: esas migraciones se aplican con `db push` al proyecto de **Greener**, y los cambios de aquí son sobre el proyecto de **talent** (otro proyecto de Supabase) y sobre n8n. Ninguna clave ni URL de webhook se escribe en este documento.

## 1. Variables de entorno

Se añaden al `.env.local` de producción (junto a `server.js`, ver `despliegue.md` §2). Son solo de servidor: ninguna lleva `NEXT_PUBLIC_`. Se validan al arrancar (`instrumentation.ts`): si falta o es inválida alguna, el log dice cuál y la web sigue en pie; solo fallan las rutas `/api/talent`.

| Variable | Obligatoria | Qué es |
| --- | --- | --- |
| `TALENT_SUPABASE_URL` | sí | URL del proyecto de Supabase **de talent** (no el de la web). |
| `TALENT_SUPABASE_SECRET_KEY` | sí | La clave **secreta nueva** de ese proyecto (`sb_secret_…`). Se rechaza cualquier otra: ni la `service_role` heredada (desactivada) ni la publicable. |
| `TALENT_N8N_SEND_LINK_WEBHOOK_URL` | sí | Webhook de `Enviar mail a candidato`. |
| `TALENT_N8N_PROCESS_FILES_WEBHOOK_URL` | sí | Webhook de `Guardar archivos`. |
| `TALENT_N8N_PROCESS_CV_WEBHOOK_URL` | sí, para la subida del personal (fase 3) | Webhook de `Procesar nuevo CV`; lo llama el ABM tras subir CVs o al reprocesar. Sin ella, las filas quedan en `pending` y el ABM avisa de que el procesado no está configurado. |
| `TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME` y `TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE` | no (fase 4) | Cabecera de autenticación de los tres webhooks. Van las dos o ninguna. Ver §3.4. |
| `TALENT_MAILCHIMP_AUDIENCE_ID` | sí | Identificador de la audiencia de talent. La clave de API y el prefijo (`us13`) son los de la newsletter (`MAILCHIMP_API_KEY`, `MAILCHIMP_SERVER_PREFIX`). |

Bloque para añadir a `.env.local` y a `.env.local.example` (este último es un fichero oculto que no viaja en el zip):

```
# --- Talent (gestión de CVs) ------------------------------------------------
# Proyecto de Supabase de talent y su clave SECRETA nueva. Solo servidor.
TALENT_SUPABASE_URL=https://your-talent-project-ref.supabase.co
TALENT_SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxxxxxxxxxx

# Webhooks de n8n (una URL por uso). La URL es el único secreto que los
# protege hasta que se active la cabecera de autenticación.
TALENT_N8N_SEND_LINK_WEBHOOK_URL=https://your-n8n.example/webhook/xxxxxxxx
TALENT_N8N_PROCESS_FILES_WEBHOOK_URL=https://your-n8n.example/webhook/xxxxxxxx
TALENT_N8N_PROCESS_CV_WEBHOOK_URL=https://your-n8n.example/webhook/xxxxxxxx

# Opcional: autenticación por cabecera de los webhooks (las dos o ninguna).
# TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME=X-Greener-Key
# TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE=un-valor-largo-y-aleatorio

# Audiencia de Mailchimp de talent (misma cuenta que la newsletter).
TALENT_MAILCHIMP_AUDIENCE_ID=xxxxxxxxxx
```

## 2. Orden recomendado

1. Variables en `.env.local` y despliegue. Las rutas ya responden, pero **nadie las llama** hasta que exista el paquete (fase 2): no cambia nada para los candidatos.
2. Los tres cambios de n8n del §3.1 a §3.3 (no dependen de la web nueva y arreglan fallos que ya existen).
3. Fase 2 (paquete, **hecha**: §2.1 explica cómo se sube) y fase 3 (ABM, **hecha**: §6) en la web.
4. Prueba de extremo a extremo con un candidato real (§5).
5. Cambiar la plantilla del correo de `Enviar mail a candidato` al enlace nuevo (`/variety/talent/app#/form/<token>`).
6. **Solo entonces**, el cierre del acceso anónimo (§4.3) y la autenticación de los webhooks (§3.4): ambos rompen la web antigua de talent, que ya no debe seguir en uso.

### 2.1 Subir el paquete (fase 4)

El ZIP sale del repo `talent` con `npm run build:package` (`talent-form-package.zip`, unos 200 KB). Pasos:

0. **Antes de publicar nada,** haz la prueba del §5 con `curl` (sin la página) y la del ABM del §6: ni las rutas `/api/talent` ni el ABM dependen del paquete. Una página `variety` no se puede probar en borrador (solo se sirve publicada y no tiene Preview), así que la prueba con el formulario real se hace después del paso 2, en el preview de Vercel o en producción.
1. En el ABM de la web, **Otros** → crear una página de tipo `variety` → subir el ZIP. Si rechaza la subida, el mensaje dice qué dominio o qué regla incumple (lo habitual: un enlace nuevo sin declarar en `externalDomains` del `manifest.json`). Queda en borrador hasta publicarlo.
2. Con la página publicada, la URL es `https://itsgreener.com/variety/talent/app` (slug `talent`). En **Otros** la frecuencia es una vez cada 125 pines (el mínimo es 25 y el valor por defecto 100). Las rutas internas llevan `#`: el formulario es `…/app#/form/<token>`.
   **Pin obligatorio.** Para publicar una página satélite hace falta al menos un pin con imagen o vídeo (error ZG018 si no): en el editor de la página, bloque **Pines** → carga masiva: `talent-45-img.webp` en «Imágenes y vídeos (varios)» y `pin-talent.csv` en el campo del CSV (4:5, idioma `en`, rótulo «Join the Greener team» y alt descriptivo, ya rellenados en el CSV). Es un visual provisional; se sustituye cuando Greener tenga el definitivo (la ficha del pin se edita sin tocar el paquete). Una página no se publica sin paquete publicado (ZG009).
   **URL corta.** Con la página publicada, `https://itsgreener.com/talent` (y `/{slug}` de cualquier otra página satélite) redirige a `/variety/talent/app`. El fragmento `#/form/<token>` se conserva, así que el enlace del correo puede usar cualquiera de las dos formas. El slug no puede ser el de una ruta de la web (`contact`, `tools`, `privacy`…): el alta lo rechaza.
3. **Cambiar el enlace del correo.** En la plantilla del nodo `Enviar mail a candidato` de n8n, y en `mail.html` del repo `talent` (el botón de la línea con `talent.itsgreener.com/form/`), el enlace pasa a `https://itsgreener.com/variety/talent/app#/form/{{ $json.access_token }}`.
4. Prueba del §5 completa (con el paquete publicado). Después se retira la web antigua.

**Estado (20 oct).** La web se prueba en un preview de Vercel y el enlace del correo apunta a esa URL de forma provisional; al salir a producción se cambia a `itsgreener.com`. El paquete se sube con el texto de privacidad que ya lleva (el de 13 de mayo): el texto nuevo es la fase 5.

Cada cambio del paquete es un ZIP nuevo, es decir, una versión nueva en el ABM. Hasta decidir la política de privacidad (decisión 4 del plan) el paquete lleva el texto de 13 de mayo de 2026.

## 3. Cambios en n8n

Son tres arreglos de fallos que ya existen y una autenticación. El esquema no se toca. **Estado (19 oct, tarde):** Greener ha corregido los nodos de n8n que no son de webhook (§3.1 y §3.2); los webhooks, §3.4, se hacen en la fase 4.

### 3.1 `Get projects` sin «Always Output Data» (`Recibir datos candidato`)

Con un candidato sin proyectos, el nodo no devuelve filas, la rama se detiene antes de `Send email` y la fila no llega a `closed`. La web nueva exige al menos un proyecto, así que no se dispara con ella, pero sí con filas antiguas. Arreglo: en el nodo `Get projects`, **Settings → Always Output Data → activado** (`Get files` ya lo tiene). El texto del correo ya cubre el caso de comentario vacío; con cero proyectos listaría un elemento vacío, que es mejor que no avisar.

### 3.2 `FileType check` envía los `.doc` y `.docx` por la rama de imagen (`Guardar archivos`)

La condición es `{{ $binary.data.fileExtension }}` igual a `{{ "pdf" || "doc" }}`, que JavaScript evalúa siempre como `"pdf"`. Arreglo: sustituir la condición por **tres condiciones con combinador OR** sobre `{{ $binary.data.fileExtension }}` (igual a `pdf`, a `doc` y a `docx`), como ya hace el nodo `If image` de `Procesar nuevo CV` con las imágenes. La rama verdadera sigue yendo a `Interpret Document`; la falsa, a `Interpret Image`.

### 3.3 Filas atascadas en `started`

Nada las vuelve a procesar. Ver §4.2.

### 3.4 Autenticación de los webhooks (con la fase 4)

En el nodo `Webhook` de los tres workflows: **Authentication → Header Auth**, con una credencial de n8n cuyo nombre de cabecera y valor son los de `TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME` y `TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE`. Primero se rellenan esas dos variables en el servidor y se despliega (el código ya envía la cabecera si existen), y después se activa la autenticación en n8n; a la inversa, las llamadas darían 403. Ya no hace falta esperar a retirar la web antigua: dejó de funcionar el 19 oct (claves heredadas desactivadas) y no llega a llamar a los webhooks. Antes de activarla, comprueba que `Procesar nuevo CV` llama a `Enviar mail a candidato` con un nodo de subworkflow y no por su URL (si fuese por URL, la cabecera lo rompería).

## 4. SQL para el proyecto de Supabase de talent

SQL Editor **del proyecto de talent** (comprueba el nombre arriba a la izquierda: un envío del paso 1 de la fase 0 salió de la base de Greener). El editor solo enseña el resultado de la última sentencia; las consultas se ejecutan de una en una.

### 4.1 Antes de cerrar nada: qué políticas existen

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public', 'storage') order by 1, 2, 3;
```

```sql
select relname, relrowsecurity, relforcerowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relname in ('candidates', 'files', 'projects');
```

**Resultado (Greener, 19 oct, tarde).** RLS activada en las tres tablas, sin `FORCE`. Políticas permisivas para `public` (que incluye `anon`): `candidates` tiene *allow update with token*, *allow_insert*, *allow_select* e *insert candidates public*; `files`, *delete files secure*, *insert files with token* y *select files*; `projects`, tres de inserción; `storage.objects`, *allow_delete_true 24bk_0*, *allow_delete_true 24bk_1* (de lectura) y *allow_upload 24bk_0*. Conclusión: con los privilegios que tienen `anon` y `authenticated`, la RLS no protege nada hoy, y el §4.3 es necesario. Las de `storage.objects` pueden ser de **todos** los buckets (sin filtrar por `cvs`): el borrado del §4.3 las quita solo si nombran `cvs`; antes de ejecutarlo, mira en `pg_policies` la columna `qual` de esas tres y, si alguna es general, se revisa a mano.

### 4.2 Reprocesar las 23 filas atascadas en `started` (hecho el 19 oct)

Greener ya lo ha hecho (recuento de 23 y reprocesado). Se deja el procedimiento por si vuelve a pasar. Todas tenían el CV en el bucket (`uploads/…`). Primero se cuentan:

```sql
select count(*) from public.candidates where status = 'started' and file_path like 'uploads/%';
```

Si salen las 23 esperadas, se devuelven a `pending`:

```sql
update public.candidates set status = 'pending'
where status = 'started' and file_path like 'uploads/%';
```

Y se llama **una sola vez** al webhook de `Procesar nuevo CV` (procesa todas las `pending`; dos llamadas a la vez procesarían las mismas filas dos veces). Desde la terminal, con la URL en una variable de entorno de la sesión y sin escribirla en el historial:

```bash
curl -i -X POST "$WEBHOOK_PROCESAR_CV"
```

Esto es el equivalente manual de la acción «Reprocesar» del ABM (§6), que hace lo mismo para una fila y con la guarda de procesado. Con las filas ya procesadas, el CV pasa a Drive y desaparece del bucket.

### 4.3 Cerrar el acceso anónimo (fase 4, con la web antigua ya apagada)

Las claves heredadas están desactivadas desde el 19 oct, así que hoy no hay clave pública que lo aproveche; esto lo deja cerrado también a nivel de base de datos. La clave secreta (n8n y la web nueva) se salta RLS y no se ve afectada. Se ejecuta de una vez, dentro de una transacción para poder deshacerlo:

```sql
begin;

-- 1. Sin privilegios para los roles que usan las claves públicas
revoke all on table public.candidates, public.files, public.projects from anon, authenticated;

-- 2. RLS activada en las tres tablas (sin políticas = nadie salvo la clave secreta)
alter table public.candidates enable row level security;
alter table public.files enable row level security;
alter table public.projects enable row level security;

-- 3. Fuera todas las políticas de esas tres tablas
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('candidates', 'files', 'projects')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- 4. Fuera las políticas de storage que nombran el bucket cvs
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%cvs%' or coalesce(with_check, '') ilike '%cvs%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- 5. Las tablas que se creen en el futuro no heredan privilegios para anon
alter default privileges in schema public revoke all on tables from anon, authenticated;

commit;
```

Comprobación posterior (cada consulta por separado). No debe quedar ninguna política ni ningún privilegio para `anon` o `authenticated`:

```sql
select count(*) from pg_policies
where (schemaname = 'public' and tablename in ('candidates', 'files', 'projects'))
   or (schemaname = 'storage' and (coalesce(qual, '') ilike '%cvs%' or coalesce(with_check, '') ilike '%cvs%'));
```

```sql
select grantee, table_name, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('candidates', 'files', 'projects')
  and grantee in ('anon', 'authenticated');
```

Los dos tienen que devolver cero filas. Después, una prueba de extremo a extremo (§5): n8n y la web siguen funcionando porque usan la clave secreta.

### 4.4 Límites del bucket (segunda barrera, opcional)

El servidor ya impone 10 MB y la lista de tipos; fijarlo también en el bucket protege si algún día se sube desde otro sitio. Se aplica **después** de retirar la web antigua:

```sql
update storage.buckets
set file_size_limit = 10000000,
    allowed_mime_types = array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png', 'image/jpeg', 'image/webp'
    ]
where id = 'cvs';
```

### 4.5 La función `subscribe-mailchimp`

La web nueva da de alta en Mailchimp desde su servidor, así que la función de Supabase-talent (versión 7) y sus secretos `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID` y `MAILCHIMP_SERVER_PREFIX` dejan de hacer falta. Se borran con el resto de la web antigua (Edge Functions → `subscribe-mailchimp` → Delete, y los secretos en Edge Functions → Secrets). La clave de API de Mailchimp que contenía sigue siendo la de la cuenta: si se quiere, se rota en Mailchimp.

## 5. Prueba de extremo a extremo

Con un email propio:

1. `POST /api/talent/candidates` con `{"email":"tu@email"}` (desde el paquete, o con `curl -H 'content-type: application/json'`): responde `{"ok":true}`. En Supabase-talent aparece la fila con `status = 'processed'` y `access_token`; en unos segundos llega el correo y la fila pasa a `sent`.
2. Se repite con el mismo email: la misma respuesta, sin fila nueva, y llega otro correo con el **mismo** enlace.
3. Se abre el enlace (el del paquete publicado, §2.1), se sube un PDF y se completa el formulario con al menos un proyecto. Aparece una fila en `files` (`status = 'pending'`, ruta `uploads/<uuid>.pdf`) y la de `candidates` pasa a `completed`; luego n8n procesa el fichero (a Drive) y la fila acaba en `closed`. Si se queda en `completed`, `Guardar archivos` no ha terminado.
4. En Greener llega el correo «Nuevo Talent / …» con el nivel de inglés, los perfiles, los tipos de colaboración, los proyectos y las redes.
5. Se mira el log del servidor (PM2): sin errores `Talent:`.

Prueba también un enlace con el email de otro candidato en el último paso del formulario: debe avisar de que ya está en uso (409 `email_taken`) y no guardar. Si la fila se queda en `sent` o `completed` tras completar el formulario, el fallo está en `Guardar archivos` o en `Recibir datos candidato` (n8n manda un correo de error); la web solo sabe que el webhook respondió 200.

## 6. El ABM de Talent (`/admin/talent`)

Para el personal con acceso al panel. Menú lateral → **Talent**.

- **Listado.** Arriba, los contadores por estado (`pending`, `started`, `processed`, `sent`, `completed`, `closed`, `error`); cada uno filtra. Debajo, buscador por nombre o email, y filtros por estado y perfil. 25 por página. Una fila sin nombre ni email (n8n aún no la ha procesado) se muestra como «Sin procesar».
- **Subir CVs.** **Subir CVs** → hasta 10 por vez, 10 MB cada uno (pdf, doc, docx, png, jpg, jpeg, webp). Se suben de uno en uno y, al terminar, se lanza **una** vez el procesado de n8n. Cada CV acaba en Drive y la fila en `closed` (n8n pone nombre, email, teléfono, perfil y valoración, y avisa al que lo subió). Si un fichero falla, la pantalla dice cuál y por qué, y el resto sigue.
- **Procesar pendientes.** Si hay filas `pending`, el botón lanza el procesado. No hace nada si no hay pendientes ni si n8n está trabajando (`started`); en ese caso aparece «Lanzar igualmente», que pide confirmación (úsalo solo si la fila lleva horas en `started`). Entre dos lanzamientos pasan al menos 2 minutos. n8n no avisa de que termina: se ve en los contadores.
- **Ficha.** Datos, valoración de la IA, proyectos y ficheros. «Reprocesar CV» (solo en `started` o `error` con el CV todavía en el bucket) y «Reenviar enlace del formulario» (no con la fila en `pending` o `started`, ni sin email). Un `closed` al que se reenvía el enlace vuelve a `sent`.
- **Abrir un CV.** Siempre por la web, nunca con el enlace de Drive pegado a mano: queda registrado quién lo abrió y cuándo. Bucket: enlace temporal de 60 s. Si el registro falla, no se abre.
- **Actividad.** `/admin/audit` → entidad **Talent (candidato)**: `talent.cv_upload`, `talent.process_launch`, `talent.reprocess`, `talent.link_resend`, `talent.cv_open`, `talent.file_open`. La ficha enlaza con el historial del candidato.

**Prueba del ABM** (después del §5, con la variable `TALENT_N8N_PROCESS_CV_WEBHOOK_URL` puesta):

1. Sube un PDF propio. Aparece en el listado como `pending` y el panel dice que el procesado se ha lanzado.
2. Recarga a los 1-2 minutos: la fila pasa a `started` y luego a `closed`, con nombre y perfil puestos por n8n; llega el aviso a tu email.
3. Abre el CV desde la ficha: debe abrir el de Drive y aparecer `talent.cv_open` en Actividad.
4. Pulsa **Procesar pendientes** de nuevo con nada pendiente: no debe llamar a n8n.
5. Prueba **Reprocesar** con una de las filas que sigan en `started` con el CV en el bucket, si queda alguna.
6. Mira el log del servidor (PM2): sin errores `Talent:` ni `Audit:`.
