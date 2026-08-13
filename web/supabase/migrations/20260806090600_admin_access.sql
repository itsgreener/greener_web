-- Greener — 07: acceso de administración, redirecciones y auditoría — arquitectura §7.6

create table admin_allowed_domain (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  created_at timestamptz not null default now()
);

comment on table admin_allowed_domain is
  'Allowlist de dominios de correo con acceso al ABM (arquitectura §15.2). Editable desde el propio ABM, no hardcodeada. Rol único: cualquier cuenta del dominio tiene el mismo nivel de acceso (confirmado con Greener).';

create table admin_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  last_login timestamptz
);

comment on table admin_profile is
  'Opcional: solo metadata que Supabase Auth no guarda ya (arquitectura §7.6).';

create table redirect_301 (
  id uuid primary key default gen_random_uuid(),
  source_path text not null unique,
  target_path text not null,
  active boolean not null default true
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity, entity_id);
create index audit_log_actor_idx on audit_log (actor_email, created_at);

comment on table audit_log is
  'Trazabilidad por persona, relevante al haber varios administradores del mismo dominio (arquitectura §15.1).';
