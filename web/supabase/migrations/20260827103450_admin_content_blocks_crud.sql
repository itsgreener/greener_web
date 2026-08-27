-- ============================================================
-- CREATE CONTENT BLOCK
-- ============================================================

create or replace function public.create_content_block(
  p_content_id uuid,
  p_type content_block_type,
  p_sort_order integer,
  p_config jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_block_id uuid;
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

  if v_content_type not in ('case', 'page') then
    raise exception 'Content type does not support blocks'
      using errcode = 'P0001';
  end if;

  if p_sort_order < 0 then
    raise exception 'Sort order must be zero or greater'
      using errcode = '22023';
  end if;

  if jsonb_typeof(
    coalesce(p_config, '{}'::jsonb)
  ) <> 'object' then
    raise exception 'Config must be a JSON object'
      using errcode = '22023';
  end if;

  insert into public.content_block (
    content_id,
    type,
    sort_order,
    config
  )
  values (
    p_content_id,
    p_type,
    p_sort_order,
    coalesce(
      p_config,
      '{}'::jsonb
    )
  )
  returning id
  into v_block_id;

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
    'create',
    'content_block',
    v_block_id,
    jsonb_build_object(
      'content_id',
      p_content_id,
      'type',
      p_type,
      'sort_order',
      p_sort_order
    )
  );

  return v_block_id;

end;
$$;

revoke all
on function public.create_content_block(
  uuid,
  content_block_type,
  integer,
  jsonb
)
from public;

grant execute
on function public.create_content_block(
  uuid,
  content_block_type,
  integer,
  jsonb
)
to authenticated;


-- ============================================================
-- UPDATE CONTENT BLOCK
-- El type permanece inmutable.
-- ============================================================

create or replace function public.update_content_block(
  p_block_id uuid,
  p_sort_order integer,
  p_config jsonb
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

  if p_sort_order < 0 then
    raise exception 'Sort order must be zero or greater'
      using errcode = '22023';
  end if;

  if jsonb_typeof(
    coalesce(p_config, '{}'::jsonb)
  ) <> 'object' then
    raise exception 'Config must be a JSON object'
      using errcode = '22023';
  end if;

  update public.content_block
  set
    sort_order = p_sort_order,
    config = coalesce(
      p_config,
      '{}'::jsonb
    )
  where id = p_block_id;

  if not found then
    raise exception 'Block not found'
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
    lower(
      coalesce(
        auth.jwt() ->> 'email',
        'unknown'
      )
    ),
    'update',
    'content_block',
    p_block_id,
    jsonb_build_object(
      'sort_order',
      p_sort_order,
      'config',
      coalesce(
        p_config,
        '{}'::jsonb
      )
    )
  );

  return p_block_id;

end;
$$;

revoke all
on function public.update_content_block(
  uuid,
  integer,
  jsonb
)
from public;

grant execute
on function public.update_content_block(
  uuid,
  integer,
  jsonb
)
to authenticated;


-- ============================================================
-- DELETE CONTENT BLOCK
-- content_block_translation se elimina por ON DELETE CASCADE.
-- ============================================================

create or replace function public.delete_content_block(
  p_block_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_id uuid;
  v_type content_block_type;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select
    content_id,
    type
  into
    v_content_id,
    v_type
  from public.content_block
  where id = p_block_id;

  if not found then
    raise exception 'Block not found'
      using errcode = 'P0002';
  end if;

  delete from public.content_block
  where id = p_block_id;

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
    'content_block',
    p_block_id,
    jsonb_build_object(
      'content_id',
      v_content_id,
      'type',
      v_type
    )
  );

  return p_block_id;

end;
$$;

revoke all
on function public.delete_content_block(uuid)
from public;

grant execute
on function public.delete_content_block(uuid)
to authenticated;


-- ============================================================
-- UPSERT CONTENT BLOCK TRANSLATION
-- ============================================================

create or replace function public.upsert_content_block_translation(
  p_block_id uuid,
  p_locale locale,
  p_body_rich_text text,
  p_caption text,
  p_quote_text text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_type content_block_type;
  v_content_id uuid;

  v_body text;
  v_caption text;
  v_quote text;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select
    type,
    content_id
  into
    v_type,
    v_content_id
  from public.content_block
  where id = p_block_id;

  if not found then
    raise exception 'Block not found'
      using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.content_translation
    where content_id = v_content_id
      and locale = p_locale
  ) then
    raise exception 'Content locale is not available'
      using errcode = 'P0001';
  end if;

  case v_type

    when 'rich_text' then
      v_body =
        nullif(
          btrim(p_body_rich_text),
          ''
        );

      if v_body is null then
        raise exception 'Rich text body is required'
          using errcode = '22023';
      end if;

      v_caption = null;
      v_quote = null;

    when 'quote' then
      v_quote =
        nullif(
          btrim(p_quote_text),
          ''
        );

      if v_quote is null then
        raise exception 'Quote text is required'
          using errcode = '22023';
      end if;

      v_body = null;
      v_caption = null;

    when 'image',
         'carousel',
         'video' then

      v_caption =
        nullif(
          btrim(p_caption),
          ''
        );

      v_body = null;
      v_quote = null;

    when 'links_credits' then

      raise exception 'Links/credits translation fields are not defined yet'
        using errcode = 'P0001';

  end case;

  insert into public.content_block_translation (
    block_id,
    locale,
    body_rich_text,
    caption,
    quote_text
  )
  values (
    p_block_id,
    p_locale,
    v_body,
    v_caption,
    v_quote
  )
  on conflict (
    block_id,
    locale
  )
  do update set
    body_rich_text =
      excluded.body_rich_text,

    caption =
      excluded.caption,

    quote_text =
      excluded.quote_text;

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
    'content_block_translation',
    p_block_id,
    jsonb_build_object(
      'locale',
      p_locale,
      'block_type',
      v_type
    )
  );

  return p_block_id;

end;
$$;

revoke all
on function public.upsert_content_block_translation(
  uuid,
  locale,
  text,
  text,
  text
)
from public;

grant execute
on function public.upsert_content_block_translation(
  uuid,
  locale,
  text,
  text,
  text
)
to authenticated;