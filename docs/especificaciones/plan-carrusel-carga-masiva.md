# Plan — carga masiva y CSV de alt en el carrusel de los casos

**Estado: plan cerrado el 9 de noviembre de 2026 y ejecutado el mismo día (§2.145 del historial).** Petición de Greener: el carrusel de detalle de un caso solo admite subir un archivo cada vez, eligiendo antes si es imagen o vídeo. Se quiere lo mismo que ya existe para los pines: **carga masiva**, **manteniendo la elección imagen o vídeo y limitando el lote a ese tipo**, y **un CSV opcional para rellenar los textos alternativos** (alt).

Cuando quede verificado, lo vigente se resume en `especificacion-final-formato-detalle.md` (§3, fila «Carrusel de detalle») y este plan pasa a historial.

---

## 1. Qué hay hoy (código frente a documentación)

| Pieza | Estado real | Coincide con la documentación |
| --- | --- | --- |
| Carrusel de caso (`CaseCarouselManager`) | Un archivo por vez: selector «Tipo de archivo», un `<input type="file">`, un alt y «Añadir al carrusel». `sortOrder = items.length` | Sí: spec §3 («1-N imágenes/vídeos mixtos, sin tope») y contrato de medios §5.4 |
| Límites | Imagen ≤ 5 MB, sin GIF ni animadas; vídeo ≤ 100 MB / 180 s; alt obligatorio (zod y SQL) | Sí. El tope de 40 MB del vídeo de carrusel sigue «propuesto» en el contrato y **no se toca** |
| Carga masiva de pines (`BulkPinUpload`) | Cola secuencial (`useUploadQueue`), tabla editable, CSV `filename,label,ratio,language,alt`, tipo detectado por archivo | Sí (§2.41, §2.42 del historial) |
| Parser CSV (`pinCsv.ts`) | Solo separador `,`; una fila por línea (un salto de línea dentro de comillas la rompe); empareja por nombre exacto sin distinguir mayúsculas | — (no documentado) |
| Servidor del carrusel | `addCaseCarouselImageAction` / `addCaseCarouselVideoAction` ya validan, verifican con Cloudinary y revalidan la página; las RPC `add_case_carousel_*` reciben `p_sort_order` y `p_alt` | — |
| Tests | `caseCarouselManager.test.tsx` y `mediaUploadFlows.test.tsx` cubren el flujo de un archivo | — |

**Hallazgos que condicionan el diseño**

1. **El orden de las diapositivas se calcula mal tras quitar una.** `sortOrder = items.length`, pero «quitar» no renumera: con órdenes 0, 1, 2 y la 0 quitada, la siguiente diapositiva recibe 2 y empata con la existente. La columna no es única, así que el empate se resuelve sin criterio. Con un lote el riesgo se multiplica: se corrige con `máximo + 1`.
2. **`precheck` y `onFinish` de `useMediaUpload`, y `before` de `MediaUploader`, solo los usa el carrusel** (el alt). Al retirar el alta individual quedan sin uso: se eliminan en el mismo cambio (hay auditoría de código muerto en el proyecto).
3. **El CSV de un diseñador que usa Excel en español sale con `;`**, y un nombre con tilde puede llegar del selector de archivos de macOS en NFD mientras que el CSV lo trae en NFC. Con el parser actual ninguna fila emparejaría y no habría ningún aviso. Como el alt es obligatorio, el fallo no sería silencioso pero sí desconcertante.
4. **Si el orden de un lote sale mal no hay forma de reordenar**: el carrusel no tiene reordenación, y la salida es «Quitar todas» y volver a subir (con el coste en Cloudinary Free). Por eso la tabla enseña la posición antes de subir.

## 2. Decisiones de diseño

| # | Decisión | Por qué |
| --- | --- | --- |
| D1 | **Un lote es de un solo tipo**, el del selector «Tipo de archivo» (Imagen o Vídeo), que se conserva. El selector de archivos acepta varios y solo los de ese tipo: lo que no encaje se **descarta con un aviso que lista los nombres** (`accept` no se aplica al arrastrar ni con «Todos los archivos»). Cambiar de tipo vacía el lote (el CSV cargado se conserva) | Es lo que pidió Greener; evita lotes mixtos y hace que los límites y mensajes de la tabla sean los de un tipo |
| D2 | **Alta individual retirada**: un lote de un archivo cubre el caso, igual que se hizo con los pines (§2.42) | Un solo camino que mantener y probar |
| D3 | **Orden de las diapositivas = nombre de archivo en orden natural** (`slide-2` antes que `slide-10`), visible en una columna «#». El CSV **no** cambia el orden | Determinista, no depende del sistema operativo y no sorprende. *Alternativa disponible si Greener la prefiere: que el orden lo marque el CSV* |
| D4 | **Alt vacío por defecto.** Solo lo rellena el CSV o el admin; no se sube ningún archivo del lote mientras falte alguno y el error lista cuáles | Los pines rellenan el alt con el nombre del archivo, pero un alt como «IMG 1234» es peor que ninguno para accesibilidad; el carrusel ya exigía escribirlo a mano |
| D5 | **CSV**: cabecera obligatoria con `filename`; `alt` opcional; `,` o `;` (se detecta en la cabecera); BOM; saltos de línea dentro de comillas; columnas desconocidas ignoradas (sirve el mismo CSV de los pines). Empareja por nombre sin distinguir mayúsculas ni NFC/NFD | Lo que un CSV real exportado desde Excel, Numbers o Sheets puede traer |
| D6 | **Informe del CSV**: aviso con las filas que no corresponden a ningún archivo seleccionado y los archivos que no tienen fila | Un nombre mal escrito en el CSV se ve antes de subir |
| D7 | **`sortOrder`**: `máximo + 1` de lo existente al pulsar «Subir» y contador denso dentro del lote (solo avanza cuando una fila se guarda); los reintentos recalculan la base y se añaden al final | Sin empates; una fila que falla no deja hueco |
| D8 | **Sin tope por lote** (la especificación dice «sin tope»); subida secuencial, una a una, como los pines. Al terminar se refresca la página una vez | Las subidas van directas a Cloudinary desde el navegador |
| D9 | **Sin migraciones ni cambios de servidor**: se reutilizan las dos acciones y los esquemas existentes | Nada que ejecutar en Supabase |
| D10 | **Parser CSV compartido** (`modules/shared/domain/csv.ts`) usado por pines y carrusel; `pinCsv.ts` conserva su API pública | Una sola implementación; los pines ganan `;`, saltos de línea entre comillas y el emparejamiento NFC |

