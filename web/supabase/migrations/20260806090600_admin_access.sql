-- Greener — 07: acceso de administración, redirecciones y auditoría — arquitectura §7.6
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

-- Añadido el 3 nov 2026 (E2E con Supabase local): `20260806090700_rls_policies`
-- usa esta tabla en `is_admin()` y en sus políticas, pero ninguna migración
-- anterior a ella la creaba (la de `20260910083000_admin_allowed_domain_fix`
-- llega DESPUÉS), así que una base nueva reventaba en la de RLS con «relation
-- does not exist». Se crea aquí con el mismo esquema que la de arreglo, que
-- sigue siendo válida por su `if not exists`. En el proyecto real, que ya
-- aplicó esta migración, no hace nada: Supabase no recalcula las migraciones
-- aplicadas.
create table if not exists admin_allowed_domain (
  id uuid not null default gen_random_uuid (),
  domain text not null,
  created_at timestamp with time zone not null default now(),
  constraint admin_allowed_domain_pkey primary key (id),
  constraint admin_allowed_domain_domain_key unique (domain)
);
