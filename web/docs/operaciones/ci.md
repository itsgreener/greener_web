# Integración continua (GitHub Actions)

> **Estado a 3 de noviembre de 2026.** El repositorio es privado, está en GitHub y su rama principal es `main` (el flujo solo vigila esa; si algún día cambia, se cambia `branches` en `ci.yml`). El formato pasó a bloquear el 3 de noviembre (§3). El flujo de E2E, en `e2e.yml`, se ha ejecutado dos veces en GitHub sin errores (`docs/operaciones/e2e.md` §5).

Qué se revisa en cada PR y en cada push a la rama principal, para que un cambio roto no llegue a la preview de Vercel sin que nadie lo vea. Los ficheros son `.github/workflows/ci.yml` y `.github/dependabot.yml`. El zip del proyecto no trae `.github` si se genera sin carpetas ocultas: al copiarlo al repositorio hay que incluirlo.

## 1. Qué hace cada trabajo

Los cuatro trabajos corren en paralelo, cada uno en su propio `ubuntu-latest`, con el Node de `.nvmrc` (hoy 24.22.1, el mismo que exige `engines` en `package.json`) y la caché de npm.

| Trabajo                    | Qué ejecuta                                     | Tiempo medido en local                    | Bloquea                      |
| -------------------------- | ----------------------------------------------- | ----------------------------------------- | ---------------------------- |
| Lint, tipos y tests        | `npm run lint`, `npm run typecheck`, `npm test` | ESLint ~22 s, tipos ~19 s, tests ~3,5 min | Sí                           |
| Build de producción        | `npm run build` con cinco variables de relleno  | ~1 min                                    | Sí                           |
| Dependencias de producción | `npm audit --omit=dev --audit-level=high`       | segundos                                  | Sí                           |
| Formato (Prettier)         | `npm run format:check`                          | ~10 s                                     | Sí (ver §3)                  |

Por qué el build lleva variables: `next build` importa `src/lib/env.ts` y `src/lib/env.client.ts`, que exigen `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (más `NEXT_PUBLIC_SITE_URL`, que tiene valor por defecto pero se fija para no depender de él). En el flujo son valores de relleno escritos a la vista: no se conectan a Supabase ni se usa ningún secreto del repositorio. Si `env.ts` pasa a exigir otra variable, el build del CI fallará con el nombre de la que falta, y basta con añadirla al bloque `env` del trabajo.

Por qué los tests no llevan `NEXT_PUBLIC_SITE_URL`: varios comprueban el valor por defecto (`http://localhost:3000`). Si se define en el trabajo de tests, esos tests fallan.

Qué se vigila además:

- **Semanal.** Cada lunes a las 06:17 UTC corre solo el trabajo de dependencias, porque una vulnerabilidad nueva aparece aunque nadie toque el código. Si falla, GitHub avisa por correo a quien tenga activadas las notificaciones de Actions.
- **Duplicados.** Si se hace un push nuevo a la misma rama mientras corre la ejecución anterior, la anterior se cancela.
- **Permisos.** El flujo solo puede leer el repositorio (`contents: read`).
- **Acciones fijadas por SHA.** `actions/checkout` y `actions/setup-node` van por el SHA exacto de su commit, con la versión en un comentario. Una etiqueta como `v7` se puede mover; un SHA no. Dependabot propone las subidas cada semana, agrupadas.
- **Dependabot de npm.** Una PR semanal con las subidas menores y de parche agrupadas. Las mayores de Next, React, React DOM y TypeScript no las propone: se suben a mano. Tampoco las mayores de `@types/node`: los tipos deben ser los del Node del proyecto (`.nvmrc` y `engines`), no los de la última versión que exista. Las mayores del resto (ESLint, Vitest…) sí llegan, cada una en su PR, y el CI dice si encajan o no.
- **Vercel no compila las ramas de Dependabot.** `vercel.json` lleva un `ignoreCommand` que salta el despliegue de toda rama `dependabot/*`: esas PR ya pasan por el CI de GitHub (instalación, lint, tipos, tests y build) y una preview rota en Vercel solo añadía un error rojo sin información nueva. El test `tests/unit/shared/vercelConfig.test.ts` ejecuta el comando con distintos nombres de rama. En la PR de Dependabot, Vercel aparece como cancelado u omitido, no como error.

## 2. Reproducirlo en local

