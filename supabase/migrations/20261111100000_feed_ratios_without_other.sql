-- 11 nov 2026: nuevo reparto del feed, 70/10/10/10 (decisión de Greener).
--
-- `other` ya no ocupa el 5 % de la ronda: no entra en su cuota, sino que se
-- intercala como interludio según su propio calendario (plan de `other`,
-- `interludes.ts`). Con el reparto anterior (70/15/5/5/5) los pesos que de
-- verdad se repartían en la home eran 15/5/5, es decir 60/20/20 del hueco que
-- dejan los casos, y salía 70/18/6/6. Con 70/10/10/10/0 salen 70/10/10/10.
--
-- La clave `other` se conserva en el jsonb (con valor 0) para no cambiar la
-- forma que valida `feedRatiosSchema`. Suman 100.
--
-- Solo cambia la fila única de `feed_config` y el valor por defecto de la
-- columna; no toca datos de contenido ni es necesario reiniciar nada: la
-- configuración del feed se cachea 60 s.
-- Para volver atrás: reaplicar el valor anterior, 70/15/5/5/5.

update feed_config
set ratios = '{"cases": 70, "insights": 10, "tools": 10, "channel": 10, "other": 0}'::jsonb,
    updated_at = now();

alter table feed_config
  alter column ratios
  set default '{"cases": 70, "insights": 10, "tools": 10, "channel": 10, "other": 0}'::jsonb;
