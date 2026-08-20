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

  return v_content_id;
end;
$$;

revoke all
on function public.create_content_draft(
  content_type,
  text,
  locale,
  text
)
from public;

grant execute
on function public.create_content_draft(
  content_type,
  text,
  locale,
  text
)
to authenticated;