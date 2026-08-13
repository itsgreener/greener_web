-- Greener — 08: control de acceso (RLS) — arquitectura §15.2, §17.1
--
-- Principio: lectura pública solo de contenido publicado; escritura
-- restringida a sesiones cuyo dominio de correo está en la allowlist de
-- administración. Sin roles diferenciados: is_admin() es todo o nada,
-- tal como se confirmó con Greener (arquitectura §15.2).

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from admin_allowed_domain d
    where lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 2)) = lower(d.domain)
  );
$$;

comment on function is_admin is
  'Verificación server-side del dominio del JWT actual contra admin_allowed_domain. El parámetro hd de Google en el login es solo una sugerencia de UI, no una restricción real; esta función es la restricción real (arquitectura §15.2).';

-- ---------------------------------------------------------------------
-- content / content_translation
-- ---------------------------------------------------------------------
alter table content enable row level security;
alter table content_translation enable row level security;

create policy content_public_read on content
  for select using (status = 'published');

create policy content_admin_all on content
  for all using (is_admin()) with check (is_admin());

create policy content_translation_public_read on content_translation
  for select using (
    exists (select 1 from content c where c.id = content_id and c.status = 'published')
  );

create policy content_translation_admin_all on content_translation
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- content_block / content_block_translation
-- ---------------------------------------------------------------------
alter table content_block enable row level security;
alter table content_block_translation enable row level security;

create policy content_block_public_read on content_block
  for select using (
    exists (select 1 from content c where c.id = content_id and c.status = 'published')
  );

create policy content_block_admin_all on content_block
  for all using (is_admin()) with check (is_admin());

create policy content_block_translation_public_read on content_block_translation
  for select using (
    exists (
      select 1 from content_block b
      join content c on c.id = b.content_id
      where b.id = block_id and c.status = 'published'
    )
  );

create policy content_block_translation_admin_all on content_block_translation
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- case_detail / episode / html_package / html_package_version
-- ---------------------------------------------------------------------
alter table case_detail enable row level security;
alter table episode enable row level security;
alter table html_package enable row level security;
alter table html_package_version enable row level security;

create policy case_detail_public_read on case_detail
  for select using (
    exists (select 1 from content c where c.id = content_id and c.status = 'published')
  );
create policy case_detail_admin_all on case_detail
  for all using (is_admin()) with check (is_admin());

create policy episode_public_read on episode
  for select using (
    exists (select 1 from content c where c.id = content_id and c.status = 'published')
  );
create policy episode_admin_all on episode
  for all using (is_admin()) with check (is_admin());

create policy html_package_public_read on html_package
  for select using (
    exists (select 1 from content c where c.id = content_id and c.status = 'published')
  );
create policy html_package_admin_all on html_package
  for all using (is_admin()) with check (is_admin());

-- Solo la versión publicada es visible públicamente, no cada subida (§12.2)
create policy html_package_version_public_read on html_package_version
  for select using (
    status = 'published'
    and exists (
      select 1 from html_package p
      join content c on c.id = p.content_id
      where p.content_id = package_id and c.status = 'published'
    )
  );
create policy html_package_version_admin_all on html_package_version
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- media_asset / pin / pin_media
-- ---------------------------------------------------------------------
alter table media_asset enable row level security;
alter table pin enable row level security;
alter table pin_media enable row level security;

-- Un media_asset listo se puede leer sin gatear por content: no es sensible
-- y se referencia desde varios sitios (og_media_id, content_block, pin_media).
create policy media_asset_public_read on media_asset
  for select using (status = 'ready');
create policy media_asset_admin_all on media_asset
  for all using (is_admin()) with check (is_admin());

create policy pin_public_read on pin
  for select using (
    exists (select 1 from content c where c.id = content_id and c.status = 'published')
  );
create policy pin_admin_all on pin
  for all using (is_admin()) with check (is_admin());

create policy pin_media_public_read on pin_media
  for select using (
    exists (
      select 1 from pin p
      join content c on c.id = p.content_id
      where p.id = pin_id and c.status = 'published'
    )
  );
create policy pin_media_admin_all on pin_media
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- tag / content_tag — no sensibles, lectura pública total
-- ---------------------------------------------------------------------
alter table tag enable row level security;
alter table content_tag enable row level security;

create policy tag_public_read on tag for select using (true);
create policy tag_admin_all on tag for all using (is_admin()) with check (is_admin());

create policy content_tag_public_read on content_tag for select using (true);
create policy content_tag_admin_all on content_tag for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- feed_config — lectura pública (no sensible), escritura solo admin
-- ---------------------------------------------------------------------
alter table feed_config enable row level security;

create policy feed_config_public_read on feed_config for select using (true);
create policy feed_config_admin_all on feed_config for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- feed_session / feed_round — sin política pública: solo accesibles con
-- la service role key desde el route handler del feed (arquitectura §8.5,
-- "el cliente no puede alterar cuotas ni seed").
-- ---------------------------------------------------------------------
alter table feed_session enable row level security;
alter table feed_round enable row level security;

create policy feed_session_admin_all on feed_session for all using (is_admin()) with check (is_admin());
create policy feed_round_admin_all on feed_round for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- redirect_301 — lectura pública de activas (usada en middleware), resto admin
-- ---------------------------------------------------------------------
alter table redirect_301 enable row level security;

create policy redirect_301_public_read on redirect_301
  for select using (active = true);
create policy redirect_301_admin_all on redirect_301
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- admin_allowed_domain / admin_profile / audit_log — solo admin
-- ---------------------------------------------------------------------
alter table admin_allowed_domain enable row level security;
alter table admin_profile enable row level security;
alter table audit_log enable row level security;

create policy admin_allowed_domain_admin_all on admin_allowed_domain
  for all using (is_admin()) with check (is_admin());

create policy admin_profile_admin_all on admin_profile
  for all using (is_admin()) with check (is_admin());

-- audit_log: cualquier admin puede insertar y leer, nadie edita ni borra
-- (integridad del historial).
create policy audit_log_admin_read on audit_log
  for select using (is_admin());
create policy audit_log_admin_insert on audit_log
  for insert with check (is_admin());
