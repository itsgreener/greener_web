-- 15 oct 2026: tipo de paquete HTML para las páginas satélite de `other`
-- (/variety/{slug}/app). En un fichero propio: Postgres no permite usar un
-- valor de enum recién añadido dentro de la misma transacción, y la
-- migración siguiente ya lo usa.

alter type html_package_kind add value if not exists 'variety';
