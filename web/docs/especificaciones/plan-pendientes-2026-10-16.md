# Plan de pendientes — 16 de octubre de 2026

**Estado (16 oct, tarde): bloques A, B y C ejecutados** (`docs/historial/historial-fase-5.md` §2.80). Pendientes: el bloque D (careers con n8n), a la espera del código de Greener, y el bloque E (fase 6 de `other`), en pausa. Sale de la ronda de decisiones del 16 de octubre (lista de 22 puntos y respuestas de Greener). Regla de trabajo: primero se planifica y luego se ejecuta.

## 1. Decisiones recogidas

| Nº | Tema | Decisión |
| --- | --- | --- |
| 1 | Indicador de ocupación del ABM (plan de `other` §7.6) | **Sí**, como aviso **no bloqueante al superar el 10 %**. |
| 2 | Criterios de la cookie `greener_newsletter` | **Confirmados**: cookie propia, 12 meses, no `httpOnly`. La revisión del texto por el asesor sigue dentro del punto 3. |
| 5 | Página de careers | Página propia en React con una llamada a un webhook de n8n y un pequeño backend en una ruta `/admin`. Se compartirá en otra conversación para convertirla en paquete `variety`. Ver §4. |
| 7 | Repetición de pines con catálogo corto | Se deja como está. |
| 8 | Vídeo `hover` | Desactivarlo para quien tenga `prefers-reduced-motion`; y **no reproducir ni descargar** si el puntero solo pasa por encima sin intención. |
| 9 | Preview de borrador | **Solo** para páginas de `case` y `episode`. Tool, insight y `other` no la tendrán. |
| 11 y 16 | Diseño móvil | No hay diseño: no se hace nada más en esa dirección. |
| 12 | Tipografía del admin | Se unifica con la del sitio: **Helvetica Neue**. |
| 14 | `tdm-reservation` y bots de entrenamiento | Se deja como está; se decide más adelante. |
| 15 | `--detail-block-gap` | Se queda en 40 px; lo cambia Greener cuando toque y avisa. |
| 19, 20 y 21 | Zip bomb, `GET /api/health`, purga de `feed_session`/`feed_round` | **Adelante.** |
| 22 | Fase 6 del plan de `other` | **En pausa** hasta terminar todo lo demás. |

## 2. Orden de ejecución

Cuatro bloques, de menor a mayor riesgo. Cada bloque acaba con `tsc`, ESLint, Prettier, la suite entera, la documentación del bloque (historial, PROGRESO, estructura) y el zip.

### Bloque A — Cambios pequeños ya decididos

**A1. Aviso de ocupación del 10 % (punto 1).**

- Estimación: suma de `100 / frecuencia` de los `other` **publicados** (los programados no cuentan hasta publicarse). Es una cota alta, porque la separación mínima y el tope de retraso del calendario omiten alguna repetición.
- Dónde: (a) en el listado de contenidos, cuando el filtro de tipo es `other`; (b) en el formulario de frecuencia del editor de un `other`, calculando la ocupación con el valor que se está escribiendo.
- Comportamiento: texto informativo siempre («ocupación estimada del feed: X %»), y aviso visible al pasar del 10 %. Nunca bloquea guardar ni publicar.
- Constante `OTHER_OCCUPANCY_WARNING_PERCENT = 10` en `otherSchema.ts`; función pura `estimateOtherOccupation(frequencies)`.
- El listado necesita la frecuencia de cada `other` publicado: se añade al `select` anidado de `other_detail`.
- Tests: función pura (0, 1 y varios `other`; umbral exacto) y los dos textos.

**A2. Preview solo en case y episode (punto 9).**

- `PublishControls` recibe `previewAvailable` desde el editor: verdadero únicamente para `case` y `episode`. Hoy lo es también en tool e insight, donde el enlace acaba en un 404.
- Cierra en PROGRESO el punto «Preview de una versión en borrador del paquete HTML» como **decidido: no se hace**.
- Tests: botón visible en case/episode y oculto en tool/insight/other.

**A3. Vídeo `hover` (punto 8).** Hoy (`PinCard`, `usePinVideo`):

- el modo `hover` reproduce al instante en `onMouseEnter`, sin ninguna espera;
- el modo `hover` **sí participa en el prefetch**: los vídeos cercanos al viewport se descargan antes de que nadie pase el ratón (hasta 3 billetes en escritorio);
- con `prefers-reduced-motion` el prefetch se apaga, pero el hover **sigue reproduciendo**.

Cambios:

1. Con `feedAutoplayAllowed` falso (`prefers-reduced-motion`, `save-data`, 2G o conexión lenta) el hover tampoco reproduce: póster fijo. Aplicarlo a las tres condiciones y no solo a reduced-motion es una decisión mía por coherencia con el resto del feed; se puede acotar.
2. **Intención de hover:** el vídeo solo se monta y se descarga si el puntero permanece en la tarjeta unos **200 ms**. Si sale antes, no pasa nada. El foco de teclado cuenta como intención inmediata.
3. **Sin prefetch para `hover`:** el prefetch queda solo para `viewport`, así que un vídeo `hover` no se descarga hasta que hay intención. Contrapartida: el primer hover tarda en arrancar lo que tarde la descarga (el póster se mantiene hasta que el vídeo está listo, como ahora).
4. Dispositivos táctiles: el `mouseenter` emulado del toque, seguido de navegación, deja de montar el vídeo por la espera de 200 ms.
5. Tests: no monta antes de 200 ms, cancela al salir, monta tras 200 ms, no hay prefetch en `hover`, y no reproduce con reduced-motion, save-data ni conexión lenta.

