-- Vídeos de demostración en las tools (5 oct 2026).
--
-- Hasta ahora `attach_pin_video` aplicaba a TODOS los pines el mismo límite
-- (5 s, 100 MB). Pasa a depender del tipo de contenido al que pertenece el
-- pin:
--
--   * pin de una tool  -> 15 s y 15 MB (el vídeo sustituye a la imagen de la
--                         ficha /tools/{slug}?pin=..., se ve entero)
--   * resto de pines   -> 8 s y 100 MB (la animación del feed; antes 5 s)
--
-- Misma firma que la versión anterior (20260910083600), así que `create or
-- replace` basta y los permisos se conservan. Las constantes viven también en
-- src/modules/media/domain/mediaLimits.ts (PIN_ANIMATION_LIMITS y
-- TOOL_PIN_VIDEO_LIMITS): si cambian, hay que cambiarlas en los dos sitios
-- (un test vigila el lado TypeScript).

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
      using errcode = '22023';
  end if;

  if p_bytes is null or p_bytes <= 0 then
    raise exception 'Video bytes are invalid'
      using errcode = '22023';
  end if;

  if p_bytes > v_max_bytes then
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
