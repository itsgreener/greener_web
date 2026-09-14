-- Greener — dataset de demostración
-- Generado por scripts/generate-demo-data.mjs (seed determinista)
-- 50 casos, 9 episodios de Channel. Sin insights ni tools
-- (se suben manualmente). Imágenes: 6 assets reales de la cuenta demo de Cloudinary,
-- verificados por HTTP antes de usarlos, reutilizados entre pines (confirmado).

-- Etiquetas base (secciones home y channel)
insert into tag (id, section, name) values ('6519d450-91f7-4667-8c9a-9c5a1c247297', 'home', 'Agro') on conflict (section, name) do nothing;
insert into tag (id, section, name) values ('32a89ad6-793c-4655-97f7-2ea3d8b4d164', 'home', 'Food') on conflict (section, name) do nothing;
insert into tag (id, section, name) values ('fd36ff9f-2b83-417d-8658-979249f98426', 'home', 'Biotech') on conflict (section, name) do nothing;
insert into tag (id, section, name) values ('c4363255-8035-4fe3-bb7f-6adc02a2ebef', 'home', 'Brand') on conflict (section, name) do nothing;
insert into tag (id, section, name) values ('9f643b5d-10ef-47c3-9c3c-c1f0058621a1', 'home', 'Digital') on conflict (section, name) do nothing;
insert into tag (id, section, name) values ('83b3d519-156b-43fb-b90d-75fd00993ab5', 'home', 'Events') on conflict (section, name) do nothing;
insert into tag (id, section, name) values ('c3d8a99a-a671-4c89-a0f1-9b7c7bc2a8ae', 'channel', 'Brand the Future') on conflict (section, name) do nothing;
insert into tag (id, section, name) values ('b2ed5c33-f829-4f3f-8fd2-fb580437dbb0', 'channel', 'Brand into Europe') on conflict (section, name) do nothing;
insert into tag (id, section, name) values ('a7611db7-2c06-4a68-812b-ae6652666546', 'channel', 'Brand to Table') on conflict (section, name) do nothing;

