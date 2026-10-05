-- Limpieza de medios huérfanos (5 oct 2026).
--
-- Hasta hoy `delete_pin` y `delete_content` dejaban los `media_asset` del
-- pin / contenido borrado «deliberadamente» sin tocar (ver el comentario
-- que tenía delete_pin: «se revisará si el volumen real lo justifica»).
-- Con el plan Free de Cloudinary no se puede acumular basura: estas dos
-- funciones pasan a borrar, en la MISMA transacción, los `media_asset` que
-- se quedan sin ninguna referencia. El archivo real en Cloudinary lo borra
-- después la capa de aplicación (src/modules/media/application/
-- cleanupMedia.ts) con la lista que leyó antes de borrar.
--
-- Un `media_asset` que SIGUE referenciado desde otro sitio (otro pin, el
-- carrusel de un caso, una portada o la imagen og de otro contenido) no se
-- toca: se comprueba explícitamente aquí abajo, no se confía en que falle
-- una FK. Misma firma que las versiones anteriores: `create or replace`.

-- ============================================================
-- delete_pin
-- ============================================================

create or replace function public.delete_pin(
  p_pin_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_id uuid;
  v_media_ids uuid[];
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select content_id
  into v_content_id
  from public.pin
  where id = p_pin_id;

  if not found then
    raise exception 'Pin not found'
      using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct media_id), '{}')
  into v_media_ids
  from public.pin_media
  where pin_id = p_pin_id;

  -- pin_media tiene ON DELETE CASCADE desde pin_id: se limpia solo.
  delete from public.pin where id = p_pin_id;

  delete from public.media_asset ma
  where ma.id = any (v_media_ids)
    and not exists (select 1 from public.pin_media pm where pm.media_id = ma.id)
    and not exists (select 1 from public.case_detail_media cdm where cdm.media_id = ma.id)
    and not exists (
      select 1 from public.content c
      where c.cover_media_id = ma.id or c.og_media_id = ma.id
    );

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'delete',
    'pin',
    p_pin_id,
    jsonb_build_object('content_id', v_content_id, 'media_count', cardinality(v_media_ids))
  );

  return p_pin_id;

end;
$$;

revoke all on function public.delete_pin(uuid) from public;
grant execute on function public.delete_pin(uuid) to authenticated;

-- ============================================================
-- delete_content
-- ============================================================

create or replace function public.delete_content(
  p_content_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status content_status;
  v_type content_type;
  v_slug text;
  v_title text;
  v_media_ids uuid[];
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select
    c.status,
    c.type,
    c.slug,
    ct.title
  into
    v_status,
    v_type,
    v_slug,
    v_title
  from public.content c
  left join public.content_translation ct
    on ct.content_id = c.id
    and ct.locale = c.default_locale
  where c.id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_status <> 'draft' then
    raise exception 'Only draft content can be deleted'
      using errcode = 'P0001';
  end if;

  -- Todos los medios que cuelgan de este contenido, ANTES de borrarlo:
  -- portada, imagen og, medios de sus pines y carrusel de detalle.
  select coalesce(array_agg(distinct media_id), '{}')
  into v_media_ids
  from (
    select cover_media_id as media_id from public.content where id = p_content_id
    union
    select og_media_id from public.content where id = p_content_id
    union
    select pm.media_id
    from public.pin_media pm
    join public.pin p on p.id = pm.pin_id
    where p.content_id = p_content_id
    union
    select cdm.media_id from public.case_detail_media cdm where cdm.content_id = p_content_id
  ) t
  where media_id is not null;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    payload
  )
  values (
    lower(
      coalesce(
        auth.jwt() ->> 'email',
        'unknown'
      )
    ),
    'delete',
    'content',
    p_content_id,
    jsonb_build_object(
      'type', v_type,
      'status', v_status,
      'slug', v_slug,
      'title', v_title,
      'media_count', cardinality(v_media_ids)
    )
  );

  delete from public.content
  where id = p_content_id;

  delete from public.media_asset ma
  where ma.id = any (v_media_ids)
    and not exists (select 1 from public.pin_media pm where pm.media_id = ma.id)
    and not exists (select 1 from public.case_detail_media cdm where cdm.media_id = ma.id)
    and not exists (
      select 1 from public.content c
      where c.cover_media_id = ma.id or c.og_media_id = ma.id
    );

  return p_content_id;

end;
$$;

revoke all on function public.delete_content(uuid) from public;
grant execute on function public.delete_content(uuid) to authenticated;
