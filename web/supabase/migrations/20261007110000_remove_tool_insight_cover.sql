-- 7 oct 2026: se elimina la portada ("miniatura") de tool e insight.
-- Tool genera su miniatura dinámicamente con ?pin=<pinId> (reutiliza el
-- medio del pin) e insight salta la pantalla de detalle y va directo a
-- /app, así que cover_media_id / cover_ratio ya no significan nada para
-- ellos. El tipo "other" (variety) SÍ sigue usando portada (imagen o
-- vídeo) como contenido principal, por eso la columna y las RPC se
-- conservan y lo que se cierra es el acceso desde tool/insight:
--   1. Se limpian los datos existentes (cover_media_id/cover_ratio a
--      NULL y se borra el media_asset si ningún otro sitio lo usa; el
--      recurso de Cloudinary queda huérfano y lo detecta
--      scripts/reconcile-cloudinary.mjs).
--   2. register_cover_image pasa a aceptar solo "other" (register_cover_video
--      ya era solo "other").
--   3. CHECK en content: solo "other" puede tener portada, de modo que
--      ninguna ruta futura pueda reintroducirla.

do $$
declare
  v_media_ids uuid[];
begin

  select coalesce(array_agg(distinct cover_media_id), '{}')
  into v_media_ids
  from public.content
  where type in ('tool', 'insight') and cover_media_id is not null;

  update public.content
  set cover_media_id = null, cover_ratio = null
  where type in ('tool', 'insight')
    and (cover_media_id is not null or cover_ratio is not null);

  delete from public.media_asset ma
  where ma.id = any (v_media_ids)
    and not exists (select 1 from public.pin_media pm where pm.media_id = ma.id)
    and not exists (select 1 from public.case_detail_media cdm where cdm.media_id = ma.id)
    and not exists (
      select 1 from public.content c
      where c.cover_media_id = ma.id or c.og_media_id = ma.id
    );

end;
$$;

alter table public.content
  add constraint content_cover_only_for_other
  check (type = 'other' or (cover_media_id is null and cover_ratio is null));

comment on column public.content.cover_media_id is
  'Imagen o vídeo de portada del detalle. Solo tipo other (variety); tool e insight no tienen portada (7 oct 2026, constraint content_cover_only_for_other). Distinto de og_media_id.';

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
