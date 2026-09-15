-- Hueco de accesibilidad detectado al construir /work/[slug] (§2 de
-- PROGRESO.md, sesión del 10 sep): case_detail_media no tenía alt propio,
-- a diferencia de pin (§7.4 de la arquitectura, "alt not null"). La
-- página pública usaba un alt calculado a partir del título como parche
-- — esto lo sustituye por el campo real.
--
-- add column ... not null default '' primero (seguro haya o no filas ya
-- cargadas) y drop default después: así cualquier fila que ya exista
-- queda con alt vacío en vez de romper la migración, pero cualquier
-- INSERT nuevo a partir de aquí tiene que traer un valor explícito — ya
-- no hay manera de colarse con un alt vacío por omisión, igual que pin.alt.

alter table case_detail_media
  add column alt text not null default '';

alter table case_detail_media
  alter column alt drop default;

comment on column case_detail_media.alt is
  'Alt de accesibilidad de este elemento del carrusel de detalle. Obligatorio desde el ABM (add_case_carousel_image/video) — no hay valor por defecto silencioso.';

-- ============================================================
-- add_case_carousel_image — gana p_alt
-- ============================================================

drop function if exists public.add_case_carousel_image(
  uuid, text, text, integer, integer, integer, integer
);

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
      using errcode = 'P0001';
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

revoke all on function public.add_case_carousel_image(uuid, text, text, integer, integer, integer, integer, text) from public;
grant execute on function public.add_case_carousel_image(uuid, text, text, integer, integer, integer, integer, text) to authenticated;

-- ============================================================
-- add_case_carousel_video — gana p_alt
-- ============================================================

drop function if exists public.add_case_carousel_video(
  uuid, text, text, integer, integer, integer, integer, integer
);

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
      using errcode = 'P0001';
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

revoke all on function public.add_case_carousel_video(uuid, text, text, integer, integer, integer, integer, integer, text) from public;
grant execute on function public.add_case_carousel_video(uuid, text, text, integer, integer, integer, integer, integer, text) to authenticated;
