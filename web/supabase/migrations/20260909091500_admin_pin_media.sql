-- Medios de un pin (§9.1, §15.5): fixed → 1 imagen; animated → 1 vídeo
-- (Cloudinary resuelve MP4/WebM y poster por URL al vuelo, §9.2 — no se
-- suben tres archivos por pin); carousel → hasta 8 imágenes ordenadas.
-- El límite de tamaño de imagen (5 MB) es el mismo que el resto del
-- sitio (IMAGE_LIMITS); el de vídeo aquí es de DURACIÓN (5 s, §9.1), no
-- el de 180 s que aplica al vídeo de un bloque de contenido — son límites
-- de negocio distintos aunque ambos sean "vídeo".

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
  v_pin_type pin_type;
  v_slide_count integer;
  v_media_id uuid;
  v_existing_kind media_kind;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select type into v_pin_type from public.pin where id = p_pin_id;

  if not found then
    raise exception 'Pin not found'
      using errcode = 'P0002';
  end if;

  if v_pin_type = 'animated' then
    raise exception 'Un pin animado necesita un vídeo, no una imagen'
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

  select count(*) into v_slide_count from public.pin_media where pin_id = p_pin_id;

  if v_pin_type = 'fixed' and v_slide_count >= 1 then
    raise exception 'Este pin ya tiene una imagen; bórrala antes de subir otra'
      using errcode = 'P0001';
  end if;

  if v_pin_type = 'carousel' and v_slide_count >= 8 then
    raise exception 'Un carrusel admite hasta 8 slides'
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


create or replace function public.attach_pin_video(
  p_pin_id uuid,
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
  v_pin_type pin_type;
  v_slide_count integer;
  v_media_id uuid;
  v_existing_kind media_kind;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select type into v_pin_type from public.pin where id = p_pin_id;

  if not found then
    raise exception 'Pin not found'
      using errcode = 'P0002';
  end if;

  if v_pin_type <> 'animated' then
    raise exception 'Solo un pin animado admite vídeo'
      using errcode = 'P0001';
  end if;

  if btrim(coalesce(p_cloudinary_public_id, '')) = '' then
    raise exception 'Cloudinary public id is required'
      using errcode = '22023';
  end if;

  if p_duration_seconds is null or p_duration_seconds <= 0 then
    raise exception 'Video duration is invalid'
      using errcode = '22023';
  end if;

  -- Límite de negocio distinto al del vídeo de un bloque de contenido
  -- (180 s): un pin animado es un loop corto (§9.1), no un vídeo de caso.
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

  if v_slide_count >= 1 then
    raise exception 'Este pin ya tiene un vídeo; bórralo antes de subir otro'
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
  values (p_pin_id, v_media_id, 0);

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'attach_pin_video',
    'media_asset',
    v_media_id,
    jsonb_build_object('pin_id', p_pin_id)
  );

  return v_media_id;

end;
$$;


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
      using errcode = 'P0001';
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

revoke all on function public.attach_pin_image(uuid, text, text, integer, integer, integer, integer) from public;
grant execute on function public.attach_pin_image(uuid, text, text, integer, integer, integer, integer) to authenticated;

revoke all on function public.attach_pin_video(uuid, text, text, integer, integer, integer, integer) from public;
grant execute on function public.attach_pin_video(uuid, text, text, integer, integer, integer, integer) to authenticated;

revoke all on function public.detach_pin_media(uuid, uuid) from public;
grant execute on function public.detach_pin_media(uuid, uuid) to authenticated;
