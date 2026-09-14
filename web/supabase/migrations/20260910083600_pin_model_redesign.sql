-- especificacion-final-formato-detalle.md §3, §6:
--
--   - pin_type (fixed/animated/carousel) desaparece. Un pin admite de 1 a
--     8 medios mixtos (imagen o vídeo ≤5 s), sin distinción de "tipo" —
--     solo un flag show_as_carousel que decide si el feed lo muestra
--     agrupado (una tarjeta con carrusel) o como N tarjetas
--     independientes, una por medio (motor de feed, capa de
--     infraestructura — el dominio ya trata cada "pin" del feed como un
--     id de texto opaco, así que no hace falta tocar el algoritmo).
--   - label pasa a opcional: "obligatorio en tool/insight/libre, opcional
--     (no se muestra) en caso/episodio" (§3) — antes era NOT NULL sin
--     condición.
--   - cta desaparece de pin: el §3 "Pin (todos los tipos)" ya no lo
--     lista como campo a recopilar, y el §1 deja claro que el CTA del
--     feed es fijo por tipo de contenido (Use/Read/Watch), no un texto
--     libre por pin — se calcula en la capa de respuesta, no se
--     almacena.
--
-- Orden dentro de este archivo: las columnas nuevas (show_as_carousel,
-- label opcional) se añaden ANTES de crear las funciones que las usan —
-- si no, create_pin/update_pin fallarían al crearse (check_function_bodies
-- valida las columnas referenciadas). Las columnas viejas (type, cta) se
-- borran DESPUÉS de sustituir las funciones que las usaban, y pin_type
-- se borra el último, cuando ya no cuelga nada de él.

-- ============================================================
-- 1. pin — columnas nuevas primero
-- ============================================================

alter table pin
  add column show_as_carousel boolean not null default true;

comment on column pin.show_as_carousel is
  'true: el feed muestra el pin como una sola tarjeta con carrusel entre sus medios. false: cada medio del pin se ofrece como tarjeta independiente y seleccionable por el motor de feed (especificacion-final-formato-detalle.md §3, §6).';

alter table pin
  alter column label drop not null;

-- ============================================================
-- 2. attach_pin_image — sin distinción de tipo, solo cuenta <8
-- ============================================================

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
      using errcode = '22023';
  end if;

  select count(*) into v_slide_count from public.pin_media where pin_id = p_pin_id;

  if v_slide_count >= 8 then
    raise exception 'Un pin admite hasta 8 medios'
      using errcode = 'P0001';
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

revoke all on function public.attach_pin_image(uuid, text, text, integer, integer, integer, integer) from public;
grant execute on function public.attach_pin_image(uuid, text, text, integer, integer, integer, integer) to authenticated;

-- ============================================================
-- 3. attach_pin_video — gana p_slide_order, sin distinción de tipo
-- ============================================================

drop function if exists public.attach_pin_video(uuid, text, text, integer, integer, integer, integer);

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

  if p_duration_seconds is null or p_duration_seconds <= 0 then
    raise exception 'Video duration is invalid'
      using errcode = '22023';
  end if;

  -- Límite de negocio distinto al del vídeo de caso (180 s): el vídeo de
  -- un pin es un loop corto (§9.1 de la arquitectura original), no un
  -- vídeo de caso — se mantiene aunque ya no exista el tipo "animated".
  if p_duration_seconds > 5 then
    raise exception 'Animation is too long'
      using errcode = '22023';
  end if;

  if p_bytes is null or p_bytes <= 0 then
    raise exception 'Video bytes are invalid'
      using errcode = '22023';
  end if;

  if p_bytes > 104857600 then
    raise exception 'Video is too large'
      using errcode = '22023';
  end if;

  select count(*) into v_slide_count from public.pin_media where pin_id = p_pin_id;

  if v_slide_count >= 8 then
    raise exception 'Un pin admite hasta 8 medios'
      using errcode = 'P0001';
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

