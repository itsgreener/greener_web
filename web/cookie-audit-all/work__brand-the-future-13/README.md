# Greener — auditoría de cookies

Fecha: 2026-10-16T10:23:36.161Z

URL base: http://localhost:3000

Objetivos: spotify (/work/brand-the-future-13)

## Resumen

- PASS: 12
- FAIL: 0
- WARN: 0
- SKIP: 0
- ERROR: 0
- INFO: 2

## Comprobaciones

- **PASS** spotify / spotify: No media-provider requests before load
- **PASS** greener / spotify: greener_visitor first-party cookie present
- **PASS** greener / spotify: greener:feed sessionStorage present
- **PASS** spotify-consent / spotify: Play displays consent prompt
- **PASS** spotify-preconsent / spotify: 0 provider requests and 0 provider iframes before consent
- **PASS** spotify-reject / spotify: Not now: 0 provider requests; 0 iframes
- **PASS** spotify-embed / spotify: Iframe created: https://open.spotify.com/embed/episode/2HUlZHOyoRVDskgWGihc34
- **PASS** spotify-network / spotify: 8 provider requests after acceptance
- **INFO** spotify-cookies / spotify: 2 provider-domain cookies after acceptance; 2 new provider-domain cookies (names and attributes in cookie-changes.csv)
- **PASS** spotify-revoke-choice / spotify: Privacy settings Reject button aria-pressed=true
- **PASS** spotify-revoke / spotify: After rejecting and revisiting episode: 0 provider iframes
- **PASS** spotify-reconsent / spotify: After revocation Play requires consent again: prompt=true; iframes=0
- **PASS** cloudinary: 35 responses; 0 set cookies
- **INFO** plausible: Not implemented in Greener; excluded from this audit

## Archivos

- audit.csv: cookies, localStorage, sessionStorage e IndexedDB por fase.
- network.csv: peticiones, respuestas, códigos HTTP y Set-Cookie.
- assertions.csv: resultados de comprobación.
- cookie-changes.csv: nombres y atributos de cookies después de aceptar, sin valores secretos.
- storage-events.csv: mutaciones observadas de Storage.setItem/removeItem/clear (no incluye escrituras directas por propiedad).
- audit.json: datos completos.
- Capturas disponibles: ninguna.

## Fases

A: antes de Play. B: tras Play, sin aceptar. C: tras Not now. D: tras Accept cookies and play. E: 10 segundos después de aceptar. F: rechazo desde /privacy; G: regreso al episodio y comprobación de consentimiento.

**Límites:** No se puede confirmar reproducción efectiva del medio solo por esperar 10 segundos. El inventario de cookies no contiene valores, pero audit.csv y audit.json sí pueden contener información sensible: no compartirlos públicamente. Un SKIP de Plausible no equivale a un PASS. Las políticas de privacidad/cumplimiento no se deducen automáticamente del resultado. En caso de SKIP, comprobar manualmente el componente.
