# Tests E2E (Playwright)

Tests de navegador sobre la web real: compilación de producción y un Supabase local en Docker con las 59 migraciones y los datos de demo. Plan y decisiones: `especificaciones/plan-mejoras-codigo-nov-2026.md` §9. Los ficheros son `.github/workflows/e2e.yml` (oculto: se copia a mano al repositorio), `e2e/` (`specs/` con los casos y `support/` con las ayudas), `scripts/e2e-env.mjs`, `scripts/e2e-serve.mjs` y `supabase/config.toml`. `e2e/` tiene su propio `tsconfig.json` y queda fuera del de la web (`docs/operaciones/ci.md` §2).

## 1. Cuándo corren

- **Cada noche**, a las 23:07 UTC (00:07 en invierno, 01:07 en verano), y **a mano**: pestaña Actions de GitHub, flujo «E2E», «Run workflow».
- No corren en cada subida ni en cada pull request (decisión de Greener, 3 nov): una ejecución dura entre 8 y 12 minutos. Con unas 30 al mes son unos 300 minutos de Actions, lejos de los 2.000 del plan gratuito de un repositorio privado.
- **Solo en el CI.** No hay que instalar Docker en ningún ordenador. Un fallo nocturno avisa por correo a quien tenga activadas las notificaciones de Actions.

## 2. Qué prueban hoy

| Id | Caso | Fichero |
| --- | --- | --- |
| E1 | La primera carga del feed pinta 40 pines (lote de escritorio) sin errores de consola | `feed.spec.ts` |
| E2 | Una misma sesión devuelve siempre los mismos lotes (el primero y el siguiente por cursor, dos veces cada uno) | `feed.spec.ts` |
| E3 | Recargar la página y entrar como otro visitante dan otro orden en los primeros 20 pines | `feed.spec.ts` |
| E4 | Ir a un detalle y volver conserva el orden de los pines y el scroll (±2 px) y no pide nada nuevo al feed | `feed.spec.ts` |
| E5 | Recorrer 12 lotes a pasos de 0,8 pantallas: ningún espaciador a la vista, ningún lote repetido y un elemento en la página por cada pin recibido | `feed.spec.ts` |
| E6 | Primera visita: sale la ventana de cookies; un episodio sin aceptar no hace ninguna petición a YouTube; «Not now» no carga nada; «Accept cookies and play» carga el reproductor y recuerda la decisión | `consent.spec.ts` |
| E7 | Contacto: un error del servidor conserva lo escrito; el envío correcto llega al receptor SMTP con destinatario, `Reply-To` y cuerpo | `contact.spec.ts` |
| E8 | Una tool publicada: el documento da 200 con su CSP, un `.svg` del paquete lleva `default-src 'none'; sandbox`, el `.js` no, el ETag da 304, una tool inexistente da 404 y el script de la tool se ejecuta sin violaciones de la CSP | `toolPackage.spec.ts` |

Pendiente (plan §9.4, paso 4 opcional): proyecto móvil (los casos de `?size=20`) y WebKit.

Dos diferencias con el plan original: E2 comprueba la misma *sesión* (cada `POST /api/feed/sessions` abre una sesión nueva con su propia seed, que es lo que prueba E3), y E8 no usa ningún ZIP: monta las filas y los ficheros ya extraídos.

**Datos y ayudas.** `e2e/support/test.ts` (imágenes de Cloudinary sustituidas por un PNG de 1×1 y errores de consola), `feed.ts` (pines, espaciadores, lotes recibidos y tráfico al feed), `consent.ts` (ventana de cookies), `smtpSink.ts` (receptor SMTP de Node, sin Docker: escucha en el `CONTACT_SMTP_PORT` que `e2e-env.mjs` le da al servidor; `tests/unit/shared/smtpSink.test.ts` lo prueba con el nodemailer real en cada `npm test`) y `toolPackage.ts` (publica la tool `e2e-fixture-tool` con la clave secreta: contenido, paquete, versión publicada y cuatro ficheros en el bucket `html-packages`; la borra al terminar). Los datos de demo no tienen tools ni pines de tool.

Las imágenes de demo apuntan a identificadores de Cloudinary que no existen: el test intercepta `res.cloudinary.com` y responde un PNG de 1×1 píxel. Los E2E no salen a internet.

## 3. Qué hace el flujo, paso a paso

