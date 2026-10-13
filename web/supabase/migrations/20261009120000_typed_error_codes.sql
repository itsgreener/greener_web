-- 9 oct 2026: códigos de error propios (SQLSTATE) para los avisos de negocio.
--
-- Hasta hoy el ABM reconocía 17 avisos de Postgres comparando el TEXTO del
-- mensaje (`error.message.includes('Image is too large')`...), de modo que
-- retocar una frase en una migración rompía el ABM sin avisar. A partir de
-- esta migración cada aviso lleva su propio SQLSTATE y la capa de
-- infraestructura los traduce a errores de dominio por código
-- (src/lib/supabase/postgresErrors.ts).
--
-- Esta migración NO cambia ninguna lógica: cada función se redefine tal cual
-- estaba en su última versión y solo cambia el valor de `errcode` de los
-- avisos de la tabla. Los mensajes siguen siendo los mismos.
--
-- Se aplica sin coordinar con el despliegue de la web: la aplicación entiende
-- el código nuevo y, mientras la migración no esté aplicada, sigue
-- reconociendo los textos antiguos.
--
-- Clase `ZG` (implementación propia, fuera de las clases estándar de SQL):
--   ZG001  el rótulo del pin es obligatorio para este tipo de contenido
--   ZG002  la imagen supera el tamaño máximo
--   ZG003  el vídeo supera el peso máximo
--   ZG004  el vídeo o la animación supera la duración máxima
--   ZG005  un pin admite hasta 8 medios
--   ZG006  el contenido no es un case
--   ZG007  el contenido no es un episodio
--   ZG008  un episodio solo admite su idioma principal
--   ZG009  la tool/insight no tiene paquete HTML publicado
--   ZG010  la fecha de publicación debe ser futura
--   ZG011  este tipo de contenido no admite imagen de portada
--   ZG012  solo el contenido libre admite vídeo de portada
--   ZG013  el medio cambió desde otra pestaña (carrera)
--   ZG014  el medio o la versión no pertenece al pin, caso o paquete indicado
--   ZG015  solo se puede borrar contenido en borrador
--   ZG016  no se puede borrar la versión activa de un paquete


-- delete_content (versión vigente: 20261005091000)
create or replace function public.delete_content(
  p_content_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status content_status;
  v_type content_type;
  v_slug text;
  v_title text;
  v_media_ids uuid[];
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select
    c.status,
    c.type,
    c.slug,
    ct.title
  into
    v_status,
    v_type,
    v_slug,
    v_title
  from public.content c
  left join public.content_translation ct
    on ct.content_id = c.id
    and ct.locale = c.default_locale
  where c.id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_status <> 'draft' then
    raise exception 'Only draft content can be deleted'
      using errcode = 'ZG015';
  end if;

  -- Todos los medios que cuelgan de este contenido, ANTES de borrarlo:
  -- portada, imagen og, medios de sus pines y carrusel de detalle.
  select coalesce(array_agg(distinct media_id), '{}')
  into v_media_ids
  from (
    select cover_media_id as media_id from public.content where id = p_content_id
    union
    select og_media_id from public.content where id = p_content_id
    union
    select pm.media_id
    from public.pin_media pm
    join public.pin p on p.id = pm.pin_id
    where p.content_id = p_content_id
    union
    select cdm.media_id from public.case_detail_media cdm where cdm.content_id = p_content_id
  ) t
  where media_id is not null;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    payload
  )
  values (
    lower(
      coalesce(
        auth.jwt() ->> 'email',
        'unknown'
      )
    ),
    'delete',
    'content',
    p_content_id,
    jsonb_build_object(
      'type', v_type,
      'status', v_status,
      'slug', v_slug,
      'title', v_title,
      'media_count', cardinality(v_media_ids)
    )
  );

  delete from public.content
  where id = p_content_id;

  delete from public.media_asset ma
  where ma.id = any (v_media_ids)
    and not exists (select 1 from public.pin_media pm where pm.media_id = ma.id)
    and not exists (select 1 from public.case_detail_media cdm where cdm.media_id = ma.id)
    and not exists (
      select 1 from public.content c
      where c.cover_media_id = ma.id or c.og_media_id = ma.id
    );

  return p_content_id;

end;
$$;

