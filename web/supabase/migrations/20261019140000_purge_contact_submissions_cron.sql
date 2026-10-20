-- Limpieza diaria del registro antiabuso del formulario de contacto (texto
-- legal de /privacy, 19 oct 2026: «estos registros se borran automáticamente a
-- los 30 días»).
--
-- contact_submission guarda, por cada intento de envío, un hash con sal de la
-- IP, el resultado (`status`) y, si el envío falló, el texto del error. Solo
-- sirve para el límite de 5 envíos por hora (ventana de 1 h), pero nada
-- borraba las filas: la tabla solo crecía y el texto legal prometía 30 días.
-- Esta migración añade un job de pg_cron que, una vez al día, borra los
-- registros con más de 30 días.
--
-- Mismo patrón que purge_expired_feed_sessions (20261016100000): función
-- security definer que no llama ningún cliente, borrado por lotes y
-- cron.schedule idempotente por nombre.

create extension if not exists pg_cron with schema extensions;

-- El borrado filtra por created_at: sin índice sería un barrido de la tabla.
create index if not exists contact_submission_created_at_idx
  on public.contact_submission (created_at);

-- ============================================================
-- purge_expired_contact_submissions() — el propio job, no una RPC de cliente
-- ============================================================
--
-- Borra por lotes para no mantener un bloqueo largo si la tabla llega a
-- acumular muchas filas (primera ejecución tras semanas sin limpiar).
-- Devuelve el total de registros borrados.
create or replace function public.purge_expired_contact_submissions()
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
    delete from public.contact_submission
    where id in (
      select id
      from public.contact_submission
      where created_at < now() - interval '30 days'
      limit 5000
    );

    get diagnostics v_batch = row_count;

    v_total := v_total + v_batch;

    exit when v_batch = 0;
  end loop;

  return v_total;

end;
$$;

comment on function public.purge_expired_contact_submissions is
  'Job de pg_cron: borra los contact_submission con más de 30 días (plazo que declara el texto legal de /privacy). No la llama ningún cliente — revocada de public/anon/authenticated a propósito.';

revoke all on function public.purge_expired_contact_submissions() from public, anon, authenticated;

-- ============================================================
-- Programación del job — cada día a las 03:30 UTC
-- ============================================================
--
-- cron.schedule() es idempotente por nombre: repetir esta migración
-- reemplaza el job en vez de duplicarlo. 15 minutos después de la purga de
-- feed_session para que no coincidan.
select cron.schedule(
  'purge-expired-contact-submissions',
  '30 3 * * *',
  $$select public.purge_expired_contact_submissions();$$
);
