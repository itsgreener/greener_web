# Integración continua (GitHub Actions)

> **Estado a 2 de noviembre de 2026.** Flujo escrito y comprobado en local, pero **todavía no ejecutado en GitHub**: la primera ejecución real será la de la primera PR o el primer push tras subirlo. Se asume que el repositorio está en GitHub y que la rama principal se llama `main` o `master` (el flujo vigila las dos).

Qué se revisa en cada PR y en cada push a la rama principal, para que un cambio roto no llegue a la preview de Vercel sin que nadie lo vea. Los ficheros son `.github/workflows/ci.yml` y `.github/dependabot.yml`. El zip del proyecto no trae `.github` si se genera sin carpetas ocultas: al copiarlo al repositorio hay que incluirlo.

## 1. Qué hace cada trabajo

Los cuatro trabajos corren en paralelo, cada uno en su propio `ubuntu-latest`, con el Node de `.nvmrc` (hoy 24.22.1, el mismo que exige `engines` en `package.json`) y la caché de npm.

| Trabajo                    | Qué ejecuta                                     | Tiempo medido en local                    | Bloquea                      |
| -------------------------- | ----------------------------------------------- | ----------------------------------------- | ---------------------------- |
| Lint, tipos y tests        | `npm run lint`, `npm run typecheck`, `npm test` | ESLint ~22 s, tipos ~19 s, tests ~3,5 min | Sí                           |
| Build de producción        | `npm run build` con cinco variables de relleno  | ~1 min                                    | Sí                           |
| Dependencias de producción | `npm audit --omit=dev --audit-level=high`       | segundos                                  | Sí                           |
| Formato (Prettier)         | `npm run format:check`                          | ~10 s                                     | **No** (informativo, ver §3) |

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

## 3. Formato: por qué no bloquea todavía

`npm run format:check` revisa todo el repositorio con la configuración de `.prettierrc` y hoy marca unos 25 ficheros (medido el 2 de noviembre con la configuración y el `.prettierignore` actuales): unos 17 documentos de `docs/`, cinco scripts de `scripts/` y los tipos generados `src/lib/supabase/database.types.ts`. Un trabajo que falla desde el primer día se acaba ignorando, así que va con `continue-on-error: true`: aparece en la PR con aviso, pero no impide fusionar. Para pasarlo a bloqueante:

1. Decidir qué se reformatea y qué se ignora. Lo más corto: añadir a `.prettierignore` los tipos generados (`src/lib/supabase/database.types.ts`, que `db:types` vuelve a escribir) y, si no se quieren reformatear, `docs/` y `scripts/`.
2. Ejecutar `npm run format` en una rama aparte y revisar el diff (solo debe cambiar el formato; un documento reformateado cambia tablas y saltos de línea).
3. Cuando `npm run format:check` pase limpio, borrar la línea `continue-on-error: true` del trabajo `format`.

## 4. Lo que hay que hacer en GitHub (no se puede desde el código)

1. **Subir `.github/`** al repositorio y abrir una PR de prueba para ver las cuatro marcas en verde.
2. **Proteger la rama principal** (Settings → Branches → Add rule): exigir que pasen «Lint, tipos y tests», «Build de producción» y «Dependencias de producción» antes de fusionar. Sin esto el CI avisa, pero no impide nada. Si se mantiene fusionar sin pasar por PR, la regla no sirve.
3. **Activar Dependabot** (Settings → Code security): alertas y actualizaciones de seguridad. Las PR semanales de versión salen de `dependabot.yml`.
4. **Nombre de la rama.** Si no es `main` ni `master`, cambiar `branches: [main, master]` en `ci.yml`.

## 5. Lo que el CI no cubre

- No hay tests de integración contra Supabase ni E2E en navegador: son el plan del §9 de `especificaciones/plan-mejoras-codigo-nov-2026.md` (Playwright; pendiente de decidir si usa Supabase local en Docker).
- No ejecuta migraciones SQL; los tests de `tests/unit/supabase/` solo leen los ficheros `.sql`.
- Vercel hace su propio build de la preview: el CI no lo sustituye, lo adelanta. Un build verde aquí no garantiza que las variables reales de Vercel sean válidas.
- Los avisos de ESLint no hacen fallar el trabajo: solo los errores.
