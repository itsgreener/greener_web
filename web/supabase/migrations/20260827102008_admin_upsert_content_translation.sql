-- ============================================================
-- 1. Simplificar update_content:
--    el título ya se gestiona desde content_translation.
-- ============================================================

drop function if exists public.update_content(
  uuid,
  text,
  locale,
  text
);

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

  return p_content_id;

end;
$$;

revoke all
on function public.update_content(
  uuid,
  text,
  locale
)
from public;

grant execute
on function public.update_content(
  uuid,
  text,
  locale
)
to authenticated;


-- ============================================================
-- 2. UPSERT de traducciones
-- ============================================================

create or replace function public.upsert_content_translation(
  p_content_id uuid,
  p_locale locale,
  p_title text,
  p_seo_title text,
  p_seo_description text,
  p_summary text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_default_locale locale;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select
    type,
    default_locale
  into
    v_content_type,
    v_default_locale
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if btrim(coalesce(p_title, '')) = '' then
    raise exception 'Title is required'
      using errcode = '22023';
  end if;

  -- Los episodios son de un solo idioma.
  if
    v_content_type = 'episode'
    and p_locale <> v_default_locale
  then
    raise exception 'Episode only supports its default locale'
      using errcode = 'P0001';
  end if;

  insert into public.content_translation (
    content_id,
    locale,
    title,
    seo_title,
    seo_description,
    summary
  )
  values (
    p_content_id,
    p_locale,
    btrim(p_title),
    nullif(btrim(p_seo_title), ''),
    nullif(btrim(p_seo_description), ''),
    nullif(btrim(p_summary), '')
  )
  on conflict (content_id, locale)
  do update set
    title = excluded.title,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    summary = excluded.summary;

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
    'upsert',
    'content_translation',
    p_content_id,
    jsonb_build_object(
      'locale',
      p_locale,
      'title',
      btrim(p_title)
    )
  );

  return p_content_id;

end;
$$;

revoke all
on function public.upsert_content_translation(
  uuid,
  locale,
  text,
  text,
  text,
  text
)
from public;

grant execute
on function public.upsert_content_translation(
  uuid,
  locale,
  text,
  text,
  text,
  text
)
to authenticated;