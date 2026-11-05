-- 15 oct 2026: tabla de extensión de los contenidos `other` (plan
-- docs/especificaciones/plan-other-pines-y-paginas.md, §3).
--
-- `other` pasa a tener dos subtipos:
--   - newsletter: pin formulario dentro del feed (sin destino ni ficha).
--   - page: página satélite de Greener servida como paquete HTML en
--     /variety/{slug}/app.
-- Cada contenido `other` lleva su propia frecuencia: «una aparición cada N
-- pines» (mínimo 25). El subtipo se elige al crear y no cambia.
--
-- El plan parte de que NO existe ningún contenido `other` (nunca se publicó
-- uno). Si existe alguno, esta migración aborta para decidir a mano qué
-- hacer con él en vez de dejarlo sin subtipo.

do $$
declare
  v_count integer;
begin

  select count(*) into v_count from public.content where type = 'other';

  if v_count > 0 then
    raise exception
      'Existen % contenidos de tipo other. El plan de other parte de que no hay ninguno: decide qué hacer con ellos antes de aplicar esta migración.',
      v_count;
  end if;

end;
$$;

create type other_kind as enum ('newsletter', 'page');

create table public.other_detail (
  content_id uuid primary key references public.content (id) on delete cascade,
  kind other_kind not null,
  frequency integer not null default 100 check (frequency >= 25)
);

comment on table public.other_detail is
  'Extensión de los contenidos de tipo other: subtipo (inmutable) y frecuencia propia de aparición en el feed.';
comment on column public.other_detail.kind is
  'newsletter = pin formulario en el feed; page = página satélite (paquete HTML en /variety/{slug}/app). Se elige al crear y no cambia.';
comment on column public.other_detail.frequency is
  'Una aparición cada N pines de ronda servidos en la home. Mínimo 25. No hay valor «0 = desactivado»: para retirar un other del feed se despublica.';

-- Solo un contenido de tipo other puede tener esta fila.
create or replace function public.other_detail_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_type content_type;
begin

  select type into v_type from public.content where id = new.content_id;

  if v_type is distinct from 'other' then
    raise exception 'other_detail solo admite contenidos de tipo other'
      using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' and new.kind <> old.kind then
    raise exception 'El subtipo de un contenido other no se puede cambiar'
      using errcode = 'P0001';
  end if;

  return new;

end;
$$;

create trigger other_detail_guard
  before insert or update on public.other_detail
  for each row execute function public.other_detail_guard();

alter table public.other_detail enable row level security;

create policy other_detail_public_read on public.other_detail
  for select using (
    exists (select 1 from public.content c where c.id = content_id and c.status = 'published')
  );

create policy other_detail_admin_all on public.other_detail
  for all using (public.is_admin()) with check (public.is_admin());
