-- especificacion-final-formato-detalle.md §2: el modelo de columnas del
-- panel de recomendaciones agrupa por ratio cerrado ("la imagen nunca se
-- mide en columnas, su ancho sale siempre de altura fija × ratio, igual
-- en tipo A, B y contenido libre"). cover_media_id (tool/insight/other)
-- no tenía ningún ratio propio — solo width/height reales del archivo
-- subido — así que no había forma determinista de saber a qué grupo
-- (16:9 / 1:1,4:3 / verticales) pertenece una portada. Se reutiliza el
-- mismo enum cerrado pin_ratio que ya usa `pin`, en vez de duplicarlo:
-- es el mismo concepto (especificacion-final-formato-detalle.md §4), no
-- uno nuevo por contexto.
--
-- Deliberadamente NO cubre case_detail_media (el carrusel de tipo B):
-- ahí un ratio por content no basta de forma evidente porque el carrusel
-- trae 1-N imágenes/vídeos mixtos, no una única portada — qué ratio
-- gobierna la reserva de columnas del bloque cuando el carrusel avanza
-- de slide es una pregunta de diseño abierta, no una omisión de esta
-- migración.

alter table content
  add column cover_ratio pin_ratio;

comment on column content.cover_ratio is
  'Ratio cerrado de cover_media_id (especificacion-final-formato-detalle.md §2, §4) — determina el grupo de columnas del panel de recomendaciones de tipo A/libre. NULL solo en contenido sin portada todavía.';

-- ============================================================
-- REGISTER COVER IMAGE — añade p_ratio, obligatorio
-- ============================================================

drop function if exists public.register_cover_image(
  uuid, text, text, integer, integer, integer
);

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

  if v_content_type not in ('tool', 'insight', 'other') then
    raise exception 'Content type does not support a cover image'
      using errcode = 'P0001';
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

revoke all on function public.register_cover_image(uuid, text, text, integer, integer, integer, pin_ratio) from public;
grant execute on function public.register_cover_image(uuid, text, text, integer, integer, integer, pin_ratio) to authenticated;

-- ============================================================
-- REGISTER COVER VIDEO — añade p_ratio, obligatorio (solo "other")
-- ============================================================

drop function if exists public.register_cover_video(
  uuid, text, text, integer, integer, integer, integer
);

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
      using errcode = 'P0001';
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

revoke all on function public.register_cover_video(uuid, text, text, integer, integer, integer, integer, pin_ratio) from public;
grant execute on function public.register_cover_video(uuid, text, text, integer, integer, integer, integer, pin_ratio) to authenticated;
