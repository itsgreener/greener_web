# Auditoría de componentes TSX — web completa (admin + pública) · 23 oct 2026

Informe único que sustituye a los dos informes por zonas (`auditoria-tsx-admin-oct-2026.md` y `auditoria-tsx-publica-oct-2026.md`). Es una auditoría de solo lectura: no se ha modificado ningún fichero. Busca elementos repetidos que se puedan extraer a un componente, lógica que se pueda extraer a un hook, componentes casi iguales que se puedan fusionar y constantes duplicadas. Los identificadores de hallazgo llevan prefijo de zona para evitar choques: **TSX-ADM-** (backoffice `/admin`), **TSX-PUB-** (web pública) y **TSX-X-** (transversales, que afectan a las dos). Dentro del texto de cada zona, las referencias sueltas (por ejemplo «ADM-C1») llevan también el prefijo. Prioridad: **M** (merece hacerse) o **B** (mejora menor). El apartado 7 reúne todo lo que sigue pendiente de revisión, incluidas las imprecisiones de los propios informes y del código, y el apartado 6 el orden de ataque.

## 1. Resumen

| Zona | Alcance | Hallazgos | M | B | Aplicados |
|------|---------|-----------|---|---|-----------|
| Admin | `src/app/admin/**` y `src/components/admin/**`: 89 ficheros, unas 9.600 líneas | 22 (A1–A5, B1–B3, C1–C3, D1–D4, E1–E3, F1–F4) | 9 | 13 | 20 (A1, A2, A3, A4, B1, B2, B3, C1, C2, C3, D1, D2, D3, D4, E1, E2, E3, F1, F2, F4) |
| Pública | `src/components/**` (salvo admin), `src/app/(public)/**`, ficheros raíz de `src/app`, hooks y proveedores de cliente de `consent`, `analytics` y `newsletter`: 79 ficheros, unas 6.500 líneas | 30 (A1–A8, B1–B6, C1–C3, D1–D8, E1–E2, F1–F3) | 5 | 25 | 28 (A1, A2, A3, A4, A5, A6, A7, A8, B1, B2, B3, B4, B5, C1, C3, D1, D2, D3, D4, D5, D6, D7, D8, E1, E2, F1, F2, F3) |
| Transversales | Lo que se repite entre zonas | 6 (X1–X6) | 0 | 6 | 6 (X1, X2, X3, X4, X5, X6) |
| **Total** | | **58** | **14** | **44** | **54** |

Lo que más rinde, por este orden:

1. **Formulario de acción genérico del admin (ADM-A1):** el patrón «form + id oculto + confirmación + botón de pendiente + mensajes» está repetido en 13 ficheros; `CandidateActions` ya tiene la versión genérica.
2. **Gestores de medios gemelos del admin (ADM-C1):** `PinMediaManager` y `CaseCarouselManager` suman 695 líneas y se parecen en dos terceras partes.
3. **Rutas de paquetes de la pública (PUB-C1):** seis `route.ts` que se diferencian en una línea o en el tipo de paquete.
4. **Ciclo de carga de vídeo (PUB-B1):** `usePinVideo` y `useToolCoverVideo` repiten reducer, tiempos, reintentos, liberación del elemento y manejadores.
5. **Listas cerradas escritas a mano (ADM-D1 a D3 y PUB-D1):** idiomas, ratios, tipos y scopes que el dominio ya define.

El admin repite más (formularios, medios, listas); el público ya tiene la lógica delicada en hooks con tests, y lo que repite es sobre todo plomería: rutas, imágenes, cookies, textos.

### Estado de aplicación (26 oct 2026)

Aplicados los cinco puntos de la lista anterior: ADM-A1, ADM-B1 con ADM-C1, ADM-D1 a D3, PUB-B1, PUB-C1 y PUB-D1 (9 hallazgos). El relato completo, las decisiones y la verificación están en `docs/historial/historial-fase-5.md` §2.103. Lo que conviene saber al leer el resto de este informe:

1. **ADM-A1:** `AdminActionForm` en `components/admin` sustituye al `ActionForm` local de `CandidateActions` y al patrón de otros cinco ficheros. No se unificó el texto de pendiente (decisión 2 del 7.4, abierta). `DeletePinButtons` y el «quitar todos» del carrusel mantienen su `window.confirm` propio.
2. **ADM-B1 y ADM-C1:** `useMediaUpload` y `MediaUploader` compartidos; los dos gestores conservan su lógica propia.
3. **ADM-D1 a D3:** `AdminOptions` (idiomas, ratios, tipos y estados) construido sobre los esquemas Zod, más `localeLabel` y `localeCode` en `modules/shared/domain/locale.ts`.
4. **PUB-B1:** `useVideoLoadLifecycle` y `safePlayback` en `modules/media/client`.
5. **PUB-C1:** fábrica en `app/(public)/(detail)/_lib/packageRoutes.ts` (no en `lib/http`, como proponía el informe), con cabeceras comunes a las tres secciones.
6. **PUB-D1:** `FeedScope` tipado de extremo a extremo; `typesForScope` lanza ante un scope desconocido y la API responde 400.

Los apartados 3 a 6 describen el código tal como estaba el 23 de octubre.

### Estado de aplicación, fase 1 (26 oct 2026, segunda tanda)

Aplicada la fase 1 del orden de ataque (apartado 6) con las decisiones de Greener del 7.4. Relato y verificación en `docs/historial/historial-fase-5.md` §2.104. Con esto son 27 los hallazgos aplicados:

1. **Admin (5 más):** ADM-C2 (ya cubierto por `localeLabel`/`localeCode`), ADM-C3 (`buildListHref` en `app/admin/_lib/listHref.ts`), ADM-F1, ADM-F2 y ADM-F4 (orden de imports con `import/order` y comentarios en español). **ADM-F3 no se aplica** (apartado 5.1, punto 4).
2. **Pública (10 más):** PUB-A5 (`ERROR_COPY` y `ErrorBoundaryProps`), PUB-D2 (`readBrowserCookie`), PUB-D3 (`workLocalePath`), PUB-D5 (`SECTION_LABELS`), PUB-D6 (cerrado con TSX-X1), PUB-D8 (`toFormState`), PUB-E2 (`PolicyBlock`), PUB-F1, PUB-F2 (`useFeed` con un booleano y mensajes de `feedApi` en español; PUB-A8, hecho después en la fase 2) y PUB-F3.
3. **Transversales (3):** TSX-X1 (`lib/cx.ts`), TSX-X3 y TSX-X4 (regla `import/order` y `import/newline-after-import` en `eslint.config.mjs`, aplicada con `--fix` a 53 ficheros).
4. **Comentarios del 7.3:** corregidos los cinco.
5. **Decisión 2 aplicada:** los textos de pendiente del ABM llevan `…`, con un test que lo vigila.

### Estado de aplicación, fase 2 (26 oct 2026, tercera tanda)

Aplicada la fase 2 del orden de ataque (apartado 6): extracciones de presentación. Relato y verificación en `docs/historial/historial-fase-5.md` §2.105. Con esto son 40 los hallazgos aplicados:

1. **Admin (4 más):** ADM-A2 (`AdminFormFooter` en `components/admin/AdminForm`), ADM-A3 (`AdminCountedField`), ADM-A4 (constante `QUICK_LINKS` del panel) y ADM-E3 (`TypeCard` y `newContentOptions.ts`, con un test que ata sus valores a los esquemas del dominio).
2. **Pública (8 más):** PUB-A1 (`CloudinaryImage`, con el único `eslint-disable no-img-element` de Cloudinary), PUB-A3 (`Honeypot` y `readHoneypot`), PUB-A4 (`ConsentButtons` y `useConsentCopy`), PUB-A6 (`PublicField` en `components/form/`, con `role="alert"` y `aria-describedby` en los errores), PUB-A7 (`BrokenHeadline`), PUB-A8 (`FeedStatus`; el error es un booleano y el texto, siempre el del copy), PUB-C3 (`cardPositionStyle`) y PUB-D4 (`isPreviewRequest`, `resolvePreviewOfType`). PUB-D6 ya estaba cerrado con TSX-X1.
3. **Transversales (1 más):** TSX-X2, con PUB-A1; la miniatura del admin (`AdminMediaItem`) usa también `CloudinaryImage`, con `srcWidth` y sin `srcset`. Se queda sin tocar el póster superpuesto de `ToolCoverVideo` y el SVG del Shell.
4. **Pendiente de esta fase:** TSX-X5, que Greener dejó para una ronda posterior; PUB-A2 con PUB-B2 van en la fase 6 por decisión suya.

### Estado de aplicación, fases 6 y 7 (26 oct 2026, cuarta tanda)

Aplicado el resto del orden de ataque: la fase 6 (episodio y feed) y la fase 7 (lo que había que decidir con Greener, ya decidido). Relato y verificación en `docs/historial/historial-fase-5.md` §2.106. Con esto son 53 los hallazgos aplicados:

