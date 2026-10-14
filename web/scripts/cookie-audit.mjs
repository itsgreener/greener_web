#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const OUTPUT_DIR = path.resolve(
  process.env.COOKIE_AUDIT_OUTPUT || 'cookie-audit',
)
const BASE_URL = (
  process.env.COOKIE_AUDIT_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '')
const HEADLESS = process.env.COOKIE_AUDIT_HEADLESS === '1'
const PLAY_SECONDS = Number(process.env.COOKIE_AUDIT_PLAY_SECONDS || 10)

const PROVIDERS = [
  {
    id: 'youtube',
    label: 'YouTube',
    env: 'COOKIE_AUDIT_YOUTUBE_URL',
    hosts: [
      'youtube.com',
      'youtube-nocookie.com',
      'googlevideo.com',
      'ytimg.com',
      'ggpht.com',
      'google.com',
    ],
  },
  {
    id: 'vimeo',
    label: 'Vimeo',
    env: 'COOKIE_AUDIT_VIMEO_URL',
    hosts: ['vimeo.com', 'vimeocdn.com'],
  },
  {
    id: 'spotify',
    label: 'Spotify',
    env: 'COOKIE_AUDIT_SPOTIFY_URL',
    hosts: ['spotify.com', 'scdn.co', 'spotifycdn.com'],
  },
]

function resolveUrl(value) {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  return `${BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`
}

function hostnameOf(value) {
  try {
    return new URL(value).hostname
  } catch {
    return ''
  }
}

function siteRoot(hostname) {
  const host = hostname.replace(/^\./, '').toLowerCase()
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return host
  const parts = host.split('.')
  return parts.slice(-2).join('.')
}

function partyFor(domain, pageUrl) {
  const pageHost = hostnameOf(pageUrl)
  if (!domain || !pageHost) return 'unknown'
  return siteRoot(domain) === siteRoot(pageHost) ? 'first-party' : 'third-party'
}

