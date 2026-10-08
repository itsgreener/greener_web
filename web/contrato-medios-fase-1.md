# Contrato de medios (entrega y subida) y plan de la fase 1 de rendimiento

> **Documento de traspaso para Claude.** Escrito el 6 de octubre de 2026, al final de una conversación larga con Greener, para que una conversación nueva pueda retomar el trabajo sin perder nada. Si lees esto en una sesión nueva: léelo entero antes de tocar código. No hace falta releer los historiales salvo para el porqué de algo concreto (se citan sus `§2.N`). El detalle cronológico de lo discutido está en `historial-fase-5.md` §2.37; este documento es la versión operativa.

## 0. Resumen en un minuto

1. **Problema.** Los vídeos cortos de las tools (§2.36 del historial) se reproducen en los pines de la home y en la ficha, pero tardan en cargarse y al entrar en pantalla van a tirones durante unos segundos.
2. **Restricción.** Cloudinary **Free (25 créditos)**. Greener ha descartado pasar a Plus (225 créditos, unos 89-99 $/mes) y no existe un plan de «pago por uso» razonable (§2). Hay que **gastar poco**: el gasto que escala son el ancho de banda, las versiones únicas de cada asset y, en vídeo, los segundos procesados.
3. **Decisión.** Fijar **una sola vez** un contrato de entrega de medios (§4) y aplicar la **fase 1** (§7): URLs con tamaño acotado, dos fuentes de vídeo explícitas, pósters con escalera de anchos, prefetch y cambio póster→vídeo sin tirones. Después, en la **fase 2** (§9), calentar las versiones al publicar.
4. **Estado (actualizado el 7 oct).** **La fase 1 está IMPLEMENTADA** (ver `historial-fase-5.md` §2.38): pasos 2 y 4-12 de §7 hechos, 1155 tests en verde. **Pendiente:** prueba A/B (paso 3), comprobar las cadenas contra Cloudinary real y medir `droppedVideoFrames` en hardware real (el criterio ≤ 2 de §7.1 no se cumplió en el Chromium del entorno). Lo que sigue describe el estado ANTERIOR: **La fase 1 NO está empezada.** No hay cambios de código de esta conversación pendientes de integrar: el repositorio es el último zip entregado el 6 oct (107 ficheros de test, 1042 tests en verde, ver `PROGRESO.md` §1). Lo único nuevo son documentos.
5. **Plan inmediato.** Hoy (6 oct, tarde): Greener y Claude convierten imágenes y vídeos de tools según el contrato de subida (§5, proceso en §10). Mañana (7 oct): se aplica la fase 1 (§7).
6. **Fase 2 planificada (7 oct).** Decisiones y diseño completos en §9; **sin implementar**. Empieza por el paso 0 de §9.9 (pruebas contra Cloudinary real). Detalle en `historial-fase-5.md` §2.51.

## 1. Reglas de trabajo con este repositorio (aprendidas en esta conversación)

1. **Greener entrega el repo como zip**, a veces con ajustes de diseño hechos a mano («actualiza tu copia»). Antes de sobrescribir nada, compara el zip nuevo con tu copia y **conserva sus cambios**. Si te los describe sin subir ficheros, aplícalos tal como los describe y avísale de que no los has cotejado.
2. **Devuelve el proyecto completo en un zip** cuando hagas cambios, salvo que pida otra cosa (excepciones puntuales: «solo `src`», «solo `tests`»). Excluye `node_modules`, `.next`, `supabase/.temp`, `.DS_Store`, `next-env.d.ts` y `*.tsbuildinfo`.
3. **Finales de línea CRLF.** El repo viene en CRLF. Respétalos al editar (leer normalizando a LF y reescribir en CRLF) y formatea con `prettier --end-of-line crlf`. Un `prettier --write` sin esa opción convierte el fichero a LF.
4. **Verificación estándar** (todo debe quedar en verde): `npx eslint src tests scripts`, `npx tsc --noEmit` (ignora el falso positivo `LayoutProps`), `npx prettier --check --end-of-line crlf src tests scripts`, `npx vitest run`. La batería completa tarda ~150 s y cada comando tiene un límite de 300 s: lanza `timeout 250 npx vitest run`. El Node del entorno es 22 y el proyecto fija 24.15 (`.nvmrc`).
5. **Documentación.** Trabajo nuevo = sección `§2.N` correlativa en `historial-fase-5.md` + una fila en el índice de `PROGRESO.md` §2 + checklist §4 + registro §6. No dejes un documento desactualizado: corrígelo en el mismo cambio.
6. **Trampas de la shell.** Nunca uses `pkill -f vitest` (mata tu propia shell porque su línea de comandos contiene «vitest»). Decodifica con Python la salida de vitest si da error de UTF-8 (lleva caracteres de control). Un proceso lanzado con `nohup` en un comando no sobrevive al siguiente: ejecuta en primer plano con `timeout`.
7. **El entorno no llega a Cloudinary ni a Supabase.** Solo permite npm, PyPI, GitHub y repositorios de Ubuntu. Lo que dependa de Cloudinary real (cadenas de URL aceptadas, tiempos de la primera petición, calidad visual) **solo lo puede comprobar Greener**; dilo siempre así. Sí hay un Chromium real disponible (Anexo B) y `ffmpeg` (Anexo A).
8. **Tests de regresión que fallan sin el arreglo.** Es una práctica de este proyecto: tras escribir un test de regresión, deshaz el arreglo a propósito y comprueba que el test falla; restaura después.

## 2. Datos de partida: el presupuesto de Cloudinary Free

### 2.1 Uso real a 6 de octubre de 2026 (panel de Greener)

| Dato                                  | Valor                                     |
| ------------------------------------- | ----------------------------------------- |
| Créditos usados (últimos 30 días)     | **4,76 / 25** (19,04 %)                   |
| Últimos 7 días: impresiones de imagen | 3,71 K                                    |
| Últimos 7 días: imágenes y vídeos     | 1,44 K                                    |
| Últimos 7 días: transformaciones      | **3,2 K**                                 |
| Últimos 7 días: ancho de banda        | 341,81 MB                                 |
| Almacenamiento                        | **1,28 GB**                               |
| Assets almacenados                    | unos 400                                  |
| Quién ha probado la web               | solo internos; no está abierta al público |

Reparto aproximado en créditos (1 crédito = 1000 transformaciones = 1 GB de almacenamiento = 1 GB de ancho de banda): transformaciones ≈ 3,2 (67 %), almacenamiento ≈ 1,28 (27 %), ancho de banda ≈ 0,33 (7 %). La suma (4,81) casa con los 4,76 del panel. Son unas **8 transformaciones por asset**, y no dependen de las visitas: cada URL distinta se cuenta una sola vez. Por término medio, **92 KB por impresión de imagen**.

### 2.2 Reglas de consumo (documentación de Cloudinary, comprobadas el 6 oct 2026)

1. Las transformaciones de **imagen** cuentan como una cada una. Las de **vídeo** se cuentan **por segundo procesado**, con una tarifa que depende de la resolución; la página de comparación de planes da la equivalencia de **1 crédito = 500 s de vídeo SD o 250 s de HD**. No he encontrado dónde cae el corte entre SD y HD.
2. Cada transformación **única** se cuenta una sola vez, la vean cuantas veces la vean. Las transformaciones «eager» (generadas al subir) consumen créditos en el momento en que se genera cada derivada.
3. El **almacenamiento** incluye el original, **una copia de cada derivada** generada y las copias de seguridad. Por eso cambiar el texto de una URL no solo regenera las versiones (transformaciones): deja las antiguas ocupando almacenamiento.
4. Con `f_auto` se crea una derivada **por cada formato servido**. Y `f_auto` **no tiene efecto dentro de una transformación eager** (no hay navegador al subir): para calentar versiones hay que pedir cada formato y códec por separado (§9).
5. En Free, transformaciones y ancho de banda se miden en una **ventana móvil de 30 días**, sin reinicio el día 1: un pico pesa durante un mes.
6. En Free el **tamaño máximo de un vídeo para transformarlo es de 40 MB** (la tabla de planes da 300 MB a los de pago). **Matiz verificado el 7 oct (§9.8):** ese límite es para las transformaciones **síncronas**; con **eager asíncrono** se pueden transformar vídeos mayores, hasta el máximo de la cuenta (no es la documentación oficial, sino una respuesta de personal de Cloudinary en su comunidad). Nuestro tope de subida de vídeo es de 100 MB: ver §5.4 y §9.8.
7. En vídeo, 1 crédito de ancho de banda equivale a 1 GB en Free (2 GB en los planes de pago).

### 2.3 Planes y «pago por uso» (comprobado el 6 oct 2026)

