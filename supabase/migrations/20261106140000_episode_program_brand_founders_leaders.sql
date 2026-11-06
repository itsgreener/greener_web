-- 6 nov 2026: nuevo programa del podcast, «Brand Founders & Leaders»
-- (clave `brand_founders_leaders`). Se añade como cuarto valor de
-- `episode_program`; `brand_to_table` y los episodios que ya lo usan no se
-- tocan. `upsert_episode` y la columna `episode.program` usan el tipo, así
-- que aceptan el valor nuevo sin cambiar nada más.
--
-- En un fichero propio y sin usar el valor aquí: Postgres no permite usar un
-- valor de enum recién añadido dentro de la misma transacción (mismo patrón
-- que 20260910083100_pin_ratio_add_4_3 y 20261015110000_html_package_kind_variety).
-- Un `ADD VALUE` no se puede deshacer sin recrear el tipo; por eso es seguro
-- reaplicarlo (`if not exists`) pero no hay migración de vuelta atrás.

alter type episode_program add value if not exists 'brand_founders_leaders';
