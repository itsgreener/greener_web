# Tests E2E (Playwright)

Tests de navegador sobre la web real: compilación de producción y un Supabase local en Docker con las 58 migraciones y los datos de demo. Plan y decisiones: `especificaciones/plan-mejoras-codigo-nov-2026.md` §9. Los ficheros son `.github/workflows/e2e.yml` (oculto: se copia a mano al repositorio), `e2e/`, `scripts/e2e-env.mjs`, `scripts/e2e-serve.mjs` y `supabase/config.toml`.

## 1. Cuándo corren

- **Cada noche**, a las 23:07 UTC (00:07 en invierno, 01:07 en verano), y **a mano**: pestaña Actions de GitHub, flujo «E2E», «Run workflow».
- No corren en cada subida ni en cada pull request (decisión de Greener, 3 nov): una ejecución dura entre 8 y 12 minutos. Con unas 30 al mes son unos 300 minutos de Actions, lejos de los 2.000 del plan gratuito de un repositorio privado.
- **Solo en el CI.** No hay que instalar Docker en ningún ordenador. Un fallo nocturno avisa por correo a quien tenga activadas las notificaciones de Actions.

## 2. Qué prueban hoy

| Id | Caso | Estado |
| --- | --- | --- |
| E1 | La primera carga del feed pinta 40 pines (lote de escritorio) sin errores de consola | Hecho |
| E2 a E8 | Misma seed, otra seed al recargar, volver desde un detalle, scroll largo, consentimiento, contacto y paquete de tool | Pendientes (plan §9.3) |

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
- **Un test concreto:** descargar el artefacto `playwright-report` y abrir la traza (`npx playwright show-trace`).

Los avisos `❌ Variables de entorno inválidas… (Talent, Mailchimp…)` del arranque son normales: los E2E no definen esas integraciones y el resto de la web sigue en pie.

## 5. Lo que no se ha podido comprobar

La primera ejecución real en GitHub es la prueba que falta. Se validó en un entorno sin Docker con un PostgreSQL 17 real, PostgREST 14.15 (la versión de producción) y las mismas variables, pero con los esquemas `auth` y `storage` y `pg_cron` simulados. Queda sin confirmar:

- Que la imagen de Supabase aplique todo igual con `pg_cron` y Storage reales.
- Que `supabase status -o json` imprima la URL y las claves con los nombres que busca `scripts/e2e-env.mjs`.
- Que la acción `supabase/setup-cli` v3.2.0 acepte `version: 3.0.0`.
- Que `npx playwright install --with-deps chromium` funcione sin ajustes en el runner.
- Que la CSP con `upgrade-insecure-requests` y las cookies `Secure` no estorben en `http://localhost` con otro navegador distinto de Chromium (ahora solo se prueba Chromium).
