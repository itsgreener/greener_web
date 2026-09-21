-- Panel de recomendaciones de detalle (especificacion-final-formato-detalle.md
-- §1, §6): "aleatorias, igual que la home" — mismo scope='home', sin motor
-- de relacionados — pero el contenido que se está viendo no debe poder
-- recomendarse a sí mismo. La exclusión tiene que sobrevivir a todas las
-- rondas de la sesión (§8.5: cada ronda es determinista e inmutable una vez
-- generada), así que va en feed_session, no como parámetro suelto de la
-- petición — igual que scope, es parte de qué sesión es, no de qué lote se
-- pide.
--
-- filter_hash no sirve para esto: solo guarda el hash, nunca el valor
-- real, así que no hay forma de recuperar qué excluir al generar una
-- ronda nueva a partir de solo el sessionId. Se queda tal cual está,
-- exclude_content_id es un campo nuevo y propio, no una reutilización.

alter table feed_session
  add column exclude_content_id uuid references content (id) on delete set null;

comment on column feed_session.exclude_content_id is
  'Contenido a excluir del universo del feed en esta sesión (panel de recomendaciones de una página de detalle, que no debe recomendarse a sí misma). NULL en toda sesión de home/subhome normal.';
