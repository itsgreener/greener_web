-- Arquitectura §16.2: "Todas las mutaciones requieren autenticación, CSRF,
-- validación de schema y audit_log." create_content_draft (20260820095524)
-- y update_content (redefinida en 20260827102008) se quedaron sin la
-- inserción en audit_log que el resto de funciones de mutación sí tienen
-- (upsert_case_detail, create_content_block, register_image_for_block...).
--
-- Esta migración las redefine añadiendo el registro de auditoría, sin
-- cambiar el resto de su comportamiento ni su firma — no hace falta
-- revoke/grant porque los permisos ya concedidos se conservan.

create or replace function public.create_content_draft(
  p_type content_type,
  p_slug text,
  p_default_locale locale,
  p_title text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_id uuid;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  insert into public.content (
    type,
    status,
    default_locale,
    slug
  )
  values (
    p_type,
    'draft',
    p_default_locale,
    p_slug
  )
  returning id into v_content_id;

  insert into public.content_translation (
    content_id,
    locale,
    title
  )
  values (
    v_content_id,
    p_default_locale,
    p_title
  );

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'create',
    'content',
    v_content_id,
    jsonb_build_object(
      'type', p_type,
      'slug', p_slug,
      'default_locale', p_default_locale,
      'title', p_title
    )
  );

  return v_content_id;
end;
$$;


create or replace function public.update_content(
  p_content_id uuid,
  p_slug text,
  p_default_locale locale
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

  update public.content
  set
    slug = p_slug,
    default_locale = p_default_locale
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'update',
    'content',
    p_content_id,
    jsonb_build_object(
      'slug', p_slug,
      'default_locale', p_default_locale
    )
  );

  return p_content_id;

end;
$$;
