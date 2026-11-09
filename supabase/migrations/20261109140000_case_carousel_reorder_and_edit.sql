-- 9 nov 2026 (docs/especificaciones/plan-carrusel-orden-y-edicion.md, §2.146):
-- reordenar y editar las diapositivas ya subidas del carrusel de un case.
--
-- Hasta hoy el carrusel solo tenía alta (`add_case_carousel_image` y
-- `add_case_carousel_video`) y baja (`remove_case_carousel_media`): para
-- cambiar el orden, el alt o el archivo de una diapositiva había que quitarla
-- y volver a subirla. Tres funciones nuevas, con el mismo patrón que las
-- existentes (`security invoker`, `is_admin()`, constancia en `audit_log`,
-- códigos de error tipados de 20261009120000):
--
--   1. reorder_case_carousel          nuevo orden de TODAS las diapositivas
--   2. update_case_carousel_alt       cambia solo el alt de una diapositiva
--   3. replace_case_carousel_media    sustituye el medio de una diapositiva
--                                     conservando su posición
--
-- No cambia ninguna tabla ni función existente, así que se puede aplicar sin
-- coordinar con el despliegue: la web que no las llama sigue funcionando; solo
-- los botones «Guardar orden» y «Guardar cambios» del ABM la necesitan.
--
-- Códigos de error (todos ya existentes):
--   42501  no es administrador
--   P0002  el contenido no existe
--   ZG006  el contenido no es un case
--   ZG014  la diapositiva no pertenece a este caso, o el carrusel ya no
--          coincide con el orden enviado (otra pestaña lo cambió)
--   ZG002  la imagen supera el tamaño máximo
--   ZG003  el vídeo supera el peso máximo
--   ZG004  el vídeo supera la duración máxima
--   22023  datos inválidos
--   23503  (FK) el medio anterior se sigue usando en otro sitio: se revierte todo


-- ============================================================
-- REORDER CASE CAROUSEL
-- ============================================================
--
-- Recibe la lista COMPLETA de medios del carrusel en el orden nuevo y deja
-- `sort_order` = posición - 1 (0, 1, 2…). Es denso a propósito: además de
-- aplicar el orden pedido, deshace cualquier empate o hueco que quedara de
-- antes (`sort_order` no es único ni se renumera al quitar).
--
-- La lista tiene que coincidir EXACTAMENTE con los medios que hay ahora: si
-- otra pestaña añadió o quitó alguno, se rechaza en lugar de pisar su cambio.

create or replace function public.reorder_case_carousel(
  p_content_id uuid,
  p_media_ids uuid[]
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_requested uuid[];
  v_current uuid[];
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

  if p_media_ids is null then
    raise exception 'La lista de medios es obligatoria'
      using errcode = '22023';
  end if;

  if cardinality(p_media_ids) <> (
    select count(distinct media_id) from unnest(p_media_ids) as media_id
  ) then
    raise exception 'La lista de medios tiene repetidos'
      using errcode = '22023';
  end if;

  -- Bloquea las filas: dos reordenaciones (o una reordenación y un alta) a la
  -- vez se serializan en vez de entremezclarse.
  select coalesce(array_agg(locked.media_id order by locked.media_id), '{}'::uuid[])
  into v_current
  from (
    select media_id
    from public.case_detail_media
    where content_id = p_content_id
    for update
  ) as locked;

  select coalesce(array_agg(media_id order by media_id), '{}'::uuid[])
  into v_requested
  from unnest(p_media_ids) as media_id;

  if v_requested is distinct from v_current then
    raise exception 'El carrusel ha cambiado desde otra pestaña: recarga la página'
      using errcode = 'ZG014';
  end if;

  update public.case_detail_media as cdm
  set sort_order = ordered.pos - 1
  from unnest(p_media_ids) with ordinality as ordered(media_id, pos)
  where cdm.content_id = p_content_id
    and cdm.media_id = ordered.media_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'reorder_case_carousel',
    'content',
    p_content_id,
    jsonb_build_object('content_id', p_content_id, 'count', cardinality(p_media_ids))
  );

  return cardinality(p_media_ids);

end;
$$;

revoke all on function public.reorder_case_carousel(uuid, uuid[]) from public;
grant execute on function public.reorder_case_carousel(uuid, uuid[]) to authenticated;


-- ============================================================
-- UPDATE CASE CAROUSEL ALT
-- ============================================================
--
-- Solo el texto alternativo: no toca el medio ni la posición.

create or replace function public.update_case_carousel_alt(
  p_content_id uuid,
  p_media_id uuid,
  p_alt text
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

  if btrim(coalesce(p_alt, '')) = '' then
    raise exception 'El alt es obligatorio'
      using errcode = '22023';
  end if;

  update public.case_detail_media
  set alt = btrim(p_alt)
  where content_id = p_content_id
    and media_id = p_media_id;

  if not found then
    raise exception 'Este medio no pertenece a este caso'
      using errcode = 'ZG014';
  end if;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'update_case_carousel_alt',
    'media_asset',
    p_media_id,
    jsonb_build_object('content_id', p_content_id)
  );

  return p_media_id;

end;
$$;

revoke all on function public.update_case_carousel_alt(uuid, uuid, text) from public;
grant execute on function public.update_case_carousel_alt(uuid, uuid, text) to authenticated;


-- ============================================================
-- REPLACE CASE CAROUSEL MEDIA
-- ============================================================
--
-- Sustituye el archivo de una diapositiva por otro (imagen o vídeo; el tipo
-- puede cambiar) sin perder su sitio: la MISMA fila de `case_detail_media`
-- pasa a apuntar al `media_asset` nuevo, con el alt que llega (el del panel de
-- edición), y el `media_asset` anterior se borra en la misma transacción.
--
-- Borrar el archivo de Cloudinary no es cosa de Postgres: lo hace la
-- aplicación DESPUÉS, leyendo antes de aquí qué archivo era (nunca el que
-- mande el navegador). Si el medio anterior se sigue usando en otro sitio, la
-- FK sin ON DELETE CASCADE hace fallar el DELETE y se revierte todo, igual que
-- en `remove_case_carousel_media`.
--
-- El public id nuevo tiene que ser distinto del actual y no estar registrado
-- ya (una subida firmada genera siempre uno nuevo; reutilizar un media_asset
-- existente, como permiten las altas, dejaría dos referencias a un medio que
-- se va a borrar).

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

    if p_duration_seconds > 180 then
      raise exception 'Video is too long'
        using errcode = 'ZG004';
    end if;

    if p_bytes > 104857600 then
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

revoke all on function public.replace_case_carousel_media(uuid, uuid, media_kind, text, text, integer, integer, integer, text, integer) from public;
grant execute on function public.replace_case_carousel_media(uuid, uuid, media_kind, text, text, integer, integer, integer, text, integer) to authenticated;
