-- 15 oct 2026: paquetes y reglas de publicación de `other` (plan de other,
-- docs/especificaciones/plan-other-pines-y-paginas.md, §3).
--
--  1. create_html_package_version acepta los `other` de tipo page, con el
--     tipo de paquete 'variety' (migración anterior).
--  2. publish_content y schedule_content exigen a un `other`:
--       - tener subtipo (other_detail)                      → ZG017
--       - si es página: paquete HTML publicado              → ZG009
--       - si es página: al menos un pin con medio           → ZG018
--     Tool e insight siguen exigiendo solo el paquete.
--
-- Códigos nuevos de la clase ZG (ver 20261009120000):
--   ZG017  el contenido Other no tiene subtipo
--   ZG018  la página satélite no tiene ningún pin con medio

-- create_html_package_version (versión anterior: 20260908091500)
create or replace function public.create_html_package_version(
  p_content_id uuid,
  p_version integer,
  p_storage_path text,
  p_checksum text,
  p_manifest jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_kind html_package_kind;
  v_version_id uuid;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select type
  into v_content_type
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_content_type = 'tool' then
    v_kind := 'tool';
  elsif v_content_type = 'insight' then
    v_kind := 'insight';
  elsif v_content_type = 'other' and exists (
    select 1
    from public.other_detail
    where content_id = p_content_id and kind = 'page'
  ) then
    v_kind := 'variety';
  else
    raise exception 'El contenido no es una tool, un insight ni una página satélite (other de tipo page)'
      using errcode = 'P0001';
  end if;

  insert into public.html_package (content_id, kind)
  values (p_content_id, v_kind)
  on conflict (content_id) do nothing;

  -- El unique(package_id, version) es la red de seguridad real contra dos
  -- subidas simultáneas calculando el mismo "siguiente número": si eso
  -- ocurre, esta segunda inserción falla con 23505 en vez de pisar la
  -- primera en silencio.
  insert into public.html_package_version (
    package_id, version, storage_path, checksum, manifest, status
  )
  values (
    p_content_id, p_version, p_storage_path, p_checksum, p_manifest, 'draft'
  )
  returning id
  into v_version_id;

  insert into public.audit_log (
    actor_email, action, entity, entity_id, payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'upload_package_version',
    'html_package_version',
    v_version_id,
    jsonb_build_object(
      'content_id', p_content_id,
      'version', p_version,
      'storage_path', p_storage_path
    )
  );

  return v_version_id;

end;
$$;

revoke all on function public.create_html_package_version(uuid, integer, text, text, jsonb) from public;
grant execute on function public.create_html_package_version(uuid, integer, text, text, jsonb) to authenticated;

-- publish_content (versión anterior: 20261009120000)
create or replace function public.publish_content(
  p_content_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_previous_status content_status;
  v_other_kind other_kind;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select type, status
  into v_content_type, v_previous_status
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_content_type in ('tool', 'insight') and not exists (
    select 1
    from public.html_package
    where content_id = p_content_id
      and current_version_id is not null
  ) then
    raise exception 'Esta tool/insight no tiene un paquete HTML publicado — no se puede publicar sin él'
      using errcode = 'ZG009';
  end if;

  -- Contenido `other` (plan de other, 15 oct 2026): hace falta su subtipo.
  -- Una página satélite exige, como tool/insight, un paquete HTML publicado
  -- y, además, al menos un pin con medio (sin él no sale en el feed: sería
  -- una página huérfana). La newsletter no necesita más: su titular ya es
  -- obligatorio al crear el borrador.
  if v_content_type = 'other' then

    select kind into v_other_kind
    from public.other_detail
    where content_id = p_content_id;

    if not found then
      raise exception 'Este contenido Other no tiene subtipo (newsletter o página satélite) — no se puede publicar sin él'
        using errcode = 'ZG017';
    end if;

    if v_other_kind = 'page' then

      if not exists (
        select 1
        from public.html_package
        where content_id = p_content_id
          and current_version_id is not null
      ) then
        raise exception 'Esta página satélite no tiene un paquete HTML publicado — no se puede publicar sin él'
          using errcode = 'ZG009';
      end if;

      if not exists (
        select 1
        from public.pin p
        join public.pin_media pm on pm.pin_id = p.id
        where p.content_id = p_content_id
      ) then
        raise exception 'Esta página satélite no tiene ningún pin con medio — no se puede publicar sin él'
          using errcode = 'ZG018';
      end if;

    end if;

  end if;

  update public.content
  set
    status = 'published',
    publish_at = now()
  where id = p_content_id;

  insert into public.audit_log (
    actor_email, action, entity, entity_id, payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'publish',
    'content',
    p_content_id,
    jsonb_build_object('previous_status', v_previous_status)
  );

  return p_content_id;

end;
$$;

-- schedule_content (versión anterior: 20261009120000)
create or replace function public.schedule_content(
  p_content_id uuid,
  p_publish_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_previous_status content_status;
  v_other_kind other_kind;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if p_publish_at <= now() then
    raise exception 'La fecha de publicación debe ser futura'
      using errcode = 'ZG010';
  end if;

  select type, status
  into v_content_type, v_previous_status
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  -- Programar también exige el paquete ya publicado, no solo publicar
  -- directamente: si no, publish_scheduled_content (pg_cron,
  -- 20260922090000) publicaría igualmente una tool/insight sin paquete
  -- en cuanto llegara la fecha, colándose por la puerta de atrás.
  if v_content_type in ('tool', 'insight') and not exists (
    select 1
    from public.html_package
    where content_id = p_content_id
      and current_version_id is not null
  ) then
    raise exception 'Esta tool/insight no tiene un paquete HTML publicado — no se puede programar sin él'
      using errcode = 'ZG009';
  end if;

  -- Contenido `other` (plan de other, 15 oct 2026): hace falta su subtipo.
  -- Una página satélite exige, como tool/insight, un paquete HTML publicado
  -- y, además, al menos un pin con medio (sin él no sale en el feed: sería
  -- una página huérfana). La newsletter no necesita más: su titular ya es
  -- obligatorio al crear el borrador.
  if v_content_type = 'other' then

    select kind into v_other_kind
    from public.other_detail
    where content_id = p_content_id;

    if not found then
      raise exception 'Este contenido Other no tiene subtipo (newsletter o página satélite) — no se puede programar sin él'
        using errcode = 'ZG017';
    end if;

    if v_other_kind = 'page' then

      if not exists (
        select 1
        from public.html_package
        where content_id = p_content_id
          and current_version_id is not null
      ) then
        raise exception 'Esta página satélite no tiene un paquete HTML publicado — no se puede programar sin él'
          using errcode = 'ZG009';
      end if;

      if not exists (
        select 1
        from public.pin p
        join public.pin_media pm on pm.pin_id = p.id
        where p.content_id = p_content_id
      ) then
        raise exception 'Esta página satélite no tiene ningún pin con medio — no se puede programar sin él'
          using errcode = 'ZG018';
      end if;

    end if;

  end if;

  update public.content
  set
    status = 'scheduled',
    publish_at = p_publish_at
  where id = p_content_id;

  insert into public.audit_log (
    actor_email, action, entity, entity_id, payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'schedule',
    'content',
    p_content_id,
    jsonb_build_object(
      'previous_status', v_previous_status,
      'publish_at', p_publish_at
    )
  );

  return p_content_id;

end;
$$;
