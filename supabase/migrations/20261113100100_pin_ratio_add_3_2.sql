-- 13 nov 2026: nueva proporción 3:2 para los pines (y, por ser el mismo enum
-- cerrado, para las portadas y el ratio del carrusel).
--
-- La lista cerrada pasa a 8 valores: 1:1, 4:3, 3:2, 4:5, 3:4, 2:3, 9:16 y
-- 16:9 (en Postgres el orden del enum es el de creación, así que el 3:2 queda
-- al final; el orden de la lista del código es independiente).
--
-- ALTER TYPE ... ADD VALUE no puede usarse en la misma transacción en la que
-- además se USA el valor nuevo, y por eso va en su propio fichero, sin nada
-- más: aquí solo se añade. Ejecutar después de 20261113100000 (o antes: no
-- dependen entre sí).

alter type pin_ratio add value if not exists '3:2';
