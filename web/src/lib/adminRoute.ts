/**
 * ¿Es esta ruta del ABM?
 *
 * Es una ruta del ABM `/admin` o `/api/admin` seguida de cualquier cosa que no
 * pueda continuar un nombre de ruta normal (letra, número, `_` o `-`). Así
 * `/administracion` o `/admin-panel` no se confunden con el ABM (SEC-ADM-A4),
 * pero las variantes raras que el navegador o Next pueden normalizar hasta el
 * ABM (`/admin%2f`, `/admin;x`, `/admin%00`, `/admin.json`…) siguen dentro:
 * el proxy ve la ruta SIN normalizar, y ante la duda se falla cerrado.
 *
 * Vive fuera de `src/proxy.ts` porque Next solo espera de ese fichero el
 * `proxy` y el `config`.
 */
const ADMIN_ROUTE = /^\/(?:api\/)?admin(?![A-Za-z0-9_-])/

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTE.test(pathname)
}
