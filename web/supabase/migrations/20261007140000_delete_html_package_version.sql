-- 7 oct 2026: borrar versiones antiguas de un paquete HTML (tool / insight).
--
-- Hasta hoy una versión subida solo se podía publicar o recuperar
-- («Volver a esta versión»), nunca eliminar, así que los paquetes antiguos
-- (y sus ficheros en Storage) se acumulaban para siempre.
--
-- Solo se puede borrar una versión que NO sea la activa: ni la publicada ni
-- la que apunta `html_package.current_version_id`. Un borrador o una versión
-- `rolled_back` sí. Esta función solo borra la fila (y deja rastro en
-- audit_log); los ficheros del bucket `html-packages` bajo `storage_path`
-- los borra después la capa de aplicación con la ruta que devuelve.
--
-- Los números de versión no se reasignan salvo que se borre la más alta:
-- la siguiente subida calcula `max(version) + 1`, así que borrar la última
-- libera su número (y su ruta de Storage, que ya habrá quedado vacía).

create or replace function public.delete_html_package_version(
  p_content_id uuid,
  p_version_id uuid
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_storage_path text;
  v_version integer;
  v_status html_package_version_status;
  v_current_version_id uuid;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select storage_path, version, status
  into v_storage_path, v_version, v_status
  from public.html_package_version
  where id = p_version_id and package_id = p_content_id;

  if not found then
    raise exception 'La versión no pertenece a este paquete'
      using errcode = 'P0001';
  end if;

  select current_version_id
  into v_current_version_id
  from public.html_package
  where content_id = p_content_id;

  if v_status = 'published' or v_current_version_id = p_version_id then
    raise exception 'No se puede borrar la versión activa. Publica otra versión antes.'
      using errcode = 'P0001';
  end if;

  delete from public.html_package_version
  where id = p_version_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'delete_package_version',
    'html_package_version',
    p_version_id,
    jsonb_build_object(
      'content_id', p_content_id,
      'version', v_version,
      'storage_path', v_storage_path
    )
  );

  return v_storage_path;

end;
$$;

revoke all on function public.delete_html_package_version(uuid, uuid) from public;
grant execute on function public.delete_html_package_version(uuid, uuid) to authenticated;
