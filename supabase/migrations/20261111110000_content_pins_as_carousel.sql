-- 11 nov 2026 (docs/especificaciones/plan-carrusel-pines-episodios.md, §2.150):
-- los pines de un episodio pueden formar UN carrusel en el feed.
--
-- Hasta hoy cada pin es una unidad suelta del feed (un medio por pin desde el
-- 7 oct, §2.41). Con la casilla «formar un carrusel con los pines» del ABM, todos
-- los pines del episodio pasan a ser las diapositivas de una sola tarjeta que
-- se mueve sola y se desliza con el dedo. Esta migración pone la base de datos:
--
--   1. content.pins_as_carousel          la marca (false por defecto)
--   2. set_content_pins_carousel         activa o desactiva la marca (admin)
--   3. enforce_carousel_pin_ratio        todas las diapositivas, mismo ratio
--
-- No toca ninguna función ni tabla existente salvo la columna nueva, con valor
-- por defecto: se puede aplicar sin coordinar con el despliegue. La web que no
-- la conoce sigue tratando cada pin como una unidad suelta.
--
-- Códigos de error:
--   42501  no es administrador
--   P0002  el contenido no existe
--   ZG007  el contenido no es un episodio (solo ellos forman carrusel)
--   ZG019  los pines del episodio no comparten ratio (no se puede activar, o
--          se intenta crear / cambiar un pin con otro ratio con la marca activa)


-- ============================================================
-- 1. COLUMNA
-- ============================================================
--
-- Vive en `content` y no en `episode` porque la fila de `episode` no existe
-- hasta que se guardan los detalles, y el ABM sube pines antes de eso.

alter table public.content
  add column pins_as_carousel boolean not null default false;

comment on column public.content.pins_as_carousel is
  'Solo episodios: true = todos sus pines forman un único carrusel en el feed, ordenados por queue_order y con el mismo ratio.';


-- ============================================================
-- 2. SET CONTENT PINS CAROUSEL
-- ============================================================
--
-- Al activar, todos los pines que ya tenga el episodio deben compartir ratio:
-- si no, se rechaza (ZG019) y la marca queda como estaba. Sin pines todavía es
-- válido: el ABM activa la marca ANTES de subir el primer archivo.

create or replace function public.set_content_pins_carousel(
  p_content_id uuid,
  p_enabled boolean
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_ratios integer;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if p_enabled is null then
    raise exception 'El valor es obligatorio'
      using errcode = '22023';
  end if;

  select type into v_content_type
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_content_type <> 'episode' then
    raise exception 'Content is not an episode'
      using errcode = 'ZG007';
  end if;

  if p_enabled then
    select count(distinct ratio) into v_ratios
    from public.pin
    where content_id = p_content_id;

    if v_ratios > 1 then
      raise exception 'Los pines del episodio tienen distinto ratio'
        using errcode = 'ZG019';
    end if;
  end if;

  update public.content
  set pins_as_carousel = p_enabled
  where id = p_content_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'set_content_pins_carousel',
    'content',
    p_content_id,
    jsonb_build_object('content_id', p_content_id, 'enabled', p_enabled)
  );

  return p_enabled;

end;
$$;

revoke all on function public.set_content_pins_carousel(uuid, boolean) from public;
grant execute on function public.set_content_pins_carousel(uuid, boolean) to authenticated;


-- ============================================================
-- 3. TODAS LAS DIAPOSITIVAS, MISMO RATIO
-- ============================================================
--
-- Una tarjeta del feed tiene un único ratio: el masonry reserva su hueco al
-- calcular la ronda. Con la marca activa, un pin nuevo (o uno al que se le
-- cambia el ratio) no puede diferir del de los demás pines del episodio.

create or replace function public.enforce_carousel_pin_ratio()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin

  if exists (
    select 1
    from public.content c
    where c.id = new.content_id
      and c.pins_as_carousel
  ) and exists (
    select 1
    from public.pin p
    where p.content_id = new.content_id
      and p.id <> new.id
      and p.ratio <> new.ratio
  ) then
    raise exception 'Todos los pines del carrusel deben tener el mismo ratio'
      using errcode = 'ZG019';
  end if;

  return new;

end;
$$;

create trigger pin_carousel_same_ratio
  before insert or update of ratio on public.pin
  for each row execute function public.enforce_carousel_pin_ratio();
