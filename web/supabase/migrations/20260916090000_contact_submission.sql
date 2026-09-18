-- Formulario de contacto real (brief §5.6, arquitectura §14.1): "Debe
-- incluir consentimiento de privacidad, honeypot, límite por IP,
-- validación de email y registro mínimo de entrega/error en Supabase."
--
-- Esta tabla cubre las dos últimas piezas a la vez: el límite por IP
-- necesita saber cuántos envíos ha habido recientemente desde una IP, y
-- ese mismo recuento sirve de registro mínimo de entrega/error. A
-- propósito NO se guarda ni el nombre, ni el email, ni el teléfono, ni
-- el cuerpo del mensaje — eso viaja solo por email, nunca se persiste
-- aquí; guardar el contenido del formulario en dos sitios distintos no
-- aporta nada y es superficie de datos personales de más.
--
-- ip_hash, no la IP en crudo: con una sal (CONTACT_IP_HASH_SALT) para
-- que no sea trivial revertirla contra un listado de IPs candidatas —
-- sigue siendo determinista (la misma IP siempre da el mismo hash), que
-- es todo lo que hace falta para contar envíos por IP.
--
-- Sin política de RLS pública a propósito: se escribe y se lee solo
-- desde el Server Action del formulario, con el cliente de servicio
-- (SUPABASE_SECRET_KEY, salta RLS por completo — mismo patrón que
-- feed_session/feed_round, ver src/lib/supabase/serviceClient.ts). No
-- hay ningún caso de uso público, ni de lectura ni de escritura, para
-- esta tabla.

create table contact_submission (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  status text not null,
  error text,
  created_at timestamptz not null default now(),
  constraint contact_submission_status_check check (status in ('sent', 'failed', 'rate_limited', 'honeypot'))
);

create index contact_submission_ip_hash_created_at_idx
  on contact_submission (ip_hash, created_at);

comment on table contact_submission is
  'Registro mínimo de envíos del formulario de contacto (arquitectura §14.1): solo IP con hash, estado y error — nunca el contenido del formulario. Sirve también para el límite de envíos por IP.';
comment on column contact_submission.status is
  'sent: se envió el email de verdad. failed: honeypot/límite pasados pero el envío SMTP falló. rate_limited: bloqueado por el límite por IP antes de intentar enviar. honeypot: campo trampa relleno — el usuario ve éxito igualmente, no hay que delatarlo.';

alter table contact_submission enable row level security;
-- Sin create policy: por defecto, RLS deniega todo a cualquier rol que
-- no sea el de servicio — ni siquiera hace falta declarar una política
-- "deny all" explícita, es el comportamiento por defecto de Postgres
-- con RLS activado y cero políticas.