1. **Pública (7 más):** PUB-A2 con PUB-B2 (`EmbedConsentPrompt`, `useEmbedPlayback` y `episodeEmbed`, con el texto legal idéntico), PUB-B3 (`layoutItem` y `nextHasMore`), PUB-B4 (`useFeedScroll`), PUB-B5 (`useViewportHeight`), PUB-E1 (`feedStorage`) y PUB-D7 (`sessionStorage` con guarda, cerrado con ADM-B3).
2. **Admin (5 más):** ADM-D4 (`contentCapabilities`, solo en el admin), ADM-E1 (solo helpers: `parsePage`, `pageCount`, `pluralize`, `buildListQuery`), ADM-E2 (`loadEditorData`), ADM-B3 (`safeSessionStorage`, `usePersistedFilters` y `ContentFilterBar`) y ADM-B2 (`useUploadQueue`, el núcleo común sin unificar las dos colas).
3. **Transversales (1 más):** TSX-X6, cerrado con ADM-B3.
4. **Quedan 5, a propósito:** PUB-B6 y TSX-X5 (Greener los dejó para una ronda posterior), PUB-C2 y ADM-A5 (este informe ya recomendaba no tocarlos) y ADM-F3 (descartado en la fase 1).

### Estado de aplicación, cierre de la ronda (27 oct 2026, quinta tanda)

Greener decidió sobre lo que quedaba abierto. Relato y verificación en `docs/historial/historial-fase-5.md` §2.107. Son 54 los hallazgos aplicados, tres descartados y uno en curso:

1. **TSX-X5, aplicado:** se cierra con `lib/forms/README.md` (la lógica común, sin textos, en `lib/forms`; la presentación y su idioma, en cada kit). Sin cambios de código.
2. **PUB-B6, en curso:** lote 1 hecho (`useVideoSlot` y el billete de prefetch de `usePinVideo`, derivados y con el reinicio en la limpieza del efecto). Quedan cinco llamadas: lote 2 (`loadMore` de `useFeed` y `useRecommendationMasonry`) y lote 3 (reinicios al cambiar de prop de `usePinVideo`, `useToolCoverVideo` y `useRecommendationMasonry`), tras las pruebas a mano de Greener.
3. **Descartados por decisión de Greener:** PUB-C2 (solo hay dos detalles de tipo B y no se prevén más), ADM-A5 (tres auxiliares de una sola página) y ADM-F3 (la regla de ESLint prohíbe los imports con `../`, el alias es obligatorio).
4. **Error 7.1.1 corregido:** el mensaje de éxito del contacto, en inglés.
5. **Apartado 8:** hechos los puntos 1, 2, 3, 4 y 6 (cuatro tests de arquitectura y los READMEs de los kits).

### Estado de aplicación, PUB-B6 lote 2 (27 oct 2026, sexta tanda)

Greener probó a mano todo lo aplicado hasta el §2.107 y lo dio por bueno (los puntos 7.2 y las pruebas de cada tanda). Relato y verificación en `docs/historial/historial-fase-5.md` §2.108. PUB-B6, lote 2: `useFeed` y `useRecommendationMasonry` lanzan el primer lote desde el efecto con una cadena de promesas (`fetchBatch`), sin `queueMicrotask`, y su «cargando» de la primera carga se deriva con `attemptedSession`. Quedan tres `queueMicrotask`, todos del lote 3: `usePinVideo` (reinicio con `[wanted, resetKey]`), `useToolCoverVideo` (cambio de escalón) y `useRecommendationMasonry` (cambio de scope o de contenido).

## 2. Criterios aplicados

1. Arquitectura V1.3 §24.1 y §24.2: un componente por carpeta con su módulo CSS, alias `@/*`, sin CSS inline (salvo la geometría del masonry, inline a propósito por decisión de Greener).
2. Capas del proyecto (domain, application, infrastructure): lo que es dominio puro va a `modules/*/domain`; lo que toca el navegador, a `modules/*/client` o a un hook.
3. Se propone extraer cuando el patrón aparece tres o más veces, o dos veces con más de una decena de líneas idénticas. Lo que solo se parece se anota como descartado (apartado 5).
4. El kit del admin (`components/admin`) y el del público (`Cta`, `StatusPage`…) ya existen; no se propone nada que ya cubran.
5. Decisiones documentadas en el código que se respetan: `useRecommendationMasonry` no es una variante de `useFeed`; el feed sobrevive a la navegación (FeedProvider); los embeds de terceros no se montan sin un «sí» a las cookies y un clic.
6. Tests que cubrirían los cambios: en el admin, `tests/unit/admin/**`; en el público, `pinVideoLifecycle`, `pinCardVideo`, `toolCoverVideo`, `feedProvider*`, `feedRateLimitRetry`, `useMasonryPositions`, `uniqueKeys`, `cookieBanner`, `episodeDetail.*`, `newsletterPinCard`, `contactForm.smoke`, `appRoutes` y `assetRoutes`.
7. Las estimaciones de líneas ahorradas son orientativas, hechas a ojo sobre el código leído; no se han medido con una refactorización real.

## 3. Lo que ya está bien

### 3.1 Admin

1. **Kit compartido sólido.** Botones, campos, tarjetas, tablas, paginación, filtros y miniaturas de medios ya son componentes únicos con una sola clase base. Las páginas se componen casi sin CSS propio.
2. **Hooks del editor ya extraídos.** `useEditorOperation` (ejecutar, bloquear el editor y devolver error o aviso), `useEditorRefresh` (el único `router.refresh()` del admin, una sola aparición) y `useCloudinaryUpload` (subida con descarte si falla) concentran la parte delicada. Hay un único `useTransition` en todo `/admin`, y vive ahí.
3. **`useCharCount` + `CharCounter`** separan bien contador y campo sin convertir los inputs en controlados.
4. **`contentLabels.ts`** centraliza etiquetas de tipo, estado e idioma corto.
5. **`AdminTextLink`, `AdminEmptyState`, `AdminBadge`, `AdminReadonlyField`** evitan los enlaces y vacíos a mano que suelen proliferar.
6. **Server Actions con `useActionState`** de forma homogénea: estado `{}` inicial, `pending` del tercer elemento, errores por campo en `fieldErrors`.
7. **`BulkPinUpload` y los gestores de medios** ya están divididos en `index` + hook + fila/miniatura + tipos, con la lógica fuera del JSX.

### 3.2 Pública

1. **Hooks de negocio fuera del JSX.** `useFeed`, `useMasonryPositions`, `useRecommendationMasonry`, `useSentinel`, `useContainerWidth`, `useHoverIntent`, `useVideoSlot`, `usePinVideo`, `useToolCoverVideo` y `useMotionPreferences` concentran el estado; `Feed`, `RecommendationsGrid` y `PinCard` casi solo pintan.
2. **Política en el dominio.** Reducer de carga de vídeo, reintentos, tiempos, límites de prefetch y cálculo de columnas viven en `modules/media/domain` y `modules/masonry/domain`, con tests; los hooks solo conectan con el DOM.
3. **`PinCard` bien partido** en `CardLink`, `PinCardMedia`, `PinCardLabel` y `types`, con `useHoverIntent`, `useVideoSlot` y `usePinVideo` aparte.
4. **`feedApi.ts` compartido** por el feed y las recomendaciones (`openFeedSession`, `fetchFeedBatch`), y `useContainerWidth` y `useSentinel` también.
5. **Cta como kit.** `CtaLink`, `CtaAnchor`, `CtaButton` y `CtaLabel` evitan botones a mano en todo el sitio público, con estado «procesando» incluido.
6. **`StatusPage`, `ErrorPage` y `NotFoundPage`** comparten cuerpo entre la raíz y `(public)`.
7. **`useSyncExternalStore` bien usado** en `ConsentProvider`, `useMotionPreferences` y el DPR del vídeo: sin desajustes de hidratación.
8. **`formActionState.ts`** ya unifica la forma del estado de las Server Actions (admin y público).
9. **`publicContentPath`** centraliza la ruta pública de cada tipo de contenido (lo usan feed, sitemap y enlaces de preview).
10. **Textos del feed y de recomendaciones en `copy.ts`**, aparte del JSX.

## 4. Hallazgos

### 4.1 Admin

#### TSX-ADM-A. Componentes a extraer

**TSX-ADM-A1 · Formulario de acción genérico · M**
El patrón «`<form action>` + campos ocultos + `window.confirm` opcional + botón con texto de pendiente + mensajes de error y éxito» aparece con variaciones en 13 ficheros que usan `useActionState` (19 llamadas) y en 6 ficheros con `window.confirm` (7 llamadas), además de 23 `<input type="hidden">`:

1. `talent/[id]/CandidateActions.tsx`: ya contiene la versión genérica (`ActionForm`, local al fichero) usada tres veces.
2. `talent/ProcessPendingPanel.tsx`: dos formularios con `confirm` y botón de pendiente.
3. `contents/[id]/edit/DeleteContentButton.tsx`: formulario con `id` oculto, `confirm` y botón `danger-solid`.
4. `contents/[id]/edit/PublishControls.tsx`: cuatro `useActionState`, tres formularios que solo envían `id`.
5. `contents/[id]/edit/WarmVideosControl.tsx`: un formulario de `id` con botón y mensajes.
6. `contents/[id]/edit/PackageUpload.tsx`: tres componentes locales (`PublishVersionButton`, `DeleteVersionButton`, `DeleteOldVersionsButton`), dos con `confirm`.
7. `contents/[id]/edit/PinList/DeletePinButtons.tsx`: `confirm` de borrado de pin.

Propuesta: subir `ActionForm` de `CandidateActions` a `components/admin/AdminActionForm/` con props `action`, `hidden: Record<string,string>`, `label`, `pendingLabel`, `confirmText?`, `variant?`, `disabled?` y `messages` (error, éxito, aviso). El `window.confirm` pasa a una única función `confirmOrCancel(event, text)` dentro del mismo componente. Se sustituyen unos 12 formularios sueltos. Los que tienen lógica propia (`PublishControls` con la fecha programada, `PackageUpload` con la subida) conservan solo esa parte.
Riesgo: medio; toca flujos destructivos (borrar contenido, borrar candidato, borrar versiones). Verificar a mano que cada `confirm` conserva su texto exacto.

**TSX-ADM-A2 · Esqueleto de los formularios de edición · M**
`CaseDetailForm`, `EpisodeDetailForm`, `OtherDetailForm`, `EditContentForm`, `TranslationForm` y `PinList/EditPinForm` repiten: `useActionState`, `id` oculto, `AdminForm`/`AdminFormGrid`, `{state.formError && <AdminMessage kind="error">}`, `{state.success && <AdminMessage kind="success">}` y el botón `type="submit" variant="primary" disabled={pending}` con «Guardando…». En todo `/admin` hay 9 apariciones de `state.formError &&`, 6 de `state.success &&` y 6 del texto «Guardando...».
Propuesta: `AdminFormFooter` (o `AdminFormStatus` + `AdminSubmitButton`) que reciba `state`, `pending`, `label` y pinte mensajes y botón dentro de `AdminFormActions`. No hace falta un formulario genérico: cada uno conserva sus campos. Ahorra unas 10 líneas por formulario y deja el texto «Guardando…» en un solo sitio.
Riesgo: bajo. Nota: unos textos llevan tres puntos ASCII (`...`) y otros el carácter `…` (`Lanzando…`, `Reprocesando…`); al unificar hay que elegir uno (propuesta: `…`).

**TSX-ADM-A3 · Campo con contador de caracteres · M**
`TranslationForm` combina `useCharCount` + `CharCounter` + `AdminField aside` seis veces (título, título SEO, descripción SEO, resumen, destacado y cuerpo) y `CaseDetailForm` una más; en total hay 7 llamadas a `useCharCount` y 8 `<CharCounter` en el admin. Cada uso son unas 8 líneas (hook, `aside`, `onChange`).
Propuesta: `AdminCountedField` que reciba `name`, `label`, `max`, `defaultValue`, `kind: 'input' | 'textarea'` y `error`, y encapsule hook, contador, `AdminField` y control. En `TranslationForm` los campos pasarían, a ojo, de unas 100 líneas a unas 30.
Riesgo: bajo. Debe aceptar `maxLength` y `rows` como props y dejar pasar el resto al control.

**TSX-ADM-A4 · Enlaces rápidos del panel · B**
`(panel)/page.tsx` repite dos bloques idénticos de enlaces rápidos escritos a mano. Propuesta: un array de `{ href, title, description }` con `.map`. (`OtherOccupationNotice` ya es compartido: lo usan `contents/page.tsx` y `OtherDetailForm`; no hay nada que extraer.)
Riesgo: nulo.

**TSX-ADM-A5 · Auxiliares locales de la ficha de candidato · B**
`talent/[id]/page.tsx` define `SafeLink` (un `AdminTextLink external` que filtra la URL con `externalCvUrl` y añade `nofollow`), `Row` (par `<dt>`/`<dd>` de una lista de definición) y `rate`. Los tres son finos y solo se usan en esa página, y `Row` no equivale a `AdminReadonlyField` (que pinta un bloque, no un `dt/dd`). Propuesta: dejarlos donde están y subirlos al kit solo si aparece un segundo uso, por ejemplo una ficha de otra entidad con la misma lista de definición.
Riesgo: nulo.

#### TSX-ADM-B. Hooks a extraer

**TSX-ADM-B1 · Lógica común de subida de un medio · M**
`usePinMediaManager.ts` (186 líneas) y `useCaseCarouselManager.ts` (203 líneas) comparten `file`, `kind`, `inputKey`, `selectKind`, `selectFile`, `finishUpload`, `handleImageUpload`, `handleVideoUpload` y `handleRemove`. Comparados con `diff`, solo difieren unas 140 líneas de 389: cambia qué acción se llama al registrar (`attachPinImageAction` frente a las de carrusel), el campo `alt` y la regla de «un único medio» frente a «varios». Ver ADM-C1, que propone la solución conjunta.

**TSX-ADM-B2 · Cola de ficheros con estado por fila · B**
`BulkPinUpload/useBulkPinUpload.ts` (286 líneas) y `talent/upload/UploadCvs.tsx` (236 líneas) manejan una lista de ficheros con estado por fila (pendiente, subiendo, hecho, error), subida secuencial y reintento. No son iguales (pines con ratio e idioma; CVs con límite de 10 y antivirus), pero el núcleo de cola es comparable. Propuesta: no fusionar ahora; extraer solo `useUploadQueue<T>` si se toca alguno de los dos. Hoy, el ahorro no compensa el riesgo.

**TSX-ADM-B3 · Persistencia de filtros del listado · B**
`contents/ContentFilterPersistence.tsx` usa DOM imperativo (`document.querySelector` sobre `#CONTENT_FILTERS_ID`, `addEventListener('submit')`) y `sessionStorage` sin `try/catch`, y mezcla dos efectos. Propuesta: convertirlo en un hook `usePersistedFilters(key, filterKeys)` que lea y escriba `sessionStorage` con guarda, y hacer que `AdminFilterBar` acepte `onSubmit` para no tener que buscar el formulario por id. Además, los comentarios del fichero están en inglés y el resto del proyecto en español.
Riesgo: medio-bajo; el comportamiento (volver al listado con los filtros anteriores) hay que probarlo a mano.

#### TSX-ADM-C. Componentes casi iguales

**TSX-ADM-C1 · `PinMediaManager` y `CaseCarouselManager` · M**
Dos carpetas con la misma estructura (`index`, hook, miniatura, `types`): 695 líneas en total. Las miniaturas se diferencian en 5 líneas (`MediaThumb` frente a `CarouselSlide`: añade `caption` y `disabled`); los `index.tsx` (112 y 126 líneas) pintan el mismo selector imagen/vídeo, el mismo input de fichero y los mismos avisos.
Propuesta: un `MediaUploader` en `components/admin/` (selector de tipo, input con `key`, límites de vídeo, botón de subir, error y aviso) y un hook base `useMediaUpload({ registerImage, registerVideo, onRemove, mode })`. `PinMediaManager` y `CaseCarouselManager` quedan como finas envolturas (~40 líneas cada una) que pasan sus acciones y, en el caso del carrusel, el `alt`. `MediaThumb` y `CarouselSlide` se unifican en `AdminMediaItem`, que ya existe y es lo que ambas pintan.
Riesgo: medio; es el flujo de subida a Cloudinary. Conservar el orden «subir, registrar, descartar si falla» de `useCloudinaryUpload` y probar imagen, vídeo y un fallo de registro en cada gestor.

**TSX-ADM-C2 · `getLocaleLabel` duplicada · M**
`ContentTranslations.tsx` y `TranslationForm.tsx` definen la misma función `getLocaleLabel` (Español, English, Català); `ContentTranslations` define además `getLocaleShortLabel` (`toUpperCase`, que es `localeCode` de `contentLabels.ts`) y `allLocales`. Propuesta: `localeLabel(locale)` en `contentLabels.ts`, `localeCode` ya existe, y `allLocales` sale de `localeSchema.options`. Resuelve también parte de ADM-D1.
Riesgo: nulo.

**TSX-ADM-C3 · Tres `pageHref` · B**
`contents/page.tsx`, `talent/page.tsx` y `audit/page.tsx` tienen cada una su `pageHref(filters, page)`: crea un `URLSearchParams`, añade cada filtro si no está vacío y `page` si es mayor que 1. Solo cambian las claves. Propuesta: `buildListHref(basePath, params, page)` en `_lib/listHref.ts` con test unitario (tres casos: sin filtros, con filtros, página 1 frente a página 2). Las tres páginas pasan un objeto y desaparece la lógica repetida.
Riesgo: bajo.