-- Medios (6 assets reutilizados entre todos los pines)
insert into media_asset (id, kind, cloudinary_public_id, format, width, height, bytes, status) values ('64b502fa-f9c7-4af0-bdba-041ee861b1a0', 'image', 'sample', 'jpg', 1600, 1200, 250000, 'ready') on conflict (cloudinary_public_id) do nothing;
insert into media_asset (id, kind, cloudinary_public_id, format, width, height, bytes, status) values ('5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 'image', 'sheep', 'jpg', 1600, 1067, 250000, 'ready') on conflict (cloudinary_public_id) do nothing;
insert into media_asset (id, kind, cloudinary_public_id, format, width, height, bytes, status) values ('7be33f68-016e-421c-9ff6-0718a73526e5', 'image', 'kitten_fighting', 'jpg', 1600, 1067, 250000, 'ready') on conflict (cloudinary_public_id) do nothing;
insert into media_asset (id, kind, cloudinary_public_id, format, width, height, bytes, status) values ('93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 'image', 'pm/woman_car', 'jpg', 1600, 2000, 250000, 'ready') on conflict (cloudinary_public_id) do nothing;
insert into media_asset (id, kind, cloudinary_public_id, format, width, height, bytes, status) values ('8f968a4c-2552-4b3e-b055-d97f91defb36', 'image', 'pm/kitchen', 'jpg', 1600, 1067, 250000, 'ready') on conflict (cloudinary_public_id) do nothing;
insert into media_asset (id, kind, cloudinary_public_id, format, width, height, bytes, status) values ('d2e9dfac-e288-4316-9d2c-7e969a2d458c', 'image', 'ai/hiker', 'jpg', 1600, 2133, 250000, 'ready') on conflict (cloudinary_public_id) do nothing;

-- ============ CASOS ============
-- Cultiva Bio
insert into content (id, type, status, default_locale, slug, publish_at) values ('f98069cc-4163-4fb5-beaa-f5fe5504eeec', 'case', 'published', 'es', 'cultiva-bio-1', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('f98069cc-4163-4fb5-beaa-f5fe5504eeec', 'es', 'Cultiva Bio — Eventos', 'Cómo ayudamos a Cultiva Bio a destacar en eventos.', 'Trabajamos con Cultiva Bio en dirección de arte, señalética, audiovisual, dentro del sector de eventos, durante 2023.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('f98069cc-4163-4fb5-beaa-f5fe5504eeec', 1, 'Cultiva Bio') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('f98069cc-4163-4fb5-beaa-f5fe5504eeec', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('d03ba02d-dad5-4ef1-8b6f-e513b03483fe', 'f98069cc-4163-4fb5-beaa-f5fe5504eeec', '2:3', true, 'Cultiva Bio — pieza 1', 'es', 0, 'Imagen del caso Cultiva Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('d03ba02d-dad5-4ef1-8b6f-e513b03483fe', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('0a87047c-3c9b-4997-87c9-b094490b3a0b', 'f98069cc-4163-4fb5-beaa-f5fe5504eeec', '4:5', true, 'Cultiva Bio — pieza 2', 'es', 1, 'Imagen del caso Cultiva Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('0a87047c-3c9b-4997-87c9-b094490b3a0b', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('eba51241-2fc2-45b5-8887-96fc42de9fbc', 'f98069cc-4163-4fb5-beaa-f5fe5504eeec', '4:5', true, 'Cultiva Bio — pieza 3', 'es', 2, 'Imagen del caso Cultiva Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('eba51241-2fc2-45b5-8887-96fc42de9fbc', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('ec316811-daf4-4c1d-ae52-467a31aa3031', 'f98069cc-4163-4fb5-beaa-f5fe5504eeec', '9:16', true, 'Cultiva Bio — pieza 4', 'es', 3, 'Imagen del caso Cultiva Bio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('ec316811-daf4-4c1d-ae52-467a31aa3031', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('007eae95-58cb-48ff-b444-5fdd8feef50c', 'f98069cc-4163-4fb5-beaa-f5fe5504eeec', '16:9', true, 'Cultiva Bio — pieza 5', 'es', 4, 'Imagen del caso Cultiva Bio, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('007eae95-58cb-48ff-b444-5fdd8feef50c', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('f98069cc-4163-4fb5-beaa-f5fe5504eeec', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('f98069cc-4163-4fb5-beaa-f5fe5504eeec', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('f98069cc-4163-4fb5-beaa-f5fe5504eeec', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 2);

-- Campovía Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('ee1a997f-00de-401d-9536-474a5a654b98', 'case', 'published', 'es', 'campovia-foods-2', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('ee1a997f-00de-401d-9536-474a5a654b98', 'es', 'Campovía Foods — Alimentación', 'Cómo ayudamos a Campovía Foods a destacar en alimentación.', 'Trabajamos con Campovía Foods en identidad visual, fotografía de producto, dentro del sector de alimentación, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('ee1a997f-00de-401d-9536-474a5a654b98', 3, 'Campovía Foods') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('ee1a997f-00de-401d-9536-474a5a654b98', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('7bc6de27-3d38-445e-a451-e85025c3854c', 'ee1a997f-00de-401d-9536-474a5a654b98', '1:1', true, 'Campovía Foods — pieza 1', 'es', 0, 'Imagen del caso Campovía Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('7bc6de27-3d38-445e-a451-e85025c3854c', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('92c1443b-2169-4a0f-9fd4-ba47e5edd469', 'ee1a997f-00de-401d-9536-474a5a654b98', '1:1', true, 'Campovía Foods — pieza 2', 'es', 1, 'Imagen del caso Campovía Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('92c1443b-2169-4a0f-9fd4-ba47e5edd469', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('7313019f-e57c-45d0-af85-17caaeb54bfd', 'ee1a997f-00de-401d-9536-474a5a654b98', '2:3', true, 'Campovía Foods — pieza 3', 'es', 2, 'Imagen del caso Campovía Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('7313019f-e57c-45d0-af85-17caaeb54bfd', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('9dcd27b4-96af-4548-bb37-0c5abb7c3f65', 'ee1a997f-00de-401d-9536-474a5a654b98', '2:3', true, 'Campovía Foods — pieza 4', 'es', 3, 'Imagen del caso Campovía Foods, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('9dcd27b4-96af-4548-bb37-0c5abb7c3f65', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('de346ec7-d99e-48bc-88b4-d51145145176', 'ee1a997f-00de-401d-9536-474a5a654b98', '16:9', true, 'Campovía Foods — pieza 5', 'es', 4, 'Imagen del caso Campovía Foods, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('de346ec7-d99e-48bc-88b4-d51145145176', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('ee1a997f-00de-401d-9536-474a5a654b98', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('ee1a997f-00de-401d-9536-474a5a654b98', '8f968a4c-2552-4b3e-b055-d97f91defb36', 1);

-- Olivara Studio
insert into content (id, type, status, default_locale, slug, publish_at) values ('0d7e4f64-e5e7-4a14-8d83-3a0458f69f75', 'case', 'published', 'es', 'olivara-studio-3', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('0d7e4f64-e5e7-4a14-8d83-3a0458f69f75', 'es', 'Olivara Studio — Agroalimentario', 'Cómo ayudamos a Olivara Studio a destacar en agroalimentario.', 'Trabajamos con Olivara Studio en branding, packaging, comunicación de campaña, dentro del sector de agroalimentario, durante 2023.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('0d7e4f64-e5e7-4a14-8d83-3a0458f69f75', 1, 'Olivara Studio') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('0d7e4f64-e5e7-4a14-8d83-3a0458f69f75', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('17e1382e-b6db-4787-91d1-864acc8585ad', '0d7e4f64-e5e7-4a14-8d83-3a0458f69f75', '1:1', true, 'Olivara Studio — pieza 1', 'es', 0, 'Imagen del caso Olivara Studio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('17e1382e-b6db-4787-91d1-864acc8585ad', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('cc1d215f-7fa8-4659-ba7f-bec330c0ec24', '0d7e4f64-e5e7-4a14-8d83-3a0458f69f75', '1:1', true, 'Olivara Studio — pieza 2', 'es', 1, 'Imagen del caso Olivara Studio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('cc1d215f-7fa8-4659-ba7f-bec330c0ec24', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('26bbee2a-e683-45d7-bd60-b857fc1ddd6a', '0d7e4f64-e5e7-4a14-8d83-3a0458f69f75', '3:4', true, 'Olivara Studio — pieza 3', 'es', 2, 'Imagen del caso Olivara Studio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('26bbee2a-e683-45d7-bd60-b857fc1ddd6a', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('09361e2f-f8cf-435e-8da0-88068cd84e0b', '0d7e4f64-e5e7-4a14-8d83-3a0458f69f75', '1:1', true, 'Olivara Studio — pieza 4', 'es', 3, 'Imagen del caso Olivara Studio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('09361e2f-f8cf-435e-8da0-88068cd84e0b', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('b5579634-7e9c-475b-a5c9-eb04e2d9f94e', '0d7e4f64-e5e7-4a14-8d83-3a0458f69f75', '16:9', true, 'Olivara Studio — pieza 5', 'es', 4, 'Imagen del caso Olivara Studio, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('b5579634-7e9c-475b-a5c9-eb04e2d9f94e', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('eef6cd22-83b4-449d-bd18-418a005b8ab6', '0d7e4f64-e5e7-4a14-8d83-3a0458f69f75', '4:5', true, 'Olivara Studio — pieza 6', 'es', 5, 'Imagen del caso Olivara Studio, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('eef6cd22-83b4-449d-bd18-418a005b8ab6', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('0d7e4f64-e5e7-4a14-8d83-3a0458f69f75', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('0d7e4f64-e5e7-4a14-8d83-3a0458f69f75', '8f968a4c-2552-4b3e-b055-d97f91defb36', 1);

-- Nutrivo Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('8d5c2b0d-f1b7-40a2-99dc-234cde3cf45f', 'case', 'published', 'es', 'nutrivo-group-4', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('8d5c2b0d-f1b7-40a2-99dc-234cde3cf45f', 'es', 'Nutrivo Group — Biotecnología', 'Cómo ayudamos a Nutrivo Group a destacar en biotecnología.', 'Trabajamos con Nutrivo Group en naming, branding corporativo, informe anual, dentro del sector de biotecnología, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('8d5c2b0d-f1b7-40a2-99dc-234cde3cf45f', 4, 'Nutrivo Group') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('8d5c2b0d-f1b7-40a2-99dc-234cde3cf45f', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('426750f5-01ff-4aa7-83b2-d4b21ad3dd7b', '8d5c2b0d-f1b7-40a2-99dc-234cde3cf45f', '9:16', true, 'Nutrivo Group — pieza 1', 'es', 0, 'Imagen del caso Nutrivo Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('426750f5-01ff-4aa7-83b2-d4b21ad3dd7b', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('af017eea-520a-426c-a25a-272e3cee2535', '8d5c2b0d-f1b7-40a2-99dc-234cde3cf45f', '9:16', true, 'Nutrivo Group — pieza 2', 'es', 1, 'Imagen del caso Nutrivo Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('af017eea-520a-426c-a25a-272e3cee2535', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('71493518-9cc8-4c66-8eb0-4b4046dafc16', '8d5c2b0d-f1b7-40a2-99dc-234cde3cf45f', '3:4', true, 'Nutrivo Group — pieza 3', 'es', 2, 'Imagen del caso Nutrivo Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('71493518-9cc8-4c66-8eb0-4b4046dafc16', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('33c699ec-b0bb-4d66-b2e2-f8225c47ce91', '8d5c2b0d-f1b7-40a2-99dc-234cde3cf45f', '9:16', true, 'Nutrivo Group — pieza 4', 'es', 3, 'Imagen del caso Nutrivo Group, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('33c699ec-b0bb-4d66-b2e2-f8225c47ce91', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('e328c57a-cb67-401d-ac5f-e628899dbbda', '8d5c2b0d-f1b7-40a2-99dc-234cde3cf45f', '1:1', true, 'Nutrivo Group — pieza 5', 'es', 4, 'Imagen del caso Nutrivo Group, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('e328c57a-cb67-401d-ac5f-e628899dbbda', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('8d5c2b0d-f1b7-40a2-99dc-234cde3cf45f', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('8d5c2b0d-f1b7-40a2-99dc-234cde3cf45f', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 1);

-- Terraval Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('cd3316c5-5759-45c6-94cb-a35e649c9a68', 'case', 'published', 'es', 'terraval-foods-5', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('cd3316c5-5759-45c6-94cb-a35e649c9a68', 'es', 'Terraval Foods — Digital', 'Cómo ayudamos a Terraval Foods a destacar en digital.', 'Trabajamos con Terraval Foods en diseño digital, desarrollo web, dentro del sector de digital, durante 2024.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('cd3316c5-5759-45c6-94cb-a35e649c9a68', 5, 'Terraval Foods') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('cd3316c5-5759-45c6-94cb-a35e649c9a68', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('56f381db-05e4-4aff-a304-78feb0f266d0', 'cd3316c5-5759-45c6-94cb-a35e649c9a68', '9:16', true, 'Terraval Foods — pieza 1', 'es', 0, 'Imagen del caso Terraval Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('56f381db-05e4-4aff-a304-78feb0f266d0', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('d090298a-cb87-4852-b84a-b7e457dfa991', 'cd3316c5-5759-45c6-94cb-a35e649c9a68', '3:4', true, 'Terraval Foods — pieza 2', 'es', 1, 'Imagen del caso Terraval Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('d090298a-cb87-4852-b84a-b7e457dfa991', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('bd732d5b-0502-4b4f-8305-fd4a0e87aa71', 'cd3316c5-5759-45c6-94cb-a35e649c9a68', '4:5', true, 'Terraval Foods — pieza 3', 'es', 2, 'Imagen del caso Terraval Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('bd732d5b-0502-4b4f-8305-fd4a0e87aa71', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('cd3316c5-5759-45c6-94cb-a35e649c9a68', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('cd3316c5-5759-45c6-94cb-a35e649c9a68', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 1);

-- Vivara Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('aaf68033-d64e-4e15-9ba1-45597c5ef099', 'case', 'published', 'es', 'vivara-group-6', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('aaf68033-d64e-4e15-9ba1-45597c5ef099', 'es', 'Vivara Group — Agroalimentario', 'Cómo ayudamos a Vivara Group a destacar en agroalimentario.', 'Trabajamos con Vivara Group en branding, packaging, comunicación de campaña, dentro del sector de agroalimentario, durante 2022.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('aaf68033-d64e-4e15-9ba1-45597c5ef099', 1, 'Vivara Group') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('aaf68033-d64e-4e15-9ba1-45597c5ef099', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('3cc2d44a-0d51-47b8-92cb-4617e7f04c7f', 'aaf68033-d64e-4e15-9ba1-45597c5ef099', '16:9', true, 'Vivara Group — pieza 1', 'es', 0, 'Imagen del caso Vivara Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('3cc2d44a-0d51-47b8-92cb-4617e7f04c7f', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('6a736ce8-2ea5-419e-954c-16bf496b5217', 'aaf68033-d64e-4e15-9ba1-45597c5ef099', '3:4', true, 'Vivara Group — pieza 2', 'es', 1, 'Imagen del caso Vivara Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('6a736ce8-2ea5-419e-954c-16bf496b5217', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('96d8f5e6-bada-4afb-87d8-e694430ade24', 'aaf68033-d64e-4e15-9ba1-45597c5ef099', '16:9', true, 'Vivara Group — pieza 3', 'es', 2, 'Imagen del caso Vivara Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('96d8f5e6-bada-4afb-87d8-e694430ade24', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('f62c09b4-9620-46d4-b202-6868e00a382e', 'aaf68033-d64e-4e15-9ba1-45597c5ef099', '3:4', true, 'Vivara Group — pieza 4', 'es', 3, 'Imagen del caso Vivara Group, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('f62c09b4-9620-46d4-b202-6868e00a382e', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('87547dd6-542b-499a-8b83-1ce194333800', 'aaf68033-d64e-4e15-9ba1-45597c5ef099', '16:9', true, 'Vivara Group — pieza 5', 'es', 4, 'Imagen del caso Vivara Group, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('87547dd6-542b-499a-8b83-1ce194333800', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('aaf68033-d64e-4e15-9ba1-45597c5ef099', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('aaf68033-d64e-4e15-9ba1-45597c5ef099', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('aaf68033-d64e-4e15-9ba1-45597c5ef099', '8f968a4c-2552-4b3e-b055-d97f91defb36', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('aaf68033-d64e-4e15-9ba1-45597c5ef099', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 3);

-- Campovía Farms
insert into content (id, type, status, default_locale, slug, publish_at) values ('446f9aba-c81f-4134-9a75-6d04c1483401', 'case', 'published', 'es', 'campovia-farms-7', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('446f9aba-c81f-4134-9a75-6d04c1483401', 'es', 'Campovía Farms — Alimentación', 'Cómo ayudamos a Campovía Farms a destacar en alimentación.', 'Trabajamos con Campovía Farms en identidad visual, fotografía de producto, dentro del sector de alimentación, durante 2022.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('446f9aba-c81f-4134-9a75-6d04c1483401', 1, 'Campovía Farms') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('446f9aba-c81f-4134-9a75-6d04c1483401', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('7fe8ded3-40a2-4b3c-9b5d-0816148e5384', '446f9aba-c81f-4134-9a75-6d04c1483401', '3:4', true, 'Campovía Farms — pieza 1', 'es', 0, 'Imagen del caso Campovía Farms, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('7fe8ded3-40a2-4b3c-9b5d-0816148e5384', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('1f53fee7-68ec-4649-8a27-e6b9a268cf52', '446f9aba-c81f-4134-9a75-6d04c1483401', '3:4', true, 'Campovía Farms — pieza 2', 'es', 1, 'Imagen del caso Campovía Farms, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('1f53fee7-68ec-4649-8a27-e6b9a268cf52', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('fe2d109c-3af5-420a-bede-b0a0b9e87729', '446f9aba-c81f-4134-9a75-6d04c1483401', '2:3', true, 'Campovía Farms — pieza 3', 'es', 2, 'Imagen del caso Campovía Farms, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('fe2d109c-3af5-420a-bede-b0a0b9e87729', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('446f9aba-c81f-4134-9a75-6d04c1483401', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('446f9aba-c81f-4134-9a75-6d04c1483401', '8f968a4c-2552-4b3e-b055-d97f91defb36', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('446f9aba-c81f-4134-9a75-6d04c1483401', '7be33f68-016e-421c-9ff6-0718a73526e5', 2);

-- Norda Co.
insert into content (id, type, status, default_locale, slug, publish_at) values ('59cd5fc9-c5a7-4b99-8fd3-847f2314d16f', 'case', 'published', 'es', 'norda-co-8', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('59cd5fc9-c5a7-4b99-8fd3-847f2314d16f', 'es', 'Norda Co. — Branding y marca', 'Cómo ayudamos a Norda Co. a destacar en branding y marca.', 'Trabajamos con Norda Co. en estrategia de marca, identidad visual, dentro del sector de branding y marca, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('59cd5fc9-c5a7-4b99-8fd3-847f2314d16f', 1, 'Norda Co.') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('59cd5fc9-c5a7-4b99-8fd3-847f2314d16f', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('2e480b53-b0fc-46de-b08b-4e83ffccd735', '59cd5fc9-c5a7-4b99-8fd3-847f2314d16f', '16:9', true, 'Norda Co. — pieza 1', 'es', 0, 'Imagen del caso Norda Co., pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('2e480b53-b0fc-46de-b08b-4e83ffccd735', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('bb5684f3-956a-4a70-b4d5-4aa1fa7d45dd', '59cd5fc9-c5a7-4b99-8fd3-847f2314d16f', '2:3', true, 'Norda Co. — pieza 2', 'es', 1, 'Imagen del caso Norda Co., pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('bb5684f3-956a-4a70-b4d5-4aa1fa7d45dd', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('94f4ab92-617e-4e5b-aaf3-0b63a63122e5', '59cd5fc9-c5a7-4b99-8fd3-847f2314d16f', '3:4', true, 'Norda Co. — pieza 3', 'es', 2, 'Imagen del caso Norda Co., pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('94f4ab92-617e-4e5b-aaf3-0b63a63122e5', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('41e5b472-4a13-42b8-8890-e6f77e222654', '59cd5fc9-c5a7-4b99-8fd3-847f2314d16f', '1:1', true, 'Norda Co. — pieza 4', 'es', 3, 'Imagen del caso Norda Co., pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('41e5b472-4a13-42b8-8890-e6f77e222654', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('b7647019-4ae3-425b-93d7-ad2c91dc6dad', '59cd5fc9-c5a7-4b99-8fd3-847f2314d16f', '3:4', true, 'Norda Co. — pieza 5', 'es', 4, 'Imagen del caso Norda Co., pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('b7647019-4ae3-425b-93d7-ad2c91dc6dad', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('59cd5fc9-c5a7-4b99-8fd3-847f2314d16f', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('59cd5fc9-c5a7-4b99-8fd3-847f2314d16f', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('59cd5fc9-c5a7-4b99-8fd3-847f2314d16f', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('59cd5fc9-c5a7-4b99-8fd3-847f2314d16f', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 3);

-- Fontal Bio
insert into content (id, type, status, default_locale, slug, publish_at) values ('f0ba3428-5e57-4e6e-aac6-0608eae14ebd', 'case', 'published', 'es', 'fontal-bio-9', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('f0ba3428-5e57-4e6e-aac6-0608eae14ebd', 'es', 'Fontal Bio — Biotecnología', 'Cómo ayudamos a Fontal Bio a destacar en biotecnología.', 'Trabajamos con Fontal Bio en naming, branding corporativo, informe anual, dentro del sector de biotecnología, durante 2024.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('f0ba3428-5e57-4e6e-aac6-0608eae14ebd', 2, 'Fontal Bio') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('f0ba3428-5e57-4e6e-aac6-0608eae14ebd', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('f2599306-5d66-45ab-8a89-70ec4e054144', 'f0ba3428-5e57-4e6e-aac6-0608eae14ebd', '1:1', true, 'Fontal Bio — pieza 1', 'es', 0, 'Imagen del caso Fontal Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('f2599306-5d66-45ab-8a89-70ec4e054144', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('376ea8bf-e8c5-4fd9-94fd-73600b692325', 'f0ba3428-5e57-4e6e-aac6-0608eae14ebd', '3:4', true, 'Fontal Bio — pieza 2', 'es', 1, 'Imagen del caso Fontal Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('376ea8bf-e8c5-4fd9-94fd-73600b692325', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('be8756e9-3801-4122-a54a-774b1c69c381', 'f0ba3428-5e57-4e6e-aac6-0608eae14ebd', '2:3', true, 'Fontal Bio — pieza 3', 'es', 2, 'Imagen del caso Fontal Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('be8756e9-3801-4122-a54a-774b1c69c381', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('941b5f06-bfd0-4824-a3e9-4fe49ef7ff16', 'f0ba3428-5e57-4e6e-aac6-0608eae14ebd', '2:3', true, 'Fontal Bio — pieza 4', 'es', 3, 'Imagen del caso Fontal Bio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('941b5f06-bfd0-4824-a3e9-4fe49ef7ff16', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('b8c75f27-ace8-4ad3-84ea-9995dfc4dea2', 'f0ba3428-5e57-4e6e-aac6-0608eae14ebd', '1:1', true, 'Fontal Bio — pieza 5', 'es', 4, 'Imagen del caso Fontal Bio, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('b8c75f27-ace8-4ad3-84ea-9995dfc4dea2', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('f0ba3428-5e57-4e6e-aac6-0608eae14ebd', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('f0ba3428-5e57-4e6e-aac6-0608eae14ebd', '7be33f68-016e-421c-9ff6-0718a73526e5', 1);

-- Raizen Studio
insert into content (id, type, status, default_locale, slug, publish_at) values ('0f86083b-f7f6-48a2-accf-461ca80c8449', 'case', 'published', 'es', 'raizen-studio-10', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('0f86083b-f7f6-48a2-accf-461ca80c8449', 'es', 'Raizen Studio — Biotecnología', 'Cómo ayudamos a Raizen Studio a destacar en biotecnología.', 'Trabajamos con Raizen Studio en naming, branding corporativo, informe anual, dentro del sector de biotecnología, durante 2024.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('0f86083b-f7f6-48a2-accf-461ca80c8449', 1, 'Raizen Studio') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('0f86083b-f7f6-48a2-accf-461ca80c8449', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('75b24f78-f9b9-4772-b89c-92e3ce3b9ad3', '0f86083b-f7f6-48a2-accf-461ca80c8449', '3:4', true, 'Raizen Studio — pieza 1', 'es', 0, 'Imagen del caso Raizen Studio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('75b24f78-f9b9-4772-b89c-92e3ce3b9ad3', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('2b449b57-f38e-4894-b88f-20adeda7db3e', '0f86083b-f7f6-48a2-accf-461ca80c8449', '9:16', true, 'Raizen Studio — pieza 2', 'es', 1, 'Imagen del caso Raizen Studio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('2b449b57-f38e-4894-b88f-20adeda7db3e', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('1ce0e69c-5e51-447d-96e9-3810ed61d7a0', '0f86083b-f7f6-48a2-accf-461ca80c8449', '16:9', true, 'Raizen Studio — pieza 3', 'es', 2, 'Imagen del caso Raizen Studio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('1ce0e69c-5e51-447d-96e9-3810ed61d7a0', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('2a7ca545-604f-42e2-a1f0-35b0e342ff0d', '0f86083b-f7f6-48a2-accf-461ca80c8449', '1:1', true, 'Raizen Studio — pieza 4', 'es', 3, 'Imagen del caso Raizen Studio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('2a7ca545-604f-42e2-a1f0-35b0e342ff0d', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('bb26b2c6-3778-430a-9124-f676c4457070', '0f86083b-f7f6-48a2-accf-461ca80c8449', '4:5', true, 'Raizen Studio — pieza 5', 'es', 4, 'Imagen del caso Raizen Studio, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('bb26b2c6-3778-430a-9124-f676c4457070', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('d005be27-0838-4907-9eeb-ca07defdc6d7', '0f86083b-f7f6-48a2-accf-461ca80c8449', '4:5', true, 'Raizen Studio — pieza 6', 'es', 5, 'Imagen del caso Raizen Studio, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('d005be27-0838-4907-9eeb-ca07defdc6d7', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('0f86083b-f7f6-48a2-accf-461ca80c8449', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('0f86083b-f7f6-48a2-accf-461ca80c8449', '7be33f68-016e-421c-9ff6-0718a73526e5', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('0f86083b-f7f6-48a2-accf-461ca80c8449', '7be33f68-016e-421c-9ff6-0718a73526e5', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('0f86083b-f7f6-48a2-accf-461ca80c8449', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 3);

-- Fontal
insert into content (id, type, status, default_locale, slug, publish_at) values ('18d68436-aed0-4b61-8807-6014b6646c0b', 'case', 'published', 'es', 'fontal-11', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('18d68436-aed0-4b61-8807-6014b6646c0b', 'es', 'Fontal — Digital', 'Cómo ayudamos a Fontal a destacar en digital.', 'Trabajamos con Fontal en diseño digital, desarrollo web, dentro del sector de digital, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('18d68436-aed0-4b61-8807-6014b6646c0b', 3, 'Fontal') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('18d68436-aed0-4b61-8807-6014b6646c0b', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('54e6ee44-d845-4daa-b2d4-e0aadef1fb79', '18d68436-aed0-4b61-8807-6014b6646c0b', '1:1', true, 'Fontal — pieza 1', 'es', 0, 'Imagen del caso Fontal, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('54e6ee44-d845-4daa-b2d4-e0aadef1fb79', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('4f1809c2-f043-4d6d-9a10-a2fba889e06b', '18d68436-aed0-4b61-8807-6014b6646c0b', '3:4', true, 'Fontal — pieza 2', 'es', 1, 'Imagen del caso Fontal, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('4f1809c2-f043-4d6d-9a10-a2fba889e06b', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('6fa32670-c2cb-4349-9a41-e65a84ea9f44', '18d68436-aed0-4b61-8807-6014b6646c0b', '4:5', true, 'Fontal — pieza 3', 'es', 2, 'Imagen del caso Fontal, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('6fa32670-c2cb-4349-9a41-e65a84ea9f44', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('37600a40-6a3e-4eec-bf39-d5a6016d9cda', '18d68436-aed0-4b61-8807-6014b6646c0b', '4:5', true, 'Fontal — pieza 4', 'es', 3, 'Imagen del caso Fontal, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('37600a40-6a3e-4eec-bf39-d5a6016d9cda', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('e55344f8-5d24-45f2-a337-52b0ba5a6212', '18d68436-aed0-4b61-8807-6014b6646c0b', '2:3', true, 'Fontal — pieza 5', 'es', 4, 'Imagen del caso Fontal, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('e55344f8-5d24-45f2-a337-52b0ba5a6212', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('b7e86696-4de7-4b19-98b2-c82e3f1e9ccc', '18d68436-aed0-4b61-8807-6014b6646c0b', '16:9', true, 'Fontal — pieza 6', 'es', 5, 'Imagen del caso Fontal, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('b7e86696-4de7-4b19-98b2-c82e3f1e9ccc', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('18d68436-aed0-4b61-8807-6014b6646c0b', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('18d68436-aed0-4b61-8807-6014b6646c0b', '8f968a4c-2552-4b3e-b055-d97f91defb36', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('18d68436-aed0-4b61-8807-6014b6646c0b', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 2);

-- Grania
insert into content (id, type, status, default_locale, slug, publish_at) values ('84713acb-a22d-4b03-b2ed-43fdb177f871', 'case', 'published', 'es', 'grania-12', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('84713acb-a22d-4b03-b2ed-43fdb177f871', 'es', 'Grania — Digital', 'Cómo ayudamos a Grania a destacar en digital.', 'Trabajamos con Grania en diseño digital, desarrollo web, dentro del sector de digital, durante 2025.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('84713acb-a22d-4b03-b2ed-43fdb177f871', 1, 'Grania') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('84713acb-a22d-4b03-b2ed-43fdb177f871', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('f33797b0-b31a-41c9-ae6c-08824810a583', '84713acb-a22d-4b03-b2ed-43fdb177f871', '3:4', true, 'Grania — pieza 1', 'es', 0, 'Imagen del caso Grania, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('f33797b0-b31a-41c9-ae6c-08824810a583', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('f508e838-bb28-4abc-bbe9-ae1216834ffc', '84713acb-a22d-4b03-b2ed-43fdb177f871', '1:1', true, 'Grania — pieza 2', 'es', 1, 'Imagen del caso Grania, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('f508e838-bb28-4abc-bbe9-ae1216834ffc', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('be83c8e0-defe-422f-a06d-f5bb16a8a1ec', '84713acb-a22d-4b03-b2ed-43fdb177f871', '16:9', true, 'Grania — pieza 3', 'es', 2, 'Imagen del caso Grania, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('be83c8e0-defe-422f-a06d-f5bb16a8a1ec', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('84713acb-a22d-4b03-b2ed-43fdb177f871', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('84713acb-a22d-4b03-b2ed-43fdb177f871', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('84713acb-a22d-4b03-b2ed-43fdb177f871', '7be33f68-016e-421c-9ff6-0718a73526e5', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('84713acb-a22d-4b03-b2ed-43fdb177f871', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 3);

-- Vertia Co.
insert into content (id, type, status, default_locale, slug, publish_at) values ('6e4f71e8-6a66-4cd9-ba19-bc7581163036', 'case', 'published', 'es', 'vertia-co-13', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('6e4f71e8-6a66-4cd9-ba19-bc7581163036', 'es', 'Vertia Co. — Eventos', 'Cómo ayudamos a Vertia Co. a destacar en eventos.', 'Trabajamos con Vertia Co. en dirección de arte, señalética, audiovisual, dentro del sector de eventos, durante 2025.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('6e4f71e8-6a66-4cd9-ba19-bc7581163036', 1, 'Vertia Co.') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('6e4f71e8-6a66-4cd9-ba19-bc7581163036', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('fb1df287-6dbf-4042-98cc-dabed18ec631', '6e4f71e8-6a66-4cd9-ba19-bc7581163036', '1:1', true, 'Vertia Co. — pieza 1', 'es', 0, 'Imagen del caso Vertia Co., pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('fb1df287-6dbf-4042-98cc-dabed18ec631', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('eb717937-aa79-4cc5-9ae4-f674b079101e', '6e4f71e8-6a66-4cd9-ba19-bc7581163036', '16:9', true, 'Vertia Co. — pieza 2', 'es', 1, 'Imagen del caso Vertia Co., pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('eb717937-aa79-4cc5-9ae4-f674b079101e', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('1a6ccf8b-07cc-49c0-92d6-47b932054ea3', '6e4f71e8-6a66-4cd9-ba19-bc7581163036', '4:5', true, 'Vertia Co. — pieza 3', 'es', 2, 'Imagen del caso Vertia Co., pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('1a6ccf8b-07cc-49c0-92d6-47b932054ea3', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('5a66afb3-2c8e-44c0-a32d-70223bc7a458', '6e4f71e8-6a66-4cd9-ba19-bc7581163036', '4:5', true, 'Vertia Co. — pieza 4', 'es', 3, 'Imagen del caso Vertia Co., pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('5a66afb3-2c8e-44c0-a32d-70223bc7a458', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('8edc996c-d4e7-4536-843c-ad1c3f27bbc7', '6e4f71e8-6a66-4cd9-ba19-bc7581163036', '4:5', true, 'Vertia Co. — pieza 5', 'es', 4, 'Imagen del caso Vertia Co., pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('8edc996c-d4e7-4536-843c-ad1c3f27bbc7', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('6e4f71e8-6a66-4cd9-ba19-bc7581163036', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('6e4f71e8-6a66-4cd9-ba19-bc7581163036', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 1);

-- Brotia Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('b5bd7e2c-bb0b-4221-b701-1c96dcd2cb63', 'case', 'published', 'es', 'brotia-foods-14', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('b5bd7e2c-bb0b-4221-b701-1c96dcd2cb63', 'es', 'Brotia Foods — Biotecnología', 'Cómo ayudamos a Brotia Foods a destacar en biotecnología.', 'Trabajamos con Brotia Foods en naming, branding corporativo, informe anual, dentro del sector de biotecnología, durante 2024.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('b5bd7e2c-bb0b-4221-b701-1c96dcd2cb63', 1, 'Brotia Foods') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('b5bd7e2c-bb0b-4221-b701-1c96dcd2cb63', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('0a537676-9e5f-4373-9c9d-4eb47fd24a8e', 'b5bd7e2c-bb0b-4221-b701-1c96dcd2cb63', '2:3', true, 'Brotia Foods — pieza 1', 'es', 0, 'Imagen del caso Brotia Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('0a537676-9e5f-4373-9c9d-4eb47fd24a8e', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('3af4eb9b-d72f-443c-b7f2-266f2acccc87', 'b5bd7e2c-bb0b-4221-b701-1c96dcd2cb63', '16:9', true, 'Brotia Foods — pieza 2', 'es', 1, 'Imagen del caso Brotia Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('3af4eb9b-d72f-443c-b7f2-266f2acccc87', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('a7357270-bb29-4002-86e5-8a4d87217246', 'b5bd7e2c-bb0b-4221-b701-1c96dcd2cb63', '9:16', true, 'Brotia Foods — pieza 3', 'es', 2, 'Imagen del caso Brotia Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('a7357270-bb29-4002-86e5-8a4d87217246', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('94a7b40d-3914-40df-ab4f-6258c31e5fc1', 'b5bd7e2c-bb0b-4221-b701-1c96dcd2cb63', '16:9', true, 'Brotia Foods — pieza 4', 'es', 3, 'Imagen del caso Brotia Foods, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('94a7b40d-3914-40df-ab4f-6258c31e5fc1', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('b5bd7e2c-bb0b-4221-b701-1c96dcd2cb63', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('b5bd7e2c-bb0b-4221-b701-1c96dcd2cb63', '7be33f68-016e-421c-9ff6-0718a73526e5', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('b5bd7e2c-bb0b-4221-b701-1c96dcd2cb63', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('b5bd7e2c-bb0b-4221-b701-1c96dcd2cb63', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 3);

-- Nutrivo
insert into content (id, type, status, default_locale, slug, publish_at) values ('7bbbd997-f4ea-4c49-8b72-6e7e8de27a27', 'case', 'published', 'es', 'nutrivo-15', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('7bbbd997-f4ea-4c49-8b72-6e7e8de27a27', 'es', 'Nutrivo — Biotecnología', 'Cómo ayudamos a Nutrivo a destacar en biotecnología.', 'Trabajamos con Nutrivo en naming, branding corporativo, informe anual, dentro del sector de biotecnología, durante 2024.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('7bbbd997-f4ea-4c49-8b72-6e7e8de27a27', 1, 'Nutrivo') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('7bbbd997-f4ea-4c49-8b72-6e7e8de27a27', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('b8f9c476-8d23-45c1-b547-ea8c80c8bb43', '7bbbd997-f4ea-4c49-8b72-6e7e8de27a27', '9:16', true, 'Nutrivo — pieza 1', 'es', 0, 'Imagen del caso Nutrivo, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('b8f9c476-8d23-45c1-b547-ea8c80c8bb43', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('70c17ea2-56e0-4aca-a3e4-ffdc9b16a3c7', '7bbbd997-f4ea-4c49-8b72-6e7e8de27a27', '16:9', true, 'Nutrivo — pieza 2', 'es', 1, 'Imagen del caso Nutrivo, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('70c17ea2-56e0-4aca-a3e4-ffdc9b16a3c7', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('b6a8b855-383f-4720-a310-48fa1fc83e21', '7bbbd997-f4ea-4c49-8b72-6e7e8de27a27', '4:5', true, 'Nutrivo — pieza 3', 'es', 2, 'Imagen del caso Nutrivo, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('b6a8b855-383f-4720-a310-48fa1fc83e21', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('dbbd1da0-da1b-4019-bc8a-f71cf0b86b63', '7bbbd997-f4ea-4c49-8b72-6e7e8de27a27', '9:16', true, 'Nutrivo — pieza 4', 'es', 3, 'Imagen del caso Nutrivo, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('dbbd1da0-da1b-4019-bc8a-f71cf0b86b63', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('6a73d366-1b9d-4d1d-8aa5-671618e70ab1', '7bbbd997-f4ea-4c49-8b72-6e7e8de27a27', '16:9', true, 'Nutrivo — pieza 5', 'es', 4, 'Imagen del caso Nutrivo, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('6a73d366-1b9d-4d1d-8aa5-671618e70ab1', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('7bbbd997-f4ea-4c49-8b72-6e7e8de27a27', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('7bbbd997-f4ea-4c49-8b72-6e7e8de27a27', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 1);

-- Campovía Labs
insert into content (id, type, status, default_locale, slug, publish_at) values ('4b2b44a2-0326-43d1-a570-daafd2f0388b', 'case', 'published', 'es', 'campovia-labs-16', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('4b2b44a2-0326-43d1-a570-daafd2f0388b', 'es', 'Campovía Labs — Agroalimentario', 'Cómo ayudamos a Campovía Labs a destacar en agroalimentario.', 'Trabajamos con Campovía Labs en branding, packaging, comunicación de campaña, dentro del sector de agroalimentario, durante 2022.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('4b2b44a2-0326-43d1-a570-daafd2f0388b', 2, 'Campovía Labs') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('4b2b44a2-0326-43d1-a570-daafd2f0388b', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('0f92997d-4f46-4345-982d-8e3a5b2ccd52', '4b2b44a2-0326-43d1-a570-daafd2f0388b', '1:1', true, 'Campovía Labs — pieza 1', 'es', 0, 'Imagen del caso Campovía Labs, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('0f92997d-4f46-4345-982d-8e3a5b2ccd52', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('73170849-1b1e-449e-95f8-e5334fba40fa', '4b2b44a2-0326-43d1-a570-daafd2f0388b', '1:1', true, 'Campovía Labs — pieza 2', 'es', 1, 'Imagen del caso Campovía Labs, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('73170849-1b1e-449e-95f8-e5334fba40fa', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('1964e839-0a55-4956-a145-5a3a76c0283d', '4b2b44a2-0326-43d1-a570-daafd2f0388b', '9:16', true, 'Campovía Labs — pieza 3', 'es', 2, 'Imagen del caso Campovía Labs, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('1964e839-0a55-4956-a145-5a3a76c0283d', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('4b2b44a2-0326-43d1-a570-daafd2f0388b', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('4b2b44a2-0326-43d1-a570-daafd2f0388b', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('4b2b44a2-0326-43d1-a570-daafd2f0388b', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 2);

-- Grania Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('7383efcf-c946-442b-b94d-f1a51ffda5cc', 'case', 'published', 'es', 'grania-foods-17', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('7383efcf-c946-442b-b94d-f1a51ffda5cc', 'es', 'Grania Foods — Biotecnología', 'Cómo ayudamos a Grania Foods a destacar en biotecnología.', 'Trabajamos con Grania Foods en naming, branding corporativo, informe anual, dentro del sector de biotecnología, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('7383efcf-c946-442b-b94d-f1a51ffda5cc', 2, 'Grania Foods') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('7383efcf-c946-442b-b94d-f1a51ffda5cc', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('a01128c5-7607-41cd-980a-b390b0413b35', '7383efcf-c946-442b-b94d-f1a51ffda5cc', '4:5', true, 'Grania Foods — pieza 1', 'es', 0, 'Imagen del caso Grania Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('a01128c5-7607-41cd-980a-b390b0413b35', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('68dd020f-fb3f-41eb-90bb-f8cbd7456e59', '7383efcf-c946-442b-b94d-f1a51ffda5cc', '2:3', true, 'Grania Foods — pieza 2', 'es', 1, 'Imagen del caso Grania Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('68dd020f-fb3f-41eb-90bb-f8cbd7456e59', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('b40e142d-462c-4c91-bd98-4bfe311641a8', '7383efcf-c946-442b-b94d-f1a51ffda5cc', '2:3', true, 'Grania Foods — pieza 3', 'es', 2, 'Imagen del caso Grania Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('b40e142d-462c-4c91-bd98-4bfe311641a8', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('f9a646c6-d575-41ea-b7b5-70437fead9d0', '7383efcf-c946-442b-b94d-f1a51ffda5cc', '3:4', true, 'Grania Foods — pieza 4', 'es', 3, 'Imagen del caso Grania Foods, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('f9a646c6-d575-41ea-b7b5-70437fead9d0', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('f6db6058-e042-4012-9670-743b990d1713', '7383efcf-c946-442b-b94d-f1a51ffda5cc', '2:3', true, 'Grania Foods — pieza 5', 'es', 4, 'Imagen del caso Grania Foods, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('f6db6058-e042-4012-9670-743b990d1713', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('7383efcf-c946-442b-b94d-f1a51ffda5cc', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('7383efcf-c946-442b-b94d-f1a51ffda5cc', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('7383efcf-c946-442b-b94d-f1a51ffda5cc', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('7383efcf-c946-442b-b94d-f1a51ffda5cc', '7be33f68-016e-421c-9ff6-0718a73526e5', 3);

-- Raizen Studio
insert into content (id, type, status, default_locale, slug, publish_at) values ('5297ebcf-f11c-495f-b0c5-9be1b0c61fb4', 'case', 'published', 'es', 'raizen-studio-18', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('5297ebcf-f11c-495f-b0c5-9be1b0c61fb4', 'es', 'Raizen Studio — Agroalimentario', 'Cómo ayudamos a Raizen Studio a destacar en agroalimentario.', 'Trabajamos con Raizen Studio en branding, packaging, comunicación de campaña, dentro del sector de agroalimentario, durante 2023.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('5297ebcf-f11c-495f-b0c5-9be1b0c61fb4', 4, 'Raizen Studio') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('5297ebcf-f11c-495f-b0c5-9be1b0c61fb4', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('a7adb90d-39c7-4aa5-b161-036fa325c980', '5297ebcf-f11c-495f-b0c5-9be1b0c61fb4', '2:3', true, 'Raizen Studio — pieza 1', 'es', 0, 'Imagen del caso Raizen Studio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('a7adb90d-39c7-4aa5-b161-036fa325c980', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('432593e9-dd8d-47d0-b01c-799a8c6e8e6f', '5297ebcf-f11c-495f-b0c5-9be1b0c61fb4', '3:4', true, 'Raizen Studio — pieza 2', 'es', 1, 'Imagen del caso Raizen Studio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('432593e9-dd8d-47d0-b01c-799a8c6e8e6f', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('8bb6be47-f918-4259-adaf-c867e6604a63', '5297ebcf-f11c-495f-b0c5-9be1b0c61fb4', '4:5', true, 'Raizen Studio — pieza 3', 'es', 2, 'Imagen del caso Raizen Studio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('8bb6be47-f918-4259-adaf-c867e6604a63', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('6039d03f-65a5-4f10-8433-04ef8e72bf3f', '5297ebcf-f11c-495f-b0c5-9be1b0c61fb4', '16:9', true, 'Raizen Studio — pieza 4', 'es', 3, 'Imagen del caso Raizen Studio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('6039d03f-65a5-4f10-8433-04ef8e72bf3f', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('532b4da2-c4ab-4a65-8470-a3efc5547de3', '5297ebcf-f11c-495f-b0c5-9be1b0c61fb4', '4:5', true, 'Raizen Studio — pieza 5', 'es', 4, 'Imagen del caso Raizen Studio, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('532b4da2-c4ab-4a65-8470-a3efc5547de3', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('5297ebcf-f11c-495f-b0c5-9be1b0c61fb4', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('5297ebcf-f11c-495f-b0c5-9be1b0c61fb4', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('5297ebcf-f11c-495f-b0c5-9be1b0c61fb4', '8f968a4c-2552-4b3e-b055-d97f91defb36', 2);

-- Terraval Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('bcaf1916-5581-4853-9d2b-cbff921841cf', 'case', 'published', 'es', 'terraval-group-19', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('bcaf1916-5581-4853-9d2b-cbff921841cf', 'es', 'Terraval Group — Agroalimentario', 'Cómo ayudamos a Terraval Group a destacar en agroalimentario.', 'Trabajamos con Terraval Group en branding, packaging, comunicación de campaña, dentro del sector de agroalimentario, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('bcaf1916-5581-4853-9d2b-cbff921841cf', 2, 'Terraval Group') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('bcaf1916-5581-4853-9d2b-cbff921841cf', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('0dde079c-d937-4b8d-a8df-e199b1fada9a', 'bcaf1916-5581-4853-9d2b-cbff921841cf', '3:4', true, 'Terraval Group — pieza 1', 'es', 0, 'Imagen del caso Terraval Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('0dde079c-d937-4b8d-a8df-e199b1fada9a', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('f051e611-e388-4ec0-9ec2-d057630931e2', 'bcaf1916-5581-4853-9d2b-cbff921841cf', '16:9', true, 'Terraval Group — pieza 2', 'es', 1, 'Imagen del caso Terraval Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('f051e611-e388-4ec0-9ec2-d057630931e2', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('607a68c5-860f-4eb5-8f85-b0115c432876', 'bcaf1916-5581-4853-9d2b-cbff921841cf', '1:1', true, 'Terraval Group — pieza 3', 'es', 2, 'Imagen del caso Terraval Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('607a68c5-860f-4eb5-8f85-b0115c432876', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('bcaf1916-5581-4853-9d2b-cbff921841cf', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('bcaf1916-5581-4853-9d2b-cbff921841cf', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('bcaf1916-5581-4853-9d2b-cbff921841cf', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 2);

-- Raizen Bio
insert into content (id, type, status, default_locale, slug, publish_at) values ('d3d9177b-a8d4-4604-93e0-cc51caa313a9', 'case', 'published', 'es', 'raizen-bio-20', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('d3d9177b-a8d4-4604-93e0-cc51caa313a9', 'es', 'Raizen Bio — Alimentación', 'Cómo ayudamos a Raizen Bio a destacar en alimentación.', 'Trabajamos con Raizen Bio en identidad visual, fotografía de producto, dentro del sector de alimentación, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('d3d9177b-a8d4-4604-93e0-cc51caa313a9', 2, 'Raizen Bio') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('d3d9177b-a8d4-4604-93e0-cc51caa313a9', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('37c76397-0a94-4fcf-bfba-da2236538ef4', 'd3d9177b-a8d4-4604-93e0-cc51caa313a9', '3:4', true, 'Raizen Bio — pieza 1', 'es', 0, 'Imagen del caso Raizen Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('37c76397-0a94-4fcf-bfba-da2236538ef4', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('23604e2d-2236-4943-a1e5-1e63a0d5c461', 'd3d9177b-a8d4-4604-93e0-cc51caa313a9', '2:3', true, 'Raizen Bio — pieza 2', 'es', 1, 'Imagen del caso Raizen Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('23604e2d-2236-4943-a1e5-1e63a0d5c461', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('b408a525-1b71-4c4a-a3b6-cbf4cd23a00a', 'd3d9177b-a8d4-4604-93e0-cc51caa313a9', '3:4', true, 'Raizen Bio — pieza 3', 'es', 2, 'Imagen del caso Raizen Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('b408a525-1b71-4c4a-a3b6-cbf4cd23a00a', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('f0f776ba-e022-4095-8d0c-1faa3ce9eb45', 'd3d9177b-a8d4-4604-93e0-cc51caa313a9', '9:16', true, 'Raizen Bio — pieza 4', 'es', 3, 'Imagen del caso Raizen Bio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('f0f776ba-e022-4095-8d0c-1faa3ce9eb45', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('d3d9177b-a8d4-4604-93e0-cc51caa313a9', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('d3d9177b-a8d4-4604-93e0-cc51caa313a9', '8f968a4c-2552-4b3e-b055-d97f91defb36', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('d3d9177b-a8d4-4604-93e0-cc51caa313a9', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 2);

-- Olivara Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('83a68c8f-1af8-4910-99bd-08cd28f0be9a', 'case', 'published', 'es', 'olivara-group-21', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('83a68c8f-1af8-4910-99bd-08cd28f0be9a', 'es', 'Olivara Group — Eventos', 'Cómo ayudamos a Olivara Group a destacar en eventos.', 'Trabajamos con Olivara Group en dirección de arte, señalética, audiovisual, dentro del sector de eventos, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('83a68c8f-1af8-4910-99bd-08cd28f0be9a', 5, 'Olivara Group') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('83a68c8f-1af8-4910-99bd-08cd28f0be9a', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('4cefbfa8-74f5-4985-b98e-68cf47d5764d', '83a68c8f-1af8-4910-99bd-08cd28f0be9a', '1:1', true, 'Olivara Group — pieza 1', 'es', 0, 'Imagen del caso Olivara Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('4cefbfa8-74f5-4985-b98e-68cf47d5764d', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('8117da14-ed0e-4948-8b42-511fc6762bd0', '83a68c8f-1af8-4910-99bd-08cd28f0be9a', '2:3', true, 'Olivara Group — pieza 2', 'es', 1, 'Imagen del caso Olivara Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('8117da14-ed0e-4948-8b42-511fc6762bd0', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('9cf4ceaa-986a-4c78-821d-b9ed7c9afeb7', '83a68c8f-1af8-4910-99bd-08cd28f0be9a', '16:9', true, 'Olivara Group — pieza 3', 'es', 2, 'Imagen del caso Olivara Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('9cf4ceaa-986a-4c78-821d-b9ed7c9afeb7', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('83a68c8f-1af8-4910-99bd-08cd28f0be9a', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('83a68c8f-1af8-4910-99bd-08cd28f0be9a', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('83a68c8f-1af8-4910-99bd-08cd28f0be9a', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 2);

-- Grania
insert into content (id, type, status, default_locale, slug, publish_at) values ('ee0affef-afc5-4c35-beba-5fdb26561639', 'case', 'published', 'es', 'grania-22', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('ee0affef-afc5-4c35-beba-5fdb26561639', 'es', 'Grania — Biotecnología', 'Cómo ayudamos a Grania a destacar en biotecnología.', 'Trabajamos con Grania en naming, branding corporativo, informe anual, dentro del sector de biotecnología, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('ee0affef-afc5-4c35-beba-5fdb26561639', 2, 'Grania') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('ee0affef-afc5-4c35-beba-5fdb26561639', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('77cad4c0-1434-475b-8c82-5d263a7d74ae', 'ee0affef-afc5-4c35-beba-5fdb26561639', '4:5', true, 'Grania — pieza 1', 'es', 0, 'Imagen del caso Grania, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('77cad4c0-1434-475b-8c82-5d263a7d74ae', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('daad4bb3-f699-4a08-9db0-dba32b95b330', 'ee0affef-afc5-4c35-beba-5fdb26561639', '9:16', true, 'Grania — pieza 2', 'es', 1, 'Imagen del caso Grania, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('daad4bb3-f699-4a08-9db0-dba32b95b330', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('32551807-f942-49d8-adee-24585433d6a3', 'ee0affef-afc5-4c35-beba-5fdb26561639', '1:1', true, 'Grania — pieza 3', 'es', 2, 'Imagen del caso Grania, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('32551807-f942-49d8-adee-24585433d6a3', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('78acde89-a5a3-480d-bfda-1b6819eb9483', 'ee0affef-afc5-4c35-beba-5fdb26561639', '1:1', true, 'Grania — pieza 4', 'es', 3, 'Imagen del caso Grania, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('78acde89-a5a3-480d-bfda-1b6819eb9483', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('537c8b2c-9921-4f00-8b8c-e491b05dc8b1', 'ee0affef-afc5-4c35-beba-5fdb26561639', '1:1', true, 'Grania — pieza 5', 'es', 4, 'Imagen del caso Grania, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('537c8b2c-9921-4f00-8b8c-e491b05dc8b1', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('ee0affef-afc5-4c35-beba-5fdb26561639', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('ee0affef-afc5-4c35-beba-5fdb26561639', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('ee0affef-afc5-4c35-beba-5fdb26561639', '7be33f68-016e-421c-9ff6-0718a73526e5', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('ee0affef-afc5-4c35-beba-5fdb26561639', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 3);

-- Agrolux
insert into content (id, type, status, default_locale, slug, publish_at) values ('a1c1677e-2298-46e7-aced-69027dfc649a', 'case', 'published', 'es', 'agrolux-23', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('a1c1677e-2298-46e7-aced-69027dfc649a', 'es', 'Agrolux — Alimentación', 'Cómo ayudamos a Agrolux a destacar en alimentación.', 'Trabajamos con Agrolux en identidad visual, fotografía de producto, dentro del sector de alimentación, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('a1c1677e-2298-46e7-aced-69027dfc649a', 2, 'Agrolux') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('a1c1677e-2298-46e7-aced-69027dfc649a', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('5ff8e738-f8f9-4b7f-9980-d794c5f94747', 'a1c1677e-2298-46e7-aced-69027dfc649a', '3:4', true, 'Agrolux — pieza 1', 'es', 0, 'Imagen del caso Agrolux, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('5ff8e738-f8f9-4b7f-9980-d794c5f94747', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('040345e1-3f50-4645-adef-e40ac2835533', 'a1c1677e-2298-46e7-aced-69027dfc649a', '2:3', true, 'Agrolux — pieza 2', 'es', 1, 'Imagen del caso Agrolux, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('040345e1-3f50-4645-adef-e40ac2835533', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('b9430762-6992-4842-824f-983e27e92f22', 'a1c1677e-2298-46e7-aced-69027dfc649a', '9:16', true, 'Agrolux — pieza 3', 'es', 2, 'Imagen del caso Agrolux, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('b9430762-6992-4842-824f-983e27e92f22', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('41ec12c7-bb0d-43c0-869b-8e379fb1a476', 'a1c1677e-2298-46e7-aced-69027dfc649a', '3:4', true, 'Agrolux — pieza 4', 'es', 3, 'Imagen del caso Agrolux, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('41ec12c7-bb0d-43c0-869b-8e379fb1a476', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('a1c1677e-2298-46e7-aced-69027dfc649a', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('a1c1677e-2298-46e7-aced-69027dfc649a', '7be33f68-016e-421c-9ff6-0718a73526e5', 1);

-- Florent Labs
insert into content (id, type, status, default_locale, slug, publish_at) values ('9ed2c599-8833-4c3c-9e5a-d266f40cfed0', 'case', 'published', 'es', 'florent-labs-24', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('9ed2c599-8833-4c3c-9e5a-d266f40cfed0', 'es', 'Florent Labs — Eventos', 'Cómo ayudamos a Florent Labs a destacar en eventos.', 'Trabajamos con Florent Labs en dirección de arte, señalética, audiovisual, dentro del sector de eventos, durante 2023.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('9ed2c599-8833-4c3c-9e5a-d266f40cfed0', 2, 'Florent Labs') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('9ed2c599-8833-4c3c-9e5a-d266f40cfed0', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('feb3fdd1-4e61-49fa-acc3-dc5a83e1f0ca', '9ed2c599-8833-4c3c-9e5a-d266f40cfed0', '2:3', true, 'Florent Labs — pieza 1', 'es', 0, 'Imagen del caso Florent Labs, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('feb3fdd1-4e61-49fa-acc3-dc5a83e1f0ca', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('44bf9bb5-ab00-4165-9973-f7cd243f8a66', '9ed2c599-8833-4c3c-9e5a-d266f40cfed0', '9:16', true, 'Florent Labs — pieza 2', 'es', 1, 'Imagen del caso Florent Labs, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('44bf9bb5-ab00-4165-9973-f7cd243f8a66', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('3f6104b6-5bca-46d2-8e93-9c34a7829130', '9ed2c599-8833-4c3c-9e5a-d266f40cfed0', '9:16', true, 'Florent Labs — pieza 3', 'es', 2, 'Imagen del caso Florent Labs, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('3f6104b6-5bca-46d2-8e93-9c34a7829130', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('9ed2c599-8833-4c3c-9e5a-d266f40cfed0', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('9ed2c599-8833-4c3c-9e5a-d266f40cfed0', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('9ed2c599-8833-4c3c-9e5a-d266f40cfed0', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 2);

-- Cultiva Co.
insert into content (id, type, status, default_locale, slug, publish_at) values ('f5f5def9-4b44-463a-bd05-f8454d48569e', 'case', 'published', 'es', 'cultiva-co-25', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('f5f5def9-4b44-463a-bd05-f8454d48569e', 'es', 'Cultiva Co. — Biotecnología', 'Cómo ayudamos a Cultiva Co. a destacar en biotecnología.', 'Trabajamos con Cultiva Co. en naming, branding corporativo, informe anual, dentro del sector de biotecnología, durante 2025.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('f5f5def9-4b44-463a-bd05-f8454d48569e', 2, 'Cultiva Co.') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('f5f5def9-4b44-463a-bd05-f8454d48569e', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('c162c118-8fef-4ecb-b7ee-4032ffb457ab', 'f5f5def9-4b44-463a-bd05-f8454d48569e', '2:3', true, 'Cultiva Co. — pieza 1', 'es', 0, 'Imagen del caso Cultiva Co., pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('c162c118-8fef-4ecb-b7ee-4032ffb457ab', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('c4b5076f-363c-4e0c-a091-317896a54e18', 'f5f5def9-4b44-463a-bd05-f8454d48569e', '16:9', true, 'Cultiva Co. — pieza 2', 'es', 1, 'Imagen del caso Cultiva Co., pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('c4b5076f-363c-4e0c-a091-317896a54e18', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('6d7f7b6c-b4b8-4df4-ac98-f52dba51d511', 'f5f5def9-4b44-463a-bd05-f8454d48569e', '3:4', true, 'Cultiva Co. — pieza 3', 'es', 2, 'Imagen del caso Cultiva Co., pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('6d7f7b6c-b4b8-4df4-ac98-f52dba51d511', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('f5f5def9-4b44-463a-bd05-f8454d48569e', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('f5f5def9-4b44-463a-bd05-f8454d48569e', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('f5f5def9-4b44-463a-bd05-f8454d48569e', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('f5f5def9-4b44-463a-bd05-f8454d48569e', '7be33f68-016e-421c-9ff6-0718a73526e5', 3);

-- Bionova Labs
insert into content (id, type, status, default_locale, slug, publish_at) values ('782c8279-cc29-4088-81dd-b45edcda7520', 'case', 'published', 'es', 'bionova-labs-26', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('782c8279-cc29-4088-81dd-b45edcda7520', 'es', 'Bionova Labs — Branding y marca', 'Cómo ayudamos a Bionova Labs a destacar en branding y marca.', 'Trabajamos con Bionova Labs en estrategia de marca, identidad visual, dentro del sector de branding y marca, durante 2024.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('782c8279-cc29-4088-81dd-b45edcda7520', 4, 'Bionova Labs') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('782c8279-cc29-4088-81dd-b45edcda7520', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('1bb4c960-ba3b-45d5-9b73-c4fc930473f7', '782c8279-cc29-4088-81dd-b45edcda7520', '16:9', true, 'Bionova Labs — pieza 1', 'es', 0, 'Imagen del caso Bionova Labs, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('1bb4c960-ba3b-45d5-9b73-c4fc930473f7', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('bfaea5d7-c3d7-402f-ac49-44af7f09a846', '782c8279-cc29-4088-81dd-b45edcda7520', '2:3', true, 'Bionova Labs — pieza 2', 'es', 1, 'Imagen del caso Bionova Labs, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('bfaea5d7-c3d7-402f-ac49-44af7f09a846', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('ec59f58c-13ca-4a13-8d76-f120311e4f7e', '782c8279-cc29-4088-81dd-b45edcda7520', '4:5', true, 'Bionova Labs — pieza 3', 'es', 2, 'Imagen del caso Bionova Labs, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('ec59f58c-13ca-4a13-8d76-f120311e4f7e', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('782c8279-cc29-4088-81dd-b45edcda7520', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('782c8279-cc29-4088-81dd-b45edcda7520', '8f968a4c-2552-4b3e-b055-d97f91defb36', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('782c8279-cc29-4088-81dd-b45edcda7520', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 2);

-- Olivara Studio
insert into content (id, type, status, default_locale, slug, publish_at) values ('621003e9-c7fa-4309-87ae-0c587dffe517', 'case', 'published', 'es', 'olivara-studio-27', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('621003e9-c7fa-4309-87ae-0c587dffe517', 'es', 'Olivara Studio — Eventos', 'Cómo ayudamos a Olivara Studio a destacar en eventos.', 'Trabajamos con Olivara Studio en dirección de arte, señalética, audiovisual, dentro del sector de eventos, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('621003e9-c7fa-4309-87ae-0c587dffe517', 4, 'Olivara Studio') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('621003e9-c7fa-4309-87ae-0c587dffe517', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('85728a7e-5aa9-43bf-a6fa-41293863f23f', '621003e9-c7fa-4309-87ae-0c587dffe517', '9:16', true, 'Olivara Studio — pieza 1', 'es', 0, 'Imagen del caso Olivara Studio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('85728a7e-5aa9-43bf-a6fa-41293863f23f', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('e1666d0b-a8d9-4258-a484-f32e27eb3e7b', '621003e9-c7fa-4309-87ae-0c587dffe517', '16:9', true, 'Olivara Studio — pieza 2', 'es', 1, 'Imagen del caso Olivara Studio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('e1666d0b-a8d9-4258-a484-f32e27eb3e7b', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('1ec38b05-495c-4f66-b053-e8247b252270', '621003e9-c7fa-4309-87ae-0c587dffe517', '1:1', true, 'Olivara Studio — pieza 3', 'es', 2, 'Imagen del caso Olivara Studio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('1ec38b05-495c-4f66-b053-e8247b252270', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('e9ffc686-c4d9-4f78-8fbf-78e15649bd81', '621003e9-c7fa-4309-87ae-0c587dffe517', '3:4', true, 'Olivara Studio — pieza 4', 'es', 3, 'Imagen del caso Olivara Studio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('e9ffc686-c4d9-4f78-8fbf-78e15649bd81', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('621003e9-c7fa-4309-87ae-0c587dffe517', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('621003e9-c7fa-4309-87ae-0c587dffe517', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('621003e9-c7fa-4309-87ae-0c587dffe517', '8f968a4c-2552-4b3e-b055-d97f91defb36', 2);

-- Semilla Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('c5aee110-65dc-45d1-a2c6-453b6a2af661', 'case', 'published', 'es', 'semilla-foods-28', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('c5aee110-65dc-45d1-a2c6-453b6a2af661', 'es', 'Semilla Foods — Agroalimentario', 'Cómo ayudamos a Semilla Foods a destacar en agroalimentario.', 'Trabajamos con Semilla Foods en branding, packaging, comunicación de campaña, dentro del sector de agroalimentario, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('c5aee110-65dc-45d1-a2c6-453b6a2af661', 1, 'Semilla Foods') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('c5aee110-65dc-45d1-a2c6-453b6a2af661', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('c4c30021-60fe-4506-aeb0-901273368ddf', 'c5aee110-65dc-45d1-a2c6-453b6a2af661', '1:1', true, 'Semilla Foods — pieza 1', 'es', 0, 'Imagen del caso Semilla Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('c4c30021-60fe-4506-aeb0-901273368ddf', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('31b0b20c-790e-47e9-95c6-80401a05aa23', 'c5aee110-65dc-45d1-a2c6-453b6a2af661', '1:1', true, 'Semilla Foods — pieza 2', 'es', 1, 'Imagen del caso Semilla Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('31b0b20c-790e-47e9-95c6-80401a05aa23', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('c586c7a8-e3da-494a-8161-5b2a5e642a8a', 'c5aee110-65dc-45d1-a2c6-453b6a2af661', '3:4', true, 'Semilla Foods — pieza 3', 'es', 2, 'Imagen del caso Semilla Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('c586c7a8-e3da-494a-8161-5b2a5e642a8a', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('c5aee110-65dc-45d1-a2c6-453b6a2af661', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('c5aee110-65dc-45d1-a2c6-453b6a2af661', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('c5aee110-65dc-45d1-a2c6-453b6a2af661', '8f968a4c-2552-4b3e-b055-d97f91defb36', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('c5aee110-65dc-45d1-a2c6-453b6a2af661', '7be33f68-016e-421c-9ff6-0718a73526e5', 3);

-- Agrolux Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('c3b84a10-e417-43d6-9ff9-fe8a29327c91', 'case', 'published', 'es', 'agrolux-foods-29', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('c3b84a10-e417-43d6-9ff9-fe8a29327c91', 'es', 'Agrolux Foods — Branding y marca', 'Cómo ayudamos a Agrolux Foods a destacar en branding y marca.', 'Trabajamos con Agrolux Foods en estrategia de marca, identidad visual, dentro del sector de branding y marca, durante 2023.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('c3b84a10-e417-43d6-9ff9-fe8a29327c91', 2, 'Agrolux Foods') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('c3b84a10-e417-43d6-9ff9-fe8a29327c91', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('a7f49444-2fb5-4f43-860b-58abb126a7bd', 'c3b84a10-e417-43d6-9ff9-fe8a29327c91', '9:16', true, 'Agrolux Foods — pieza 1', 'es', 0, 'Imagen del caso Agrolux Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('a7f49444-2fb5-4f43-860b-58abb126a7bd', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('d44760ba-5807-40a6-b8a3-4bcfc0c2e465', 'c3b84a10-e417-43d6-9ff9-fe8a29327c91', '1:1', true, 'Agrolux Foods — pieza 2', 'es', 1, 'Imagen del caso Agrolux Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('d44760ba-5807-40a6-b8a3-4bcfc0c2e465', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('acbc2090-08cc-4dac-ac79-9e7218b29244', 'c3b84a10-e417-43d6-9ff9-fe8a29327c91', '9:16', true, 'Agrolux Foods — pieza 3', 'es', 2, 'Imagen del caso Agrolux Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('acbc2090-08cc-4dac-ac79-9e7218b29244', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('be46f71e-4ca3-46b2-92c2-e1b7f1f801c3', 'c3b84a10-e417-43d6-9ff9-fe8a29327c91', '1:1', true, 'Agrolux Foods — pieza 4', 'es', 3, 'Imagen del caso Agrolux Foods, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('be46f71e-4ca3-46b2-92c2-e1b7f1f801c3', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('e0bb0fcb-c523-4736-bf6b-331e359dbed3', 'c3b84a10-e417-43d6-9ff9-fe8a29327c91', '16:9', true, 'Agrolux Foods — pieza 5', 'es', 4, 'Imagen del caso Agrolux Foods, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('e0bb0fcb-c523-4736-bf6b-331e359dbed3', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('c3b84a10-e417-43d6-9ff9-fe8a29327c91', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('c3b84a10-e417-43d6-9ff9-fe8a29327c91', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 1);

-- Agrolux Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('8b65965f-8ce9-4dd8-a6ec-155d1a725870', 'case', 'published', 'es', 'agrolux-group-30', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('8b65965f-8ce9-4dd8-a6ec-155d1a725870', 'es', 'Agrolux Group — Agroalimentario', 'Cómo ayudamos a Agrolux Group a destacar en agroalimentario.', 'Trabajamos con Agrolux Group en branding, packaging, comunicación de campaña, dentro del sector de agroalimentario, durante 2024.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('8b65965f-8ce9-4dd8-a6ec-155d1a725870', 2, 'Agrolux Group') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('8b65965f-8ce9-4dd8-a6ec-155d1a725870', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('934c01f7-5283-46c7-8e7b-15690af3e9e2', '8b65965f-8ce9-4dd8-a6ec-155d1a725870', '16:9', true, 'Agrolux Group — pieza 1', 'es', 0, 'Imagen del caso Agrolux Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('934c01f7-5283-46c7-8e7b-15690af3e9e2', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('bbe93b4e-7eaa-42a3-afcc-5b8e902b4cef', '8b65965f-8ce9-4dd8-a6ec-155d1a725870', '4:5', true, 'Agrolux Group — pieza 2', 'es', 1, 'Imagen del caso Agrolux Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('bbe93b4e-7eaa-42a3-afcc-5b8e902b4cef', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('70fa43ad-5f1d-444e-9b9d-db8e3deb1fe5', '8b65965f-8ce9-4dd8-a6ec-155d1a725870', '4:5', true, 'Agrolux Group — pieza 3', 'es', 2, 'Imagen del caso Agrolux Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('70fa43ad-5f1d-444e-9b9d-db8e3deb1fe5', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('ff26d556-899c-40a5-a4b1-1c7ff416a905', '8b65965f-8ce9-4dd8-a6ec-155d1a725870', '4:5', true, 'Agrolux Group — pieza 4', 'es', 3, 'Imagen del caso Agrolux Group, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('ff26d556-899c-40a5-a4b1-1c7ff416a905', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('cd9e6e6a-4b62-4f6b-9083-f539a5e93468', '8b65965f-8ce9-4dd8-a6ec-155d1a725870', '9:16', true, 'Agrolux Group — pieza 5', 'es', 4, 'Imagen del caso Agrolux Group, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('cd9e6e6a-4b62-4f6b-9083-f539a5e93468', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('8b65965f-8ce9-4dd8-a6ec-155d1a725870', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('8b65965f-8ce9-4dd8-a6ec-155d1a725870', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('8b65965f-8ce9-4dd8-a6ec-155d1a725870', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('8b65965f-8ce9-4dd8-a6ec-155d1a725870', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 3);

-- Campovía Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('ee720987-c5e6-41a8-b46c-975e1bc3395d', 'case', 'published', 'es', 'campovia-group-31', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('ee720987-c5e6-41a8-b46c-975e1bc3395d', 'es', 'Campovía Group — Agroalimentario', 'Cómo ayudamos a Campovía Group a destacar en agroalimentario.', 'Trabajamos con Campovía Group en branding, packaging, comunicación de campaña, dentro del sector de agroalimentario, durante 2022.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('ee720987-c5e6-41a8-b46c-975e1bc3395d', 2, 'Campovía Group') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('ee720987-c5e6-41a8-b46c-975e1bc3395d', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('a6e03ef4-48d0-4f36-9242-6da16e405f3c', 'ee720987-c5e6-41a8-b46c-975e1bc3395d', '2:3', true, 'Campovía Group — pieza 1', 'es', 0, 'Imagen del caso Campovía Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('a6e03ef4-48d0-4f36-9242-6da16e405f3c', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('86f87b98-1fbe-4fa4-8099-d69884442142', 'ee720987-c5e6-41a8-b46c-975e1bc3395d', '9:16', true, 'Campovía Group — pieza 2', 'es', 1, 'Imagen del caso Campovía Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('86f87b98-1fbe-4fa4-8099-d69884442142', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('17d8421e-e509-4fd8-aba4-a419fe2d6314', 'ee720987-c5e6-41a8-b46c-975e1bc3395d', '16:9', true, 'Campovía Group — pieza 3', 'es', 2, 'Imagen del caso Campovía Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('17d8421e-e509-4fd8-aba4-a419fe2d6314', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('4704cda4-1d75-4535-800c-eee64e5ee146', 'ee720987-c5e6-41a8-b46c-975e1bc3395d', '16:9', true, 'Campovía Group — pieza 4', 'es', 3, 'Imagen del caso Campovía Group, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('4704cda4-1d75-4535-800c-eee64e5ee146', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('ee720987-c5e6-41a8-b46c-975e1bc3395d', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('ee720987-c5e6-41a8-b46c-975e1bc3395d', '7be33f68-016e-421c-9ff6-0718a73526e5', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('ee720987-c5e6-41a8-b46c-975e1bc3395d', '7be33f68-016e-421c-9ff6-0718a73526e5', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('ee720987-c5e6-41a8-b46c-975e1bc3395d', '8f968a4c-2552-4b3e-b055-d97f91defb36', 3);

-- Olivara Studio
insert into content (id, type, status, default_locale, slug, publish_at) values ('6cded4f2-19fc-47dc-9a47-2e9afd615e75', 'case', 'published', 'es', 'olivara-studio-32', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('6cded4f2-19fc-47dc-9a47-2e9afd615e75', 'es', 'Olivara Studio — Alimentación', 'Cómo ayudamos a Olivara Studio a destacar en alimentación.', 'Trabajamos con Olivara Studio en identidad visual, fotografía de producto, dentro del sector de alimentación, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('6cded4f2-19fc-47dc-9a47-2e9afd615e75', 2, 'Olivara Studio') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('6cded4f2-19fc-47dc-9a47-2e9afd615e75', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('204febbe-6e01-43da-81bc-c2c5485f465a', '6cded4f2-19fc-47dc-9a47-2e9afd615e75', '9:16', true, 'Olivara Studio — pieza 1', 'es', 0, 'Imagen del caso Olivara Studio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('204febbe-6e01-43da-81bc-c2c5485f465a', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('78410cc8-a640-405f-b48b-ca2813639df9', '6cded4f2-19fc-47dc-9a47-2e9afd615e75', '3:4', true, 'Olivara Studio — pieza 2', 'es', 1, 'Imagen del caso Olivara Studio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('78410cc8-a640-405f-b48b-ca2813639df9', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('4d22047b-ac44-445c-8f63-652c27306e43', '6cded4f2-19fc-47dc-9a47-2e9afd615e75', '2:3', true, 'Olivara Studio — pieza 3', 'es', 2, 'Imagen del caso Olivara Studio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('4d22047b-ac44-445c-8f63-652c27306e43', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('6cded4f2-19fc-47dc-9a47-2e9afd615e75', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('6cded4f2-19fc-47dc-9a47-2e9afd615e75', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('6cded4f2-19fc-47dc-9a47-2e9afd615e75', '7be33f68-016e-421c-9ff6-0718a73526e5', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('6cded4f2-19fc-47dc-9a47-2e9afd615e75', '7be33f68-016e-421c-9ff6-0718a73526e5', 3);

-- Raizen Studio
insert into content (id, type, status, default_locale, slug, publish_at) values ('108bd424-b98e-44ee-ba9f-0b4ef913c2ac', 'case', 'published', 'es', 'raizen-studio-33', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('108bd424-b98e-44ee-ba9f-0b4ef913c2ac', 'es', 'Raizen Studio — Digital', 'Cómo ayudamos a Raizen Studio a destacar en digital.', 'Trabajamos con Raizen Studio en diseño digital, desarrollo web, dentro del sector de digital, durante 2022.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('108bd424-b98e-44ee-ba9f-0b4ef913c2ac', 3, 'Raizen Studio') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('108bd424-b98e-44ee-ba9f-0b4ef913c2ac', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('fd2bb351-40d8-4f53-8df1-dfbb8ffaab4e', '108bd424-b98e-44ee-ba9f-0b4ef913c2ac', '16:9', true, 'Raizen Studio — pieza 1', 'es', 0, 'Imagen del caso Raizen Studio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('fd2bb351-40d8-4f53-8df1-dfbb8ffaab4e', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('303bb857-c973-44d7-9ec6-a9daf41f2d09', '108bd424-b98e-44ee-ba9f-0b4ef913c2ac', '1:1', true, 'Raizen Studio — pieza 2', 'es', 1, 'Imagen del caso Raizen Studio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('303bb857-c973-44d7-9ec6-a9daf41f2d09', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('171b739e-b445-4b2a-afff-197f38c60531', '108bd424-b98e-44ee-ba9f-0b4ef913c2ac', '16:9', true, 'Raizen Studio — pieza 3', 'es', 2, 'Imagen del caso Raizen Studio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('171b739e-b445-4b2a-afff-197f38c60531', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('108bd424-b98e-44ee-ba9f-0b4ef913c2ac', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('108bd424-b98e-44ee-ba9f-0b4ef913c2ac', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('108bd424-b98e-44ee-ba9f-0b4ef913c2ac', '8f968a4c-2552-4b3e-b055-d97f91defb36', 2);

-- Terraval Studio
insert into content (id, type, status, default_locale, slug, publish_at) values ('b7ee0d30-48df-4ba0-a846-1c539ace1d8c', 'case', 'published', 'es', 'terraval-studio-34', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('b7ee0d30-48df-4ba0-a846-1c539ace1d8c', 'es', 'Terraval Studio — Branding y marca', 'Cómo ayudamos a Terraval Studio a destacar en branding y marca.', 'Trabajamos con Terraval Studio en estrategia de marca, identidad visual, dentro del sector de branding y marca, durante 2025.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('b7ee0d30-48df-4ba0-a846-1c539ace1d8c', 1, 'Terraval Studio') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('b7ee0d30-48df-4ba0-a846-1c539ace1d8c', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('36d9505c-d6aa-43d3-a627-d08d90e6c553', 'b7ee0d30-48df-4ba0-a846-1c539ace1d8c', '9:16', true, 'Terraval Studio — pieza 1', 'es', 0, 'Imagen del caso Terraval Studio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('36d9505c-d6aa-43d3-a627-d08d90e6c553', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('ae5bced3-ea37-4286-a846-ef1a18894cab', 'b7ee0d30-48df-4ba0-a846-1c539ace1d8c', '3:4', true, 'Terraval Studio — pieza 2', 'es', 1, 'Imagen del caso Terraval Studio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('ae5bced3-ea37-4286-a846-ef1a18894cab', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('1cf6cbdb-f58d-420d-bbb8-77bace7a8477', 'b7ee0d30-48df-4ba0-a846-1c539ace1d8c', '16:9', true, 'Terraval Studio — pieza 3', 'es', 2, 'Imagen del caso Terraval Studio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('1cf6cbdb-f58d-420d-bbb8-77bace7a8477', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('67f183bf-b33a-4cfe-8df4-538a09c3a92f', 'b7ee0d30-48df-4ba0-a846-1c539ace1d8c', '4:5', true, 'Terraval Studio — pieza 4', 'es', 3, 'Imagen del caso Terraval Studio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('67f183bf-b33a-4cfe-8df4-538a09c3a92f', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('0c24b20e-1c9a-4cb3-8c17-041cb32a2832', 'b7ee0d30-48df-4ba0-a846-1c539ace1d8c', '1:1', true, 'Terraval Studio — pieza 5', 'es', 4, 'Imagen del caso Terraval Studio, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('0c24b20e-1c9a-4cb3-8c17-041cb32a2832', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('b7ee0d30-48df-4ba0-a846-1c539ace1d8c', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('b7ee0d30-48df-4ba0-a846-1c539ace1d8c', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 1);

-- Estival Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('24f89086-b05e-4ebb-b66f-7c565b467cd5', 'case', 'published', 'es', 'estival-foods-35', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('24f89086-b05e-4ebb-b66f-7c565b467cd5', 'es', 'Estival Foods — Agroalimentario', 'Cómo ayudamos a Estival Foods a destacar en agroalimentario.', 'Trabajamos con Estival Foods en branding, packaging, comunicación de campaña, dentro del sector de agroalimentario, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('24f89086-b05e-4ebb-b66f-7c565b467cd5', 2, 'Estival Foods') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('24f89086-b05e-4ebb-b66f-7c565b467cd5', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('57480aca-19ca-42c4-9eec-3d8471671cea', '24f89086-b05e-4ebb-b66f-7c565b467cd5', '16:9', true, 'Estival Foods — pieza 1', 'es', 0, 'Imagen del caso Estival Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('57480aca-19ca-42c4-9eec-3d8471671cea', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('abd207cd-2b09-4688-ae6e-3784956ad39a', '24f89086-b05e-4ebb-b66f-7c565b467cd5', '2:3', true, 'Estival Foods — pieza 2', 'es', 1, 'Imagen del caso Estival Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('abd207cd-2b09-4688-ae6e-3784956ad39a', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('b5017e67-1ea8-4b65-adfe-98e68ec1d041', '24f89086-b05e-4ebb-b66f-7c565b467cd5', '9:16', true, 'Estival Foods — pieza 3', 'es', 2, 'Imagen del caso Estival Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('b5017e67-1ea8-4b65-adfe-98e68ec1d041', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('2943b7a9-f612-45df-b9a2-407bc7cbd2b7', '24f89086-b05e-4ebb-b66f-7c565b467cd5', '9:16', true, 'Estival Foods — pieza 4', 'es', 3, 'Imagen del caso Estival Foods, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('2943b7a9-f612-45df-b9a2-407bc7cbd2b7', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('557c15d4-8779-4086-b0d1-e889cb3c1cc4', '24f89086-b05e-4ebb-b66f-7c565b467cd5', '4:5', true, 'Estival Foods — pieza 5', 'es', 4, 'Imagen del caso Estival Foods, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('557c15d4-8779-4086-b0d1-e889cb3c1cc4', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('24f89086-b05e-4ebb-b66f-7c565b467cd5', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('24f89086-b05e-4ebb-b66f-7c565b467cd5', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 1);

-- Raizen Farms
insert into content (id, type, status, default_locale, slug, publish_at) values ('e1c77743-95a1-4760-ac2a-b471f3c2f513', 'case', 'published', 'es', 'raizen-farms-36', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('e1c77743-95a1-4760-ac2a-b471f3c2f513', 'es', 'Raizen Farms — Eventos', 'Cómo ayudamos a Raizen Farms a destacar en eventos.', 'Trabajamos con Raizen Farms en dirección de arte, señalética, audiovisual, dentro del sector de eventos, durante 2023.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('e1c77743-95a1-4760-ac2a-b471f3c2f513', 4, 'Raizen Farms') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('e1c77743-95a1-4760-ac2a-b471f3c2f513', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('822e3fb0-5b9a-42e6-bd01-3299df187667', 'e1c77743-95a1-4760-ac2a-b471f3c2f513', '3:4', true, 'Raizen Farms — pieza 1', 'es', 0, 'Imagen del caso Raizen Farms, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('822e3fb0-5b9a-42e6-bd01-3299df187667', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('8ad7e67a-9d18-4ddb-8cea-882165d1e8f0', 'e1c77743-95a1-4760-ac2a-b471f3c2f513', '2:3', true, 'Raizen Farms — pieza 2', 'es', 1, 'Imagen del caso Raizen Farms, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('8ad7e67a-9d18-4ddb-8cea-882165d1e8f0', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('af9b6dff-f201-4730-a9b4-0880abfe03a3', 'e1c77743-95a1-4760-ac2a-b471f3c2f513', '16:9', true, 'Raizen Farms — pieza 3', 'es', 2, 'Imagen del caso Raizen Farms, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('af9b6dff-f201-4730-a9b4-0880abfe03a3', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('9ac32234-53d2-43ab-a277-8108afbc1a39', 'e1c77743-95a1-4760-ac2a-b471f3c2f513', '2:3', true, 'Raizen Farms — pieza 4', 'es', 3, 'Imagen del caso Raizen Farms, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('9ac32234-53d2-43ab-a277-8108afbc1a39', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('d04dd368-2bd5-462f-918e-f4d6344320f9', 'e1c77743-95a1-4760-ac2a-b471f3c2f513', '4:5', true, 'Raizen Farms — pieza 5', 'es', 4, 'Imagen del caso Raizen Farms, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('d04dd368-2bd5-462f-918e-f4d6344320f9', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('34429cdf-e139-4990-a62d-51151c4f84b0', 'e1c77743-95a1-4760-ac2a-b471f3c2f513', '9:16', true, 'Raizen Farms — pieza 6', 'es', 5, 'Imagen del caso Raizen Farms, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('34429cdf-e139-4990-a62d-51151c4f84b0', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('e1c77743-95a1-4760-ac2a-b471f3c2f513', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('e1c77743-95a1-4760-ac2a-b471f3c2f513', '8f968a4c-2552-4b3e-b055-d97f91defb36', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('e1c77743-95a1-4760-ac2a-b471f3c2f513', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('e1c77743-95a1-4760-ac2a-b471f3c2f513', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 3);

-- Norda Labs
insert into content (id, type, status, default_locale, slug, publish_at) values ('3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', 'case', 'published', 'es', 'norda-labs-37', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', 'es', 'Norda Labs — Eventos', 'Cómo ayudamos a Norda Labs a destacar en eventos.', 'Trabajamos con Norda Labs en dirección de arte, señalética, audiovisual, dentro del sector de eventos, durante 2023.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', 1, 'Norda Labs') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('78a56fb4-e2c7-4954-b0f9-2510ac1782ee', '3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', '9:16', true, 'Norda Labs — pieza 1', 'es', 0, 'Imagen del caso Norda Labs, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('78a56fb4-e2c7-4954-b0f9-2510ac1782ee', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('0341a3a5-82f4-473d-b5a1-7df6b6583356', '3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', '16:9', true, 'Norda Labs — pieza 2', 'es', 1, 'Imagen del caso Norda Labs, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('0341a3a5-82f4-473d-b5a1-7df6b6583356', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('bfbea72d-0048-40d2-8d7c-6ad7ac65d493', '3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', '3:4', true, 'Norda Labs — pieza 3', 'es', 2, 'Imagen del caso Norda Labs, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('bfbea72d-0048-40d2-8d7c-6ad7ac65d493', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('4cd14846-bbfd-4e5b-9c07-28fd2576edef', '3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', '1:1', true, 'Norda Labs — pieza 4', 'es', 3, 'Imagen del caso Norda Labs, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('4cd14846-bbfd-4e5b-9c07-28fd2576edef', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('dc1210ec-a579-4859-ab6f-07a72899250d', '3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', '2:3', true, 'Norda Labs — pieza 5', 'es', 4, 'Imagen del caso Norda Labs, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('dc1210ec-a579-4859-ab6f-07a72899250d', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('a2567724-65db-4f83-aec3-feb34fed3ce4', '3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', '16:9', true, 'Norda Labs — pieza 6', 'es', 5, 'Imagen del caso Norda Labs, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('a2567724-65db-4f83-aec3-feb34fed3ce4', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('3cfd3d6c-4e9f-4766-8d58-5a700e64de1a', '7be33f68-016e-421c-9ff6-0718a73526e5', 3);

-- Agrolux Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('d7b6417d-f54b-4342-92f5-326cbb81088e', 'case', 'published', 'es', 'agrolux-group-38', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('d7b6417d-f54b-4342-92f5-326cbb81088e', 'es', 'Agrolux Group — Agroalimentario', 'Cómo ayudamos a Agrolux Group a destacar en agroalimentario.', 'Trabajamos con Agrolux Group en branding, packaging, comunicación de campaña, dentro del sector de agroalimentario, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('d7b6417d-f54b-4342-92f5-326cbb81088e', 5, 'Agrolux Group') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('d7b6417d-f54b-4342-92f5-326cbb81088e', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('f4815b95-5d21-463d-adea-70a76da4b5fc', 'd7b6417d-f54b-4342-92f5-326cbb81088e', '2:3', true, 'Agrolux Group — pieza 1', 'es', 0, 'Imagen del caso Agrolux Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('f4815b95-5d21-463d-adea-70a76da4b5fc', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('08f8431b-9662-4493-a1f6-6b469f60f74a', 'd7b6417d-f54b-4342-92f5-326cbb81088e', '9:16', true, 'Agrolux Group — pieza 2', 'es', 1, 'Imagen del caso Agrolux Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('08f8431b-9662-4493-a1f6-6b469f60f74a', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('1e23c04c-af9e-40ef-817e-00b5908ffb7a', 'd7b6417d-f54b-4342-92f5-326cbb81088e', '1:1', true, 'Agrolux Group — pieza 3', 'es', 2, 'Imagen del caso Agrolux Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('1e23c04c-af9e-40ef-817e-00b5908ffb7a', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('0590faa1-8844-46a5-92e9-48045fd275b9', 'd7b6417d-f54b-4342-92f5-326cbb81088e', '16:9', true, 'Agrolux Group — pieza 4', 'es', 3, 'Imagen del caso Agrolux Group, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('0590faa1-8844-46a5-92e9-48045fd275b9', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('d7b6417d-f54b-4342-92f5-326cbb81088e', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('d7b6417d-f54b-4342-92f5-326cbb81088e', '7be33f68-016e-421c-9ff6-0718a73526e5', 1);

-- Brotia Bio
insert into content (id, type, status, default_locale, slug, publish_at) values ('0b801f49-aaa5-46d6-85ef-d7e8fbf12f21', 'case', 'published', 'es', 'brotia-bio-39', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('0b801f49-aaa5-46d6-85ef-d7e8fbf12f21', 'es', 'Brotia Bio — Digital', 'Cómo ayudamos a Brotia Bio a destacar en digital.', 'Trabajamos con Brotia Bio en diseño digital, desarrollo web, dentro del sector de digital, durante 2022.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('0b801f49-aaa5-46d6-85ef-d7e8fbf12f21', 2, 'Brotia Bio') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('0b801f49-aaa5-46d6-85ef-d7e8fbf12f21', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('077e61f5-d8a3-424c-9ff8-a7de9eac7f4b', '0b801f49-aaa5-46d6-85ef-d7e8fbf12f21', '16:9', true, 'Brotia Bio — pieza 1', 'es', 0, 'Imagen del caso Brotia Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('077e61f5-d8a3-424c-9ff8-a7de9eac7f4b', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('768f8923-d09f-4f0f-8f9e-872bf62b5068', '0b801f49-aaa5-46d6-85ef-d7e8fbf12f21', '3:4', true, 'Brotia Bio — pieza 2', 'es', 1, 'Imagen del caso Brotia Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('768f8923-d09f-4f0f-8f9e-872bf62b5068', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('f718c8e9-44e5-498b-9e39-1012dd259d85', '0b801f49-aaa5-46d6-85ef-d7e8fbf12f21', '9:16', true, 'Brotia Bio — pieza 3', 'es', 2, 'Imagen del caso Brotia Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('f718c8e9-44e5-498b-9e39-1012dd259d85', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('6ec32a90-4298-4104-8fca-7c5e0a7e4a1e', '0b801f49-aaa5-46d6-85ef-d7e8fbf12f21', '1:1', true, 'Brotia Bio — pieza 4', 'es', 3, 'Imagen del caso Brotia Bio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('6ec32a90-4298-4104-8fca-7c5e0a7e4a1e', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('1f5b1b49-463d-4758-a5eb-06508f9f43c8', '0b801f49-aaa5-46d6-85ef-d7e8fbf12f21', '2:3', true, 'Brotia Bio — pieza 5', 'es', 4, 'Imagen del caso Brotia Bio, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('1f5b1b49-463d-4758-a5eb-06508f9f43c8', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('0b801f49-aaa5-46d6-85ef-d7e8fbf12f21', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('0b801f49-aaa5-46d6-85ef-d7e8fbf12f21', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('0b801f49-aaa5-46d6-85ef-d7e8fbf12f21', '8f968a4c-2552-4b3e-b055-d97f91defb36', 2);

-- Semilla Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('c41b8699-28f0-4df4-9a77-31d17188ddac', 'case', 'published', 'es', 'semilla-foods-40', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('c41b8699-28f0-4df4-9a77-31d17188ddac', 'es', 'Semilla Foods — Branding y marca', 'Cómo ayudamos a Semilla Foods a destacar en branding y marca.', 'Trabajamos con Semilla Foods en estrategia de marca, identidad visual, dentro del sector de branding y marca, durante 2022.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('c41b8699-28f0-4df4-9a77-31d17188ddac', 2, 'Semilla Foods') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('c41b8699-28f0-4df4-9a77-31d17188ddac', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('a1a7082b-6518-4adc-88d8-81b0f107ef84', 'c41b8699-28f0-4df4-9a77-31d17188ddac', '1:1', true, 'Semilla Foods — pieza 1', 'es', 0, 'Imagen del caso Semilla Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('a1a7082b-6518-4adc-88d8-81b0f107ef84', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('e264c2b1-c3c1-4603-b020-3f17329a07a5', 'c41b8699-28f0-4df4-9a77-31d17188ddac', '16:9', true, 'Semilla Foods — pieza 2', 'es', 1, 'Imagen del caso Semilla Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('e264c2b1-c3c1-4603-b020-3f17329a07a5', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('ef904aca-151d-400b-bdd8-4da296023789', 'c41b8699-28f0-4df4-9a77-31d17188ddac', '9:16', true, 'Semilla Foods — pieza 3', 'es', 2, 'Imagen del caso Semilla Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('ef904aca-151d-400b-bdd8-4da296023789', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('73e7c09d-b22c-4150-9941-6d335f90bfd4', 'c41b8699-28f0-4df4-9a77-31d17188ddac', '2:3', true, 'Semilla Foods — pieza 4', 'es', 3, 'Imagen del caso Semilla Foods, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('73e7c09d-b22c-4150-9941-6d335f90bfd4', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('c41b8699-28f0-4df4-9a77-31d17188ddac', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('c41b8699-28f0-4df4-9a77-31d17188ddac', '7be33f68-016e-421c-9ff6-0718a73526e5', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('c41b8699-28f0-4df4-9a77-31d17188ddac', '8f968a4c-2552-4b3e-b055-d97f91defb36', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('c41b8699-28f0-4df4-9a77-31d17188ddac', '7be33f68-016e-421c-9ff6-0718a73526e5', 3);

-- Terraval Co.
insert into content (id, type, status, default_locale, slug, publish_at) values ('66309547-4fc3-4829-b41c-232856ba80f3', 'case', 'published', 'es', 'terraval-co-41', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('66309547-4fc3-4829-b41c-232856ba80f3', 'es', 'Terraval Co. — Alimentación', 'Cómo ayudamos a Terraval Co. a destacar en alimentación.', 'Trabajamos con Terraval Co. en identidad visual, fotografía de producto, dentro del sector de alimentación, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('66309547-4fc3-4829-b41c-232856ba80f3', 1, 'Terraval Co.') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('66309547-4fc3-4829-b41c-232856ba80f3', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('14006d7e-80ff-4b84-b066-4403242c1252', '66309547-4fc3-4829-b41c-232856ba80f3', '1:1', true, 'Terraval Co. — pieza 1', 'es', 0, 'Imagen del caso Terraval Co., pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('14006d7e-80ff-4b84-b066-4403242c1252', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('751ac924-7b15-41d6-a122-2a4408c89036', '66309547-4fc3-4829-b41c-232856ba80f3', '9:16', true, 'Terraval Co. — pieza 2', 'es', 1, 'Imagen del caso Terraval Co., pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('751ac924-7b15-41d6-a122-2a4408c89036', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('d666f092-10ef-40a0-a6ed-253f486f27dc', '66309547-4fc3-4829-b41c-232856ba80f3', '9:16', true, 'Terraval Co. — pieza 3', 'es', 2, 'Imagen del caso Terraval Co., pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('d666f092-10ef-40a0-a6ed-253f486f27dc', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('1f32cf69-d4d6-41d1-8567-3c2d12d6627b', '66309547-4fc3-4829-b41c-232856ba80f3', '9:16', true, 'Terraval Co. — pieza 4', 'es', 3, 'Imagen del caso Terraval Co., pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('1f32cf69-d4d6-41d1-8567-3c2d12d6627b', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('2a174e13-c9c8-4bba-93a5-91fd84b55531', '66309547-4fc3-4829-b41c-232856ba80f3', '9:16', true, 'Terraval Co. — pieza 5', 'es', 4, 'Imagen del caso Terraval Co., pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('2a174e13-c9c8-4bba-93a5-91fd84b55531', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('66309547-4fc3-4829-b41c-232856ba80f3', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('66309547-4fc3-4829-b41c-232856ba80f3', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('66309547-4fc3-4829-b41c-232856ba80f3', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('66309547-4fc3-4829-b41c-232856ba80f3', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 3);

-- Grania Studio
insert into content (id, type, status, default_locale, slug, publish_at) values ('bde4a78f-99c6-4d97-acda-01a171566aa5', 'case', 'published', 'es', 'grania-studio-42', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('bde4a78f-99c6-4d97-acda-01a171566aa5', 'es', 'Grania Studio — Biotecnología', 'Cómo ayudamos a Grania Studio a destacar en biotecnología.', 'Trabajamos con Grania Studio en naming, branding corporativo, informe anual, dentro del sector de biotecnología, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('bde4a78f-99c6-4d97-acda-01a171566aa5', 5, 'Grania Studio') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('bde4a78f-99c6-4d97-acda-01a171566aa5', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('5bc2e365-3541-42e5-8de2-fecdfcb8965c', 'bde4a78f-99c6-4d97-acda-01a171566aa5', '3:4', true, 'Grania Studio — pieza 1', 'es', 0, 'Imagen del caso Grania Studio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('5bc2e365-3541-42e5-8de2-fecdfcb8965c', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('7f73d751-3b40-4728-a192-0789eea20c10', 'bde4a78f-99c6-4d97-acda-01a171566aa5', '16:9', true, 'Grania Studio — pieza 2', 'es', 1, 'Imagen del caso Grania Studio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('7f73d751-3b40-4728-a192-0789eea20c10', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('7975e192-643d-4781-b1ad-92fe65de4d83', 'bde4a78f-99c6-4d97-acda-01a171566aa5', '3:4', true, 'Grania Studio — pieza 3', 'es', 2, 'Imagen del caso Grania Studio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('7975e192-643d-4781-b1ad-92fe65de4d83', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('bde4a78f-99c6-4d97-acda-01a171566aa5', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('bde4a78f-99c6-4d97-acda-01a171566aa5', '7be33f68-016e-421c-9ff6-0718a73526e5', 1);

-- Florent Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('af7cbdf4-fa21-4c38-b490-df93170d0bce', 'case', 'published', 'es', 'florent-group-43', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('af7cbdf4-fa21-4c38-b490-df93170d0bce', 'es', 'Florent Group — Branding y marca', 'Cómo ayudamos a Florent Group a destacar en branding y marca.', 'Trabajamos con Florent Group en estrategia de marca, identidad visual, dentro del sector de branding y marca, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('af7cbdf4-fa21-4c38-b490-df93170d0bce', 2, 'Florent Group') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('af7cbdf4-fa21-4c38-b490-df93170d0bce', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('baabbb6e-95c0-4735-ae0d-9c63ac13fef6', 'af7cbdf4-fa21-4c38-b490-df93170d0bce', '2:3', true, 'Florent Group — pieza 1', 'es', 0, 'Imagen del caso Florent Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('baabbb6e-95c0-4735-ae0d-9c63ac13fef6', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('8511d306-3d97-468c-83aa-8fa708977634', 'af7cbdf4-fa21-4c38-b490-df93170d0bce', '16:9', true, 'Florent Group — pieza 2', 'es', 1, 'Imagen del caso Florent Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('8511d306-3d97-468c-83aa-8fa708977634', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('4c34ad03-85b9-4b3f-a077-e26e1548dbcc', 'af7cbdf4-fa21-4c38-b490-df93170d0bce', '1:1', true, 'Florent Group — pieza 3', 'es', 2, 'Imagen del caso Florent Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('4c34ad03-85b9-4b3f-a077-e26e1548dbcc', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('af7cbdf4-fa21-4c38-b490-df93170d0bce', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('af7cbdf4-fa21-4c38-b490-df93170d0bce', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('af7cbdf4-fa21-4c38-b490-df93170d0bce', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 2);

-- Semilla Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('7a985234-388c-4bf9-81c3-08269300ed73', 'case', 'published', 'es', 'semilla-foods-44', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('7a985234-388c-4bf9-81c3-08269300ed73', 'es', 'Semilla Foods — Digital', 'Cómo ayudamos a Semilla Foods a destacar en digital.', 'Trabajamos con Semilla Foods en diseño digital, desarrollo web, dentro del sector de digital, durante 2024.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('7a985234-388c-4bf9-81c3-08269300ed73', 1, 'Semilla Foods') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('7a985234-388c-4bf9-81c3-08269300ed73', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('35f50718-017b-42a2-b0e0-9bd7dacf88e7', '7a985234-388c-4bf9-81c3-08269300ed73', '1:1', true, 'Semilla Foods — pieza 1', 'es', 0, 'Imagen del caso Semilla Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('35f50718-017b-42a2-b0e0-9bd7dacf88e7', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('2f6845f1-2ed4-4cab-9430-4709c14c228b', '7a985234-388c-4bf9-81c3-08269300ed73', '16:9', true, 'Semilla Foods — pieza 2', 'es', 1, 'Imagen del caso Semilla Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('2f6845f1-2ed4-4cab-9430-4709c14c228b', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('0fdd4a67-d5c7-4329-8de0-3fa04371265a', '7a985234-388c-4bf9-81c3-08269300ed73', '3:4', true, 'Semilla Foods — pieza 3', 'es', 2, 'Imagen del caso Semilla Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('0fdd4a67-d5c7-4329-8de0-3fa04371265a', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('b7a151d4-48cd-4f00-bba9-271e1be628ff', '7a985234-388c-4bf9-81c3-08269300ed73', '2:3', true, 'Semilla Foods — pieza 4', 'es', 3, 'Imagen del caso Semilla Foods, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('b7a151d4-48cd-4f00-bba9-271e1be628ff', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('a8e25861-5cff-4876-afd8-1e14211a95ff', '7a985234-388c-4bf9-81c3-08269300ed73', '9:16', true, 'Semilla Foods — pieza 5', 'es', 4, 'Imagen del caso Semilla Foods, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('a8e25861-5cff-4876-afd8-1e14211a95ff', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('7a985234-388c-4bf9-81c3-08269300ed73', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('7a985234-388c-4bf9-81c3-08269300ed73', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('7a985234-388c-4bf9-81c3-08269300ed73', '8f968a4c-2552-4b3e-b055-d97f91defb36', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('7a985234-388c-4bf9-81c3-08269300ed73', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 3);

-- Grania Labs
insert into content (id, type, status, default_locale, slug, publish_at) values ('78cc31fe-7e59-467e-ad40-650e211204cb', 'case', 'published', 'es', 'grania-labs-45', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('78cc31fe-7e59-467e-ad40-650e211204cb', 'es', 'Grania Labs — Digital', 'Cómo ayudamos a Grania Labs a destacar en digital.', 'Trabajamos con Grania Labs en diseño digital, desarrollo web, dentro del sector de digital, durante 2022.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('78cc31fe-7e59-467e-ad40-650e211204cb', 1, 'Grania Labs') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('78cc31fe-7e59-467e-ad40-650e211204cb', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('bed699a2-127d-4b64-bb80-7d96032eb7d9', '78cc31fe-7e59-467e-ad40-650e211204cb', '1:1', true, 'Grania Labs — pieza 1', 'es', 0, 'Imagen del caso Grania Labs, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('bed699a2-127d-4b64-bb80-7d96032eb7d9', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('0a3f2c02-de29-4e18-9db6-5f72936510c1', '78cc31fe-7e59-467e-ad40-650e211204cb', '2:3', true, 'Grania Labs — pieza 2', 'es', 1, 'Imagen del caso Grania Labs, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('0a3f2c02-de29-4e18-9db6-5f72936510c1', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('96379974-f40f-4e1e-8b3c-23ecb9ac233c', '78cc31fe-7e59-467e-ad40-650e211204cb', '2:3', true, 'Grania Labs — pieza 3', 'es', 2, 'Imagen del caso Grania Labs, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('96379974-f40f-4e1e-8b3c-23ecb9ac233c', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('28de483b-7a34-4fb1-b3a4-f854a320f9e2', '78cc31fe-7e59-467e-ad40-650e211204cb', '16:9', true, 'Grania Labs — pieza 4', 'es', 3, 'Imagen del caso Grania Labs, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('28de483b-7a34-4fb1-b3a4-f854a320f9e2', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('316d9520-c8d2-415d-8d70-552130065d45', '78cc31fe-7e59-467e-ad40-650e211204cb', '1:1', true, 'Grania Labs — pieza 5', 'es', 4, 'Imagen del caso Grania Labs, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('316d9520-c8d2-415d-8d70-552130065d45', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('78cc31fe-7e59-467e-ad40-650e211204cb', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('78cc31fe-7e59-467e-ad40-650e211204cb', '8f968a4c-2552-4b3e-b055-d97f91defb36', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('78cc31fe-7e59-467e-ad40-650e211204cb', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 2);

-- Cultiva Farms
insert into content (id, type, status, default_locale, slug, publish_at) values ('9b9eb555-3175-4ea3-b3c6-42befa812776', 'case', 'published', 'es', 'cultiva-farms-46', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('9b9eb555-3175-4ea3-b3c6-42befa812776', 'es', 'Cultiva Farms — Eventos', 'Cómo ayudamos a Cultiva Farms a destacar en eventos.', 'Trabajamos con Cultiva Farms en dirección de arte, señalética, audiovisual, dentro del sector de eventos, durante 2022.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('9b9eb555-3175-4ea3-b3c6-42befa812776', 1, 'Cultiva Farms') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('9b9eb555-3175-4ea3-b3c6-42befa812776', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('71a97c21-3748-4844-b1ee-23545bdcfffc', '9b9eb555-3175-4ea3-b3c6-42befa812776', '16:9', true, 'Cultiva Farms — pieza 1', 'es', 0, 'Imagen del caso Cultiva Farms, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('71a97c21-3748-4844-b1ee-23545bdcfffc', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('59efddc5-cdce-4364-a50f-7f61e1161e38', '9b9eb555-3175-4ea3-b3c6-42befa812776', '16:9', true, 'Cultiva Farms — pieza 2', 'es', 1, 'Imagen del caso Cultiva Farms, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('59efddc5-cdce-4364-a50f-7f61e1161e38', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('55811a64-2711-4556-bdb6-2d0f8df3bfb7', '9b9eb555-3175-4ea3-b3c6-42befa812776', '2:3', true, 'Cultiva Farms — pieza 3', 'es', 2, 'Imagen del caso Cultiva Farms, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('55811a64-2711-4556-bdb6-2d0f8df3bfb7', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('09865347-22b9-4d0d-9a91-c807d9d52e4b', '9b9eb555-3175-4ea3-b3c6-42befa812776', '4:5', true, 'Cultiva Farms — pieza 4', 'es', 3, 'Imagen del caso Cultiva Farms, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('09865347-22b9-4d0d-9a91-c807d9d52e4b', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('033da0db-a763-4796-8d9f-23aec4662381', '9b9eb555-3175-4ea3-b3c6-42befa812776', '2:3', true, 'Cultiva Farms — pieza 5', 'es', 4, 'Imagen del caso Cultiva Farms, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('033da0db-a763-4796-8d9f-23aec4662381', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('9b9eb555-3175-4ea3-b3c6-42befa812776', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('9b9eb555-3175-4ea3-b3c6-42befa812776', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('9b9eb555-3175-4ea3-b3c6-42befa812776', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 2);

-- Cultiva Farms
insert into content (id, type, status, default_locale, slug, publish_at) values ('63fdeef6-150f-416b-8738-b4194f339404', 'case', 'published', 'es', 'cultiva-farms-47', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('63fdeef6-150f-416b-8738-b4194f339404', 'es', 'Cultiva Farms — Agroalimentario', 'Cómo ayudamos a Cultiva Farms a destacar en agroalimentario.', 'Trabajamos con Cultiva Farms en branding, packaging, comunicación de campaña, dentro del sector de agroalimentario, durante 2023.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('63fdeef6-150f-416b-8738-b4194f339404', 1, 'Cultiva Farms') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('63fdeef6-150f-416b-8738-b4194f339404', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('ad308e23-d1db-43f8-8fff-96847e6c10ee', '63fdeef6-150f-416b-8738-b4194f339404', '1:1', true, 'Cultiva Farms — pieza 1', 'es', 0, 'Imagen del caso Cultiva Farms, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('ad308e23-d1db-43f8-8fff-96847e6c10ee', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('62583cc3-cb88-438f-b1c9-4fc28fee5f11', '63fdeef6-150f-416b-8738-b4194f339404', '16:9', true, 'Cultiva Farms — pieza 2', 'es', 1, 'Imagen del caso Cultiva Farms, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('62583cc3-cb88-438f-b1c9-4fc28fee5f11', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('5e6bd2c1-c277-4ad8-a66a-eef51a80f3e1', '63fdeef6-150f-416b-8738-b4194f339404', '4:5', true, 'Cultiva Farms — pieza 3', 'es', 2, 'Imagen del caso Cultiva Farms, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('5e6bd2c1-c277-4ad8-a66a-eef51a80f3e1', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('00b0022f-691e-4fd3-92fa-fd57ba85713f', '63fdeef6-150f-416b-8738-b4194f339404', '4:5', true, 'Cultiva Farms — pieza 4', 'es', 3, 'Imagen del caso Cultiva Farms, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('00b0022f-691e-4fd3-92fa-fd57ba85713f', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('6803ab0a-ac9f-4c84-a55b-ce1a1fd56d97', '63fdeef6-150f-416b-8738-b4194f339404', '9:16', true, 'Cultiva Farms — pieza 5', 'es', 4, 'Imagen del caso Cultiva Farms, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('6803ab0a-ac9f-4c84-a55b-ce1a1fd56d97', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('63fdeef6-150f-416b-8738-b4194f339404', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('63fdeef6-150f-416b-8738-b4194f339404', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('63fdeef6-150f-416b-8738-b4194f339404', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 2);

-- Raizen Farms
insert into content (id, type, status, default_locale, slug, publish_at) values ('778e360b-a4f3-4ad7-92d3-981e1a3f2a99', 'case', 'published', 'es', 'raizen-farms-48', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('778e360b-a4f3-4ad7-92d3-981e1a3f2a99', 'es', 'Raizen Farms — Biotecnología', 'Cómo ayudamos a Raizen Farms a destacar en biotecnología.', 'Trabajamos con Raizen Farms en naming, branding corporativo, informe anual, dentro del sector de biotecnología, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('778e360b-a4f3-4ad7-92d3-981e1a3f2a99', 5, 'Raizen Farms') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('778e360b-a4f3-4ad7-92d3-981e1a3f2a99', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('bf6f5e7f-d060-440e-9198-515fc3a0e29b', '778e360b-a4f3-4ad7-92d3-981e1a3f2a99', '1:1', true, 'Raizen Farms — pieza 1', 'es', 0, 'Imagen del caso Raizen Farms, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('bf6f5e7f-d060-440e-9198-515fc3a0e29b', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('fbfdd60f-7ae4-4637-99ba-3ae51e3b83c9', '778e360b-a4f3-4ad7-92d3-981e1a3f2a99', '4:5', true, 'Raizen Farms — pieza 2', 'es', 1, 'Imagen del caso Raizen Farms, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('fbfdd60f-7ae4-4637-99ba-3ae51e3b83c9', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('523e6196-acdb-44f6-83e1-aaa1570a4b98', '778e360b-a4f3-4ad7-92d3-981e1a3f2a99', '4:5', true, 'Raizen Farms — pieza 3', 'es', 2, 'Imagen del caso Raizen Farms, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('523e6196-acdb-44f6-83e1-aaa1570a4b98', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('5b019588-26b5-477a-b724-43b91cf9c896', '778e360b-a4f3-4ad7-92d3-981e1a3f2a99', '1:1', true, 'Raizen Farms — pieza 4', 'es', 3, 'Imagen del caso Raizen Farms, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('5b019588-26b5-477a-b724-43b91cf9c896', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('c051e30f-12ae-4f95-8e7a-c7d26b079d7a', '778e360b-a4f3-4ad7-92d3-981e1a3f2a99', '16:9', true, 'Raizen Farms — pieza 5', 'es', 4, 'Imagen del caso Raizen Farms, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('c051e30f-12ae-4f95-8e7a-c7d26b079d7a', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('291439aa-2edf-48a2-aec5-471e291aaf4b', '778e360b-a4f3-4ad7-92d3-981e1a3f2a99', '9:16', true, 'Raizen Farms — pieza 6', 'es', 5, 'Imagen del caso Raizen Farms, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('291439aa-2edf-48a2-aec5-471e291aaf4b', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('778e360b-a4f3-4ad7-92d3-981e1a3f2a99', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('778e360b-a4f3-4ad7-92d3-981e1a3f2a99', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 1);

-- Nutrivo Bio
insert into content (id, type, status, default_locale, slug, publish_at) values ('5e9fd398-2421-4929-aff6-e1788e5c5f16', 'case', 'published', 'es', 'nutrivo-bio-49', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('5e9fd398-2421-4929-aff6-e1788e5c5f16', 'es', 'Nutrivo Bio — Digital', 'Cómo ayudamos a Nutrivo Bio a destacar en digital.', 'Trabajamos con Nutrivo Bio en diseño digital, desarrollo web, dentro del sector de digital, durante 2025.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('5e9fd398-2421-4929-aff6-e1788e5c5f16', 1, 'Nutrivo Bio') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('5e9fd398-2421-4929-aff6-e1788e5c5f16', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('404a5375-ce26-4724-ae00-dfd87ffd1f17', '5e9fd398-2421-4929-aff6-e1788e5c5f16', '2:3', true, 'Nutrivo Bio — pieza 1', 'es', 0, 'Imagen del caso Nutrivo Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('404a5375-ce26-4724-ae00-dfd87ffd1f17', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('34270328-7b09-486d-a9ef-55182d67a7c4', '5e9fd398-2421-4929-aff6-e1788e5c5f16', '9:16', true, 'Nutrivo Bio — pieza 2', 'es', 1, 'Imagen del caso Nutrivo Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('34270328-7b09-486d-a9ef-55182d67a7c4', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('16ea9fbc-84e7-4a8c-aa17-c7e7d5aa2ae3', '5e9fd398-2421-4929-aff6-e1788e5c5f16', '16:9', true, 'Nutrivo Bio — pieza 3', 'es', 2, 'Imagen del caso Nutrivo Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('16ea9fbc-84e7-4a8c-aa17-c7e7d5aa2ae3', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('7005b300-20d9-400a-8897-a278728f51a7', '5e9fd398-2421-4929-aff6-e1788e5c5f16', '9:16', true, 'Nutrivo Bio — pieza 4', 'es', 3, 'Imagen del caso Nutrivo Bio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('7005b300-20d9-400a-8897-a278728f51a7', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('866cf78d-4703-4209-bb56-36efd0191a35', '5e9fd398-2421-4929-aff6-e1788e5c5f16', '16:9', true, 'Nutrivo Bio — pieza 5', 'es', 4, 'Imagen del caso Nutrivo Bio, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('866cf78d-4703-4209-bb56-36efd0191a35', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('bcda00a8-d62a-474f-9853-b9d188d5a978', '5e9fd398-2421-4929-aff6-e1788e5c5f16', '3:4', true, 'Nutrivo Bio — pieza 6', 'es', 5, 'Imagen del caso Nutrivo Bio, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('bcda00a8-d62a-474f-9853-b9d188d5a978', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('5e9fd398-2421-4929-aff6-e1788e5c5f16', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('5e9fd398-2421-4929-aff6-e1788e5c5f16', '7be33f68-016e-421c-9ff6-0718a73526e5', 1);
insert into case_detail_media (content_id, media_id, sort_order) values ('5e9fd398-2421-4929-aff6-e1788e5c5f16', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 2);
insert into case_detail_media (content_id, media_id, sort_order) values ('5e9fd398-2421-4929-aff6-e1788e5c5f16', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 3);

-- Florent Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('6a99b8f2-93e3-4113-9216-7e597ef6a9aa', 'case', 'published', 'es', 'florent-foods-50', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('6a99b8f2-93e3-4113-9216-7e597ef6a9aa', 'es', 'Florent Foods — Agroalimentario', 'Cómo ayudamos a Florent Foods a destacar en agroalimentario.', 'Trabajamos con Florent Foods en branding, packaging, comunicación de campaña, dentro del sector de agroalimentario, durante 2026.') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, force, client) values ('6a99b8f2-93e3-4113-9216-7e597ef6a9aa', 1, 'Florent Foods') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('6a99b8f2-93e3-4113-9216-7e597ef6a9aa', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('fb1d06ab-fdd7-49f1-8be0-f69e684e53fe', '6a99b8f2-93e3-4113-9216-7e597ef6a9aa', '4:5', true, 'Florent Foods — pieza 1', 'es', 0, 'Imagen del caso Florent Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('fb1d06ab-fdd7-49f1-8be0-f69e684e53fe', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('f19d73d4-40bf-4549-a5af-e7e1ae9f4ddb', '6a99b8f2-93e3-4113-9216-7e597ef6a9aa', '3:4', true, 'Florent Foods — pieza 2', 'es', 1, 'Imagen del caso Florent Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('f19d73d4-40bf-4549-a5af-e7e1ae9f4ddb', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('a236f7c5-5dd5-44a3-8586-4f3ebfaefac5', '6a99b8f2-93e3-4113-9216-7e597ef6a9aa', '3:4', true, 'Florent Foods — pieza 3', 'es', 2, 'Imagen del caso Florent Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('a236f7c5-5dd5-44a3-8586-4f3ebfaefac5', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('a780b84c-174d-4fa0-9ee0-cc04609d2437', '6a99b8f2-93e3-4113-9216-7e597ef6a9aa', '16:9', true, 'Florent Foods — pieza 4', 'es', 3, 'Imagen del caso Florent Foods, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('a780b84c-174d-4fa0-9ee0-cc04609d2437', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('d2839cf4-601c-4309-a9fb-bcf692e431f1', '6a99b8f2-93e3-4113-9216-7e597ef6a9aa', '1:1', true, 'Florent Foods — pieza 5', 'es', 4, 'Imagen del caso Florent Foods, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('d2839cf4-601c-4309-a9fb-bcf692e431f1', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('6a99b8f2-93e3-4113-9216-7e597ef6a9aa', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into case_detail_media (content_id, media_id, sort_order) values ('6a99b8f2-93e3-4113-9216-7e597ef6a9aa', '8f968a4c-2552-4b3e-b055-d97f91defb36', 1);

-- ============ EPISODIOS DE CHANNEL ============
-- Vídeos de ejemplo de terceros, solo para probar el embed (confirmado); no son contenido real de Greener.
-- Brand the Future · Episodio 1: conversación con Marc Oliveras
insert into content (id, type, status, default_locale, slug, publish_at) values ('c47a5e1a-baf8-4095-ac32-6953602abe88', 'episode', 'published', 'es', 'brand-the-future-episodio-1-e16bd223', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('c47a5e1a-baf8-4095-ac32-6953602abe88', 'es', 'Brand the Future · Episodio 1: conversación con Marc Oliveras', 'Marc Oliveras, Cofundador, sobre brand the future.', 'Episodio 1 de Brand the Future con Marc Oliveras (Cofundador), invitado en representación de Vertia.') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language, episode_kind) values ('c47a5e1a-baf8-4095-ac32-6953602abe88', 'brand_the_future', 1, 'Marc Oliveras', 'Cofundador', 'Campovía', current_date, 1742, 'youtube', '9bZkp7q19f0', 'es', 'podcast') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('c47a5e1a-baf8-4095-ac32-6953602abe88', 'c3d8a99a-a671-4c89-a0f1-9b7c7bc2a8ae') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('deefc3b6-445d-48b1-a43c-04054ad802a0', 'c47a5e1a-baf8-4095-ac32-6953602abe88', '16:9', true, 'Brand the Future — Episodio 1', 'es', 0, 'Miniatura del episodio 1 de Brand the Future, con Marc Oliveras');
insert into pin_media (pin_id, media_id, slide_order) values ('deefc3b6-445d-48b1-a43c-04054ad802a0', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);

-- Brand the Future · Episodio 2: conversación con Elena Vidal
insert into content (id, type, status, default_locale, slug, publish_at) values ('9ac13e8c-ff81-4081-8ea9-2474318f0798', 'episode', 'published', 'es', 'brand-the-future-episodio-2-2a9022d4', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('9ac13e8c-ff81-4081-8ea9-2474318f0798', 'es', 'Brand the Future · Episodio 2: conversación con Elena Vidal', 'Elena Vidal, Fundadora, sobre brand the future.', 'Episodio 2 de Brand the Future con Elena Vidal (Fundadora), invitado en representación de Cultiva.') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language, episode_kind) values ('9ac13e8c-ff81-4081-8ea9-2474318f0798', 'brand_the_future', 2, 'Elena Vidal', 'Fundadora', 'Brotia', current_date, 2020, 'youtube', 'jNQXAC9IVRw', 'es', 'podcast') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('9ac13e8c-ff81-4081-8ea9-2474318f0798', 'c3d8a99a-a671-4c89-a0f1-9b7c7bc2a8ae') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('3761042f-2e6c-4c31-b298-9fd740c98ca7', '9ac13e8c-ff81-4081-8ea9-2474318f0798', '16:9', true, 'Brand the Future — Episodio 2', 'es', 0, 'Miniatura del episodio 2 de Brand the Future, con Elena Vidal');
insert into pin_media (pin_id, media_id, slide_order) values ('3761042f-2e6c-4c31-b298-9fd740c98ca7', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);

-- Brand the Future · Episodio 3: conversación con Núria Bosch
insert into content (id, type, status, default_locale, slug, publish_at) values ('f06ef8b3-7238-4fdf-a24b-d717fd90fa7e', 'episode', 'published', 'es', 'brand-the-future-episodio-3-e4d7b296', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('f06ef8b3-7238-4fdf-a24b-d717fd90fa7e', 'es', 'Brand the Future · Episodio 3: conversación con Núria Bosch', 'Núria Bosch, Directora de Producto, sobre brand the future.', 'Episodio 3 de Brand the Future con Núria Bosch (Directora de Producto), invitado en representación de Estival.') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language, episode_kind) values ('f06ef8b3-7238-4fdf-a24b-d717fd90fa7e', 'brand_the_future', 3, 'Núria Bosch', 'Directora de Producto', 'Agrolux', current_date, 1731, 'youtube', '9bZkp7q19f0', 'es', 'podcast') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('f06ef8b3-7238-4fdf-a24b-d717fd90fa7e', 'c3d8a99a-a671-4c89-a0f1-9b7c7bc2a8ae') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('7f0ec093-d0d4-427d-afa4-dcd4b1827d64', 'f06ef8b3-7238-4fdf-a24b-d717fd90fa7e', '16:9', true, 'Brand the Future — Episodio 3', 'es', 0, 'Miniatura del episodio 3 de Brand the Future, con Núria Bosch');
insert into pin_media (pin_id, media_id, slide_order) values ('7f0ec093-d0d4-427d-afa4-dcd4b1827d64', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Brand into Europe · Episodio 1: conversación con Elena Vidal
insert into content (id, type, status, default_locale, slug, publish_at) values ('91327694-6988-4e74-8b57-ccd90f5c147a', 'episode', 'published', 'es', 'brand-into-europe-episodio-1-cb403b78', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('91327694-6988-4e74-8b57-ccd90f5c147a', 'es', 'Brand into Europe · Episodio 1: conversación con Elena Vidal', 'Elena Vidal, Fundadora, sobre brand into europe.', 'Episodio 1 de Brand into Europe con Elena Vidal (Fundadora), invitado en representación de Agrolux.') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language, episode_kind) values ('91327694-6988-4e74-8b57-ccd90f5c147a', 'brand_into_europe', 1, 'Elena Vidal', 'Fundadora', 'Solvex', current_date, 1819, 'youtube', '9bZkp7q19f0', 'es', 'podcast') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('91327694-6988-4e74-8b57-ccd90f5c147a', 'b2ed5c33-f829-4f3f-8fd2-fb580437dbb0') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('2f83ffaa-fb30-40a1-bbb4-a6c7fc63a48d', '91327694-6988-4e74-8b57-ccd90f5c147a', '16:9', true, 'Brand into Europe — Episodio 1', 'es', 0, 'Miniatura del episodio 1 de Brand into Europe, con Elena Vidal');
insert into pin_media (pin_id, media_id, slide_order) values ('2f83ffaa-fb30-40a1-bbb4-a6c7fc63a48d', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

-- Brand into Europe · Episodio 2: conversación con Elena Vidal
insert into content (id, type, status, default_locale, slug, publish_at) values ('e2e5ba10-1404-40c5-96aa-b1250cf40e57', 'episode', 'published', 'es', 'brand-into-europe-episodio-2-04c5d528', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('e2e5ba10-1404-40c5-96aa-b1250cf40e57', 'es', 'Brand into Europe · Episodio 2: conversación con Elena Vidal', 'Elena Vidal, Fundadora, sobre brand into europe.', 'Episodio 2 de Brand into Europe con Elena Vidal (Fundadora), invitado en representación de Solvex.') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language, episode_kind) values ('e2e5ba10-1404-40c5-96aa-b1250cf40e57', 'brand_into_europe', 2, 'Elena Vidal', 'Fundadora', 'Bionova', current_date, 2457, 'youtube', '9bZkp7q19f0', 'es', 'podcast') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('e2e5ba10-1404-40c5-96aa-b1250cf40e57', 'b2ed5c33-f829-4f3f-8fd2-fb580437dbb0') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('6ad865fd-2e96-44f3-bbac-c6204548fef2', 'e2e5ba10-1404-40c5-96aa-b1250cf40e57', '16:9', true, 'Brand into Europe — Episodio 2', 'es', 0, 'Miniatura del episodio 2 de Brand into Europe, con Elena Vidal');
insert into pin_media (pin_id, media_id, slide_order) values ('6ad865fd-2e96-44f3-bbac-c6204548fef2', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Brand into Europe · Episodio 3: conversación con Jordi Puig
insert into content (id, type, status, default_locale, slug, publish_at) values ('8fc435e5-b168-410d-b5cf-07603b8d2408', 'episode', 'published', 'es', 'brand-into-europe-episodio-3-fb8ee0c5', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('8fc435e5-b168-410d-b5cf-07603b8d2408', 'es', 'Brand into Europe · Episodio 3: conversación con Jordi Puig', 'Jordi Puig, Head of Growth, sobre brand into europe.', 'Episodio 3 de Brand into Europe con Jordi Puig (Head of Growth), invitado en representación de Brotia.') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language, episode_kind) values ('8fc435e5-b168-410d-b5cf-07603b8d2408', 'brand_into_europe', 3, 'Jordi Puig', 'Head of Growth', 'Cultiva', current_date, 1942, 'youtube', 'dQw4w9WgXcQ', 'es', 'podcast') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('8fc435e5-b168-410d-b5cf-07603b8d2408', 'b2ed5c33-f829-4f3f-8fd2-fb580437dbb0') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('e7b5dc8b-add1-47d2-bd3d-1ce03a9cc100', '8fc435e5-b168-410d-b5cf-07603b8d2408', '16:9', true, 'Brand into Europe — Episodio 3', 'es', 0, 'Miniatura del episodio 3 de Brand into Europe, con Jordi Puig');
insert into pin_media (pin_id, media_id, slide_order) values ('e7b5dc8b-add1-47d2-bd3d-1ce03a9cc100', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);

-- Brand to Table · Episodio 1: conversación con Elena Vidal
insert into content (id, type, status, default_locale, slug, publish_at) values ('299baa31-4bb8-47a4-98d2-23cfa684943c', 'episode', 'published', 'es', 'brand-to-table-episodio-1-d62df9a7', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('299baa31-4bb8-47a4-98d2-23cfa684943c', 'es', 'Brand to Table · Episodio 1: conversación con Elena Vidal', 'Elena Vidal, Fundadora, sobre brand to table.', 'Episodio 1 de Brand to Table con Elena Vidal (Fundadora), invitado en representación de Cultiva.') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language, episode_kind) values ('299baa31-4bb8-47a4-98d2-23cfa684943c', 'brand_to_table', 1, 'Elena Vidal', 'Fundadora', 'Nutrivo', current_date, 1389, 'youtube', 'jNQXAC9IVRw', 'es', 'podcast') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('299baa31-4bb8-47a4-98d2-23cfa684943c', 'a7611db7-2c06-4a68-812b-ae6652666546') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('6939eaa5-5100-482e-a30a-29a1f486d7de', '299baa31-4bb8-47a4-98d2-23cfa684943c', '16:9', true, 'Brand to Table — Episodio 1', 'es', 0, 'Miniatura del episodio 1 de Brand to Table, con Elena Vidal');
insert into pin_media (pin_id, media_id, slide_order) values ('6939eaa5-5100-482e-a30a-29a1f486d7de', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Brand to Table · Episodio 2: conversación con Pau Ferrer
insert into content (id, type, status, default_locale, slug, publish_at) values ('4ec9be09-df12-44a7-b6df-7228897a247f', 'episode', 'published', 'es', 'brand-to-table-episodio-2-7ec944a3', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('4ec9be09-df12-44a7-b6df-7228897a247f', 'es', 'Brand to Table · Episodio 2: conversación con Pau Ferrer', 'Pau Ferrer, CEO, sobre brand to table.', 'Episodio 2 de Brand to Table con Pau Ferrer (CEO), invitado en representación de Cultiva.') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language, episode_kind) values ('4ec9be09-df12-44a7-b6df-7228897a247f', 'brand_to_table', 2, 'Pau Ferrer', 'CEO', 'Raizen', current_date, 1755, 'youtube', 'jNQXAC9IVRw', 'es', 'podcast') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('4ec9be09-df12-44a7-b6df-7228897a247f', 'a7611db7-2c06-4a68-812b-ae6652666546') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('7de67ccd-011c-4baa-8307-80c4570bb8ff', '4ec9be09-df12-44a7-b6df-7228897a247f', '16:9', true, 'Brand to Table — Episodio 2', 'es', 0, 'Miniatura del episodio 2 de Brand to Table, con Pau Ferrer');
insert into pin_media (pin_id, media_id, slide_order) values ('7de67ccd-011c-4baa-8307-80c4570bb8ff', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);

-- Brand to Table · Episodio 3: conversación con Elena Vidal
insert into content (id, type, status, default_locale, slug, publish_at) values ('ab9577d9-401f-4b97-b990-83a6f128b6ff', 'episode', 'published', 'es', 'brand-to-table-episodio-3-0412b578', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title, highlight, body) values ('ab9577d9-401f-4b97-b990-83a6f128b6ff', 'es', 'Brand to Table · Episodio 3: conversación con Elena Vidal', 'Elena Vidal, Fundadora, sobre brand to table.', 'Episodio 3 de Brand to Table con Elena Vidal (Fundadora), invitado en representación de Agrolux.') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language, episode_kind) values ('ab9577d9-401f-4b97-b990-83a6f128b6ff', 'brand_to_table', 3, 'Elena Vidal', 'Fundadora', 'Grania', current_date, 1578, 'youtube', 'jNQXAC9IVRw', 'es', 'podcast') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('ab9577d9-401f-4b97-b990-83a6f128b6ff', 'a7611db7-2c06-4a68-812b-ae6652666546') on conflict do nothing;
insert into pin (id, content_id, ratio, show_as_carousel, label, language, queue_order, alt) values ('bad06345-131f-4fac-8a31-3942f09c3a1c', 'ab9577d9-401f-4b97-b990-83a6f128b6ff', '16:9', true, 'Brand to Table — Episodio 3', 'es', 0, 'Miniatura del episodio 3 de Brand to Table, con Elena Vidal');
insert into pin_media (pin_id, media_id, slide_order) values ('bad06345-131f-4fac-8a31-3942f09c3a1c', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

