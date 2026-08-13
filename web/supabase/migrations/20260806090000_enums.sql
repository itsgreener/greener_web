-- Greener — 01: tipos enumerados compartidos
-- Arquitectura técnica §7. Un enum por dominio de valores cerrado del brief.

create type content_type as enum ('case', 'insight', 'tool', 'episode', 'page');
create type content_status as enum ('draft', 'scheduled', 'published');
create type locale as enum ('es', 'en', 'ca');

create type content_block_type as enum (
  'rich_text',
  'image',
  'carousel',
  'video',
  'quote',
  'links_credits'
);

create type case_template_variant as enum ('A', 'B', 'C');

create type pin_type as enum ('fixed', 'animated', 'carousel');
create type pin_ratio as enum ('1:1', '4:5', '3:4', '2:3', '9:16', '16:9');
create type pin_autoplay_mode as enum ('viewport', 'hover');

create type media_kind as enum ('image', 'video');
create type media_status as enum ('processing', 'ready', 'error');

create type episode_program as enum (
  'brand_the_future',
  'brand_into_europe',
  'brand_to_table'
);
create type episode_provider as enum ('youtube', 'vimeo', 'spotify');

create type html_package_kind as enum ('insight', 'tool');
create type html_package_version_status as enum ('draft', 'published', 'rolled_back');

create type tag_section as enum ('home', 'insights', 'tools', 'channel', 'shop');
