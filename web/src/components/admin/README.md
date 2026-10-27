# Kit del ABM (`components/admin`)

Todo lo que pinta el panel `/admin` sale de aquí: las páginas se componen casi sin CSS propio. Antes de escribir un `<p>`, un `<label>` o un botón a mano en una pantalla del admin, mira si ya existe la pieza. Un componente por carpeta, con su módulo CSS; se importa por la carpeta (`@/components/admin/AdminButton`).

**Estructura de página.** `AdminShell` (marco del panel), `AdminPage` y `AdminPageHeader` (ancho, título, `AdminBackLink`), `AdminCard` con `AdminCardHeader`, `AdminCardSection` y `AdminCardText`, `AdminEmptyState` para «no hay nada», `AdminList` para listas de filas.

**Formularios.** `AdminForm` (con `AdminFormGrid`, `AdminFormActions` y `AdminFormBody` para bloques que no envían un `<form>`), `AdminField` (etiqueta, ayuda y error, con `AdminHint`, `AdminFieldError`, `AdminReadonlyField` y `AdminFieldset`), los controles de `AdminControls` (`AdminInput`, `AdminSelect`, `AdminTextarea`) y `AdminCountedField` (control con contador de caracteres, con `CharCounter` y `useCharCount`). `AdminFormFooter` es el pie de un formulario de edición: error general, aviso de éxito y botón con «Guardando…». `AdminOptions` trae las `<option>` de las listas cerradas del dominio (`LocaleOptions`, `RatioOptions`, `ContentTypeOptions`, `ContentStatusOptions`): no escribas `<option value="es">` a mano, hay un test que lo vigila.

**Acciones.** `AdminButton` y `AdminButtonLink`; `AdminActionForm` para una acción de un clic (borrar, procesar) con confirmación nativa y botón de pendiente; `AdminTextLink` para enlaces.

**Listados.** `AdminTable` (con `AdminTd`, `AdminTableTitle`, `AdminSubtext`, `AdminCellActions` y `AdminRowAction`), `AdminFilterBar` (con `AdminFilterSearch`, `AdminFilterClear` y `AdminResultBar`) y `AdminPagination`. La query y los enlaces de página salen de `app/admin/_lib/listHref`.

**Estado y avisos.** `AdminMessage` (aviso, error, éxito), `AdminBadge` con `AdminStatusBadge` y `AdminLocaleBadge`, `AdminVisuallyHidden` para texto solo accesible.

**Medios.** `AdminMediaItem` y `AdminMediaGrid` (miniaturas con `CloudinaryImage`) y `MediaUploader`.

**Etiquetas.** `contentLabels.ts` (`contentTypeLabel`, `contentStatusLabel`); los idiomas, en `modules/shared/domain/locale`.

Textos del admin, en español; el «en curso» lleva el carácter `…`, no tres puntos (hay un test).
