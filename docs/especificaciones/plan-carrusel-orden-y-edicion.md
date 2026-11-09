# Plan — reordenar y editar las diapositivas del carrusel de los casos

**Estado: plan redactado el 9 de noviembre de 2026; ejecución en el mismo día (§2.146 del historial).** Petición de Greener, a continuación de la carga masiva (`plan-carrusel-carga-masiva.md`, §2.145): desde el ABM hay que poder **cambiar el orden de las diapositivas sin quitarlas y volver a subirlas**, y **editar una diapositiva ya subida**, ya sea para **modificar su alt** o para **sustituir su medio** (imagen o vídeo); al sustituir el medio, **el anterior tiene que borrarse del almacenamiento** (Cloudinary Free no tolera basura acumulada).

---

## 1. Qué hay hoy (código frente a documentación)

| Pieza | Estado real | Coincide con la documentación |
| --- | --- | --- |
| Tabla `case_detail_media` | `id`, `content_id`, `media_id` (→ `media_asset`), `sort_order` (entero **no único**, índice por `(content_id, sort_order)`), `alt` | Sí (migraciones `20260910083400` y `20260914090000`) |
| RPC del carrusel | Solo tres: `add_case_carousel_image`, `add_case_carousel_video` y `remove_case_carousel_media`. **Ninguna cambia el orden ni el alt de una fila existente** | Sí: contrato de medios §5.4 y plan de la carga masiva («fuera de alcance: reordenación») |
| Lectura | `listByContentId` (ABM) y `getPublicCaseCarousel` (web) ordenan por `sort_order`; la web pública es dinámica (`ƒ` en el build), sin caché que invalidar | Sí |
| Quitar una diapositiva | `snapshotMedia` (lee de la base el archivo a borrar) → RPC → `purgeRemovedMedia` (borra de Cloudinary solo lo que ya no existe en `media_asset`) | Sí: contrato de medios §9 y auditoría de seguridad del 8 oct (P0-2: nunca se borra el public id que manda el navegador) |
| Sustituir el medio de un **pin** | No hay sustitución atómica: se quita y se vuelve a poner (`detachPinMedia` + `attachPin*`), con el pin sin medio entre los dos pasos | Sí |
| UI | `CaseCarouselManager`: rejilla de miniaturas con «Quitar», «Quitar todas» y la carga masiva de §2.145. Sin editar, sin mover | Sí |
| `AdminMediaItem` | Compartido con `PinMediaManager` (`image`, `videoId`, `caption`, `disabled`, `onRemove`) | — |
| Errores de negocio | SQLSTATE `ZG0xx` traducidos a `DomainError` en un único sitio (`postgresErrors.ts`); `ZG014` = «el medio no pertenece a este caso» | Sí (migración `20261009120000`) |
| Tests | `caseCarousel.test.ts` (casos de uso), `caseCarouselActions.test.ts`, `mediaAssetRepositoryRpc.test.ts`, `mediaAssetSchema.test.ts`, `caseCarouselManager.test.tsx`, `caseCarouselBulkUpload.test.tsx` | — |

**Hallazgos que condicionan el diseño**

