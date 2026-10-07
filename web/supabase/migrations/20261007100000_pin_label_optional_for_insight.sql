-- 7 oct 2026: el rótulo del pin de un insight pasa a ser automático.
--
-- Cuando el texto del pie del pin de insight se automatizó (título del
-- insight + «Insights by Greener», sin la frase gancho), el ABM y el feed se
-- adaptaron — los tres formularios del ABM envían el rótulo vacío para
-- case/episode/insight —, pero create_pin y update_pin siguieron exigiendo
-- rótulo para cualquier tipo salvo case y episode. Resultado: toda alta o
-- edición de un pin de insight fallaba con «El rótulo del pin es obligatorio
-- para este tipo de contenido» (errcode 22023).
--
-- Se redefinen las dos funciones con la única diferencia de añadir
-- 'insight' a la lista de tipos sin rótulo obligatorio. Firmas y permisos
-- sin cambios, así que `create or replace` basta. Deben coincidir con
-- DERIVED_PIN_LABEL_TYPES (src/modules/pin/domain/derivedPinLabel.ts): un
-- test lo comprueba.

create or replace function public.create_pin(
  p_content_id uuid,
  p_ratio pin_ratio,
  p_show_as_carousel boolean,
  p_label text,
  p_language locale,
  p_autoplay_mode pin_autoplay_mode,
  p_speed_ms integer,
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
    content_id, ratio, show_as_carousel, label, language,
    autoplay_mode, speed_ms, queue_order, alt
  )
  values (
    p_content_id, p_ratio, p_show_as_carousel, v_label,
    p_language, p_autoplay_mode, p_speed_ms, p_queue_order, btrim(p_alt)
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

revoke all on function public.create_pin(uuid, pin_ratio, boolean, text, locale, pin_autoplay_mode, integer, integer, text) from public;
grant execute on function public.create_pin(uuid, pin_ratio, boolean, text, locale, pin_autoplay_mode, integer, integer, text) to authenticated;

create or replace function public.update_pin(
  p_pin_id uuid,
  p_ratio pin_ratio,
  p_show_as_carousel boolean,
  p_label text,
  p_language locale,
  p_autoplay_mode pin_autoplay_mode,
  p_speed_ms integer,
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
    show_as_carousel = p_show_as_carousel,
    label = v_label,
    language = p_language,
    autoplay_mode = p_autoplay_mode,
    speed_ms = p_speed_ms,
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

revoke all on function public.update_pin(uuid, pin_ratio, boolean, text, locale, pin_autoplay_mode, integer, integer, text) from public;
grant execute on function public.update_pin(uuid, pin_ratio, boolean, text, locale, pin_autoplay_mode, integer, integer, text) to authenticated;
