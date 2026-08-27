create or replace function public.upsert_case_detail(
  p_content_id uuid,
  p_template_variant case_template_variant,
  p_force integer,
  p_client text,
  p_sector text,
  p_services text,
  p_year integer,
  p_credits jsonb,
  p_links jsonb
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

  if v_content_type <> 'case' then
    raise exception 'Content is not a case'
      using errcode = 'P0001';
  end if;

  if p_force < 1 or p_force > 5 then
    raise exception 'Force must be between 1 and 5'
      using errcode = '22023';
  end if;

  if jsonb_typeof(
    coalesce(p_credits, '[]'::jsonb)
  ) <> 'array' then
    raise exception 'Credits must be a JSON array'
      using errcode = '22023';
  end if;

  if jsonb_typeof(
    coalesce(p_links, '[]'::jsonb)
  ) <> 'array' then
    raise exception 'Links must be a JSON array'
      using errcode = '22023';
  end if;

  insert into public.case_detail (
    content_id,
    template_variant,
    force,
    client,
    sector,
    services,
    year,
    credits,
    links
  )
  values (
    p_content_id,
    p_template_variant,
    p_force,
    nullif(btrim(p_client), ''),
    nullif(btrim(p_sector), ''),
    nullif(btrim(p_services), ''),
    p_year,
    coalesce(p_credits, '[]'::jsonb),
    coalesce(p_links, '[]'::jsonb)
  )
  on conflict (content_id)
  do update set
    template_variant =
      excluded.template_variant,
    force =
      excluded.force,
    client =
      excluded.client,
    sector =
      excluded.sector,
    services =
      excluded.services,
    year =
      excluded.year,
    credits =
      excluded.credits,
    links =
      excluded.links;

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
    'case_detail',
    p_content_id,
    jsonb_build_object(
      'template_variant',
        p_template_variant,
      'force',
        p_force,
      'client',
        nullif(btrim(p_client), ''),
      'sector',
        nullif(btrim(p_sector), ''),
      'services',
        nullif(btrim(p_services), ''),
      'year',
        p_year,
      'credits',
        coalesce(
          p_credits,
          '[]'::jsonb
        ),
      'links',
        coalesce(
          p_links,
          '[]'::jsonb
        )
    )
  );

  return p_content_id;

end;
$$;

revoke all
on function public.upsert_case_detail(
  uuid,
  case_template_variant,
  integer,
  text,
  text,
  text,
  integer,
  jsonb,
  jsonb
)
from public;

grant execute
on function public.upsert_case_detail(
  uuid,
  case_template_variant,
  integer,
  text,
  text,
  text,
  integer,
  jsonb,
  jsonb
)
to authenticated;