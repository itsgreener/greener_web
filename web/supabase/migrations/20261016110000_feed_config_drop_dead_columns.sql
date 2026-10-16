-- Retirada de las columnas muertas de feed_config (plan de pendientes, C10).
--
-- El motor del feed lee de feed_config solo `ratios` y `batch_size`
-- (supabaseFeedSource.getFeedConfig). Las otras cuatro columnas no las lee
-- nadie y engañan: parece que un valor de la base controla algo que no
-- controla.
--
--   mix_window, distance_window   la mezcla y la regla de separación de 10
--                                 se eliminaron en el rediseño del feed
--                                 (14 oct 2026).
--   video_limit_desktop/_mobile   el 2/1 de vídeos simultáneos está fijo en
--                                 el cliente (videoPlaybackCoordinator.ts,
--                                 según el ancho: < 640 px).
--
-- `if exists` para que repetir la migración (o aplicarla en un entorno ya
-- limpiado a mano) no falle. Tras aplicarla hay que regenerar los tipos.

alter table public.feed_config
  drop column if exists mix_window,
  drop column if exists distance_window,
  drop column if exists video_limit_desktop,
  drop column if exists video_limit_mobile;