1. **El único plan con cargo por exceso es Pro PAYG:** 1.099 $/mes (989 $ con facturación anual), 2.750 créditos incluidos y 0,45 $ por crédito extra. Es una cuota fija con un cupo incluido, no un pago por uso. Descartado.
2. **Plus:** 225 créditos, 89 $/mes con facturación anual o 99 $/mes mensual (precio dado por comparadores de terceros; la página oficial comprobada lista los créditos pero no recogí el precio de Plus). Free, Plus y Advanced **no tienen cargo por exceso**.
3. **Qué pasa al pasarse de 25 créditos en Free: no está verificado oficialmente.** Tres fuentes de terceros dicen que la cuenta se suspende y los assets dejan de servirse; la única respuesta oficial que encontré (un hilo antiguo de soporte) solo habla de un correo de aviso y de que se te pedirá regularizar el uso o cambiar de plan. **Trata la suspensión como el peor caso** y pide a soporte de Cloudinary la respuesta oficial.
4. Los complementos no consumen créditos del plan base y los niveles de pago de complementos exigen un plan de pago: no son una vía para ampliar Free.

### 2.4 Decisión de Greener

**Seguir en Free** y reducir al mínimo, sin perder calidad, el peso de los assets (también desde su lado: §5). Revisar el uso tras el lanzamiento. Antes de abrir al público conviene: contrato aplicado, versiones calentadas (fase 2), correo de avisos de Cloudinary monitorizado y respuesta de soporte sobre el exceso.

### 2.5 Capacidad aproximada (supuestos explícitos)

Con 92 KB por impresión, 1 crédito de ancho de banda son ~11.000 impresiones de imagen. Si cada visita carga ~40 imágenes (supuesto), caben unas **5.000 visitas al mes** antes de agotar los ~20 créditos que quedan, contando solo ancho de banda. Los vídeos lo moverán. Es un orden de magnitud, no una garantía.

## 3. Diagnóstico: por qué los vídeos «tardan y van a tirones»

Hay tres causas, en este orden probable. **No se ha medido contra Cloudinary** (el entorno no llega); el orden sale del código y de la documentación.

1. **El feed descarga el vídeo a tamaño original.** `PinCard` usa `buildVideoFullUrl` (`q_auto,f_auto` sin ancho). Una grabación de pantalla de 1080p o más se baja entera para pintarla en una tarjeta de ~250 px.
2. **La descarga empieza tarde.** El `<video>` solo se monta cuando la tarjeta consigue su hueco de reproducción (`isPlaying` en `PinCard/index.tsx`), es decir, al entrar en pantalla. Arranca sin buffer y va a tirones hasta que se llena.
3. **La primera petición de cada versión se genera al vuelo.** Cloudinary transforma el vídeo cuando se pide por primera vez; el primer usuario nota un retraso y, según un artículo de Cloudinary, **mientras se genera la versión los demás usuarios pueden recibir vídeos rotos**. Hoy el primer visitante de cada versión siempre es Greener (el que sube y prueba). **Es un riesgo de lanzamiento** (§9).

Cómo saber cuál domina (lo hace Greener): DevTools → Network → filtro Media, recargar y mirar el vídeo de un pin. **Si el tiempo hasta el primer byte cae mucho en la segunda carga**, el cuello es la generación al vuelo (fase 2). **Si es siempre bajo pero el peso es grande**, basta la fase 1.

### 3.1 Hallazgos de código que entran en la fase 1

1. `buildVideoPosterUrl` sirve **un único JPG de 960 px** (último ancho de `IMAGE_DELIVERY.feed.widths`) a todas las tarjetas del feed y también como póster de la ficha: más de 10 veces los píxeles necesarios.
2. El `src` de las imágenes del feed usa el **ancho exacto de la tarjeta** (`buildImageUrl(id, 'feed', Math.round(style.width))`). Con `srcset` el navegador no lo pide, pero cualquier cliente que lo ignore crearía versiones únicas sueltas (`w_189`, `w_217`…).
3. Las miniaturas del ABM piden `feed, 200` y `feed, 300` (`CaseCarouselManager`, `CoverMediaUpload`, `PinMediaManager`): versiones que no comparte ninguna otra pieza.
4. El vídeo del feed y el de la ficha usan `f_auto`: hasta 3-4 derivadas por vídeo según los formatos que pidan los navegadores. Hoy la ficha de tool sirve hasta 1920 px de ancho (escalera 960/1440/1920 con DPR 2).
5. Los **vídeos del carrusel de caso** y la portada de vídeo de contenido libre (`other`) usan `buildVideoFullUrl` sin tope (hasta 180 s y 100 MB).
6. No hay `preconnect` a Cloudinary. Impacto bajo: las imágenes ya calientan la conexión. No es prioridad.

## 4. Contrato de entrega (decidido el 6 oct 2026, a implementar en la fase 1)

### 4.1 Principios

1. **Se fija una sola vez, antes de la carga real de contenido.** Cambiar el texto de una URL regenera versiones (transformaciones) y deja las antiguas ocupando almacenamiento. Un test con las **cadenas exactas** debe proteger el contrato.
2. **Pocas versiones por asset.** Cada escalón extra se paga. Una rendición de vídeo extra (un tamaño × un formato) cuesta, para los ~45 clips de ~7 s, **~0,6-1,3 créditos una sola vez**, y solo si alguien la pide.
3. **El tamaño se acota siempre** (nunca el original) y **el formato se fija explícito** en vídeo (§4.5).
4. **Una sola fuente de verdad** para las cadenas: las mismas funciones construyen la URL de entrega y, en la fase 2, las cadenas del eager. Así no pueden desajustarse.

### 4.2 Tabla del contrato

| Pieza                                                    | Hoy                                                                                | Contrato                                                                                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Imagen del feed                                          | `srcset` 320/480/640/960, `q_auto,f_auto`; `src` con el ancho exacto de la tarjeta | escalera **320/480/640** (tope 640); `src` = un escalón de la escalera; calidad `q_auto` o `q_auto:eco` según la prueba A/B (§12)              |
| Póster de vídeo (feed)                                   | un JPG de 960                                                                      | `srcset` **320/480/640**, JPG, `q_auto`                                                                                                        |
| Vídeo del feed (pines de tool)                           | original sin ancho, `q_auto,f_auto`                                                | **un solo ancho: 480**, dos fuentes explícitas WebM/VP9 + MP4/H.264, `q_auto:eco` (A/B), sin audio y fps ≤ 30 (parámetros por confirmar, §4.6) |
| Vídeo de la ficha de tool                                | un solo `f_auto`, ancho 960/1440/1920                                              | **dos escalones por área, M y L** (§4.3), mismas dos fuentes, `q_auto`, sin audio, fps ≤ 30                                                    |
| Póster de la ficha                                       | JPG de 960                                                                         | JPG con el tamaño del escalón elegido (que no se vea un póster más borroso que el vídeo)                                                       |
| Imagen de portada de la ficha (tool/other)               | `srcset` 960/1440/1920                                                             | **sin cambios**, `q_auto,f_auto`                                                                                                               |
| Imagen del carrusel de caso                              | `srcset` 960/1440/1920, `sizes` 83vw                                               | **sin cambios**, `q_auto,f_auto`                                                                                                               |
| Imagen OG                                                | 1200 fijo                                                                          | **sin cambios**                                                                                                                                |
| Vídeo del carrusel de caso y portada de vídeo de `other` | original sin tope                                                                  | escalón M, dos fuentes explícitas, `q_auto`, **conservando el audio** (tiene controles), fps ≤ 30; tope de subida **40 MB** propuesto (§5.4)   |
| Miniaturas del ABM                                       | `feed, 200` / `feed, 300`                                                          | reutilizar el escalón **320** del feed                                                                                                         |

### 4.3 Vídeo de la ficha: escalones M y L por área

**Por qué por área y no por ancho** (corrección del 6 oct a la propuesta inicial de «ancho 1280»): la caja del vídeo en la ficha se dimensiona por **altura** (66,7 vh) y su ancho sale del ratio. Un tope por ancho es correcto en 16:9 pero un vídeo vertical de 1080×1920 se serviría entero, con más del doble de píxeles. La regla correcta es un **presupuesto de píxeles** por ratio: **M ≈ 0,92 MP** (1280×720 en 16:9) y **L ≈ 1,44 MP** (1600×900 en 16:9, ×1,25 en cada lado).

Tamaños por ratio (la entrega usa `c_limit` con ancho **y** alto, `w_<W>,h_<H>`):

| Ratio | M (ancho×alto) | L (ancho×alto) |
| ----- | -------------- | -------------- |
| 16:9  | 1280×720       | 1600×900       |
| 4:3   | 1104×828       | 1380×1036      |
| 1:1   | 960×960        | 1200×1200      |
| 4:5   | 856×1070       | 1070×1338      |
| 3:4   | 828×1104       | 1036×1380      |
| 2:3   | 780×1170       | 976×1464       |
| 9:16  | 720×1280       | 900×1600       |

