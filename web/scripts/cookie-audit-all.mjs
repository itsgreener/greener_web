/** Discover episode routes, run isolated v5 consent audit per episode, consolidate outputs. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const base = process.env.COOKIE_AUDIT_BASE_URL || 'http://localhost:3000';
const origin = new URL(base).origin;
const out = path.resolve('cookie-audit-all');
const maxPages = Number(process.env.COOKIE_AUDIT_DISCOVER_MAX || 500);
const scrollRounds = Number(process.env.COOKIE_AUDIT_SCROLL_ROUNDS || 18);
const explicitList = process.env.COOKIE_AUDIT_URLS_FILE || '';
const providerNames = ['spotify','youtube','vimeo'];
const normalize = href => {
  try {
    const u = new URL(href, origin);
    if (u.origin !== origin || !u.pathname.startsWith('/work/')) return null;
    return u.pathname.replace(/\/$/, '') || '/';
  } catch { return null; }
};
const csvValue = v => '"' + String(v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v).replaceAll('"','""') + '"';
const saveCsv = async (file, data, columns) => fs.writeFile(path.join(out, file), [columns.join(','), ...data.map(row => columns.map(k => csvValue(row[k])).join(','))].join('\n')+'\n');

async function discover(browser) {
  const discovered = new Set();
  const sources = {};
  const add = (url, source) => {
    const p = normalize(url);
    if (p && discovered.size < maxPages) { discovered.add(p); (sources[p] ||= []).push(source); }
  };
  if (explicitList) {
    const raw = await fs.readFile(explicitList, 'utf8');
    for (const line of raw.split(/\r?\n/).map(x=>x.trim()).filter(x=>x && !x.startsWith('#'))) add(line, 'supplied-list');
  }
  for (const location of ['/sitemap.xml', '/sitemap_index.xml']) {
    try {
      const resp = await fetch(new URL(location, origin), { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) continue;
      const xml = await resp.text();
      for (const match of xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) add(match[1].replaceAll('&amp;','&'), location);
    } catch {}
  }
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  for (const route of ['/', '/work']) {
    try {
      await page.goto(new URL(route, origin).href, { waitUntil:'domcontentloaded', timeout:25000 });
      for(let i=0; i<scrollRounds; i++) {
        const links = await page.locator('a[href]').evaluateAll(els => els.map(e=>e.href));
        for(const link of links) add(link, `links:${route}`);
        await page.evaluate(() => window.scrollTo(0,document.body.scrollHeight));
        await page.waitForTimeout(250);
      }
    } catch (e) { console.log(`INFO: Discovery ${route}: ${e.message}`); }
  }
  await context.close();
  return { urls: [...discovered].sort(), sources };
}
function runOne(target, provider) {
  return new Promise(resolve => {
    const env = { ...process.env, COOKIE_AUDIT_SPOTIFY_URL:'', COOKIE_AUDIT_YOUTUBE_URL:'', COOKIE_AUDIT_VIMEO_URL:'' };
    env[`COOKIE_AUDIT_${provider.toUpperCase()}_URL`] = target;
    env.COOKIE_AUDIT_OUTPUT_DIR = path.join(out, target.replace(/^\//,'').replaceAll('/','__'));
    const cp = spawn(process.execPath, [path.join('scripts','cookie-audit.mjs')], { cwd:process.cwd(), env, stdio:['ignore','pipe','pipe'] });
    let text = '';
    cp.stdout.on('data', chunk=>{ process.stdout.write(chunk); text += chunk; });
    cp.stderr.on('data', chunk=>{ process.stderr.write(chunk); text += chunk; });
    cp.on('error', e => resolve({ code:-1, text:String(e) }));
    cp.on('close', code=>resolve({ code, text }));
  });
}
function inferProvider(labels) {
  const found = providerNames.filter(provider => labels.some(label=>new RegExp(`play on ${provider}`, 'i').test(label)));
  return found.length === 1 ? found[0] : null;
}
function toInventory(audit, url, provider) {
  const records=[];
  for(const snap of audit.audits || []) {
    const add = (domain,name,type,duration,party,extra={}) => records.push({episode:url,provider,phase:snap.stage,domain,name,type,duration,party,...extra});
    for(const c of snap.cookies || []) add(c.domain,c.name,'cookie',c.expires > 0 ? new Date(c.expires*1000).toISOString() : 'session', c.domain.replace(/^\./,'').endsWith(new URL(origin).hostname) ? 'first' : 'third', {path:c.path,secure:c.secure,httpOnly:c.httpOnly,sameSite:c.sameSite,partitionKey:c.partitionKey});
    for(const key of Object.keys(snap.localStorage || {})) add(new URL(origin).hostname,key,'localStorage','persistent','first');
    for(const key of Object.keys(snap.sessionStorage || {})) add(new URL(origin).hostname,key,'sessionStorage','tab session','first');
    for(const db of snap.indexedDB || []) if(db.name) add(new URL(origin).hostname,db.name,'IndexedDB','unknown','first');
    for(const frame of snap.frameStorage || []) {
      const domain = (()=>{ try{return new URL(frame.origin).hostname;}catch{return frame.origin;} })();
      for(const key of frame.storage?.localStorageKeys || []) add(domain,key,'localStorage','persistent','third');
      for(const key of frame.storage?.sessionStorageKeys || []) add(domain,key,'sessionStorage','tab session','third');
      for(const db of frame.storage?.indexedDB || []) if(db.name) add(domain,db.name,'IndexedDB','unknown','third');
    }
  }
  return records;
}
await fs.mkdir(out,{recursive:true});
const browser = await chromium.launch({ headless:process.env.COOKIE_AUDIT_HEADLESS !== 'false' });
let discovery;
const candidates = [];
let feedNavigation = { status: "not-tested" };
try {
  discovery = await discover(browser);
  const context = await browser.newContext({ serviceWorkers:'block' });
  const page = await context.newPage();
  try {
    await page.goto(origin, {waitUntil:'domcontentloaded',timeout:20000});
    const link=page.locator('a[href^="/work/"]').first();
    if(await link.count()) {
      await link.click({timeout:5000});
      const state=await page.evaluate(()=>Object.keys(sessionStorage));
      feedNavigation={status:'tested',destination:page.url(),sessionStorageKeys:state,navigationSourcePresent:state.includes('greener:analytics:navigation-source')};
    } else feedNavigation={status:'skipped',reason:'No /work/ pin link found on home'};
  } catch(e) {feedNavigation={status:'skipped',reason:String(e.message||e)};}
  for(const url of discovery.urls) {
    try {
      await page.goto(new URL(url,origin).href,{waitUntil:'domcontentloaded',timeout:20000});
      // Next.js can render episode controls after DOMContentLoaded. Wait for the
      // *actual* playable control instead of classifying the loading shell.
      await page.waitForFunction(() => [...document.querySelectorAll('button[aria-label]')]
        .some(b => /^play on (youtube|spotify|vimeo)$/i.test((b.getAttribute('aria-label') || '').trim())),
        null, { timeout: 12000 }).catch(() => {});
      const labels = await page.locator('button[aria-label],button').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')||e.textContent||''));
      const provider = inferProvider(labels);
      if (!provider) console.log(`WARN: No provider control detected on ${url}; buttons: ${JSON.stringify(labels.slice(0, 12))}`);
      candidates.push({url,provider,status:provider?'ready':'unclassified',sources:discovery.sources[url], ...(provider ? {} : { observedButtons:labels.slice(0,12) })});
    } catch(e) { candidates.push({url,provider:null,status:'discovery-error',error:String(e.message||e)}); }
  }
  await context.close();
} finally { await browser.close(); }
const runs=[];
const inventory=[];
const network=[];
for(const item of candidates.filter(x=>x.provider)) {
  console.log(`\n===== AUDIT ${item.url} [${item.provider}] =====`);
  const dest=path.join(out,item.url.replace(/^\//,'').replaceAll('/','__'));
  await fs.rm(dest,{recursive:true,force:true});
  await fs.mkdir(dest,{recursive:true});
  const r=await runOne(item.url,item.provider);
  try {
    const data=JSON.parse(await fs.readFile(path.join(dest,'audit.json'),'utf8'));
    inventory.push(...toInventory(data,item.url,item.provider));
    for(const row of data.network || []) network.push({episode:item.url,provider:item.provider,...row});
    const counts={}; for(const a of data.assertions || []) counts[a.status]=(counts[a.status]||0)+1;
    runs.push({url:item.url,provider:item.provider,status:r.code === 0 ? 'completed' : 'failed',exitCode:r.code,counts,assertions:data.assertions,reportFolder:path.relative(out,dest)});
  } catch(e) { runs.push({url:item.url,provider:item.provider,status:'failed',error:String(e.message||e),exitCode:r.code}); }
}
const statuses={found:discovery.urls.length,audited:runs.length,completed:runs.filter(x=>x.status==='completed').length,failed:runs.filter(x=>x.status==='failed').length,unclassified:candidates.filter(x=>x.status==='unclassified').length};
const summary={generatedAt:new Date().toISOString(),base:origin,browser:'Chromium (Playwright)',discovery:{sources:['user file','sitemap','visible links and scrolling'],incompletePossible:true,limits:{scrollRounds,maxPages}},coverage:statuses,feedNavigation,candidates,runs,inventory,network};
await fs.writeFile(path.join(out,'audit-all.json'),JSON.stringify(summary,null,2));
await saveCsv('coverage.csv',candidates.map(c=>({...c,run:runs.find(r=>r.url===c.url)?.status||c.status})),['url','provider','run','sources','error']);
await saveCsv('inventory.csv',inventory,['episode','provider','phase','domain','name','type','duration','party','path','secure','httpOnly','sameSite','partitionKey']);
await saveCsv('network.csv',network,['episode','provider','stage','type','domain','url','status','setCookie','resourceType']);
const totals=`Found ${statuses.found} / audited ${statuses.audited} / completed ${statuses.completed} / failed ${statuses.failed} / unclassified ${statuses.unclassified}`;
await fs.writeFile(path.join(out,'README.md'),`# Greener batch audit\n\n${totals}\n\nGenerated ${summary.generatedAt}\n\n- audit-all.json: consolidated data\n- inventory.csv: inventory by episode and A/B/C/D/E/F/G phase\n- coverage.csv: discovered routes and skipped ones\n- network.csv: captured network requests\n- audit-all.json feedNavigation: pin-navigation storage inspection\n- Each subfolder: audit reports; screenshot PNG only if FAIL or ERROR\n\n**Limitations:** Cannot prove all episodes discovered without an authoritative route export. Sitemap and feed scrolling are best effort. Provider iframe storage may be inaccessible. Network captures requests but does not guarantee playback; some embeds require further interaction. Cross-tab immediate revocation and post-revocation provider-cookie erasure are not verified. Plausible is excluded. Values in snapshots are redacted; URLs in network logs may contain tokens: review before distributing.\n`);
console.log(`\n${totals}\nReports: ${out}`);
if(statuses.failed || statuses.unclassified || !statuses.audited) process.exitCode=1;
