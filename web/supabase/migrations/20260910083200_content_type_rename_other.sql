-- especificacion-final-formato-detalle.md §1, §6: 'page' desaparece como
-- concepto propio y se renombra directamente a 'other' — sustituye por
-- completo a page como "cualquier cosa suelta". Hereda su 5% de cuota en
-- el feed sin tocar feed_config (la clave 'other' en el jsonb de ratios
-- ya se llamaba así desde el principio, arquitectura §7.5 / ADR-11).
--
-- RENAME VALUE conserva el oid interno del enum: todas las filas de
-- content.type que ya valían 'page' pasan a leer 'other' sin necesidad
-- de un UPDATE — no es un valor nuevo, es el mismo con otra etiqueta.

alter type content_type rename value 'page' to 'other';
