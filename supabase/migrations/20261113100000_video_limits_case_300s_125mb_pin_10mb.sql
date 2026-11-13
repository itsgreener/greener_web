-- 13 nov 2026: topes de los vídeos de caso y de los pines, separados.
--
-- Vídeo del carrusel de un caso (add_case_carousel_video y
-- replace_case_carousel_media):
--   * duración máxima   180 s  ->  300 s
--   * peso máximo       100 MB ->  125 MB (131 072 000 bytes, 125 × 1024²)
--
-- Vídeo de un pin (attach_pin_video), solo los que no son de una tool:
--   * duración máxima   8 s (sin cambios)
--   * peso máximo       100 MB ->  10 MB (10 485 760 bytes, 10 × 1024²)
--   Los pines de tool siguen en 15 s y 15 MB.
--
-- Hasta hoy los pines compartían el tope de peso del contenido; ahora cada
-- uno tiene el suyo (en el código: VIDEO_LIMITS y PIN_ANIMATION_LIMITS en
-- src/modules/media/domain/mediaLimits.ts). Los vídeos que ya estén
-- guardados no se tocan: los topes solo se comprueban al subir o sustituir.
--
-- Son las tres funciones con su cuerpo vigente (20261009120000 las dos de
-- alta y de pin, 20261109140000 la de sustitución) y SOLO cambian esas
-- constantes. `create or replace` conserva los permisos que ya tenían, así
-- que no hay que volver a hacer grant. `register_cover_video` ya no existe
-- (20261015130000) y `register_video_for_block` es de la fase 1: ninguna
-- está implicada.
--
-- Nota: el plan Free de Cloudinary rechaza vídeos de más de 100 MB. Esta
-- migración fija el tope de la web; mientras los vídeos pesados sigan en
-- Cloudinary, de 100 a 125 MB fallará la subida en el proveedor.

-- add_case_carousel_video
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

  if p_duration_seconds > 300 then
    raise exception 'Video is too long'
      using errcode = 'ZG004';
  end if;

  if p_bytes is null or p_bytes <= 0 then
    raise exception 'Video bytes are invalid'
      using errcode = '22023';
  end if;

  if p_bytes > 131072000 then
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

-- replace_case_carousel_media
create or replace function public.replace_case_carousel_media(
  p_content_id uuid,
  p_media_id uuid,
  p_kind media_kind,
  p_cloudinary_public_id text,
  p_format text,
  p_width integer,
  p_height integer,
  p_bytes integer,
  p_alt text,
  p_duration_seconds integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_current_public_id text;
  v_new_media_id uuid;
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

  -- Bloquea la diapositiva: dos sustituciones a la vez de la misma se
  -- serializan, y la segunda ya no la encuentra con el medio que esperaba.
  perform 1
  from public.case_detail_media
  where content_id = p_content_id
    and media_id = p_media_id
  for update;

  if not found then
    raise exception 'Este medio no pertenece a este caso'
      using errcode = 'ZG014';
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
    raise exception 'Media dimensions are invalid'
      using errcode = '22023';
  end if;

  if p_bytes is null or p_bytes <= 0 then
    raise exception 'Media bytes are invalid'
      using errcode = '22023';
  end if;

  if p_kind = 'image' then

    if p_bytes > 5242880 then
      raise exception 'Image is too large'
        using errcode = 'ZG002';
    end if;

  else

    if p_duration_seconds is null or p_duration_seconds <= 0 then
      raise exception 'Video duration is invalid'
        using errcode = '22023';
    end if;

    if p_duration_seconds > 300 then
      raise exception 'Video is too long'
        using errcode = 'ZG004';
    end if;

    if p_bytes > 131072000 then
      raise exception 'Video is too large'
        using errcode = 'ZG003';
    end if;

  end if;

  select cloudinary_public_id into v_current_public_id
  from public.media_asset
  where id = p_media_id;

  if v_current_public_id = p_cloudinary_public_id then
    raise exception 'El archivo nuevo es el mismo que el actual'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from public.media_asset
    where cloudinary_public_id = p_cloudinary_public_id
  ) then
    raise exception 'Este archivo ya está registrado'
      using errcode = '22023';
  end if;

  insert into public.media_asset (
    kind, cloudinary_public_id, format, width, height, duration_seconds, bytes, status
  )
  values (
    p_kind,
    p_cloudinary_public_id,
    nullif(btrim(p_format), ''),
    p_width,
    p_height,
    case when p_kind = 'video' then p_duration_seconds else null end,
    p_bytes,
    'ready'
  )
  returning id into v_new_media_id;

  update public.case_detail_media
  set media_id = v_new_media_id,
      alt = btrim(p_alt)
  where content_id = p_content_id
    and media_id = p_media_id;

  delete from public.media_asset where id = p_media_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'replace_case_carousel_media',
    'media_asset',
    v_new_media_id,
    jsonb_build_object(
      'content_id', p_content_id,
      'previous_media_id', p_media_id,
      'kind', p_kind
    )
  );

  return v_new_media_id;

end;
$$;

-- attach_pin_video
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
    v_max_bytes := 10485760; -- 10 MB
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
