-- Evita medios huérfanos al sustituir la imagen/vídeo de un bloque (plan
-- Free de Cloudinary: 25 credits/mes, cada media_asset sin usar cuenta).
--
-- El orden de la operación lo decide la capa de aplicación (mediaActions.ts):
-- primero se llama a esta función para desvincular y borrar el registro en
-- Postgres, y solo si eso tiene éxito se borra el archivo real en Cloudinary
-- (cloudinaryServer.ts) antes de subir el nuevo. Esta función es solo la
-- mitad de Postgres de ese flujo — no toca Cloudinary, eso no puede hacerlo
-- SQL.
--
-- Seguridad estructural: content_block.media_id no tiene ON DELETE CASCADE
-- (migración 20260806090400), así que si el media_asset sigue referenciado
-- desde OTRO bloque, otro pin_media o content.og_media_id, el DELETE de más
-- abajo falla con una violación de FK (23503) y toda la función se revierte
-- —incluido el UPDATE que desvincula el bloque actual—, sin dejar nada a
-- medias. No hace falta comprobar referencias a mano: lo hace la propia
-- base de datos.

create or replace function public.unlink_and_delete_media_asset(
  p_block_id uuid,
  p_media_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current_media_id uuid;
  v_content_id uuid;
  v_kind media_kind;
  v_cloudinary_public_id text;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select
    content_id,
    media_id
  into
    v_content_id,
    v_current_media_id
  from public.content_block
  where id = p_block_id;

  if not found then
    raise exception 'Block not found'
      using errcode = 'P0002';
  end if;

  if v_current_media_id is distinct from p_media_id then
    raise exception 'El bloque ya no apunta a este medio (posible carrera con otra pestaña)'
      using errcode = 'P0001';
  end if;

  select
    kind,
    cloudinary_public_id
  into
    v_kind,
    v_cloudinary_public_id
  from public.media_asset
  where id = p_media_id;

  if not found then
    raise exception 'Media not found'
      using errcode = 'P0002';
  end if;

  update public.content_block
  set media_id = null
  where id = p_block_id;

  delete from public.media_asset
  where id = p_media_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'delete',
    'media_asset',
    p_media_id,
    jsonb_build_object(
      'block_id', p_block_id,
      'content_id', v_content_id,
      'kind', v_kind,
      'cloudinary_public_id', v_cloudinary_public_id
    )
  );

  return p_media_id;

end;
$$;

revoke all
on function public.unlink_and_delete_media_asset(uuid, uuid)
from public;

grant execute
on function public.unlink_and_delete_media_asset(uuid, uuid)
to authenticated;