**A4. Tipografía del admin (punto 12).**

- Interpretación: el admin deja de arrastrar su tipografía propia y usa Helvetica Neue como el resto del sitio, **con los pesos que realmente se cargan** (400 y 700, `src/lib/fonts.ts`). Hoy hay ~21 declaraciones con pesos entre 650 y 900 que el navegador aplana a negrita.
- No se toca Kinder (titulares de la web pública) ni las fuentes monoespaciadas del admin (`<code>`, ids).
- Antes de tocar: inventario de las declaraciones de `font-family` y `font-weight` de `admin.css` y del layout del admin. Después, normalización de pesos (≥ 600 a 700) y comprobación visual en Chromium del listado, el editor y el alta.

### Bloque B — Robustez (puntos 19, 20 y 21)

**B1. Zip bomb.** El punto de PROGRESO está desfasado: ya existen límites de lo descomprimido (60 MB en total, 25 MB por fichero, `zipValidation.ts`, auditoría 8 oct P0-3) y un test. Lo que haré es **comprobar que el tope se aplica al tamaño real tras descomprimir**, no solo al declarado en la cabecera del ZIP (que un ZIP malicioso puede falsear). Si solo se mira el declarado, se añade la comprobación del tamaño real de lo leído y su test; si ya está cubierto, se cierra el punto sin tocar código.

**B2. `GET /api/health`.**

- Responde 200 con `{ "status": "ok" }` si una consulta mínima a Supabase (lectura de una fila de `feed_config`) funciona, y 503 si falla. Sin detalles del error en la respuesta (solo al log del servidor), sin datos del sitio y con `Cache-Control: no-store`.
- Se comprueba que el `proxy.ts` y la CSP global no estorban a una ruta de API y se documenta cómo usarla desde el vigilante de PM2 (`docs/operaciones/despliegue.md`).
- Tests: 200, 503 y que no filtra el mensaje de error.

**B3. Purga de `feed_session` y `feed_round`.**

- **Migración nueva** con un trabajo diario de `pg_cron` (la extensión ya se usa para la publicación programada, `20260922090000_publish_scheduled_content_cron.sql`) que borra las `feed_session` caducadas hace más de 24 h. `feed_round` cae en cascada.
- El margen de 24 h evita borrar una sesión que un visitante acaba de dejar abierta.
- Se prueba como los demás ficheros de migración (el test de contenido del SQL) y se documenta en el despliegue. **Hay que aplicarla con `npx supabase db push`.**

### Bloque C — Decisiones con información (puntos 10 y 13)

Greener pidió más información. Se entrega en la conversación (resumen en §3) y el plan queda a la espera de su respuesta:

- **10. `feed_config.video_limit_*`.** Propuesta: **retirar las columnas muertas** con una migración.
- **13. Módulos del ABM que faltan.** Propuesta: solo el **visor de `audit_log`** (solo lectura).

### Bloque D — Página de careers con n8n (punto 5)

**Actualización (16 oct, tarde):** el código ya está revisado y el plan detallado vive en `plan-talent-careers.md` (los pasos de abajo quedan como borrador previo). Planificado, sin ejecutar, a la espera de la fase 0 (datos de Supabase-talent y workflows de n8n). Pasos previstos originalmente:

1. Revisar la página y su backend `/admin` y confirmar qué parte puede ser un paquete (§4).
2. Resolver la llamada al webhook de n8n de forma compatible con la CSP.
3. Adaptar la compilación a un paquete `variety`: `index.html`, JS y CSS en `assets/` con rutas `./assets/...`, sin scripts inline, sin enrutado por ruta del navegador (la ruta pública es una sola, `/variety/{slug}/app`), `manifest.json` con `kind: "variety"` y `metadata`.
4. Prueba de extremo a extremo con la migración de la fase 5 aplicada.

### Bloque E — Cierre (en pausa)

Fase 6 del plan de `other`: documentación final, inventario de cookies y registro. No se empieza hasta terminar A, B, C y D, y depende de los textos del asesor (punto 3).

## 3. Resumen de la información dada sobre los puntos 10 y 13

**Punto 10.** De `feed_config` el motor lee solo `ratios` y `batch_size`. `mix_window`, `distance_window` (la regla de separación de 10 se eliminó el 14 oct) y `video_limit_desktop`/`video_limit_mobile` no se leen: el 2/1 de vídeos simultáneos está fijo en `videoPlaybackCoordinator.ts` según el ancho (< 640 px). Hay dos salidas: conectar los límites a la configuración (el cliente tendría que recibirla) o retirar las columnas muertas. Con la segunda, nadie cree que un valor de la base controla algo que no controla.