-- upsert_case_detail (versión vigente: 20260910083300)
create or replace function public.upsert_case_detail(
  p_content_id uuid,
  p_force integer,
  p_client text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select type
  into v_content_type
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_content_type <> 'case' then
    raise exception 'Content is not a case'
      using errcode = 'ZG006';
  end if;

  if p_force < 1 or p_force > 5 then
    raise exception 'Force must be between 1 and 5'
      using errcode = '22023';
  end if;

  insert into public.case_detail (
    content_id,
    force,
    client
  )
  values (
    p_content_id,
    p_force,
    nullif(btrim(p_client), '')
  )
  on conflict (content_id)
  do update set
    force = excluded.force,
    client = excluded.client;

  insert into public.audit_log (
    actor_email, action, entity, entity_id, payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'upsert',
    'case_detail',
    p_content_id,
    jsonb_build_object(
      'force', p_force,
      'client', nullif(btrim(p_client), '')
    )
  );

  return p_content_id;

end;
$$;

-- upsert_content_translation (versión vigente: 20260910083300)
create or replace function public.upsert_content_translation(
  p_content_id uuid,
  p_locale locale,
  p_title text,
  p_seo_title text,
  p_seo_description text,
  p_summary text,
  p_highlight text,
  p_body text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_default_locale locale;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select
    type,
    default_locale
  into
    v_content_type,
    v_default_locale
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if btrim(coalesce(p_title, '')) = '' then
    raise exception 'Title is required'
      using errcode = '22023';
  end if;

  -- Los episodios son de un solo idioma.
  if
    v_content_type = 'episode'
    and p_locale <> v_default_locale
  then
    raise exception 'Episode only supports its default locale'
      using errcode = 'ZG008';
  end if;

  insert into public.content_translation (
    content_id,
    locale,
    title,
    seo_title,
    seo_description,
    summary,
    highlight,
    body
  )
  values (
    p_content_id,
    p_locale,
    btrim(p_title),
    nullif(btrim(p_seo_title), ''),
    nullif(btrim(p_seo_description), ''),
    nullif(btrim(p_summary), ''),
    nullif(btrim(p_highlight), ''),
    nullif(btrim(p_body), '')
  )
  on conflict (content_id, locale)
  do update set
    title = excluded.title,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    summary = excluded.summary,
    highlight = excluded.highlight,
    body = excluded.body;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    payload
  )
  values (
    lower(
      coalesce(
        auth.jwt() ->> 'email',
        'unknown'
      )
    ),
    'upsert',
    'content_translation',
    p_content_id,
    jsonb_build_object(
      'locale',
      p_locale,
      'title',
      btrim(p_title)
    )
  );

  return p_content_id;

end;
$$;

-- publish_content (versión vigente: 20260922110000)
create or replace function public.publish_content(
  p_content_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_previous_status content_status;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select type, status
  into v_content_type, v_previous_status
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_content_type in ('tool', 'insight') and not exists (
    select 1
    from public.html_package
    where content_id = p_content_id
      and current_version_id is not null
  ) then
    raise exception 'Esta tool/insight no tiene un paquete HTML publicado — no se puede publicar sin él'
      using errcode = 'ZG009';
  end if;

  update public.content
  set
    status = 'published',
    publish_at = now()
  where id = p_content_id;

  insert into public.audit_log (
    actor_email, action, entity, entity_id, payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'publish',
    'content',
    p_content_id,
    jsonb_build_object('previous_status', v_previous_status)
  );

  return p_content_id;

end;
$$;

-- schedule_content (versión vigente: 20260922110000)
create or replace function public.schedule_content(
  p_content_id uuid,
  p_publish_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_previous_status content_status;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if p_publish_at <= now() then
    raise exception 'La fecha de publicación debe ser futura'
      using errcode = 'ZG010';
  end if;

  select type, status
  into v_content_type, v_previous_status
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  -- Programar también exige el paquete ya publicado, no solo publicar
  -- directamente: si no, publish_scheduled_content (pg_cron,
  -- 20260922090000) publicaría igualmente una tool/insight sin paquete
  -- en cuanto llegara la fecha, colándose por la puerta de atrás.
  if v_content_type in ('tool', 'insight') and not exists (
    select 1
    from public.html_package
    where content_id = p_content_id
      and current_version_id is not null
  ) then
    raise exception 'Esta tool/insight no tiene un paquete HTML publicado — no se puede programar sin él'
      using errcode = 'ZG009';
  end if;

  update public.content
  set
    status = 'scheduled',
    publish_at = p_publish_at
  where id = p_content_id;

  insert into public.audit_log (
    actor_email, action, entity, entity_id, payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'schedule',
    'content',
    p_content_id,
    jsonb_build_object(
      'previous_status', v_previous_status,
      'publish_at', p_publish_at
    )
  );

  return p_content_id;

end;
$$;

-- publish_html_package_version (versión vigente: 20260908091500)
create or replace function public.publish_html_package_version(
  p_content_id uuid,
  p_version_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_belongs boolean;
  v_previous_version_id uuid;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.html_package_version
    where id = p_version_id and package_id = p_content_id
  )
  into v_belongs;

  if not v_belongs then
    raise exception 'La versión no pertenece a este paquete'
      using errcode = 'ZG014';
  end if;

  select current_version_id
  into v_previous_version_id
  from public.html_package
  where content_id = p_content_id;

  if v_previous_version_id is not null and v_previous_version_id <> p_version_id then
    update public.html_package_version
    set status = 'rolled_back'
    where id = v_previous_version_id;
  end if;

  update public.html_package_version
  set status = 'published'
  where id = p_version_id;

  update public.html_package
  set current_version_id = p_version_id
  where content_id = p_content_id;

  insert into public.audit_log (
    actor_email, action, entity, entity_id, payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'publish_package_version',
    'html_package_version',
    p_version_id,
    jsonb_build_object(
      'content_id', p_content_id,
      'previous_version_id', v_previous_version_id
    )
  );

  return p_version_id;

end;
$$;

-- create_pin (versión vigente: 20261007130000)
create or replace function public.create_pin(
  p_content_id uuid,
  p_ratio pin_ratio,
  p_label text,
  p_language locale,
  p_autoplay_mode pin_autoplay_mode,
  p_alt text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_pin_id uuid;
  v_label text;
  v_queue_order integer;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select type into v_content_type
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  v_label := nullif(btrim(coalesce(p_label, '')), '');

  if v_content_type not in ('case', 'episode', 'insight') and v_label is null then
    raise exception 'El rótulo del pin es obligatorio para este tipo de contenido'
      using errcode = 'ZG001';
  end if;

  if btrim(coalesce(p_alt, '')) = '' then
    raise exception 'El alt del pin es obligatorio'
      using errcode = '22023';
  end if;

  -- Orden en la cola circular del feed: el siguiente libre del contenido,
  -- según van llegando los pines. El bloqueo evita dos pines con el mismo
  -- orden si se crean a la vez.
  perform pg_advisory_xact_lock(hashtext(p_content_id::text));

  select coalesce(max(queue_order) + 1, 0) into v_queue_order
  from public.pin
  where content_id = p_content_id;

  insert into public.pin (
    content_id, ratio, label, language,
    autoplay_mode, queue_order, alt
  )
  values (
    p_content_id, p_ratio, v_label,
    p_language, p_autoplay_mode, v_queue_order, btrim(p_alt)
  )
  returning id
  into v_pin_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'create',
    'pin',
    v_pin_id,
    jsonb_build_object('content_id', p_content_id)
  );

  return v_pin_id;

end;
$$;

-- update_pin (versión vigente: 20261007130000)
create or replace function public.update_pin(
  p_pin_id uuid,
  p_ratio pin_ratio,
  p_label text,
  p_language locale,
  p_autoplay_mode pin_autoplay_mode,
  p_alt text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_label text;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select c.type into v_content_type
  from public.pin p
  join public.content c on c.id = p.content_id
  where p.id = p_pin_id;

  if not found then
    raise exception 'Pin not found'
      using errcode = 'P0002';
  end if;

  v_label := nullif(btrim(coalesce(p_label, '')), '');

  if v_content_type not in ('case', 'episode', 'insight') and v_label is null then
    raise exception 'El rótulo del pin es obligatorio para este tipo de contenido'
      using errcode = 'ZG001';
  end if;

  if btrim(coalesce(p_alt, '')) = '' then
    raise exception 'El alt del pin es obligatorio'
      using errcode = '22023';
  end if;

  update public.pin
  set
    ratio = p_ratio,
    label = v_label,
    language = p_language,
    autoplay_mode = p_autoplay_mode,
    alt = btrim(p_alt)
  where id = p_pin_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'update',
    'pin',
    p_pin_id,
    '{}'::jsonb
  );

  return p_pin_id;

end;
$$;

-- attach_pin_image (versión vigente: 20260910083600)
create or replace function public.attach_pin_image(
  p_pin_id uuid,
  p_cloudinary_public_id text,
  p_format text,
  p_width integer,
  p_height integer,
  p_bytes integer,
  p_slide_order integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_slide_count integer;
  v_media_id uuid;
  v_existing_kind media_kind;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.pin where id = p_pin_id) then
    raise exception 'Pin not found'
      using errcode = 'P0002';
  end if;

  if btrim(coalesce(p_cloudinary_public_id, '')) = '' then
    raise exception 'Cloudinary public id is required'
      using errcode = '22023';
  end if;

  if p_width is null or p_width <= 0 or p_height is null or p_height <= 0 then
    raise exception 'Image dimensions are invalid'
      using errcode = '22023';
  end if;

  if p_bytes is null or p_bytes <= 0 then
    raise exception 'Image bytes are invalid'
      using errcode = '22023';
  end if;

  if p_bytes > 5242880 then
    raise exception 'Image is too large'
      using errcode = 'ZG002';
  end if;

  select count(*) into v_slide_count from public.pin_media where pin_id = p_pin_id;

  if v_slide_count >= 8 then
    raise exception 'Un pin admite hasta 8 medios'
      using errcode = 'ZG005';
  end if;

  select id, kind
  into v_media_id, v_existing_kind
  from public.media_asset
  where cloudinary_public_id = p_cloudinary_public_id;

  if found then

    if v_existing_kind <> 'image' then
      raise exception 'Existing media is not an image'
        using errcode = 'P0001';
    end if;

    update public.media_asset
    set format = nullif(btrim(p_format), ''), width = p_width, height = p_height,
        bytes = p_bytes, status = 'ready'
    where id = v_media_id;

  else

    insert into public.media_asset (
      kind, cloudinary_public_id, format, width, height, duration_seconds, bytes, status
    )
    values (
      'image', p_cloudinary_public_id, nullif(btrim(p_format), ''), p_width, p_height, null, p_bytes, 'ready'
    )
    returning id
    into v_media_id;

  end if;

  insert into public.pin_media (pin_id, media_id, slide_order)
  values (p_pin_id, v_media_id, p_slide_order);

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'attach_pin_image',
    'media_asset',
    v_media_id,
    jsonb_build_object('pin_id', p_pin_id, 'slide_order', p_slide_order)
  );

  return v_media_id;

end;
$$;

-- attach_pin_video (versión vigente: 20261005090000)
create or replace function public.attach_pin_video(
  p_pin_id uuid,
  p_cloudinary_public_id text,
  p_format text,
  p_width integer,
  p_height integer,
  p_duration_seconds integer,
  p_bytes integer,
  p_slide_order integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_max_duration integer;
  v_max_bytes integer;
  v_slide_count integer;
  v_media_id uuid;
  v_existing_kind media_kind;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select c.type
  into v_content_type
  from public.pin p
  join public.content c on c.id = p.content_id
  where p.id = p_pin_id;

  if not found then
    raise exception 'Pin not found'
      using errcode = 'P0002';
  end if;

  if btrim(coalesce(p_cloudinary_public_id, '')) = '' then
    raise exception 'Cloudinary public id is required'
      using errcode = '22023';
  end if;

  if v_content_type = 'tool' then
    v_max_duration := 15;
    v_max_bytes := 15728640; -- 15 MB
  else
    v_max_duration := 8;
    v_max_bytes := 104857600; -- 100 MB
  end if;

  if p_duration_seconds is null or p_duration_seconds <= 0 then
    raise exception 'Video duration is invalid'
      using errcode = '22023';
  end if;

  if p_duration_seconds > v_max_duration then
    raise exception 'Animation is too long'
      using errcode = 'ZG004';
  end if;

  if p_bytes is null or p_bytes <= 0 then
    raise exception 'Video bytes are invalid'
      using errcode = '22023';
  end if;

  if p_bytes > v_max_bytes then
    raise exception 'Video is too large'
      using errcode = 'ZG003';
  end if;

  select count(*) into v_slide_count from public.pin_media where pin_id = p_pin_id;

  if v_slide_count >= 8 then
    raise exception 'Un pin admite hasta 8 medios'
      using errcode = 'ZG005';
  end if;

  select id, kind
  into v_media_id, v_existing_kind
  from public.media_asset
  where cloudinary_public_id = p_cloudinary_public_id;

  if found then

    if v_existing_kind <> 'video' then
      raise exception 'Existing media is not a video'
        using errcode = 'P0001';
    end if;

    update public.media_asset
    set format = nullif(btrim(p_format), ''), width = p_width, height = p_height,
        duration_seconds = p_duration_seconds, bytes = p_bytes, status = 'ready'
    where id = v_media_id;

  else

    insert into public.media_asset (
      kind, cloudinary_public_id, format, width, height, duration_seconds, bytes, status
    )
    values (
      'video', p_cloudinary_public_id, nullif(btrim(p_format), ''), p_width, p_height, p_duration_seconds, p_bytes, 'ready'
    )
    returning id
    into v_media_id;

  end if;

  insert into public.pin_media (pin_id, media_id, slide_order)
  values (p_pin_id, v_media_id, p_slide_order);

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'attach_pin_video',
    'media_asset',
    v_media_id,
    jsonb_build_object('pin_id', p_pin_id, 'slide_order', p_slide_order)
  );

  return v_media_id;

end;
$$;

-- detach_pin_media (versión vigente: 20260909091500)
create or replace function public.detach_pin_media(
  p_pin_id uuid,
  p_media_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.pin_media where pin_id = p_pin_id and media_id = p_media_id
  ) then
    raise exception 'Este medio no pertenece a este pin'
      using errcode = 'ZG014';
  end if;

  delete from public.pin_media
  where pin_id = p_pin_id and media_id = p_media_id;

  -- Igual que con los bloques de contenido: si el media_asset sigue
  -- referenciado en otro sitio (otro pin, un bloque, og_media_id), la FK
  -- sin ON DELETE CASCADE hace fallar este DELETE y revierte todo — no
  -- hay que comprobarlo a mano.
  delete from public.media_asset where id = p_media_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'detach_pin_media',
    'media_asset',
    p_media_id,
    jsonb_build_object('pin_id', p_pin_id)
  );

  return p_media_id;

end;
$$;

-- add_case_carousel_image (versión vigente: 20260914090000)
create or replace function public.add_case_carousel_image(
  p_content_id uuid,
  p_cloudinary_public_id text,
  p_format text,
  p_width integer,
  p_height integer,
  p_bytes integer,
  p_sort_order integer,
  p_alt text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_media_id uuid;
  v_existing_kind media_kind;
  v_row_id uuid;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select type into v_content_type
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_content_type <> 'case' then
    raise exception 'Content is not a case'
      using errcode = 'ZG006';
  end if;

  if btrim(coalesce(p_cloudinary_public_id, '')) = '' then
    raise exception 'Cloudinary public id is required'
      using errcode = '22023';
  end if;

  if btrim(coalesce(p_alt, '')) = '' then
    raise exception 'El alt es obligatorio'
      using errcode = '22023';
  end if;

  if p_width is null or p_width <= 0 or p_height is null or p_height <= 0 then
    raise exception 'Image dimensions are invalid'
      using errcode = '22023';
  end if;

  if p_bytes is null or p_bytes <= 0 then
    raise exception 'Image bytes are invalid'
      using errcode = '22023';
  end if;

  if p_bytes > 5242880 then
    raise exception 'Image is too large'
      using errcode = 'ZG002';
  end if;

  select id, kind into v_media_id, v_existing_kind
  from public.media_asset
  where cloudinary_public_id = p_cloudinary_public_id;

  if found then

    if v_existing_kind <> 'image' then
      raise exception 'Existing media is not an image'
        using errcode = 'P0001';
    end if;

    update public.media_asset
    set format = nullif(btrim(p_format), ''), width = p_width, height = p_height,
        bytes = p_bytes, status = 'ready'
    where id = v_media_id;

  else

    insert into public.media_asset (
      kind, cloudinary_public_id, format, width, height, duration_seconds, bytes, status
    )
    values (
      'image', p_cloudinary_public_id, nullif(btrim(p_format), ''), p_width, p_height, null, p_bytes, 'ready'
    )
    returning id into v_media_id;

  end if;

  insert into public.case_detail_media (content_id, media_id, sort_order, alt)
  values (p_content_id, v_media_id, p_sort_order, btrim(p_alt))
  returning id into v_row_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'add_case_carousel_image',
    'media_asset',
    v_media_id,
    jsonb_build_object('content_id', p_content_id, 'sort_order', p_sort_order)
  );

  return v_media_id;

end;
$$;

-- add_case_carousel_video (versión vigente: 20260914090000)
create or replace function public.add_case_carousel_video(
  p_content_id uuid,
  p_cloudinary_public_id text,
  p_format text,
  p_width integer,
  p_height integer,
  p_duration_seconds integer,
  p_bytes integer,
  p_sort_order integer,
  p_alt text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_media_id uuid;
  v_existing_kind media_kind;
  v_row_id uuid;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select type into v_content_type
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_content_type <> 'case' then
    raise exception 'Content is not a case'
      using errcode = 'ZG006';
  end if;

  if btrim(coalesce(p_cloudinary_public_id, '')) = '' then
    raise exception 'Cloudinary public id is required'
      using errcode = '22023';
  end if;

  if btrim(coalesce(p_alt, '')) = '' then
    raise exception 'El alt es obligatorio'
      using errcode = '22023';
  end if;

  if p_width is null or p_width <= 0 or p_height is null or p_height <= 0 then
    raise exception 'Video dimensions are invalid'
      using errcode = '22023';
  end if;

  if p_duration_seconds is null or p_duration_seconds <= 0 then
    raise exception 'Video duration is invalid'
      using errcode = '22023';
  end if;

  if p_duration_seconds > 180 then
    raise exception 'Video is too long'
      using errcode = 'ZG004';
  end if;

  if p_bytes is null or p_bytes <= 0 then
    raise exception 'Video bytes are invalid'
      using errcode = '22023';
  end if;

  if p_bytes > 104857600 then
    raise exception 'Video is too large'
      using errcode = 'ZG003';
  end if;

  select id, kind into v_media_id, v_existing_kind
  from public.media_asset
  where cloudinary_public_id = p_cloudinary_public_id;

  if found then

    if v_existing_kind <> 'video' then
      raise exception 'Existing media is not a video'
        using errcode = 'P0001';
    end if;

    update public.media_asset
    set format = nullif(btrim(p_format), ''), width = p_width, height = p_height,
        duration_seconds = p_duration_seconds, bytes = p_bytes, status = 'ready'
    where id = v_media_id;

  else

    insert into public.media_asset (
      kind, cloudinary_public_id, format, width, height, duration_seconds, bytes, status
    )
    values (
      'video', p_cloudinary_public_id, nullif(btrim(p_format), ''), p_width, p_height, p_duration_seconds, p_bytes, 'ready'
    )
    returning id into v_media_id;

  end if;

  insert into public.case_detail_media (content_id, media_id, sort_order, alt)
  values (p_content_id, v_media_id, p_sort_order, btrim(p_alt))
  returning id into v_row_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'add_case_carousel_video',
    'media_asset',
    v_media_id,
    jsonb_build_object('content_id', p_content_id, 'sort_order', p_sort_order)
  );

  return v_media_id;

end;
$$;

-- remove_case_carousel_media (versión vigente: 20260910083400)
create or replace function public.remove_case_carousel_media(
  p_content_id uuid,
  p_media_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.case_detail_media
    where content_id = p_content_id and media_id = p_media_id
  ) then
    raise exception 'Este medio no pertenece a este caso'
      using errcode = 'ZG014';
  end if;

  delete from public.case_detail_media
  where content_id = p_content_id and media_id = p_media_id;

  -- Igual que pin_media / content_block: si el media_asset sigue
  -- referenciado en otro sitio, la FK sin ON DELETE CASCADE hace fallar
  -- este DELETE y revierte todo.
  delete from public.media_asset where id = p_media_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'remove_case_carousel_media',
    'media_asset',
    p_media_id,
    jsonb_build_object('content_id', p_content_id)
  );

  return p_media_id;

