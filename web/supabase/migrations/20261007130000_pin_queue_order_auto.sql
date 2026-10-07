-- 7 oct 2026: el orden en cola de un pin se asigna solo.
--
-- queue_order es el orden del pin dentro de la cola circular de su
-- contenido (lo usa el motor del feed). Pedirlo en el ABM liaba a quien
-- sube contenido: en la práctica todos los pines quedaban con 0. Ahora
-- create_pin asigna el siguiente libre del contenido según van llegando los
-- pines, y update_pin ya no lo toca. El motor no cambia: sigue leyendo
-- pin.queue_order.
--
--   1. Se renumeran los pines existentes por contenido (0, 1, 2...),
--      respetando su orden actual y desempatando por antigüedad.
--   2. create_pin y update_pin pierden p_queue_order (cambia la firma).

update public.pin p
set queue_order = r.new_order
from (
  select id,
         row_number() over (
           partition by content_id
           order by queue_order, created_at, id
         ) - 1 as new_order
  from public.pin
) r
where p.id = r.id
  and p.queue_order is distinct from r.new_order;

drop function if exists public.create_pin(
  uuid, pin_ratio, text, locale, pin_autoplay_mode, integer, text
);
drop function if exists public.update_pin(
  uuid, pin_ratio, text, locale, pin_autoplay_mode, integer, text
);

create or replace function public.create_pin(
  p_content_id uuid,
  p_ratio pin_ratio,
  p_label text,
  p_language locale,
  p_autoplay_mode pin_autoplay_mode,
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
  v_queue_order integer;
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

  -- Orden en la cola circular del feed: el siguiente libre del contenido,
  -- según van llegando los pines. El bloqueo evita dos pines con el mismo
  -- orden si se crean a la vez.
  perform pg_advisory_xact_lock(hashtext(p_content_id::text));

  select coalesce(max(queue_order) + 1, 0) into v_queue_order
  from public.pin
  where content_id = p_content_id;

  insert into public.pin (
    content_id, ratio, label, language,
    autoplay_mode, queue_order, alt
  )
  values (
    p_content_id, p_ratio, v_label,
    p_language, p_autoplay_mode, v_queue_order, btrim(p_alt)
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

revoke all on function public.create_pin(uuid, pin_ratio, text, locale, pin_autoplay_mode, text) from public;
grant execute on function public.create_pin(uuid, pin_ratio, text, locale, pin_autoplay_mode, text) to authenticated;

create or replace function public.update_pin(
  p_pin_id uuid,
  p_ratio pin_ratio,
  p_label text,
  p_language locale,
  p_autoplay_mode pin_autoplay_mode,
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

  update public.pin
  set
    ratio = p_ratio,
    label = v_label,
    language = p_language,
    autoplay_mode = p_autoplay_mode,
    alt = btrim(p_alt)
  where id = p_pin_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'update',
    'pin',
    p_pin_id,
    '{}'::jsonb
  );

  return p_pin_id;

end;
$$;

revoke all on function public.update_pin(uuid, pin_ratio, text, locale, pin_autoplay_mode, text) from public;
grant execute on function public.update_pin(uuid, pin_ratio, text, locale, pin_autoplay_mode, text) to authenticated;