1. **Hace falta una migración nueva** (es la primera del carrusel desde §2.130): sin RPC propias no se puede cambiar el orden ni el alt, y hacerlo con `update` directo desde la aplicación se saltaría el patrón del proyecto (toda mutación del ABM pasa por una función `security invoker` con `is_admin()` y deja constancia en `audit_log`). **Greener tiene que ejecutarla en Supabase antes de usar las funciones nuevas** (mismo trámite que las migraciones de §2.118 y §2.143).
2. **Sustituir el medio no puede ser «quitar y poner»**: la diapositiva perdería su posición y su alt, y entre un paso y otro el carrusel de un caso publicado quedaría con un hueco visible. Tiene que ser una operación única en Postgres que cambie el `media_id` **de la misma fila** (conserva `id`, `sort_order` y, si no se cambia, el alt) y borre el `media_asset` anterior en la misma transacción.
3. **El archivo anterior se borra después, y se lee de la base antes** (mismo orden que «Quitar»: `snapshotMedia` → RPC → `purgeRemovedMedia`). Si Cloudinary falla, la operación de Postgres ya está hecha y no se deshace: se avisa y el reconciliador (`scripts/reconcile-cloudinary.mjs`) recoge el resto. Si la lectura previa no pudo identificar el archivo (devuelve `[]` y lo registra), también se avisa en lugar de dejarlo pasar en silencio.
4. **Si falla el registro tras subir el archivo nuevo**, el archivo recién subido se descarta (`uploadImageFlow` / `uploadVideoFlow` ya lo hacen); el anterior no se toca porque la transacción de Postgres se revierte entera.
5. **Dos pestañas**: el orden se manda como la lista completa de ids; si el carrusel ya no coincide con la base (otra pestaña añadió o quitó algo), la función **rechaza** en lugar de pisar. El cerrojo del editor es por pestaña (igual que hoy).
6. **El orden se renumera denso (0…n−1)**: además de aplicar el orden pedido, deshace cualquier empate o hueco que quede de antes (el error de `items.length` corregido en §2.145 pudo dejar alguno en casos ya cargados).
7. **No hay librería de arrastrar y soltar** en las dependencias y el proyecto no añade dependencias sin necesidad.

## 2. Decisiones de diseño

| # | Decisión | Por qué |
| --- | --- | --- |
| D1 | **Reordenar con borrador local**: cada miniatura tiene «←» y «→» (mover antes / después) y una casilla «Posición» para saltos largos. Nada se guarda hasta pulsar **«Guardar orden»**; «Descartar» vuelve al orden guardado. Un solo envío atómico con la lista completa de ids | Un viaje al servidor por cambio sería lento y dejaría estados intermedios; con 30 diapositivas, mover una del final al principio no puede costar 29 recargas. Los botones funcionan con teclado y lector de pantalla |
| D2 | **Mientras haya un orden sin guardar**, el resto de operaciones del carrusel (editar, quitar, quitar todas, subir) quedan deshabilitadas con un aviso | Evita mezclar un orden provisional con cambios que refrescan la página; el borrador se reconcilia solo si aun así cambia la composición |
| D3 | **Editar = un panel para la diapositiva elegida** («Editar» en su miniatura): campo **Alt** (obligatorio) y selector de **archivo de sustitución** (opcional). El tipo se detecta por el archivo: se puede sustituir una imagen por un vídeo y al revés | Es lo pedido; reutiliza las mismas comprobaciones de la subida normal |
| D4 | **Sin archivo → solo alt** (`update_case_carousel_alt`, no toca ningún medio). **Con archivo → sustitución** (`replace_case_carousel_media`) llevando también el alt del panel: un único guardado atómico | Cambiar solo el texto no debe pasar por Cloudinary ni gastar una llamada a su Admin API |
| D5 | **Una sola función SQL de sustitución para los dos tipos** (`p_kind`), con las mismas validaciones y códigos de error que las de alta (imagen ≤ 5 MB, vídeo ≤ 100 MB y 180 s). En TypeScript siguen siendo dos casos de uso porque la verificación en Cloudinary es distinta | Evita duplicar ~100 líneas de SQL; el cliente y el servidor conservan la separación imagen/vídeo |
| D6 | **El public id nuevo no puede ser el actual ni estar ya registrado** (las altas permiten reutilizar un `media_asset` existente; aquí no, porque se borra el anterior y un medio compartido rompería la otra referencia) | Más estricto a propósito: una subida firmada genera siempre un id nuevo, así que no afecta al uso normal |
| D7 | **Los errores reutilizan los códigos existentes**: `ZG014` (no pertenece / el carrusel cambió), `ZG006` (no es un case), `ZG002`–`ZG004` (límites), `22023` (datos inválidos). Sin código nuevo | Menos superficie: no hay que tocar `postgresErrors.ts` ni `DomainErrorKind`; cada acción pone su frase |
| D8 | **Dónde vive cada cosa**, como lo existente: esquemas en `media/domain/mediaAssetSchema.ts`, métodos en `MediaAssetRepository` (junto a add/remove), casos de uso en `content/application/`, acciones en `caseCarouselActions.ts` | Un solo sitio por tipo de pieza; sin refactorizar lo que ya funciona |
| D9 | **Sin dependencias nuevas.** Arrastrar y soltar queda fuera (se puede añadir después sobre el mismo borrador de orden) | Ver hallazgo 7 |
| D10 | **`AdminMediaItem` gana tres props opcionales** (`actions`, `badge`, `active`); `PinMediaManager` no cambia | Compartido con los pines |