#### TSX-ADM-D. Constantes y listas duplicadas

**TSX-ADM-D1 · Idiomas escritos a mano · M**
`<option value="es">Español</option>` (y `en`, `ca`) aparece escrito a mano en `NewContentForm.tsx`, `EditContentForm.tsx` y `PinList/EditPinForm.tsx` (3 apariciones de la primera opción), y `BulkPinUpload/rows.ts` define `LANGUAGES = ['es', 'en', 'ca']`, usada en `BulkPinRow.tsx` y en `index.tsx`. El dominio ya tiene `localeSchema` (`@/modules/shared/domain/locale`), que es la fuente de verdad (igual que el enum de Postgres).
Propuesta: `LocaleOptions` (o `localeOptions` + `<AdminSelect>`) en el kit, que mapee `localeSchema.options` con `localeLabel`. Si se añade un idioma al dominio, el admin lo recoge solo.
Riesgo: nulo.

**TSX-ADM-D2 · Ratios escritos a mano · M**
`PinList/EditPinForm.tsx` escribe siete `<option value="…">` con los ratios (`1:1`, `4:3`, `4:5`, `3:4`, `2:3`, `9:16`, `16:9`), y `BulkPinUpload/rows.ts` define `RATIOS` con la misma lista (usada en dos ficheros). El dominio tiene `pinRatioSchema` en `@/modules/shared/domain/ratio` y su comentario avisa de que el test `dbEnums.test.ts` vigila la sincronía con Postgres; las listas del admin, no. Propuesta: `RatioOptions` desde `pinRatioSchema.options`.
Riesgo: nulo. Beneficio concreto: un ratio nuevo no se queda fuera de los desplegables.

**TSX-ADM-D3 · Tipos y estados de contenido en los filtros · B**
`contents/page.tsx` escribe `<option value="case">Case</option>`, `insight`, etc. a mano aunque `contentTypeSchema` y `contentTypeLabel` existen. `NewContentForm` tiene además su propio array local `contentTypes` y `otherKinds`. Propuesta: opciones derivadas de `contentTypeSchema.options` + `contentTypeLabel`, y lo mismo con `contentStatusLabel` para el filtro de estado. Si «talent» tiene su propio vocabulario (estado y perfil del candidato), una función equivalente en su carpeta.
Riesgo: nulo.

**TSX-ADM-D4 · Capacidades por tipo de contenido dispersas · B**
La lógica «qué admite cada tipo» está repartida: `contents/[id]/edit/page.tsx` calcula `supportsPackage`, `isNewsletter` y la disponibilidad de vista previa; `ContentTranslations.tsx` decide por tipo si hay uno o tres idiomas (`episode`/`other` solo el principal); `PublishControls` recibe `previewAvailable`. Propuesta: un único `contentCapabilities(type, otherKind)` en `src/modules/content/domain/` o en `_lib/` que devuelva `{ translatable, hasPackage, hasPreview, hasPins… }`, con un test por tipo. Hoy cada regla es correcta; el riesgo es que un tipo nuevo exija tocar cuatro sitios.
Riesgo: bajo. Conviene decidir si pertenece al dominio (lo usa también la web pública) o solo al admin.

#### TSX-ADM-E. Estructura de páginas

**TSX-ADM-E1 · Esqueleto común de listado · M**
`contents/page.tsx` (286 líneas), `talent/page.tsx` (316) y `audit/page.tsx` (225) siguen el mismo esqueleto: leer `searchParams`, normalizar filtros, consultar, `AdminPage` > `AdminPageHeader` > `AdminCard` > `AdminFilterBar` > `AdminResultBar` > tabla o `AdminEmptyState` > `AdminPagination`. Además repiten cuatro pluralizaciones a mano del contador (`n === 1 ? 'contenido' : 'contenidos'` y equivalentes en las tres páginas) y la normalización de `page`. Propuesta: no un componente «lista genérica» (las columnas y filtros divergen demasiado), sino dos helpers: `parsePage(searchParams)` y `pluralize(n, singular, plural)`; el esqueleto de cabecera, filtros, resultado y paginación se puede encapsular en `AdminListLayout` solo si se quiere reducir cada página a la definición de columnas.
Riesgo: medio para `AdminListLayout`, nulo para los helpers. Recomendado: solo los helpers.

**TSX-ADM-E2 · `contents/[id]/edit/page.tsx` carga y compone demasiado · B**
331 líneas, con un `Promise.all` grande, flags de capacidad (ADM-D4) y toda la composición del editor. Propuesta: mover la carga a `loadEditorData(id)` en `application/` o `_lib/` y dejar la página en composición; separa lo que se puede testear (la carga) de lo que no.
Riesgo: bajo.

**TSX-ADM-E3 · `NewContentForm.tsx` con componentes locales · B**
331 líneas con `TypeCard`, `SectionHeading` y las listas `contentTypes` y `otherKinds` dentro del mismo fichero. Propuesta: sacar `TypeCard` a su carpeta (§24.2) y las listas a un `newContentOptions.ts`; `SectionHeading` lleva número de paso (`step`), así que no equivale a `AdminSubheading`; se queda con `TypeCard` en su carpeta.
Riesgo: nulo.

#### TSX-ADM-F. Convenciones y limpieza

**TSX-ADM-F1 · Orden de imports · B**
12 ficheros importan `@/…` antes que `react` o `next/*` (las Server Actions `actions.ts`, `episodeActions.ts`, `caseActions.ts`, `translationActions.ts`, `publishActions.ts`, `otherActions.ts`, `packageActions.ts`, `deleteActions.ts`, `contents/actions.ts`, `PublishControls.tsx`, `PackageUpload.tsx`, `EpisodeDetailForm.tsx`). El resto de ficheros sigue «externos, alias, relativos». Prettier no ordena imports; se arregla a mano o con `eslint-plugin-import`/`import/order` si se quiere automatizar.

**TSX-ADM-F2 · Línea en blanco tras los imports · B**
`DeleteContentButton.tsx` pega `type Props` al último `import` (único caso de 89 ficheros).

**TSX-ADM-F3 · Alias frente a ruta relativa · B**
`usePinMediaManager.ts` y `useCaseCarouselManager.ts` importan `@/app/admin/(panel)/contents/[id]/edit/pinActions`, `useCloudinaryUpload` y `useEditorOperation` por alias absoluto aunque están en la misma rama de carpetas (`../pinActions`). Funciona; el alias oculta que la dependencia es local y alarga el import.

**TSX-ADM-F4 · Idioma de los comentarios y textos · B**
`ContentFilterPersistence.tsx` tiene los comentarios en inglés; el resto del admin, en español. Mensajes de pendiente con `...` frente a `…` (ver ADM-A2).

### 4.2 Web pública

#### TSX-PUB-A. Componentes a extraer

**TSX-PUB-A1 · Imagen de Cloudinary escrita a mano · M**
Hay 7 `<img>` en el bloque público y 6 `// eslint-disable-next-line @next/next/no-img-element`. Cuatro son la misma pieza «imagen servida por `cloudinaryUrl.ts`» con `src` + `srcSet`: `PinCardMedia` (perfil `feed`), `CaseDetail` (carrusel), `EpisodePoster` y `CoverMedia` (perfil `detail`). El `sizes="83vw"` está repetido 3 veces. El comentario que justifica el `<img>` (la URL ya viene transformada; `next/image` la retransformaría) se repite en cada sitio.
Propuesta: `components/media/CloudinaryImage/` con props `publicId`, `profile: 'feed' | 'detail'`, `alt`, `sizes`, `loading`, `fallbackWidth?` y `className`. Contiene el único `eslint-disable` y el `src`/`srcSet`. Los pósters de vídeo (`buildVideoPosterUrl`/`buildVideoPosterSrcSet`) entran con una variante `poster`. Ahorra unas 6 líneas por sitio y deja una sola justificación.
Riesgo: bajo. Mantener `loading`, `decoding` y el orden de atributos; `pinDuplicateInstances` y `components.smoke` cubren el feed.

**TSX-PUB-A2 · `EpisodeDetail` hace demasiado · M**
302 líneas que mezclan el cálculo del embed (`embedUrl`, `providerLabel`), la portada previa (`EpisodePoster`), el flujo de consentimiento (`approvedEmbedKey`, `askingConsent`, tres manejadores), la analítica de «Episode Play», el panel de consentimiento (unas 40 líneas de JSX con texto legal) y el texto del detalle.
Propuesta: `episodeEmbed.ts` (las dos funciones puras, con test por proveedor), `EmbedConsentPrompt` (el panel, con `provider`, `onAccept`, `onCancel`), y el flujo a un hook (ver PUB-B2). El componente se queda en unas 120 líneas de composición.
Riesgo: bajo-medio: es la parte legal (AEPD). Mantener textos, orden «consentimiento antes de montar el iframe» y desmontaje al revocar; lo cubren `episodeDetail.design` y `episodeDetail.smoke`.

