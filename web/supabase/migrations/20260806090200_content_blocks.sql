-- Greener — 03: bloques de contenido genéricos — arquitectura §7.2
-- Reutilizables por case y page (y potencialmente otros tipos), en vez de
-- duplicar la estructura por tipo de contenido.

create table content_block (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references content (id) on delete cascade,
  type content_block_type not null,
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb, -- lo no traducible: ratio de carrusel, ids de medios en orden...
  media_id uuid, -- fk a media_asset, se añade en 05_media_pins.sql
  created_at timestamptz not null default now()
);

create index content_block_content_id_sort_idx on content_block (content_id, sort_order);

comment on table content_block is
  'Cada variante de caso (A/B/C) declara qué tipos de bloque admite y su cardinalidad (brief §11.3); esa validación vive en la capa application/, no en el esquema.';

create table content_block_translation (
  block_id uuid not null references content_block (id) on delete cascade,
  locale locale not null,
  body_rich_text text,
  caption text,
  quote_text text,
  primary key (block_id, locale)
);

comment on table content_block_translation is
  'Solo se rellenan los campos que aplican al type del bloque (arquitectura §7.2). La estructura de bloques es única; solo el texto cambia por idioma (§7.7).';
