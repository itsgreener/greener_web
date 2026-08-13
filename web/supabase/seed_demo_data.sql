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
insert into content (id, type, status, default_locale, slug, publish_at) values ('98069cc4-163f-4b5f-baaf-5fe5504eeec6', 'case', 'published', 'es', 'cultiva-bio-1', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('98069cc4-163f-4b5f-baaf-5fe5504eeec6', 'es', 'Cultiva Bio — Eventos') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('98069cc4-163f-4b5f-baaf-5fe5504eeec6', 'B', 2, 'Cultiva Bio', 'Eventos', 'Dirección de arte, señalética, audiovisual', 2026, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('98069cc4-163f-4b5f-baaf-5fe5504eeec6', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('03ba02dd-ad5e-4f10-a6fe-513b03483fea', '98069cc4-163f-4b5f-baaf-5fe5504eeec6', 'fixed', '4:5', 'Cultiva Bio — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Cultiva Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('03ba02dd-ad5e-4f10-a6fe-513b03483fea', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('87047c3c-9b99-4737-b9b0-94490b3a0b49', '98069cc4-163f-4b5f-baaf-5fe5504eeec6', 'fixed', '16:9', 'Cultiva Bio — pieza 2', NULL, 'es', 1, 'Imagen del caso Cultiva Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('87047c3c-9b99-4737-b9b0-94490b3a0b49', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('512412fc-25b5-4288-996f-c42de9fbc3de', '98069cc4-163f-4b5f-baaf-5fe5504eeec6', 'fixed', '9:16', 'Cultiva Bio — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Cultiva Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('512412fc-25b5-4288-996f-c42de9fbc3de', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

-- Vertia Studio
insert into content (id, type, status, default_locale, slug, publish_at) values ('f4c1dbe5-2467-4a31-aa30-31cf007eae95', 'case', 'published', 'es', 'vertia-studio-2', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('f4c1dbe5-2467-4a31-aa30-31cf007eae95', 'es', 'Vertia Studio — Branding y marca') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('f4c1dbe5-2467-4a31-aa30-31cf007eae95', 'A', 1, 'Vertia Studio', 'Branding y marca', 'Estrategia de marca, identidad visual', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('f4c1dbe5-2467-4a31-aa30-31cf007eae95', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('8cb8ffe4-445f-4dd8-beef-50ce9a20c04d', 'f4c1dbe5-2467-4a31-aa30-31cf007eae95', 'fixed', '2:3', 'Vertia Studio — pieza 1', NULL, 'es', 0, 'Imagen del caso Vertia Studio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('8cb8ffe4-445f-4dd8-beef-50ce9a20c04d', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('e1a997f0-0de0-41d7-9364-74a5a654b987', 'f4c1dbe5-2467-4a31-aa30-31cf007eae95', 'fixed', '3:4', 'Vertia Studio — pieza 2', NULL, 'es', 1, 'Imagen del caso Vertia Studio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('e1a997f0-0de0-41d7-9364-74a5a654b987', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('6de273d3-845e-4b45-8e85-025c3854c089', 'f4c1dbe5-2467-4a31-aa30-31cf007eae95', 'fixed', '1:1', 'Vertia Studio — pieza 3', NULL, 'es', 2, 'Imagen del caso Vertia Studio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('6de273d3-845e-4b45-8e85-025c3854c089', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('443b2169-a0f4-4fd4-aa47-e5edd4690673', 'f4c1dbe5-2467-4a31-aa30-31cf007eae95', 'fixed', '1:1', 'Vertia Studio — pieza 4', 'Ver caso', 'es', 3, 'Imagen del caso Vertia Studio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('443b2169-a0f4-4fd4-aa47-e5edd4690673', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('19fe57c5-d0af-4851-9caa-eb54bfda09dc', 'f4c1dbe5-2467-4a31-aa30-31cf007eae95', 'fixed', '16:9', 'Vertia Studio — pieza 5', 'Ver caso', 'es', 4, 'Imagen del caso Vertia Studio, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('19fe57c5-d0af-4851-9caa-eb54bfda09dc', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('b496af54-8cb3-470c-9abb-7c3f6589de34', 'f4c1dbe5-2467-4a31-aa30-31cf007eae95', 'fixed', '3:4', 'Vertia Studio — pieza 6', NULL, 'es', 5, 'Imagen del caso Vertia Studio, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('b496af54-8cb3-470c-9abb-7c3f6589de34', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);

-- Campovía Studio
insert into content (id, type, status, default_locale, slug, publish_at) values ('bc08b4d5-1145-4145-876f-3ad8603f50d7', 'case', 'published', 'es', 'campovia-studio-3', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('bc08b4d5-1145-4145-876f-3ad8603f50d7', 'es', 'Campovía Studio — Eventos') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('bc08b4d5-1145-4145-876f-3ad8603f50d7', 'B', 2, 'Campovía Studio', 'Eventos', 'Dirección de arte, señalética, audiovisual', 2024, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('bc08b4d5-1145-4145-876f-3ad8603f50d7', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('4f64e5e7-a141-4d83-8a04-58f69f75c17e', 'bc08b4d5-1145-4145-876f-3ad8603f50d7', 'fixed', '1:1', 'Campovía Studio — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Campovía Studio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('4f64e5e7-a141-4d83-8a04-58f69f75c17e', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('2eb6db78-761d-4186-9acc-8585ad01cc1d', 'bc08b4d5-1145-4145-876f-3ad8603f50d7', 'fixed', '4:5', 'Campovía Studio — pieza 2', 'Ver caso', 'es', 1, 'Imagen del caso Campovía Studio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('2eb6db78-761d-4186-9acc-8585ad01cc1d', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('f7fa8659-ca7f-4bec-830c-0ec240426bbe', 'bc08b4d5-1145-4145-876f-3ad8603f50d7', 'fixed', '16:9', 'Campovía Studio — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Campovía Studio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('f7fa8659-ca7f-4bec-830c-0ec240426bbe', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('e6835d7c-d60b-4857-bc1d-dd6a6d09361e', 'bc08b4d5-1145-4145-876f-3ad8603f50d7', 'fixed', '1:1', 'Campovía Studio — pieza 4', NULL, 'es', 3, 'Imagen del caso Campovía Studio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('e6835d7c-d60b-4857-bc1d-dd6a6d09361e', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('8cf35e3d-a088-4068-bd84-e0b16b557963', 'bc08b4d5-1145-4145-876f-3ad8603f50d7', 'fixed', '4:5', 'Campovía Studio — pieza 5', 'Saber más', 'es', 4, 'Imagen del caso Campovía Studio, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('8cf35e3d-a088-4068-bd84-e0b16b557963', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('9c75b85c-9eb0-44e2-b9f9-4ee2eef6cd22', 'bc08b4d5-1145-4145-876f-3ad8603f50d7', 'fixed', '2:3', 'Campovía Studio — pieza 6', 'Ver caso', 'es', 5, 'Imagen del caso Campovía Studio, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('9c75b85c-9eb0-44e2-b9f9-4ee2eef6cd22', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Vivara Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('18418a00-5b8a-4b63-9fcd-46e8e8d5c2b0', 'case', 'published', 'es', 'vivara-group-4', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('18418a00-5b8a-4b63-9fcd-46e8e8d5c2b0', 'es', 'Vivara Group — Alimentación') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('18418a00-5b8a-4b63-9fcd-46e8e8d5c2b0', 'B', 3, 'Vivara Group', 'Alimentación', 'Identidad visual, fotografía de producto', 2026, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('18418a00-5b8a-4b63-9fcd-46e8e8d5c2b0', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('f1b70a24-9dc2-434c-be3c-f45f2426750f', '18418a00-5b8a-4b63-9fcd-46e8e8d5c2b0', 'fixed', '4:5', 'Vivara Group — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Vivara Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('f1b70a24-9dc2-434c-be3c-f45f2426750f', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('ffaa733b-2d4b-421a-b3dd-7bd9af017eea', '18418a00-5b8a-4b63-9fcd-46e8e8d5c2b0', 'fixed', '3:4', 'Vivara Group — pieza 2', 'Ver caso', 'es', 1, 'Imagen del caso Vivara Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('ffaa733b-2d4b-421a-b3dd-7bd9af017eea', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('a26ca25a-272e-43ce-b253-5ce714935189', '18418a00-5b8a-4b63-9fcd-46e8e8d5c2b0', 'fixed', '9:16', 'Vivara Group — pieza 3', NULL, 'es', 2, 'Imagen del caso Vivara Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('a26ca25a-272e-43ce-b253-5ce714935189', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('c660eb04-b404-46da-bc16-5e33c699ecb0', '18418a00-5b8a-4b63-9fcd-46e8e8d5c2b0', 'fixed', '9:16', 'Vivara Group — pieza 4', NULL, 'es', 3, 'Imagen del caso Vivara Group, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('c660eb04-b404-46da-bc16-5e33c699ecb0', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('66e2e2f8-225c-447c-b91c-de328c57acb6', '18418a00-5b8a-4b63-9fcd-46e8e8d5c2b0', 'fixed', '3:4', 'Vivara Group — pieza 5', 'Ver caso', 'es', 4, 'Imagen del caso Vivara Group, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('66e2e2f8-225c-447c-b91c-de328c57acb6', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('d9c5fe62-8899-4dbb-ba12-ea40bf28cd33', '18418a00-5b8a-4b63-9fcd-46e8e8d5c2b0', 'fixed', '1:1', 'Vivara Group — pieza 6', 'Saber más', 'es', 5, 'Imagen del caso Vivara Group, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('d9c5fe62-8899-4dbb-ba12-ea40bf28cd33', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Campovía Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('c664cba3-5e64-49c9-a68c-56f381db05e4', 'case', 'published', 'es', 'campovia-group-5', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('c664cba3-5e64-49c9-a68c-56f381db05e4', 'es', 'Campovía Group — Biotecnología') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('c664cba3-5e64-49c9-a68c-56f381db05e4', 'B', 1, 'Campovía Group', 'Biotecnología', 'Naming, branding corporativo, informe anual', 2023, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('c664cba3-5e64-49c9-a68c-56f381db05e4', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('ffb30478-feb0-4f26-9d0a-7d090298acb8', 'c664cba3-5e64-49c9-a68c-56f381db05e4', 'fixed', '3:4', 'Campovía Group — pieza 1', NULL, 'es', 0, 'Imagen del caso Campovía Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('ffb30478-feb0-4f26-9d0a-7d090298acb8', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('2c84ab7e-457d-4fa9-a154-bd732d5b0502', 'c664cba3-5e64-49c9-a68c-56f381db05e4', 'fixed', '9:16', 'Campovía Group — pieza 2', 'Saber más', 'es', 1, 'Imagen del caso Campovía Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('2c84ab7e-457d-4fa9-a154-bd732d5b0502', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('2305fd4a-0e87-4aa7-8319-8a50282aaf68', 'c664cba3-5e64-49c9-a68c-56f381db05e4', 'fixed', '1:1', 'Campovía Group — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Campovía Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('2305fd4a-0e87-4aa7-8319-8a50282aaf68', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('d64ee156-ba14-4559-9c5e-f09993cc2d44', 'c664cba3-5e64-49c9-a68c-56f381db05e4', 'fixed', '2:3', 'Campovía Group — pieza 4', 'Ver caso', 'es', 3, 'Imagen del caso Campovía Group, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('d64ee156-ba14-4559-9c5e-f09993cc2d44', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('517b862c-b461-47e7-b04c-7fde6a736ce8', 'c664cba3-5e64-49c9-a68c-56f381db05e4', 'fixed', '4:5', 'Campovía Group — pieza 5', NULL, 'es', 4, 'Imagen del caso Campovía Group, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('517b862c-b461-47e7-b04c-7fde6a736ce8', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

-- Vivara Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('4c16bf49-6b52-4176-996d-8f5e6badaafb', 'case', 'published', 'es', 'vivara-group-6', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('4c16bf49-6b52-4176-996d-8f5e6badaafb', 'es', 'Vivara Group — Agroalimentario') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('4c16bf49-6b52-4176-996d-8f5e6badaafb', 'B', 4, 'Vivara Group', 'Agroalimentario', 'Branding, packaging, comunicación de campaña', 2023, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('4c16bf49-6b52-4176-996d-8f5e6badaafb', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('7d8e6944-30ad-4e24-b6f6-2c09b496206d', '4c16bf49-6b52-4176-996d-8f5e6badaafb', 'fixed', '4:5', 'Vivara Group — pieza 1', NULL, 'es', 0, 'Imagen del caso Vivara Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('7d8e6944-30ad-4e24-b6f6-2c09b496206d', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('026868e0-0a38-42e5-9875-47dd6542b99a', '4c16bf49-6b52-4176-996d-8f5e6badaafb', 'fixed', '1:1', 'Vivara Group — pieza 2', NULL, 'es', 1, 'Imagen del caso Vivara Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('026868e0-0a38-42e5-9875-47dd6542b99a', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('31ce1943-3380-40fe-80b4-cc4702446f9a', '4c16bf49-6b52-4176-996d-8f5e6badaafb', 'fixed', '9:16', 'Vivara Group — pieza 3', NULL, 'es', 2, 'Imagen del caso Vivara Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('31ce1943-3380-40fe-80b4-cc4702446f9a', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('81f1344a-756d-404c-8483-40187fe8ded3', '4c16bf49-6b52-4176-996d-8f5e6badaafb', 'fixed', '4:5', 'Vivara Group — pieza 4', 'Ver caso', 'es', 3, 'Imagen del caso Vivara Group, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('81f1344a-756d-404c-8483-40187fe8ded3', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

-- Semilla Labs
insert into content (id, type, status, default_locale, slug, publish_at) values ('5d081614-8e53-4846-b1f5-3fee768ec649', 'case', 'published', 'es', 'semilla-labs-7', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('5d081614-8e53-4846-b1f5-3fee768ec649', 'es', 'Semilla Labs — Digital') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('5d081614-8e53-4846-b1f5-3fee768ec649', 'A', 3, 'Semilla Labs', 'Digital', 'Diseño digital, desarrollo web', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('5d081614-8e53-4846-b1f5-3fee768ec649', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('a27e6b9a-268c-4f52-9cfe-2d109c3af520', '5d081614-8e53-4846-b1f5-3fee768ec649', 'fixed', '2:3', 'Semilla Labs — pieza 1', NULL, 'es', 0, 'Imagen del caso Semilla Labs, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('a27e6b9a-268c-4f52-9cfe-2d109c3af520', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('deb0a0b9-e877-4298-93a6-09a28f59cd5f', '5d081614-8e53-4846-b1f5-3fee768ec649', 'fixed', '9:16', 'Semilla Labs — pieza 2', NULL, 'es', 1, 'Imagen del caso Semilla Labs, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('deb0a0b9-e877-4298-93a6-09a28f59cd5f', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('5a7b992f-d384-47f2-814d-16fc2e480b53', '5d081614-8e53-4846-b1f5-3fee768ec649', 'fixed', '9:16', 'Semilla Labs — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Semilla Labs, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('5a7b992f-d384-47f2-814d-16fc2e480b53', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('c6def08b-4e83-4ffc-bd73-5d7bb5684f39', '5d081614-8e53-4846-b1f5-3fee768ec649', 'fixed', '3:4', 'Semilla Labs — pieza 4', 'Saber más', 'es', 3, 'Imagen del caso Semilla Labs, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('c6def08b-4e83-4ffc-bd73-5d7bb5684f39', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Vivara Bio
insert into content (id, type, status, default_locale, slug, publish_at) values ('54aa1fa7-d45d-4d92-a4f4-ab92617ee5b8', 'case', 'published', 'es', 'vivara-bio-8', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('54aa1fa7-d45d-4d92-a4f4-ab92617ee5b8', 'es', 'Vivara Bio — Biotecnología') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('54aa1fa7-d45d-4d92-a4f4-ab92617ee5b8', 'A', 3, 'Vivara Bio', 'Biotecnología', 'Naming, branding corporativo, informe anual', 2026, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('54aa1fa7-d45d-4d92-a4f4-ab92617ee5b8', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('f30b63a6-3122-4e57-b41e-5b4724a132b8', '54aa1fa7-d45d-4d92-a4f4-ab92617ee5b8', 'fixed', '1:1', 'Vivara Bio — pieza 1', NULL, 'es', 0, 'Imagen del caso Vivara Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('f30b63a6-3122-4e57-b41e-5b4724a132b8', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('0e6f77e2-2265-4401-a764-70194ae325b4', '54aa1fa7-d45d-4d92-a4f4-ab92617ee5b8', 'fixed', '4:5', 'Vivara Bio — pieza 2', NULL, 'es', 1, 'Imagen del caso Vivara Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('0e6f77e2-2265-4401-a764-70194ae325b4', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('ad2c91dc-6dad-46fc-b8f6-a5c97f0ba342', '54aa1fa7-d45d-4d92-a4f4-ab92617ee5b8', 'fixed', '2:3', 'Vivara Bio — pieza 3', 'Saber más', 'es', 2, 'Imagen del caso Vivara Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('ad2c91dc-6dad-46fc-b8f6-a5c97f0ba342', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('57e6e8ac-6060-48ea-b14e-bdff25993065', '54aa1fa7-d45d-4d92-a4f4-ab92617ee5b8', 'fixed', '16:9', 'Vivara Bio — pieza 4', 'Saber más', 'es', 3, 'Imagen del caso Vivara Bio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('57e6e8ac-6060-48ea-b14e-bdff25993065', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Fontal Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('970ec4e0-5414-4418-876e-a8bfe8c5fd95', 'case', 'published', 'es', 'fontal-group-9', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('970ec4e0-5414-4418-876e-a8bfe8c5fd95', 'es', 'Fontal Group — Branding y marca') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('970ec4e0-5414-4418-876e-a8bfe8c5fd95', 'C', 1, 'Fontal Group', 'Branding y marca', 'Estrategia de marca, identidad visual', 2024, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('970ec4e0-5414-4418-876e-a8bfe8c5fd95', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('fd73600b-6923-4256-abe8-756e93801122', '970ec4e0-5414-4418-876e-a8bfe8c5fd95', 'fixed', '2:3', 'Fontal Group — pieza 1', 'Saber más', 'es', 0, 'Imagen del caso Fontal Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('fd73600b-6923-4256-abe8-756e93801122', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('a774b1c6-9c38-41a7-a41b-5f06bfd0824a', '970ec4e0-5414-4418-876e-a8bfe8c5fd95', 'fixed', '4:5', 'Fontal Group — pieza 2', NULL, 'es', 1, 'Imagen del caso Fontal Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('a774b1c6-9c38-41a7-a41b-5f06bfd0824a', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('4fe49ef7-ff16-488b-ac75-f27ace8ad304', '970ec4e0-5414-4418-876e-a8bfe8c5fd95', 'fixed', '16:9', 'Fontal Group — pieza 3', NULL, 'es', 2, 'Imagen del caso Fontal Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('4fe49ef7-ff16-488b-ac75-f27ace8ad304', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('995dfc4d-ea20-4006-9668-f80f86083bf7', '970ec4e0-5414-4418-876e-a8bfe8c5fd95', 'fixed', '16:9', 'Fontal Group — pieza 4', 'Saber más', 'es', 3, 'Imagen del caso Fontal Group, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('995dfc4d-ea20-4006-9668-f80f86083bf7', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('a29ccf46-1ca8-40c8-949f-75b24f78f9b9', '970ec4e0-5414-4418-876e-a8bfe8c5fd95', 'fixed', '3:4', 'Fontal Group — pieza 5', 'Saber más', 'es', 4, 'Imagen del caso Fontal Group, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('a29ccf46-1ca8-40c8-949f-75b24f78f9b9', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);

-- Cultiva
insert into content (id, type, status, default_locale, slug, publish_at) values ('e3ce3b9a-d371-42b4-99b5-7f38e894d88f', 'case', 'published', 'es', 'cultiva-10', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('e3ce3b9a-d371-42b4-99b5-7f38e894d88f', 'es', 'Cultiva — Branding y marca') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('e3ce3b9a-d371-42b4-99b5-7f38e894d88f', 'B', 2, 'Cultiva', 'Branding y marca', 'Estrategia de marca, identidad visual', 2022, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('e3ce3b9a-d371-42b4-99b5-7f38e894d88f', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('0adeda7d-b3ec-4e1c-b0e6-9c5e5147d46e', 'e3ce3b9a-d371-42b4-99b5-7f38e894d88f', 'fixed', '2:3', 'Cultiva — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Cultiva, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('0adeda7d-b3ec-4e1c-b0e6-9c5e5147d46e', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('10ed61d7-a0ed-42a7-ba54-5604f2e291f0', 'e3ce3b9a-d371-42b4-99b5-7f38e894d88f', 'fixed', '4:5', 'Cultiva — pieza 2', 'Saber más', 'es', 1, 'Imagen del caso Cultiva, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('10ed61d7-a0ed-42a7-ba54-5604f2e291f0', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('0e342ff0-d12b-4b26-a2c6-377830a6124f', 'e3ce3b9a-d371-42b4-99b5-7f38e894d88f', 'fixed', '3:4', 'Cultiva — pieza 3', 'Saber más', 'es', 2, 'Imagen del caso Cultiva, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('0e342ff0-d12b-4b26-a2c6-377830a6124f', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('c4457070-3bd0-405b-b270-8389075eebca', 'e3ce3b9a-d371-42b4-99b5-7f38e894d88f', 'fixed', '1:1', 'Cultiva — pieza 4', 'Saber más', 'es', 3, 'Imagen del caso Cultiva, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('c4457070-3bd0-405b-b270-8389075eebca', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('efdc6d75-c555-4e6e-beed-18d68436aed0', 'e3ce3b9a-d371-42b4-99b5-7f38e894d88f', 'fixed', '9:16', 'Cultiva — pieza 5', 'Saber más', 'es', 4, 'Imagen del caso Cultiva, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('efdc6d75-c555-4e6e-beed-18d68436aed0', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

-- Solvex Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('14b6646c-0b05-44e6-be44-d845daaf2d4e', 'case', 'published', 'es', 'solvex-foods-11', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('14b6646c-0b05-44e6-be44-d845daaf2d4e', 'es', 'Solvex Foods — Branding y marca') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('14b6646c-0b05-44e6-be44-d845daaf2d4e', 'A', 1, 'Solvex Foods', 'Branding y marca', 'Estrategia de marca, identidad visual', 2022, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('14b6646c-0b05-44e6-be44-d845daaf2d4e', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('aadef1fb-792b-44f1-a09c-2f043d6d7a10', '14b6646c-0b05-44e6-be44-d845daaf2d4e', 'fixed', '9:16', 'Solvex Foods — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Solvex Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('aadef1fb-792b-44f1-a09c-2f043d6d7a10', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('ba889e06-b596-4fa3-8670-c2cb3495a41e', '14b6646c-0b05-44e6-be44-d845daaf2d4e', 'fixed', '3:4', 'Solvex Foods — pieza 2', 'Saber más', 'es', 1, 'Imagen del caso Solvex Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('ba889e06-b596-4fa3-8670-c2cb3495a41e', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('84ea9f44-5237-4600-a406-a3eeecff39d5', '14b6646c-0b05-44e6-be44-d845daaf2d4e', 'fixed', '2:3', 'Solvex Foods — pieza 3', 'Saber más', 'es', 2, 'Imagen del caso Solvex Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('84ea9f44-5237-4600-a406-a3eeecff39d5', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('16d9cda3-ce55-4344-b85d-245f2b33752b', '14b6646c-0b05-44e6-be44-d845daaf2d4e', 'fixed', '1:1', 'Solvex Foods — pieza 4', NULL, 'es', 3, 'Imagen del caso Solvex Foods, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('16d9cda3-ce55-4344-b85d-245f2b33752b', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Semilla Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('93b7e866-964d-4e7b-8968-b2c82e3f1e9c', 'case', 'published', 'es', 'semilla-group-12', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('93b7e866-964d-4e7b-8968-b2c82e3f1e9c', 'es', 'Semilla Group — Branding y marca') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('93b7e866-964d-4e7b-8968-b2c82e3f1e9c', 'B', 1, 'Semilla Group', 'Branding y marca', 'Estrategia de marca, identidad visual', 2022, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('93b7e866-964d-4e7b-8968-b2c82e3f1e9c', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('ceaac87e-c01b-4847-83ac-ba22db03c2ed', '93b7e866-964d-4e7b-8968-b2c82e3f1e9c', 'fixed', '4:5', 'Semilla Group — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Semilla Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('ceaac87e-c01b-4847-83ac-ba22db03c2ed', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('db177f87-1cf3-4379-9b0b-31a1c9ae6c08', '93b7e866-964d-4e7b-8968-b2c82e3f1e9c', 'fixed', '2:3', 'Semilla Group — pieza 2', 'Ver caso', 'es', 1, 'Imagen del caso Semilla Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('db177f87-1cf3-4379-9b0b-31a1c9ae6c08', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('810a5835-ff50-48e8-88bb-28abcebe9ae1', '93b7e866-964d-4e7b-8968-b2c82e3f1e9c', 'fixed', '1:1', 'Semilla Group — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Semilla Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('810a5835-ff50-48e8-88bb-28abcebe9ae1', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);

-- Fontal Co.
insert into content (id, type, status, default_locale, slug, publish_at) values ('29be83c8-e0de-4fe2-8f90-6df5bb16a8a1', 'case', 'published', 'es', 'fontal-co-13', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('29be83c8-e0de-4fe2-8f90-6df5bb16a8a1', 'es', 'Fontal Co. — Alimentación') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('29be83c8-e0de-4fe2-8f90-6df5bb16a8a1', 'A', 4, 'Fontal Co.', 'Alimentación', 'Identidad visual, fotografía de producto', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('29be83c8-e0de-4fe2-8f90-6df5bb16a8a1', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('ced50791-9f4a-4a6e-9f71-e86a66cd9ea1', '29be83c8-e0de-4fe2-8f90-6df5bb16a8a1', 'fixed', '2:3', 'Fontal Co. — pieza 1', NULL, 'es', 0, 'Imagen del caso Fontal Co., pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('ced50791-9f4a-4a6e-9f71-e86a66cd9ea1', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('75811630-361f-4b1d-b287-6dbf04278ccd', '29be83c8-e0de-4fe2-8f90-6df5bb16a8a1', 'fixed', '2:3', 'Fontal Co. — pieza 2', NULL, 'es', 1, 'Imagen del caso Fontal Co., pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('75811630-361f-4b1d-b287-6dbf04278ccd', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('d18ec631-08eb-4717-a37a-a79cc54ae4f6', '29be83c8-e0de-4fe2-8f90-6df5bb16a8a1', 'fixed', '3:4', 'Fontal Co. — pieza 3', 'Saber más', 'es', 2, 'Imagen del caso Fontal Co., pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('d18ec631-08eb-4717-a37a-a79cc54ae4f6', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('079101ef-41a6-4ccf-ab07-cc9c052d647b', '29be83c8-e0de-4fe2-8f90-6df5bb16a8a1', 'fixed', '2:3', 'Fontal Co. — pieza 4', 'Ver caso', 'es', 3, 'Imagen del caso Fontal Co., pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('079101ef-41a6-4ccf-ab07-cc9c052d647b', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('054ea338-5a66-4afb-82c8-e4c0a32d7022', '29be83c8-e0de-4fe2-8f90-6df5bb16a8a1', 'fixed', '4:5', 'Fontal Co. — pieza 5', NULL, 'es', 4, 'Imagen del caso Fontal Co., pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('054ea338-5a66-4afb-82c8-e4c0a32d7022', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('7a4584d8-edc9-496c-b4e7-536343cad1c3', '29be83c8-e0de-4fe2-8f90-6df5bb16a8a1', 'fixed', '16:9', 'Fontal Co. — pieza 6', 'Ver caso', 'es', 5, 'Imagen del caso Fontal Co., pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('7a4584d8-edc9-496c-b4e7-536343cad1c3', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

-- Grania Bio
insert into content (id, type, status, default_locale, slug, publish_at) values ('9d906757-b5bd-47e2-bbb0-b221f7011c96', 'case', 'published', 'es', 'grania-bio-14', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('9d906757-b5bd-47e2-bbb0-b221f7011c96', 'es', 'Grania Bio — Digital') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('9d906757-b5bd-47e2-bbb0-b221f7011c96', 'C', 1, 'Grania Bio', 'Digital', 'Diseño digital, desarrollo web', 2023, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('9d906757-b5bd-47e2-bbb0-b221f7011c96', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('cd2cb63d-0a53-4767-99e5-f3734c9d4eb4', '9d906757-b5bd-47e2-bbb0-b221f7011c96', 'fixed', '3:4', 'Grania Bio — pieza 1', NULL, 'es', 0, 'Imagen del caso Grania Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('cd2cb63d-0a53-4767-99e5-f3734c9d4eb4', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('24a8e943-af4e-4b9b-b72f-43cf7f2266f2', '9d906757-b5bd-47e2-bbb0-b221f7011c96', 'fixed', '2:3', 'Grania Bio — pieza 2', NULL, 'es', 1, 'Imagen del caso Grania Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('24a8e943-af4e-4b9b-b72f-43cf7f2266f2', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('cc87f9a7-3572-470b-a290-0236e58a4d87', '9d906757-b5bd-47e2-bbb0-b221f7011c96', 'fixed', '1:1', 'Grania Bio — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Grania Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('cc87f9a7-3572-470b-a290-0236e58a4d87', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

-- Fontal Labs
insert into content (id, type, status, default_locale, slug, publish_at) values ('4a7b40d3-9140-4dfb-a4f6-258c31e5fc1d', 'case', 'published', 'es', 'fontal-labs-15', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('4a7b40d3-9140-4dfb-a4f6-258c31e5fc1d', 'es', 'Fontal Labs — Alimentación') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('4a7b40d3-9140-4dfb-a4f6-258c31e5fc1d', 'B', 2, 'Fontal Labs', 'Alimentación', 'Identidad visual, fotografía de producto', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('4a7b40d3-9140-4dfb-a4f6-258c31e5fc1d', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('0632de78-a97b-4bbd-a97f-4eac493b726e', '4a7b40d3-9140-4dfb-a4f6-258c31e5fc1d', 'fixed', '3:4', 'Fontal Labs — pieza 1', NULL, 'es', 0, 'Imagen del caso Fontal Labs, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('0632de78-a97b-4bbd-a97f-4eac493b726e', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('de27a277-b8f9-4c47-98d2-35c1e547ea8c', '4a7b40d3-9140-4dfb-a4f6-258c31e5fc1d', 'fixed', '2:3', 'Fontal Labs — pieza 2', 'Ver caso', 'es', 1, 'Imagen del caso Fontal Labs, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('de27a277-b8f9-4c47-98d2-35c1e547ea8c', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('8bb43cc7-0c17-4ea2-96e0-aca83e4ffdc9', '4a7b40d3-9140-4dfb-a4f6-258c31e5fc1d', 'fixed', '9:16', 'Fontal Labs — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Fontal Labs, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('8bb43cc7-0c17-4ea2-96e0-aca83e4ffdc9', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

-- Fontal Bio
insert into content (id, type, status, default_locale, slug, publish_at) values ('b6a8b855-383f-4720-a310-48fa1fc83e21', 'case', 'published', 'es', 'fontal-bio-16', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('b6a8b855-383f-4720-a310-48fa1fc83e21', 'es', 'Fontal Bio — Alimentación') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('b6a8b855-383f-4720-a310-48fa1fc83e21', 'C', 1, 'Fontal Bio', 'Alimentación', 'Identidad visual, fotografía de producto', 2024, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('b6a8b855-383f-4720-a310-48fa1fc83e21', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('bdbbd1da-0da1-4b01-aec8-af71cf0b86b6', 'b6a8b855-383f-4720-a310-48fa1fc83e21', 'fixed', '4:5', 'Fontal Bio — pieza 1', NULL, 'es', 0, 'Imagen del caso Fontal Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('bdbbd1da-0da1-4b01-aec8-af71cf0b86b6', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('6a73d366-1b9d-4d1d-8aa5-671618e70ab1', 'b6a8b855-383f-4720-a310-48fa1fc83e21', 'fixed', '16:9', 'Fontal Bio — pieza 2', 'Saber más', 'es', 1, 'Imagen del caso Fontal Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('6a73d366-1b9d-4d1d-8aa5-671618e70ab1', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('4c31b324-b2b4-44a2-8326-3d18570daafd', 'b6a8b855-383f-4720-a310-48fa1fc83e21', 'fixed', '1:1', 'Fontal Bio — pieza 3', NULL, 'es', 2, 'Imagen del caso Fontal Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('4c31b324-b2b4-44a2-8326-3d18570daafd', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('388b40f9-2997-4d4f-9634-5582d8e3a5b2', 'b6a8b855-383f-4720-a310-48fa1fc83e21', 'fixed', '9:16', 'Fontal Bio — pieza 4', NULL, 'es', 3, 'Imagen del caso Fontal Bio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('388b40f9-2997-4d4f-9634-5582d8e3a5b2', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('52117317-0849-41b1-b49e-45f8e5334fba', 'b6a8b855-383f-4720-a310-48fa1fc83e21', 'fixed', '4:5', 'Fontal Bio — pieza 5', 'Ver caso', 'es', 4, 'Imagen del caso Fontal Bio, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('52117317-0849-41b1-b49e-45f8e5334fba', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('a1c1964e-8390-4a55-a568-1455a3a76c02', 'b6a8b855-383f-4720-a310-48fa1fc83e21', 'fixed', '2:3', 'Fontal Bio — pieza 6', 'Ver caso', 'es', 5, 'Imagen del caso Fontal Bio, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('a1c1964e-8390-4a55-a568-1455a3a76c02', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Campovía Bio
insert into content (id, type, status, default_locale, slug, publish_at) values ('1698e738-3efc-4fc9-9642-bc94df1a51ff', 'case', 'published', 'es', 'campovia-bio-17', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('1698e738-3efc-4fc9-9642-bc94df1a51ff', 'es', 'Campovía Bio — Biotecnología') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('1698e738-3efc-4fc9-9642-bc94df1a51ff', 'C', 2, 'Campovía Bio', 'Biotecnología', 'Naming, branding corporativo, informe anual', 2024, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('1698e738-3efc-4fc9-9642-bc94df1a51ff', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('a5cc7a01-128c-4576-871c-d780ab390b04', '1698e738-3efc-4fc9-9642-bc94df1a51ff', 'fixed', '1:1', 'Campovía Bio — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Campovía Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('a5cc7a01-128c-4576-871c-d780ab390b04', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('352e68dd-020f-4fb3-b1eb-60bbf8cbd745', '1698e738-3efc-4fc9-9642-bc94df1a51ff', 'fixed', '3:4', 'Campovía Bio — pieza 2', NULL, 'es', 1, 'Imagen del caso Campovía Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('352e68dd-020f-4fb3-b1eb-60bbf8cbd745', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('999b40e1-42d4-462c-b91d-d984bfe31164', '1698e738-3efc-4fc9-9642-bc94df1a51ff', 'fixed', '1:1', 'Campovía Bio — pieza 3', NULL, 'es', 2, 'Imagen del caso Campovía Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('999b40e1-42d4-462c-b91d-d984bfe31164', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('88f9a646-c6d5-4751-bac7-b570437fead9', '1698e738-3efc-4fc9-9642-bc94df1a51ff', 'fixed', '16:9', 'Campovía Bio — pieza 4', 'Ver caso', 'es', 3, 'Imagen del caso Campovía Bio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('88f9a646-c6d5-4751-bac7-b570437fead9', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);

-- Raizen Labs
insert into content (id, type, status, default_locale, slug, publish_at) values ('058e0420-1266-4707-93b9-90d17138f524', 'case', 'published', 'es', 'raizen-labs-18', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('058e0420-1266-4707-93b9-90d17138f524', 'es', 'Raizen Labs — Eventos') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('058e0420-1266-4707-93b9-90d17138f524', 'B', 3, 'Raizen Labs', 'Eventos', 'Dirección de arte, señalética, audiovisual', 2024, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('058e0420-1266-4707-93b9-90d17138f524', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('571fa352-97eb-4cff-81c9-5ff0c59be1b0', '058e0420-1266-4707-93b9-90d17138f524', 'fixed', '9:16', 'Raizen Labs — pieza 1', 'Saber más', 'es', 0, 'Imagen del caso Raizen Labs, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('571fa352-97eb-4cff-81c9-5ff0c59be1b0', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('fb4fa7ad-b90d-439c-9aa5-e161036fa325', '058e0420-1266-4707-93b9-90d17138f524', 'fixed', '9:16', 'Raizen Labs — pieza 2', NULL, 'es', 1, 'Imagen del caso Raizen Labs, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('fb4fa7ad-b90d-439c-9aa5-e161036fa325', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('08943259-3e9d-4d8d-9d0c-01c799a8c6e8', '058e0420-1266-4707-93b9-90d17138f524', 'fixed', '16:9', 'Raizen Labs — pieza 3', 'Saber más', 'es', 2, 'Imagen del caso Raizen Labs, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('08943259-3e9d-4d8d-9d0c-01c799a8c6e8', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('7b8bb6be-47f9-4182-99bd-afc867e6604a', '058e0420-1266-4707-93b9-90d17138f524', 'fixed', '3:4', 'Raizen Labs — pieza 4', 'Ver caso', 'es', 3, 'Imagen del caso Raizen Labs, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('7b8bb6be-47f9-4182-99bd-afc867e6604a', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('76039d03-f65a-45f1-8143-304ef8e72bf3', '058e0420-1266-4707-93b9-90d17138f524', 'fixed', '16:9', 'Raizen Labs — pieza 5', NULL, 'es', 4, 'Imagen del caso Raizen Labs, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('76039d03-f65a-45f1-8143-304ef8e72bf3', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);

-- Florent Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('a2c4aba6-5047-40a3-bfc5-547de3467dc4', 'case', 'published', 'es', 'florent-group-19', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('a2c4aba6-5047-40a3-bfc5-547de3467dc4', 'es', 'Florent Group — Alimentación') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('a2c4aba6-5047-40a3-bfc5-547de3467dc4', 'A', 2, 'Florent Group', 'Alimentación', 'Identidad visual, fotografía de producto', 2026, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('a2c4aba6-5047-40a3-bfc5-547de3467dc4', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('1b1ebcaf-1916-4558-8853-5d2bcbff9218', 'a2c4aba6-5047-40a3-bfc5-547de3467dc4', 'fixed', '4:5', 'Florent Group — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Florent Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('1b1ebcaf-1916-4558-8853-5d2bcbff9218', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('fd0dde07-9cd9-437b-adb8-dfe199b1fada', 'a2c4aba6-5047-40a3-bfc5-547de3467dc4', 'fixed', '2:3', 'Florent Group — pieza 2', NULL, 'es', 1, 'Imagen del caso Florent Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('fd0dde07-9cd9-437b-adb8-dfe199b1fada', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('df051e61-1e38-48ec-87ec-2d057630931e', 'a2c4aba6-5047-40a3-bfc5-547de3467dc4', 'fixed', '1:1', 'Florent Group — pieza 3', NULL, 'es', 2, 'Imagen del caso Florent Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('df051e61-1e38-48ec-87ec-2d057630931e', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('607a68c5-860f-4eb5-8f85-b0115c432876', 'a2c4aba6-5047-40a3-bfc5-547de3467dc4', 'fixed', '1:1', 'Florent Group — pieza 4', NULL, 'es', 3, 'Imagen del caso Florent Group, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('607a68c5-860f-4eb5-8f85-b0115c432876', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);

-- Fontal Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('4ed3d917-7ba8-4d46-8463-e0cc51caa313', 'case', 'published', 'es', 'fontal-foods-20', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('4ed3d917-7ba8-4d46-8463-e0cc51caa313', 'es', 'Fontal Foods — Branding y marca') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('4ed3d917-7ba8-4d46-8463-e0cc51caa313', 'B', 2, 'Fontal Foods', 'Branding y marca', 'Estrategia de marca, identidad visual', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('4ed3d917-7ba8-4d46-8463-e0cc51caa313', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('9737c763-970a-494f-bfef-bada2236538e', '4ed3d917-7ba8-4d46-8463-e0cc51caa313', 'fixed', '16:9', 'Fontal Foods — pieza 1', 'Saber más', 'es', 0, 'Imagen del caso Fontal Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('9737c763-970a-494f-bfef-bada2236538e', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('223604e2-d223-4694-881e-51e63a0d5c46', '4ed3d917-7ba8-4d46-8463-e0cc51caa313', 'fixed', '1:1', 'Fontal Foods — pieza 2', NULL, 'es', 1, 'Imagen del caso Fontal Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('223604e2-d223-4694-881e-51e63a0d5c46', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('b408a525-1b71-4c4a-a3b6-cbf4cd23a00a', '4ed3d917-7ba8-4d46-8463-e0cc51caa313', 'fixed', '3:4', 'Fontal Foods — pieza 3', NULL, 'es', 2, 'Imagen del caso Fontal Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('b408a525-1b71-4c4a-a3b6-cbf4cd23a00a', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Estival Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('ae022095-3d0c-41fa-a3ce-9eb45d7ca284', 'case', 'published', 'es', 'estival-foods-21', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('ae022095-3d0c-41fa-a3ce-9eb45d7ca284', 'es', 'Estival Foods — Eventos') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('ae022095-3d0c-41fa-a3ce-9eb45d7ca284', 'B', 1, 'Estival Foods', 'Eventos', 'Dirección de arte, señalética, audiovisual', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('ae022095-3d0c-41fa-a3ce-9eb45d7ca284', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('f3f83a68-c8f1-4af8-a104-9bd08cd28f0b', 'ae022095-3d0c-41fa-a3ce-9eb45d7ca284', 'fixed', '16:9', 'Estival Foods — pieza 1', NULL, 'es', 0, 'Imagen del caso Estival Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('f3f83a68-c8f1-4af8-a104-9bd08cd28f0b', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('e4cefbfa-874f-4598-9e98-e68cf47d5764', 'ae022095-3d0c-41fa-a3ce-9eb45d7ca284', 'fixed', '16:9', 'Estival Foods — pieza 2', 'Ver caso', 'es', 1, 'Imagen del caso Estival Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('e4cefbfa-874f-4598-9e98-e68cf47d5764', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('8117da14-ed0e-4948-8b42-511fc6762bd0', 'ae022095-3d0c-41fa-a3ce-9eb45d7ca284', 'fixed', '2:3', 'Estival Foods — pieza 3', NULL, 'es', 2, 'Imagen del caso Estival Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('8117da14-ed0e-4948-8b42-511fc6762bd0', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('cf4ceaa9-86ac-4783-81db-9ed7c9afeb7d', 'ae022095-3d0c-41fa-a3ce-9eb45d7ca284', 'fixed', '2:3', 'Estival Foods — pieza 4', NULL, 'es', 3, 'Imagen del caso Estival Foods, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('cf4ceaa9-86ac-4783-81db-9ed7c9afeb7d', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);

-- Vertia Labs
insert into content (id, type, status, default_locale, slug, publish_at) values ('dee0affe-fafc-45c3-9deb-a5fdb2656163', 'case', 'published', 'es', 'vertia-labs-22', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('dee0affe-fafc-45c3-9deb-a5fdb2656163', 'es', 'Vertia Labs — Biotecnología') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('dee0affe-fafc-45c3-9deb-a5fdb2656163', 'C', 1, 'Vertia Labs', 'Biotecnología', 'Naming, branding corporativo, informe anual', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('dee0affe-fafc-45c3-9deb-a5fdb2656163', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('b77cad4c-0143-4475-a1c8-25d263a7d74a', 'dee0affe-fafc-45c3-9deb-a5fdb2656163', 'fixed', '16:9', 'Vertia Labs — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Vertia Labs, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('b77cad4c-0143-4475-a1c8-25d263a7d74a', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('daad4bb3-f699-4a08-9db0-dba32b95b330', 'dee0affe-fafc-45c3-9deb-a5fdb2656163', 'fixed', '9:16', 'Vertia Labs — pieza 2', 'Saber más', 'es', 1, 'Imagen del caso Vertia Labs, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('daad4bb3-f699-4a08-9db0-dba32b95b330', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('2551807f-9429-4d88-bee2-4585433d6a31', 'dee0affe-fafc-45c3-9deb-a5fdb2656163', 'fixed', '4:5', 'Vertia Labs — pieza 3', 'Saber más', 'es', 2, 'Imagen del caso Vertia Labs, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('2551807f-9429-4d88-bee2-4585433d6a31', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('acde89a5-a380-4def-ba1b-6819eb94832d', 'dee0affe-fafc-45c3-9deb-a5fdb2656163', 'fixed', '4:5', 'Vertia Labs — pieza 4', 'Ver caso', 'es', 3, 'Imagen del caso Vertia Labs, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('acde89a5-a380-4def-ba1b-6819eb94832d', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('c8b2c992-1f00-40b8-be49-1b05dc8b12d7', 'dee0affe-fafc-45c3-9deb-a5fdb2656163', 'fixed', '1:1', 'Vertia Labs — pieza 5', 'Saber más', 'es', 4, 'Imagen del caso Vertia Labs, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('c8b2c992-1f00-40b8-be49-1b05dc8b12d7', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);

-- Solvex Bio
insert into content (id, type, status, default_locale, slug, publish_at) values ('a1c1677e-2298-46e7-aced-69027dfc649a', 'case', 'published', 'es', 'solvex-bio-23', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('a1c1677e-2298-46e7-aced-69027dfc649a', 'es', 'Solvex Bio — Eventos') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('a1c1677e-2298-46e7-aced-69027dfc649a', 'A', 2, 'Solvex Bio', 'Eventos', 'Dirección de arte, señalética, audiovisual', 2026, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('a1c1677e-2298-46e7-aced-69027dfc649a', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('5ff8e738-f8f9-4b7f-9980-d794c5f94747', 'a1c1677e-2298-46e7-aced-69027dfc649a', 'fixed', '3:4', 'Solvex Bio — pieza 1', NULL, 'es', 0, 'Imagen del caso Solvex Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('5ff8e738-f8f9-4b7f-9980-d794c5f94747', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('40345e13-f506-4459-befe-40ac28355339', 'a1c1677e-2298-46e7-aced-69027dfc649a', 'fixed', '3:4', 'Solvex Bio — pieza 2', NULL, 'es', 1, 'Imagen del caso Solvex Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('40345e13-f506-4459-befe-40ac28355339', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('43076269-9284-4212-9f98-3e27e92f22b0', 'a1c1677e-2298-46e7-aced-69027dfc649a', 'fixed', '4:5', 'Solvex Bio — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Solvex Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('43076269-9284-4212-9f98-3e27e92f22b0', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('c12c7bb0-d3c0-4069-a8e3-79fb1a476523', 'a1c1677e-2298-46e7-aced-69027dfc649a', 'fixed', '3:4', 'Solvex Bio — pieza 4', NULL, 'es', 3, 'Imagen del caso Solvex Bio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('c12c7bb0-d3c0-4069-a8e3-79fb1a476523', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Solvex
insert into content (id, type, status, default_locale, slug, publish_at) values ('d2c59988-33c3-4c7e-9ad2-66f40cfed09f', 'case', 'published', 'es', 'solvex-24', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('d2c59988-33c3-4c7e-9ad2-66f40cfed09f', 'es', 'Solvex — Digital') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('d2c59988-33c3-4c7e-9ad2-66f40cfed09f', 'A', 1, 'Solvex', 'Digital', 'Diseño digital, desarrollo web', 2026, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('d2c59988-33c3-4c7e-9ad2-66f40cfed09f', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('b3fdd14e-619f-4a9c-b3dc-5a83e1f0ca85', 'd2c59988-33c3-4c7e-9ad2-66f40cfed09f', 'fixed', '4:5', 'Solvex — pieza 1', 'Saber más', 'es', 0, 'Imagen del caso Solvex, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('b3fdd14e-619f-4a9c-b3dc-5a83e1f0ca85', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('f9bb5ab0-0165-4497-8f7c-d243f8a66ce3', 'd2c59988-33c3-4c7e-9ad2-66f40cfed09f', 'fixed', '16:9', 'Solvex — pieza 2', 'Saber más', 'es', 1, 'Imagen del caso Solvex, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('f9bb5ab0-0165-4497-8f7c-d243f8a66ce3', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('04b65bca-6d23-4e93-ac34-a7829130c969', 'd2c59988-33c3-4c7e-9ad2-66f40cfed09f', 'fixed', '16:9', 'Solvex — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Solvex, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('04b65bca-6d23-4e93-ac34-a7829130c969', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('692af5f5-def9-44b4-963a-ed05f8454d48', 'd2c59988-33c3-4c7e-9ad2-66f40cfed09f', 'fixed', '3:4', 'Solvex — pieza 4', 'Saber más', 'es', 3, 'Imagen del caso Solvex, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('692af5f5-def9-44b4-963a-ed05f8454d48', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('e6c162c1-188f-4efe-bbf7-ee4032ffb457', 'd2c59988-33c3-4c7e-9ad2-66f40cfed09f', 'fixed', '2:3', 'Solvex — pieza 5', NULL, 'es', 4, 'Imagen del caso Solvex, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('e6c162c1-188f-4efe-bbf7-ee4032ffb457', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);

-- Olivara Farms
insert into content (id, type, status, default_locale, slug, publish_at) values ('76f363ce-0ca0-4913-8789-6a54e18f76d7', 'case', 'published', 'es', 'olivara-farms-25', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('76f363ce-0ca0-4913-8789-6a54e18f76d7', 'es', 'Olivara Farms — Digital') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('76f363ce-0ca0-4913-8789-6a54e18f76d7', 'A', 2, 'Olivara Farms', 'Digital', 'Diseño digital, desarrollo web', 2022, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('76f363ce-0ca0-4913-8789-6a54e18f76d7', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('7b6cb4b8-df4a-4c98-b52d-ba51d5116ee9', '76f363ce-0ca0-4913-8789-6a54e18f76d7', 'fixed', '2:3', 'Olivara Farms — pieza 1', 'Saber más', 'es', 0, 'Imagen del caso Olivara Farms, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('7b6cb4b8-df4a-4c98-b52d-ba51d5116ee9', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('39f38782-c827-49cc-8908-801ddb45edcd', '76f363ce-0ca0-4913-8789-6a54e18f76d7', 'fixed', '2:3', 'Olivara Farms — pieza 2', 'Saber más', 'es', 1, 'Imagen del caso Olivara Farms, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('39f38782-c827-49cc-8908-801ddb45edcd', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('2031bb4c-960b-4a3b-9d57-b73c4fc93047', '76f363ce-0ca0-4913-8789-6a54e18f76d7', 'fixed', '4:5', 'Olivara Farms — pieza 3', NULL, 'es', 2, 'Imagen del caso Olivara Farms, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('2031bb4c-960b-4a3b-9d57-b73c4fc93047', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('e2bfaea5-d7c3-4d70-8fbc-4944af7f09a8', '76f363ce-0ca0-4913-8789-6a54e18f76d7', 'fixed', '4:5', 'Olivara Farms — pieza 4', 'Saber más', 'es', 3, 'Imagen del caso Olivara Farms, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('e2bfaea5-d7c3-4d70-8fbc-4944af7f09a8', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);

-- Olivara Labs
insert into content (id, type, status, default_locale, slug, publish_at) values ('58c13caa-130d-476f-8203-11e4f7e48ca2', 'case', 'published', 'es', 'olivara-labs-26', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('58c13caa-130d-476f-8203-11e4f7e48ca2', 'es', 'Olivara Labs — Eventos') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('58c13caa-130d-476f-8203-11e4f7e48ca2', 'C', 1, 'Olivara Labs', 'Eventos', 'Dirección de arte, señalética, audiovisual', 2026, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('58c13caa-130d-476f-8203-11e4f7e48ca2', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('7ff4f621-003e-49c7-ba30-927ae0c587df', '58c13caa-130d-476f-8203-11e4f7e48ca2', 'fixed', '16:9', 'Olivara Labs — pieza 1', NULL, 'es', 0, 'Imagen del caso Olivara Labs, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('7ff4f621-003e-49c7-ba30-927ae0c587df', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('17985728-a7e5-4aa9-8bfb-6fa41293863f', '58c13caa-130d-476f-8203-11e4f7e48ca2', 'fixed', '1:1', 'Olivara Labs — pieza 2', 'Ver caso', 'es', 1, 'Imagen del caso Olivara Labs, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('17985728-a7e5-4aa9-8bfb-6fa41293863f', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('b0e1666d-0ba8-4d92-98a4-84f32e27eb3e', '58c13caa-130d-476f-8203-11e4f7e48ca2', 'fixed', '3:4', 'Olivara Labs — pieza 3', NULL, 'es', 2, 'Imagen del caso Olivara Labs, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('b0e1666d-0ba8-4d92-98a4-84f32e27eb3e', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('c1ec38b0-5495-4cf6-9f05-3e8247b25227', '58c13caa-130d-476f-8203-11e4f7e48ca2', 'fixed', '1:1', 'Olivara Labs — pieza 4', 'Ver caso', 'es', 3, 'Imagen del caso Olivara Labs, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('c1ec38b0-5495-4cf6-9f05-3e8247b25227', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('e9ffc686-c4d9-4f78-8fbf-78e15649bd81', '58c13caa-130d-476f-8203-11e4f7e48ca2', 'fixed', '3:4', 'Olivara Labs — pieza 5', 'Saber más', 'es', 4, 'Imagen del caso Olivara Labs, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('e9ffc686-c4d9-4f78-8fbf-78e15649bd81', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);

-- Florent Labs
insert into content (id, type, status, default_locale, slug, publish_at) values ('2fc5aee1-1065-4dc5-b192-c6453b6a2af6', 'case', 'published', 'es', 'florent-labs-27', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('2fc5aee1-1065-4dc5-b192-c6453b6a2af6', 'es', 'Florent Labs — Digital') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('2fc5aee1-1065-4dc5-b192-c6453b6a2af6', 'B', 1, 'Florent Labs', 'Digital', 'Diseño digital, desarrollo web', 2024, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('2fc5aee1-1065-4dc5-b192-c6453b6a2af6', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('14c4c300-2160-4fe5-86be-b0901273368d', '2fc5aee1-1065-4dc5-b192-c6453b6a2af6', 'fixed', '16:9', 'Florent Labs — pieza 1', NULL, 'es', 0, 'Imagen del caso Florent Labs, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('14c4c300-2160-4fe5-86be-b0901273368d', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('e31b0b20-c790-4e7e-a65c-680401a05aa2', '2fc5aee1-1065-4dc5-b192-c6453b6a2af6', 'fixed', '4:5', 'Florent Labs — pieza 2', 'Ver caso', 'es', 1, 'Imagen del caso Florent Labs, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('e31b0b20-c790-4e7e-a65c-680401a05aa2', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('c586c7a8-e3da-494a-8161-5b2a5e642a8a', '2fc5aee1-1065-4dc5-b192-c6453b6a2af6', 'fixed', '3:4', 'Florent Labs — pieza 3', NULL, 'es', 2, 'Imagen del caso Florent Labs, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('c586c7a8-e3da-494a-8161-5b2a5e642a8a', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);

-- Vertia
insert into content (id, type, status, default_locale, slug, publish_at) values ('a94c3b84-a10e-4417-8d66-ff9fe8a29327', 'case', 'published', 'es', 'vertia-28', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('a94c3b84-a10e-4417-8d66-ff9fe8a29327', 'es', 'Vertia — Digital') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('a94c3b84-a10e-4417-8d66-ff9fe8a29327', 'B', 2, 'Vertia', 'Digital', 'Diseño digital, desarrollo web', 2024, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('a94c3b84-a10e-4417-8d66-ff9fe8a29327', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('915a7f49-4442-4fb5-b431-60b58abb126a', 'a94c3b84-a10e-4417-8d66-ff9fe8a29327', 'fixed', '3:4', 'Vertia — pieza 1', NULL, 'es', 0, 'Imagen del caso Vertia, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('915a7f49-4442-4fb5-b431-60b58abb126a', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('ced44760-ba58-4070-a6e8-a34bcfc0c2e4', 'a94c3b84-a10e-4417-8d66-ff9fe8a29327', 'fixed', '3:4', 'Vertia — pieza 2', 'Saber más', 'es', 1, 'Imagen del caso Vertia, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('ced44760-ba58-4070-a6e8-a34bcfc0c2e4', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('aacbc209-008c-4cda-b8c7-99e7218b2924', 'a94c3b84-a10e-4417-8d66-ff9fe8a29327', 'fixed', '4:5', 'Vertia — pieza 3', NULL, 'es', 2, 'Imagen del caso Vertia, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('aacbc209-008c-4cda-b8c7-99e7218b2924', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Fontal Bio
insert into content (id, type, status, default_locale, slug, publish_at) values ('1e4ca36b-262c-42e1-a7f1-f801c325e0bb', 'case', 'published', 'es', 'fontal-bio-29', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('1e4ca36b-262c-42e1-a7f1-f801c325e0bb', 'es', 'Fontal Bio — Eventos') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('1e4ca36b-262c-42e1-a7f1-f801c325e0bb', 'A', 1, 'Fontal Bio', 'Eventos', 'Dirección de arte, señalética, audiovisual', 2024, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('1e4ca36b-262c-42e1-a7f1-f801c325e0bb', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('fcbc5237-36cf-46b3-81e3-59dbed3e239c', '1e4ca36b-262c-42e1-a7f1-f801c325e0bb', 'fixed', '4:5', 'Fontal Bio — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Fontal Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('fcbc5237-36cf-46b3-81e3-59dbed3e239c', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('b88b6596-5f8c-4e9d-b896-ec155d1a7258', '1e4ca36b-262c-42e1-a7f1-f801c325e0bb', 'fixed', '3:4', 'Fontal Bio — pieza 2', 'Ver caso', 'es', 1, 'Imagen del caso Fontal Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('b88b6596-5f8c-4e9d-b896-ec155d1a7258', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('934c01f7-5283-46c7-8e7b-15690af3e9e2', '1e4ca36b-262c-42e1-a7f1-f801c325e0bb', 'fixed', '16:9', 'Fontal Bio — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Fontal Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('934c01f7-5283-46c7-8e7b-15690af3e9e2', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('be93b4e7-eaa2-4a3b-bcc5-b8e902b4cef3', '1e4ca36b-262c-42e1-a7f1-f801c325e0bb', 'fixed', '16:9', 'Fontal Bio — pieza 4', 'Saber más', 'es', 3, 'Imagen del caso Fontal Bio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('be93b4e7-eaa2-4a3b-bcc5-b8e902b4cef3', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('fa43ad5f-1d44-4e7b-addb-8e3deb1fe54f', '1e4ca36b-262c-42e1-a7f1-f801c325e0bb', 'fixed', '16:9', 'Fontal Bio — pieza 5', NULL, 'es', 4, 'Imagen del caso Fontal Bio, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('fa43ad5f-1d44-4e7b-addb-8e3deb1fe54f', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('6d556899-c0a5-4b4b-81c7-ff416a90527c', '1e4ca36b-262c-42e1-a7f1-f801c325e0bb', 'fixed', '9:16', 'Fontal Bio — pieza 6', NULL, 'es', 5, 'Imagen del caso Fontal Bio, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('6d556899-c0a5-4b4b-81c7-ff416a90527c', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Florent Studio
insert into content (id, type, status, default_locale, slug, publish_at) values ('62f6b708-3f53-49a5-b934-68bf6889c409', 'case', 'published', 'es', 'florent-studio-30', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('62f6b708-3f53-49a5-b934-68bf6889c409', 'es', 'Florent Studio — Eventos') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('62f6b708-3f53-49a5-b934-68bf6889c409', 'B', 2, 'Florent Studio', 'Eventos', 'Dirección de arte, señalética, audiovisual', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('62f6b708-3f53-49a5-b934-68bf6889c409', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('0ee72098-7c5e-461a-af46-c975e1bc3395', '62f6b708-3f53-49a5-b934-68bf6889c409', 'fixed', '9:16', 'Florent Studio — pieza 1', NULL, 'es', 0, 'Imagen del caso Florent Studio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('0ee72098-7c5e-461a-af46-c975e1bc3395', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('6e03ef44-8d0f-4365-8426-da16e405f3c8', '62f6b708-3f53-49a5-b934-68bf6889c409', 'fixed', '4:5', 'Florent Studio — pieza 2', NULL, 'es', 1, 'Imagen del caso Florent Studio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('6e03ef44-8d0f-4365-8426-da16e405f3c8', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('f87b981f-befa-4430-a9d6-9884442142cd', '62f6b708-3f53-49a5-b934-68bf6889c409', 'fixed', '1:1', 'Florent Studio — pieza 3', 'Saber más', 'es', 2, 'Imagen del caso Florent Studio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('f87b981f-befa-4430-a9d6-9884442142cd', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('8421ee50-9fd8-48ba-9a41-9fe2d6314f54', '62f6b708-3f53-49a5-b934-68bf6889c409', 'fixed', '3:4', 'Florent Studio — pieza 4', 'Ver caso', 'es', 3, 'Imagen del caso Florent Studio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('8421ee50-9fd8-48ba-9a41-9fe2d6314f54', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Terraval Farms
insert into content (id, type, status, default_locale, slug, publish_at) values ('75535000-ceee-464e-9ee1-46db855b863b', 'case', 'published', 'es', 'terraval-farms-31', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('75535000-ceee-464e-9ee1-46db855b863b', 'es', 'Terraval Farms — Eventos') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('75535000-ceee-464e-9ee1-46db855b863b', 'B', 1, 'Terraval Farms', 'Eventos', 'Dirección de arte, señalética, audiovisual', 2026, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('75535000-ceee-464e-9ee1-46db855b863b', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('d6cded4f-219f-4c7d-b6a4-72e9afd615e7', '75535000-ceee-464e-9ee1-46db855b863b', 'fixed', '4:5', 'Terraval Farms — pieza 1', NULL, 'es', 0, 'Imagen del caso Terraval Farms, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('d6cded4f-219f-4c7d-b6a4-72e9afd615e7', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('04febbe6-e013-4da2-8bcc-2c5485f465ac', '75535000-ceee-464e-9ee1-46db855b863b', 'fixed', '16:9', 'Terraval Farms — pieza 2', 'Saber más', 'es', 1, 'Imagen del caso Terraval Farms, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('04febbe6-e013-4da2-8bcc-2c5485f465ac', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('410cc8a6-4005-4fe4-abca-2813639df96b', '75535000-ceee-464e-9ee1-46db855b863b', 'fixed', '4:5', 'Terraval Farms — pieza 3', NULL, 'es', 2, 'Imagen del caso Terraval Farms, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('410cc8a6-4005-4fe4-abca-2813639df96b', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);

-- Solvex Labs
insert into content (id, type, status, default_locale, slug, publish_at) values ('c4445c1f-6365-42c2-9306-e43ac156757c', 'case', 'published', 'es', 'solvex-labs-32', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('c4445c1f-6365-42c2-9306-e43ac156757c', 'es', 'Solvex Labs — Agroalimentario') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('c4445c1f-6365-42c2-9306-e43ac156757c', 'A', 1, 'Solvex Labs', 'Agroalimentario', 'Branding, packaging, comunicación de campaña', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('c4445c1f-6365-42c2-9306-e43ac156757c', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('01108bd4-24b9-48e4-beca-9f0b4ef913c2', 'c4445c1f-6365-42c2-9306-e43ac156757c', 'fixed', '9:16', 'Solvex Labs — pieza 1', NULL, 'es', 0, 'Imagen del caso Solvex Labs, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('01108bd4-24b9-48e4-beca-9f0b4ef913c2', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('fd2bb351-40d8-4f53-8df1-dfbb8ffaab4e', 'c4445c1f-6365-42c2-9306-e43ac156757c', 'fixed', '16:9', 'Solvex Labs — pieza 2', NULL, 'es', 1, 'Imagen del caso Solvex Labs, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('fd2bb351-40d8-4f53-8df1-dfbb8ffaab4e', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('03bb857c-9734-4d75-bc6a-9daf41f2d090', 'c4445c1f-6365-42c2-9306-e43ac156757c', 'fixed', '4:5', 'Solvex Labs — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Solvex Labs, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('03bb857c-9734-4d75-bc6a-9daf41f2d090', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('1b739eb4-45b2-4a9f-bf19-7f38c60531e9', 'c4445c1f-6365-42c2-9306-e43ac156757c', 'fixed', '4:5', 'Solvex Labs — pieza 4', 'Saber más', 'es', 3, 'Imagen del caso Solvex Labs, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('1b739eb4-45b2-4a9f-bf19-7f38c60531e9', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('46989cb7-ee0d-4304-adfb-a0a8461c539a', 'c4445c1f-6365-42c2-9306-e43ac156757c', 'fixed', '9:16', 'Solvex Labs — pieza 5', NULL, 'es', 4, 'Imagen del caso Solvex Labs, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('46989cb7-ee0d-4304-adfb-a0a8461c539a', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

-- Vertia Farms
insert into content (id, type, status, default_locale, slug, publish_at) values ('d9505cd6-aa3d-4396-87d0-8d90e6c553cc', 'case', 'published', 'es', 'vertia-farms-33', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('d9505cd6-aa3d-4396-87d0-8d90e6c553cc', 'es', 'Vertia Farms — Branding y marca') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('d9505cd6-aa3d-4396-87d0-8d90e6c553cc', 'C', 1, 'Vertia Farms', 'Branding y marca', 'Estrategia de marca, identidad visual', 2024, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('d9505cd6-aa3d-4396-87d0-8d90e6c553cc', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('e5bced3e-a372-4868-a46e-f1a18894cab6', 'd9505cd6-aa3d-4396-87d0-8d90e6c553cc', 'fixed', '4:5', 'Vertia Farms — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Vertia Farms, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('e5bced3e-a372-4868-a46e-f1a18894cab6', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('f6cbdbf5-8d20-4dcb-a877-bace7a8477e2', 'd9505cd6-aa3d-4396-87d0-8d90e6c553cc', 'fixed', '3:4', 'Vertia Farms — pieza 2', 'Saber más', 'es', 1, 'Imagen del caso Vertia Farms, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('f6cbdbf5-8d20-4dcb-a877-bace7a8477e2', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('183bfb33-acfe-41df-9538-a09c3a92f4d0', 'd9505cd6-aa3d-4396-87d0-8d90e6c553cc', 'fixed', '9:16', 'Vertia Farms — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Vertia Farms, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('183bfb33-acfe-41df-9538-a09c3a92f4d0', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Terraval Bio
insert into content (id, type, status, default_locale, slug, publish_at) values ('9acb30c1-7041-4cb3-8a28-320200f10a8e', 'case', 'published', 'es', 'terraval-bio-34', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('9acb30c1-7041-4cb3-8a28-320200f10a8e', 'es', 'Terraval Bio — Alimentación') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('9acb30c1-7041-4cb3-8a28-320200f10a8e', 'A', 3, 'Terraval Bio', 'Alimentación', 'Identidad visual, fotografía de producto', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('9acb30c1-7041-4cb3-8a28-320200f10a8e', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('4f89086b-05ee-4bbc-96f7-c565b467cd51', '9acb30c1-7041-4cb3-8a28-320200f10a8e', 'fixed', '3:4', 'Terraval Bio — pieza 1', 'Saber más', 'es', 0, 'Imagen del caso Terraval Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('4f89086b-05ee-4bbc-96f7-c565b467cd51', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('80aca19c-a2c4-45ee-b3d8-471671ceaf3a', '9acb30c1-7041-4cb3-8a28-320200f10a8e', 'fixed', '9:16', 'Terraval Bio — pieza 2', NULL, 'es', 1, 'Imagen del caso Terraval Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('80aca19c-a2c4-45ee-b3d8-471671ceaf3a', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('07cd2b09-6888-4e6e-8784-956ad39a96b5', '9acb30c1-7041-4cb3-8a28-320200f10a8e', 'fixed', '1:1', 'Terraval Bio — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Terraval Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('07cd2b09-6888-4e6e-8784-956ad39a96b5', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Fontal
insert into content (id, type, status, default_locale, slug, publish_at) values ('8b659dfe-98e6-48ec-8d04-1a72943b7a9f', 'case', 'published', 'es', 'fontal-35', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('8b659dfe-98e6-48ec-8d04-1a72943b7a9f', 'es', 'Fontal — Biotecnología') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('8b659dfe-98e6-48ec-8d04-1a72943b7a9f', 'B', 1, 'Fontal', 'Biotecnología', 'Naming, branding corporativo, informe anual', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('8b659dfe-98e6-48ec-8d04-1a72943b7a9f', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('125dfd9a-2407-4bc7-bbd2-b7dd557c15d4', '8b659dfe-98e6-48ec-8d04-1a72943b7a9f', 'fixed', '2:3', 'Fontal — pieza 1', 'Saber más', 'es', 0, 'Imagen del caso Fontal, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('125dfd9a-2407-4bc7-bbd2-b7dd557c15d4', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('9086f0d1-e889-4cb3-b1cc-454ee5cdec5e', '8b659dfe-98e6-48ec-8d04-1a72943b7a9f', 'fixed', '1:1', 'Fontal — pieza 2', NULL, 'es', 1, 'Imagen del caso Fontal, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('9086f0d1-e889-4cb3-b1cc-454ee5cdec5e', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('774395a1-760a-4c2a-a471-f3c2f513d822', '8b659dfe-98e6-48ec-8d04-1a72943b7a9f', 'fixed', '16:9', 'Fontal — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Fontal, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('774395a1-760a-4c2a-a471-f3c2f513d822', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('b05b9a2e-6fd0-4132-a9df-187667758ad7', '8b659dfe-98e6-48ec-8d04-1a72943b7a9f', 'fixed', '16:9', 'Fontal — pieza 4', 'Saber más', 'es', 3, 'Imagen del caso Fontal, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('b05b9a2e-6fd0-4132-a9df-187667758ad7', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('a9d18ddb-3cea-4882-865d-1e8f097af9b6', '8b659dfe-98e6-48ec-8d04-1a72943b7a9f', 'fixed', '16:9', 'Fontal — pieza 5', NULL, 'es', 4, 'Imagen del caso Fontal, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('a9d18ddb-3cea-4882-865d-1e8f097af9b6', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('f2017309-9b40-4880-abfe-03a3e59ac322', '8b659dfe-98e6-48ec-8d04-1a72943b7a9f', 'fixed', '4:5', 'Fontal — pieza 6', 'Saber más', 'es', 5, 'Imagen del caso Fontal, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('f2017309-9b40-4880-abfe-03a3e59ac322', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Raizen Labs
insert into content (id, type, status, default_locale, slug, publish_at) values ('82778108-afbc-41a3-a9cd-04dd3682bd56', 'case', 'published', 'es', 'raizen-labs-36', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('82778108-afbc-41a3-a9cd-04dd3682bd56', 'es', 'Raizen Labs — Eventos') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('82778108-afbc-41a3-a9cd-04dd3682bd56', 'A', 1, 'Raizen Labs', 'Eventos', 'Dirección de arte, señalética, audiovisual', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('82778108-afbc-41a3-a9cd-04dd3682bd56', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('f418ef4d-6344-4320-b920-34429cdfe139', '82778108-afbc-41a3-a9cd-04dd3682bd56', 'fixed', '2:3', 'Raizen Labs — pieza 1', NULL, 'es', 0, 'Imagen del caso Raizen Labs, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('f418ef4d-6344-4320-b920-34429cdfe139', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('862d5115-1c4f-484b-8bcd-ba503e6d33cf', '82778108-afbc-41a3-a9cd-04dd3682bd56', 'fixed', '9:16', 'Raizen Labs — pieza 2', 'Ver caso', 'es', 1, 'Imagen del caso Raizen Labs, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('862d5115-1c4f-484b-8bcd-ba503e6d33cf', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('6c4e9f76-63d5-485a-900e-64de1a978a56', '82778108-afbc-41a3-a9cd-04dd3682bd56', 'fixed', '16:9', 'Raizen Labs — pieza 3', NULL, 'es', 2, 'Imagen del caso Raizen Labs, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('6c4e9f76-63d5-485a-900e-64de1a978a56', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('e2c7954d-0f92-4510-ac17-82eeda0341a3', '82778108-afbc-41a3-a9cd-04dd3682bd56', 'fixed', '2:3', 'Raizen Labs — pieza 4', 'Saber más', 'es', 3, 'Imagen del caso Raizen Labs, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('e2c7954d-0f92-4510-ac17-82eeda0341a3', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('2f473de5-a17d-4f6b-9583-356eebfbea72', '82778108-afbc-41a3-a9cd-04dd3682bd56', 'fixed', '16:9', 'Raizen Labs — pieza 5', 'Ver caso', 'es', 4, 'Imagen del caso Raizen Labs, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('2f473de5-a17d-4f6b-9583-356eebfbea72', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);

-- Vertia Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('d7c6ad7a-c65d-4493-964c-d14846bbfde5', 'case', 'published', 'es', 'vertia-group-37', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('d7c6ad7a-c65d-4493-964c-d14846bbfde5', 'es', 'Vertia Group — Branding y marca') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('d7c6ad7a-c65d-4493-964c-d14846bbfde5', 'A', 3, 'Vertia Group', 'Branding y marca', 'Estrategia de marca, identidad visual', 2022, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('d7c6ad7a-c65d-4493-964c-d14846bbfde5', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('4c0728fd-2576-4ede-b2dd-c1210eca5798', 'd7c6ad7a-c65d-4493-964c-d14846bbfde5', 'fixed', '4:5', 'Vertia Group — pieza 1', NULL, 'es', 0, 'Imagen del caso Vertia Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('4c0728fd-2576-4ede-b2dd-c1210eca5798', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('b6f07a72-8992-450d-a4a2-56772465dbf8', 'd7c6ad7a-c65d-4493-964c-d14846bbfde5', 'fixed', '4:5', 'Vertia Group — pieza 2', NULL, 'es', 1, 'Imagen del caso Vertia Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('b6f07a72-8992-450d-a4a2-56772465dbf8', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('c3feb34f-ed3c-4e4f-b518-6c50f7cd7b64', 'd7c6ad7a-c65d-4493-964c-d14846bbfde5', 'fixed', '1:1', 'Vertia Group — pieza 3', 'Saber más', 'es', 2, 'Imagen del caso Vertia Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('c3feb34f-ed3c-4e4f-b518-6c50f7cd7b64', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Nutrivo
insert into content (id, type, status, default_locale, slug, publish_at) values ('272f5326-cbb8-4108-ae2f-4815b955d216', 'case', 'published', 'es', 'nutrivo-38', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('272f5326-cbb8-4108-ae2f-4815b955d216', 'es', 'Nutrivo — Alimentación') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('272f5326-cbb8-4108-ae2f-4815b955d216', 'A', 2, 'Nutrivo', 'Alimentación', 'Identidad visual, fotografía de producto', 2023, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('272f5326-cbb8-4108-ae2f-4815b955d216', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('dadea70a-76da-44b5-bc97-08f8431b9662', '272f5326-cbb8-4108-ae2f-4815b955d216', 'fixed', '4:5', 'Nutrivo — pieza 1', NULL, 'es', 0, 'Imagen del caso Nutrivo, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('dadea70a-76da-44b5-bc97-08f8431b9662', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('91f66b46-9f60-4f74-acc1-e23c04caf9e0', '272f5326-cbb8-4108-ae2f-4815b955d216', 'fixed', '16:9', 'Nutrivo — pieza 2', NULL, 'es', 1, 'Imagen del caso Nutrivo, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('91f66b46-9f60-4f74-acc1-e23c04caf9e0', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('17e00b59-08ff-4b7a-8d05-90faa188446a', '272f5326-cbb8-4108-ae2f-4815b955d216', 'fixed', '3:4', 'Nutrivo — pieza 3', 'Saber más', 'es', 2, 'Imagen del caso Nutrivo, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('17e00b59-08ff-4b7a-8d05-90faa188446a', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Solvex
insert into content (id, type, status, default_locale, slug, publish_at) values ('5fd275b9-e387-49aa-aa00-b801f49aaa56', 'case', 'published', 'es', 'solvex-39', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('5fd275b9-e387-49aa-aa00-b801f49aaa56', 'es', 'Solvex — Branding y marca') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('5fd275b9-e387-49aa-aa00-b801f49aaa56', 'A', 1, 'Solvex', 'Branding y marca', 'Estrategia de marca, identidad visual', 2023, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('5fd275b9-e387-49aa-aa00-b801f49aaa56', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('615efd7e-8fbf-412f-8140-77e61f5d8a32', '5fd275b9-e387-49aa-aa00-b801f49aaa56', 'fixed', '4:5', 'Solvex — pieza 1', NULL, 'es', 0, 'Imagen del caso Solvex, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('615efd7e-8fbf-412f-8140-77e61f5d8a32', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('ff8a7de9-eac7-4f4b-bc76-8f8923d09ff0', '5fd275b9-e387-49aa-aa00-b801f49aaa56', 'fixed', '16:9', 'Solvex — pieza 2', 'Ver caso', 'es', 1, 'Imagen del caso Solvex, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('ff8a7de9-eac7-4f4b-bc76-8f8923d09ff0', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('9e872bf6-2b50-4686-8f71-8c8e944e598b', '5fd275b9-e387-49aa-aa00-b801f49aaa56', 'fixed', '3:4', 'Solvex — pieza 3', NULL, 'es', 2, 'Imagen del caso Solvex, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('9e872bf6-2b50-4686-8f71-8c8e944e598b', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Bionova Co.
insert into content (id, type, status, default_locale, slug, publish_at) values ('d259d85c-a6ec-432a-a042-981040fca7c5', 'case', 'published', 'es', 'bionova-co-40', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('d259d85c-a6ec-432a-a042-981040fca7c5', 'es', 'Bionova Co. — Agroalimentario') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('d259d85c-a6ec-432a-a042-981040fca7c5', 'A', 1, 'Bionova Co.', 'Agroalimentario', 'Branding, packaging, comunicación de campaña', 2026, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('d259d85c-a6ec-432a-a042-981040fca7c5', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('0a7e4a1e-091f-45b1-a494-63d758b5eb06', 'd259d85c-a6ec-432a-a042-981040fca7c5', 'fixed', '4:5', 'Bionova Co. — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Bionova Co., pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('0a7e4a1e-091f-45b1-a494-63d758b5eb06', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('f9f43c89-5e9a-4a18-a60c-41b869928f0d', 'd259d85c-a6ec-432a-a042-981040fca7c5', 'fixed', '16:9', 'Bionova Co. — pieza 2', 'Saber más', 'es', 1, 'Imagen del caso Bionova Co., pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('f9f43c89-5e9a-4a18-a60c-41b869928f0d', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('a7731d17-188d-4dac-8a1a-7082b6518adc', 'd259d85c-a6ec-432a-a042-981040fca7c5', 'fixed', '1:1', 'Bionova Co. — pieza 3', NULL, 'es', 2, 'Imagen del caso Bionova Co., pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('a7731d17-188d-4dac-8a1a-7082b6518adc', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);

-- Campovía Co.
insert into content (id, type, status, default_locale, slug, publish_at) values ('107ef841-2e26-44c2-a1c3-c1603f0203f1', 'case', 'published', 'es', 'campovia-co-41', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('107ef841-2e26-44c2-a1c3-c1603f0203f1', 'es', 'Campovía Co. — Branding y marca') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('107ef841-2e26-44c2-a1c3-c1603f0203f1', 'A', 2, 'Campovía Co.', 'Branding y marca', 'Estrategia de marca, identidad visual', 2026, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('107ef841-2e26-44c2-a1c3-c1603f0203f1', 'c4363255-8035-4fe3-bb7f-6adc02a2ebef') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('329a07a5-f8ef-4904-aca1-51d00bddd84d', '107ef841-2e26-44c2-a1c3-c1603f0203f1', 'fixed', '2:3', 'Campovía Co. — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Campovía Co., pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('329a07a5-f8ef-4904-aca1-51d00bddd84d', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('6023789b-a73e-47c0-adb2-2c15059416d3', '107ef841-2e26-44c2-a1c3-c1603f0203f1', 'fixed', '4:5', 'Campovía Co. — pieza 2', 'Saber más', 'es', 1, 'Imagen del caso Campovía Co., pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('6023789b-a73e-47c0-adb2-2c15059416d3', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('90bfd48d-66c5-4595-88d6-63095474fc38', '107ef841-2e26-44c2-a1c3-c1603f0203f1', 'fixed', '1:1', 'Campovía Co. — pieza 3', NULL, 'es', 2, 'Imagen del caso Campovía Co., pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('90bfd48d-66c5-4595-88d6-63095474fc38', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Nutrivo Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('856ba80f-3d14-4006-b7e8-0ffb84c06644', 'case', 'published', 'es', 'nutrivo-group-42', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('856ba80f-3d14-4006-b7e8-0ffb84c06644', 'es', 'Nutrivo Group — Agroalimentario') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('856ba80f-3d14-4006-b7e8-0ffb84c06644', 'C', 1, 'Nutrivo Group', 'Agroalimentario', 'Branding, packaging, comunicación de campaña', 2022, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('856ba80f-3d14-4006-b7e8-0ffb84c06644', '6519d450-91f7-4667-8c9a-9c5a1c247297') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('3242c125-2007-451a-b924-7b151d681222', '856ba80f-3d14-4006-b7e8-0ffb84c06644', 'fixed', '9:16', 'Nutrivo Group — pieza 1', 'Saber más', 'es', 0, 'Imagen del caso Nutrivo Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('3242c125-2007-451a-b924-7b151d681222', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('08c89036-b1d6-466f-8921-0ef0a0b6ed25', '856ba80f-3d14-4006-b7e8-0ffb84c06644', 'fixed', '4:5', 'Nutrivo Group — pieza 2', NULL, 'es', 1, 'Imagen del caso Nutrivo Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('08c89036-b1d6-466f-8921-0ef0a0b6ed25', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('86f27dcb-f1f3-42cf-99d4-d61d115673c2', '856ba80f-3d14-4006-b7e8-0ffb84c06644', 'fixed', '16:9', 'Nutrivo Group — pieza 3', 'Ver caso', 'es', 2, 'Imagen del caso Nutrivo Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('86f27dcb-f1f3-42cf-99d4-d61d115673c2', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);

-- Solvex Farms
insert into content (id, type, status, default_locale, slug, publish_at) values ('c02a174e-13c9-4c8b-aa73-a591fd84b555', 'case', 'published', 'es', 'solvex-farms-43', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('c02a174e-13c9-4c8b-aa73-a591fd84b555', 'es', 'Solvex Farms — Biotecnología') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('c02a174e-13c9-4c8b-aa73-a591fd84b555', 'B', 1, 'Solvex Farms', 'Biotecnología', 'Naming, branding corporativo, informe anual', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('c02a174e-13c9-4c8b-aa73-a591fd84b555', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('1ae71057-76f3-4ebd-b4a7-8f99c6d979cd', 'c02a174e-13c9-4c8b-aa73-a591fd84b555', 'fixed', '2:3', 'Solvex Farms — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Solvex Farms, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('1ae71057-76f3-4ebd-b4a7-8f99c6d979cd', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('a171566a-a595-4bc2-b365-35412e53de2f', 'c02a174e-13c9-4c8b-aa73-a591fd84b555', 'fixed', '16:9', 'Solvex Farms — pieza 2', NULL, 'es', 1, 'Imagen del caso Solvex Farms, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('a171566a-a595-4bc2-b365-35412e53de2f', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('fcb8965c-657f-473d-9513-b40728919207', 'c02a174e-13c9-4c8b-aa73-a591fd84b555', 'fixed', '2:3', 'Solvex Farms — pieza 3', NULL, 'es', 2, 'Imagen del caso Solvex Farms, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('fcb8965c-657f-473d-9513-b40728919207', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('ea20c10f-a797-45e1-a264-3d781c1ad92f', 'c02a174e-13c9-4c8b-aa73-a591fd84b555', 'fixed', '16:9', 'Solvex Farms — pieza 4', 'Saber más', 'es', 3, 'Imagen del caso Solvex Farms, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('ea20c10f-a797-45e1-a264-3d781c1ad92f', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Terraval Farms
insert into content (id, type, status, default_locale, slug, publish_at) values ('7246e488-1faf-47cb-bf4f-a21c38c490df', 'case', 'published', 'es', 'terraval-farms-44', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('7246e488-1faf-47cb-bf4f-a21c38c490df', 'es', 'Terraval Farms — Eventos') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('7246e488-1faf-47cb-bf4f-a21c38c490df', 'A', 3, 'Terraval Farms', 'Eventos', 'Dirección de arte, señalética, audiovisual', 2022, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('7246e488-1faf-47cb-bf4f-a21c38c490df', '83b3d519-156b-43fb-b90d-75fd00993ab5') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('3170d0bc-ebba-4abb-a6e9-5c07359e0d9c', '7246e488-1faf-47cb-bf4f-a21c38c490df', 'fixed', '3:4', 'Terraval Farms — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Terraval Farms, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('3170d0bc-ebba-4abb-a6e9-5c07359e0d9c', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('c13fef69-0851-41d3-863d-9768c33aa8fa', '7246e488-1faf-47cb-bf4f-a21c38c490df', 'fixed', '3:4', 'Terraval Farms — pieza 2', 'Ver caso', 'es', 1, 'Imagen del caso Terraval Farms, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('c13fef69-0851-41d3-863d-9768c33aa8fa', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('977634fc-4c34-4ad0-885b-9b3fb077e26e', '7246e488-1faf-47cb-bf4f-a21c38c490df', 'fixed', '1:1', 'Terraval Farms — pieza 3', 'Saber más', 'es', 2, 'Imagen del caso Terraval Farms, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('977634fc-4c34-4ad0-885b-9b3fb077e26e', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('8dbcc0af-40a1-4a39-a7a9-85234388cbf9', '7246e488-1faf-47cb-bf4f-a21c38c490df', 'fixed', '1:1', 'Terraval Farms — pieza 4', 'Ver caso', 'es', 3, 'Imagen del caso Terraval Farms, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('8dbcc0af-40a1-4a39-a7a9-85234388cbf9', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('30826930-0ed7-4353-9f50-718017b2a2d0', '7246e488-1faf-47cb-bf4f-a21c38c490df', 'fixed', '16:9', 'Terraval Farms — pieza 5', 'Ver caso', 'es', 4, 'Imagen del caso Terraval Farms, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('30826930-0ed7-4353-9f50-718017b2a2d0', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

-- Brotia Bio
insert into content (id, type, status, default_locale, slug, publish_at) values ('f88e71a2-f684-45f1-8ed4-cab54304709c', 'case', 'published', 'es', 'brotia-bio-45', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('f88e71a2-f684-45f1-8ed4-cab54304709c', 'es', 'Brotia Bio — Digital') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('f88e71a2-f684-45f1-8ed4-cab54304709c', 'B', 3, 'Brotia Bio', 'Digital', 'Diseño digital, desarrollo web', 2026, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('f88e71a2-f684-45f1-8ed4-cab54304709c', '9f643b5d-10ef-47c3-9c3c-c1f0058621a1') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('4c228bfc-0fdd-44a6-9d5c-73290de03fa0', 'f88e71a2-f684-45f1-8ed4-cab54304709c', 'fixed', '4:5', 'Brotia Bio — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Brotia Bio, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('4c228bfc-0fdd-44a6-9d5c-73290de03fa0', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('1265a53b-7a15-41d4-98cd-f00fba9271e1', 'f88e71a2-f684-45f1-8ed4-cab54304709c', 'fixed', '9:16', 'Brotia Bio — pieza 2', NULL, 'es', 1, 'Imagen del caso Brotia Bio, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('1265a53b-7a15-41d4-98cd-f00fba9271e1', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('28ffa5a8-e258-4615-bff8-768fd81e1421', 'f88e71a2-f684-45f1-8ed4-cab54304709c', 'fixed', '1:1', 'Brotia Bio — pieza 3', NULL, 'es', 2, 'Imagen del caso Brotia Bio, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('28ffa5a8-e258-4615-bff8-768fd81e1421', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('5ffbf4ec-d73d-48b2-98cc-31fe7e5967ea', 'f88e71a2-f684-45f1-8ed4-cab54304709c', 'fixed', '16:9', 'Brotia Bio — pieza 4', 'Saber más', 'es', 3, 'Imagen del caso Brotia Bio, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('5ffbf4ec-d73d-48b2-98cc-31fe7e5967ea', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('650e2112-04cb-4dbe-b699-a2127db64eb8', 'f88e71a2-f684-45f1-8ed4-cab54304709c', 'fixed', '1:1', 'Brotia Bio — pieza 5', 'Saber más', 'es', 4, 'Imagen del caso Brotia Bio, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('650e2112-04cb-4dbe-b699-a2127db64eb8', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Campovía Co.
insert into content (id, type, status, default_locale, slug, publish_at) values ('b7d9180a-3f2c-402d-b29e-185db65f7293', 'case', 'published', 'es', 'campovia-co-46', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('b7d9180a-3f2c-402d-b29e-185db65f7293', 'es', 'Campovía Co. — Biotecnología') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('b7d9180a-3f2c-402d-b29e-185db65f7293', 'A', 1, 'Campovía Co.', 'Biotecnología', 'Naming, branding corporativo, informe anual', 2026, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('b7d9180a-3f2c-402d-b29e-185db65f7293', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('510c18f9-6379-4974-b40f-e1e0b3c23ecb', 'b7d9180a-3f2c-402d-b29e-185db65f7293', 'fixed', '2:3', 'Campovía Co. — pieza 1', NULL, 'es', 0, 'Imagen del caso Campovía Co., pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('510c18f9-6379-4974-b40f-e1e0b3c23ecb', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('233c8728-de48-43b7-a34f-b1e3a4f854a3', 'b7d9180a-3f2c-402d-b29e-185db65f7293', 'fixed', '1:1', 'Campovía Co. — pieza 2', 'Ver caso', 'es', 1, 'Imagen del caso Campovía Co., pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('233c8728-de48-43b7-a34f-b1e3a4f854a3', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('9e2d5316-d952-40c8-b215-d1d705521300', 'b7d9180a-3f2c-402d-b29e-185db65f7293', 'fixed', '3:4', 'Campovía Co. — pieza 3', 'Saber más', 'es', 2, 'Imagen del caso Campovía Co., pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('9e2d5316-d952-40c8-b215-d1d705521300', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Nutrivo Group
insert into content (id, type, status, default_locale, slug, publish_at) values ('92df3b29-b9eb-4555-8175-ea3d3c642bef', 'case', 'published', 'es', 'nutrivo-group-47', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('92df3b29-b9eb-4555-8175-ea3d3c642bef', 'es', 'Nutrivo Group — Alimentación') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('92df3b29-b9eb-4555-8175-ea3d3c642bef', 'A', 1, 'Nutrivo Group', 'Alimentación', 'Identidad visual, fotografía de producto', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('92df3b29-b9eb-4555-8175-ea3d3c642bef', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('812776d7-1a97-4c21-8748-844c1ee23545', '92df3b29-b9eb-4555-8175-ea3d3c642bef', 'fixed', '9:16', 'Nutrivo Group — pieza 1', NULL, 'es', 0, 'Imagen del caso Nutrivo Group, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('812776d7-1a97-4c21-8748-844c1ee23545', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('fffcf359-efdd-4c5c-bce3-64b50f7f61e1', '92df3b29-b9eb-4555-8175-ea3d3c642bef', 'fixed', '1:1', 'Nutrivo Group — pieza 2', 'Saber más', 'es', 1, 'Imagen del caso Nutrivo Group, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('fffcf359-efdd-4c5c-bce3-64b50f7f61e1', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('e38e7558-11a6-4427-8155-6ddb62d0f8df', '92df3b29-b9eb-4555-8175-ea3d3c642bef', 'fixed', '4:5', 'Nutrivo Group — pieza 3', NULL, 'es', 2, 'Imagen del caso Nutrivo Group, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('e38e7558-11a6-4427-8155-6ddb62d0f8df', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('b7840986-5347-422b-ad0d-5a91c807d9d5', '92df3b29-b9eb-4555-8175-ea3d3c642bef', 'fixed', '4:5', 'Nutrivo Group — pieza 4', NULL, 'es', 3, 'Imagen del caso Nutrivo Group, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('b7840986-5347-422b-ad0d-5a91c807d9d5', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('b3d033da-0dba-4763-9960-d9f23aec4662', '92df3b29-b9eb-4555-8175-ea3d3c642bef', 'fixed', '4:5', 'Nutrivo Group — pieza 5', NULL, 'es', 4, 'Imagen del caso Nutrivo Group, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('b3d033da-0dba-4763-9960-d9f23aec4662', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);

-- Solvex Co.
insert into content (id, type, status, default_locale, slug, publish_at) values ('d27a463f-deef-4615-8f16-b1738b4194f3', 'case', 'published', 'es', 'solvex-co-48', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('d27a463f-deef-4615-8f16-b1738b4194f3', 'es', 'Solvex Co. — Biotecnología') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('d27a463f-deef-4615-8f16-b1738b4194f3', 'C', 1, 'Solvex Co.', 'Biotecnología', 'Naming, branding corporativo, informe anual', 2023, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('d27a463f-deef-4615-8f16-b1738b4194f3', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('94045ad3-08e2-43d1-bb3f-81fff96847e6', 'd27a463f-deef-4615-8f16-b1738b4194f3', 'fixed', '9:16', 'Solvex Co. — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Solvex Co., pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('94045ad3-08e2-43d1-bb3f-81fff96847e6', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('ee106258-3cc3-4cb8-a38f-f1c94fc28fee', 'd27a463f-deef-4615-8f16-b1738b4194f3', 'fixed', '3:4', 'Solvex Co. — pieza 2', NULL, 'es', 1, 'Imagen del caso Solvex Co., pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('ee106258-3cc3-4cb8-a38f-f1c94fc28fee', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('1d05e6bd-2c1c-4277-ad8a-66aeef51a80f', 'd27a463f-deef-4615-8f16-b1738b4194f3', 'fixed', '4:5', 'Solvex Co. — pieza 3', NULL, 'es', 2, 'Imagen del caso Solvex Co., pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('1d05e6bd-2c1c-4277-ad8a-66aeef51a80f', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('4f00b002-2f69-41ef-b372-fafd57ba8571', 'd27a463f-deef-4615-8f16-b1738b4194f3', 'fixed', '4:5', 'Solvex Co. — pieza 4', NULL, 'es', 3, 'Imagen del caso Solvex Co., pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('4f00b002-2f69-41ef-b372-fafd57ba8571', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Bionova Foods
insert into content (id, type, status, default_locale, slug, publish_at) values ('b0aac9fc-8495-45bc-b1a1-fd56d97c8c05', 'case', 'published', 'es', 'bionova-foods-49', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('b0aac9fc-8495-45bc-b1a1-fd56d97c8c05', 'es', 'Bionova Foods — Biotecnología') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('b0aac9fc-8495-45bc-b1a1-fd56d97c8c05', 'B', 1, 'Bionova Foods', 'Biotecnología', 'Naming, branding corporativo, informe anual', 2025, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('b0aac9fc-8495-45bc-b1a1-fd56d97c8c05', 'fd36ff9f-2b83-417d-8658-979249f98426') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('d7fdd778-e360-4ba4-b3ad-762d3981e1a3', 'b0aac9fc-8495-45bc-b1a1-fd56d97c8c05', 'fixed', '16:9', 'Bionova Foods — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Bionova Foods, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('d7fdd778-e360-4ba4-b3ad-762d3981e1a3', '7be33f68-016e-421c-9ff6-0718a73526e5', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('992bf6f5-e7fd-4060-90e7-198515fc3a0e', 'b0aac9fc-8495-45bc-b1a1-fd56d97c8c05', 'fixed', '4:5', 'Bionova Foods — pieza 2', NULL, 'es', 1, 'Imagen del caso Bionova Foods, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('992bf6f5-e7fd-4060-90e7-198515fc3a0e', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('13fbfdd6-0f7a-4e46-8779-ba3ae51e3b83', 'b0aac9fc-8495-45bc-b1a1-fd56d97c8c05', 'fixed', '9:16', 'Bionova Foods — pieza 3', NULL, 'es', 2, 'Imagen del caso Bionova Foods, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('13fbfdd6-0f7a-4e46-8779-ba3ae51e3b83', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

-- Cultiva Farms
insert into content (id, type, status, default_locale, slug, publish_at) values ('196acdb4-f603-4e1a-aa15-70a4b98535b0', 'case', 'published', 'es', 'cultiva-farms-50', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('196acdb4-f603-4e1a-aa15-70a4b98535b0', 'es', 'Cultiva Farms — Alimentación') on conflict (content_id, locale) do nothing;
insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values ('196acdb4-f603-4e1a-aa15-70a4b98535b0', 'A', 1, 'Cultiva Farms', 'Alimentación', 'Identidad visual, fotografía de producto', 2024, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('196acdb4-f603-4e1a-aa15-70a4b98535b0', '32a89ad6-793c-4655-97f7-2ea3d8b4d164') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('958826b5-77ae-4724-93b9-1cf9c8960fc0', '196acdb4-f603-4e1a-aa15-70a4b98535b0', 'fixed', '3:4', 'Cultiva Farms — pieza 1', 'Ver caso', 'es', 0, 'Imagen del caso Cultiva Farms, pieza 1');
insert into pin_media (pin_id, media_id, slide_order) values ('958826b5-77ae-4724-93b9-1cf9c8960fc0', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('30f12aef-952e-47ac-9d26-b079d7ad3291', '196acdb4-f603-4e1a-aa15-70a4b98535b0', 'fixed', '4:5', 'Cultiva Farms — pieza 2', 'Ver caso', 'es', 1, 'Imagen del caso Cultiva Farms, pieza 2');
insert into pin_media (pin_id, media_id, slide_order) values ('30f12aef-952e-47ac-9d26-b079d7ad3291', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('aa2edf8a-29ec-4547-8e29-1aaf4bb0dfdb', '196acdb4-f603-4e1a-aa15-70a4b98535b0', 'fixed', '9:16', 'Cultiva Farms — pieza 3', 'Saber más', 'es', 2, 'Imagen del caso Cultiva Farms, pieza 3');
insert into pin_media (pin_id, media_id, slide_order) values ('aa2edf8a-29ec-4547-8e29-1aaf4bb0dfdb', '93aa0fb9-3bca-488b-ac44-5917bd45cf2e', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('b5e9fd39-8242-4192-a9ff-6e1788e5c5f1', '196acdb4-f603-4e1a-aa15-70a4b98535b0', 'fixed', '3:4', 'Cultiva Farms — pieza 4', 'Ver caso', 'es', 3, 'Imagen del caso Cultiva Farms, pieza 4');
insert into pin_media (pin_id, media_id, slide_order) values ('b5e9fd39-8242-4192-a9ff-6e1788e5c5f1', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('04a5375c-e267-4249-b00d-fd87ffd1f178', '196acdb4-f603-4e1a-aa15-70a4b98535b0', 'fixed', '4:5', 'Cultiva Farms — pieza 5', 'Ver caso', 'es', 4, 'Imagen del caso Cultiva Farms, pieza 5');
insert into pin_media (pin_id, media_id, slide_order) values ('04a5375c-e267-4249-b00d-fd87ffd1f178', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('2703287b-0986-4d89-bf55-182d67a7c4b6', '196acdb4-f603-4e1a-aa15-70a4b98535b0', 'fixed', '1:1', 'Cultiva Farms — pieza 6', 'Saber más', 'es', 5, 'Imagen del caso Cultiva Farms, pieza 6');
insert into pin_media (pin_id, media_id, slide_order) values ('2703287b-0986-4d89-bf55-182d67a7c4b6', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);

-- ============ EPISODIOS DE CHANNEL ============
-- Vídeos de ejemplo de terceros, solo para probar el embed (confirmado); no son contenido real de Greener.
-- Brand the Future · Episodio 1: conversación con Clara Serra
insert into content (id, type, status, default_locale, slug, publish_at) values ('9fbc84e7-a8c8-4a17-b7e7-d5aa2ae3ec70', 'episode', 'published', 'es', 'brand-the-future-episodio-1-05b30020', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('9fbc84e7-a8c8-4a17-b7e7-d5aa2ae3ec70', 'es', 'Brand the Future · Episodio 1: conversación con Clara Serra') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language) values ('9fbc84e7-a8c8-4a17-b7e7-d5aa2ae3ec70', 'brand_the_future', 1, 'Clara Serra', 'Directora de Sostenibilidad', 'Olivara', current_date, 1846, 'youtube', '9bZkp7q19f0', 'es') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('9fbc84e7-a8c8-4a17-b7e7-d5aa2ae3ec70', 'c3d8a99a-a671-4c89-a0f1-9b7c7bc2a8ae') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('cf78d470-3209-4fb5-936e-fd0191a35d9b', '9fbc84e7-a8c8-4a17-b7e7-d5aa2ae3ec70', 'fixed', '16:9', 'Brand the Future — Episodio 1', 'Ver episodio', 'es', 0, 'Miniatura del episodio 1 de Brand the Future, con Clara Serra');
insert into pin_media (pin_id, media_id, slide_order) values ('cf78d470-3209-4fb5-936e-fd0191a35d9b', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

-- Brand the Future · Episodio 2: conversación con Marc Oliveras
insert into content (id, type, status, default_locale, slug, publish_at) values ('a00a8d62-a74f-4585-8b9d-188d5a9786f7', 'episode', 'published', 'es', 'brand-the-future-episodio-2-782e1019', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('a00a8d62-a74f-4585-8b9d-188d5a9786f7', 'es', 'Brand the Future · Episodio 2: conversación con Marc Oliveras') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language) values ('a00a8d62-a74f-4585-8b9d-188d5a9786f7', 'brand_the_future', 2, 'Marc Oliveras', 'Cofundador', 'Brotia', current_date, 1950, 'youtube', 'jNQXAC9IVRw', 'es') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('a00a8d62-a74f-4585-8b9d-188d5a9786f7', 'c3d8a99a-a671-4c89-a0f1-9b7c7bc2a8ae') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('f6a9aadf-b1d0-46ab-bdd7-9f10be0f69e6', 'a00a8d62-a74f-4585-8b9d-188d5a9786f7', 'fixed', '16:9', 'Brand the Future — Episodio 2', 'Ver episodio', 'es', 0, 'Miniatura del episodio 2 de Brand the Future, con Marc Oliveras');
insert into pin_media (pin_id, media_id, slide_order) values ('f6a9aadf-b1d0-46ab-bdd7-9f10be0f69e6', 'd2e9dfac-e288-4316-9d2c-7e969a2d458c', 0);

-- Brand the Future · Episodio 3: conversación con Laia Roca
insert into content (id, type, status, default_locale, slug, publish_at) values ('e53fe4ff-19d7-43d4-90bf-54995afe7e1a', 'episode', 'published', 'es', 'brand-the-future-episodio-3-e9f4ddb5', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('e53fe4ff-19d7-43d4-90bf-54995afe7e1a', 'es', 'Brand the Future · Episodio 3: conversación con Laia Roca') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language) values ('e53fe4ff-19d7-43d4-90bf-54995afe7e1a', 'brand_the_future', 3, 'Laia Roca', 'Directora Creativa', 'Nutrivo', current_date, 2251, 'youtube', 'jNQXAC9IVRw', 'es') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('e53fe4ff-19d7-43d4-90bf-54995afe7e1a', 'c3d8a99a-a671-4c89-a0f1-9b7c7bc2a8ae') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('aefac55f-a780-4b84-b174-dfa07ee0cc04', 'e53fe4ff-19d7-43d4-90bf-54995afe7e1a', 'fixed', '16:9', 'Brand the Future — Episodio 3', 'Ver episodio', 'es', 0, 'Miniatura del episodio 3 de Brand the Future, con Laia Roca');
insert into pin_media (pin_id, media_id, slide_order) values ('aefac55f-a780-4b84-b174-dfa07ee0cc04', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);

-- Brand into Europe · Episodio 1: conversación con Pau Ferrer
insert into content (id, type, status, default_locale, slug, publish_at) values ('9d2437e2-d283-49cf-9601-c30989fbbcf6', 'episode', 'published', 'es', 'brand-into-europe-episodio-1-92e431f1', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('9d2437e2-d283-49cf-9601-c30989fbbcf6', 'es', 'Brand into Europe · Episodio 1: conversación con Pau Ferrer') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language) values ('9d2437e2-d283-49cf-9601-c30989fbbcf6', 'brand_into_europe', 1, 'Pau Ferrer', 'CEO', 'Bionova', current_date, 1474, 'youtube', '9bZkp7q19f0', 'es') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('9d2437e2-d283-49cf-9601-c30989fbbcf6', 'b2ed5c33-f829-4f3f-8fd2-fb580437dbb0') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('953602ab-e88e-416b-b223-552ceacfb76c', '9d2437e2-d283-49cf-9601-c30989fbbcf6', 'fixed', '16:9', 'Brand into Europe — Episodio 1', 'Ver episodio', 'es', 0, 'Miniatura del episodio 1 de Brand into Europe, con Pau Ferrer');
insert into pin_media (pin_id, media_id, slide_order) values ('953602ab-e88e-416b-b223-552ceacfb76c', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Brand into Europe · Episodio 2: conversación con Jordi Puig
insert into content (id, type, status, default_locale, slug, publish_at) values ('43ff1127-b1c5-4ade-bfc3-b6445d8b1a43', 'episode', 'published', 'es', 'brand-into-europe-episodio-2-c04054ad', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('43ff1127-b1c5-4ade-bfc3-b6445d8b1a43', 'es', 'Brand into Europe · Episodio 2: conversación con Jordi Puig') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language) values ('43ff1127-b1c5-4ade-bfc3-b6445d8b1a43', 'brand_into_europe', 2, 'Jordi Puig', 'Head of Growth', 'Nutrivo', current_date, 2217, 'youtube', '9bZkp7q19f0', 'es') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('43ff1127-b1c5-4ade-bfc3-b6445d8b1a43', 'b2ed5c33-f829-4f3f-8fd2-fb580437dbb0') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('2474318f-0798-42a9-822d-4f693c0a13a8', '43ff1127-b1c5-4ade-bfc3-b6445d8b1a43', 'fixed', '16:9', 'Brand into Europe — Episodio 2', 'Ver episodio', 'es', 0, 'Miniatura del episodio 2 de Brand into Europe, con Jordi Puig');
insert into pin_media (pin_id, media_id, slide_order) values ('2474318f-0798-42a9-822d-4f693c0a13a8', '5e228c94-cba6-440d-9f9f-d8e7a9b2daad', 0);

-- Brand into Europe · Episodio 3: conversación con Andreu Camps
insert into content (id, type, status, default_locale, slug, publish_at) values ('a87b6f87-8629-48f3-9610-42f2e6cc31f2', 'episode', 'published', 'es', 'brand-into-europe-episodio-3-989fd740', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('a87b6f87-8629-48f3-9610-42f2e6cc31f2', 'es', 'Brand into Europe · Episodio 3: conversación con Andreu Camps') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language) values ('a87b6f87-8629-48f3-9610-42f2e6cc31f2', 'brand_into_europe', 3, 'Andreu Camps', 'CMO', 'Semilla', current_date, 1459, 'youtube', 'dQw4w9WgXcQ', 'es') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('a87b6f87-8629-48f3-9610-42f2e6cc31f2', 'b2ed5c33-f829-4f3f-8fd2-fb580437dbb0') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('bd717fd9-0fa7-4ee4-b7b2-964a106d9607', 'a87b6f87-8629-48f3-9610-42f2e6cc31f2', 'fixed', '16:9', 'Brand into Europe — Episodio 3', 'Ver episodio', 'es', 0, 'Miniatura del episodio 3 de Brand into Europe, con Andreu Camps');
insert into pin_media (pin_id, media_id, slide_order) values ('bd717fd9-0fa7-4ee4-b7b2-964a106d9607', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

-- Brand to Table · Episodio 1: conversación con Marc Oliveras
insert into content (id, type, status, default_locale, slug, publish_at) values ('e88ad34f-8c9f-4c59-9f0e-c093d0d427d9', 'episode', 'published', 'es', 'brand-to-table-episodio-1-fa4dcd4b', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('e88ad34f-8c9f-4c59-9f0e-c093d0d427d9', 'es', 'Brand to Table · Episodio 1: conversación con Marc Oliveras') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language) values ('e88ad34f-8c9f-4c59-9f0e-c093d0d427d9', 'brand_to_table', 1, 'Marc Oliveras', 'Cofundador', 'Bionova', current_date, 1391, 'youtube', 'jNQXAC9IVRw', 'es') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('e88ad34f-8c9f-4c59-9f0e-c093d0d427d9', 'a7611db7-2c06-4a68-812b-ae6652666546') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('57ccd90f-5c14-47ac-a403-b7872af4ad3e', 'e88ad34f-8c9f-4c59-9f0e-c093d0d427d9', 'fixed', '16:9', 'Brand to Table — Episodio 1', 'Ver episodio', 'es', 0, 'Miniatura del episodio 1 de Brand to Table, con Marc Oliveras');
insert into pin_media (pin_id, media_id, slide_order) values ('57ccd90f-5c14-47ac-a403-b7872af4ad3e', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Brand to Table · Episodio 2: conversación con Elena Vidal
insert into content (id, type, status, default_locale, slug, publish_at) values ('818d8527-b7db-4b26-a2f8-3ffaafb300a1', 'episode', 'published', 'es', 'brand-to-table-episodio-2-ebb4a6c7', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('818d8527-b7db-4b26-a2f8-3ffaafb300a1', 'es', 'Brand to Table · Episodio 2: conversación con Elena Vidal') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language) values ('818d8527-b7db-4b26-a2f8-3ffaafb300a1', 'brand_to_table', 2, 'Elena Vidal', 'Fundadora', 'Campovía', current_date, 1682, 'youtube', '9bZkp7q19f0', 'es') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('818d8527-b7db-4b26-a2f8-3ffaafb300a1', 'a7611db7-2c06-4a68-812b-ae6652666546') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('6aab1250-cf40-4e57-84c5-d528edaa3aa1', '818d8527-b7db-4b26-a2f8-3ffaafb300a1', 'fixed', '16:9', 'Brand to Table — Episodio 2', 'Ver episodio', 'es', 0, 'Miniatura del episodio 2 de Brand to Table, con Elena Vidal');
insert into pin_media (pin_id, media_id, slide_order) values ('6aab1250-cf40-4e57-84c5-d528edaa3aa1', '64b502fa-f9c7-4af0-bdba-041ee861b1a0', 0);

-- Brand to Table · Episodio 3: conversación con Elena Vidal
insert into content (id, type, status, default_locale, slug, publish_at) values ('d6849bba-a6a9-4413-b76a-d865fd2e964f', 'episode', 'published', 'es', 'brand-to-table-episodio-3-3dbacc62', now()) on conflict (slug) do nothing;
insert into content_translation (content_id, locale, title) values ('d6849bba-a6a9-4413-b76a-d865fd2e964f', 'es', 'Brand to Table · Episodio 3: conversación con Elena Vidal') on conflict (content_id, locale) do nothing;
insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language) values ('d6849bba-a6a9-4413-b76a-d865fd2e964f', 'brand_to_table', 3, 'Elena Vidal', 'Fundadora', 'Vertia', current_date, 1290, 'youtube', 'jNQXAC9IVRw', 'es') on conflict (content_id) do nothing;
insert into content_tag (content_id, tag_id) values ('d6849bba-a6a9-4413-b76a-d865fd2e964f', 'a7611db7-2c06-4a68-812b-ae6652666546') on conflict do nothing;
insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values ('f5cf0760-3b8d-4240-afb8-ee0c5108b8a7', 'd6849bba-a6a9-4413-b76a-d865fd2e964f', 'fixed', '16:9', 'Brand to Table — Episodio 3', 'Ver episodio', 'es', 0, 'Miniatura del episodio 3 de Brand to Table, con Elena Vidal');
insert into pin_media (pin_id, media_id, slide_order) values ('f5cf0760-3b8d-4240-afb8-ee0c5108b8a7', '8f968a4c-2552-4b3e-b055-d97f91defb36', 0);

