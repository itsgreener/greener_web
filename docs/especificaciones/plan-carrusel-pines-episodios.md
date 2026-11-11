# Plan — carrusel de pines de episodio en la home

**Estado: aprobado por Greener el 11 de noviembre de 2026 («Adelante con tus recomendaciones», las cinco opciones por defecto de §7 quedan confirmadas) e implementado el mismo día (§2.150 de `historial-fase-5.md`). Se conserva hasta que lo vigente se pase a la especificación; queda pendiente que Greener ejecute la migración `20261111110000` (PROGRESO §4.1).** Petición de Greener: desde el ABM, al cargar pines de un episodio, una casilla «formar un carrusel con los pines»; con ella marcada, todos los pines del episodio salen en el feed como **una sola tarjeta con diapositivas** (carrusel), intercalada en el masonry como cualquier otro pin, con avance automático por temporizador y deslizamiento (swipe), sin puntos indicadores en esta primera fase.

Cuando se implemente, lo vigente se resume en `especificacion-final-formato-detalle.md` (§1, §4) y este plan pasa a historial.

---

## 1. Qué hay hoy (código frente a documentación)

| Pieza | Estado real | Coincide con la documentación |
| --- | --- | --- |
| Pin | **Un pin = un medio.** `show_as_carousel` y `speed_ms` se eliminaron el 7 oct (migración `20261007120000`, §2.41): índice único en `pin_media(pin_id)`, trigger de 8 pines como máximo por contenido. La nota de aquella decisión dice que, si hiciera falta, «se diseñará a nivel de contenido, no de pin» | Sí. **El PDF de arquitectura V1.3 está desfasado** (sigue listando `pin.type = carousel`, `speed_ms` y hasta 8 medios por pin) |
| Unidad del feed | `unitId = pin.id`. `getFeedDataset` crea un `ContentPinQueue` por contenido con los ids de sus pines ordenados por `queue_order`; la ronda se guarda como `uuid[]` de unidades en `feed_round` | Sí (§2.41, §8.5) |
| Reparto de episodios | `circularFillPool` da a cada contenido **un hueco por pasada** (cuota del tipo `channel`, ≈ 5,9 % de la ronda) y rota sus pines entre pasadas: un episodio de 8 pines ocupa hasta 8 apariciones distintas en el tiempo | Sí (anexo del plan de `other`) |
| Directorio del feed | `PinDirectoryEntry` y `FeedPinItem` ya llevan `media` como **lista** (hoy siempre de 1). `alt` y `autoplayMode` son del pin, no del medio | Sí; el comentario «siempre 1 elemento» está en el código |
| Rondas guardadas | `getPinDirectoryByIds` enriquece los ids de una ronda ya guardada leyendo cada pin con su contenido. Una unidad que ya no está publicada se omite con un aviso (no tumba el lote) | Sí |
| `PinCard` | Una tarjeta = un medio (`media[0]`); sus hooks (hueco global de vídeo, prefetch, intención de hover) están atados a ese medio. `PinCardData.media` es lista «por compatibilidad» | Sí (§2.41) |
| Masonry | Tarjetas de una columna; el alto sale de `ratio` + rótulo estimado. No cambia si la tarjeta tiene varias diapositivas del mismo ratio | Sí |
| Carrusel de la ficha de caso | **Ha cambiado desde la última revisión (§2.148, 10 nov):** `CaseCarousel` con puntos (ventana de 7) y paso de una diapositiva por gesto (`scroll-snap-stop: always` + `useSlidePaging`, que mueve una por gesto de rueda horizontal). Sigue sin autoplay y es solo de la ficha de caso | Sí (PROGRESO §2.148) |
| ABM de pines | `BulkPinUpload` (carga masiva secuencial, un pin por archivo, ratio por fila desde CSV, nombre de archivo o valor por defecto) y `PinList` (cada pin puede cambiar su ratio). Un `queue_order` automático por contenido en `create_pin` | Sí |
| Ratio frente al medio real | Ni el ABM ni el servidor comprueban que el medio coincida con el ratio declarado: solo hay un aviso no bloqueante («se recortará») y el medio se pinta con `object-fit: cover` | Sí |
| Migraciones | 60 en `supabase/migrations`; siguen **pendientes de ejecutar por Greener** las de §2.118, §2.143 y §2.146 (la última, la del carrusel de caso) | Sí (PROGRESO §4.1) |