Es lo mismo que corre el CI, en este orden:

```bash
npm ci
npm run lint
npm run typecheck
env -u NEXT_PUBLIC_SITE_URL npm test      # en Windows, con la variable sin definir
npm audit --omit=dev --audit-level=high
npm run format:check
```

Y el build, con las variables de relleno (en bash; en PowerShell se asignan antes con `$env:NOMBRE='valor'`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ci-placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ci_placeholder \
NEXT_PUBLIC_SITE_URL=https://ci.invalid \
SUPABASE_SECRET_KEY=sb_secret_ci_placeholder \
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=ci-placeholder \
npm run build
```

`npm run typecheck` deja `.next`, `tsconfig.tsbuildinfo` y `next-env.d.ts`; los tres están en `.gitignore`.

### Qué comprueba cada tsconfig

- **`tsconfig.json`** (editor y `npm run typecheck`): todo lo que sea `.ts` o `.tsx` fuera de `node_modules`: `src/`, `tests/`, `next.config.ts`, `vitest.config.ts` y los `.mjs` de `scripts/` que importa algún test. `docs/`, `supabase/` y `.github/` no tienen TypeScript y no hace falta excluirlos. `e2e/` está excluido y tiene su propio `e2e/tsconfig.json`, que el mismo script pasa aparte.
- **`tsconfig.build.json`** (solo `next build`, indicado en `next.config.ts`): únicamente `src/`. Así la compilación de producción no depende de vitest ni de Playwright y la fase de tipos baja de unos 22 s a unos 10 s. Los tipos de tests y E2E los vigila `npm run typecheck`, que corre en el CI junto al build.

## 3. Formato

`npm run format:check` revisa el repositorio con la configuración de `.prettierrc` y deja fuera lo que lista `.prettierignore`: `/docs` y `/scripts` (documentos y utilidades de uso interno, que no se reformatean), los tipos generados `src/lib/supabase/database.types.ts` (que `db:types` vuelve a escribir), `/.github`, el `package-lock.json` y los directorios de salida (`.next`, `test-results`, `playwright-report`). Desde el 3 de noviembre pasa limpio sobre todo lo demás, así que el trabajo **bloquea** (se quitó el `continue-on-error: true` que llevaba mientras marcaba unos 25 ficheros).

Si falla, lo normal es ejecutar `npm run format` en local y subir el resultado; el diff solo debe cambiar el formato. Un fichero nuevo que no deba formatearse (un volcado, un generado) se añade a `.prettierignore` en vez de desactivar el trabajo. `.prettierrc` lleva `endOfLine: auto`, para que Prettier respete los finales de línea de cada fichero (el repositorio mezcla LF y CRLF) en lugar de reescribirlos.

## 4. Lo que hay que hacer en GitHub (no se puede desde el código)

1. **Subir `.github/`** al repositorio y abrir una PR de prueba para ver las cuatro marcas en verde.
2. **Protección de la rama principal: decidido no forzarla (3 nov).** Greener sube directamente a `main`, así que no se exige que el CI pase antes de fusionar: el CI corre en cada push y avisa por correo si falla, pero no impide nada. Si algún día se trabaja con PR, la regla sería (Settings → Branches → Add rule) exigir «Lint, tipos y tests», «Build de producción», «Dependencias de producción» y «Formato (Prettier)». Sin esto el CI avisa, pero no impide nada. Si se mantiene fusionar sin pasar por PR, la regla no sirve.
3. **Activar Dependabot** (Settings → Code security): alertas y actualizaciones de seguridad. Las PR semanales de versión salen de `dependabot.yml`.
4. **Nombre de la rama.** El flujo vigila `main`; si la rama principal cambia de nombre, cambiar `branches: [main]` en `ci.yml`.

## 5. Lo que el CI no cubre

- No hay tests de integración contra Supabase. Los E2E en navegador están en su propio flujo, `.github/workflows/e2e.yml` (de noche y a mano, con Supabase local en Docker): `docs/operaciones/e2e.md`.
- No ejecuta migraciones SQL; los tests de `tests/unit/supabase/` solo leen los ficheros `.sql`.
- Vercel hace su propio build de la preview: el CI no lo sustituye, lo adelanta. Un build verde aquí no garantiza que las variables reales de Vercel sean válidas.
- Los avisos de ESLint no hacen fallar el trabajo: solo los errores.
