-- Publicación automática al llegar publish_at (arquitectura §15.3, §6 de
-- PROGRESO.md — decisión pendiente con Greener, cerrada el 22 sep a favor
-- de pg_cron: Supabase ofrece la extensión como integración propia del
-- dashboard, community pero mantenida por Supabase — no hace falta
-- infraestructura nueva que operar aparte de lo que ya gestiona Supabase).
--
-- schedule_content (20260907100000) deja el contenido en status='scheduled'
-- con publish_at en el futuro, pero nada lo pasaba a 'published' cuando
-- llegaba esa fecha — el contenido se quedaba "programado" para siempre
-- hasta que alguien lo publicara a mano desde el ABM. Esta migración cierra
-- ese hueco.

create extension if not exists pg_cron with schema extensions;

-- ============================================================
-- publish_scheduled_content() — el propio job, no una RPC de cliente
-- ============================================================
--
-- A diferencia de publish_content/schedule_content (que exigen is_admin(),
-- porque los llama una sesión autenticada real desde el ABM), esta función
-- no tiene sesión de usuario detrás — la ejecuta pg_cron. security definer
-- para no depender de qué rol tenga programado el job en cada entorno, y
-- revocada de public/anon/authenticated más abajo para que no quede
-- expuesta sin querer como RPC de PostgREST (Postgres concede EXECUTE a
-- PUBLIC por defecto en toda función nueva si no se revoca explícitamente).
create or replace function public.publish_scheduled_content()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_published_count integer;
begin

  with due as (
    select id
    from public.content
    where status = 'scheduled'
      and publish_at is not null
      and publish_at <= now()
    -- for update salta las filas que schedule_content/publish_content
    -- pudieran estar tocando en ese mismo instante desde el ABM, en vez
    -- de bloquear el tick de cron a esperarlas.
    for update skip locked
  ),
  updated as (
    update public.content
    set status = 'published'
    from due
    where content.id = due.id
    returning content.id
  )
  insert into public.audit_log (actor_email, action, entity, entity_id, payload)
  select
    'system:pg_cron',
    'publish',
    'content',
    updated.id,
    jsonb_build_object('previous_status', 'scheduled', 'trigger', 'publish_at cron')
  from updated;

  get diagnostics v_published_count = row_count;

  return v_published_count;

end;
$$;

comment on function public.publish_scheduled_content is
  'Job de pg_cron (§15.3): pasa a published todo el contenido scheduled cuyo publish_at ya se ha cumplido. No la llama ningún cliente — revocada de public/anon/authenticated a propósito.';

revoke all on function public.publish_scheduled_content() from public, anon, authenticated;

-- ============================================================
-- Programación del job — cada minuto
-- ============================================================
--
-- cron.schedule() es idempotente por nombre: volver a ejecutar esta
-- migración (o esta sentencia suelta) reemplaza el job existente en vez
-- de duplicarlo, así que es segura de repetir en desarrollo.
select cron.schedule(
  'publish-scheduled-content',
  '* * * * *',
  $$select public.publish_scheduled_content();$$
);