**Hallazgos que condicionan el diseño**

1. **El motor del feed no necesita cambios de fondo.** Ya trabaja con «unidades» (ids de pin). Si un episodio con carrusel aporta **una sola unidad**, `circularFillPool` le da un hueco por pasada, como hoy; la cuota del 5,9 % y la frecuencia con la que sale cada episodio no cambian. Lo que cambia es que cada aparición lleva todas sus diapositivas en vez de un pin suelto.
2. **El punto delicado es el directorio, no el motor.** Hay dos caminos que construyen la ficha de una unidad: `getFeedDataset` (ronda nueva) y `getPinDirectoryByIds` (ronda ya guardada). Los dos tienen que producir **lo mismo**, así que la construcción del carrusel va en una única función compartida. En el segundo camino cada pin se lee por su cuenta con su contenido; hay que añadir una lectura de los pines hermanos cuando el contenido tenga el carrusel activado.
3. **El id de la unidad sigue siendo un `pin.id`** (la ronda guardada es `uuid[]` y no se toca el esquema): se usa el del **primer pin** (por `queue_order` y, si empata, `created_at`). Consecuencia asumida: en una ronda guardada antes de activar el carrusel, los ids de los demás pines del episodio dejan de ser unidades válidas y se omiten con el aviso de siempre; si se borra el primer pin, la cabecera pasa a ser otro y las sesiones abiertas dejan de mostrar ese episodio hasta la ronda siguiente. Es el mismo comportamiento que hoy tiene borrar un pin con una sesión abierta.
4. **Un solo ratio por tarjeta** (petición de Greener: cualquiera de los siete, pero común a todas las diapositivas). Hoy cada pin tiene su ratio y `EditPinForm` lo deja cambiar pin a pin, así que la regla tiene que vivir en la base de datos (la barrera autoritativa, como los límites de vídeo) y reflejarse en el ABM.
5. **El alt es del pin.** Cada diapositiva necesita el suyo (accesibilidad): `FeedItemMedia` gana `alt` y `autoplayMode` opcionales por diapositiva; los campos de la entrada se mantienen como los de la primera, para no romper nada.
6. **Texto y destino son del episodio**, no de cada pin: título, «programa + tipo», CTA «Watch» y destino `/work/{slug}` son iguales en todas las diapositivas.
7. **El vídeo es lo costoso de reutilizar.** `PinCard` registra un hueco global de reproducción (2 en escritorio / 1 en móvil) y un prefetch por tarjeta. En un carrusel solo la **diapositiva activa** puede pedir hueco y prefetch; el resto, no. Los vídeos de pin son mudos, en bucle y de 8 s como máximo (`PIN_ANIMATION_LIMITS`).
8. **El temporizador es una decisión nueva.** El 7 oct se retiraron los temporizadores del carrusel de pines; ahora Greener los pide. Hay que acotarlos para que no sean ruido ni gasto (§3, D7).
9. **`feedStorage` guarda los ítems en `sessionStorage`.** Los campos nuevos son opcionales, de modo que un estado guardado con la forma antigua se sigue leyendo.
10. **Se reutiliza poco del carrusel de caso.** `useSlidePaging` (activa por `scrollLeft`, `goTo`, paso de una por gesto) sirve tal cual con una pequeña ampliación; los puntos y su CSS no se llevan (decisión de Greener: nada de puntos en esta fase).

## 2. Qué se ha decidido (Greener, 11 nov)

