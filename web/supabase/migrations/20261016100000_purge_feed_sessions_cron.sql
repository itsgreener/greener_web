-- Limpieza diaria de sesiones de feed caducadas (plan de pendientes, B3).
--
-- Cada visita a la home crea una fila en feed_session y sus rondas en
-- feed_round (secuencias precalculadas). La sesión caduca a las 24 h
-- (expires_at), pero nada borraba las filas: la tabla solo crecía. Esta
-- migración añade un job de pg_cron que, una vez al día, borra las sesiones
-- cuya caducidad es anterior a hace 24 h (un día de margen sobre el uso real:
-- una sesión recién caducada sigue pudiendo responder a un cursor tardío).
-- feed_round se vacía solo, por el `on delete cascade` de session_id.
--
-- Mismo patrón que publish_scheduled_content (20260922090000): función
-- security definer que no llama ningún cliente, y cron.schedule idempotente
-- por nombre.

create extension if not exists pg_cron with schema extensions;

-- El borrado filtra por expires_at: sin índice sería un barrido de la tabla.
create index if not exists feed_session_expires_at_idx
  on public.feed_session (expires_at);

-- ============================================================
-- purge_expired_feed_sessions() — el propio job, no una RPC de cliente
-- ============================================================
--
-- Borra por lotes para no mantener un bloqueo largo si la tabla llega a
-- acumular muchas filas (primera ejecución tras meses sin limpiar).
-- Devuelve el total de sesiones borradas.
create or replace function public.purge_expired_feed_sessions()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_batch integer;
  v_total integer := 0;
begin

  loop
    delete from public.feed_session
    where id in (
      select id
      from public.feed_session
      where expires_at < now() - interval '24 hours'
      limit 5000
    );

    get diagnostics v_batch = row_count;

    v_total := v_total + v_batch;

    exit when v_batch = 0;
  end loop;

  return v_total;

end;
$$;

comment on function public.purge_expired_feed_sessions is
  'Job de pg_cron (plan de pendientes, B3): borra las feed_session caducadas hace más de 24 h; feed_round se borra en cascada. No la llama ningún cliente — revocada de public/anon/authenticated a propósito.';

revoke all on function public.purge_expired_feed_sessions() from public, anon, authenticated;

-- ============================================================
-- Programación del job — cada día a las 03:15 UTC
-- ============================================================
--
-- cron.schedule() es idempotente por nombre: repetir esta migración
-- reemplaza el job en vez de duplicarlo.
select cron.schedule(
  'purge-expired-feed-sessions',
  '15 3 * * *',
  $$select public.purge_expired_feed_sessions();$$
);
