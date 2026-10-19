# Auditoría de errores y código muerto (16 oct 2026)

**Estado: cambios aplicados (§2.81); puntos 1-3 del apartado 4 resueltos el 19 de octubre (§2.82), el 4 sigue abierto.** Fecha: 16 de octubre de 2026. Estado analizado: el zip de esa fecha, después de §2.80 y de la corrección de ESLint de `ConsentProvider`. Método: `next typegen` + `tsc` (también con `--noUnusedLocals --noUnusedParameters`), ESLint (también con `--report-unused-disable-directives`), [knip](https://knip.dev) 5 para ficheros, exportaciones y dependencias, y comprobaciones propias: clases de CSS (módulos y globales), variables de entorno, eventos de analítica, rutas de API, ficheros de `public/`, scripts, funciones SQL reconstruyendo las 56 migraciones en orden y códigos de error `ZG…`. Verificación final con la suite completa y `next build`.

---

## 1. Resumen

1. **El código está limpio.** No hay variables, parámetros ni imports sin usar (ni `tsc` estricto ni ESLint encuentran nada), ni clases de CSS huérfanas, ni variables de entorno, eventos de Plausible, rutas, iconos o scripts sin uso. Las directivas `eslint-disable` y `@ts-expect-error` están todas justificadas.
2. **Muerto de verdad solo había tres cosas**, todas borradas: dos constantes de scripts (`FALLBACK_RATIO` en `warm-cloudinary.mjs` y `CONTENT_TYPES` en `warm-probe.mjs`) y la dependencia `@types/adm-zip`, obsoleta porque `adm-zip` 0.6 ya trae sus propios tipos.
3. **32 símbolos de `src` estaban exportados sin que nadie los importara.** Se usan dentro de su propio fichero (casi siempre agrupados en el objeto que implementa un puerto, p. ej. `feedSessionRepository`), así que se les ha quitado el `export`. No cambia el comportamiento: `tsc` fallaría si alguien los importara.
4. **Quedaban cuatro decisiones para Greener** (apartado 4). Las tres primeras (respaldo de mensajes antiguos de `postgresErrors.ts`, código `stale_reference` y script `fix-video-durations.mjs`) se resolvieron el 19 de octubre; queda abierta la de los resultados de la auditoría de cookies dentro del repositorio.

## 2. Cambios aplicados

| Fichero | Cambio | Motivo |
| --- | --- | --- |
| `scripts/warm-cloudinary.mjs` | Fuera `FALLBACK_RATIO` | Declarada en la copia del contrato de entrega, sin ningún uso ni en el script ni en sus tests |
| `scripts/warm-probe.mjs` | Fuera `CONTENT_TYPES` | Sin ningún uso |
| `package.json`, `package-lock.json` | Fuera `@types/adm-zip` (0.5.8) | `adm-zip` 0.6.1 publica `types.d.ts`; el paquete de tipos era el de la versión anterior y TypeScript ya no lo usaba. El lock solo pierde esa entrada |
| 19 ficheros de `src` | `export` retirado de 32 símbolos | Solo se usan en su propio fichero (lista en el anexo) |

En la misma jornada, antes de esta auditoría (también en §2.81): `ConsentProvider` lee la cookie con `useSyncExternalStore` (regla `react-hooks/set-state-in-effect`), con respaldo en memoria si el navegador bloquea las cookies y dos tests nuevos; y fuera `allowVimeo` (`cookie-audit-all.mjs`) e `isLocal` (`cookie-audit.mjs`).

## 3. Revisado y vivo (falsos positivos de knip)

1. **`public/greener-package-analytics.js`**: lo inyecta `composeToolDocument.ts` como `<script src>` en los documentos de tools e insights.
2. **`scripts/generate-demo-data.mjs`** y **`scripts/sim-video-hover/`**: herramientas manuales documentadas (`PROGRESO.md` y `docs/operaciones/simulacion-video-hover.md`); se conservan a propósito (§2.20 del historial).
3. **Exportaciones de `scripts/*.mjs`** (`warm-cloudinary`, `warm-probe`, `reconcile-cloudinary`): las importan los tests de contrato o el propio script.
4. **57 tipos exportados que solo se usan en su fichero**: inofensivos y útiles como documentación de la forma de los datos. No se tocan.
5. **Vimeo**: lo que queda en `src` es intencionado (el valor sigue en el enum de Postgres `episode_provider`) y en los scripts de auditoría de cookies sirve para detectar tráfico de Vimeo si volviera a colarse.
6. **Funciones SQL que el código no llama**: las del editor de bloques y las de portada ya se borran en `20260910083700` y `20261015130000`; `enforce_max_pins_per_content`, `enforce_single_pin_media`, `other_detail_guard` y `set_updated_at` son triggers. Tras aplicar las 56 migraciones quedan 31 funciones, todas en uso.
7. **`/api/health`**: no la llama la web, sino la monitorización del despliegue (`despliegue.md` §8).

## 4. Pendiente de decisión

**Actualización del 19 oct (§2.82):** Greener pide quitar los puntos 1, 2 y 3. Hecho; el 4 se deja de momento.

1. **(Hecho, §2.82)** **Respaldo `LEGACY_KIND_BY_MESSAGE` (`src/lib/supabase/postgresErrors.ts`).** Traduce los mensajes de error de las funciones SQL anteriores a `20261009120000_typed_error_codes.sql`. El propio comentario dice que se puede borrar cuando esa migración esté aplicada en todos los entornos. **Greener: confirmar si está aplicada en producción**; si lo está, se borra junto con sus tests.
2. **(Hecho, §2.82)** **`stale_reference` (ZG013) ya no lo lanza ninguna función.** Lo lanzaba `unlink_and_delete_cover_media`, que se borró el 15 de octubre con la portada de `other`. Sigue cableado en `domainError.ts`, `adminErrorMessage.ts`, `postgresErrors.ts` y sus tests. Es inofensivo; se puede retirar junto con el punto anterior. Ojo: el comentario de `20261015130000_remove_other_cover.sql` dice que ZG013 «lo sigue usando `unlink_and_delete_media_asset`», pero esa función se borró el 10 de septiembre. No se corrige porque una migración aplicada no se edita.
3. **(Hecho, §2.82)** **`scripts/fix-video-durations.mjs`** es de un solo uso (corrige las 27 duraciones de 10 s inventadas antes del 8 de octubre). Según `PROGRESO.md` sigue pendiente de ejecutar; una vez ejecutado con `--execute`, se puede borrar.
4. **`cookie-audit-all/` en la raíz del repositorio.** Son los resultados de la auditoría de cookies del 15-16 de octubre. Su README avisa de que `audit.json` y `network.csv` pueden contener tokens en las URL. Conviene sacarlos del repositorio (o añadirlos al `.gitignore`) y guardarlos aparte. Lo mismo con `tsconfig.tsbuildinfo`, que es un artefacto de compilación. El zip no trae los ficheros ocultos, así que no se ha podido comprobar el `.gitignore`.

## 5. Verificación

`tsc` (tras `next typegen`) y ESLint limpios; **191 ficheros y 2055 tests en verde**; `next build` de producción compila (con variables de entorno ficticias, porque el zip no trae `.env.local`). Una segunda pasada de knip solo devuelve los falsos positivos del apartado 3. Prettier no se ha podido comprobar porque el zip no trae su configuración.

## Anexo: símbolos a los que se ha quitado el `export`

| Fichero | Símbolos |
| --- | --- |
| `app/(public)/privacy/policyContent.ts` | `POLICY_EMAIL` |
| `app/admin/(panel)/contents/[id]/edit/BulkPinUpload/rows.ts` | `buildRow` |
| `app/admin/_lib/formatAdminDateTime.ts` | `ADMIN_TIME_ZONE` |
| `components/masonry/useMasonryPositions.ts` | `NEWSLETTER_CARD_RATIO`, `isNewsletterEntry` |
| `lib/auth/adminSession.ts` | `checkAdminSession` |
| `lib/http/clientIp.ts` | `getClientIp` |
| `modules/contact/infrastructure/contactSubmissionLog.ts` | `RATE_LIMIT_WINDOW_MS` |
| `modules/contact/infrastructure/mailer.ts` | `sendContactEmail` |
| `modules/content/domain/otherSchema.ts` | `OTHER_KINDS` |
| `modules/feed/domain/feedScope.ts` | `SCOPE_TO_TYPES` |
| `modules/feed/infrastructure/cachedFeedCatalog.ts` | `FEED_DATASET_TTL_SECONDS` |
| `modules/feed/infrastructure/feedSessionRepository.ts` | `createFeedSessionRow`, `getFeedSessionRow`, `getFeedRound`, `saveFeedRound` |
| `modules/masonry/domain/labelHeight.ts` | `LABEL_SIDE_PADDING`, `APPROX_CHAR_WIDTH` |
| `modules/media/domain/closestRatio.ts` | `RATIO_MATCH_TOLERANCE` |
| `modules/media/domain/videoPlayback.ts` | `HAVE_FUTURE_DATA` |
| `modules/media/infrastructure/cloudinaryServer.ts` | `isManagedPublicId`, `warmVideoRenditions` |
| `modules/media/infrastructure/supabaseMediaRefs.ts` | `listPinMediaRefs`, `listContentMediaRefs`, `listMediaRefsByIds`, `findExistingMediaIds`, `isPublicIdRegistered` |
| `modules/media/infrastructure/supabaseWarmRepository.ts` | `readContentWarmInfo`, `readPinContentId`, `markWarmedWithSession`, `markWarmedWithService` |
| `modules/packages/infrastructure/supabaseStorageSource.ts` | `PACKAGE_VERSION_TTL_SECONDS` |
