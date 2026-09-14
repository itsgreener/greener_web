-- Corrección — 20260806090700_rls_policies.sql define políticas sobre
-- admin_allowed_domain y supabase/seed.sql inserta en ella, pero ninguna
-- migración crea la tabla: un "db push" contra un proyecto nuevo (o CI)
-- revienta en la migración de RLS con "relation does not exist". El
-- proyecto real ya tiene la tabla (dada de alta a mano en algún punto,
-- según PROGRESO.md §4.1), así que esto usa IF NOT EXISTS para ser
-- inofensivo ahí — no toca nada si ya existe — y corregir el hueco en
-- cualquier base nueva. Esquema calcado del de la tabla real (confirmado
-- por Greener el 10 sep), incluido created_at, que la primera versión de
-- esta migración se dejó fuera.

create table if not exists admin_allowed_domain (
  id uuid not null default gen_random_uuid (),
  domain text not null,
  created_at timestamp with time zone not null default now(),
  constraint admin_allowed_domain_pkey primary key (id),
  constraint admin_allowed_domain_domain_key unique (domain)
);

comment on table admin_allowed_domain is
  'Allowlist de dominios de correo con acceso de administrador al ABM (arquitectura §7.6, §15.2). Editable por el propio equipo, no hardcodeada.';