**TSX-PUB-A3 · Honeypot en dos sitios · B**
`ContactForm` y `NewsletterPinCard` (ambos `name="reference_code"` desde el 28 oct, §2.113; antes `website` y `company`) pintan el mismo bloque oculto (`div.honeypot`, `label`, `input` con `tabIndex={-1}` y `autoComplete="off"`), y las dos Server Actions leen el campo con `(formData.get(...) as string | null) ?? ''`. Propuesta: `<Honeypot name idPrefix />` junto a la clase global `honeypot` y `readHoneypot(formData, name)` en `lib/forms/`. El `as string | null` desaparece.
Riesgo: nulo. Ojo: los `id` del contacto son fijos (`website`) y los del pin usan `useId`; el componente debe aceptar el prefijo.

**TSX-PUB-A4 · Botones aceptar/rechazar de cookies · B**
`CookieBanner` y `CookieChoice` pintan el mismo par de botones (`accept`, `reject`) con `consentButton.module.css` ya compartido, y ambos leen `CONSENT_COPY[DEFAULT_CONSENT_LOCALE]`. Propuesta: hook `useConsentCopy()` y `ConsentButtons` (con `pressed` opcional para `aria-pressed`). Ahorra unas 15 líneas y evita que un tercer sitio vuelva a repetirlo.
Riesgo: bajo; `cookieBanner.test` cubre el banner.

**TSX-PUB-A5 · Tipo y texto de las páginas de error · B**
`{ error: Error & { digest?: string }; reset: () => void }` está escrito 4 veces (`error.tsx`, `(public)/error.tsx`, `global-error.tsx`, `ErrorPage`). «Something went wrong» y su mensaje aparecen dos veces (`ErrorPage` y `global-error`). Propuesta: exportar `ErrorBoundaryProps` y `ERROR_COPY` desde `components/status/ErrorPage`. `global-error` no puede usar `ErrorPage` entera (no tiene router), pero sí el tipo y el texto.
Riesgo: nulo.

**TSX-PUB-A6 · Campos del formulario de contacto · B**
`ContactForm` repite cuatro veces `div.field` + `label` + control + error condicional (`state.fieldErrors?.x?.[0] && <p>…`). Propuesta: `PublicField` (`name`, `label`, `type`, `error`, `rows?`) en `components/form/`. Baja el formulario de ~90 a ~55 líneas y deja el sitio listo para un segundo formulario. Los errores salen hoy en un `<p>` sin clase ni `aria`: el componente es el sitio para añadir `aria-describedby` y `role="alert"`.
Riesgo: bajo; `contactForm.smoke` cubre el envío.

**TSX-PUB-A7 · Titulares con `<br />` · B**
`ContactPage` (`We <br /> should have <br /> a brand <br /> together`) y `NewsletterPinCard` (cinco líneas con `<br />` y un comentario que explica que cada salto lleva un espacio para que el nombre accesible no salga pegado) resuelven el mismo problema a mano. Propuesta: `<BrokenHeadline lines={[…]} as="h1" />` que une las líneas con `<br />` más un espacio. Ahorra el comentario y el error de olvidar el espacio.
Riesgo: nulo.

**TSX-PUB-A8 · Estado de carga, vacío y error del feed · B**
`Feed` y `RecommendationsGrid` pintan el mismo trío (`error`, «loading» si `itemCount === 0`, «empty» si no hay más) con copys distintos (`feedCopy` y `recommendationsCopy`). Propuesta: `FeedStatus` con `{ error, isLoading, itemCount, hasMore, copy }`. Ojo: `Feed` ignora el texto de `error` y pinta `feedCopy.loadError`, mientras que `RecommendationsGrid` pinta `error` tal cual; hay que unificar a un solo criterio (ver PUB-F2).
Riesgo: bajo.

#### TSX-PUB-B. Hooks a extraer

**TSX-PUB-B1 · Ciclo de carga de vídeo repetido · M**
`usePinVideo` (263 líneas) y `useToolCoverVideo` (309) repiten, casi palabra por palabra:

1. `useReducer(videoLoadReducer, INITIAL_VIDEO_LOAD_STATE)`.
2. El efecto del tiempo máximo (`READY_TIMEOUT_MS`).
3. El efecto de espera y reintento (`nextRetryDelay`).
4. El efecto que suelta el elemento (`releaseVideoElement`).
5. Los manejadores `onCanPlay`, `onVideoError` y `onSourceError`, idénticos incluida la explicación de por qué el error de un `<source>` burbujea.
6. Las llamadas a `play()` (con `muted = true`) y `pause()` envueltas en `try/catch` por jsdom.

Propuesta: un hook `useVideoLoadLifecycle({ active, sourceCount, resetKey, videoRef })` que devuelva `{ load, dispatch, handlers }`, y dos funciones puras `safePlay(el)` y `safePause(el)` junto a `releaseVideoElement` en `modules/media/client/`. Cada hook queda con su política propia (prefetch y billetes en el pin; intención del visitante y DPR en la portada). Se espera quitar unas 60 a 80 líneas de cada hook.
Riesgo: medio-bajo. Son los hooks más delicados del sitio (descargas de Cloudinary Free), pero `pinVideoLifecycle`, `pinCardVideo` y `toolCoverVideo` los cubren. Conservar el orden de los efectos.

**TSX-PUB-B2 · Flujo de consentimiento del embed · B**
`approvedEmbedKey`, `askingConsent`, `canRenderEmbed`, `startPlayback`, `handlePlayClick` y `handleAcceptAndPlay` de `EpisodeDetail` son un flujo propio (consentimiento + analítica + clave del embed). Propuesta: `useEmbedPlayback({ embedKey, onPlay })` que devuelva `{ canRenderEmbed, askingConsent, play, acceptAndPlay, cancel }`. Va con PUB-A2.
Riesgo: bajo-medio, ver PUB-A2.

**TSX-PUB-B3 · Reglas de paginación del feed repetidas · B**
`useFeed` y `useRecommendationMasonry` repiten, con comentarios iguales, tres piezas puras: la regla «una ronda vacía es definitiva» (`batch.items.length > 0 ? batch.hasMore : false`), la clave de tarjeta (`${index}:${item.pinId}`, con su comentario «NUNCA usar `item.pinId` como key») y la conversión de pin a `LayoutInputItem` (`ratio as PinRatio` + `estimateLabelHeight`). Propuesta: `nextHasMore(batch)` en `feedApi.ts`, `masonryKey(index, pinId)` y `toLayoutItem(item, columnWidth)` en `modules/masonry/domain/`, con test. **No** se propone fusionar los dos hooks: el comentario de cabecera de `useRecommendationMasonry` explica que no son variantes y tiene razón (sin persistencia, sin virtualización, sin sentinel persistido).
Riesgo: bajo. Tests: `uniqueKeys`, `recommendationCursor`.

**TSX-PUB-B4 · Scroll del feed dentro de `useFeed` · B**
`useFeed` (180 líneas) mezcla abrir sesión, cargar lotes, reintento por límite de peticiones, analítica «Feed Depth», guardado de scroll por `requestAnimationFrame` y restauración del scroll al volver de un detalle. Propuesta: `useFeedScroll(scope, { setScrollY, getScrollY, ready })` con los dos últimos efectos y el `shouldRestoreRef`. Quita uno de los tres `eslint-disable react-hooks/exhaustive-deps` del bloque.
Riesgo: medio-bajo; `feedProvider` y `feedRateLimitRetry` cubren la restauración.

**TSX-PUB-B5 · Alto del viewport · B**
`useRecommendationMasonry` mantiene su propio `viewportHeight` con un `resize` a mano y `useMasonryPositions` escucha `resize` y `scroll` para otra cosa. Hay 2 `addEventListener('resize')` en el bloque. Propuesta: `useViewportHeight()` con `useSyncExternalStore` (como ya se hace con el DPR), junto a `useContainerWidth`.
Riesgo: bajo.

**TSX-PUB-B6 · `queueMicrotask(() => setState(…))` como rodeo · B**
7 apariciones en 5 ficheros (`useFeed`, `useRecommendationMasonry`, `usePinVideo`, `useVideoSlot`, `useToolCoverVideo`), cada una con un comentario que explica que sirve para esquivar `react-hooks/set-state-in-effect`. Es un rodeo de la regla, no una solución. Cuando se reinicia el estado por un cambio de prop se puede derivar el valor (`useVideoSlot` devolvería `enabled && active`) o usar `key` en el padre (`useRecommendationMasonry` con `key={content.id}`). Propuesta: revisar uno a uno cuando se toque cada hook; no es un cambio en bloque.
Riesgo: medio (cambia el momento en que se reinicia el estado). Va después de PUB-B1.

