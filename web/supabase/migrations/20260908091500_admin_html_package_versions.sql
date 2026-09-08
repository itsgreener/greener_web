-- Ciclo de vida de un paquete HTML (§12.2, §15.1): subir crea una versión
-- en borrador (no la sirve nadie todavía); publicar la hace la versión
-- activa. Rollback a una versión antigua usa la MISMA función que publicar
-- una recién subida — "hacer que la versión X sea la actual" es la misma
-- operación tanto si X es nueva como si es una de hace tres semanas; lo
-- único que cambia es la intención del admin al pulsar el botón, no el
-- efecto en la base de datos.

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
  else
    raise exception 'El contenido no es un tool ni un insight'
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


create or replace function public.publish_html_package_version(
  p_content_id uuid,
  p_version_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_belongs boolean;
  v_previous_version_id uuid;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.html_package_version
    where id = p_version_id and package_id = p_content_id
  )
  into v_belongs;

  if not v_belongs then
    raise exception 'La versión no pertenece a este paquete'
      using errcode = 'P0001';
  end if;

  select current_version_id
  into v_previous_version_id
  from public.html_package
  where content_id = p_content_id;

  if v_previous_version_id is not null and v_previous_version_id <> p_version_id then
    update public.html_package_version
    set status = 'rolled_back'
    where id = v_previous_version_id;
  end if;

  update public.html_package_version
  set status = 'published'
  where id = p_version_id;

  update public.html_package
  set current_version_id = p_version_id
  where content_id = p_content_id;

  insert into public.audit_log (
    actor_email, action, entity, entity_id, payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'publish_package_version',
    'html_package_version',
    p_version_id,
    jsonb_build_object(
      'content_id', p_content_id,
      'previous_version_id', v_previous_version_id
    )
  );

  return p_version_id;

end;
$$;

revoke all on function public.create_html_package_version(uuid, integer, text, text, jsonb) from public;
grant execute on function public.create_html_package_version(uuid, integer, text, text, jsonb) to authenticated;

revoke all on function public.publish_html_package_version(uuid, uuid) from public;
grant execute on function public.publish_html_package_version(uuid, uuid) to authenticated;
