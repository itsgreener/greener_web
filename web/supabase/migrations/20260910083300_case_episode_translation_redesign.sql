-- especificacion-final-formato-detalle.md §3, §6 — rediseño del formato
-- de detalle tipo B (caso/episodio):
--
--   - case_detail pierde template_variant (el formato ya no se elige, se
--     infiere siempre de content.type — §6) y sector/services/year/
--     credits/links ("no tienen cabida en el nuevo diseño, no se
--     arrastran como campos muertos" — §3). Se queda con force y client.
--   - episode gana episode_kind (enum ampliable, arranca en 'podcast'),
--     el equivalente a "client" para un episodio (§3).
--   - content_translation gana highlight y body (§3: "highlight —
--     subtítulo/cita, campo propio... body — cuerpo de texto, campo
--     nuevo"), traducibles por locale igual que title/summary. Nulos
--     para tipos que no los usan (tool/insight/other) — no hace falta
--     una tabla de extensión propia solo para dos columnas de texto.
--
-- Orden dentro de este archivo: primero se sustituye la función que
-- depende de case_template_variant (upsert_case_detail), después se
-- alteran las columnas, y solo al final se puede borrar el enum — si no,
-- DROP TYPE falla porque la función vieja todavía lo referencia.

-- ============================================================
-- 1. upsert_case_detail — firma nueva (solo force + client)
-- ============================================================

drop function if exists public.upsert_case_detail(
  uuid,
  case_template_variant,
  integer,
  text,
  text,
  text,
  integer,
  jsonb,
  jsonb
);

create or replace function public.upsert_case_detail(
  p_content_id uuid,
  p_force integer,
  p_client text
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

  insert into public.case_detail (
    content_id,
    force,
    client
  )
  values (
    p_content_id,
    p_force,
    nullif(btrim(p_client), '')
  )
  on conflict (content_id)
  do update set
    force = excluded.force,
    client = excluded.client;

  insert into public.audit_log (
    actor_email, action, entity, entity_id, payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'upsert',
    'case_detail',
    p_content_id,
    jsonb_build_object(
      'force', p_force,
      'client', nullif(btrim(p_client), '')
    )
  );

  return p_content_id;

end;
$$;

revoke all
on function public.upsert_case_detail(uuid, integer, text)
from public;

grant execute
on function public.upsert_case_detail(uuid, integer, text)
to authenticated;

-- ============================================================
-- 2. case_detail — fuera los campos muertos
-- ============================================================

alter table case_detail
  drop column template_variant,
  drop column sector,
  drop column services,
  drop column year,
  drop column credits,
  drop column links;

-- Ahora sí, nada referencia ya case_template_variant.
drop type case_template_variant;

-- ============================================================
-- 3. episode — episode_kind
-- ============================================================

create type episode_kind as enum ('podcast');

alter table episode
  add column episode_kind episode_kind not null default 'podcast';

comment on column episode.episode_kind is
  'Equivalente a "client" en un caso para el formato de detalle tipo B (especificacion-final-formato-detalle.md §3). Enum ampliable: arranca solo con podcast.';

-- ============================================================
-- 4. content_translation — highlight y body
-- ============================================================

alter table content_translation
  add column highlight text,
  add column body text;

comment on column content_translation.highlight is
  'Subtítulo/cita destacada, campo propio independiente del cuerpo (especificacion-final-formato-detalle.md §3). Usado por case/episode; null en el resto.';
comment on column content_translation.body is
  'Cuerpo de texto del detalle tipo B (especificacion-final-formato-detalle.md §3). Usado por case/episode; null en el resto.';

-- ============================================================
-- 5. upsert_content_translation — añade highlight/body
-- ============================================================

-- La firma cambia (dos parámetros nuevos): hay que borrar la versión
-- vieja explícitamente, si no create or replace la deja como una
-- sobrecarga aparte en vez de sustituirla.
drop function if exists public.upsert_content_translation(
  uuid, locale, text, text, text, text
);

create or replace function public.upsert_content_translation(
  p_content_id uuid,
  p_locale locale,
  p_title text,
  p_seo_title text,
  p_seo_description text,
  p_summary text,
  p_highlight text,
  p_body text
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
    summary,
    highlight,
    body
  )
  values (
    p_content_id,
    p_locale,
    btrim(p_title),
    nullif(btrim(p_seo_title), ''),
    nullif(btrim(p_seo_description), ''),
    nullif(btrim(p_summary), ''),
    nullif(btrim(p_highlight), ''),
    nullif(btrim(p_body), '')
  )
  on conflict (content_id, locale)
  do update set
    title = excluded.title,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    summary = excluded.summary,
    highlight = excluded.highlight,
    body = excluded.body;

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
  uuid, locale, text, text, text, text, text, text
)
from public;

grant execute
on function public.upsert_content_translation(
  uuid, locale, text, text, text, text, text, text
)
to authenticated;
