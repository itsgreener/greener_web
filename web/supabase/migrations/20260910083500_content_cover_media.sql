-- especificacion-final-formato-detalle.md §3: tool/insight llevan 1 imagen
-- de portada (WebP, máx. 5 MB); "other" admite imagen O vídeo (nunca
-- ambos). Vive como columna directa en content, igual que og_media_id —
-- no hace falta una tabla de extensión propia solo para esto.

alter table content
  add column cover_media_id uuid references media_asset (id);

comment on column content.cover_media_id is
  'Imagen (tool/insight/other) o vídeo (solo other) de portada del detalle (especificacion-final-formato-detalle.md §3). Distinto de og_media_id, que es la imagen de compartición (Open Graph).';

-- ============================================================
-- REGISTER COVER IMAGE — tool, insight, other
-- ============================================================

create or replace function public.register_cover_image(
  p_content_id uuid,
  p_cloudinary_public_id text,
  p_format text,
  p_width integer,
  p_height integer,
  p_bytes integer
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
  set cover_media_id = v_media_id
  where id = p_content_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'register_cover_image',
    'media_asset',
    v_media_id,
    jsonb_build_object('content_id', p_content_id, 'previous_media_id', v_previous_media_id)
  );

  return v_media_id;

end;
$$;

revoke all on function public.register_cover_image(uuid, text, text, integer, integer, integer) from public;
grant execute on function public.register_cover_image(uuid, text, text, integer, integer, integer) to authenticated;

-- ============================================================
-- REGISTER COVER VIDEO — solo other (tool/insight son imagen únicamente)
-- ============================================================

create or replace function public.register_cover_video(
  p_content_id uuid,
  p_cloudinary_public_id text,
  p_format text,
  p_width integer,
  p_height integer,
  p_duration_seconds integer,
  p_bytes integer
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
  set cover_media_id = v_media_id
  where id = p_content_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'register_cover_video',
    'media_asset',
    v_media_id,
    jsonb_build_object('content_id', p_content_id, 'previous_media_id', v_previous_media_id)
  );

  return v_media_id;

end;
$$;

revoke all on function public.register_cover_video(uuid, text, text, integer, integer, integer, integer) from public;
grant execute on function public.register_cover_video(uuid, text, text, integer, integer, integer, integer) to authenticated;

-- ============================================================
-- UNLINK + DELETE COVER MEDIA — al sustituirla, mismo criterio que
-- unlink_and_delete_media_asset (evita medios huérfanos en Cloudinary).
-- ============================================================

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
      using errcode = 'P0001';
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

revoke all on function public.unlink_and_delete_cover_media(uuid, uuid) from public;
grant execute on function public.unlink_and_delete_cover_media(uuid, uuid) to authenticated;
