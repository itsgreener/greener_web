-- Decisión del 22 de septiembre: "una tool/insight sin paquete HTML
-- detrás es un contenido que no tiene sentido" — hasta ahora nada lo
-- impedía; el único síntoma era que el CTA público llevaba a un 404 al
-- hacer clic (arquitectura §3.6 de PROGRESO.md). Se cierra en el sitio
-- correcto: al publicar/programar, no parcheando el CTA en el cliente
-- — así ninguna vía de publicación (ABM hoy, cron de publish_at mañana)
-- puede dejar pasar una tool/insight sin paquete.
--
-- "Paquete válido" = existe una fila en html_package para este content_id
-- Y current_version_id no es null — eso es justo lo que pone
-- publish_html_package_version (20260908091500) al confirmar una subida;
-- una versión sin publicar (create_html_package_version sin publicar
-- después) no cuenta.

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
      using errcode = 'P0001';
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
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if p_publish_at <= now() then
    raise exception 'La fecha de publicación debe ser futura'
      using errcode = '22023';
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
      using errcode = 'P0001';
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