**Regla de selección del escalón:** `necesario = ladoMayorDeLaCaja × min(DPR, 2)`. Si `necesario > 1,09 × ladoMayor(M)` se usa **L**; si no, **M** (el 1,09 sale de 1400/1280). La caja (`imageWidth`, `imageHeight` de `computeContentBlockGeometry`) ya existe; hoy `ToolCoverVideo` solo recibe el ancho, habrá que pasar también el alto.

**Por qué hacen falta dos escalones.** Cajas reales de la ficha (tool, px CSS; alturas de ventana típicas supuestas, no medidas):

| Pantalla                  | 16:9      | 1:1       | 9:16     |
| ------------------------- | --------- | --------- | -------- |
| 1366×768                  | 771×434   | 434×434   | 244×434  |
| 1440×900 (MacBook, DPR 2) | 878×494   | 527×527   | 296×527  |
| 1920×1080                 | 1126×634  | 634×634   | 356×634  |
| 2560×1440                 | 1553×874  | 874×874   | 491×874  |
| 3840×2160 a 100 %         | 2372×1334 | 1334×1334 | 750×1334 |

1280 de ancho en 16:9 cubre un monitor 1080p a 100 %, queda blando en MacBook (haría falta ~1750 px), se amplía un 20 % en un monitor 1440p y un 85 % en 4K. Con M y L: 1080p → M; MacBook y 1440p → L; 4K sigue ampliándose (aceptado). Un tercer escalón S (960×540) ahorraría ancho de banda en móvil, pero la ficha recibe una fracción pequeña del tráfico: **no incluido**.

### 4.4 Vídeo del feed

Un solo ancho (**480**) para todos los ratios: las tarjetas tienen el mismo ancho en cualquier ratio (el masonry es por columnas). En vertical eso da más píxeles (480×853 en 9:16); se acepta. Cada versión del feed son como máximo dos derivadas (WebM y MP4).

### 4.5 Dos fuentes explícitas en vez de `f_auto`

En vídeo se emiten **dos `<source>`**: WebM/VP9 primero y MP4/H.264 de reserva. Las cadenas de transformación son `f_webm,vc_vp9` y `f_mp4,vc_h264` (salen de las URL derivadas que lista un artículo de soporte de Cloudinary para `f_auto`). Razones: máximo dos derivadas por tamaño (con `f_auto` pueden ser WebM/VP9, MP4/AV1, MP4/HEVC para Safari y MP4/H.264); son las mismas cadenas que usaría el eager (fase 2) sin cambiar URLs; no dependen de la métrica de la cuenta (AV1 solo se sirve en cuentas con la métrica «video seconds»). A cambio se pierden AV1 y HEVC. La calidad automática admite H.264, H.265 y VP9.

### 4.6 Parámetros por confirmar antes de usarlos

**No verificados en la documentación el 6 oct; confírmalos antes de implementar** (la página `video_optimization` y la referencia de transformaciones):

1. `ac_none` (quitar el audio).
2. Un tope de fotogramas (`fps_30` o un rango tipo `fps_15-30`; no recuerdo si hay sintaxis de tope o si fuerza el valor). Si no hay sintaxis segura, **no se usa**: basta con que la fuente cumpla 30 fps (§5).
3. Que `q_auto` / `q_auto:eco` se combinan bien con `f_webm,vc_vp9` y `f_mp4,vc_h264` en la misma cadena (la documentación dice que `q_auto` admite VP9, H.264 y H.265).
4. El orden y la sintaxis exactos de `c_limit,w_<W>,h_<H>` en vídeo con las otras partes.

**Decidido el 7 oct 2026 tras la prueba real de Greener** (`MEDIA_QUALITY`, `mediaDelivery.ts`): `q_auto:eco` en el feed y `q_auto` en las fichas. Resultados: vídeo 720×1280 de 744 KB a 424 KB (-43 %, SSIM 0,968; algo menos de claridad en momentos de poco contraste); imágenes 316→283 KB, 1387→1229 KB y 15→12 KB (-10 %, -11 %, -20 %), sin diferencia visible salvo una levísima pérdida en degradados de sombras de piel. Texto anterior, ya superado: Calidad (`q_auto:eco` frente a `q_auto`): pendiente de la prueba A/B de Greener (§12). La documentación de Cloudinary describe `eco` como «más agresivo, ficheros más pequeños y calidad ligeramente menor» y `low` como el más agresivo, pensado para vídeos de vista previa; con `Save-Data: on`, `q_auto` pasa solo a `eco`.

### 4.7 Lo que NO hay que hacer

1. No usar `f_auto` en transformaciones **eager**, **entrantes** (al subir) ni **con nombre**: no funciona (la elección de formato depende del navegador en la entrega).
2. No generar anchos arbitrarios (`w_189`): todo ancho sale de una escalera.
3. No cambiar las cadenas del contrato «un poco» más adelante: cada cambio regenera versiones y deja las viejas ocupando almacenamiento. Si hay que cambiar algo, se hace de golpe y se documenta.
4. No añadir transformaciones entrantes al subir ahora: consumen créditos en cada subida y no conservan el original (alternativa descartada por ahora).

## 5. Contrato de subida (lo que prepara Greener)

### 5.1 Qué reduce y qué no

Reducir el peso de origen ahorra **almacenamiento**, **tiempo de subida** y la **espera de la primera transformación**, y evita el límite de 40 MB de Free. **No reduce el ancho de banda facturado por sí solo**: eso lo decide la rendición que servimos (§4). Greener se ha comprometido a bajar al mínimo el peso sin matar la calidad.

### 5.2 Imágenes

Formato: **WebP o JPEG** de calidad 82-88 en sRGB, sin metadatos; PNG solo para capturas con texto o colores planos. Aceptados por el sistema: JPEG, PNG, WebP y AVIF, **máximo 5 MB**, sin GIF ni animados. Peso objetivo: ≤ 300 KB (solo feed) y ≤ 600 KB (portada de ficha).

| Ratio | Pin de tool (sirve también de portada de la ficha) | Pin solo para el feed (caso, episodio, insight…) |
| ----- | -------------------------------------------------- | ------------------------------------------------ |
| 16:9  | 1920×1080                                          | 1280×720                                         |
| 4:3   | 1600×1200                                          | 1280×960                                         |
| 1:1   | 1600×1600                                          | 1080×1080                                        |
| 4:5   | 1280×1600                                          | 1024×1280                                        |
| 3:4   | 1200×1600                                          | 960×1280                                         |
| 2:3   | 1200×1800                                          | 960×1440                                         |
| 9:16  | 1080×1920                                          | 900×1600                                         |

### 5.3 Vídeo de pin de tool

MP4 H.264 High, `yuv420p`, **sin audio**, **30 fps** (24 vale para demos; nunca 60), `faststart`, ≤ 15 MB, ≤ 15 s. **Bucle de ≤ 8 s** para que se anime en el feed (por encima, el feed solo muestra el póster). Se aceptan MP4, WebM y MOV; MP4 es lo recomendado. Duración del clip típica: 5-7 s.

| Ratio | Tamaño recomendado (M) | Máxima nitidez (L) |
| ----- | ---------------------- | ------------------ |
| 16:9  | 1280×720               | 1600×900           |
| 4:3   | 1104×828               | 1380×1036          |
| 1:1   | 960×960                | 1200×1200          |
| 4:5   | 856×1070               | 1070×1338          |
| 3:4   | 828×1104               | 1036×1380          |
| 2:3   | 780×1170               | 976×1464           |
| 9:16  | 720×1280               | 900×1600           |

Peso esperado de un clip de 7 s en M: entre 0,7 y 2 MB (estimación; depende del movimiento). Subir en L solo tiene sentido si Greener decide servir el escalón L tras la prueba visual.

### 5.4 Vídeo de carrusel de caso (aparte)

Hasta 180 s según el límite actual. Propuesta: ≤ 1280×720, 30 fps, AAC 128 kbps si lleva audio, y **bajar el tope de subida de 100 a 40 MB** por el límite de transformación de Free. **Actualización del 7 oct:** Greener quiere el tope **solo si Cloudinary no puede gestionar vídeos mayores en Free**; como el eager asíncrono parece poder, **provisionalmente NO se aplica** y lo decide la prueba del paso 0 de §9.9 (detalle en §9.8). Si se aplica, afecta a `VIDEO_LIMITS` en `mediaLimits.ts`, al SQL de `attach_pin_video`/casos y a los mensajes del ABM.

## 6. Comportamiento de reproducción objetivo (fase 1)

Valores propuestos (constantes en un solo módulo, fáciles de ajustar):

