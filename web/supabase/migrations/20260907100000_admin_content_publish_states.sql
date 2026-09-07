-- Estados editoriales (§15.3): draft → scheduled → published, y vuelta a
-- draft (unpublish). El "unpublish retira de nuevas sesiones, manteniendo
-- una ventana de gracia para sesiones existentes" del brief no necesita
-- lógica extra aquí: content_public_read (RLS) ya comprueba status =
-- 'published' en cada lectura nueva, y feed_round ya es inmutable una vez
-- generada (§8.5) — las sesiones abiertas siguen viendo lo que ya tenían
-- servido sin que nada de esto lo toque.

create or replace function public.publish_content(
  p_content_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_previous_status content_status;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select status
  into v_previous_status
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
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

  select status
  into v_previous_status
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
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


create or replace function public.unpublish_content(
  p_content_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_previous_status content_status;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select status
  into v_previous_status
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  update public.content
  set
    status = 'draft',
    publish_at = null
  where id = p_content_id;

  insert into public.audit_log (
    actor_email, action, entity, entity_id, payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'unpublish',
    'content',
    p_content_id,
    jsonb_build_object('previous_status', v_previous_status)
  );

  return p_content_id;

end;
$$;

revoke all on function public.publish_content(uuid) from public;
grant execute on function public.publish_content(uuid) to authenticated;

revoke all on function public.schedule_content(uuid, timestamptz) from public;
grant execute on function public.schedule_content(uuid, timestamptz) to authenticated;

revoke all on function public.unpublish_content(uuid) from public;
grant execute on function public.unpublish_content(uuid) to authenticated;
