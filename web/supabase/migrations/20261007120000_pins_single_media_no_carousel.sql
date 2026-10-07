-- 7 oct 2026: se elimina el carrusel de pines y se fija el modelo original.
--
-- Modelo: un pin es UN medio (imagen o vídeo) y cada contenido tiene como
-- máximo 8 pines (todos los tipos). Cada pin sale en el feed como tarjeta
-- independiente. Antes un pin admitía hasta 8 medios y un flag
-- show_as_carousel (por defecto true) los agrupaba en una tarjeta con
-- carrusel; nadie lo usaba así y para este catálogo no tiene sentido
-- agrupar piezas (la web busca mostrar mucho contenido distinto). Si algún
-- día se necesita, se diseñará a nivel de contenido, no de pin.
--
--   1. Comprobaciones previas: aborta con un mensaje claro si algún pin
--      tiene más de un medio o algún contenido más de 8 pines. No se
--      borra ni se trunca nada por cuenta propia.
--   2. Se eliminan pin.show_as_carousel y pin.speed_ms (velocidad de
--      avance del carrusel). autoplay_mode se conserva: el feed lo usa
--      para decidir cuándo reproduce el vídeo de un pin suelto.
--   3. pin_media: un medio por pin (índice único) y un trigger con mensaje
--      legible. Las funciones attach_pin_image/attach_pin_video no cambian.
--   4. pin: máximo 8 por contenido (trigger, errcode 22023 para que el ABM
--      muestre el mensaje).
--   5. create_pin/update_pin sin p_show_as_carousel ni p_speed_ms.

do $$
declare
  v_bad record;
  v_msg text;
begin

  select string_agg(format('pin %s (%s medios)', pin_id, n), ', ')
  into v_msg
  from (
    select pin_id, count(*) as n
    from public.pin_media
    group by pin_id
    having count(*) > 1
  ) t;

  if v_msg is not null then
    raise exception 'Hay pines con más de un medio; reduce cada uno a un medio antes de migrar: %', v_msg
      using errcode = 'P0001';
  end if;

  select string_agg(format('contenido %s (%s pines)', content_id, n), ', ')
  into v_msg
  from (
    select content_id, count(*) as n
    from public.pin
    group by content_id
    having count(*) > 8
  ) t;

  if v_msg is not null then
    raise exception 'Hay contenidos con más de 8 pines; elimina los sobrantes antes de migrar: %', v_msg
      using errcode = 'P0001';
  end if;

end;
$$;

-- 2. columnas del carrusel. Las funciones se redefinen más abajo, pero
-- las antiguas (con esos parámetros) hay que borrarlas antes de nada
-- porque cambia su firma.
drop function if exists public.create_pin(
  uuid, pin_ratio, boolean, text, locale, pin_autoplay_mode, integer, integer, text
);
drop function if exists public.update_pin(
  uuid, pin_ratio, boolean, text, locale, pin_autoplay_mode, integer, integer, text
);

alter table public.pin drop column show_as_carousel;
alter table public.pin drop column speed_ms;

-- 3. un medio por pin
create unique index pin_media_one_per_pin_idx on public.pin_media (pin_id);

create or replace function public.enforce_single_pin_media()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from public.pin_media where pin_id = new.pin_id) then
    raise exception 'Un pin admite un solo medio'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger pin_media_single_media
  before insert on public.pin_media
  for each row execute function public.enforce_single_pin_media();

-- 4. máximo 8 pines por contenido
create or replace function public.enforce_max_pins_per_content()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.pin where content_id = new.content_id) >= 8 then
    raise exception 'Un contenido admite como máximo 8 pines'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger pin_max_per_content
  before insert on public.pin
  for each row execute function public.enforce_max_pins_per_content();

-- 5. create_pin / update_pin (rótulo opcional también en insight, como en
-- 20261007100000; debe coincidir con DERIVED_PIN_LABEL_TYPES)
create or replace function public.create_pin(
  p_content_id uuid,
  p_ratio pin_ratio,
  p_label text,
  p_language locale,
  p_autoplay_mode pin_autoplay_mode,
  p_queue_order integer,
  p_alt text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_pin_id uuid;
  v_label text;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select type into v_content_type
  from public.content
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  v_label := nullif(btrim(coalesce(p_label, '')), '');

  if v_content_type not in ('case', 'episode', 'insight') and v_label is null then
    raise exception 'El rótulo del pin es obligatorio para este tipo de contenido'
      using errcode = '22023';
  end if;

  if btrim(coalesce(p_alt, '')) = '' then
    raise exception 'El alt del pin es obligatorio'
      using errcode = '22023';
  end if;

  if p_queue_order < 0 then
    raise exception 'queue_order no puede ser negativo'
      using errcode = '22023';
  end if;

  insert into public.pin (
    content_id, ratio, label, language,
    autoplay_mode, queue_order, alt
  )
  values (
    p_content_id, p_ratio, v_label,
    p_language, p_autoplay_mode, p_queue_order, btrim(p_alt)
  )
  returning id
  into v_pin_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'create',
    'pin',
    v_pin_id,
    jsonb_build_object('content_id', p_content_id)
  );

  return v_pin_id;

end;
$$;

revoke all on function public.create_pin(uuid, pin_ratio, text, locale, pin_autoplay_mode, integer, text) from public;
grant execute on function public.create_pin(uuid, pin_ratio, text, locale, pin_autoplay_mode, integer, text) to authenticated;

create or replace function public.update_pin(
  p_pin_id uuid,
  p_ratio pin_ratio,
  p_label text,
  p_language locale,
  p_autoplay_mode pin_autoplay_mode,
  p_queue_order integer,
  p_alt text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_type content_type;
  v_label text;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select c.type into v_content_type
  from public.pin p
  join public.content c on c.id = p.content_id
  where p.id = p_pin_id;

  if not found then
    raise exception 'Pin not found'
      using errcode = 'P0002';
  end if;

  v_label := nullif(btrim(coalesce(p_label, '')), '');

  if v_content_type not in ('case', 'episode', 'insight') and v_label is null then
    raise exception 'El rótulo del pin es obligatorio para este tipo de contenido'
      using errcode = '22023';
  end if;

  if btrim(coalesce(p_alt, '')) = '' then
    raise exception 'El alt del pin es obligatorio'
      using errcode = '22023';
  end if;

  if p_queue_order < 0 then
    raise exception 'queue_order no puede ser negativo'
      using errcode = '22023';
  end if;

  update public.pin
  set
    ratio = p_ratio,
    label = v_label,
    language = p_language,
    autoplay_mode = p_autoplay_mode,
    queue_order = p_queue_order,
    alt = btrim(p_alt)
  where id = p_pin_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'update',
    'pin',
    p_pin_id,
    jsonb_build_object('queue_order', p_queue_order)
  );

  return p_pin_id;

end;
$$;

revoke all on function public.update_pin(uuid, pin_ratio, text, locale, pin_autoplay_mode, integer, text) from public;
grant execute on function public.update_pin(uuid, pin_ratio, text, locale, pin_autoplay_mode, integer, text) to authenticated;