## 3. Cambios por capas

**Base de datos** (`supabase/migrations/20261109140000_case_carousel_reorder_and_edit.sql`, tres funciones `security invoker`, `revoke … from public` / `grant execute … to authenticated`, `audit_log` en cada una)

1. `reorder_case_carousel(p_content_id uuid, p_media_ids uuid[]) → integer`: admin; el contenido existe y es un case; bloquea las filas; la lista debe contener **exactamente** los medios del carrusel, sin repetidos (si no, `ZG014`); renumera `sort_order = posición − 1`.
2. `update_case_carousel_alt(p_content_id, p_media_id, p_alt) → uuid`: alt no vacío (`22023`); la fila debe existir (`ZG014`).
3. `replace_case_carousel_media(p_content_id, p_media_id, p_kind, p_cloudinary_public_id, p_format, p_width, p_height, p_bytes, p_alt, p_duration_seconds default null) → uuid`: validaciones por tipo; ownership (`ZG014`); inserta el `media_asset` nuevo, apunta la fila a él con el alt, y borra el anterior (si algo más lo referencia, la FK revierte todo: `media_in_use`, igual que «Quitar»).
4. `src/lib/supabase/database.types.ts`: las tres firmas a mano, en su orden alfabético (como en §2.143); `npm run db:types` las dejará igual.

**Dominio y aplicación** (sin Next ni React; reglas de capas de ESLint)

1. `media/domain/mediaAssetSchema.ts`: `reorderCaseCarouselSchema`, `updateCaseCarouselAltSchema`, `replaceCaseCarouselImageSchema`, `replaceCaseCarouselVideoSchema`.
2. `media/domain/mediaAssetRepository.ts` y `infrastructure/supabaseMediaAssetRepository.ts`: `reorderCaseCarousel`, `updateCaseCarouselAlt`, `replaceCaseCarouselMedia` (una RPC cada uno).
3. `content/application/`: `reorderCaseCarousel.ts`, `updateCaseCarouselAlt.ts`, `replaceCaseCarouselMedia.ts` (imagen y vídeo; vídeo encarga el calentamiento como el alta) y su cableado en `container.ts`.
4. `content/domain/caseCarouselOrder.ts`: `moveCarouselItem(ids, from, to)` y `isSameOrder(a, b)`, puras, para el borrador.
5. `media/application/cleanupMedia.ts`: solo el comentario (un cuarto momento en que un archivo se queda sin dueño: se sustituye un medio).

**Servidor del ABM** (`caseCarouselActions.ts`): `reorderCaseCarouselAction`, `updateCaseCarouselAltAction`, `replaceCaseCarouselImageAction`, `replaceCaseCarouselVideoAction`, con el mismo esquema que las existentes (`isAdminRequest` → zod → caso de uso → mensaje por `adminErrorMessage`; aviso si el archivo anterior no se pudo borrar).

**Cliente** (`CaseCarouselManager/`)

