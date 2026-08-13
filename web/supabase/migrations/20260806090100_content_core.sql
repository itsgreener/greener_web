-- Greener — 02: supertipo de contenido — arquitectura §7.1

create table content (
  id uuid primary key default gen_random_uuid(),
  type content_type not null,
  status content_status not null default 'draft',
  default_locale locale not null default 'es',
  slug text not null unique,
  og_media_id uuid, -- fk a media_asset, se añade en 05_media_pins.sql (orden de creación)
  publish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice usado directamente por el motor de feed (arquitectura §7.6, §8)
create index content_type_status_idx on content (type, status);

comment on table content is
  'Supertipo de todo lo publicable: case, insight, tool, episode, page (brief §8).';

create table content_translation (
  content_id uuid not null references content (id) on delete cascade,
  locale locale not null,
  title text not null,
  seo_title text,
  seo_description text,
  summary text,
  primary key (content_id, locale)
);

comment on table content_translation is
  'La existencia de una fila implica que ese idioma está disponible; no hay flag de completitud aparte (arquitectura §7.1).';

-- updated_at automático
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger content_set_updated_at
  before update on content
  for each row
  execute function set_updated_at();