1. **Prefetch.** Montar el `<video>` **oculto bajo el póster** cuando la tarjeta esté a menos de **una pantalla** (IntersectionObserver con `rootMargin` de una altura de viewport), con `preload="auto"`, `muted`, `playsInline`.
2. **Tope de descargas simultáneas:** **3 en escritorio y 2 en móvil** (<640 px), con un «billete de prefetch» en el coordinador (`videoPlaybackCoordinator`), aparte de los huecos de reproducción (2 escritorio / 1 móvil). Prioridad por cercanía al viewport.
3. **Cambio sin tirones.** El vídeo solo sustituye al póster cuando está listo: `readyState ≥ 3` (HAVE_FUTURE_DATA) y evento `canplay`/`playing`. Antes, el usuario solo ve el póster.
4. **Conexiones lentas.** Sin prefetch ni autoplay en el feed con `Save-Data`, `slow-2g`/`2g` o `prefers-reduced-motion`. Reutilizar `useMotionPreferences` (`src/lib/useMotionPreferences.ts`), que hoy solo usa el vídeo de la ficha. Con `navigator.connection.downlink` por debajo de ~1,5 Mbps (solo Chromium), póster fijo. Umbral a ajustar.
5. **Tiempo máximo y reintentos.** Si no está listo en **~10 s**, abortar la descarga (quitar el `src`) y quedarse con el póster. Si da **error** (por ejemplo, versión aún en generación), reintentar hasta 2 veces con espera (3 s y 8 s). La ficha igual: póster hasta `playing`; si no llega, póster con el botón de reproducir.
6. **Liberar memoria.** Con la tarjeta a más de ~2 pantallas, soltar el `src` (`removeAttribute('src')` + `load()`).
7. **El prefetch cuesta ancho de banda** a cambio de fluidez: con el tope de 3 son, como máximo, ~1 MB en vuelo en el feed. Por eso va conservador.

### 6.1 Tiempos de carga (estimación con supuestos)

Supuestos: clip de 7 s; feed 0,3 MB típico (0,15-0,6); ficha en M 1,5 MB típico (0,7-3). Velocidades **efectivas**, no las del router. Un clip empieza sin cortes cuando `tiempo de descarga − duración ≤ 0`.

| Conexión | Feed 0,3 MB | Ficha 1,5 MB | ¿Empieza sin cortes?      |
| -------- | ----------- | ------------ | ------------------------- |
| 0,5 Mbps | 4,8 s       | 24 s         | feed sí; ficha tras ~17 s |
| 1 Mbps   | 2,4 s       | 12 s         | feed sí; ficha tras ~5 s  |
| 2 Mbps   | 1,2 s       | 6 s          | sí                        |
| 5 Mbps   | 0,5 s       | 2,4 s        | sí                        |

Que «nunca llegue a reproducirse» es improbable salvo por debajo de ~0,5 Mbps; para esos casos valen los puntos 4 y 5.

## 7. Plan de ejecución de la fase 1 (para el 7 de octubre)

Orden recomendado. Cada paso termina con la verificación estándar (§1.4).

1. **Preparación.** Pide a Greener el repo actual (con sus ajustes a mano), compáralo con tu copia, ejecuta la batería base (debe estar en verde) y lee `PROGRESO.md` §4.0, `historial-fase-5.md` §2.36-§2.37 y este documento. Repasa las decisiones abiertas de §12 con Greener **antes** de codificar.
2. **Confirmar la sintaxis (§4.6)** en la documentación de Cloudinary. Anota el resultado en el §2.N nuevo.
3. **Prueba A/B de calidad (Greener).** Para 2-3 clips y 2-3 imágenes reales, prepara URLs candidatas (`q_auto`, `q_auto:eco`, `q_auto:low` para vídeo del feed; `q_auto` y `q_auto:eco` para imágenes del feed) con el `public_id` real. Greener decide y se **congela** el contrato (§12). Se hace antes de codificar para no generar versiones que luego se abandonen.
4. **Contrato en el dominio** (`src/modules/media/domain/mediaDelivery.ts`): escaleras y presupuestos como constantes y funciones puras: tamaño de escalón por ratio (`M`/`L`), `pickDetailVideoRung(caja, dpr)`, `pickFeedImageWidth(anchoTarjeta)`, ancho único del vídeo del feed. Tests unitarios con los casos de §4.3.
5. **Constructores de URL** (`src/modules/media/infrastructure/cloudinaryUrl.ts`): funciones nuevas (por ejemplo `buildVideoSources(publicId, tamaño, contexto)` → `[{ src, type }]`, `buildVideoPosterSrcSet`, `buildFeedImageUrl` con `src` de escalera). **Conserva los antiguos hasta migrar todos los usos** (hoy: `PinCard`, `useToolCoverVideo`, `ToolInsightDetail`, `CaseDetail`). **Test de contrato con las cadenas exactas** para un `public_id` de ejemplo (es lo que protege el «congelado»).
6. **Imágenes del feed.** `src` de `PinCard` = escalón de la escalera (no el ancho de la tarjeta); escalera 320/480/640. Miniaturas del ABM → 320.
7. **Pósters.** `srcset` 320/480/640 en el feed; póster de la ficha con el tamaño del escalón.
8. **Vídeo del feed.** Hook nuevo (por ejemplo `usePinVideo`) con prefetch, listo-para-reproducir, tiempo máximo, reintentos y `useMotionPreferences`; billetes de prefetch en el coordinador (con tests puros, como los de los huecos de reproducción). `PinCard` usa `<source>`.
9. **Ficha de tool** (`ToolCoverVideo` + `useToolCoverVideo`): escalón M/L (pasar la caja entera), `<source>`, póster hasta `playing`, tiempo máximo con botón de reproducir.
10. **Vídeo de caso / `other`.** Dos fuentes en escalón M, conservando el audio. El tope de 40 MB solo si Greener lo aprueba (§5.4): migración SQL + `mediaLimits.ts` + mensajes + tests; la migración se aplica antes de desplegar.
11. **Verificación en Chromium real** (Anexo B): clip local generado con `ffmpeg`, red limitada, medir `getVideoPlaybackQuality().droppedVideoFrames` en los primeros 2 s tras el cambio y comprobar que nunca hay más de N prefetch simultáneos ni vídeo visible antes de estar listo. **No se puede probar contra Cloudinary**: lo hace Greener.
12. **Documentación y entrega.** §2.N nuevo en el historial, fila en el índice, checklist §4, registro §6, este documento (marcar lo hecho y lo decidido) y zip del proyecto completo.
13. **Opcional (fase 1.5):** script `scripts/cloudinary-usage.mjs` que lea el uso de créditos con la Admin API y avise al 60 % y al 80 %. No verificado: hay que comprobar la forma de la respuesta y escribirlo de forma defensiva.

### 7.1 Criterios de aceptación

1. Ninguna URL de vídeo de pines ni de la ficha de tool sin tope de tamaño; ningún póster del feed de 960 px.
2. Test de contrato con cadenas exactas en verde; el contrato está en un único módulo.
3. En Chromium: ningún `<video>` montado fuera de la ventana de prefetch; nunca más de 3 (2 en móvil) descargas especulativas; el vídeo nunca es visible antes de estar listo; `droppedVideoFrames` ≤ 2 en los primeros 2 s tras el cambio con el clip local.
4. `eslint`, `tsc`, `prettier` y `vitest` en verde; documentación actualizada.
5. **Del lado de Greener** (no verificable aquí): peso de un vídeo de pin en la pestaña Network; que las URL se aceptan por Cloudinary (200, `Content-Type` correcto); número de derivadas por asset; créditos antes y después en el panel.

## 8. Cosas ya hechas que conviene conocer (sin repetirlas)

Vídeos en el flujo de pines, límites 8 s / 15 s / 15 MB, `readLocalVideoDuration`, `useMotionPreferences`, limpieza de Cloudinary al borrar y reconciliador (`scripts/reconcile-cloudinary.mjs`), carga masiva con vídeo, caso y episodio con el bloque en flujo, `min-width: 0` en `.content` del Shell, ficha de episodio con CTA «Watch more»: todo en `historial-fase-5.md` §2.36. El reconciliador **no cubre las versiones derivadas**: tras cambiar URLs, las derivadas viejas siguen ocupando almacenamiento y habría que borrarlas con la Admin API (opción `keep_original` al borrar recursos; **no verificada**).

## 9. Fase 2: calentar las versiones de vídeo al publicar (IMPLEMENTADA el 8 oct; falta el relleno inicial)

**Estado (8 oct, tarde): implementada** (`historial-fase-5.md` §2.53): `warmVideoRenditions`, `warmContentMedia`, ganchos con `after()`, botón del ABM y `scripts/warm-cloudinary.mjs`; el tope de 40 MB **no se aplica** (decisión de Greener) y el `?? 10` está retirado. Falta el relleno inicial (Greener). Lo que sigue es el estado de la mañana. Planificada y con las decisiones de Greener tomadas. **Arrancada el 8 oct** (`historial-fase-5.md` §2.52): hechos el script del paso 0, el ratio compartido, `warmPlan.ts` y la migración de seguimiento (sin aplicar); **correcciones a este plan en los puntos marcados «8 oct»**. Falta ejecutar el script (Greener) y el resto de pasos. Esta sección es el traspaso completo: léela entera, más §4 (contrato de entrega), §2.2 (reglas de consumo) y `historial-fase-5.md` §2.51. Todo lo marcado «NO VERIFICADO» hay que comprobarlo contra Cloudinary real **antes** de codificar el resto (paso 0 de §9.9).