**Punto 13.** Hoy esas tablas solo se tocan por SQL:

- *Editor de `feed_config` con simulador:* cambia las proporciones sin SQL y simula el efecto. Solo `ratios` y `batch_size` tienen efecto real.
- *Acceso (`admin_allowed_domain`):* gestiona los dominios que pueden entrar al ABM. Hoy hay uno y casi nunca cambia.
- *Configuración:* no hay nada concreto que configurar hoy fuera de lo anterior.
- *Visor de `audit_log`:* lista de quién hizo qué y cuándo. Ya se escribe en todas las funciones de mutación; solo falta verlo. Es lo más barato (solo lectura) y lo único con valor diario.

## 4. Página con n8n: lo que condiciona el diseño

1. **Un paquete es estático.** Es HTML, JS, CSS y recursos servidos desde `/variety/{slug}/app`. No puede contener código de servidor.
2. **La CSP bloquea llamadas a otros orígenes** (`connect-src 'self'`). Una llamada directa desde el navegador al webhook de n8n no funcionaría. Opciones: (a) una **ruta del propio sitio** que reciba el envío y lo reenvíe a n8n (la URL del webhook queda en una variable de entorno del servidor, sin exponerse, y se pueden añadir límite de peticiones y honeypot); (b) permitir ese origen en la CSP, ampliando la política de los paquetes. La opción (a) es la recomendada.
3. **El backend de `/admin` no puede vivir dentro del paquete.** Además, `/admin` del sitio es el ABM y el paquete solo sirve `/variety/{slug}/app` y `/app/assets/...`: una ruta interna de la página sería `/variety/{slug}/app/admin`, que hoy daría 404. Hay que saber qué hace ese backend (quién lo usa, qué guarda, dónde) para decidir si se queda fuera (en n8n o en su propio alojamiento), se integra en el ABM de Greener o se descarta.
4. **Qué necesito ver:** el código de la página, la URL y el formato de la llamada al webhook, y una descripción del backend `/admin`.

## 5. Pendiente de Greener (lista para más tarde)

Cosas que aún no se pueden dar y que bloquean o condicionan lo anterior.

| Nº | Qué falta | De quién | Bloquea |
| --- | --- | --- | --- |
| 3 | Texto legal final del asesor para `/privacy` (cookies y newsletter). Después se sube `CONSENT_TEXT_VERSION`. | Asesor | Bloque E; publicar cualquier `other` |
| 6 | Política de privacidad de los formularios: mención de Mailchimp y plazo de retención de `contact_submission`. | Greener y asesor | Bloque E |
| 4 | Tabla de cookies de terceros medida con DevTools (YouTube, Spotify, Cloudinary). «Casi lista.» | Greener | Bloque E |
| 5 | Código de la página de careers, URL y formato del webhook de n8n, y descripción del backend `/admin`. | Greener | Bloque D |
| 10 | Decidir: retirar las columnas muertas de `feed_config` (propuesto) o conectarlas. | Greener | Bloque C |
| 13 | Decidir qué módulos del ABM entran (propuesto: solo visor de `audit_log`). | Greener | Bloque C |
| 17 | Confirmar que las licencias de Helvetica Neue y Kinder cubren web autoalojada y la conversión a WOFF2. | Greener | Antes de publicar |
| 18 | Plan alternativo a Cloudinary Free para no superar los 25 créditos; preguntar a soporte qué pasa si se superan. | Greener | Antes de abrir al público |
| 14 | Reserva de derechos de minería de texto y bloqueo de bots de entrenamiento. | Greener y asesor | Más adelante |
| 15 | Valor definitivo de `--detail-block-gap`. Lo cambia Greener y avisa. | Greener | Nada |
| 7 | Repetición de pines con catálogo corto: se revisa con contenido en masa. | Greener | Nada |
| 11 y 16 | Diseño móvil y masonry real: en pausa hasta que exista. | Diseño | Los puntos de móvil de PROGRESO quedan aparcados |

Tareas operativas de Greener, sin decisión de por medio:

- Aplicar la migración `20261016090000_other_abm.sql` (y `20261016100000_purge_feed_sessions_cron.sql` y `20261016110000_feed_config_drop_dead_columns.sql`, ya escritas), regenerar los tipos y subir un ZIP de prueba con `kind: "variety"`.
- Revisar cuáles de las migraciones de los días 7 y 8 de octubre marcadas como pendientes en PROGRESO siguen sin aplicarse (la lista puede estar desfasada).
- Configuración de producción: URL de Supabase Auth, cliente OAuth de Google y `.env` de producción.
- Las tres comprobaciones del proxy de Dinahosting y el `HOSTNAME` del proxy.
- Comprobar Plausible y la ventana de cookies ya desplegados.
- Carga real de contenido en el ABM.
- Apagar `tools.itsgreener.com` e `insight.itsgreener.com` tras publicar.
- Scripts de vídeo y Cloudinary: `warm-cloudinary` y `reconcile-cloudinary` (`fix-video-durations` se retiró el 19 oct, §2.82).
