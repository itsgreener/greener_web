-- Bucket de Storage para paquetes HTML de tools/insights (arquitectura §5,
-- §9.2, §12.2). Privado: el navegador nunca habla directamente con
-- Storage — las rutas públicas /tools/[slug] e /insights/[slug] leen el
-- contenido en el servidor (mismo patrón que feed_session/feed_round con
-- la service role, arquitectura §8.5) y lo sirven bajo su propia ruta,
-- mismo origen (§12.1). Por eso no hace falta política de lectura pública
-- en storage.objects — solo escritura de administrador.

insert into storage.buckets (id, name, public)
values ('html-packages', 'html-packages', false)
on conflict (id) do nothing;

create policy html_packages_admin_write on storage.objects
  for all
  to authenticated
  using (bucket_id = 'html-packages' and is_admin())
  with check (bucket_id = 'html-packages' and is_admin());
