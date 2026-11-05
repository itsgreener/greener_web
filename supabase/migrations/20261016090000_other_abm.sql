-- 16 oct 2026: ABM de los contenidos `other` (plan de other,
-- docs/especificaciones/plan-other-pines-y-paginas.md, §7, fase 5).
--
--  1. create_other_draft: crea en una sola transacción el contenido `other`,
--     su traducción y su fila de other_detail (subtipo y frecuencia). Es la
--     ÚNICA vía de alta de un other: el subtipo no se puede cambiar después.
--  2. update_other_frequency: cambia la frecuencia («una aparición cada N
--     pines», mínimo 25) con registro en audit_log.
--  3. create_content_draft rechaza ahora el tipo other (ZG017): un other
--     creado por esa vía se quedaría sin subtipo y no se podría publicar.

create or replace function public.create_other_draft(
  p_slug text,
  p_default_locale locale,
  p_title text,
  p_kind other_kind,
  p_frequency integer
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

  if p_frequency is null or p_frequency < 25 then
    raise exception 'La frecuencia mínima de un other es 25 pines'
      using errcode = '22023';
  end if;

  insert into public.content (type, status, default_locale, slug)
  values ('other', 'draft', p_default_locale, p_slug)
  returning id into v_content_id;

  insert into public.content_translation (content_id, locale, title)
  values (v_content_id, p_default_locale, p_title);

  insert into public.other_detail (content_id, kind, frequency)
  values (v_content_id, p_kind, p_frequency);

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'create',
    'content',
    v_content_id,
    jsonb_build_object(
      'type', 'other',
      'slug', p_slug,
      'default_locale', p_default_locale,
      'title', p_title,
      'other_kind', p_kind,
      'frequency', p_frequency
    )
  );

  return v_content_id;

end;
$$;

comment on function public.create_other_draft is
  'Alta de un contenido other (newsletter o página satélite) con su subtipo y su frecuencia, en una sola transacción. Plan de other, §7.';

revoke all on function public.create_other_draft(
  text, locale, text, other_kind, integer
) from public;

grant execute on function public.create_other_draft(
  text, locale, text, other_kind, integer
) to authenticated;

create or replace function public.update_other_frequency(
  p_content_id uuid,
  p_frequency integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
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

  if v_content_type <> 'other' then
    raise exception 'Content is not an other'
      using errcode = 'P0001';
  end if;

  if p_frequency is null or p_frequency < 25 then
    raise exception 'La frecuencia mínima de un other es 25 pines'
      using errcode = '22023';
  end if;

  update public.other_detail
  set frequency = p_frequency
  where content_id = p_content_id;

  if not found then
    raise exception 'Este contenido other no tiene subtipo'
      using errcode = 'ZG017';
  end if;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'update',
    'other_detail',
    p_content_id,
    jsonb_build_object('frequency', p_frequency)
  );

  return p_content_id;

end;
$$;

comment on function public.update_other_frequency is
  'Cambia la frecuencia de aparición (una cada N pines, mínimo 25) de un contenido other. Plan de other, §7.2.';

revoke all on function public.update_other_frequency(uuid, integer)
  from public;

grant execute on function public.update_other_frequency(uuid, integer)
  to authenticated;

-- create_content_draft: un other solo se crea con create_other_draft.
-- Misma firma y mismo comportamiento para el resto de tipos (no hace falta
-- revoke/grant: los permisos ya concedidos se conservan).
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

  if p_type = 'other' then
    raise exception 'Un contenido other se crea con create_other_draft, que le asigna subtipo y frecuencia'
      using errcode = 'ZG017';
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
