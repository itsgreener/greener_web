-- Revocación de enlaces de preview (SEC-ADM-D2, 29 oct 2026).
--
-- Un enlace de preview es un token firmado y sin estado que lleva el id del
-- contenido y su fecha de emisión. Para poder invalidar los ya emitidos sin
-- esperar a que caduquen (24 h), cada contenido guarda desde cuándo se
-- rechazan: el enlace solo vale si se emitió DESPUÉS de esa fecha. Los enlaces
-- nuevos, generados tras revocar, vuelven a funcionar.

alter table public.content
  add column preview_revoked_at timestamptz;

comment on column public.content.preview_revoked_at is
  'Los enlaces de preview emitidos hasta esta fecha (incluida) ya no valen. Null = nunca se han revocado.';

create or replace function public.revoke_content_preview_links(
  p_content_id uuid,
  p_revoked_at timestamptz
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

  update public.content
  set preview_revoked_at = p_revoked_at
  where id = p_content_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  insert into public.audit_log (
    actor_email, action, entity, entity_id, payload
  )
  values (
    lower(coalesce(auth.jwt() ->> 'email', 'unknown')),
    'preview_revoke',
    'content',
    p_content_id,
    '{}'::jsonb
  );

  return p_content_id;

end;
$$;

revoke all on function public.revoke_content_preview_links(uuid, timestamptz) from public;
grant execute on function public.revoke_content_preview_links(uuid, timestamptz) to authenticated;