### 9.1 Objetivo y alcance

**Objetivo:** que el primer visitante real no espere la generación al vuelo de las versiones de vídeo ni reciba un vídeo roto.

1. **Solo vídeo.** Las imágenes usan `f_auto` y `f_auto` **no funciona en un eager** (§2.2.4, §4.7): no se pueden calentar. Los pósters (JPG del primer fotograma) son transformaciones de imagen baratas: no se calientan en esta fase (si algún día se quiere, hay que verificar antes que un eager de recurso `video` admite `f_jpg`).
2. **No ahorra créditos.** Cada versión única se cobra una sola vez, la pida quien la pida (§2.2.2). Calentar **adelanta** el cobro y el trabajo. El coste extra real son las versiones que nadie habría pedido (una ficha que nadie abre).
3. **Los fallos de calentamiento nunca bloquean** publicar, programar ni subir un medio: se registran y se reintentan (§9.6).

### 9.2 Decisiones de Greener (7 oct 2026)

1. **Cuándo:** al **publicar**, al **programar**, al **añadir un medio a un contenido ya publicado** y **a mano** (botón + script). **No** al subir (gastaría créditos en borradores).
2. **Qué:** **feed + escalón M de la ficha**, en los dos formatos. **Corrección del 8 oct:** en las **fichas de tool** se calienta también el **escalón L** (lo pide `useToolCoverVideo` en pantallas grandes o con DPR alto y el primer visitante esperaría la transformación); en case y `other` solo M.
3. **Seguimiento en base de datos:** **sí** (una migración, §9.6).
4. **Tope de 40 MB en vídeos de caso/`other`: condicional.** Greener lo quiere **solo si Cloudinary no es capaz de gestionar vídeos mayores en Free**. Lo averiguado el 7 oct (§9.8) apunta a que **sí** puede, de forma asíncrona, así que **provisionalmente NO se aplica el tope**; lo confirma o lo tumba la prueba real del paso 0.

### 9.3 Hallazgo de diseño: las publicaciones programadas no pasan por la aplicación

`schedule_content` deja el contenido en `scheduled` y es la función `publish_scheduled_content()` de **`pg_cron`** (migración `20260922090000`) la que lo pasa a `published` **dentro de Postgres**. La aplicación no se entera, así que un gancho solo en «Publicar» dejaría **todo lo programado sin calentar**. Por eso hay cuatro puntos de calentamiento, todos idempotentes:

| Punto                                     | Dónde engancharlo                                                                                                                            | Nota                                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Publicar                                  | `publishContentAction` (`publishActions.ts`), tras el RPC con éxito                                                                          | con `after()` de `next/server` (Next 16): no retiene la respuesta                                                          |
| Programar                                 | `scheduleContentAction` (mismo fichero)                                                                                                      | se calienta al programar, no al ejecutarse el cron; si luego se cancela la programación, el gasto ya está hecho (aceptado) |
| Medio nuevo en contenido **ya publicado** | acciones de alta de pin con medio y de carrusel de case (`pinActions.ts`, `caseCarouselActions.ts`, `mediaActions.ts` de portada de `other`) | solo si `content.status === 'published'` (o `scheduled`)                                                                   |
| A mano                                    | botón «Calentar» en el ABM del contenido + `scripts/warm-cloudinary.mjs`                                                                     | el script también hace el **relleno inicial** de lo ya subido y publicado, y los reintentos                                |

### 9.4 Qué calentar (matriz de uso)

Cada rendición es un tamaño × un formato (`f_webm,vc_vp9` y `f_mp4,vc_h264`): **2 versiones** por fila.

| Uso del vídeo                                 | Perfil (`VideoProfile`) | Tamaño                                                                                            | Audio | Quién lo pide                       |
| --------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- | ----- | ----------------------------------- |
| Pin de **cualquier tipo** en el feed          | `feed`                  | ancho **480** (`FEED_VIDEO_WIDTH`). **8 oct:** solo si se anima (hay `autoplayMode` y dura ≤ 8 s) | no    | `PinCard` (`buildFeedVideoSources`) |
| Pin de **tool** en la ficha (`/tools/{slug}`) | `toolDetail`            | escalón **M** del ratio (`detailVideoRungM`)                                                      | no    | `useToolCoverVideo`                 |
| Vídeo del carrusel de **case**                | `caseDetail`            | escalón **M** del ratio **propio del vídeo** (`closestClosedRatio(width, height)`)                | sí    | `CaseDetail.tsx`                    |
| Portada de vídeo de **`other`**               | `caseDetail`            | escalón **M** del ratio de la portada                                                             | sí    | `ToolInsightDetail.tsx`             |

Un vídeo de pin de tool son **4** versiones (feed + ficha M); uno de case, 2; una portada de `other`, 2 (más 2 si además sale como pin en el feed).

**Trampa que hay que cubrir con un test:** el ratio con el que se calcula el escalón M **debe ser exactamente el de la entrega**, o las cadenas del eager no coincidirán con las URL pedidas y el calentamiento no servirá de nada (y se pagará dos veces). En la entrega: `ToolInsightDetail.tsx` usa `coverRatioOverride ?? content.coverRatio ?? FALLBACK_RATIO` y `CaseDetail.tsx` usa `closestClosedRatio(item.width, item.height)`. La implementación debe reutilizar **esas mismas** expresiones (extraerlas a una función compartida) y un test de contrato debe comparar, para los mismos datos, las cadenas del eager con la parte de transformación de las URL de entrega. Revisar al implementar de dónde sale hoy `coverRatioOverride` para el pin mostrado con `?pin=`.

### 9.5 Cómo (diseño técnico)

1. **Llamada:** `cloudinary.uploader.explicit(publicId, { type: 'upload', resource_type: 'video', eager: [...], eager_async: true })`. El SDK (`cloudinary` ^2.10) ya está instalado y configurado en `cloudinaryServer.ts` (que ya usa `cloudinary.uploader.destroy`). **NO VERIFICADO:** la forma exacta de cada elemento de `eager` (cadena con `/` entre componentes o un objeto de transformación) y si el SDK serializa bien la cadena de `buildVideoTransformations`. Hay un artículo de soporte con un ejemplo de `explicit` con `eager`; confirmarlo en el paso 0.
2. **Las cadenas salen de `buildVideoTransformations(profile, size)`** (`cloudinaryUrl.ts`), que ya devuelve las dos cadenas en el orden de `<source>` y existe **precisamente para esto** (§4.1.4). Es la única fuente de verdad: no escribir cadenas a mano en la fase 2.
3. **Notificación de fin:** `eager_notification_url` es opcional; en la v1 **no se usa** (exigiría un endpoint público con verificación de firma). El éxito se comprueba con una petición `HEAD` a la URL derivada (200) desde el script (`--check`) y desde el botón del ABM.
4. **Estructura propuesta** (ajustable):
   - `src/modules/media/domain/warmPlan.ts`: función pura que, dado el uso de un vídeo (pin de tool, pin de otro tipo, carrusel de case, portada de `other`, ratio, tamaño del archivo), devuelve la lista de `{ profile, size }` a calentar. Con tests exhaustivos.
   - `src/modules/media/infrastructure/cloudinaryServer.ts`: `warmVideoRenditions(publicId, transformations)` (envuelve `explicit`).
   - `src/modules/media/application/warmContentMedia.ts`: orquestador `warmContentMedia(contentId)`: lee los medios y su uso (pines con `pin_media`, `case_detail_media`, `content.cover_media_id`; hay un patrón de lecturas en `supabaseMediaRefs.ts`), calcula el plan, omite lo ya calentado con el contrato vigente y lo que supere el tope de §9.8, llama a Cloudinary y registra el resultado.
5. **Idempotencia:** antes de llamar, comprobar `warmed_contract` (§9.6). **NO VERIFICADO:** si repetir un `explicit` con un eager cuya derivada ya existe se vuelve a cobrar o no. Se mide en el paso 0; si se cobra, la comprobación previa es obligatoria, no una optimización.

### 9.6 Seguimiento en base de datos (migración nueva)

Una migración sobre `media_asset` (solo filas de vídeo la usan):

