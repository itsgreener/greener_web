-- Greener — 05: medios y pines — arquitectura §7.4

create table media_asset (
  id uuid primary key default gen_random_uuid(),
  kind media_kind not null,
  cloudinary_public_id text not null unique,
  format text,
  width integer,
  height integer,
  duration_seconds integer, -- solo vídeo
  bytes integer,
  status media_status not null default 'processing',
  created_at timestamptz not null default now()
);

comment on table media_asset is
  'Sin manifest de derivadas propio: las derivadas se calculan al vuelo por URL de Cloudinary (arquitectura §9.2). public_id no se reutiliza al sustituir un medio, lo que actúa como versionado.';

-- FKs diferidas desde 02 y 03, ahora que media_asset existe
alter table content
  add constraint content_og_media_fk
  foreign key (og_media_id) references media_asset (id);

alter table content_block
  add constraint content_block_media_fk
  foreign key (media_id) references media_asset (id);

create table pin (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references content (id) on delete cascade,
  type pin_type not null,
  ratio pin_ratio not null,
  label text not null,
  cta text,
  language locale not null,
  autoplay_mode pin_autoplay_mode,
  speed_ms integer, -- solo carrusel con avance automático
  queue_order integer not null default 0,
  alt text not null,
  created_at timestamptz not null default now()
);

comment on table pin is
  'Un solo idioma, no traducible (brief §3). queue_order alimenta la cola circular del motor de feed (arquitectura §7.6, §8).';

create index pin_content_id_queue_order_idx on pin (content_id, queue_order);

create table pin_media (
  pin_id uuid not null references pin (id) on delete cascade,
  media_id uuid not null references media_asset (id),
  slide_order integer not null default 0,
  primary key (pin_id, media_id)
);

comment on table pin_media is 'Hasta 8 filas por pin en el caso de un carrusel (brief §3).';