## 3. Cambios por capas

**Dominio y utilidades (sin Next ni React; reglas de capas de ESLint)**

1. `src/modules/shared/domain/csv.ts` (nuevo): `parseCsvTable(text)`, `parseCsvRecords(text, aliases)`, `normalizeFilename(name)`.
2. `src/modules/pin/domain/pinCsv.ts`: usa el parser compartido; misma API y mismos resultados con los CSV de siempre.
3. `src/modules/content/domain/caseCarouselCsv.ts` (nuevo): `parseCarouselCsv`, `findCarouselCsvRow`, `reportCarouselCsv`.
4. `src/modules/content/domain/caseCarouselOrder.ts` (nuevo): `nextCarouselSortOrder(items)` y `sortByNaturalName`.
5. `src/modules/media/client/mediaFileKind.ts` (nuevo): `isVideoFile`, `isAllowedImageFile`, `matchesMediaKind`, `fileAcceptFor` (el `accept` de cada tipo). `BulkPinUpload/rows.ts` lo usa en lugar de su copia privada.

**Cliente (carpeta `CaseCarouselManager/`, siguiendo el patrón de `BulkPinUpload/`)**

1. `rows.ts`: fila del lote y construcción desde archivos + CSV.
2. `useCarouselBulkUpload.ts`: estado del lote sobre `useUploadQueue`, validación previa, subida de cada fila con `uploadImageFlow` / `uploadVideoFlow` (mismas reglas que antes: `validateImageSelection`; `assertLocalVideoWithinLimits` y `assertUploadedVideoWithinLimits` con `contentVideoRules`), refresco final.
3. `CarouselUploadRow.tsx` y `index.tsx`: tabla «#, Archivo, Alt, Estado, Quitar».
4. `useCaseCarouselManager.ts`: queda con los borrados (`window.confirm` se mantiene en este fichero, que ya está en la lista blanca del test de confirmaciones) y compone el lote.
5. Limpieza: `precheck`, `onFinish` de `useMediaUpload` y `before` de `MediaUploader`.

**Tests**: parser CSV compartido; CSV del carrusel; orden y `sortOrder`; tipo de archivo; hook y componente (lote de imágenes, lote de vídeos, descarte por tipo, CSV, alt vacío, error en una fila sin parar el lote, reintento, cambio de tipo, orden de las llamadas); migración de los dos tests del flujo individual.

**Documentación**: este plan, `especificacion-final-formato-detalle.md`, `PROGRESO.md` (fila §2.145, checklist §4 y registro §6), `historial-fase-5.md` §2.145, `docs/README.md` y `estructura-src.txt`.

## 4. Orden de ejecución y verificación

| Fase | Contenido | Se comprueba |
| --- | --- | --- |
| 0 | Línea base: 89 ficheros y 1086 tests en verde en el ámbito afectado (pines, medios, admin y carrusel) | Hecha antes de tocar nada |
| 1 | Dominio y utilidades con sus tests | Vitest del ámbito; los tests de `pinCsv` existentes siguen en verde sin editarlos |
| 2 | Cliente (filas, hook, componentes) | Tests de componente con Cloudinary y acciones simuladas |
| 3 | Limpieza del código que deja de usarse | `tsc` y ESLint |
| 4 | Migración de los tests del flujo individual | Vitest |
| 5 | Documentación | Revisión cruzada de referencias |
| 6 | `npm test` completo, `npm run typecheck`, ESLint, Prettier con la configuración del proyecto y `next build` con las variables de relleno del CI; zip del proyecto completo | Resultados resumidos en el historial (§2.145) |

## 5. Fuera de alcance y riesgos

- **No se toca** el tope de 40 MB del vídeo de carrusel (propuesta pendiente del contrato de medios), ni la reordenación de diapositivas ya subidas, ni el servidor.
- **No se puede verificar aquí** el comportamiento con Cloudinary ni con Supabase reales: los tests simulan las dos. Queda una comprobación a mano en el §4 de `PROGRESO.md`.
- La verificación de cada imagen en el servidor llama a la Admin API de Cloudinary (500 llamadas por hora en el plan Free): un lote de 30 consume 30.
- Dos pestañas del ABM subiendo al mismo caso a la vez pueden producir un empate de orden; el cerrojo del editor es por pestaña. Mismo comportamiento que antes.