1. `warmed_contract text null`: identificador del contrato de calentamiento vigente cuando se calentó (por ejemplo un hash corto de las cadenas del eager de ese vídeo). Si cambia el contrato (§4.7.3), todo vuelve a figurar como «sin calentar» y el script lo puede rehacer.
2. `warmed_at timestamptz null`.
3. `warm_error text null`: último error (vacío si fue bien).
4. Una función `mark_media_asset_warmed(p_media_id uuid, p_contract text, p_error text)` con fila en `audit_log` (security invoker, `revoke ... from public`). **8 oct:** admite admin (`is_admin()`) **o rol de servicio** (`current_user = 'service_role'`), porque `is_admin()` mira el email del JWT y la secret key no lo lleva; `grant ... to authenticated, service_role`. Hecha en `20261008090000_media_asset_warm_tracking.sql`.
5. **Ojo con la sesión:** el calentamiento tras publicar corre en `after()` con la sesión del admin que pulsó el botón; el que dispara el `pg_cron` no tiene sesión (por eso se calienta al programar, §9.3). El script usa las credenciales de servicio.

**ABM:** en la edición de cada contenido con vídeo, un indicador por medio («calentado», «pendiente», «error: …») y el botón «Calentar». Añadir la migración a la lista de aplicación de `PROGRESO.md` §4.0.

### 9.7 Coste (estimación con suposiciones; una sola vez)

Fórmula (§11.1): `segundos × (1/500)` créditos en SD o `× (1/250)` en HD por rendición; no está claro dónde cae el corte SD/HD (§2.2.1), así que se da el rango.

Suposición: **68 clips de tool de ~7 s** (68 vídeos tras §2.44; la duración media es supuesta) = 476 s. Cada rendición: **0,95 a 1,9 créditos**.

| Alcance                       | Rendiciones por clip | Créditos      |
| ----------------------------- | -------------------- | ------------- |
| Solo feed                     | 2                    | 1,9 – 3,8     |
| **Feed + ficha M (decidido)** | 4                    | **3,8 – 7,6** |
| Feed + ficha M + L            | 6                    | 5,7 – 11,4    |

Quedaban ~20 de 25 créditos el 6 oct y la ventana es **móvil de 30 días**, así que el pico pesa un mes. **Para afinar:** ejecutar `select count(*), sum(duration_seconds) from media_asset where kind = 'video';` y recalcular con los segundos reales. Los vídeos de case y `other` no están en la tabla; su coste depende de su duración (hasta 180 s hoy) y es proporcional.

### 9.8 El tope de 40 MB: lo que se averiguó el 7 oct (CORRIGE una afirmación previa)

