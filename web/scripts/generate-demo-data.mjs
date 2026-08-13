#!/usr/bin/env node
/**
 * Generador de datos de demostración para Greener.
 *
 * Script de tooling autónomo (no forma parte de la app ni de su build):
 * duplica deliberadamente un PRNG determinista mínimo en vez de importar
 * src/modules/feed/domain/prng.ts, para no acoplar un script de un solo uso
 * al código de producción (arquitectura §24.4 — domain/ no depende de
 * scripts, y viceversa).
 *
 * Genera:
 *  - supabase/seed_demo_data.sql   (aplicable con `supabase db push` / psql)
 *  - data/demo/feed-snapshot.json  (mismo shape que FeedSnapshot, para el
 *                                    prototipo de masonry — Fase 1)
 *
 * Uso: node scripts/generate-demo-data.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ---------------------------------------------------------------------
// PRNG determinista (mulberry32) — mismo dataset en cada ejecución.
// ---------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260813);

function pick(arr) {
  return arr[Math.floor(rng() * arr.length)];
}
function pickWeighted(pairs) {
  // pairs: [[value, weight], ...]
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [value, weight] of pairs) {
    if (r < weight) return value;
    r -= weight;
  }
  return pairs[pairs.length - 1][0];
}
function intBetween(min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
function uuid() {
  const hex = () => Math.floor(rng() * 16).toString(16);
  const g = (n) => Array.from({ length: n }, hex).join("");
  return `${g(8)}-${g(4)}-4${g(3)}-${pick(["8", "9", "a", "b"])}${g(3)}-${g(12)}`;
}
function slugify(text, suffix) {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${suffix}`;
}
function sqlStr(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

// ---------------------------------------------------------------------
// Fuente de imágenes: las 6 imágenes reales de la cuenta demo pública de
// Cloudinary, verificadas una a una por HTTP antes de usarlas. Se repiten
// deliberadamente entre casos (confirmado): no hace falta más variedad
// para probar el motor de feed y el masonry.
// ---------------------------------------------------------------------
const DEMO_IMAGES = [
  { publicId: "sample", width: 1600, height: 1200 },
  { publicId: "sheep", width: 1600, height: 1067 },
  { publicId: "kitten_fighting", width: 1600, height: 1067 },
  { publicId: "pm/woman_car", width: 1600, height: 2000 },
  { publicId: "pm/kitchen", width: 1600, height: 1067 },
  { publicId: "ai/hiker", width: 1600, height: 2133 },
];

const RATIOS = ["1:1", "4:5", "3:4", "2:3", "9:16", "16:9"];

// ---------------------------------------------------------------------
// Vocabulario para nombres de cliente / sector / servicios ficticios.
// ---------------------------------------------------------------------
const CLIENT_PREFIXES = [
  "Norda",
  "Vertia",
  "Solvex",
  "Cultiva",
  "Bionova",
  "Terraval",
  "Raizen",
  "Fontal",
  "Grania",
  "Olivara",
  "Brotia",
  "Semilla",
  "Vivara",
  "Agrolux",
  "Campovía",
  "Nutrivo",
  "Florent",
  "Estival",
];
const CLIENT_SUFFIXES = ["Foods", "Labs", "Group", "Studio", "Co.", "Bio", "Farms", ""];

const HOME_TAGS = ["Agro", "Food", "Biotech", "Brand", "Digital", "Events"];
const SECTOR_BY_TAG = {
  Agro: "Agroalimentario",
  Food: "Alimentación",
  Biotech: "Biotecnología",
  Brand: "Branding y marca",
  Digital: "Digital",
  Events: "Eventos",
};
const SERVICES_BY_TAG = {
  Agro: "Branding, packaging, comunicación de campaña",
  Food: "Identidad visual, fotografía de producto",
  Biotech: "Naming, branding corporativo, informe anual",
  Brand: "Estrategia de marca, identidad visual",
  Digital: "Diseño digital, desarrollo web",
  Events: "Dirección de arte, señalética, audiovisual",
};

const CHANNEL_PROGRAMS = [
  { key: "brand_the_future", label: "Brand the Future", tag: "Brand the Future" },
  { key: "brand_into_europe", label: "Brand into Europe", tag: "Brand into Europe" },
  { key: "brand_to_table", label: "Brand to Table", tag: "Brand to Table" },
];

// Vídeos de ejemplo de terceros (confirmado: solo para probar el embed,
// no son contenido real de Greener). IDs de YouTube extremadamente
// estables y públicos.
const DEMO_YOUTUBE_IDS = ["dQw4w9WgXcQ", "9bZkp7q19f0", "jNQXAC9IVRw"];

const GUEST_NAMES = [
  ["Marta Solé", "Directora de Marca"],
  ["Jordi Puig", "Head of Growth"],
  ["Elena Vidal", "Fundadora"],
  ["Pau Ferrer", "CEO"],
  ["Laia Roca", "Directora Creativa"],
  ["Andreu Camps", "CMO"],
  ["Núria Bosch", "Directora de Producto"],
  ["Marc Oliveras", "Cofundador"],
  ["Clara Serra", "Directora de Sostenibilidad"],
];

// ---------------------------------------------------------------------
// Generación de casos
// ---------------------------------------------------------------------
const CASE_COUNT = 50;

const homeTagRows = HOME_TAGS.map((name) => ({ id: uuid(), section: "home", name }));
const channelTagRows = CHANNEL_PROGRAMS.map((p) => ({
  id: uuid(),
  section: "channel",
  name: p.tag,
}));

const mediaAssetRows = DEMO_IMAGES.map((img) => ({
  id: uuid(),
  cloudinaryPublicId: img.publicId,
  width: img.width,
  height: img.height,
}));

function randomMediaAsset() {
  return pick(mediaAssetRows);
}

const cases = [];
for (let i = 1; i <= CASE_COUNT; i++) {
  const prefix = pick(CLIENT_PREFIXES);
  const suffix = pick(CLIENT_SUFFIXES);
  const client = suffix ? `${prefix} ${suffix}` : prefix;
  const tag = pick(HOME_TAGS);
  const templateVariant = pick(["A", "B", "C"]);
  const force = pickWeighted([
    [1, 55],
    [2, 25],
    [3, 12],
    [4, 5],
    [5, 3],
  ]);
  const pinCount = intBetween(3, 6);
  const year = intBetween(2022, 2026);

  const contentId = uuid();
  const slug = slugify(client, i);

  const pins = [];
  for (let p = 0; p < pinCount; p++) {
    const asset = randomMediaAsset();
    pins.push({
      id: uuid(),
      ratio: pick(RATIOS),
      label: `${client} — pieza ${p + 1}`,
      cta: pick(["Ver caso", "Saber más", null, null]),
      queueOrder: p,
      alt: `Imagen del caso ${client}, pieza ${p + 1}`,
      mediaAssetId: asset.id,
    });
  }

  cases.push({
    contentId,
    slug,
    title: `${client} — ${SECTOR_BY_TAG[tag]}`,
    client,
    sector: SECTOR_BY_TAG[tag],
    services: SERVICES_BY_TAG[tag],
    year,
    templateVariant,
    force,
    tagName: tag,
    pins,
  });
}

// ---------------------------------------------------------------------
// Generación de episodios de Channel
// ---------------------------------------------------------------------
const episodes = [];
for (const program of CHANNEL_PROGRAMS) {
  for (let n = 1; n <= 3; n++) {
    const [guest, role] = pick(GUEST_NAMES);
    const asset = randomMediaAsset();
    const contentId = uuid();
    const slug = slugify(`${program.key}-episodio-${n}`, uuid().slice(0, 8));

    episodes.push({
      contentId,
      slug,
      title: `${program.label} · Episodio ${n}: conversación con ${guest}`,
      program: program.key,
      programTag: program.tag,
      number: n,
      guest,
      role,
      company: pick(CLIENT_PREFIXES),
      durationSeconds: intBetween(1200, 2700),
      embedId: pick(DEMO_YOUTUBE_IDS),
      pin: {
        id: uuid(),
        ratio: "16:9",
        label: `${program.label} — Episodio ${n}`,
        cta: "Ver episodio",
        alt: `Miniatura del episodio ${n} de ${program.label}, con ${guest}`,
        mediaAssetId: asset.id,
      },
    });
  }
}

// ---------------------------------------------------------------------
// Salida 1: SQL para Supabase
// ---------------------------------------------------------------------
const sqlLines = [];
sqlLines.push("-- Greener — dataset de demostración");
sqlLines.push(`-- Generado por scripts/generate-demo-data.mjs (seed determinista)`);
sqlLines.push(
  `-- ${CASE_COUNT} casos, ${episodes.length} episodios de Channel. Sin insights ni tools`
);
sqlLines.push(
  "-- (se suben manualmente). Imágenes: 6 assets reales de la cuenta demo de Cloudinary,"
);
sqlLines.push("-- verificados por HTTP antes de usarlos, reutilizados entre pines (confirmado).");
sqlLines.push("");

sqlLines.push("-- Etiquetas base (secciones home y channel)");
for (const t of [...homeTagRows, ...channelTagRows]) {
  sqlLines.push(
    `insert into tag (id, section, name) values (${sqlStr(t.id)}, ${sqlStr(t.section)}, ${sqlStr(t.name)}) on conflict (section, name) do nothing;`
  );
}
sqlLines.push("");

sqlLines.push("-- Medios (6 assets reutilizados entre todos los pines)");
for (const m of mediaAssetRows) {
  sqlLines.push(
    `insert into media_asset (id, kind, cloudinary_public_id, format, width, height, bytes, status) values (${sqlStr(m.id)}, 'image', ${sqlStr(m.cloudinaryPublicId)}, 'jpg', ${m.width}, ${m.height}, 250000, 'ready') on conflict (cloudinary_public_id) do nothing;`
  );
}
sqlLines.push("");

sqlLines.push("-- ============ CASOS ============");
for (const c of cases) {
  sqlLines.push(`-- ${c.client}`);
  sqlLines.push(
    `insert into content (id, type, status, default_locale, slug, publish_at) values (${sqlStr(c.contentId)}, 'case', 'published', 'es', ${sqlStr(c.slug)}, now()) on conflict (slug) do nothing;`
  );
  sqlLines.push(
    `insert into content_translation (content_id, locale, title) values (${sqlStr(c.contentId)}, 'es', ${sqlStr(c.title)}) on conflict (content_id, locale) do nothing;`
  );
  sqlLines.push(
    `insert into case_detail (content_id, template_variant, force, client, sector, services, year, credits, links) values (${sqlStr(c.contentId)}, ${sqlStr(c.templateVariant)}, ${c.force}, ${sqlStr(c.client)}, ${sqlStr(c.sector)}, ${sqlStr(c.services)}, ${c.year}, '[]'::jsonb, '[]'::jsonb) on conflict (content_id) do nothing;`
  );

  const tagRow = homeTagRows.find((t) => t.name === c.tagName);
  sqlLines.push(
    `insert into content_tag (content_id, tag_id) values (${sqlStr(c.contentId)}, ${sqlStr(tagRow.id)}) on conflict do nothing;`
  );

  for (const pin of c.pins) {
    sqlLines.push(
      `insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values (${sqlStr(pin.id)}, ${sqlStr(c.contentId)}, 'fixed', ${sqlStr(pin.ratio)}, ${sqlStr(pin.label)}, ${sqlStr(pin.cta)}, 'es', ${pin.queueOrder}, ${sqlStr(pin.alt)});`
    );
    sqlLines.push(
      `insert into pin_media (pin_id, media_id, slide_order) values (${sqlStr(pin.id)}, ${sqlStr(pin.mediaAssetId)}, 0);`
    );
  }
  sqlLines.push("");
}

sqlLines.push("-- ============ EPISODIOS DE CHANNEL ============");
sqlLines.push(
  "-- Vídeos de ejemplo de terceros, solo para probar el embed (confirmado); no son contenido real de Greener."
);
for (const e of episodes) {
  sqlLines.push(`-- ${e.title}`);
  sqlLines.push(
    `insert into content (id, type, status, default_locale, slug, publish_at) values (${sqlStr(e.contentId)}, 'episode', 'published', 'es', ${sqlStr(e.slug)}, now()) on conflict (slug) do nothing;`
  );
  sqlLines.push(
    `insert into content_translation (content_id, locale, title) values (${sqlStr(e.contentId)}, 'es', ${sqlStr(e.title)}) on conflict (content_id, locale) do nothing;`
  );
  sqlLines.push(
    `insert into episode (content_id, program, number, guest, role, company, episode_date, duration_seconds, provider, embed_id, language) values (${sqlStr(e.contentId)}, ${sqlStr(e.program)}, ${e.number}, ${sqlStr(e.guest)}, ${sqlStr(e.role)}, ${sqlStr(e.company)}, current_date, ${e.durationSeconds}, 'youtube', ${sqlStr(e.embedId)}, 'es') on conflict (content_id) do nothing;`
  );

  const tagRow = channelTagRows.find((t) => t.name === e.programTag);
  sqlLines.push(
    `insert into content_tag (content_id, tag_id) values (${sqlStr(e.contentId)}, ${sqlStr(tagRow.id)}) on conflict do nothing;`
  );

  sqlLines.push(
    `insert into pin (id, content_id, type, ratio, label, cta, language, queue_order, alt) values (${sqlStr(e.pin.id)}, ${sqlStr(e.contentId)}, 'fixed', ${sqlStr(e.pin.ratio)}, ${sqlStr(e.pin.label)}, ${sqlStr(e.pin.cta)}, 'es', 0, ${sqlStr(e.pin.alt)});`
  );
  sqlLines.push(
    `insert into pin_media (pin_id, media_id, slide_order) values (${sqlStr(e.pin.id)}, ${sqlStr(e.pin.mediaAssetId)}, 0);`
  );
  sqlLines.push("");
}

mkdirSync(join(ROOT, "supabase"), { recursive: true });
writeFileSync(join(ROOT, "supabase", "seed_demo_data.sql"), sqlLines.join("\n") + "\n");

// ---------------------------------------------------------------------
// Salida 2: JSON con el mismo shape que FeedSnapshot (src/modules/feed/domain/types.ts)
// ---------------------------------------------------------------------
const feedSnapshot = {
  cases: cases.map((c) => ({
    contentId: c.contentId,
    force: c.force,
    pinIds: c.pins.map((p) => p.id),
  })),
  insights: [],
  tools: [],
  channel: episodes.map((e) => ({
    contentId: e.contentId,
    pinIds: [e.pin.id],
  })),
  other: [],
};

// Metadata auxiliar (no forma parte de FeedSnapshot, pero es útil para
// renderizar el prototipo de masonry sin volver a consultar Supabase):
// mapa pinId -> datos de presentación.
const pinDirectory = {};
for (const c of cases) {
  for (const pin of c.pins) {
    const asset = mediaAssetRows.find((m) => m.id === pin.mediaAssetId);
    pinDirectory[pin.id] = {
      contentId: c.contentId,
      contentType: "case",
      contentTitle: c.title,
      contentSlug: c.slug,
      ratio: pin.ratio,
      label: pin.label,
      cta: pin.cta,
      alt: pin.alt,
      cloudinaryPublicId: asset.cloudinaryPublicId,
    };
  }
}
for (const e of episodes) {
  const asset = mediaAssetRows.find((m) => m.id === e.pin.mediaAssetId);
  pinDirectory[e.pin.id] = {
    contentId: e.contentId,
    contentType: "episode",
    contentTitle: e.title,
    contentSlug: e.slug,
    ratio: e.pin.ratio,
    label: e.pin.label,
    cta: e.pin.cta,
    alt: e.pin.alt,
    cloudinaryPublicId: asset.cloudinaryPublicId,
  };
}

mkdirSync(join(ROOT, "data", "demo"), { recursive: true });
writeFileSync(
  join(ROOT, "data", "demo", "feed-snapshot.json"),
  JSON.stringify({ snapshot: feedSnapshot, pinDirectory }, null, 2) + "\n"
);

console.log(`✔ ${cases.length} casos, ${episodes.length} episodios generados.`);
console.log(`✔ supabase/seed_demo_data.sql`);
console.log(`✔ data/demo/feed-snapshot.json`);
