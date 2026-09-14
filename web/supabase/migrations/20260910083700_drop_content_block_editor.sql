-- especificacion-final-formato-detalle.md §6: "El editor de bloques
-- genérico (content_block, 6 tipos) deja de usarse por completo. other
-- (antes page) usa el mismo modelo simple que tool/insight — sin tabla
-- de extensión, sin bloques." Caso y episodio tampoco lo usan ya: caso
-- tiene su propio carrusel (case_detail_media, migración anterior) y
-- episodio es un vídeo embebido único. No queda ningún tipo de contenido
-- que necesite content_block, así que se borra entero en vez de dejarlo
-- como código/tabla muertos.
--
-- Orden: funciones primero (dependen de las tablas), tablas después
-- (content_block_translation antes que content_block, por la FK), y el
-- enum al final.

drop function if exists public.create_content_block(uuid, content_block_type, integer, jsonb);
drop function if exists public.update_content_block(uuid, integer, jsonb);
drop function if exists public.delete_content_block(uuid);
drop function if exists public.upsert_content_block_translation(uuid, locale, text, text, text);
drop function if exists public.register_image_for_block(uuid, text, text, integer, integer, integer);
drop function if exists public.register_video_for_block(uuid, text, text, integer, integer, integer, integer);
drop function if exists public.unlink_and_delete_media_asset(uuid, uuid);

drop table if exists content_block_translation;
drop table if exists content_block;

drop type if exists content_block_type;