#### TSX-PUB-C. Componentes casi iguales

**TSX-PUB-C1 · Seis rutas de paquetes casi idénticas · M**
`insights`, `tools` y `variety` tienen cada una `[slug]/app/route.ts` (61, 69 y 64 líneas) y `[slug]/app/assets/[...file]/route.ts` (39 líneas las tres). Comparadas con `diff`, las rutas de assets difieren en **una línea** (`'insight'`/`'tool'`/`'variety'`) y las de documento en el tipo de paquete, la ruta base y el texto de «no encontrado», además de los comentarios. Las cabeceras (CSP aislada, `nosniff`, HSTS, `Referrer-Policy`) están copiadas tres veces y deben cambiar a la vez.
Propuesta: `createPackageDocumentRoute({ type, basePath, notFoundLabel })` y `createPackageAssetRoute(type)` en `lib/http/` (junto a `packageAssetResponse.ts` y `packageErrorResponse.ts`); cada `route.ts` queda en 3 o 4 líneas (`export const GET = …`). Las cabeceras pasan a una constante `PACKAGE_DOCUMENT_HEADERS`. Pasa de ~330 líneas a ~90.
Riesgo: bajo-medio: es la ruta que sirve HTML ejecutable con CSP propia. Next exige que `GET` sea un export estático, no una función construida en tiempo de petición; una fábrica que devuelve el handler cumple. Los tests `appRoutes` y `assetRoutes` ya cubren las tres rutas. La constante `SIDEBAR_WIDTH = 64` de las rutas de tools, insights y variety (copiada en cada una) debe coincidir con el ancho de la barra lateral del Shell; la fábrica la recibe de un único sitio.

**TSX-PUB-C2 · Plantilla de detalle tipo B · B**
`CaseDetail` y `EpisodeDetail` comparten estructura: `article` > `contentBlock` (caja del medio con `width`/`height` del masonry + columna de texto) > `RecommendationsGrid`, y ambos llaman a `useRecommendationMasonry(content.id, ratio, { fullWidthContent: true })`. Propuesta: `DetailTypeB` que reciba `ratio`, un render-prop `media(box)` y los hijos del texto. Ahorra unas 15 líneas en cada uno. El valor es bajo porque el medio (carrusel frente a embed) y el texto son lo que cambia; solo compensa si se añade un tercer tipo B.
Riesgo: bajo. Recomendado: dejarlo hasta que haya un tercero.

**TSX-PUB-C3 · Posición de las tarjetas · B**
`PinCard` y `NewsletterPinCard` aplican el mismo `style={{ transform: translate(x, y), width }}` (2 apariciones literales) y `Feed` repite el `translate` en el espaciador. Propuesta: `cardPositionStyle(style)` en `PinCard/types.ts` (o un envoltorio `PositionedCard`). Hace que el cambio de «transform» a otra técnica sea un solo sitio.
Riesgo: nulo.

#### TSX-PUB-D. Helpers, tipos y constantes duplicados

**TSX-PUB-D1 · `FeedScope` no existe como tipo · M**
`scope` es un `string` libre en 28 firmas repartidas en 13 ficheros fuera del admin. `isFeedScope(scope): boolean` en `feedScope.ts` no es un type guard, y `SCOPE_TO_TYPES` es `Record<string, …>`. Las cinco páginas del feed (`<Feed scope="work" />`, etc.) aceptan cualquier cadena, y un `scope="work "` compilaría y caería en `home` (`typesForScope` devuelve `home` ante un scope desconocido).
Propuesta: `FEED_SCOPES = ['home','work','insights','tools','channel'] as const`, `type FeedScope`, `isFeedScope(scope): scope is FeedScope`, y `Feed`, `useFeed`, `FeedProvider` y los puertos usan `FeedScope`. En las fronteras externas (la API recibe una cadena) se queda `string` + guard.
Riesgo: bajo; el cambio es de tipos, y `tsc` marca cada sitio.

**TSX-PUB-D2 · Lectura de cookies del navegador · B**
`consentCookie.ts` y `newsletterCookie.ts` tienen el mismo bloque de seis líneas (`document.cookie.split(';').map(trim).find(startsWith(prefix))`). Propuesta: `readBrowserCookie(name)` en `lib/clientCookie.ts` con test (valor con `=`, cookie ausente, `document` indefinido). Los dos módulos quedan en 3 líneas.
Riesgo: nulo.

**TSX-PUB-D3 · Ruta por idioma de un caso · B**
`publicContentPath(type, slug)` existe, pero la ruta `/work/{slug}` y `/work/{slug}/{locale}` se vuelve a escribir en `CaseDetail` (selector de idioma), `workContent.ts` (hreflang), la redirección de `[locale]/page.tsx` y el sitemap (que construye `${canonicalUrl}/${locale}`). Son 5 apariciones literales de `/work/${…}`. Propuesta: `workLocalePath(slug, locale, defaultLocale)` en `contentPath.ts` y que las cuatro piezas lo usen.
Riesgo: bajo; `contentPath.test` y los tests del sitemap lo cubren. Si el criterio cambia (por ejemplo, un prefijo de idioma), hoy hay que tocar cuatro sitios a la vez.

**TSX-PUB-D4 · Preview: parámetro y resolución · B**
`new URLSearchParams(window.location.search).has('preview')` aparece en `ContentOpenTracker` y `EpisodeDetail`; el nombre del parámetro, escrito a mano. Y `getWorkPreview` (work) y `getToolPreview` (tools) repiten `resolvePreviewContext` + «solo estos tipos». Propuesta: `isPreviewRequest()` en `modules/analytics/` y `resolvePreviewOfType(slug, token, types)` en `modules/content/container`.
Riesgo: bajo.

**TSX-PUB-D5 · Entradas de navegación en dos listas · B**
`Shell/navItems.ts` y `AuxNav` declaran por separado los mismos nombres («We did it», «Podcasts», «Insights», «Tools»), con destinos distintos a propósito (`/` frente a `/work`). El comentario de `navItems.ts` ya avisa de que deben coincidir. Propuesta: `SECTION_LABELS` compartido y que cada lista añada su `href`. Un cambio de nombre hoy exige tocar dos ficheros.
Riesgo: nulo.

**TSX-PUB-D6 · `cx` solo para el admin · B**
`components/admin/cx.ts` lo importan 13 ficheros del admin. El público compone clases con plantillas de texto (6 `className={`…`}`, p. ej. `` `${styles.video} ${video.visible ? styles.videoVisible : ''}` ``) y `Cta` tiene su propio `join`. Propuesta: mover `cx` a `@/lib/cx` (o `@/components/cx`) y usarlo en el público. Evita la cadena con espacio final cuando la condición es falsa. Toca 13 ficheros del admin solo por el `import`.
Riesgo: nulo.

**TSX-PUB-D7 · `sessionStorage` con y sin guarda · B**
Los usos reales de `sessionStorage` en el sitio son dos: `FeedProvider`, que lo envuelve en `try/catch` y explica por qué, y `ContentFilterPersistence` (admin), que lo usa en 5 puntos sin ninguna guarda (puede lanzar en navegación privada estricta o con el almacenamiento lleno). El resto de menciones (`pageLoadId`, `navigationAttribution`, `newsletterCookie`, `useRecommendationMasonry`) son comentarios. Con dos usos no compensa un helper compartido; lo que falta es la guarda en el admin (ver TSX-ADM-B3).
Riesgo: bajo.

**TSX-PUB-D8 · Estado de una acción de formulario a partir del resultado · B**
`contactActions.ts` y `newsletterActions.ts` repiten el mismo bloque: `if (!result.ok) { if ('fieldErrors' in result) return { fieldErrors }; return { formError } }`. Propuesta: `toFormState(result)` en `lib/forms/formActionState.ts`, que ya es el sitio de la forma común.
Riesgo: nulo.

#### TSX-PUB-E. Estructura de ficheros

**TSX-PUB-E1 · `FeedProvider` (315 líneas) · B**
Mezcla el contexto y sus acciones con utilidades puras de almacenamiento y estado (`withoutNewsletter`, `readFromSessionStorage`, `writeToSessionStorage`, `withScroll`) y con el tipo del lote duplicado (en `FeedContextValue.appendBatch` y en el `useCallback`). Propuesta: `feedStorage.ts` con las cuatro funciones (testables sin React) y un tipo `FeedBatchInput` exportado. El proveedor queda en unas 200 líneas.
Riesgo: bajo; `feedProvider` y `feedProviderNewsletter` cubren la lógica.

**TSX-PUB-E2 · Piezas locales de `/privacy` · B**
`privacy/page.tsx` define `ListItem` y `Block` (un `switch` de cinco bloques) dentro de la página. §24.2 pide carpeta por componente cuando tiene estilo propio. Propuesta: `PolicyBlock/` junto a la página. Además, `Block` usa `key={index}` para los bloques (aceptable: el contenido es estático y no se reordena).
Riesgo: nulo.

