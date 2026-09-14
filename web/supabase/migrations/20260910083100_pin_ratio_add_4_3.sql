-- especificacion-final-formato-detalle.md §4: la lista cerrada de ratios
-- son 7 valores (1:1, 4:3, 4:5, 3:4, 2:3, 9:16, 16:9) y el modelo de
-- columnas de §2 agrupa 4:3 junto a 1:1 (4 columnas de contenido). El
-- enum actual solo tenía 6 — faltaba 4:3.
--
-- ALTER TYPE ... ADD VALUE no puede usarse en la misma transacción en la
-- que además se USA el valor nuevo — aquí solo se añade, no se usa en
-- este mismo archivo, así que es seguro.

alter type pin_ratio add value '4:3';