end;
$$;

-- register_cover_image (versión vigente: 20261007110000)
create or replace function public.register_cover_image(
  p_content_id uuid,
  p_cloudinary_public_id text,
  p_format text,
  p_width integer,
  p_height integer,
  p_bytes integer,
  p_ratio pin_ratio
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_previous_media_id uuid;
  v_media_id uuid;
  v_existing_kind media_kind;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select type, cover_media_id into v_content_type, v_previous_media_id
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_content_type <> 'other' then
    raise exception 'Content type does not support a cover image'
      using errcode = 'ZG011';
  end if;

  if btrim(coalesce(p_cloudinary_public_id, '')) = '' then
    raise exception 'Cloudinary public id is required'
      using errcode = '22023';
  end if;

  if p_width is null or p_width <= 0 or p_height is null or p_height <= 0 then
    raise exception 'Image dimensions are invalid'
      using errcode = '22023';
  end if;

  if p_bytes is null or p_bytes <= 0 then
    raise exception 'Image bytes are invalid'
      using errcode = '22023';
  end if;

  if p_bytes > 5242880 then
    raise exception 'Image is too large'
      using errcode = 'ZG002';
  end if;

  if p_ratio is null then
    raise exception 'Ratio is required'
      using errcode = '22023';
  end if;

  select id, kind into v_media_id, v_existing_kind
  from public.media_asset
  where cloudinary_public_id = p_cloudinary_public_id;

  if found then

    if v_existing_kind <> 'image' then
      raise exception 'Existing media is not an image'
        using errcode = 'P0001';
    end if;

    update public.media_asset
    set format = nullif(btrim(p_format), ''), width = p_width, height = p_height,
        bytes = p_bytes, status = 'ready'
    where id = v_media_id;

  else

    insert into public.media_asset (
      kind, cloudinary_public_id, format, width, height, duration_seconds, bytes, status
    )
    values (
      'image', p_cloudinary_public_id, nullif(btrim(p_format), ''), p_width, p_height, null, p_bytes, 'ready'
    )
    returning id into v_media_id;

  end if;

  update public.content
  set cover_media_id = v_media_id, cover_ratio = p_ratio
  where id = p_content_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'register_cover_image',
    'media_asset',
    v_media_id,
    jsonb_build_object('content_id', p_content_id, 'previous_media_id', v_previous_media_id, 'ratio', p_ratio)
  );

  return v_media_id;

