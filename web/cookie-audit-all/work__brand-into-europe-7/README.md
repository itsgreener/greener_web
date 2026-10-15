# Greener — auditoría de cookies

Fecha: 2026-10-15T10:52:53.996Z

URL base: http://localhost:3000

Objetivos: youtube (/work/brand-into-europe-7)

## Resumen

- PASS: 12
- FAIL: 0
- WARN: 0
- SKIP: 0
- ERROR: 0
- INFO: 2

## Comprobaciones

- **PASS** youtube / youtube: No media-provider requests before load
- **PASS** greener / youtube: greener_visitor first-party cookie present
- **PASS** greener / youtube: greener:feed sessionStorage present
- **PASS** youtube-consent / youtube: Play displays consent prompt
- **PASS** youtube-preconsent / youtube: 0 provider requests and 0 provider iframes before consent
- **PASS** youtube-reject / youtube: Not now: 0 provider requests; 0 iframes
- **PASS** youtube-embed / youtube: Iframe created: https://www.youtube-nocookie.com/embed/Ko9nsnAZKBI?autoplay=1
- **PASS** youtube-network / youtube: 19 provider requests after acceptance
- **INFO** youtube-cookies / youtube: 0 provider-domain cookies after acceptance; 0 new provider-domain cookies (names and attributes in cookie-changes.csv)
- **PASS** youtube-revoke-choice / youtube: Privacy settings Reject button aria-pressed=true
- **PASS** youtube-revoke / youtube: After rejecting and revisiting episode: 0 provider iframes
- **PASS** youtube-reconsent / youtube: After revocation Play requires consent again: prompt=true; iframes=0
- **PASS** cloudinary: 73 responses; 0 set cookies
- **INFO** plausible: Not implemented in Greener; excluded from this audit

## Archivos

- audit.csv: cookies, localStorage, sessionStorage e IndexedDB por fase.
- network.csv: peticiones, respuestas, códigos HTTP y Set-Cookie.
- assertions.csv: resultados de comprobación.
- cookie-changes.csv: nombres y atributos de cookies después de aceptar, sin valores secretos.
- storage-events.csv: mutaciones observadas de Storage.setItem/removeItem/clear (no incluye escrituras directas por propiedad).
- audit.json: datos completos.
- Capturas disponibles: youtube-A.png, youtube-B.png, youtube-C.png, youtube-D.png, youtube-E.png, youtube-F.png, youtube-G.png.

## Fases

A: antes de Play. B: tras Play, sin aceptar. C: tras Not now. D: tras Accept cookies and play. E: 10 segundos después de aceptar. F: rechazo desde /privacy; G: regreso al episodio y comprobación de consentimiento.

**Límites:** No se puede confirmar reproducción efectiva del medio solo por esperar 10 segundos. El inventario de cookies no contiene valores, pero audit.csv y audit.json sí pueden contener información sensible: no compartirlos públicamente. Un SKIP de Plausible no equivale a un PASS. Las políticas de privacidad/cumplimiento no se deducen automáticamente del resultado. En caso de SKIP, comprobar manualmente el componente.