1. `npm ci` y Node de `.nvmrc`.
2. `supabase start` (acción oficial `supabase/setup-cli`, CLI 3.0.0): levanta base de datos (PostgreSQL 17, como producción), API, Storage y login en contenedores, aplica las migraciones y los dos seeds de `supabase/config.toml` (`seed.sql` y `seed_demo_data.sql`). Studio, Realtime, funciones y analítica van apagados.
3. `node scripts/e2e-env.mjs >> "$GITHUB_ENV"`: lee la URL y las claves de `supabase status -o json` y añade los valores de prueba del resto de variables (firma, sal del hash, SMTP, nombre de Cloudinary). Ningún secreto real.
4. `npm run build`: compilación propia, porque las `NEXT_PUBLIC_*` se incrustan al compilar y el build normal del CI usa valores de relleno.
5. `npx playwright install --with-deps chromium`.
6. `npm run e2e`: Playwright arranca `scripts/e2e-serve.mjs` (copia `public/` y los estáticos junto a `.next/standalone/server.js` y lo lanza en el puerto 3000), espera a que `/api/health` responda 200 (la web llega a la base) y pasa los tests.
7. Si algo falla: estado de los contenedores y, como artefacto de la ejecución (7 días), el informe HTML y las trazas de Playwright.

## 4. Si falla

Abrir la ejecución en Actions y mirar en qué paso se detuvo:

- **`supabase start`:** casi siempre una migración o un seed. El mensaje trae el fichero y la línea de SQL. Un fallo en `20260922090000` apuntaría a `pg_cron`.
- **`e2e-env.mjs`:** «Faltan la URL o las claves»: la CLI imprime otros nombres de variable; el mensaje lista los recibidos y se ajusta `pick()` en el script.
- **`npm run build` con un error de tipos en `e2e/`:** no debería pasar: `e2e/` está excluido del `tsconfig.json` de la web (se comprueba aparte con `e2e/tsconfig.json`, dentro de `npm run typecheck`), precisamente para que el build no dependa de `@playwright/test`. Tras actualizar el proyecto hay que ejecutar `npm install` para tener esa dependencia en local.
- **`npm run build`:** una variable de `scripts/e2e-env.mjs` que `env.ts` o `serverEnv.ts` ya no acepta (el test `e2eWorkflow.test.ts` vigila las obligatorias).
- **`npm run e2e` con «Timed out waiting from config.webServer»:** el servidor no llegó a responder 200 en `/api/health`; en el registro del paso salen sus mensajes (`[WebServer]`). Un 503 es que la web no llega a Supabase (URL o claves mal copiadas).
- **E4 con «peticiones al feed» tras volver:** la página pidió un lote al volver de un detalle. Lo destapó la propia prueba: el observer del final del feed (`useSentinel`) entregaba un aviso viejo, tomado cuando el contenedor aún medía 0 de alto, y se pedía un lote que nadie necesitaba; ahora se confirma con la posición de ese momento.
- **E5 con «espaciadores a la vista»:** hay un hueco en blanco visible durante el scroll; el mensaje trae el paso y el scroll. Mirar `useMasonryPositions` y `virtualization`.
- **E7 sin mensaje en el receptor:** la web no llegó al SMTP (puerto de `CONTACT_SMTP_PORT`) o falló el envío; el registro del servidor trae el error.
- **E8 «Montaje de la tool de prueba, …»:** el paso que falla (crear el contenido, el paquete o la versión, o subir un fichero) y el mensaje de Supabase. Casi siempre es una migración que cambió una columna o una política de Storage.
- **Un test concreto:** descargar el artefacto `playwright-report` y abrir la traza (`npx playwright show-trace`).

Los avisos `❌ Variables de entorno inválidas… (Talent, Mailchimp…)` del arranque son normales: los E2E no definen esas integraciones y el resto de la web sigue en pie.

## 5. Estado de la validación

**Confirmado en GitHub (3 nov):** el flujo con E1 a E8 se ejecutó dos veces sin errores. Con eso quedan comprobados, en la práctica, `supabase start` con las 58 migraciones y los dos seeds (con `pg_cron` y Storage reales), los nombres de variable de `supabase status -o json`, la acción `supabase/setup-cli` v3.2.0 con la CLI 3.0.0, `playwright install --with-deps chromium`, la subida y lectura de ficheros de E8 con la clave secreta nueva (`sb_secret_…`) y la estabilidad de E4 y E5 en el runner.

Antes de eso, todo se había validado en un entorno sin Docker (PostgreSQL 17 y PostgREST 14.15 reales, con los esquemas `auth` y `storage` y `pg_cron` simulados), y el receptor SMTP de E7 se prueba en cada `npm test` con el nodemailer real.

**Sigue sin comprobarse:**

- Que E6 no dependa de internet: las peticiones a `youtube-nocookie.com` se interceptan con una página mínima; si el reproductor pidiera otro dominio de Google, saldría a la red real.
- Que la CSP con `upgrade-insecure-requests` y las cookies `Secure` no estorben en `http://localhost` con otro navegador distinto de Chromium (ahora solo se prueba Chromium).