end;
$$;

-- register_cover_video (versión vigente: 20260921091500)
create or replace function public.register_cover_video(
  p_content_id uuid,
  p_cloudinary_public_id text,
  p_format text,
  p_width integer,
  p_height integer,
  p_duration_seconds integer,
  p_bytes integer,
  p_ratio pin_ratio
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_previous_media_id uuid;
  v_media_id uuid;
  v_existing_kind media_kind;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select type, cover_media_id into v_content_type, v_previous_media_id
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_content_type <> 'other' then
    raise exception 'Only free-form content supports a cover video'
      using errcode = 'ZG012';
  end if;

  if btrim(coalesce(p_cloudinary_public_id, '')) = '' then
    raise exception 'Cloudinary public id is required'
      using errcode = '22023';
  end if;

  if p_width is null or p_width <= 0 or p_height is null or p_height <= 0 then
    raise exception 'Video dimensions are invalid'
      using errcode = '22023';
  end if;

  if p_duration_seconds is null or p_duration_seconds <= 0 then
    raise exception 'Video duration is invalid'
      using errcode = '22023';
  end if;

  if p_duration_seconds > 180 then
    raise exception 'Video is too long'
      using errcode = 'ZG004';
  end if;

  if p_bytes is null or p_bytes <= 0 then
    raise exception 'Video bytes are invalid'
      using errcode = '22023';
  end if;

  if p_bytes > 104857600 then
    raise exception 'Video is too large'
      using errcode = 'ZG003';
  end if;

  if p_ratio is null then
    raise exception 'Ratio is required'
      using errcode = '22023';
  end if;

  select id, kind into v_media_id, v_existing_kind
  from public.media_asset
  where cloudinary_public_id = p_cloudinary_public_id;

  if found then

    if v_existing_kind <> 'video' then
      raise exception 'Existing media is not a video'
        using errcode = 'P0001';
    end if;

    update public.media_asset
    set format = nullif(btrim(p_format), ''), width = p_width, height = p_height,
        duration_seconds = p_duration_seconds, bytes = p_bytes, status = 'ready'
    where id = v_media_id;

  else

    insert into public.media_asset (
      kind, cloudinary_public_id, format, width, height, duration_seconds, bytes, status
    )
    values (
      'video', p_cloudinary_public_id, nullif(btrim(p_format), ''), p_width, p_height, p_duration_seconds, p_bytes, 'ready'
    )
    returning id into v_media_id;

  end if;

  update public.content
  set cover_media_id = v_media_id, cover_ratio = p_ratio
  where id = p_content_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'register_cover_video',
    'media_asset',
    v_media_id,
    jsonb_build_object('content_id', p_content_id, 'previous_media_id', v_previous_media_id, 'ratio', p_ratio)
  );

  return v_media_id;

