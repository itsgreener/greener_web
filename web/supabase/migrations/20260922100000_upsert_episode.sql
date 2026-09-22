-- ABM de episodios (arquitectura §7.3; PROGRESO.md §5.5 — nunca había
-- existido). Un episodio no se traduce (§7.4: "un solo idioma, como el
-- pin"), así que va todo en una sola función, sin tabla de traducción
-- de por medio — mismo patrón que upsert_case_detail
-- (20260910083300_case_episode_translation_redesign.sql), adaptado a
-- los campos propios de episode.

create or replace function public.upsert_episode(
  p_content_id uuid,
  p_program episode_program,
  p_number integer,
  p_guest text,
  p_role text,
  p_company text,
  p_episode_date date,
  p_duration_seconds integer,
  p_provider episode_provider,
  p_embed_id text,
  p_language locale,
  p_episode_kind episode_kind
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

  if v_content_type <> 'episode' then
    raise exception 'Content is not an episode'
      using errcode = 'P0001';
  end if;

  if btrim(coalesce(p_embed_id, '')) = '' then
    raise exception 'embed_id is required'
      using errcode = '22023';
  end if;

  if p_number is not null and p_number <= 0 then
    raise exception 'Number must be positive'
      using errcode = '22023';
  end if;

  if p_duration_seconds is not null and p_duration_seconds <= 0 then
    raise exception 'Duration must be positive'
      using errcode = '22023';
  end if;

  insert into public.episode (
    content_id,
    program,
    number,
    guest,
    role,
    company,
    episode_date,
    duration_seconds,
    provider,
    embed_id,
    language,
    episode_kind
  )
  values (
    p_content_id,
    p_program,
    p_number,
    nullif(btrim(p_guest), ''),
    nullif(btrim(p_role), ''),
    nullif(btrim(p_company), ''),
    p_episode_date,
    p_duration_seconds,
    p_provider,
    btrim(p_embed_id),
    p_language,
    p_episode_kind
  )
  on conflict (content_id)
  do update set
    program = excluded.program,
    number = excluded.number,
    guest = excluded.guest,
    role = excluded.role,
    company = excluded.company,
    episode_date = excluded.episode_date,
    duration_seconds = excluded.duration_seconds,
    provider = excluded.provider,
    embed_id = excluded.embed_id,
    language = excluded.language,
    episode_kind = excluded.episode_kind;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'upsert',
    'episode',
    p_content_id,
    jsonb_build_object(
      'program', p_program,
      'provider', p_provider,
      'embed_id', btrim(p_embed_id),
      'language', p_language,
      'episode_kind', p_episode_kind
    )
  );

  return p_content_id;

end;
$$;

comment on function public.upsert_episode is
  'ABM de episodios (arquitectura §7.3) — crea o actualiza la fila episode de un content de tipo episode. Un episodio no se traduce, todo va en esta única función.';

revoke all on function public.upsert_episode(
  uuid, episode_program, integer, text, text, text, date, integer,
  episode_provider, text, locale, episode_kind
) from public;

grant execute on function public.upsert_episode(
  uuid, episode_program, integer, text, text, text, date, integer,
  episode_provider, text, locale, episode_kind
) to authenticated;
