/**
 * Greener cookie / storage audit — reconstructed from project conversation.
 * Run in web/: npm run audit:cookies
 * Optional: COOKIE_AUDIT_BASE_URL=http://localhost:3000
 *           COOKIE_AUDIT_SPOTIFY_URL=/work/brand-the-future-13
 *           COOKIE_AUDIT_YOUTUBE_URL=/work/your-video
 *           COOKIE_AUDIT_HEADLESS=false
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = process.env.COOKIE_AUDIT_BASE_URL || 'http://localhost:3000';
const output = path.resolve(process.env.COOKIE_AUDIT_OUTPUT_DIR || path.join(process.cwd(), 'cookie-audit-all', 'single'));
const waitMs = Number(process.env.COOKIE_AUDIT_PLAY_MS || 10000);
const headless = process.env.COOKIE_AUDIT_HEADLESS !== 'false';
const targets = [
  ['spotify', process.env.COOKIE_AUDIT_SPOTIFY_URL],
  ['youtube', process.env.COOKIE_AUDIT_YOUTUBE_URL],
  ['vimeo', process.env.COOKIE_AUDIT_VIMEO_URL],
].filter(([, url]) => url);
if (!targets.length) targets.push(['home', '/']);

const providerPattern = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|googlevideo\.com|ytimg\.com|spotify\.com|scdn\.co|vimeo\.com|vimeocdn\.com)$/i;
const providerHost = { spotify: /(^|\.)(spotify\.com|scdn\.co)$/i, youtube: /(^|\.)(youtube\.com|youtube-nocookie\.com|googlevideo\.com|ytimg\.com)$/i, vimeo: /(^|\.)(vimeo\.com|vimeocdn\.com)$/i };
function isTargetProvider(url, provider) { return (providerHost[provider] || providerPattern).test(hostOf(url)); }
const network = [], audits = [], assertions = [], storageEvents = [], screenshots = [], cookieChanges = [];
const isLocal = ['localhost', '127.0.0.1'].includes(hostOf(base));
function hostOf(url) { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } }
function isProvider(url) { return providerPattern.test(hostOf(url)); }
function abs(target) { return new URL(target, base).href; }
function result(status, category, message, target = '') { assertions.push({ status, category, target, message }); console.log(`${status} ${category}${target ? ` (${target})` : ''}: ${message}`); }
function csvEscape(v) { const s = v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v); return '"' + s.replace(/"/g, '""') + '"'; }
async function csv(file, rows, columns) { await fs.writeFile(path.join(output, file), [columns.join(','), ...rows.map(r => columns.map(c => csvEscape(r[c])).join(','))].join('\n') + '\n'); }

async function snapshot(page, ctx, target, stage) {
  const state = await page.evaluate(async () => {
    const readStorage = store => { const out = {}; try { for (let i = 0; i < store.length; i++) { const k = store.key(i); out[k] = "[value redacted]"; } } catch (e) { out._error = String(e); } return out; };
    let indexedDB = [];
    try { indexedDB = typeof window.indexedDB.databases === 'function' ? (await window.indexedDB.databases()).map(d => ({ name: d.name, version: d.version })) : [{ unsupported: true }]; }
    catch (e) { indexedDB = [{ error: String(e) }]; }
    return { localStorage: readStorage(window.localStorage), sessionStorage: readStorage(window.sessionStorage), indexedDB, documentCookie: document.cookie.split(";").map(x => x.split("=")[0].trim()).filter(Boolean), url: location.href };
  }).catch(e => ({ error: String(e), url: page.url() }));
  const cookies = (await ctx.cookies()).map(cookieMeta);
  const frameStorage = [];
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    const origin = (() => { try { return new URL(frame.url()).origin; } catch { return frame.url(); } })();
    let storage;
    try {
      storage = await frame.evaluate(async () => {
        const keys = (s) => { try { return Array.from({length:s.length}, (_, i) => s.key(i)); } catch { return []; } };
        let databases = [];
        try { if (indexedDB.databases) databases = await indexedDB.databases(); } catch {}
        return { localStorageKeys: keys(localStorage), sessionStorageKeys: keys(sessionStorage), indexedDB: databases };
      });
    } catch (e) { storage = { inaccessible: String(e.message || e) }; }
    frameStorage.push({ origin, storage });
  }
  const item = { target, stage, time: new Date().toISOString(), ...state, cookies, frameStorage };
  audits.push(item);
  return item;
}

// Cookie metadata only: NEVER export cookie values or session tokens in this report.
function cookieMeta(cookie) {
  return { name: cookie.name, domain: cookie.domain, path: cookie.path, httpOnly: cookie.httpOnly,
    secure: cookie.secure, sameSite: cookie.sameSite, expires: cookie.expires, partitionKey: cookie.partitionKey || '' };
}
function recordCookieDiff(target, beforeCookies, afterCookies) {
  const key = c => `${c.domain}|${c.path}|${c.name}|${c.partitionKey || ''}`;
  const before = new Map(beforeCookies.map(c => [key(c), c]));
  const after = new Map(afterCookies.map(c => [key(c), c]));
  for (const [id, c] of after) {
    cookieChanges.push({ target, action: before.has(id) ? 'retained' : 'added', ...cookieMeta(c) });
  }
  for (const [id, c] of before) if (!after.has(id)) {
    cookieChanges.push({ target, action: 'removed', ...cookieMeta(c) });
  }
}

async function checkRevocation(page, ctx, provider, iframeSelector, record, stageSetter) {
  // The actual CookieChoice button at /privacy is named "Reject".
  // Use the SAME TAB to test the supported settings flow and persistence.
  const episodeUrl = page.url();
  try {
    stageSetter('F');
    await page.goto(abs('/privacy'), { waitUntil: 'domcontentloaded', timeout: 20000 });
    const choice = page.locator('section[aria-labelledby="cookie-choice-heading"]');
    const rejectButton = choice.getByRole('button', { name: /^reject$/i });
    await rejectButton.waitFor({ state: 'visible', timeout: 10000 });
    await rejectButton.click();
    await rejectButton.waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('section[aria-labelledby="cookie-choice-heading"] button[aria-pressed="true"]')?.textContent?.trim().toLowerCase() === 'reject', null, { timeout: 5000 }).catch(() => {});
    const isRejected = await rejectButton.getAttribute('aria-pressed');
    await record(page, ctx, provider, 'F');
    result(isRejected === 'true' ? 'PASS' : 'FAIL', `${provider}-revoke-choice`,
      `Privacy settings Reject button aria-pressed=${isRejected}`, provider);

    stageSetter('G');
    await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.getByRole('button', { name: new RegExp(`^Play on ${provider}$`, 'i') }).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
    const framesAfterReturn = await iframeSelector.count();
    await record(page, ctx, provider, 'G');
    result(framesAfterReturn === 0 ? 'PASS' : 'FAIL', `${provider}-revoke`,
      `After rejecting and revisiting episode: ${framesAfterReturn} provider iframes`, provider);

    const beforePlay = page.getByRole('button', { name: new RegExp(`^Play on ${provider}$`, 'i') });
    if (await beforePlay.isVisible().catch(() => false)) {
      await beforePlay.click();
      const consentPrompt = page.getByRole('button', { name: /accept cookies and play/i });
      const promptPresent = await consentPrompt.isVisible().catch(() => false);
      const framesAfterPlay = await iframeSelector.count();
      result(promptPresent && framesAfterPlay === 0 ? 'PASS' : 'FAIL', `${provider}-reconsent`,
        `After revocation Play requires consent again: prompt=${promptPresent}; iframes=${framesAfterPlay}`, provider);
    } else {
      result('WARN', `${provider}-reconsent`, 'Play button unavailable after revisiting; cannot verify reconsent prompt', provider);
    }
  } catch (e) {
    result('WARN', `${provider}-revoke`, `Could not complete revocation test: ${String(e.message || e)}`, provider);
  }
}

async function clickLoad(page) {
  // First try explicit accessibility labels; fall back to image-cover play buttons.
  const candidates = [
    page.getByRole('button', { name: /(?:load|play|reproducir|cargar|escuchar|ver|activar|accept|continue|start).*?(?:spotify|youtube|vimeo|video|vídeo|podcast|content|contenido)?/i }),
    page.getByRole('link', { name: /(?:play|open|listen|escuchar|abrir).*spotify/i }),
    page.getByRole('button', { name: /^(play|reproducir|cargar|load)$/i }),
    page.locator('button[aria-label*="play" i], button[title*="play" i], button[aria-label*="reproduc" i]'),
    page.locator('[data-testid*="play" i], [data-testid*="load" i]'),
    page.locator('button:has(svg[class*="play" i]), button:has([data-lucide="play"])'),
  ];
  for (const locator of candidates) {
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < Math.min(count, 8); i++) {
      const el = locator.nth(i);
      if (await el.isVisible().catch(() => false) && await el.isEnabled().catch(() => false)) {
        const label = (await el.getAttribute('aria-label').catch(() => null)) || (await el.innerText().catch(() => '')) || 'unlabelled play button';
        const windowStartUrl = page.url();
        try {
          await el.click({ timeout: 5000, noWaitAfter: true });
          return label.trim().slice(0, 120);
        } catch (e) {
          // A navigation may interrupt Playwright's click wait. Only accept it if the destination changed.
          if (page.url() !== windowStartUrl) return label.trim().slice(0, 120);
          throw e;
        }
      }
    }
  }
  return null;
}

await fs.mkdir(output, { recursive: true });
// Remove PNGs from previous runs; never leave stale success screenshots.
for (const file of await fs.readdir(output)) {
  if (file.toLowerCase().endsWith('.png')) await fs.rm(path.join(output, file), { force: true });
}
const browser = await chromium.launch({ headless });
try {
  for (const [provider, targetUrl] of targets) {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const requestLog = [];
    await page.addInitScript(() => {
      const log = (kind, op, key, value) => {
        try { window.__greenerStorageEvents ||= []; window.__greenerStorageEvents.push({ kind, op, key, value, time: new Date().toISOString() }); } catch {}
      };
      for (const [kind, storage] of [['localStorage', window.localStorage], ['sessionStorage', window.sessionStorage]]) {
        try {
          const proto = Object.getPrototypeOf(storage);
          // Instrument shared Storage prototype once; identify actual store by `this`.
          if (kind !== 'localStorage') continue;
          for (const op of ['setItem', 'removeItem', 'clear']) {
            const original = proto[op];
            Object.defineProperty(proto, op, { configurable: true, value: function (...args) {
              let source = 'Storage';
              try { source = this === window.localStorage ? 'localStorage' : this === window.sessionStorage ? 'sessionStorage' : 'Storage'; } catch {}
              log(source, op, args[0] ?? '', args[1] ?? '');
              return original.apply(this, args);
            }});
          }
        } catch {}
      }
    });
    ctx.on('request', req => {
      const entry = { target: provider, stage: currentStage, type: 'request', url: req.url(), method: req.method(), domain: hostOf(req.url()), status: '', setCookie: '', resourceType: req.resourceType() };
      network.push(entry); requestLog.push(entry);
    });
    ctx.on('response', async res => {
      let headers = {};
      try { headers = await res.allHeaders(); } catch {}
      network.push({ target: provider, stage: currentStage, type: 'response', url: res.url(), method: '', domain: hostOf(res.url()), status: res.status(), setCookie: headers['set-cookie'] ? '[present]' : '', resourceType: res.request().resourceType() });
    });
    let currentStage = 'A';
    try {
      await page.goto(abs(targetUrl), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);
      const a = await snapshot(page, ctx, provider, 'A');
      const cookiesBefore = await ctx.cookies();
      const before = requestLog.filter(r => isProvider(r.url));
      result(before.length ? 'FAIL' : 'PASS', provider, before.length ? `${before.length} provider request(s) before user interaction` : 'No media-provider requests before load', provider);
    
      result(a.cookies.some(c => c.name === 'greener_visitor') ? 'PASS' : 'WARN', 'greener', 'greener_visitor first-party cookie ' + (a.cookies.some(c => c.name === 'greener_visitor') ? 'present' : 'not observed'), provider);
      result(Object.hasOwn(a.sessionStorage || {}, 'greener:feed') ? 'PASS' : 'WARN', 'greener', 'greener:feed sessionStorage ' + (Object.hasOwn(a.sessionStorage || {}, 'greener:feed') ? 'present' : 'not observed'), provider);
      // Consent-flow stages: A untouched; B after Play without consent;
      // C after "Not now"; D after accepting; E after an observation interval.
      currentStage = 'B';
      const clicked = await clickLoad(page);
      if (!clicked) {
        result('SKIP', provider, 'No visible Play button found', provider);
      } else {
        await page.waitForTimeout(700);
        const consentButton = page.getByRole('button', { name: /accept cookies and play/i });
        const consentShown = await consentButton.isVisible().catch(() => false);
        const frameSelector = page.locator(`iframe[src*="${provider === 'youtube' ? 'youtube' : provider === 'spotify' ? 'spotify' : 'vimeo'}"]`);
        const stageBFrameCount = await frameSelector.count();
        const requestsAtB = requestLog.filter(r => isTargetProvider(r.url, provider));
        await snapshot(page, ctx, provider, 'B');
        if (consentShown) {
          result('PASS', `${provider}-consent`, 'Play displays consent prompt', provider);
          result(requestsAtB.length || stageBFrameCount ? 'FAIL' : 'PASS', `${provider}-preconsent`, `${requestsAtB.length} provider requests and ${stageBFrameCount} provider iframes before consent`, provider);

          // Reject explicitly, and verify no provider requests or embedded player.
          currentStage = 'C';
          const noButton = page.getByRole('button', { name: /not now/i });
          if (await noButton.isVisible().catch(() => false)) {
            await noButton.click();
            await page.waitForTimeout(900);
            await snapshot(page, ctx, provider, 'C');
            const rejectedRequests = requestLog.filter(r => isTargetProvider(r.url, provider));
            const rejectedFrames = await frameSelector.count();
            result(rejectedRequests.length || rejectedFrames ? 'FAIL' : 'PASS', `${provider}-reject`, `Not now: ${rejectedRequests.length} provider requests; ${rejectedFrames} iframes`, provider);
          } else {
            result('WARN', `${provider}-reject`, 'Not now button absent', provider);
          }
          // Repeat Play, then grant explicit consent.
          const replay = await clickLoad(page);
          if (!replay || !(await consentButton.isVisible().catch(() => false))) {
            result('ERROR', `${provider}-accept`, 'Could not reopen consent prompt after Not now', provider);
          } else {
            currentStage = 'D';
            await consentButton.click();
            await frameSelector.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
            await page.waitForTimeout(2500);
            const iframeSrc = await frameSelector.first().getAttribute('src').catch(() => null);
            const postRequests = requestLog.filter(r => isTargetProvider(r.url, provider) && (r.stage === 'D' || r.stage === 'E'));
            await snapshot(page, ctx, provider, 'D');
            result(iframeSrc && isTargetProvider(iframeSrc, provider) ? 'PASS' : 'FAIL', `${provider}-embed`, iframeSrc ? `Iframe created: ${iframeSrc}` : 'No provider iframe after accepting', provider);
            result(postRequests.length ? 'PASS' : 'WARN', `${provider}-network`, `${postRequests.length} provider requests after acceptance`, provider);
            currentStage = 'E';
            await page.waitForTimeout(waitMs);
            await snapshot(page, ctx, provider, 'E');
            const cookiesAfter = await ctx.cookies();
            recordCookieDiff(provider, cookiesBefore, cookiesAfter);
            const providerCookies = cookiesAfter.filter(c => isTargetProvider('https://' + c.domain.replace(/^\./, ''), provider));
            const providerNew = cookieChanges.filter(c => c.target === provider && c.action === 'added' && isTargetProvider('https://' + c.domain.replace(/^\./, ''), provider));
            result('INFO', `${provider}-cookies`, `${providerCookies.length} provider-domain cookies after acceptance; ${providerNew.length} new provider-domain cookies (names and attributes in cookie-changes.csv)`, provider);
            await checkRevocation(page, ctx, provider, frameSelector, snapshot, next => { currentStage = next; });
          }
        } else {
          // The consent may have been granted by the application before entry.
          // Do not report a pass for the consent prompt unless it was observed.
          result('WARN', `${provider}-consent`, 'Consent prompt absent after Play; check existing consent or button behavior', provider);
          currentStage = 'D';
          await page.waitForTimeout(1500);
          await snapshot(page, ctx, provider, 'D');
          const iframeSrc = await frameSelector.first().getAttribute('src').catch(() => null);
          result(iframeSrc && isTargetProvider(iframeSrc, provider) ? 'PASS' : 'WARN', `${provider}-embed`, iframeSrc ? `Iframe created: ${iframeSrc}` : 'No provider iframe observed', provider);
        }
      }
      const events = await page.evaluate(() => window.__greenerStorageEvents || []).catch(() => []);
      for (const event of events) storageEvents.push({ target: provider, ...event, value: event.value ? "[value redacted]" : "" });
    } catch (e) {
      result('ERROR', provider, String(e.message || e), provider);
    } finally {
      // Only capture evidence when this episode has FAIL or ERROR assertions.
      if (assertions.some(a => a.target === provider && ['FAIL', 'ERROR'].includes(a.status))) {
        const file = `${provider}-failure.png`;
        try {
          await page.screenshot({ path: path.join(output, file), fullPage: true, timeout: 10000 });
          screenshots.push(file);
        } catch (e) { console.warn(`Could not capture failure screenshot: ${e.message}`); }
      }
      await ctx.close();
    }
  }
  const cloudinary = network.filter(n => n.type === 'response' && /(^|\.)cloudinary\.com$/i.test(n.domain));
  result(!cloudinary.length ? 'SKIP' : cloudinary.some(n => n.setCookie) ? 'FAIL' : 'PASS', 'cloudinary', !cloudinary.length ? 'No Cloudinary response observed' : `${cloudinary.length} responses; ${cloudinary.filter(n => n.setCookie).length} set cookies`);
  result('INFO', 'plausible', 'Not implemented in Greener; excluded from this audit');
  await Promise.all([
    csv('audit.csv', audits.map(a => ({ target: a.target, stage: a.stage, time: a.time, url: a.url, cookies: a.cookies, localStorage: a.localStorage, sessionStorage: a.sessionStorage, indexedDB: a.indexedDB, documentCookie: a.documentCookie, error: a.error })), ['target','stage','time','url','cookies','localStorage','sessionStorage','indexedDB','documentCookie','error']),
    csv('network.csv', network, ['target','stage','type','url','method','domain','status','setCookie','resourceType']),
    csv('assertions.csv', assertions, ['status','category','target','message']),
    csv('storage-events.csv', storageEvents, ['target','time','kind','op','key','value']),
    csv('cookie-changes.csv', cookieChanges, ['target','action','name','domain','path','httpOnly','secure','sameSite','expires','partitionKey']),
    fs.writeFile(path.join(output, 'audit.json'), JSON.stringify({ base, targets, audits, network, assertions, storageEvents, cookieChanges }, null, 2)),
  ]);
  const stats = Object.fromEntries(['PASS','FAIL','WARN','SKIP','ERROR','INFO'].map(s => [s, assertions.filter(a => a.status === s).length]));
  const readme = `# Greener — auditoría de cookies\n\nFecha: ${new Date().toISOString()}\n\nURL base: ${base}\n\nObjetivos: ${targets.map(([name, url]) => `${name} (${url})`).join(', ')}\n\n## Resumen\n\n${Object.entries(stats).map(([k,v]) => `- ${k}: ${v}`).join('\n')}\n\n## Comprobaciones\n\n${assertions.map(a => `- **${a.status}** ${a.category}${a.target ? ` / ${a.target}` : ''}: ${a.message}`).join('\n')}\n\n## Archivos\n\n- audit.csv: cookies, localStorage, sessionStorage e IndexedDB por fase.\n- network.csv: peticiones, respuestas, códigos HTTP y Set-Cookie.\n- assertions.csv: resultados de comprobación.\n- cookie-changes.csv: nombres y atributos de cookies después de aceptar, sin valores secretos.\n- storage-events.csv: mutaciones observadas de Storage.setItem/removeItem/clear (no incluye escrituras directas por propiedad).\n- audit.json: datos completos.\n- Capturas disponibles: ${screenshots.join(', ') || 'ninguna'}.\n\n## Fases\n\nA: antes de Play. B: tras Play, sin aceptar. C: tras Not now. D: tras Accept cookies and play. E: ${waitMs / 1000} segundos después de aceptar. F: rechazo desde /privacy; G: regreso al episodio y comprobación de consentimiento.\n\n**Límites:** No se puede confirmar reproducción efectiva del medio solo por esperar 10 segundos. El inventario de cookies no contiene valores, pero audit.csv y audit.json sí pueden contener información sensible: no compartirlos públicamente. Un SKIP de Plausible no equivale a un PASS. Las políticas de privacidad/cumplimiento no se deducen automáticamente del resultado. En caso de SKIP, comprobar manualmente el componente.\n`;
  await fs.writeFile(path.join(output, 'README.md'), readme);
  console.log(`\nReports saved to ${output}`);
  if (assertions.some(a => a.status === 'FAIL' || a.status === 'ERROR')) process.exitCode = 1;
} finally { await browser.close(); }
