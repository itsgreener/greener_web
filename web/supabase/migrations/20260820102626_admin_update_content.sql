create or replace function public.update_content(
  p_content_id uuid,
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
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  update public.content
  set
    type = p_type,
    slug = p_slug,
    default_locale = p_default_locale
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  insert into public.content_translation (
    content_id,
    locale,
    title
  )
  values (
    p_content_id,
    p_default_locale,
    p_title
  )
  on conflict (content_id, locale)
  do update set
    title = excluded.title;

  return p_content_id;

end;
$$;

revoke all
on function public.update_content(
  uuid,
  content_type,
  text,
  locale,
  text
)
from public;

grant execute
on function public.update_content(
  uuid,
  content_type,
  text,
  locale,
  text
)
to authenticated;