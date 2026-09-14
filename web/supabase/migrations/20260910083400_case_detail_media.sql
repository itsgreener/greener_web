-- especificacion-final-formato-detalle.md §3, §6: "Nueva tabla
-- independiente para el carrusel de detalle de un caso (1-N imágenes/
-- vídeos mixtos, sin tope) — no reutiliza pin_media." A diferencia de
-- pin_media (hasta 8, con límite), aquí no hay tope de filas — solo el
-- límite de peso/duración por archivo, igual que el vídeo de un bloque
-- de contenido (100 MB / 180 s), no el de 5 s de un pin animado.

create table case_detail_media (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references content (id) on delete cascade,
  media_id uuid not null references media_asset (id),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index case_detail_media_content_id_sort_idx
  on case_detail_media (content_id, sort_order);

comment on table case_detail_media is
  'Carrusel de detalle de un caso (especificacion-final-formato-detalle.md §3): 1-N imágenes/vídeos mixtos, sin tope. Tabla independiente de pin_media a propósito.';

alter table case_detail_media enable row level security;

create policy case_detail_media_public_read on case_detail_media
  for select using (
    exists (select 1 from content c where c.id = content_id and c.status = 'published')
  );

create policy case_detail_media_admin_all on case_detail_media
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- ADD CASE CAROUSEL IMAGE
-- ============================================================

create or replace function public.add_case_carousel_image(
  p_content_id uuid,
  p_cloudinary_public_id text,
  p_format text,
  p_width integer,
  p_height integer,
  p_bytes integer,
  p_sort_order integer
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

  insert into public.case_detail_media (content_id, media_id, sort_order)
  values (p_content_id, v_media_id, p_sort_order)
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

revoke all on function public.add_case_carousel_image(uuid, text, text, integer, integer, integer, integer) from public;
grant execute on function public.add_case_carousel_image(uuid, text, text, integer, integer, integer, integer) to authenticated;

-- ============================================================
-- ADD CASE CAROUSEL VIDEO
-- ============================================================

create or replace function public.add_case_carousel_video(
  p_content_id uuid,
  p_cloudinary_public_id text,
  p_format text,
  p_width integer,
  p_height integer,
  p_duration_seconds integer,
  p_bytes integer,
  p_sort_order integer
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

  insert into public.case_detail_media (content_id, media_id, sort_order)
  values (p_content_id, v_media_id, p_sort_order)
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

revoke all on function public.add_case_carousel_video(uuid, text, text, integer, integer, integer, integer, integer) from public;
grant execute on function public.add_case_carousel_video(uuid, text, text, integer, integer, integer, integer, integer) to authenticated;

-- ============================================================
-- REMOVE CASE CAROUSEL MEDIA
-- ============================================================

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
      using errcode = 'P0001';
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

revoke all on function public.remove_case_carousel_media(uuid, uuid) from public;
grant execute on function public.remove_case_carousel_media(uuid, uuid) to authenticated;
