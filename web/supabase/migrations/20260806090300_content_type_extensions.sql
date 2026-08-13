-- Greener — 04: extensiones por tipo de contenido — arquitectura §7.3

create table case_detail (
  content_id uuid primary key references content (id) on delete cascade,
  template_variant case_template_variant not null,
  force integer not null default 1 check (force between 1 and 5),
  client text,
  sector text,
  services text,
  year integer,
  credits jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb
);

comment on column case_detail.client is 'Texto libre, no traducido (confirmado con Greener).';
comment on column case_detail.sector is 'Texto libre, no traducido (confirmado con Greener).';
comment on column case_detail.services is 'Texto libre, no traducido (confirmado con Greener).';
comment on column case_detail.force is 'Pines aportados por tanda (brief §4.3). Rotación por cola circular, no aquí.';

create table episode (
  content_id uuid primary key references content (id) on delete cascade,
  program episode_program not null,
  number integer,
  guest text,
  role text,
  company text,
  episode_date date,
  duration_seconds integer,
  provider episode_provider not null,
  embed_id text not null,
  language locale not null
);

comment on table episode is
  'Un solo idioma por episodio, como el pin: no se traduce (arquitectura §7.3).';

create table html_package (
  content_id uuid primary key references content (id) on delete cascade,
  kind html_package_kind not null,
  current_version_id uuid -- fk a html_package_version, se añade tras crear esa tabla (self-referencing entre ambas)
);

create table html_package_version (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references html_package (content_id) on delete cascade,
  version integer not null,
  storage_path text not null, -- Supabase Storage: paquetes HTML de tools/insights (arquitectura §5, §9.2)
  checksum text not null,
  manifest jsonb not null default '{}'::jsonb, -- kind, entrypoint, version, requiredCapabilities, externalDomains, minViewport
  status html_package_version_status not null default 'draft',
  created_at timestamptz not null default now(),
  unique (package_id, version)
);

alter table html_package
  add constraint html_package_current_version_fk
  foreign key (current_version_id) references html_package_version (id);

comment on table html_package_version is
  'Inmutable: cada subida crea una fila nueva; el alias público apunta a current_version_id (arquitectura §12.2).';

-- page_detail se omite deliberadamente (arquitectura §7.3): una página sin
-- campos propios más allá de content_block no necesita tabla de extensión.
