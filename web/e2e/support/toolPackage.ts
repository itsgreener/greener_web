import { createClient } from '@supabase/supabase-js'

/**
 * Paquete de tool de prueba (E8). Los datos de demo no tienen tools, y una
 * tool publicada son filas más ficheros ya extraídos en el bucket privado
 * `html-packages` (no un ZIP): `content` → `html_package` →
 * `html_package_version` publicada, y el HTML y los assets bajo su
 * `storage_path`. Se monta aquí con la clave secreta, igual que lo haría el
 * ABM al publicar una versión (contrato-zip-tools-insights.md).
 */

export const TOOL_FIXTURE = {
  slug: 'e2e-fixture-tool',
  contentId: '5b7c1f0e-0000-4000-8000-0000000000e8',
  versionId: '5b7c1f0e-0000-4000-8000-0000000000e9',
  storagePath: 'tool/e2e-fixture-tool/v1',
} as const

const BUCKET = 'html-packages'

const FILES: Record<string, { body: string; contentType: string }> = {
  'index.html': {
    contentType: 'text/html; charset=utf-8',
    body: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>E2E tool</title>
    <link rel="stylesheet" href="assets/style.css" />
  </head>
  <body>
    <h1>E2E tool fixture</h1>
    <img src="assets/logo.svg" alt="Logo" width="40" height="40" />
    <script src="assets/app.js"></script>
  </body>
</html>
`,
  },
  'assets/app.js': {
    contentType: 'text/javascript; charset=utf-8',
    body: "document.body.dataset.ready = '1'\n",
  },
  'assets/style.css': {
    contentType: 'text/css; charset=utf-8',
    body: 'body { font-family: sans-serif; }\n',
  },
  'assets/logo.svg': {
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#2f4cff"/></svg>\n',
  },
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY: las variables de scripts/e2e-env.mjs no están cargadas.',
    )
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

function fail(step: string, error: { message: string } | null): void {
  if (error)
    throw new Error(`Montaje de la tool de prueba, ${step}: ${error.message}`)
}

/** Borra la tool de prueba (filas y ficheros). Vale aunque no exista. */
export async function removeToolFixture(): Promise<void> {
  const supabase = serviceClient()

  // Borrar el contenido arrastra html_package y sus versiones (on delete cascade).
  const deleted = await supabase
    .from('content')
    .delete()
    .eq('slug', TOOL_FIXTURE.slug)
  fail('borrar el contenido', deleted.error)

  const removed = await supabase.storage
    .from(BUCKET)
    .remove(Object.keys(FILES).map((f) => `${TOOL_FIXTURE.storagePath}/${f}`))
  fail('borrar los ficheros', removed.error)
}

/** Publica la tool de prueba en `/tools/e2e-fixture-tool/app`. */
export async function installToolFixture(): Promise<void> {
  await removeToolFixture()
  const supabase = serviceClient()
  const { slug, contentId, versionId, storagePath } = TOOL_FIXTURE

  const content = await supabase.from('content').insert({
    id: contentId,
    type: 'tool',
    status: 'published',
    default_locale: 'en',
    slug,
    publish_at: new Date().toISOString(),
  })
  fail('crear el contenido', content.error)

  const pkg = await supabase
    .from('html_package')
    .insert({ content_id: contentId, kind: 'tool' })
  fail('crear el paquete', pkg.error)

  const version = await supabase.from('html_package_version').insert({
    id: versionId,
    package_id: contentId,
    version: 1,
    storage_path: storagePath,
    checksum: 'e2e-fixture-checksum',
    status: 'published',
    manifest: {
      kind: 'tool',
      entrypoint: 'index.html',
      version: 1,
      requiredCapabilities: [],
      externalDomains: [],
      minViewport: { width: 320, height: 480 },
    },
  })
  fail('crear la versión', version.error)

  const current = await supabase
    .from('html_package')
    .update({ current_version_id: versionId })
    .eq('content_id', contentId)
  fail('publicar la versión', current.error)

  for (const [file, { body, contentType }] of Object.entries(FILES)) {
    const uploaded = await supabase.storage
      .from(BUCKET)
      .upload(`${storagePath}/${file}`, Buffer.from(body), {
        contentType,
        upsert: true,
      })
    fail(`subir ${file}`, uploaded.error)
  }
}
