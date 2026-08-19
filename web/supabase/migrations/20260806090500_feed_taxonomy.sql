-- Greener — 06: taxonomía y configuración del motor de feed — arquitectura §7.5

create table tag (
  id uuid primary key default gen_random_uuid(),
  section tag_section not null,
  name text not null,
  sort_order integer not null default 0,
  unique (section, name)
);

create table content_tag (
  content_id uuid not null references content (id) on delete cascade,
  tag_id uuid not null references tag (id) on delete cascade,
  primary key (content_id, tag_id)
);

create index content_tag_tag_id_idx on content_tag (tag_id, content_id);

create table feed_config (
  id uuid primary key default gen_random_uuid(),
  ratios jsonb not null default '{"cases": 70, "insights": 15, "tools": 5, "channel": 5, "other": 5}'::jsonb,
  batch_size integer not null default 40,
  mix_window integer not null default 20,
  distance_window integer not null default 10,
  video_limit_desktop integer not null default 2,
  video_limit_mobile integer not null default 1,
  updated_at timestamptz not null default now()
);

-- Restringe la tabla a una única fila de configuración
create unique index feed_config_single_row on feed_config ((true));

insert into feed_config default values;

create table feed_session (
  id uuid primary key default gen_random_uuid(),
  seed text not null,
  scope text not null,
  filter_hash text,
  config_revision integer not null default 1,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table feed_round (
  session_id uuid not null references feed_session (id) on delete cascade,
  round_index integer not null,
  ordered_pin_ids uuid[] not null,
  generated_at timestamptz not null default now(),
  primary key (session_id, round_index)
);

comment on table feed_round is
  'Secuencia precalculada por ronda (arquitectura §8.5). El cursor servido al cliente es opaco y firmado, no expone esta tabla directamente.';