| # | Decisión |
| --- | --- |
| G1 | En el ABM, en la sección de pines (carga de pines nuevos), una **casilla «formar un carrusel con los pines»**. Al subirlos se forma internamente el carrusel con los medios **en el orden en que venían**, parecido al de los casos |
| G2 | **Controles en la home:** sin indicadores visuales (puntos) en esta primera fase; **temporizador automático** y **swipe** para moverse |
| G3 | Con la casilla marcada hay **un solo pin por episodio** en el feed: todos los pines se funden en el carrusel |
| G4 | **Ratio libre** (cualquiera de los siete), con la única condición de que **todas las diapositivas compartan el mismo** |
| G5 | **Intercalado en el masonry** como cualquier otro pin (no hay franja aparte) |

## 3. Decisiones de diseño

| # | Decisión | Por qué |
| --- | --- | --- |
| D1 | **La bandera es del contenido:** columna `content.pins_as_carousel boolean not null default false`, que solo puede activarse en un `episode`. Con ella activa, **todos** los pines del episodio (los nuevos y los que ya tuviera) forman el carrusel, en el orden de `queue_order` | Es lo que dice G3 («solo un pin por episodio»). Va en `content` y no en `episode` porque la fila de `episode` no existe hasta guardar los datos del episodio, y el flujo pedido es subir pines primero. La sustitución del interruptor «por programa» que propuse en la conversación anterior queda descartada |
| D2 | **La casilla de la carga masiva** (solo si el contenido es un episodio) activa la bandera **antes de subir el primer archivo** y de ahí en adelante todo pin nuevo entra en el carrusel. Si la bandera no puede activarse (ratios mezclados en pines previos), no se sube nada y se explica por qué | La base de datos comprueba el ratio en cada pin que entra; si la bandera se activara al final, un fallo a mitad de lote dejaría pines sueltos con ratios incoherentes |
| D3 | **Una casilla persistente en la lista de pines** («Este episodio muestra sus pines como carrusel», con guardar) para **desactivar** o reactivar sin borrar pines | Sin ella, la única forma de volver a pines sueltos sería borrarlos |
| D4 | **Ratio del carrusel:** con la casilla marcada, la tabla del lote pierde la columna «Ratio» y hay **un selector único «Ratio del carrusel»**; el ratio del CSV o del nombre de archivo se ignora con un aviso si discrepa. Si el episodio ya tiene pines, el selector queda fijado a su ratio. Con la bandera activa, el selector de ratio de `EditPinForm` se deshabilita con una nota («para cambiar el ratio, desactiva el carrusel, cámbialo en todos y vuelve a activarlo») | G4 más la barrera de D1; el aviso «se recortará» existente sigue valiendo para medios que no encajen |
| D5 | **Orden:** el de la tabla del lote (nombre de archivo en orden natural, `slide-2` antes que `slide-10`, con una columna «#»), igual que en el carrusel de caso (§2.145). Se sube en secuencia, así que `queue_order` (siguiente libre) coincide con el orden mostrado. Un reintento tras un fallo entra al final | «El orden en el que venían» sin depender del sistema operativo. **Sin reordenar después en esta fase** (ver §6) |
| D6 | **Límite:** 8 diapositivas (el tope de pines por contenido, ya impuesto por la base de datos). Con 1 pin servible, la tarjeta es un pin normal, sin carrusel ni temporizador | No hace falta ningún límite nuevo |
| D7 | **Temporizador** (constantes en `modules/feed/domain/carouselTiming.ts`, un solo sitio para ajustarlas): **4 s** por imagen; una diapositiva de vídeo espera lo que dure el vídeo si es más largo (máximo 8 s). Solo corre con la tarjeta **visible al 50 %**, se detiene con **hover o foco** y con la pestaña oculta, y **se reinicia** tras cualquier movimiento del visitante. Con `prefers-reduced-motion`, `save-data` o conexión lenta (`feedAutoplayAllowed` falso) **no hay avance automático**: queda el swipe. Cada tarjeta arranca con un desfase repartido (a partir de su clave) para que no cambien todas a la vez. Al llegar a la última, vuelve a la primera **sin animación** | Es lo que acota el temporizador del §1.8. Con 5,9 % de episodios, en pantalla habrá normalmente uno o dos carruseles a la vez, así que no hace falta un tope global |
| D8 | **Swipe:** scroll nativo con `scroll-snap` y paso de una diapositiva por gesto, reutilizando `useSlidePaging` (táctil, trackpad y rueda horizontal). **Sin arrastre con ratón** en esta fase (ver §7, punto 4) | Es lo que ya funciona en el carrusel de caso; el arrastre con ratón dentro de un enlace exige gestionar el clic y el arrastre de imágenes |
| D9 | **Vídeo en el carrusel:** solo la diapositiva activa pide hueco global y prefetch (modo `viewport`) o reproduce por intención de hover (modo `hover`); el resto no. Imágenes: solo la activa y la siguiente se cargan de inmediato, las demás en diferido | Cuida el plan Free de Cloudinary y el límite de vídeos simultáneos |
| D10 | **Dónde se ve:** en todos los masonry (home, `/channel` y recomendaciones de las fichas), porque la unidad es la misma. Interludios y cuota no se tocan | G5; la alternativa (solo en la home) exigiría otra rama en la construcción de la ronda |
| D11 | **Analítica:** `Pin Click` no cambia de forma; `pinType` sale de la diapositiva activa en el momento del clic. Sin eventos nuevos | Mínimo; se puede añadir el índice de diapositiva si Greener lo quiere |
| D12 | **Alcance:** solo episodios (la casilla solo aparece en ellos y la función SQL rechaza otro tipo). El feed y la tarjeta son genéricos por contenido: llevarlo a otro tipo es abrir esa restricción | La petición es para episodios |

## 4. Cambios por capas

**Base de datos** (`supabase/migrations/20261111110000_content_pins_as_carousel.sql`; a ejecutar por Greener, 62 migraciones en total)

1. `alter table content add column pins_as_carousel boolean not null default false`.
2. `set_content_pins_carousel(p_content_id uuid, p_enabled boolean) → boolean`: `security invoker`, `is_admin()`, `audit_log`; el contenido debe ser un episodio (como `upsert_episode`; en la implementación se usa `ZG007`, que ya existía para «no es un episodio» y el ABM ya traduce); al **activar**, todos sus pines deben compartir ratio (si no, `ZG019`).
3. Trigger `before insert or update of ratio` en `pin`: con la bandera activa en su contenido, un pin con ratio distinto al de los demás se rechaza con `ZG019` (nuevo código, «los pines del carrusel comparten ratio»).
4. `src/lib/supabase/postgresErrors.ts` (ZG019 → `carousel_ratio_mismatch`), `DOMAIN_ERROR_KINDS` (`modules/shared/domain/domainError.ts`) y `adminErrorMessage.ts` (la frase para el ABM); `database.types.ts` a mano, como en §2.143 y §2.146 (`npm run db:types` lo dejará igual).

**Dominio, aplicación y servidor**

1. `modules/content/`: esquema `setContentPinsCarouselSchema`, método del repositorio (una RPC), caso de uso `setEpisodePinsCarousel` y cableado en `container.ts`.
2. `app/admin/(panel)/contents/[id]/edit/episodeActions.ts` (o `pinActions.ts`): `setPinsCarouselAction` (mismo esquema que las demás: `isAdminRequest` → zod → caso de uso → mensaje por `adminErrorMessage`; invalida la caché del feed y revalida).
3. `loadEditorData.ts` y `page.tsx`: pasan al editor `pinsAsCarousel` y el ratio común de los pines existentes.

**Feed (servidor)**

1. `modules/feed/domain/feedReadModels.ts`: `FeedItemMedia` gana `alt?` y `autoplayMode?`; se actualiza el comentario de «siempre 1 elemento».
2. `modules/feed/infrastructure/supabaseFeedSource.ts`: **función compartida `buildFeedUnitsForContent`** (con la bandera, una unidad con las diapositivas de todos los pines con medio listo, por `queue_order`; sin ella, una por pin como hoy). La usan `getFeedDataset` (selecciona `pins_as_carousel`) y `getPinDirectoryByIds` (lee los pines hermanos de los contenidos con la bandera; un id que no es la cabecera no genera unidad).
3. `modules/feed/domain/feedItemPresentation.ts`: pasa los medios con su alt tal cual; el destino y el CTA no cambian.
4. `generateRound`, `circularFillPool`, interludios y cursor: **sin cambios**; se comprueba con las propiedades existentes.

**ABM (cliente)**

1. `BulkPinUpload` y `useBulkPinUpload`: casilla (solo en episodios), selector único de ratio, columna «#», orden natural por nombre, llamada previa a la acción de la bandera, avisos de D2 y D4. Un `rows.ts` ajustado (el ratio de cada fila pasa a ser el del carrusel).
2. `PinList` y `EditPinForm`: casilla persistente (D3), resumen «N pines forman un carrusel» y ratio deshabilitado con la bandera activa.

**Tarjeta del feed (cliente)**

1. `components/pin/PinCard/`: se extrae la lógica de reproducción (hueco global, prefetch, intención de hover) a un hook reutilizable por diapositiva; `PinCard` decide entre la tarjeta actual (1 medio) y `PinCarouselCard` (más de uno). El rótulo, el CTA y el enlace son los mismos.
2. `PinCarouselCard.tsx`, `PinCarouselCard.module.css` (pista con `scroll-snap`, `overscroll-behavior-x: contain`, mismo `--ratio` en todas las diapositivas, `cover`), `useCarouselAutoplay.ts` (D7) y una ampliación mínima de `useSlidePaging` (`goTo` con salto sin animación para volver a la primera).
3. `PinCardMedia` recibe el alt de la diapositiva; `Pin Click` lee el tipo de la activa.

**Tests**

- **Dominio y servidor:** `buildFeedUnitsForContent` (con y sin bandera, pines sin medio, un solo pin servible, cabecera y hermanos); `getPinDirectoryByIds` (cabecera, no cabecera, ronda guardada antes de activar); propiedad de que una ronda con unidades de carrusel mantiene cuotas y determinismo; esquema, caso de uso, acción y argumentos de la RPC; mapeo de `ZG019`.
- **Migración:** texto de la función y del trigger (permisos, auditoría, códigos) **y ejecución real del SQL en PGlite** con un esquema mínimo: activar con ratios mezclados falla, insertar un pin con otro ratio falla, otro tipo de contenido falla.
- **ABM:** la casilla solo en episodios, selector único de ratio, la bandera se activa antes de subir, ratios mezclados bloquean sin subir nada, orden de las llamadas, casilla persistente.
- **Tarjeta:** avance a los 4 s con temporizadores simulados, vídeo largo, pausa con hover y foco, sin avance con `reducedMotion` / `saveData`, solo con la tarjeta visible (`IntersectionObserver` simulado), reinicio tras un swipe, vuelta a la primera, con 1 diapositiva no hay temporizador, solo la activa pide hueco de vídeo, y los tests existentes de `PinCard` siguen en verde sin editarlos.

**Documentación:** este plan, `especificacion-final-formato-detalle.md` (§1 y §4: un episodio puede salir en el feed como carrusel), `PROGRESO.md` (fila §2.150, migración pendiente en §4.1, comprobación a mano en §4.2, registro §6, cifras), `historial-fase-5.md`, `docs/README.md`, `supabase/README.md` y `docs/operaciones/e2e.md` (61 migraciones) y `estructura-src.txt`.

## 5. Orden de ejecución y verificación

| Fase | Contenido | Se comprueba |
| --- | --- | --- |
| 0 | Línea base: suite completa, `tsc`, ESLint y Prettier en verde antes de tocar nada (345 ficheros / 4275 tests el 10 nov) | Resultado anotado |
| 1 | Migración y comprobación real del SQL en PGlite; tipos a mano; `ZG019` | Script de la sesión (no se entrega) y tests de texto |
| 2 | Feed servidor: modelos, `buildFeedUnitsForContent`, directorio por ids | Vitest del ámbito y propiedades del motor sin cambios |
| 3 | ABM: caso de uso, acción, casilla de la carga, lista de pines | Tests de componente con acciones y Cloudinary simulados |
| 4 | Tarjeta: extracción del hook de reproducción (los tests actuales no se editan), `PinCarouselCard`, temporizador | Vitest con temporizadores simulados; medición en Chromium con ratios 16:9, 1:1 y 9:16 en 2, 3, 4 y 6 columnas |
| 5 | Documentación | Revisión cruzada de referencias |
| 6 | `npm test` completo, `npm run typecheck`, ESLint, Prettier con la configuración del proyecto y `next build` con las variables de relleno del CI; zip del proyecto completo | Resumen en el historial |

Tamaño estimado: **M** (una migración, unos 8 ficheros modificados y 6 nuevos). La fase 4 es la de más riesgo por la extracción del hook de vídeo.

## 6. Fuera de alcance y riesgos

- **Hay que ejecutar la migración en Supabase antes de usar la casilla.** Sin ella la casilla falla con el mensaje genérico y el resto del ABM sigue igual. Se suma a las tres migraciones que ya esperan a Greener.
- **No se puede verificar aquí** el comportamiento con Cloudinary ni con Supabase reales. El SQL se ejecuta en un Postgres de prueba y la tarjeta se prueba con `IntersectionObserver`, vídeo y temporizadores simulados; queda una comprobación a mano en el navegador y en un móvil real (el gesto vertical sobre la tarjeta tiene que seguir moviendo la página).
- **Reordenar las diapositivas después de subirlas** queda fuera: en esta fase el orden es el de subida y, para cambiarlo, hay que borrar y volver a subir. Una fase posterior podría reutilizar `moveCarouselItem` y el borrador de orden del carrusel de caso, con una función SQL propia sobre `queue_order`.
- **Accesibilidad (WCAG 2.2.2, pausar, detener u ocultar):** un contenido que se mueve solo durante más de 5 s junto a otros contenidos necesita una forma de pararlo. El plan la cubre con pausa en hover y foco, con la desactivación por `prefers-reduced-motion` y `save-data`, y con el swipe; **en táctil no hay pausa explícita**. La mitigación posible (parar tras una vuelta completa) está en §7, punto 3.
- **Consumo de Cloudinary Free:** con el temporizador, un carrusel visible acaba descargando todas sus diapositivas (hasta 8 imágenes de perfil feed). Se mitiga cargando en diferido y solo la activa y la siguiente (D9); en vídeo, solo la activa.
- **La tarjeta es un enlace:** sin flechas ni puntos no hay controles dentro, así que no hay interactivos anidados. Si más adelante se añaden, hay que replantear la estructura del enlace.
- **Virtualización:** una tarjeta fuera de pantalla se desmonta y su carrusel vuelve a la primera diapositiva al regresar.
- **Sesiones abiertas** durante el despliegue o al activar la bandera: conservan su ronda; las unidades que ya no existen se omiten con el aviso habitual (§1.3).
- **No se toca** el carrusel de la ficha de caso, el tope de 8 pines, los límites de vídeo ni el calendario de interludios.

## 7. Puntos por confirmar con Greener

**Resuelto el 11 de noviembre: Greener aprobó las cinco opciones por defecto.** Cada uno lleva la opción que se aplicó.

1. **Qué forma el carrusel con pines que ya existen.** Por defecto: **todos los pines del episodio**, nuevos y anteriores (D1). La alternativa, que solo los del lote formen el carrusel y el resto sigan sueltos, rompe «un solo pin por episodio» y obliga a una tabla de grupos.
2. **Tiempos.** Por defecto: 4 s por imagen y, en vídeo, lo que dure (máximo 8 s). Se ajustan en una constante.
3. **Bucle o una vuelta.** Por defecto: **bucle continuo** mientras la tarjeta esté visible. Si se prefiere cumplir 2.2.2 sin mecanismo de pausa, el avance puede parar tras una vuelta completa.
4. **Swipe con ratón en escritorio.** Por defecto: **no** (táctil, trackpad y rueda horizontal sí). El arrastre con ratón se puede añadir después, con su tratamiento del clic.
5. **Dónde se ve.** Por defecto: en la home, en `/channel` y en las recomendaciones de las fichas, porque la unidad es la misma (D10). Si en las recomendaciones debe verse solo la primera diapositiva, es una rama pequeña adicional.