Mi planteamiento previo («por encima de 40 MB Free no transforma y el vídeo no se serviría») era **demasiado categórico**. Lo que dice la respuesta de un empleado de Cloudinary en el hilo de soporte [«Issue with eager transformations erroring out»](https://support.cloudinary.com/hc/en-us/community/posts/4548642915218-Issue-with-eager-transformations-erroring-out):

1. El límite de **40 MB (Free) / 300 MB (de pago)** es para las transformaciones **síncronas** (al vuelo, las que genera una URL de entrega la primera vez que se pide). El error literal es «Video is too large to process synchronously, please use an eager transformation with eager_async=true».
2. Con **eager asíncrono** se pueden transformar vídeos «tan grandes como el límite máximo de tamaño de vídeo de la cuenta». Nuestro tope de subida es 100 MB.

**Consecuencias si es cierto (se verifica en el paso 0):**

1. Un vídeo de 40-100 MB **sí** se puede servir, pero **solo si sus derivadas se generaron antes por eager asíncrono**: la primera petición al vuelo falla en lugar de ser lenta. Para esos vídeos calentar **deja de ser una mejora y pasa a ser obligatorio**.
2. Solo afecta a case y `other`: los pines de tool están limitados a 15 MB. En case y `other` solo se pide el escalón M, así que no hay un escalón L al vuelo que falle.
3. Queda una **ventana de riesgo**: entre publicar y terminar el eager asíncrono, un visitante recibiría un error en vez de un vídeo lento. Opciones a decidir con la prueba: (a) calentar los vídeos de más de 40 MB **al subirlos** (solo esos; es la excepción a la decisión 1 de §9.2); (b) mantener el vídeo oculto hasta que la comprobación `HEAD` dé 200; (c) aplicar el tope.
4. **Regla de Greener:** si la prueba demuestra que no funciona de forma fiable → **se aplica el tope de 40 MB**. Puntos a tocar: `VIDEO_LIMITS` en `mediaLimits.ts`, el SQL de `attach_pin_video`/casos/portada (migración), los mensajes del ABM y los tests.

**Resultado de la prueba del 8 oct (§2.52 del historial):** un vídeo de 43,5 MiB (45,6 MB) se transformó al vuelo (dos cadenas nuevas, 200 y sin `x-cld-error`) y por eager asíncrono sin problema en Free. **No se ha probado con 80-100 MB** (no hay vídeos así en la cuenta): el tope sigue sin aplicarse y la duda solo afecta a la franja 45-100 MB de case y `other`.

La fuente es un hilo de la comunidad con respuesta de personal, **no la documentación oficial**: tratarla como indicio, no como garantía. (Un segundo hilo habla de un límite de 100 MB de manipulación en línea para otra cuenta; no hay una tabla oficial a mano que lo reconcilie.)

### 9.9 Orden de trabajo (para la conversación nueva)

**Paso 0 — Pruebas contra Cloudinary real (script desechable, p. ej. `scripts/warm-probe.mjs`, antes de codificar nada más).** Necesita las credenciales de Greener (`--env-file=.env.local`), así que el script lo escribe Claude y lo **ejecuta Greener**, que devuelve la salida. Con **un clip de tool** (≤ 15 MB) y **un vídeo de 60-80 MB** (para §9.8):

1. ¿`explicit` con `eager` + `eager_async: true` acepta las cadenas de `buildVideoTransformations`? ¿Con qué forma de `eager` (cadena u objeto)?
2. Tras esperar, ¿la URL de entrega de `buildVideoSources` (misma cadena, misma `f_`/`vc_`) responde **200** con el `Content-Type` correcto (`video/webm`, `video/mp4`)? (`HEAD`.)
3. ¿Repetir el `explicit` con derivadas ya existentes **vuelve a cobrar**? (Créditos antes y después en el panel.)
4. Coste real en créditos de una rendición de ese clip (compara con §9.7).
5. Vídeo grande: ¿la URL de entrega **sin** eager da el error de «too large»? ¿**Con** eager asíncrono se genera y se sirve? ¿Cuánto tarda?
6. ¿Hay forma de saber que el eager terminó sin `notification_url` (por ejemplo la Admin API de recursos con `derived`)? Si la hay, el indicador del ABM puede ser más fiel que un `HEAD`.
   Con los resultados se corrige esta sección **antes** de seguir; si la 5 sale mal, se aplica el tope (§9.8.4).
   **Resultados del 8 oct (script ejecutado con un vídeo de 130 s, ver §2.52):** (1) sí: array de cadenas; (2) sí, 200 y content-type correcto, sin derivada nueva (la cadena del eager es la de entrega); (3) **repetir añadió una derivada (7→8): no repetir nunca sin `warmed_contract`**; (4) ≈ 1/500 de crédito por segundo en una rendición de 480 px (inferencia); (5) a 43,5 MiB ni la entrega al vuelo ni el eager fallaron, sin prueba de 80-100 MB; (6) sí: la Admin API (`derived`) basta, ≤ 70 s para 2 rendiciones de 130 s. Pendiente: la franja 80-100 MB y el coste de la rendición M (¿tarifa HD?).

**Paso 1.** Migración de §9.6 (columnas + función), tests de su texto como los de la migración de borrado de versiones (`tests/unit/packages/deletePackageVersion.test.ts`).
**Paso 2.** `warmPlan.ts` (puro) + función compartida del ratio (§9.4) + test de contrato eager = entrega.
**Paso 3.** `warmVideoRenditions` + `warmContentMedia` con fakes de Cloudinary y de Supabase; fallos que no bloquean; idempotencia por `warmed_contract`.
**Paso 4.** Los tres ganchos automáticos (§9.3) con `after()`.
**Paso 5.** Botón e indicador en el ABM; `scripts/warm-cloudinary.mjs` (simulación por defecto, `--execute`, `--check`), con el patrón del reconciliador (`scripts/reconcile-cloudinary.mjs`).
**Paso 6.** Documentación (§2.N, índice, checklist, registro, esta sección marcada) y zip.
**Paso 7 (Greener).** Relleno inicial con el script sobre lo ya publicado; comprobar créditos antes y después; HEAD de una muestra.

### 9.10 Tests mínimos

1. Cadenas del eager **idénticas** a las de entrega para los mismos datos (los cuatro usos de §9.4).
2. El plan incluye el escalón L solo en las fichas de tool (corrección del 8 oct); no incluye imágenes, ni vídeos de borradores sin ganchos manuales.
3. Un fallo de Cloudinary o de la base de datos **no** impide publicar, programar ni subir (se captura y se registra).
4. Un vídeo ya calentado con el contrato vigente no se vuelve a calentar; si cambia el contrato, sí.
5. El gancho de medio nuevo solo actúa si el contenido está `published` o `scheduled`.
6. Texto de la migración (admin, auditoría, permisos).

### 9.11 Criterios de aceptación

1. Publicar y programar calientan sin retrasar la respuesta; subir un medio a un contenido publicado también.
2. Lo programado queda calentado **antes** de que el cron lo publique.
3. Cada vídeo muestra su estado en el ABM y se puede reintentar con el botón o el script.
4. Tras el relleno inicial, el `HEAD` a la URL de entrega de una muestra de vídeos da 200.
5. El gasto de créditos del relleno cae dentro del rango de §9.7 (o se explica la diferencia).
6. `eslint`, `tsc`, `prettier` y `vitest` en verde; documentación al día.

### 9.12 Riesgos y lo no resuelto

1. **Créditos en la ventana de 30 días:** el relleno inicial concentra 4-8 créditos de golpe. Hacerlo cuando haya margen y mirar el panel después.
2. **Cambiar el contrato** (§4.7.3) invalida lo calentado y obliga a repetir el gasto; por eso el contrato está congelado.
3. **`explicit` y el eager asíncrono no están probados** (paso 0).
4. **Las derivadas viejas** de URLs antiguas siguen ocupando almacenamiento y el reconciliador **no las cubre** (§8).
5. **Programar y cancelar** gasta el calentamiento sin publicar (aceptado).
6. Sigue pendiente la respuesta de soporte de Cloudinary sobre qué pasa al pasar de 25 créditos (§2.3.3): conviene tenerla antes del relleno.

## 10. Sesión de conversión de imágenes y vídeos (proceso)

**Para qué.** Greener entrega una lista de imágenes y vídeos de tools; Claude los convierte al contrato de subida (§5). **No puede** subirlos a Cloudinary ni al ABM (sin credenciales ni sesión de administrador): la subida la hace Greener desde el ABM.

### 10.1 Qué recibe Claude

1. Los ficheros (por lotes o en zip; no se conoce el límite de subida del chat: empezar por un lote pequeño).
2. Por fichero: **frase gancho** (obligatoria en pines de tool), **alt** (obligatorio) e **idioma**. El orden en cola ya no se indica: el ABM lo asigna solo según llegan los pines (§2.43 del historial).
3. La política de recorte por defecto y el escalón de vídeo (M por defecto).

### 10.2 Qué hace

1. **Preparar las herramientas** (Anexo A): `pip install imageio-ffmpeg pillow` y localizar el binario de `ffmpeg`.
2. **Inspeccionar** cada fichero: medidas, duración, fps, si lleva audio, peso.
3. **Decidir el ratio** como el más cercano de los 7 (`closestClosedRatio`: comparación logarítmica). Si la diferencia con el ratio real supera ~5 % (`mediaMatchesRatio`), **marcar el fichero**: hay que elegir entre recortar y rellenar. En capturas de interfaz un recorte puede cortar contenido, así que **no recortar sin permiso**.
4. **Elegir el tamaño** por ratio y uso (§5): pin de tool = columna «portada de ficha» en imágenes y escalón M en vídeos.
5. **Convertir** (Anexo A) y **verificar** el resultado: medidas, fps, ausencia de audio, `faststart`, peso ≤ 15 MB, duración ≤ 15 s (≤ 8 s para que se anime en el feed).
6. **Entregar** un zip con los ficheros renombrados según la convención de §10.4, un **informe** antes/después por fichero y las **marcas** de lo que se sale de límites, y un **CSV de carga masiva** con las columnas del ABM: `filename,label,ratio,language,alt` (alias aceptado: `lang`; el `filename` debe coincidir con el nombre del fichero; sin CSV, el ABM deriva etiqueta y alt del nombre). En casos, episodios e insights la etiqueta no se usa (se deriva del título).

### 10.3 Advertencias

1. Recodificar **pierde calidad**: Greener conserva los originales y revisa los resultados, sobre todo el texto pequeño de las grabaciones de pantalla.
2. Los pesos de los clips de prueba sintéticos de la verificación (de 12,9 a 1,2 MB) **no son representativos** de grabaciones reales.
3. Si algún día se crea un script reutilizable para esto (por ejemplo `scripts/prepare-media.py`), documéntalo aquí y en `PROGRESO.md`.

### 10.4 Convención de nombres de archivo

Todo archivo que se sube al ABM se nombra así: **`[nombre]-[proporción]-[tipo de medio].ext`**, en minúsculas, con guiones y sin espacios. Ejemplos: `flap-4x5-img.webp`, `glitch-916-video.mp4`, `brand-the-future-11-img.jpg`.

1. **nombre**: la tool, el episodio, el insight, el caso o el contenido al que pertenece el archivo. Puede tener guiones.
2. **proporción**: una de las 7 cerradas, escrita con `x` (`1x1`, `4x3`, `4x5`, `3x4`, `2x3`, `9x16`, `16x9`) o compacta, sin separador (`11`, `43`, `45`, `34`, `23`, `916`, `169`).
3. **tipo de medio**: lo que quiera Greener para identificar el archivo (`img`, `video`, `hero`…). El ABM no lo lee; solo ocupa el último bloque para que la proporción quede siempre en el penúltimo.

El ABM lee la proporción del nombre y precarga el ratio de cada archivo en la **carga masiva de pines** y en la **portada de los contenidos de tipo `other`** (`ratioFromFilename.ts`, §2.46 del historial). Reglas:

- La forma compacta solo se lee en el penúltimo bloque; la forma con `x` vale en cualquier posición. Así `caso-11-hero.jpg` se lee como 1:1 y un número suelto del nombre (`2023`, `caso-11.jpg`) no se confunde con una proporción.
- **Varias imágenes con el mismo nombre:** se puede terminar el nombre con un contador (`elonmuskeizer-43-image-2.webp`, `…-image_3.webp`, `… (2).webp`); el ABM ignora los números del final y lee lo anterior como si no estuvieran. Solo se descartan números: cualquier otro sufijo (`-final`, `-v2`) desplaza el tipo de medio y la proporción deja de estar en el penúltimo bloque.
- Si el nombre no trae una proporción legible, o no es una de las 7 cerradas (`5x7`, `21x9`), **no se aplica nada**: queda el ratio por defecto (carga masiva) o la sugerencia por las dimensiones (portada de `other`).
- Prioridad en la carga masiva: CSV, nombre del archivo, ratio por defecto. El admin puede corregir el ratio a mano antes de subir.
- **Aviso, nunca bloqueo:** si el ratio no encaja con las dimensiones reales del archivo (tolerancia del 5 %, `mediaMatchesRatio`), el ABM avisa de que se verá recortado y de que probablemente el nombre está mal puesto. En la portada de `other` el aviso sale antes de subir; en la carga masiva, al terminar cada fila.
- Quien prepara los archivos (§10.2) tiene que **medir antes de nombrar**: el nombre afirma una proporción y el ABM se fía de él.

## 11. Fórmulas útiles

1. **Créditos de una rendición de vídeo:** `segundos × (1/500)` en SD o `segundos × (1/250)` en HD. Ejemplo: 45 clips × 7 s × 4 rendiciones ≈ 2,5-5 créditos como tope.
2. **Descarga:** `MB × 8 / Mbps` segundos; **arranque sin cortes:** `max(0, descarga − duración)`.
3. **Ancho de banda:** 1 crédito = 1 GB; `visitas × MB por visita / 1024`.
4. **Transformaciones de imagen:** ≈ `assets × anchos pedidos × formatos pedidos` (observado: ~8 por asset). Con 1000-1500 assets serían ~8-12 créditos solo de transformaciones.
5. **Peso de vídeo:** `bitrate × duración / 8`. A 2 Mbps y 7 s: ~1,75 MB.

## 12. Decisiones abiertas y confirmaciones

**Confirmado por Greener el 6 oct:** contrato con los dos escalones M/L en la ficha; vídeos de caso incluidos en el contrato; dos fuentes explícitas en vez de `f_auto`; seguir en Free; reducir el peso de origen por su lado.

| Decisión                                                                       | Estado                                                                                                                                                          |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calidad del feed: `q_auto:eco` frente a `q_auto` (imágenes y vídeo)            | **Resuelto (7 oct, prueba real de Greener):** eco en el feed (imagen, póster y vídeo) y miniaturas del ABM; `auto` en las fichas                                |
| `ac_none` y tope de fps: sintaxis                                              | **Resuelto (7 oct):** `ac_none` confirmado; `fps` no se usa (es un rango con mínimo obligatorio, no un tope)                                                    |
| Tope de 40 MB en vídeos de caso                                                | **Condicional (7 oct):** solo si el eager asíncrono no sirve vídeos mayores en Free; provisionalmente no se aplica. Lo decide la prueba del paso 0 (§9.8, §9.9) |
| Umbral para usar L (1,09 × lado mayor de M) y umbral de `downlink` (~1,5 Mbps) | Valores propuestos, ajustables tras probar                                                                                                                      |
| Escalón S (960×540) para móvil                                                 | **No incluido**; reabrir solo si el ancho de banda de la ficha duele                                                                                            |
| Calentar al publicar (fase 2) frente a al subir                                | **Resuelto (7 oct):** publicar, programar, medio nuevo en contenido publicado y a mano; no al subir (§9.2)                                                      |
| Qué calentar en la fase 2                                                      | **Resuelto (7 oct):** feed (480) + ficha M, dos formatos; **corregido el 8 oct: L solo en fichas de tool** (§9.2, §9.4)                                                                        |
| Seguimiento del calentamiento en base de datos                                 | **Resuelto (7 oct):** sí, una migración sobre `media_asset` (§9.6)                                                                                              |
| Script de avisos de uso de créditos                                            | **Opcional** (paso 13 de §7)                                                                                                                                    |
| Qué ocurre al pasarse de 25 créditos en Free                                   | **Pendiente: Greener pregunta a soporte de Cloudinary**                                                                                                         |

## 13. Fuentes consultadas (6 oct 2026)

Documentación oficial de Cloudinary: `cloudinary.com/documentation/video_optimization` (calidad automática, formato automático, tamaño, bitrate), `.../eager_and_incoming_transformations` (eager y `f_auto`), `.../video_transformation_rollout` (calentar la caché), `.../adaptive_bitrate_streaming` (streaming adaptativo, descartado), `.../billing_and_plans` y `.../developer_onboarding_faq_credits` (créditos), `.../pricing.md` (planes; Pro PAYG con exceso; 40 MB de transformación en Free), `cloudinary.com/pricing/compare-plans` (equivalencias SD/HD), artículo de soporte «How to set an automatic format selection f_auto when using eager transformations» (URL derivadas de `f_auto`), y un artículo del blog de Cloudinary sobre transformaciones perezosas frente a eager (retraso del primer usuario y vídeos rotos para el resto). **Fuentes de terceros** (consecuencia de superar los créditos, precio de Plus): `theimagecdn.com`, `apicostcalc.com`, `supergood.ai`, `costbench.com`. **Dato verificado** = documentación oficial; **estimación** = cuentas de este documento con los supuestos indicados; **tercero** = no oficial.

## Anexo A. Plantillas verificadas de conversión

Herramientas (verificadas el 6 oct en el entorno de Claude): `pip install --break-system-packages imageio-ffmpeg pillow`; el binario sale de `python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"` (ffmpeg 7.0.2 estático).

**Vídeo** (sustituir `W:H` por la medida de §5.3; verificado con un clip sintético 1920×1080 a 60 fps con audio: salida 1280×720, H.264 High, 30 fps, sin audio, `moov` antes de `mdat`):

```
ffmpeg -i in.mov -vf "scale=W:H:flags=lanczos,fps=30" -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 24 -preset slow -g 60 -an -movflags +faststart out.mp4
```

Si el ratio de origen no coincide con el de destino, **no** forzar `scale=W:H` (deformaría): decidir antes entre recortar (`crop`) y rellenar.

**Vídeos cuya resolución cambia dentro del fichero** (aprendido el 7 oct con los WebM de tools: 23 de 63 empezaban en un formato y seguían en otro, o con bandas negras). Antes de convertir **medir fotograma a fotograma** (`ffprobe -select_streams v -show_entries frame=pts_time,width,height`), no solo la cabecera. Si hay cambios: cortar el original por tramos con `-c copy` en el fotograma clave donde cambia el tamaño, medir la zona real de contenido de cada tramo (descartar bandas negras) y codificar cada tramo por separado con su proporción; unir solo tramos de la misma proporción. Nunca pasar el clip entero por un `scale=W:H` fijo: ffmpeg reescala los fotogramas de otro tamaño al primero y los deforma. Después de convertir, comprobar que todos los fotogramas de la salida tienen el mismo tamaño.

**Imagen** (recorte centrado al ratio y reducción con Pillow, verificado):

```python
from PIL import Image
src = Image.open("in.png"); W, H = 1920, 1080
r, t = src.width / src.height, W / H
if r > t:
    nw = int(src.height * t); box = ((src.width - nw) // 2, 0, (src.width - nw) // 2 + nw, src.height)
else:
    nh = int(src.width / t); box = (0, (src.height - nh) // 2, src.width, (src.height - nh) // 2 + nh)
out = src.crop(box).resize((W, H), Image.LANCZOS)
out.save("out.webp", "WEBP", quality=85)                      # o JPEG:
out.save("out.jpg", "JPEG", quality=85, optimize=True, progressive=True)
```

## Anexo B. Arnés de navegador real (cómo se midió en esta sesión)

Sirve para medir layout y comportamiento con los **componentes reales** en un Chromium real. No se mete en el repo (`npm run lint` lo procesaría); recréalo en `/tmp`. Fuera de alcance: no llega a Cloudinary.

**Instalación** (versiones de la sesión: esbuild 0.28.2, `@sparticuz/chromium` con Chromium 153, `puppeteer-core`):

```
mkdir -p /tmp/browser && cd /tmp/browser && npm init -y && npm i @sparticuz/chromium puppeteer-core
mkdir -p /tmp/harness/stubs && cd /tmp/harness && npm init -y && npm i esbuild
```

**Lanzamiento** (clave: `ignoreDefaultArgs: ['--hide-scrollbars']` da la barra de scroll **clásica de 15 px**, la que desajusta anchos medidos; sin esa opción el navegador usa barras ocultas):

```js
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: await chromium.executablePath(),
  args: [...chromium.args, '--no-sandbox'],
  headless: 'shell',
  ignoreDefaultArgs: ['--hide-scrollbars'],
})
```

**Compilación del arnés** con esbuild: empaqueta `Shell`, `EpisodeDetail`, `CaseDetail`, `ToolInsightDetail` (y lo que haga falta) con el CSS real. `*.module.css` usa `local-css` por defecto (clases `Fichero_clase`: selecciona con `[class*="EpisodeDetail_highlight"]`).

```js
import { build } from 'esbuild'
await build({
  entryPoints: ['/tmp/harness/entry.tsx'],
  bundle: true,
  outdir: '/tmp/harness/out',
  format: 'iife',
  jsx: 'automatic',
  target: 'chrome120',
  tsconfig: '/ruta/al/repo/tsconfig.json', // resuelve el alias @/
  nodePaths: ['/ruta/al/repo/node_modules'],
  alias: {
    'next/link': '/tmp/harness/stubs/link.tsx',
    'next/navigation': '/tmp/harness/stubs/navigation.ts',
  },
  loader: { '.svg': 'dataurl', '.woff2': 'dataurl', '.png': 'dataurl' },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME': '"demo"',
  },
})
```

Stubs mínimos: `link.tsx` devuelve `<a href>`; `navigation.ts` exporta `usePathname`, `useRouter`, `notFound`, `redirect` vacíos. `entry.tsx` lee `?kind=episode|case|tool` (y `short=1` para cuerpo corto) y renderiza `<Shell>` con el componente y datos de prueba. El `index.html` enlaza `out/entry.css` y `out/entry.js` y **sustituye `window.fetch`** por un mock con 300 ms de retraso (`POST /api/feed/sessions` → `{ sessionId }`; el resto → un lote de 24 pines) para que la barra de scroll aparezca **después** del primer layout, que es justo lo que reproduce los fallos de ancho medido.

**Trampas que ya costaron tiempo:**

1. No actives `setRequestInterception` con `file://`: deja la página en blanco.
2. `external: ['/*']` en esbuild marca como externos hasta los imports resueltos por ruta absoluta: el bundle sale vacío. Lista solo las rutas de recursos estáticos de los `url()` del CSS (en este repo no hacía falta ninguna).
3. El **alto del viewport no es el alto del monitor**: un navegador en un monitor de 1440×900 tiene ~770-800 px útiles. Un viewport de 900 px de alto produjo un «fallo» que no existe en un monitor 1440×900.
4. Las capturas salen con tipografía de respaldo: `next/font` no está en el arnés.
5. Una medida útil: `scrollWidth` frente a `clientWidth` (scroll horizontal) y el margen derecho de la tarjeta más a la derecha frente al padding de `main`.

**Para la fase 1** (sin probar): servir clips generados con `ffmpeg` desde un servidor local HTTPS y redirigir el host de Cloudinary con `--host-resolver-rules="MAP res.cloudinary.com 127.0.0.1:<puerto>"` y `--ignore-certificate-errors`; limitar la red con el protocolo del navegador (`Network.emulateNetworkConditions`); medir `video.getVideoPlaybackQuality().droppedVideoFrames` y los eventos `canplay`/`playing`; añadir un `kind=pin` al `entry.tsx` que renderice `PinCard` con un medio de vídeo.
