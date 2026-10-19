# Talent: puesta en marcha (variables, n8n y Supabase-talent)

**Fecha:** 19 de octubre de 2026 (fase 1 de `especificaciones/plan-talent-careers.md`). **Para quién:** Greener, que es quien tiene acceso a n8n, al SQL Editor de Supabase-talent y al `.env.local` de producción.

**Qué es y qué no.** Los pasos que el código de la fase 1 necesita fuera del repositorio. Nada de esto va en `supabase/migrations`: esas migraciones se aplican con `db push` al proyecto de **Greener**, y los cambios de aquí son sobre el proyecto de **talent** (otro proyecto de Supabase) y sobre n8n. Ninguna clave ni URL de webhook se escribe en este documento.

## 1. Variables de entorno

Se añaden al `.env.local` de producción (junto a `server.js`, ver `despliegue.md` §2). Son solo de servidor: ninguna lleva `NEXT_PUBLIC_`. Se validan al arrancar (`instrumentation.ts`): si falta o es inválida alguna, el log dice cuál y la web sigue en pie; solo fallan las rutas `/api/talent`.

| Variable | Obligatoria | Qué es |
| --- | --- | --- |
| `TALENT_SUPABASE_URL` | sí | URL del proyecto de Supabase **de talent** (no el de la web). |
| `TALENT_SUPABASE_SECRET_KEY` | sí | La clave **secreta nueva** de ese proyecto (`sb_secret_…`). Se rechaza cualquier otra: ni la `service_role` heredada (desactivada) ni la publicable. |
| `TALENT_N8N_SEND_LINK_WEBHOOK_URL` | sí | Webhook de `Enviar mail a candidato`. |
| `TALENT_N8N_PROCESS_FILES_WEBHOOK_URL` | sí | Webhook de `Guardar archivos`. |
| `TALENT_N8N_PROCESS_CV_WEBHOOK_URL` | no (fase 3) | Webhook de `Procesar nuevo CV`; lo usará la subida del personal en el ABM. |
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
# TALENT_N8N_PROCESS_CV_WEBHOOK_URL=https://your-n8n.example/webhook/xxxxxxxx

# Opcional: autenticación por cabecera de los webhooks (las dos o ninguna).
# TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME=X-Greener-Key
# TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE=un-valor-largo-y-aleatorio

# Audiencia de Mailchimp de talent (misma cuenta que la newsletter).
TALENT_MAILCHIMP_AUDIENCE_ID=xxxxxxxxxx
```

## 2. Orden recomendado

1. Variables en `.env.local` y despliegue. Las rutas ya responden, pero **nadie las llama** hasta que exista el paquete (fase 2): no cambia nada para los candidatos.
2. Los tres cambios de n8n del §3.1 a §3.3 (no dependen de la web nueva y arreglan fallos que ya existen).
3. Fase 2 (paquete) y fase 3 (ABM) en la web.
4. Prueba de extremo a extremo con un candidato real (§5).
5. Cambiar la plantilla del correo de `Enviar mail a candidato` al enlace nuevo (`/variety/<slug>/app#/form/<token>`).
6. **Solo entonces**, el cierre del acceso anónimo (§4.3) y la autenticación de los webhooks (§3.4): ambos rompen la web antigua de talent, que ya no debe seguir en uso.

## 3. Cambios en n8n

Son tres arreglos de fallos que ya existen y una autenticación. El esquema no se toca.

### 3.1 `Get projects` sin «Always Output Data» (`Recibir datos candidato`)

Con un candidato sin proyectos, el nodo no devuelve filas, la rama se detiene antes de `Send email` y la fila no llega a `closed`. La web nueva exige al menos un proyecto, así que no se dispara con ella, pero sí con filas antiguas. Arreglo: en el nodo `Get projects`, **Settings → Always Output Data → activado** (`Get files` ya lo tiene). El texto del correo ya cubre el caso de comentario vacío; con cero proyectos listaría un elemento vacío, que es mejor que no avisar.

### 3.2 `FileType check` envía los `.doc` y `.docx` por la rama de imagen (`Guardar archivos`)

La condición es `{{ $binary.data.fileExtension }}` igual a `{{ "pdf" || "doc" }}`, que JavaScript evalúa siempre como `"pdf"`. Arreglo: sustituir la condición por **tres condiciones con combinador OR** sobre `{{ $binary.data.fileExtension }}` (igual a `pdf`, a `doc` y a `docx`), como ya hace el nodo `If image` de `Procesar nuevo CV` con las imágenes. La rama verdadera sigue yendo a `Interpret Document`; la falsa, a `Interpret Image`.

### 3.3 Filas atascadas en `started`

Nada las vuelve a procesar. Ver §4.2.

### 3.4 Autenticación de los webhooks (con la fase 4)

En el nodo `Webhook` de los tres workflows: **Authentication → Header Auth**, con una credencial de n8n cuyo nombre de cabecera y valor son los de `TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME` y `TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE`. Primero se rellenan esas dos variables en el servidor y se despliega (el código ya envía la cabecera si existen), y después se activa la autenticación en n8n; a la inversa, las llamadas darían 403. Tiene que hacerse **a la vez** que se retira la web antigua, que llama a los webhooks sin cabecera.

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

Las políticas de `storage.objects` pueden ser de **todos** los buckets (sin filtrar por `cvs`). El borrado del §4.3 las quita solo si nombran `cvs`; si alguna es general, se revisa a mano antes.

### 4.2 Reprocesar las 23 filas atascadas en `started`

Todas tienen el CV en el bucket (`uploads/…`). Primero se cuentan:

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

Esto es el equivalente manual de la acción «reprocesar» que tendrá el ABM de la fase 3. Con las filas ya procesadas, el CV pasa a Drive y desaparece del bucket.

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
3. Se abre el enlace, se sube un PDF y se completa el formulario con al menos un proyecto. Aparece una fila en `files` (`status = 'pending'`, ruta `uploads/<uuid>.pdf`), luego n8n la procesa (a Drive) y la fila de `candidates` acaba en `closed`.
4. En Greener llega el correo «Nuevo Talent / …» con el nivel de inglés, los perfiles, los tipos de colaboración, los proyectos y las redes.
5. Se mira el log del servidor (PM2): sin errores `Talent:`.

Si la fila se queda en `sent` tras completar el formulario, el fallo está en `Guardar archivos` o en `Recibir datos candidato` (n8n manda un correo de error); la web solo sabe que el webhook respondió 200.