revoke all on function public.attach_pin_video(uuid, text, text, integer, integer, integer, integer, integer) from public;
grant execute on function public.attach_pin_video(uuid, text, text, integer, integer, integer, integer, integer) to authenticated;

-- ============================================================
-- 4. create_pin — sin p_type, sin p_cta, con p_show_as_carousel;
--    label obligatorio salvo en case/episode (§3)
-- ============================================================

drop function if exists public.create_pin(
  uuid, pin_type, pin_ratio, text, text, locale, pin_autoplay_mode, integer, integer, text
);

create or replace function public.create_pin(
  p_content_id uuid,
  p_ratio pin_ratio,
  p_show_as_carousel boolean,
  p_label text,
  p_language locale,
  p_autoplay_mode pin_autoplay_mode,
  p_speed_ms integer,
  p_queue_order integer,
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

  if v_content_type not in ('case', 'episode') and v_label is null then
    raise exception 'El rótulo del pin es obligatorio para este tipo de contenido'
      using errcode = '22023';
  end if;

  if btrim(coalesce(p_alt, '')) = '' then
    raise exception 'El alt del pin es obligatorio'
      using errcode = '22023';
  end if;

  if p_queue_order < 0 then
    raise exception 'queue_order no puede ser negativo'
      using errcode = '22023';
  end if;

  insert into public.pin (
    content_id, ratio, show_as_carousel, label, language,
    autoplay_mode, speed_ms, queue_order, alt
  )
  values (
    p_content_id, p_ratio, p_show_as_carousel, v_label,
    p_language, p_autoplay_mode, p_speed_ms, p_queue_order, btrim(p_alt)
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

revoke all on function public.create_pin(uuid, pin_ratio, boolean, text, locale, pin_autoplay_mode, integer, integer, text) from public;
grant execute on function public.create_pin(uuid, pin_ratio, boolean, text, locale, pin_autoplay_mode, integer, integer, text) to authenticated;

-- ============================================================
-- 5. update_pin — mismos cambios que create_pin
-- ============================================================

drop function if exists public.update_pin(
  uuid, pin_ratio, text, text, locale, pin_autoplay_mode, integer, integer, text
);

create or replace function public.update_pin(
  p_pin_id uuid,
  p_ratio pin_ratio,
  p_show_as_carousel boolean,
  p_label text,
  p_language locale,
  p_autoplay_mode pin_autoplay_mode,
  p_speed_ms integer,
  p_queue_order integer,
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

  if v_content_type not in ('case', 'episode') and v_label is null then
    raise exception 'El rótulo del pin es obligatorio para este tipo de contenido'
      using errcode = '22023';
  end if;

  if btrim(coalesce(p_alt, '')) = '' then
    raise exception 'El alt del pin es obligatorio'
      using errcode = '22023';
  end if;

  if p_queue_order < 0 then
    raise exception 'queue_order no puede ser negativo'
      using errcode = '22023';
  end if;

  update public.pin
  set
    ratio = p_ratio,
    show_as_carousel = p_show_as_carousel,
    label = v_label,
    language = p_language,
    autoplay_mode = p_autoplay_mode,
    speed_ms = p_speed_ms,
    queue_order = p_queue_order,
    alt = btrim(p_alt)
  where id = p_pin_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'update',
    'pin',
    p_pin_id,
    jsonb_build_object('queue_order', p_queue_order)
  );

  return p_pin_id;

end;
$$;

revoke all on function public.update_pin(uuid, pin_ratio, boolean, text, locale, pin_autoplay_mode, integer, integer, text) from public;
grant execute on function public.update_pin(uuid, pin_ratio, boolean, text, locale, pin_autoplay_mode, integer, integer, text) to authenticated;

-- ============================================================
-- 6. pin — ahora sí, fuera type y cta; y pin_type deja de hacer falta
-- ============================================================

alter table pin
  drop column type,
  drop column cta;

drop type pin_type;
