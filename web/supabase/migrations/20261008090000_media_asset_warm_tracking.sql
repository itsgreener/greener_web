-- 8 oct 2026: seguimiento del calentamiento de versiones de vídeo
-- (fase 2 del contrato de medios, contrato-medios-fase-1.md §9.6).
--
-- «Calentar» es pedir a Cloudinary, por adelantado y de forma asíncrona (eager),
-- las versiones de un vídeo que la web va a servir, para que el primer
-- visitante no espere a que se generen al vuelo. Aquí solo se guarda QUÉ se
-- ha calentado y con qué contrato; la llamada a Cloudinary la hace la
-- aplicación.
--
--  - warmed_contract: identificador del contrato de calentamiento vigente
--    cuando se calentó el vídeo (un hash corto de sus cadenas de eager).
--    Si cambia el contrato de entrega, o cambia lo que hay que calentar de ese
--    vídeo (otro ratio…), deja de coincidir y el vídeo vuelve a figurar «sin
--    calentar». null = nunca calentado, o el último intento falló.
--  - warmed_at: cuándo se encargó el calentamiento (el eager es asíncrono: no
--    garantiza que Cloudinary haya terminado).
--  - warm_error: último error (null si fue bien). media_asset tiene lectura
--    pública (política media_asset_public_read) y estas columnas se ven con
--    ella: la función lo recorta a 300 caracteres y quien lo escribe no debe
--    meter nada sensible.

alter table public.media_asset
  add column warmed_contract text,
  add column warmed_at timestamptz,
  add column warm_error text;

comment on column public.media_asset.warmed_contract is
  'Contrato de calentamiento (hash de las cadenas de eager) con el que se calentó este vídeo; null = sin calentar o último intento fallido. Solo vídeo.';
comment on column public.media_asset.warmed_at is
  'Cuándo se encargó el eager asíncrono a Cloudinary (no garantiza que haya terminado).';
comment on column public.media_asset.warm_error is
  'Último error del calentamiento (máx. 300 caracteres, de lectura pública: sin datos sensibles); null si fue bien.';

-- ============================================================
-- MARK MEDIA ASSET WARMED
-- ============================================================
--
-- La puede ejecutar:
--  - un admin (el calentamiento que dispara el botón «Publicar», «Programar»
--    o «Calentar» del ABM corre con su sesión), o
--  - el rol de servicio (SUPABASE_SECRET_KEY: el script
--    scripts/warm-cloudinary.mjs y las tareas sin sesión). `is_admin()` mira
--    el email del JWT, que la clave de servicio no lleva, por eso se admite
--    el rol de servicio de forma explícita: `current_user` es el rol con el
--    que PostgREST ejecuta la petición (función security invoker).
--
-- Con p_error nulo o vacío: marca el vídeo como calentado con p_contract.
-- Con p_error: anota el fallo y deja el vídeo como «sin calentar» (así el
-- script y el botón lo reintentan).

create or replace function public.mark_media_asset_warmed(
  p_media_id uuid,
  p_contract text,
  p_error text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_is_service boolean := (current_user = 'service_role');
  v_kind media_kind;
  v_error text := nullif(left(btrim(coalesce(p_error, '')), 300), '');
  v_contract text := nullif(btrim(coalesce(p_contract, '')), '');
begin

  if not (v_is_service or public.is_admin()) then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select kind
  into v_kind
  from public.media_asset
  where id = p_media_id;

  if not found then
    raise exception 'El medio no existe'
      using errcode = 'P0001';
  end if;

  if v_kind <> 'video' then
    raise exception 'Solo los vídeos se calientan'
      using errcode = 'P0001';
  end if;

  if v_error is null then

    if v_contract is null then
      raise exception 'Falta el contrato de calentamiento'
        using errcode = 'P0001';
    end if;

    update public.media_asset
    set warmed_contract = v_contract,
        warmed_at = now(),
        warm_error = null
    where id = p_media_id;

  else

    update public.media_asset
    set warmed_contract = null,
        warmed_at = null,
        warm_error = v_error
    where id = p_media_id;

  end if;

  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  values (
    case
      when v_is_service then 'service_role'
      else lower(coalesce(auth.jwt() ->> 'email', 'unknown'))
    end,
    'mark_media_warmed',
    'media_asset',
    p_media_id,
    jsonb_build_object(
      'contract', v_contract,
      'ok', v_error is null,
      'error', v_error
    )
  );

end;
$$;

revoke all on function public.mark_media_asset_warmed(uuid, text, text) from public;
grant execute on function public.mark_media_asset_warmed(uuid, text, text) to authenticated, service_role;