1. `useCarouselOrder.ts`: borrador de orden **derivado** (se reconcilia con `items`, sin efectos), `dirty`, mover, guardar, descartar.
2. `useCarouselSlideEditor.ts`: panel de edición (alt, archivo, validaciones locales, subida con `uploadImageFlow` / `uploadVideoFlow` y registro por la acción de sustitución, o solo alt).
3. `CarouselSlide.tsx` (flechas, posición, «Editar»), `CarouselOrderBar.tsx` («Guardar orden» / «Descartar»), `CarouselSlideEditor.tsx` (panel), `index.tsx` y `useCaseCarouselManager.ts` (composición y reglas D2).
4. `AdminMediaItem` (props opcionales) y su CSS.

**Tests**: dominio (`moveCarouselItem`, `isSameOrder`); esquemas; casos de uso (orden snapshot → RPC → purga, aviso si no se pudo leer el archivo anterior, vídeo calienta); acciones (validación, `ZG014`, aviso); argumentos de las RPC; **migración** (texto de las tres funciones: permisos, auditoría, códigos); componente (mover, posición, guardar y descartar, bloqueos, editar alt, sustituir imagen y vídeo, error al registrar con descarte del archivo nuevo, aviso de purga). Y la **ejecución real del SQL** de las tres funciones en un Postgres de prueba (PGlite) con el esquema mínimo, solo como comprobación de esta sesión.

**Documentación**: este plan, `especificacion-final-formato-detalle.md` (fila «Carrusel de detalle»), `PROGRESO.md` (fila §2.146, §4.1 migración pendiente, §4.2 comprobación a mano, registro §6, cifras), `historial-fase-5.md` §2.146, `docs/README.md`, `supabase/README.md` (60 migraciones), `docs/operaciones/e2e.md` (60), `estructura-src.txt`.

## 4. Orden de ejecución y verificación

| Fase | Contenido | Se comprueba |
| --- | --- | --- |
| 0 | Línea base: suite completa en verde antes de tocar nada (340 ficheros, 4167 tests) | Hecha en §2.145 |
| 1 | Migración SQL y comprobación real en PGlite (orden denso, rechazo si el conjunto no coincide, sustitución conservando posición y alt, FK al reutilizar medio, permisos) | Script de prueba de la sesión (no se entrega) |
| 2 | Esquemas, repositorio, casos de uso y contenedor, con sus tests | Vitest del ámbito |
| 3 | Acciones de servidor con sus tests | Vitest |
| 4 | Cliente: dominio del borrador, hooks y componentes | Tests de componente con Cloudinary y acciones simuladas; los dos tests existentes del carrusel siguen en verde |
| 5 | Documentación | Revisión cruzada de referencias |
| 6 | `npm test` completo, `npm run typecheck`, ESLint, Prettier con la configuración del proyecto y `next build` con las variables de relleno del CI; zip del proyecto completo | Resumen en el historial |

## 5. Fuera de alcance y riesgos

- **Hay que ejecutar la migración en Supabase antes de usar la función nueva.** Sin ella, «Guardar orden» y «Guardar cambios» fallan con el mensaje genérico y no se rompe nada más (las altas y los borrados no dependen de ella). Va a §4.1 de `PROGRESO.md`.
- **No se puede verificar aquí** el comportamiento con Cloudinary ni con Supabase reales: el SQL se ha ejecutado en un Postgres de prueba con un esquema mínimo (sin RLS ni `auth`), y los tests de la aplicación simulan Cloudinary y las acciones. Queda una comprobación a mano con un caso real (§4.2).
- **Arrastrar y soltar** y la **edición masiva de alts** (por ejemplo, un CSV sobre diapositivas ya subidas) quedan fuera; el borrador de orden está pensado para que el primero se pueda añadir después sin tocar el servidor.
- **No se toca** el tope de 40 MB del vídeo de carrusel (propuesta pendiente del contrato de medios).
- Cada imagen sustituida pasa por la verificación del servidor, que llama a la Admin API de Cloudinary (500 llamadas por hora en el plan Free); cambiar solo el alt o el orden no la usa.
- Dos pestañas del ABM sobre el mismo caso: el orden se rechaza si el carrusel ya no coincide (D2 del plan y hallazgo 5); editar el alt de una diapositiva que otra pestaña acaba de quitar da «ya no existe».