#### TSX-PUB-F. Convenciones y limpieza

**TSX-PUB-F1 · Imports · B**
6 ficheros pegan una línea de código o de comentario al último `import` sin línea en blanco: `work/[slug]/[locale]/page.tsx`, `workContent.ts`, `global-error.tsx`, `layout.tsx`, `ToolCoverVideo/index.tsx` y `useToolCoverVideo.ts`. `EpisodeDetail` importa `react` y `next/link` después de los alias `@/…` (único caso del bloque; en el admin eran 12).

**TSX-PUB-F2 · Textos de error del feed · B**
`useFeed` guarda el mensaje de la excepción en `error` (`err.message`) pero `Feed` solo mira si `error` existe y pinta `feedCopy.loadError`; el texto no se usa. Además `feedApi.ts` lanza mensajes en inglés técnico (`Could not open the feed session: 500`) mientras el resto del código escribe en español. Propuesta: `error` booleano (o un código) en `useFeed`, y mensajes de excepción en español como el resto del código. Va con PUB-A8.

**TSX-PUB-F3 · Fragmentos con un solo hijo · B**
3 páginas envuelven un único componente en `<>…</>` sin necesidad: `tools/[slug]/page.tsx`, `work/[slug]/[locale]/page.tsx` y la rama de episodio de `work/[slug]/page.tsx`.

### 4.3 Transversales (TSX-X)

**TSX-X1 · `cx` en un solo sitio · B**
`components/admin/cx.ts` lo importan 13 ficheros del admin; el público compone clases con plantillas de texto (6 `className={`…`}`) y `Cta` tiene su propio `join`. Mover `cx` a `@/lib/cx` y usarlo en las dos zonas cierra TSX-PUB-D6. Toca 13 ficheros del admin solo por el `import`.

**TSX-X2 · Imagen de Cloudinary · B**
`AdminMediaItem` es el único `<img>` del admin (con su `eslint-disable no-img-element`) y pinta una miniatura con URL de Cloudinary. El `CloudinaryImage` propuesto en TSX-PUB-A1 podría servirla también, con un perfil `thumb`. Solo compensa si PUB-A1 se hace; si no, se deja.

**TSX-X3 · Etiquetas de idioma en el dominio · B**
El admin tiene `localeCode` en `contentLabels.ts`, `getLocaleLabel` copiada en dos ficheros (ADM-C2) y `allLocales` a mano; el público usa `loc.toUpperCase()` en el selector de idioma de `CaseDetail`. Un `localeLabel` y un `localeCode` junto a `localeSchema` (`modules/shared/domain/locale.ts`) sirven a las dos zonas y evitan una tercera copia.

**TSX-X4 · Orden de imports · B**
Admin: 12 ficheros importan `@/…` antes que `react`/`next` y 1 pega `type Props` al último `import`. Pública: 1 y 6 respectivamente. Un `import/order` en ESLint cierra ADM-F1, ADM-F2, PUB-F1 y deja de depender de la revisión manual.

**TSX-X5 · Forma común de las acciones de formulario · B**
`lib/forms/formActionState.ts` ya unifica el estado. Falta unificar lo que se construye con él: en el admin, el pie de formulario con mensajes y botón (ADM-A2); en el público, la conversión del resultado de la aplicación al estado (PUB-D8), el honeypot (PUB-A3) y los campos (PUB-A6). Conviene decidir una vez qué vive en `lib/forms` (lógica) y qué en cada kit (presentación), porque los textos difieren por diseño: el admin está en español («Guardando…») y el público en inglés («Sending…»).

**TSX-X6 · `sessionStorage` con guarda · B**
Los usos reales son dos: `FeedProvider` (con `try/catch`) y `ContentFilterPersistence` del admin (sin guarda, en 5 puntos). Con dos usos no compensa un helper compartido; lo que falta es la guarda en el admin (ADM-B3, PUB-D7).

## 5. Revisado y descartado a propósito

### 5.1 Admin

1. **Fusionar `useBulkPinUpload` con `UploadCvs`** (ADM-B2): el núcleo de cola se parece, pero pines (ratio e idioma) y CVs (límite de 10, antivirus) divergen. Se extrae `useUploadQueue` solo si se toca alguno.
2. **Subir `SafeLink`, `Row` y `rate` de la ficha de candidato al kit** (ADM-A5): `Row` es un par `<dt>/<dd>`, no un `AdminReadonlyField`; se hace si aparece un segundo uso.
3. **`AdminListLayout` genérico** (ADM-E1): las columnas y filtros divergen demasiado; solo se proponen los helpers. Confirmado por Greener el 26 oct.
4. **ADM-F3, importar por ruta relativa `../pinActions`:** no se aplica. La regla de ESLint del proyecto (`NO_PARENT_IMPORTS`) prohíbe los imports a carpeta padre y exige el alias `@/…`; solo se permite `./` para la misma carpeta. El hallazgo partía de una convención que el proyecto ya había descartado a propósito.

### 5.2 Pública

1. **Unificar `useFeed` y `useRecommendationMasonry`** en un hook de paginación único: la cabecera de `useRecommendationMasonry` justifica que son distintos (sin persistencia, sin virtualización, scope fijo `home`). Solo se extraen las reglas puras (PUB-B3).
2. **Un componente de enlace común** (`<a>` frente a `<Link>`): `CardLink` (ruta de documento, `prefetch={false}`), `IconLink` (externo con `rel`), `CtaLink`/`CtaAnchor` (estado «procesando» solo en el interno) y `AdminTextLink` resuelven casos distintos. Unificarlos obligaría a un componente con cuatro modos.
3. **`ToolInsightDetail` con los detalles de tipo B**: la geometría de tipo A (bloque dentro del lienzo, siembra asimétrica) es lo que lo distingue; no es una duplicación.
4. **`ToolCoverVideo`** como componente: su lógica de intención (`auto`/`play`/`pause`) y DPR es propia; solo se comparte el ciclo de carga (PUB-B1).
5. **Los tres `eslint-disable react-hooks/exhaustive-deps`**: están justificados (arrancar solo cuando hay sesión, restaurar solo al montar). PUB-B4 elimina uno.
6. **Las cinco páginas del feed** (`<Feed scope="x" />`): son de una línea; lo que sobra es el tipo del scope (PUB-D1), no las páginas.
7. **`policyContent.ts` (470 líneas)**: es contenido legal del asesor, no lógica; vive donde debe.

## 6. Orden de ataque propuesto

1. **Sin riesgo, tipos, constantes y helpers (hecho el 26 oct, salvo ADM-F3, descartado):** ADM-C2, ADM-D1, ADM-D2, ADM-D3, ADM-C3, ADM-F1 a F4; PUB-D1, PUB-D2, PUB-D3, PUB-D5, PUB-D8, PUB-A5, PUB-E2, PUB-F1 a F3; TSX-X1, TSX-X3, TSX-X4. Todo con test unitario donde haya lógica.
2. **Extracciones de presentación (hecho el 26 oct, salvo TSX-X5):** ADM-A2, ADM-A3, ADM-A4, ADM-E3; PUB-A1, PUB-A3, PUB-A4, PUB-A6, PUB-A7, PUB-A8, PUB-C3, PUB-D4, PUB-D6; TSX-X2, TSX-X5.
3. **Formularios y flujos destructivos (hecho el 26 oct; probar a mano cada confirmación):** ADM-A1.
4. **Medios y vídeo (hecho el 26 oct salvo PUB-B6; probar una subida real y la reproducción):** ADM-C1 con ADM-B1; PUB-B1 y, si se decide, PUB-B6.
5. **Rutas de paquetes (hecho el 26 oct; probar las tres a mano y `next build`):** PUB-C1.
6. **Episodio y feed (hecho el 26 oct):** PUB-A2 con PUB-B2, PUB-E1, PUB-B3, PUB-B4, PUB-B5.
7. **A decidir con Greener (decidido y hecho el 26 oct, salvo lo que se deja):** ADM-D4, ADM-E1, ADM-B2, ADM-B3; PUB-C2 (descartado el 27 oct) y PUB-B6 (por lotes: el 1 y el 2 hechos el 27 oct, el lote 3 pendiente).

Dependencias: TSX-X1 (`cx` compartido) antes de los componentes nuevos que lo usen; PUB-D1 (`FeedScope`) antes de tocar `useFeed`/`FeedProvider` en PUB-B4 y PUB-E1; ADM-C1 después de ADM-B1.

## 7. Pendiente de revisión

### 7.1 Errores reales abiertos

No son refactorizaciones: son comportamientos que conviene corregir. Los tres están ya cerrados.

