create or replace function public.delete_content(
  p_content_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status content_status;
  v_type content_type;
  v_slug text;
  v_title text;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select
    c.status,
    c.type,
    c.slug,
    ct.title
  into
    v_status,
    v_type,
    v_slug,
    v_title
  from public.content c
  left join public.content_translation ct
    on ct.content_id = c.id
    and ct.locale = c.default_locale
  where c.id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_status <> 'draft' then
    raise exception 'Only draft content can be deleted'
      using errcode = 'P0001';
  end if;

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
    'delete',
    'content',
    p_content_id,
    jsonb_build_object(
      'type', v_type,
      'status', v_status,
      'slug', v_slug,
      'title', v_title
    )
  );

  delete from public.content
  where id = p_content_id;

  return p_content_id;

end;
$$;

revoke all
on function public.delete_content(uuid)
from public;

grant execute
on function public.delete_content(uuid)
to authenticated;