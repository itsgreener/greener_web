import asyncio, json, statistics, subprocess, sys, os, time
from playwright.async_api import async_playwright

PROFILES = [  # nombre, Mbps efectivos, RTT ms (latencia emulada ida y vuelta), TTFB del CDN extra
  ('Fibra / wifi bueno', 50, 20),
  ('4G bueno', 12, 50),
  ('4G normal', 5, 80),
  ('3G rápido / 4G flojo', 2, 150),
  ('1,6 Mbps (límite del feed)', 1.6, 200),
]
CLIPS = ['light', 'typical', 'heavy']
RUNS = 5
PORT = 8099

async def one(browser, profile, clip, mode, run):
    name, mbps, rtt = profile
    ctx = await browser.new_context(viewport={'width': 800, 'height': 600})
    page = await ctx.new_page()
    cdp = await ctx.new_cdp_session(page)
    await cdp.send('Network.enable')
    await page.goto(f'http://127.0.0.1:{PORT}/?clip={clip}&mode={mode}&run={mode}{run}-{time.time_ns()}')
    await cdp.send('Network.emulateNetworkConditions', {
        'offline': False, 'latency': rtt, 'downloadThroughput': mbps * 1e6 / 8, 'uploadThroughput': mbps * 1e6 / 8})
    if mode == 'prefetch':
        await page.evaluate('window.__prefetch()')
        await page.wait_for_function('window.__t.canplay', timeout=60000)
        await page.wait_for_timeout(300)
    await page.evaluate('window.__hoverStart()')
    try:
        await page.wait_for_function('window.__done === true', timeout=30000)
    except Exception:
        pass
    t = await page.evaluate('window.__t')
    await ctx.close()
    if 'playing' not in t:
        return None
    return {'enter_to_playing': t['playing'] - t['enter'], 'mount_to_playing': t['playing'] - t['mounted'] if mode == 'hover' else None}

async def main():
    srv = subprocess.Popen(['node', 'server.mjs'], env={**os.environ, 'PORT': str(PORT), 'TTFB': '40'})
    await asyncio.sleep(1)
    results = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for profile in PROFILES:
            for clip in CLIPS:
                for mode in ('prefetch', 'hover'):
                    vals = []
                    for r in range(RUNS):
                        res = await one(browser, profile, clip, mode, r)
                        vals.append(res['enter_to_playing'] if res else None)
                    ok = [v for v in vals if v is not None]
                    results[f'{profile[0]}|{clip}|{mode}'] = {
                        'median': statistics.median(ok) if ok else None, 'max': max(ok) if ok else None, 'fail': len(vals) - len(ok)}
                    print(profile[0], clip, mode, results[f'{profile[0]}|{clip}|{mode}'], flush=True)
        await browser.close()
    srv.terminate()
    json.dump(results, open('results.json', 'w'), indent=1)

asyncio.run(main())