function cookieDuration(cookie) {
  if (!cookie.expires || cookie.expires <= 0) return 'session'
  const seconds = Math.max(0, Math.round(cookie.expires - Date.now() / 1000))
  if (seconds < 120) return `${seconds}s`
  if (seconds < 7200) return `${Math.round(seconds / 60)}m`
  if (seconds < 172800) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86400)}d`
}

function csvEscape(value) {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

function toCsv(rows, columns) {
  return (
    [
      columns.join(','),
      ...rows.map((row) => columns.map((c) => csvEscape(row[c])).join(',')),
    ].join('\n') + '\n'
  )
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: HEADLESS })
  } catch {
    console.warn(
      'No se pudo abrir Google Chrome mediante Playwright; uso Chromium incluido si está instalado.',
    )
    return chromium.launch({ headless: HEADLESS })
  }
}

function attachNetworkCollectors(page, sink) {
  page.on('request', (request) => {
    const url = request.url()
    if (!/^https?:/i.test(url)) return
    sink.requests.push({
      time: new Date().toISOString(),
      method: request.method(),
      url,
      domain: hostnameOf(url),
      resourceType: request.resourceType(),
    })
  })

  page.on('response', async (response) => {
    const url = response.url()
    if (!/^https?:/i.test(url)) return
    let headers = {}
    try {
      headers = await response.allHeaders()
    } catch {}
    sink.responses.push({
      time: new Date().toISOString(),
      url,
      domain: hostnameOf(url),
      status: response.status(),
      setCookie: headers['set-cookie'] || '',
    })
  })
}

async function installStorageInstrumentation(context, sink) {
  await context.exposeBinding(
    '__cookieAuditStorageEvent',
    ({ page, frame }, payload) => {
      sink.storageEvents.push({
        time: new Date().toISOString(),
        pageUrl: page?.url?.() || '',
        frameUrl: frame?.url?.() || '',
        ...payload,
      })
    },
  )

  await context.addInitScript(() => {
    const originalSet = Storage.prototype.setItem
    const originalRemove = Storage.prototype.removeItem
    const detectKind = (storage) => {
      try {
        if (storage === window.localStorage) return 'localStorage'
        if (storage === window.sessionStorage) return 'sessionStorage'
      } catch {}
      return 'storage'
    }
    Storage.prototype.setItem = function (key, value) {
      try {
        window.__cookieAuditStorageEvent?.({
          action: 'set',
          storage: detectKind(this),
          key: String(key),
          value: String(value).slice(0, 500),
        })
      } catch {}
      return originalSet.call(this, key, value)
    }
    Storage.prototype.removeItem = function (key) {
      try {
        window.__cookieAuditStorageEvent?.({
          action: 'remove',
          storage: detectKind(this),
          key: String(key),
        })
      } catch {}
      return originalRemove.call(this, key)
    }
  })
}

async function clearAll(context, page) {
  await context.clearCookies()
  try {
    const client = await context.newCDPSession(page)
    await client.send('Storage.clearDataForOrigin', {
      origin: '*',
      storageTypes: 'all',
    })
  } catch {
    // Fallback: browser context nuevo por proveedor ya garantiza un perfil limpio.
  }
}

async function readFrameStorage(frame) {
  return frame.evaluate(async () => {
    const safePairs = (storage) => {
      const out = []
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          out.push({ key, value: storage.getItem(key) })
        }
      } catch (error) {
        return [{ key: '__ERROR__', value: String(error) }]
      }
      return out
    }

    let indexedDb = []
    try {
      if (indexedDB?.databases) {
        const dbs = await indexedDB.databases()
        indexedDb = dbs.map((db) => ({
          name: db.name || '(unnamed)',
          version: db.version ?? '',
        }))
      }
    } catch (error) {
      indexedDb = [{ name: '__ERROR__', version: String(error) }]
    }

    return {
      origin: location.origin,
      localStorage: safePairs(localStorage),
      sessionStorage: safePairs(sessionStorage),
      indexedDb,
    }
  })
}

async function snapshot({ context, page, provider, moment, network }) {
  await page.waitForTimeout(900)
  const cookies = await context.cookies()
  const storages = []

  for (const frame of page.frames()) {
    try {
      const data = await readFrameStorage(frame)
      storages.push({ frameUrl: frame.url(), ...data })
    } catch (error) {
      storages.push({ frameUrl: frame.url(), origin: '', error: String(error) })
    }
  }

  const screenshot = path.join(OUTPUT_DIR, `${provider.id}-${moment}.png`)
  await page.screenshot({ path: screenshot, fullPage: true })

  return {
    provider: provider.id,
    moment,
    pageUrl: page.url(),
    capturedAt: new Date().toISOString(),
    cookies,
    storages,
    networkRequestCount: network.requests.length,
    networkResponseCount: network.responses.length,
    screenshot: path.basename(screenshot),
  }
}

function storageRows(snapshot) {
  const rows = []
  for (const cookie of snapshot.cookies) {
    rows.push({
      provider: snapshot.provider,
      moment: snapshot.moment,
      domain: cookie.domain,
      name: cookie.name,
      type: 'cookie',
      duration: cookieDuration(cookie),
      party: partyFor(cookie.domain, snapshot.pageUrl),
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      valuePreview: cookie.value.slice(0, 80),
    })
  }
  for (const origin of snapshot.storages) {
    const domain = hostnameOf(origin.frameUrl || origin.origin || '')
    for (const item of origin.localStorage || []) {
      rows.push({
        provider: snapshot.provider,
        moment: snapshot.moment,
        domain,
        name: item.key,
        type: 'localStorage',
        duration: 'persistent',
        party: partyFor(domain, snapshot.pageUrl),
        path: '',
        secure: '',
        httpOnly: '',
        sameSite: '',
        valuePreview: String(item.value || '').slice(0, 80),
      })
    }
    for (const item of origin.sessionStorage || []) {
      rows.push({
        provider: snapshot.provider,
        moment: snapshot.moment,
        domain,
        name: item.key,
        type: 'sessionStorage',
        duration: 'tab session',
        party: partyFor(domain, snapshot.pageUrl),
        path: '',
        secure: '',
        httpOnly: '',
        sameSite: '',
        valuePreview: String(item.value || '').slice(0, 80),
      })
    }
    for (const db of origin.indexedDb || []) {
      rows.push({
        provider: snapshot.provider,
        moment: snapshot.moment,
        domain,
        name: db.name,
        type: 'IndexedDB',
        duration: 'persistent',
        party: partyFor(domain, snapshot.pageUrl),
        path: '',
        secure: '',
        httpOnly: '',
        sameSite: '',
        valuePreview: `version=${db.version}`,
      })
    }
  }
  return rows
}

function providerNetworkRows(provider, network, pageUrl) {
  const matches = (host) =>
    provider.hosts.some(
      (expected) => host === expected || host.endsWith(`.${expected}`),
    )
  return network.requests
    .filter((r) => matches(r.domain))
    .map((r) => ({
      provider: provider.id,
      domain: r.domain,
      method: r.method,
      resourceType: r.resourceType,
      url: r.url,
      party: partyFor(r.domain, pageUrl),
    }))
}

async function clickLoad(page, provider) {
  const exact = page.getByRole('button', {
    name: `Load ${provider.label} content`,
    exact: true,
  })
  if (await exact.count()) {
    await exact.first().click()
    return
  }
  const loose = page.getByRole('button', {
    name: new RegExp(`Load\\s+${provider.label}\\s+content`, 'i'),
  })
  if (await loose.count()) {
    await loose.first().click()
    return
  }
  throw new Error(
    `No encuentro el botón “Load ${provider.label} content”. Comprueba la URL del episodio.`,
  )
}

async function tryStartPlayback(page, provider) {
  // YouTube/Vimeo ya se montan con autoplay=1 en el proyecto actual.
  if (provider.id === 'youtube' || provider.id === 'vimeo')
    return 'autoplay requested by embed URL'

  // Spotify: intento best-effort sobre botones típicos del iframe.
  const frame = page
    .frames()
    .find((f) => hostnameOf(f.url()).includes('spotify.com'))
  if (!frame) return 'Spotify iframe not found'
  const candidates = [
    frame.getByRole('button', { name: /play/i }),
    frame.locator('button[aria-label*="Play" i]'),
    frame.locator('[data-testid*="play" i]'),
  ]
  for (const candidate of candidates) {
    try {
      if (await candidate.count()) {
        await candidate.first().click({ timeout: 2500 })
        return 'play button clicked'
      }
    } catch {}
  }
  return 'could not click Spotify play automatically; C is 10s after load'
}

async function auditProvider(provider, targetUrl, globalReport) {
  const browser = await launchBrowser()
  const context = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 1440, height: 1000 },
  })
  const network = { requests: [], responses: [], storageEvents: [] }
  await installStorageInstrumentation(context, network)
  const page = await context.newPage()
  attachNetworkCollectors(page, network)
  await clearAll(context, page)

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 45000 })
    const a = await snapshot({ context, page, provider, moment: 'A', network })

    const premature = providerNetworkRows(provider, network, page.url())
    globalReport.assertions.push({
      provider: provider.id,
      check: 'A: no provider requests before Load',
      status: premature.length === 0 ? 'PASS' : 'FAIL',
      detail:
        premature.length === 0
          ? '0 requests'
          : `${premature.length} provider requests before consent`,
    })

    await clickLoad(page, provider)
    await page.waitForTimeout(2500)
    const b = await snapshot({ context, page, provider, moment: 'B', network })

    const playbackAction = await tryStartPlayback(page, provider)
    await page.waitForTimeout(Math.max(1, PLAY_SECONDS) * 1000)
    const c = await snapshot({ context, page, provider, moment: 'C', network })

    globalReport.snapshots.push(a, b, c)
    globalReport.storageRows.push(
      ...storageRows(a),
      ...storageRows(b),
      ...storageRows(c),
    )
    globalReport.networkRows.push(
      ...providerNetworkRows(provider, network, page.url()),
    )
    globalReport.storageEvents.push(
      ...network.storageEvents.map((e) => ({ provider: provider.id, ...e })),
    )
    globalReport.playback.push({
      provider: provider.id,
      action: playbackAction,
    })
  } catch (error) {
    globalReport.errors.push({
      provider: provider.id,
      url: targetUrl,
      error: String(error?.stack || error),
    })
  } finally {
    await browser.close()
  }
}

async function auditFirstPartyAndVendors(url, report) {
  const browser = await launchBrowser()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  })
  const network = { requests: [], responses: [], storageEvents: [] }
  await installStorageInstrumentation(context, network)
  const page = await context.newPage()
  attachNetworkCollectors(page, network)

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(1500)
    report.browserVersion = browser.version()

    const cloudinary = network.responses.filter(
      (r) =>
        r.domain === 'res.cloudinary.com' ||
        r.domain.endsWith('.res.cloudinary.com'),
    )
    const cloudinarySetCookie = cloudinary.filter((r) => r.setCookie)
    report.assertions.push({
      provider: 'cloudinary',
      check: 'Cloudinary responses without Set-Cookie',
      status:
        cloudinary.length === 0
          ? 'SKIP'
          : cloudinarySetCookie.length === 0
            ? 'PASS'
            : 'FAIL',
      detail:
        cloudinary.length === 0
          ? 'No Cloudinary responses seen'
          : `${cloudinary.length} responses; ${cloudinarySetCookie.length} with Set-Cookie`,
    })

    const plausible = network.responses.filter(
      (r) => r.domain === 'plausible.io' && r.url.includes('/api/event'),
    )
    report.assertions.push({
      provider: 'plausible',
      check: 'Plausible /api/event returns 202',
      status:
        plausible.length === 0
          ? 'SKIP'
          : plausible.every((r) => r.status === 202)
            ? 'PASS'
            : 'FAIL',
      detail:
        plausible.length === 0
          ? 'No Plausible request seen (expected on production, not localhost)'
          : plausible.map((r) => r.status).join(', '),
    })

    const cookies = await context.cookies()
    const badPlausibleCookies = cookies.filter((c) =>
      c.domain.includes('plausible'),
    )
    report.assertions.push({
      provider: 'plausible',
      check: 'Plausible does not set cookies',
      status: badPlausibleCookies.length === 0 ? 'PASS' : 'FAIL',
      detail:
        badPlausibleCookies.map((c) => `${c.domain}:${c.name}`).join(', ') ||
        'none',
    })

    const appStorage = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }))
    report.firstPartyStorage = appStorage
    report.assertions.push({
      provider: 'greener',
      check: 'Expected first-party storage only',
      status:
        appStorage.local.filter((k) => k !== 'plausible_ignore').length === 0
          ? 'PASS'
          : 'WARN',
      detail: `localStorage=[${appStorage.local.join(', ')}], sessionStorage=[${appStorage.session.join(', ')}]`,
    })
  } catch (error) {
    report.errors.push({
      provider: 'vendors',
      url,
      error: String(error?.stack || error),
    })
  } finally {
    await browser.close()
  }
}

async function auditNavigationSource(feedUrl, report) {
  const browser = await launchBrowser()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  })
  const events = { requests: [], responses: [], storageEvents: [] }
  await installStorageInstrumentation(context, events)
  const page = await context.newPage()
  attachNetworkCollectors(page, events)
  try {
    await page.goto(feedUrl, { waitUntil: 'networkidle', timeout: 45000 })
    const link = page
      .locator('a[href^="/tools/"], a[href^="/insights/"], a[href^="/work/"]')
      .filter({ visible: true })
      .first()
    if (!(await link.count())) {
      report.assertions.push({
        provider: 'greener',
        check: 'navigation-source write on pin click',
        status: 'SKIP',
        detail: 'No visible pin link found',
      })
      return
    }
    await Promise.allSettled([
      page.waitForLoadState('domcontentloaded', { timeout: 10000 }),
      link.click(),
    ])
    await page.waitForTimeout(700)
    const writes = events.storageEvents.filter(
      (e) =>
        e.action === 'set' && e.key === 'greener:analytics:navigation-source',
    )
    const removals = events.storageEvents.filter(
      (e) =>
        e.action === 'remove' &&
        e.key === 'greener:analytics:navigation-source',
    )
    report.assertions.push({
      provider: 'greener',
      check: 'navigation-source lifecycle on pin click',
      status: writes.length > 0 ? 'PASS' : 'WARN',
      detail: `writes=${writes.length}, removals=${removals.length}. Current code intentionally writes it before navigation and consumes/removes it on detail load.`,
    })
    report.storageEvents.push(
      ...events.storageEvents.map((e) => ({ provider: 'greener', ...e })),
    )
  } catch (error) {
    report.errors.push({
      provider: 'greener-navigation',
      url: feedUrl,
      error: String(error?.stack || error),
    })
  } finally {
    await browser.close()
  }
}

async function writeReport(report) {
  await ensureDir(OUTPUT_DIR)
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'audit.json'),
    JSON.stringify(report, null, 2),
  )
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'audit.csv'),
    toCsv(report.storageRows, [
      'provider',
      'moment',
      'domain',
      'name',
      'type',
      'duration',
      'party',
      'path',
      'secure',
      'httpOnly',
      'sameSite',
      'valuePreview',
    ]),
  )
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'network.csv'),
    toCsv(report.networkRows, [
      'provider',
      'domain',
      'method',
      'resourceType',
      'party',
      'url',
    ]),
  )
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'assertions.csv'),
    toCsv(report.assertions, ['provider', 'check', 'status', 'detail']),
  )
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'storage-events.csv'),
    toCsv(report.storageEvents, [
      'provider',
      'time',
      'pageUrl',
      'frameUrl',
      'action',
      'storage',
      'key',
      'value',
    ]),
  )

  const lines = [
    '# Greener cookie/storage audit',
    '',
    `- Fecha: ${report.startedAt}`,
    `- Base URL: ${BASE_URL}`,
    `- Browser: ${report.browserVersion || 'unknown'}`,
    '',
    '## Checks',
    '',
    '| Provider | Check | Status | Detail |',
    '|---|---|---|---|',
    ...report.assertions.map(
      (a) =>
        `| ${a.provider} | ${a.check} | **${a.status}** | ${String(a.detail).replaceAll('|', '\\|')} |`,
    ),
    '',
    '## Errors',
    '',
    report.errors.length
      ? report.errors
          .map(
            (e) => `- **${e.provider}** (${e.url}): ${e.error.split('\n')[0]}`,
          )
          .join('\n')
      : '- None',
    '',
    'Archivos detallados: `audit.csv`, `network.csv`, `storage-events.csv`, `audit.json` y capturas A/B/C.',
    '',
  ]
  await fs.writeFile(path.join(OUTPUT_DIR, 'README.md'), lines.join('\n'))
}

async function main() {
  await ensureDir(OUTPUT_DIR)
  const report = {
    startedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    browserVersion: '',
    snapshots: [],
    storageRows: [],
    networkRows: [],
    storageEvents: [],
    assertions: [],
    playback: [],
    firstPartyStorage: {},
    errors: [],
  }

  const configured = PROVIDERS.map((provider) => ({
    provider,
    url: resolveUrl(process.env[provider.env]),
  })).filter((x) => x.url)

  if (configured.length === 0) {
    console.error(
      '\nFaltan URLs de episodios. Define al menos una de estas variables:',
    )
    for (const p of PROVIDERS) console.error(`  ${p.env}=/ruta-del-episodio`)
    console.error(
      '\nEjemplo: COOKIE_AUDIT_YOUTUBE_URL=/work/mi-episodio-youtube npm run audit:cookies\n',
    )
    process.exitCode = 2
    return
  }

  const vendorAuditUrl = configured[0].url
  console.log(`Auditando proveedores sobre ${BASE_URL}`)
  await auditFirstPartyAndVendors(vendorAuditUrl, report)

  for (const { provider, url } of configured) {
    console.log(`\n${provider.label}: ${url}`)
    await auditProvider(provider, url, report)
  }

  const feedUrl = resolveUrl(process.env.COOKIE_AUDIT_FEED_URL || '/')
  await auditNavigationSource(feedUrl, report)

  await writeReport(report)
  console.log(`\nInforme generado en: ${OUTPUT_DIR}`)
  for (const assertion of report.assertions) {
    console.log(
      `${assertion.status.padEnd(4)}  ${assertion.provider}: ${assertion.check} — ${assertion.detail}`,
    )
  }
  if (report.errors.length) {
    console.log(
      `\n${report.errors.length} error(es). Revisa ${path.join(OUTPUT_DIR, 'README.md')}`,
    )
    process.exitCode = 1
  }
}

await main()
