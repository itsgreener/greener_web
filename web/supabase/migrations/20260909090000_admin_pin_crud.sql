-- CRUD de pin (§7.4, §9, §15.1). El tipo (fixed/animated/carousel) se
-- bloquea tras crear, mismo criterio que content y content_block: el tipo
-- determina qué medios admite el pin (una imagen, un vídeo, o hasta 8
-- slides), cambiarlo a mitad de camino dejaría medios huérfanos de un
-- tipo que ya no aplica.

create or replace function public.create_pin(
  p_content_id uuid,
  p_type pin_type,
  p_ratio pin_ratio,
  p_label text,
  p_cta text,
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
  v_pin_id uuid;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.content where id = p_content_id) then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if btrim(coalesce(p_alt, '')) = '' then
    raise exception 'El alt del pin es obligatorio'
      using errcode = '22023';
  end if;

  if btrim(coalesce(p_label, '')) = '' then
    raise exception 'El rótulo del pin es obligatorio'
      using errcode = '22023';
  end if;

  if p_queue_order < 0 then
    raise exception 'queue_order no puede ser negativo'
      using errcode = '22023';
  end if;

  insert into public.pin (
    content_id, type, ratio, label, cta, language,
    autoplay_mode, speed_ms, queue_order, alt
  )
  values (
    p_content_id, p_type, p_ratio, btrim(p_label), nullif(btrim(coalesce(p_cta, '')), ''),
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
    jsonb_build_object('content_id', p_content_id, 'type', p_type)
  );

  return v_pin_id;

end;
$$;


create or replace function public.update_pin(
  p_pin_id uuid,
  p_ratio pin_ratio,
  p_label text,
  p_cta text,
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
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if btrim(coalesce(p_alt, '')) = '' then
    raise exception 'El alt del pin es obligatorio'
      using errcode = '22023';
  end if;

  if btrim(coalesce(p_label, '')) = '' then
    raise exception 'El rótulo del pin es obligatorio'
      using errcode = '22023';
  end if;

  if p_queue_order < 0 then
    raise exception 'queue_order no puede ser negativo'
      using errcode = '22023';
  end if;

  update public.pin
  set
    ratio = p_ratio,
    label = btrim(p_label),
    cta = nullif(btrim(coalesce(p_cta, '')), ''),
    language = p_language,
    autoplay_mode = p_autoplay_mode,
    speed_ms = p_speed_ms,
    queue_order = p_queue_order,
    alt = btrim(p_alt)
  where id = p_pin_id;

  if not found then
    raise exception 'Pin not found'
      using errcode = 'P0002';
  end if;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'update',
    'pin',
    p_pin_id,
    jsonb_build_object('label', p_label, 'queue_order', p_queue_order)
  );

  return p_pin_id;

end;
$$;


create or replace function public.delete_pin(
  p_pin_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_id uuid;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select content_id
  into v_content_id
  from public.pin
  where id = p_pin_id;

  if not found then
    raise exception 'Pin not found'
      using errcode = 'P0002';
  end if;

  -- pin_media tiene ON DELETE CASCADE desde pin_id: se limpia solo. Los
  -- media_asset quedan huérfanos deliberadamente aquí (no se borran) — a
  -- diferencia de la sustitución de un medio dentro de un pin, borrar el
  -- pin entero es una operación menos frecuente y el admin puede no
  -- querer perder el archivo de Cloudinary solo porque borró el pin que
  -- lo usaba; se revisará si el volumen real lo justifica.
  delete from public.pin where id = p_pin_id;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'delete',
    'pin',
    p_pin_id,
    jsonb_build_object('content_id', v_content_id)
  );

  return p_pin_id;

end;
$$;

revoke all on function public.create_pin(uuid, pin_type, pin_ratio, text, text, locale, pin_autoplay_mode, integer, integer, text) from public;
grant execute on function public.create_pin(uuid, pin_type, pin_ratio, text, text, locale, pin_autoplay_mode, integer, integer, text) to authenticated;

revoke all on function public.update_pin(uuid, pin_ratio, text, text, locale, pin_autoplay_mode, integer, integer, text) from public;
grant execute on function public.update_pin(uuid, pin_ratio, text, text, locale, pin_autoplay_mode, integer, integer, text) to authenticated;

revoke all on function public.delete_pin(uuid) from public;
grant execute on function public.delete_pin(uuid) to authenticated;