end;
$$;

-- unlink_and_delete_cover_media (versión vigente: 20260910083500)
create or replace function public.unlink_and_delete_cover_media(
  p_content_id uuid,
  p_media_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current_media_id uuid;
  v_kind media_kind;
  v_cloudinary_public_id text;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select cover_media_id into v_current_media_id
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_current_media_id is distinct from p_media_id then
    raise exception 'El contenido ya no apunta a este medio (posible carrera con otra pestaña)'
      using errcode = 'ZG013';
  end if;

  select kind, cloudinary_public_id into v_kind, v_cloudinary_public_id
  from public.media_asset
  where id = p_media_id;

  if not found then
    raise exception 'Media not found'
      using errcode = 'P0002';
  end if;

  update public.content
  set cover_media_id = null
  where id = p_content_id;

  delete from public.media_asset where id = p_media_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'delete',
    'media_asset',
    p_media_id,
    jsonb_build_object('content_id', p_content_id, 'kind', v_kind, 'cloudinary_public_id', v_cloudinary_public_id)
  );

  return p_media_id;

end;
$$;

-- upsert_episode (versión vigente: 20260922100000)
create or replace function public.upsert_episode(
  p_content_id uuid,
  p_program episode_program,
  p_number integer,
  p_guest text,
  p_role text,
  p_company text,
  p_episode_date date,
  p_duration_seconds integer,
  p_provider episode_provider,
  p_embed_id text,
  p_language locale,
  p_episode_kind episode_kind
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select type
  into v_content_type
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_content_type <> 'episode' then
    raise exception 'Content is not an episode'
      using errcode = 'ZG007';
  end if;

  if btrim(coalesce(p_embed_id, '')) = '' then
    raise exception 'embed_id is required'
      using errcode = '22023';
  end if;

  if p_number is not null and p_number <= 0 then
    raise exception 'Number must be positive'
      using errcode = '22023';
  end if;

  if p_duration_seconds is not null and p_duration_seconds <= 0 then
    raise exception 'Duration must be positive'
      using errcode = '22023';
  end if;

  insert into public.episode (
    content_id,
    program,
    number,
    guest,
    role,
    company,
    episode_date,
    duration_seconds,
    provider,
    embed_id,
    language,
    episode_kind
  )
  values (
    p_content_id,
    p_program,
    p_number,
    nullif(btrim(p_guest), ''),
    nullif(btrim(p_role), ''),
    nullif(btrim(p_company), ''),
    p_episode_date,
    p_duration_seconds,
    p_provider,
    btrim(p_embed_id),
    p_language,
    p_episode_kind
  )
  on conflict (content_id)
  do update set
    program = excluded.program,
    number = excluded.number,
    guest = excluded.guest,
    role = excluded.role,
    company = excluded.company,
    episode_date = excluded.episode_date,
    duration_seconds = excluded.duration_seconds,
    provider = excluded.provider,
    embed_id = excluded.embed_id,
    language = excluded.language,
    episode_kind = excluded.episode_kind;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'upsert',
    'episode',
    p_content_id,
    jsonb_build_object(
      'program', p_program,
      'provider', p_provider,
      'embed_id', btrim(p_embed_id),
      'language', p_language,
      'episode_kind', p_episode_kind
    )
  );

  return p_content_id;

end;
$$;

-- delete_html_package_version (versión vigente: 20261007140000)
create or replace function public.delete_html_package_version(
  p_content_id uuid,
  p_version_id uuid
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_storage_path text;
  v_version integer;
  v_status html_package_version_status;
  v_current_version_id uuid;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select storage_path, version, status
  into v_storage_path, v_version, v_status
  from public.html_package_version
  where id = p_version_id and package_id = p_content_id;

  if not found then
    raise exception 'La versión no pertenece a este paquete'
      using errcode = 'ZG014';
  end if;

  select current_version_id
  into v_current_version_id
  from public.html_package
  where content_id = p_content_id;

  if v_status = 'published' or v_current_version_id = p_version_id then
    raise exception 'No se puede borrar la versión activa. Publica otra versión antes.'
      using errcode = 'ZG016';
  end if;

  delete from public.html_package_version
  where id = p_version_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'delete_package_version',
    'html_package_version',
    p_version_id,
    jsonb_build_object(
      'content_id', p_content_id,
      'version', v_version,
      'storage_path', v_storage_path
    )
  );

  return v_storage_path;

end;
$$;
