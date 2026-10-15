# Greener cookie/storage audit

- Fecha: 2026-10-14T09:20:09.368Z
- Base URL: http://localhost:3000
- Browser: 155.0.8059.40

## Checks

| Provider | Check | Status | Detail |
|---|---|---|---|
| cloudinary | Cloudinary responses without Set-Cookie | **PASS** | 16 responses; 0 with Set-Cookie |
| plausible | Plausible /api/event returns 202 | **SKIP** | No Plausible request seen (expected on production, not localhost) |
| plausible | Plausible does not set cookies | **PASS** | none |
| greener | Expected first-party storage only | **PASS** | localStorage=[], sessionStorage=[greener:feed] |
| spotify | A: no provider requests before Load | **PASS** | 0 requests |
| greener | navigation-source lifecycle on pin click | **WARN** | writes=0, removals=0. Current code intentionally writes it before navigation and consumes/removes it on detail load. |

## Errors

- **spotify** (http://localhost:3000/work/brand-the-future-13): Error: No encuentro el botón “Load Spotify content”. Comprueba la URL del episodio.

Archivos detallados: `audit.csv`, `network.csv`, `storage-events.csv`, `audit.json` y capturas A/B/C.