1. **Corregido el 27 oct (§2.107): mensaje de éxito del contacto en español en una interfaz en inglés.** `ContactForm.tsx` muestra «Gracias por escribirnos — te responderemos lo antes posible.» mientras todo el resto del formulario y de los mensajes del servidor está en inglés (arquitectura §2.4: interfaz global en inglés). Ningún test lo comprueba.
2. **`ContentFilterPersistence` sin guarda de `sessionStorage`** (ADM-B3, TSX-X6): puede lanzar una excepción en navegación privada estricta o con el almacenamiento lleno y romper el listado de contenidos. **Cerrado el 26 oct (§2.106):** `safeSessionStorage` y `usePersistedFilters`.
3. **Corregido el 26 oct (PUB-D1).** **Un scope desconocido caía en `home` sin avisar**: `typesForScope` devuelve `home` ante cualquier cadena no reconocida, de modo que un error tipográfico en una página del feed no falla: muestra el feed equivocado.

### 7.2 Afirmaciones que no se han comprobado en ejecución

1. No se ejecutó la suite ni la aplicación para esta auditoría. La línea base que se citó entonces (2643 tests pasados y 12 ficheros fallando por entorno) no era la del repositorio completo: el 26 oct, con `supabase/migrations` y `public/` presentes, la suite daba 226 ficheros y 2760 tests en verde, sin fallos de entorno; tras las cinco mejoras, 232 y 2838.
2. Que una fábrica de rutas de paquetes cumpla la exigencia de Next de que `GET` sea un export estático (PUB-C1): confirmado el 26 oct con `next build`. Falta probar a mano las tres secciones.
3. Que `workLocalePath` coincida con lo que construyen hoy el sitemap, el hreflang y la redirección (PUB-D3) se ha comprobado leyendo el código, no ejecutándolo.
4. Los textos de confirmación y de pendiente (ADM-A1, ADM-A2) deben conservarse literalmente; no se ha hecho un inventario completo de todos los textos.
5. Las líneas ahorradas son estimaciones (apartado 2).

### 7.3 Imprecisiones de los propios informes y del código

Los cinco comentarios del código de la primera lista se corrigieron el 26 oct (§2.104).

**Comentarios del código que ya no describen lo que hace**

1. `CaseDetail/index.tsx` dice «las recomendaciones usan scope='work' (solo Cases)». Desde el 14 oct 2026 el scope de las recomendaciones es siempre `home` (`RECOMMENDATIONS_SCOPE` en `useRecommendationMasonry`).
2. `ToolInsightDetail/index.tsx` dice «panel de recomendaciones de la misma sección (Tool → Tools, Insight → Insights)»: mismo caso. Su cabecera habla además de insight y de `other` como usos de la plantilla, y el componente solo se usa ya para tools.
3. `EpisodeDetail/index.tsx` habla de «tres proveedores» en el comentario de `startPlayback`; hoy son dos (YouTube y Spotify; Vimeo se retiró el 13 oct).
4. `contact/page.tsx` menciona «consentimiento de privacidad», pero `ContactForm` explica que la casilla no es un consentimiento desde el 19 oct.
5. `ContentFilterPersistence.tsx` tiene los comentarios en inglés; el resto del proyecto, en español.

**Del propio proceso de la auditoría**

6. El primer borrador del informe del admin daba por equivalentes `Row` (ficha de candidato) y `AdminReadonlyField`, y `SectionHeading` y `AdminSubheading`; al leer el código resultaron no serlo (ADM-A5, ADM-E3) y se corrigieron. También proponía revisar `OtherOccupationNotice` como posible pieza de un solo uso: tiene dos y ya es compartido (ADM-A4).
7. Recuentos corregidos tras comprobarlos: `useCharCount` son 7 llamadas (6 en `TranslationForm`, 1 en `CaseDetailForm`) frente a 8 `<CharCounter`; las pluralizaciones a mano son 4 en 3 páginas; de los 9 fragmentos `<>` del público solo 3 envuelven un único hijo; los otros 6 son legítimos. Un primer recuento de fragmentos dio 1 porque los ficheros son CRLF y el ancla `$` fallaba; se repitió descontando el `\r`.
8. PUB-D7 se redactó primero con cuatro usos de `sessionStorage`; dos eran comentarios que explican que no se usa. Quedan dos usos reales (TSX-X6).
9. «Hay 28 firmas con `scope: string` en 13 ficheros» (PUB-D1) incluye las de módulos de servidor (infraestructura y puertos del feed), no solo las del cliente.

### 7.4 Decisiones pendientes de Greener

Admin

1. **ADM-D4:** ¿`contentCapabilities` en el dominio (la web pública lo reutilizaría) o solo en el admin? **Decidido el 26 oct: solo en el admin** (en `_lib/` de `/admin`). Aplicado en la fase 7 (§2.106).
2. **ADM-A1:** ¿un único estilo para los textos de pendiente (`Guardando…`, con el carácter de puntos suspensivos)? **Decidido el 26 oct: se unifican con `…`** y aplicado (§2.104).
3. **ADM-E1:** ¿`AdminListLayout` (menos código, más abstracción) o solo helpers? **Decidido el 26 oct: solo helpers.** Aplicado en la fase 7 (§2.106).
4. **ADM-B2:** ¿se prevé un tercer uso de cola de subida (más ficheros en Talent)? Si no, se deja como está. **Decidido el 26 oct: no se prevén cambios en Talent; se extraen los elementos comunes sin unificar las dos colas.** Aplicado en la fase 7 (§2.106, `useUploadQueue`).

Pública

5. **PUB-C1:** ¿las rutas de paquetes se unifican ya, o se espera a tocar las CSP? Si `variety` va a tener una política distinta, la fábrica debe aceptar cabeceras como parámetro. **Decidido el 26 oct: se unifican.** Aplicado con las cabeceras comunes y sin parámetro; si variety necesita otra política, se añade entonces.
6. **PUB-D1:** ¿se acepta que `Feed` solo admita los cinco scopes conocidos? **Decidido el 26 oct: sí, con un único array** (`FEED_SCOPES`). Aplicado.
7. **PUB-A2/PUB-B2:** ¿se saca el texto legal del panel de consentimiento del embed a `modules/consent/domain/copy`, junto al del banner? Hoy vive dentro del JSX de `EpisodeDetail`, sin versión de texto. **Decidido el 26 oct: sí, se extrae el flujo del texto legal del componente.** Aplicado en la fase 6 (§2.106).
8. **PUB-B6:** ¿se prefiere seguir con `queueMicrotask` documentado o derivar estado en cada hook? **Decidido el 26 oct: se revisan todos los hooks uno a uno. 27 oct: se hace por lotes según el riesgo; los lotes 1 (`useVideoSlot` y el billete de `usePinVideo`, §2.107) y 2 (el primer lote de `useFeed` y de las recomendaciones, §2.108) están hechos; el lote 3, pendiente.**

Transversal

9. **TSX-X5:** ¿qué vive en `lib/forms` y qué en cada kit? **26 oct: Greener necesita más información. 27 oct: se cierra con un README en `lib/forms` (la lógica común en `lib/forms`, la presentación y su idioma en cada kit).**

## 8. Para que no vuelva a pasar

1. Test de arquitectura que prohíba listas cerradas escritas a mano en la UI: `<option value="es">`, los siete ratios y los cinco tipos de contenido dentro de `src/app/admin/**`, `src/components/**` y `src/app/(public)/**` (tras ADM-D1 a D3 y PUB-D1). **Hecho el 27 oct (§2.107):** `tests/unit/architecture/noHandWrittenClosedLists.test.ts`.
2. Test que prohíba más de un `<img` con `eslint-disable no-img-element` fuera de `CloudinaryImage` (tras PUB-A1; PUB-A1 se aplicó el 26 oct, **hecho el 27 oct (§2.107):** `singleCloudinaryImg.test.ts`, con `ToolCoverVideo` y el Shell como excepciones nombradas).
3. Test que compare las tres rutas `app/route.ts` y las tres de assets con la fábrica (tras PUB-C1) o, mientras tanto, que falle si dejan de ser idénticas salvo por el tipo. Cubierto por `tests/unit/packages/packageRoutes.test.ts` (26 oct) y, desde el 27 oct (§2.107), por `packageRoutesUseFactory.test.ts`, que descubre las rutas nuevas.
4. Test o regla ESLint que limite `window.confirm` a `AdminActionForm` (tras ADM-A1). **Hecho el 27 oct (§2.107):** `confirmOnlyInKnownPlaces.test.ts`; `DeletePinButtons` y `useCaseCarouselManager` quedan como excepciones nombradas (son clics, no envíos de formulario).
5. `import/order` en ESLint (TSX-X4). Hecho el 26 oct (§2.104).
6. Dejar documentados los kits (`components/admin`, `Cta`, `StatusPage`) en un README corto en cada carpeta, porque hoy solo se descubren leyendo el directorio. **Hecho el 27 oct (§2.107), con `lib/forms`.**
