# Plan — migración de los medios de Cloudinary a Cloudflare (R2, Images, Media Transformations y Stream)

**Estado: plan cerrado el 16 de noviembre de 2026 (§2.158 del historial; alcance acotado a la web ese mismo día, §2.159). Sin ejecutar y sin cambios en `src/`.** Sustituye al _Plan de migración de medios: de Cloudinary a Cloudflare_ (26 y 27 de octubre, PDF que no viaja en el repositorio) y a las filas de medios de `docs/operaciones/migracion-infraestructura.md`. Orden fijado por Greener: **primero el dominio y el DNS** (D0 a D4, `docs/operaciones/dns-d2-tabla-registros.md`), después el entorno de Cloudflare (F0) y solo entonces el código (F1). Hasta que la zona `itsgreener.com` esté activa en Cloudflare no se toca nada de los medios.

**Alcance acotado el 16 de noviembre (14:00).** Greener decide centrarse en lo que necesita la web: **la librería de 1.043 imágenes y las 4 del mailing se quedan, de momento, en Cloudinary y la cuenta no se borra**. Más adelante se cambiará el código de la otra web y de las plantillas para traerlas de Cloudflare. Las partes de este plan que las afectan (§2.2, §6 y los puntos marcados «diferido») quedan escritas como diseño para entonces, pero **no entran en F0 a F4**. Los números reales de la base de datos están en §2.1.

Motivo de la migración: el plan Free de Cloudinary se queda corto (el 16 de noviembre, 30 días: 15,88 K transformaciones, 2,13 GB de almacenamiento y 861 MB de ancho de banda, con la copia masiva de la librería inflando la cifra) y la cuenta de Cloudflare de la empresa ya tiene R2 de pago.

---

## 1. Qué cambia respecto al plan de octubre

| Punto | Plan de octubre | Hoy (16 nov) |
| --- | --- | --- |
| Vídeo largo | Mux o Bunny, a elegir con una prueba | **Cloudflare Stream**, sin prueba de proveedores. Regla: dura más de 15 s **o** pesa más de 15 MB → Stream; si no, R2 |
| Buckets | Uno (`greener-media`) | **Tres como diseño** (web, librería y mailing), todos en la UE y públicos tras un dominio propio de `itsgreener.com`; **ahora solo se crea el de la web** (§2) |
| Alcance | Las 622 imágenes y 82 vídeos de la web | **Ahora, solo la web** (629 imágenes y 83 vídeos en `media_asset`). La librería de 1.043 imágenes (la sirve **otra web**) y las 4 del **mailing** se quedan en Cloudinary, sin borrar, hasta que se cambie el código que las consume (§6, diferido) |
| Quién consume los medios | Solo este repositorio | Además, una web y unos correos que **no están en este repositorio** (§6, diferido) |
| Calentamiento, WebM, AVIF | «Retirar si pasa la prueba» | **Retirados.** El tratamiento previo ya entrega MP4 y WebP |
| Images de pago | «Valorar» | **Obligatorio**: el plan Free corta las transformaciones nuevas al llegar a 5.000 (error 9422) |
| Prueba de concepto | En `bckffc.com` | En un subdominio de `itsgreener.com`, cuando D1 deje la zona activa (`bckffc.com` es ajeno al proyecto) |
| Jurisdicción de R2 | «Valorar» | **UE** |

## 2. Alcance y los tres buckets

### 2.1 Inventario

| Carpeta de Cloudinary | Originales | Qué es | Quién lo usa |
| --- | --- | --- | --- |
| La web | 629 imágenes y 83 vídeos en `media_asset` (Greener contaba 622 y 82) | Todo `greener/content/**`, referenciado desde `media_asset` | Este repositorio. **Se migra ahora** |
| La librería | 1.043 imágenes | Traída de otra cuenta; no la usa esta web | **Otra web** (por identificar). **Se queda en Cloudinary de momento** |
| Los sueltos | 4 imágenes | Van en un **mailing** | Los correos (ya enviados y futuros). **Se quedan en Cloudinary de momento** |
| Defaults de Cloudinary | 57 | No son de Greener | **No se migran** |

**Cuadre con la captura de uso (4,73 K recursos menos 2,92 K derivados = 1,81 K originales):** 622 + 1.043 + 83 + 4 + 57 = 1.809. Cuadra, así que las 1.043 de la librería **no incluyen** las 622 de la web. Es una deducción de cifras, no una lista: F0 la confirma listando por carpeta y tipo con la Admin API. La base de datos da 8 filas más de las que contaba Greener (629 + 83 frente a 622 + 82); la simulación de F2 dirá si alguna no tiene archivo en Cloudinary.

**Lo que dice la base de datos el 16 de noviembre** (consultas de F0, ejecutadas por Greener):

| Tipo | Formato | Filas | Peso | Duración |
| --- | --- | --- | --- | --- |
| Imagen | WebP | 528 | 136 MB | — |
| Imagen | JPG | 100 | 36 MB | — |
| Imagen | sin formato (`null`) | 1 | — | — |
| Vídeo | MP4 | 83 | 867 MB | 2.844 s (≈ 47 min) |

Hay **0 AVIF**, así que quitarlo de las subidas no deja nada huérfano. **De los 83 vídeos, 39 superan 15 s o 15 MB y van a Stream; 14 duran más de 60 s.** Los otros 44 van a R2 con Media Transformations. Las 100 imágenes JPG no son un problema (el tratamiento previo solo da WebP desde hace poco); la fila sin formato se copia con el `Content-Type` que tenga en Cloudinary y se revisa a mano. Todo el contenido de la web son unos 1,0 GB frente a los 2,13 GB que Cloudinary cuenta en total.

### 2.2 Los tres buckets (solo el primero entra ahora)

| Bucket (nombre propuesto) | Contenido | Host público (propuesto) | Claves | Cómo se cambia el consumidor |
| --- | --- | --- | --- | --- |
| `greener-media` | La web | `media.itsgreener.com` | **Idénticas al `public_id` actual** (sin extensión), para que la base de datos no cambie | Por despliegue, con una variable de entorno (F3) |
| `greener-library` (diferido) | La librería | `library.itsgreener.com` | `public_id` + extensión original (§3, D3) | Quien mantiene la otra web cambia sus URLs (§6) |
| `greener-mailing` (diferido) | Los 4 sueltos | `mailing.itsgreener.com` | `public_id` + extensión original, y URL **permanente** | Se editan las plantillas del mailing (§6) |

Los tres, cuando existan: jurisdicción UE, `r2.dev` apagado, lectura solo por el dominio propio. **Hoy solo se crea `greener-media`**; los otros dos se crean cuando se aborde la entrega (§6), y mientras tanto no hay que decidir sus nombres. R2 no cobra por bucket (el límite es de un millón por cuenta; se paga almacenamiento y operaciones, con 10 GB-mes y millones de operaciones gratis), así que separar no cuesta nada y permite **un token de escritura por bucket**: el de la web no puede tocar la librería ni el mailing.

**Cuando llegue ese momento, los nombres de host de la librería y del mailing acabarán escritos en correos y en otra web: elegirlos bien entonces**, porque cambiarlos después obliga a repetir el cambio de URLs.

## 3. Decisiones cerradas

| # | Decisión | Por qué |
| --- | --- | --- |
| D1 | **Tres buckets públicos en la UE** como diseño final (§2.2), **solo `greener-media` ahora**. Un dominio personalizado por bucket, sobre la zona de la misma cuenta, con proxy de Cloudflare | Las transformaciones por URL (`/cdn-cgi/image`, `/cdn-cgi/media`) solo las atiende Cloudflare si el host pasa por su proxy. Es la única excepción a «DNS only» del DNS (el sitio principal sigue sin proxy) |
| D2 | **Bucket de la web: clave = `public_id` actual.** Un objeto `greener/content/abc123` se guarda con esa misma clave | `media_asset`, los pines y los carruseles no cambian, y el cambio de proveedor se deshace redesplegando. Las funciones SQL de alta y sustitución que reciben `p_cloudinary_public_id` no se tocan |
| D3 | **Librería y mailing: clave = `public_id` + extensión original** (propuesta; se confirma en F0 con el listado real). No tienen base de datos que mantener | Cloudflare solo cachea por extensión; con extensión no hace falta una regla de caché y las URLs son legibles, estables y válidas para clientes de correo |
| D4 | **Vídeo, regla de enrutado única:** `duración > 15 s` **o** `peso > 15 MB` → Stream; si no, R2 + Media Transformations. Constantes únicas `SHORT_VIDEO_MAX_SECONDS = 15` y `SHORT_VIDEO_MAX_BYTES = 15 * 1024 * 1024` (los topes que ya tiene `TOOL_PIN_VIDEO_LIMITS`) | Greener mantiene 15 s / 15 MB (corrigió el 25 MB del 16 nov). Los pines están topados en 15 s / 15 MB (tools) o 8 s / 10 MB (resto): **nunca van a Stream**. Lo que va a Stream son los vídeos de caso y de `other`, que llegan a 125 MB y 300 s y no caben en Media Transformations (entrada de 100 MB, salida de 60 s) |
| D5 | **Id de un vídeo de Stream = `stream/<uid>`** guardado en `media_asset.cloudinary_public_id`; los de R2 siguen empezando por `greener/content/`. El prefijo decide a qué proveedor se pregunta | El SQL solo exige que no esté vacío (migración `20261113100000`); la comprobación del prefijo está en TypeScript. Sin columna nueva ni cambio de funciones. Coste: los **39 vídeos que pasan a Stream** cambian de id en F3, y revertirlos exige el manifiesto (F2, punto 6); una marcha atrás son 39 `update` deterministas |
| D6 | **Registro tras «listo»:** el navegador sube a Stream por subida directa, el servidor consulta el estado, y la fila de `media_asset` se registra **cuando Stream ya da duración, medidas y peso reales** (así no hay filas en `processing` que el SQL no sabe tratar: sus funciones de alta escriben `ready`). Un webhook solo si P9 demuestra que la codificación tarda más de lo que el admin puede esperar | Stream permite un único webhook por cuenta (desarrollo y producción lo comparten). El admin está presente al subir; los huérfanos los recoge el reconciliador |
| D7 | **Imágenes con Image Transformations por URL**, sobre el contrato de tamaños congelado (`tests/unit/media/mediaContract.test.ts`: escaleras 320/480/640 y 960/1.440/1.920, escalones M/L, 480 del feed) | Mismas firmas que `cloudinaryUrl.ts`, otra sintaxis. Images de pago contratado antes del cambio |
| D8 | **Vídeo corto: Media Transformations** (MP4, 480, sin audio, póster por fotograma) a través de `media.itsgreener.com` | Sale solo MP4/H.264, que es lo que queremos; sin WebM y con una sola `<source>` |
| D9 | **Sin calentamiento, WebM ni AVIF** | El tratamiento previo entrega MP4 y WebP; AVIF como entrada de transformación es solo Enterprise. Se retiran unas 2.100 líneas de calentamiento (módulos, scripts y ganchos `after()`) |
| D10 | **Proveedor por variable de entorno** (`MEDIA_PROVIDER`), no por columna en la base de datos | Con D2 las claves coinciden: volver atrás es cambiar la variable y redesplegar. Cloudinary vivo 30 días |
| D11 | **Objetos inmutables**: sustituir un medio crea una clave nueva; `Cache-Control: public, max-age=31536000, immutable` | Las variantes no se pueden purgar una a una |

## 4. Arquitectura destino

```text
Navegador ──PUT prefirmado──► R2 UE (greener-media)          vídeo ≤ 15 s y ≤ 15 MB, imágenes
Navegador ──subida directa──► Stream                           vídeo > 15 s o > 15 MB

media.itsgreener.com    (proxy) ─┬─ /cdn-cgi/image/…  imágenes de la web
                                 ├─ /cdn-cgi/media/…  vídeo corto y póster
                                 └─ /greener/content/… original
library.itsgreener.com  (proxy) ─── original (+ /cdn-cgi/image solo con lista blanca, §6)
mailing.itsgreener.com  (proxy) ─── original / JPEG fijo, URL permanente

itsgreener.com / www    ──► Vercel   (DNS only, sin proxy)
Reproducción de vídeo largo: <video> con MP4 de Stream, sin reproductor ni analítica de terceros;
póster propio en R2 (capturado en el navegador al subir), así la página, el póster y el Open Graph salen de media.
```

## 5. Código del repositorio: qué cambia

Lo auditado hoy (16 nov, solo lectura): el módulo está aislado tras los puertos `MediaVerifier`, `MediaFileStore` y `VideoWarmer`; `cloudinaryUrl.ts` es el único fichero que conoce la sintaxis de URL de Cloudinary; `container.ts` es la raíz de composición. Por eso el riesgo es contenido.

| Zona | Ficheros | Qué cambia | Esfuerzo |
| --- | --- | --- | --- |
| Verificación de lo subido | `infrastructure/cloudinaryServer.ts` | R2 no devuelve medidas: imagen con `GetObject` (≤ 5 MB) + `validateImageFile` + lector de cabecera (JPEG/PNG/WebP); vídeo corto con `HEAD` y lectura por rango de la cabecera MP4 (`moov`). Se conserva la regla de **no inventar nunca una duración**. Para Stream, lo da su API | Alto |
| Subida | `client/cloudinaryUpload.ts`, `useMediaUpload.ts`, `app/api/admin/media/sign*`, `container.ts` | De firma de Cloudinary a URL prefirmada de R2 (`PUT`, contra el dominio S3 de la UE, no el público) y, para > 15 s o > 15 MB, subida directa a Stream. El navegador ya mide la duración (`readLocalVideoDuration`); **el servidor vuelve a decidir** con lo que lea y rechaza un «corto» que no lo sea | Medio |
| Vídeo largo | Puerto nuevo `LongVideoProvider` (crear subida, leer estado y metadatos, borrar, construir reproducción y póster) y su adaptador de Stream | Alcance: solo donde hay `<video controls>` (`CarouselVideo` en `CaseDetail` y la portada de vídeo de `other`) | Medio |
| URLs de entrega | `client/cloudinaryUrl.ts` + nuevo `cloudflareUrl.ts`, `domain/mediaDelivery.ts`, `mediaContract.test.ts` | Mismas funciones y firmas; `MEDIA_QUALITY` pasa de cadenas de Cloudinary (`auto:eco`) a un nivel neutro que traduce el adaptador; vídeo de dos `<source>` a una. El test de cadenas exactas se reescribe; el contrato de tamaños no cambia | Medio |
| Componentes | `CloudinaryImage` → `MediaImage`, `PinCardMedia`, `PinCard`, `useToolCoverVideo`, `CaseDetail`, `EpisodeDetail`, `CoverMedia`, `AdminMediaItem`, `workContent.ts`, `contentMetadata.ts` | Casi solo imports y renombrado; el prefetch y `usePinVideo` no cambian con MP4 progresivo | Bajo |
| Limpieza | `cleanupMedia.ts` (no cambia), `cloudinaryFileStore` → `r2FileStore` + borrado en Stream, `scripts/reconcile-cloudinary.mjs` → `reconcile-media.mjs` | `DeleteObject` es gratis; el reconciliador lista R2 con `ListObjectsV2` y Stream por API, y enruta cada id por su prefijo | Bajo |
| Calentamiento | `warm*` (≈ 2.087 líneas), `scripts/warm-*.mjs`, ganchos `after()` | Se retira. Las columnas `warmed_*` se quitan en una migración aparte (F4) | Ahorro |
| Configuración y seguridad | `serverEnv.ts`, `env.client.ts`, `instrumentation.ts`, `securityHeaders.ts` (+ tests), `next.config.ts`, `.env.local.example` | Variables de R2 y Stream; `NEXT_PUBLIC_MEDIA_BASE_URL` referenciada como literal para que Next la incruste. CSP: `img-src` y `media-src` al host de medios y al de reproducción de Stream; `connect-src` al endpoint S3 de la UE y al de subida directa de Stream (a confirmar en P9). `remotePatterns` ya se retiró (§2.121) | Bajo |
| Formatos | `mediaLimits.ts` (`IMAGE_LIMITS`), `imageValidationMessage.ts`, mensajes del ABM, contrato §5.2 | Quitar `avif` de lo aceptado | Bajo |
| Base de datos | `media_asset.cloudinary_public_id` y las funciones SQL que lo reciben | **Ningún cambio** (D2 y D5). Los topes de caso (300 s / 125 MB) ya están en SQL (`20261113100000`): la regla de 15 s / 15 MB es de aplicación, no de base de datos. Renombrar la columna exige recrear las funciones: opcional y al final (F4) | Nulo |
| Legal y documentos | `policyContent.ts` (4 pasajes), `cookies-inventario.md`, `consultas-asesor-legal.md`, ADR-13, contrato de medios, `PROGRESO.md` | Cambia el encargado de la entrega de medios (§10) | Medio |

`.env.local.example` es un fichero oculto: cuando cambie, se transcribe entero en la respuesta.

## 6. La librería y el mailing: entrega fuera de este repositorio (diferido)

**Decisión del 16 nov (14:00): se dejan en Cloudinary, sin borrar, y se aborda más adelante.** Nada de lo que sigue entra en F0 a F4; se conserva como diseño para ese momento. Lo único que afecta al plan actual es que **la cuenta de Cloudinary no se borra en F4** (ya no hace falta decidirlo) y que su uso baja al retirar la web: queda la librería y las 4 imágenes, con el tráfico que genere la otra web, que no conocemos.

Es la parte que el plan de octubre no tenía y la que más puede salir mal, porque **el cambio de URL lo hace alguien que no es este repositorio**.

1. **No hay interruptor por despliegue.** La otra web y las plantillas del mailing tienen las URLs de Cloudinary escritas. Cada una se cambia a mano (o con el script del propietario), con una tabla de equivalencias que genera el script de copia (`manifest.csv`: URL antigua → URL nueva). Se comprueba buscando la URL antigua en el código y en las plantillas. Cuenta como un cambio de producción más a efectos de la regla de calendario (§8).
2. **Los correos ya enviados no se pueden corregir.** Sus imágenes apuntan a Cloudinary y seguirán apuntando ahí. Con la decisión de dejar los originales en Cloudinary, ese problema **no existe hoy**; reaparecería si algún día se borra la cuenta. Conviene comprobar entonces la política de cuentas inactivas de Cloudinary.
3. **Formato del mailing.** Las 4 imágenes deben salir en **JPEG o PNG fijo**, no con `format=auto` ni en WebP. La compatibilidad de WebP en correo es desigual y las fuentes discrepan sobre Outlook de escritorio; [una de ellas](https://github.com/WordPress/performance/issues/74) señala que Outlook en Windows no lo soporta y [otra](https://blog.tinify.com/tag/jpg-to-webp) que Gmail lo convierte a JPEG (y rompe las transparencias). Si el original es WebP, se sirve una variante JPEG fija con `/cdn-cgi/image/format=jpeg/…` y esa es la URL del mailing. P10 lo prueba enviándolo a cuentas reales.
4. **URLs permanentes.** Sin parámetros que cambien, sin versionado en la ruta y con el host decidido antes de crear el bucket (§2.2).
5. **Librería: transformaciones.** Hoy la otra web puede estar pidiendo `w_…`, `f_auto`, etc. a Cloudinary. En Cloudflare cada combinación única de anchos cuenta como transformación facturable. Mientras no sepamos qué tamaños necesita, **`library.` y `mailing.` sirven solo el original**, con una regla de WAF que bloquea `/cdn-cgi/image/` y `/cdn-cgi/media/` en esos hosts. Cuando se conozca el conjunto de tamaños, se abre solo ese conjunto (lista blanca por host).
6. **CORS.** Solo hace falta en `library.` si la otra web lee las imágenes con `fetch` o en un `canvas`; un `<img>` normal no lo necesita.
7. **Qué necesito para cerrar esto:** el dominio de la otra web, cómo construye hoy las URLs de Cloudinary (¿con transformaciones? ¿desde el navegador o desde servidor?), quién la mantiene y el formato real de las 4 imágenes. Si me pasas el código que arma las URLs, escribo la función de equivalencias.

## 7. Costes (estimación, a comprobar en el panel; precios oficiales consultados el 16 nov)

| Pieza | Tarifa | Estimación mensual |
| --- | --- | --- |
| R2 (3 buckets, UE) | 0,015 USD/GB-mes con 10 GB-mes, 1 M de operaciones de clase A y 10 M de clase B gratis; sin cobro de salida. Hoy: 0,25 GB-mes | 0 USD (Cloudinary tiene 2,13 GB en total) |
| Images (transformaciones) | 5.000 únicas al mes incluidas; 0,50 USD por cada 1.000 de más. Para imágenes alojadas en R2 solo se factura «Images Transformed». Las 629 imágenes de la web por los 3 anchos de feed, 3 de ficha y 1 de OG del contrato dan, como techo, ≈ 4.400; los 44 vídeos cortos (≈ 1.000 unidades más, a 1 por segundo de salida y con varias variantes) lo acercan al cupo gratuito. La librería no cuenta: sigue en Cloudinary | 0 a 1 USD |
| Stream (vídeo largo) | 5 USD por cada 1.000 minutos almacenados (por adelantado) y 1 USD por cada 1.000 entregados; codificación y subida gratis; sin cupo gratuito | **5 USD**: los 83 vídeos suman ≈ 47 minutos, así que los 39 que van a Stream caben de sobra en un bloque. La entrega, con unos cientos de visitas, son céntimos |
| Media Transformations (vídeo corto) | Si comparte el cupo de 5.000 de las imágenes o tiene el suyo no está verificado | P8 lo mide |

Orden de magnitud total: **de 5 a 6 USD al mes** (estimación; el único cargo seguro es el bloque de Stream), frente a los 89–99 USD del plan Plus de Cloudinary (descartado por precio el 6 de octubre). Quien contrata (la dirección) necesita: **Images de pago** (comprobar en el panel si hay cuota mínima: la página de precios no da una vía de compra ni cuota fija) y **Stream** (prepago en bloques de 1.000 minutos). Las dos antes de F3. Stream hace falta antes de la prueba P9.

## 8. Fases

Regla de calendario heredada: **no coinciden en la misma semana** el cambio de `@` y `www` (D3), el cambio de proveedor de medios (F3) y la migración del correo (D4). Así un fallo tiene una sola causa posible. G = Greener, C = Claude.

| Fase | Qué | Cuándo | Depende de |
| --- | --- | --- | --- |
| DNS D0 a D4 | `docs/operaciones/dns-d2-tabla-registros.md` | En curso (D0 hecho el 16 nov) | Cambio de NS en el registrador |
| **F0** Entorno | Cloudflare sin código y prueba de concepto | Con la zona activa | D1 |
| **F1** Código | Rama del repositorio | En paralelo, tras pasar P2 y P3 | F0 |
| **F2** Copia | Script y primera pasada | Tras F1 | F0 y F1 |
| **F3** Cambio | Por despliegue (solo la web) | Al menos una semana después de D3 y de D4 | D3 estable, F2 |
| **F4** Limpieza | Retirar Cloudinary y código muerto | 30 días después de F3 | F3 estable |

### F0 — Entorno de Cloudflare y prueba de concepto (G, 0,5 a 1 día + pruebas)

1. Zona `itsgreener.com` activa (D1) en la cuenta del bucket de R2.
2. Contratar **Images de pago** y **Stream**; método de pago y alertas de uso y facturación.
3. Crear el bucket `greener-media` en la **jurisdicción UE** (los otros dos, cuando toque, §6). El endpoint S3 es `<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`; las URL prefirmadas solo valen contra ese dominio, no contra el público.
4. Dominio personalizado `media.itsgreener.com` (con proxy); `r2.dev` apagado.
5. Regla de caché «Eligible for cache» en `media.` para las claves sin extensión.
6. CORS de `greener-media`: `PUT` desde producción, preview de Vercel y `localhost`.
7. Tokens S3 **limitados al bucket**: uno de lectura y escritura para la web y otro, temporal, para el script de copia, que se revoca al terminar F2.
8. Images > Transformations activado en la zona; regla de WAF con la lista blanca de transformaciones en `media.`.
9. Stream: token de API, orígenes permitidos (`allowedOrigins`), `maxDurationSeconds` y, solo si P9 lo exige, el webhook (uno por cuenta).
10. Listado real de Cloudinary de la carpeta de la web (confirma las 629 + 83 y localiza si falta algún archivo). Las consultas de Supabase ya están ejecutadas (resultado en §2.1); falta esta, que clasifica los 39 vídeos que irán a Stream por uso, porque **los pines del feed no deberían ir a Stream**:

```sql
select kind, format, count(*) as n, round(sum(bytes)/1e6) as mb, round(sum(duration_seconds)) as seg
from media_asset group by 1, 2 order by 1, 2;

select case
         when exists (select 1 from pin_media p where p.media_id = m.id) then 'pin'
         when exists (select 1 from case_detail_media c where c.media_id = m.id) then 'carrusel_caso'
         when exists (select 1 from content k where k.cover_media_id = m.id) then 'portada_other'
         else 'sin_uso'
       end as uso,
       count(*) as n,
       count(*) filter (where m.duration_seconds > 15 or m.bytes > 15 * 1024 * 1024) as a_stream,
       count(*) filter (where m.duration_seconds > 60) as mas_de_60s,
       round(sum(m.duration_seconds)) as seg_total
from media_asset m
where m.kind = 'video'
group by 1 order by 1;
```

Si alguno de los 39 es un **pin** (posible en vídeos subidos antes de los topes actuales), no va a Stream: se recorta o se vuelve a subir dentro de 15 s y 15 MB antes de migrar, porque el feed necesita la variante de 480 de Media Transformations. Si son solo vídeos de carrusel de caso y de portada de `other`, el plan sigue tal cual.

**Pruebas (con 5 clips y 10 imágenes reales; P1 ya consta):**

| Id | Qué se comprueba | Se acepta si… |
| --- | --- | --- |
| P2 | `media.` proxificado → R2: `/cdn-cgi/image/width=480,fit=scale-down,format=auto/<clave>` con la clave **sin extensión** y con barras; también con el registro en DNS only (no debe responder `/cdn-cgi/`) | 200, `Content-Type` correcto y `cf-cache-status` coherente |
| P3 | 10 imágenes frente a Cloudinary `q_auto:eco` (referencia: −10 % a −20 % de peso medido el 7 oct), con calidad numérica y con `medium-high` y `medium-low` | Peso ≤ 1,15× el de Cloudinary sin pérdida visible en degradados y texto |
| P4 | 5 clips por `mode=video,width=480,fit=scale-down,audio=false`: peso, texto pequeño, latencia de la primera petición frente a la segunda, `206` con `Range` | Peso medio ≤ 1,5× el WebM VP9 actual; primera petición ≤ ≈ 3 s |
| P4b | Pósters por `mode=frame,time=0s,…` | Calidad y peso equivalentes a los actuales |
| P6 | Cabeceras y cookies de `media.` con `scripts/cookie-audit.mjs` | Ninguna cookie |
| P7 | Lista blanca: `width=777` debe dar 403 en `media.`; los tamaños del contrato siguen en 200. Comprobar qué permite la zona Free (número de reglas y comodines frente a expresiones regulares) | Todo como se indica |
| P8 | Panel de uso tras las pruebas: unidades contadas frente a esperadas, **y si Media Transformations comparte el cupo de 5.000 con las imágenes** | Coinciden |
| P9 | Stream: subida directa desde el navegador de un vídeo de 125 MB y otro de 300 s (CORS), tiempo hasta «listo», MP4 de `/downloads` (resolución, peso, `Range` y CORS contra un `<video>`), borrado, metadatos devueltos y copia por URL desde un original de Cloudinary | Para decidir si basta el sondeo (D6) o hace falta el webhook |
| P10 (diferida) | Mailing: variante JPEG fija de los 4 originales, enviada a cuentas de Gmail, Outlook de escritorio, Outlook web y Apple Mail | Se ven en todas |
| P11 (diferida) | Librería: URL real que usa hoy la otra web frente a su equivalente en `library.` | Mapeo definido |

**Criterio de salida de F0:** una hoja con las decisiones y los números medidos. **Si P2 o P3 fallan, no se sigue** y se replantea (alternativa del plan de octubre: Cloudflare Images alojado, ≈ 5,2 USD fijos, sin zona proxificada ni tope de 5.000).

### F1 — Código en una rama (C, 6 a 9 días; revisión de G)

Cada paso termina con la verificación estándar del proyecto (`eslint`, `tsc`, `prettier --end-of-line crlf` y `vitest`).

1. **Contrato nuevo:** `cloudflareUrl.ts` con las firmas de `cloudinaryUrl.ts`, nivel de calidad neutro, vídeo de una sola fuente MP4 y test de cadenas exactas nuevo. El contrato de tamaños no cambia.
2. **Configuración:** `serverEnv.ts`, `env.client.ts`, `instrumentation.ts`, CSP y `.env.local.example`; variable `MEDIA_PROVIDER`.
3. **Subida a R2:** `r2Server.ts` con `aws4fetch` (mucho más ligero que el SDK de AWS): prefirma, `HEAD`, `GET` por rango, `DELETE` y `LIST`; `r2Upload.ts` en cliente y rutas `sign*`.
4. **Verificación (`r2MediaVerifier`)** como en §5.
5. **Stream:** puerto `LongVideoProvider`, adaptador, ruta de estado (sondeo desde el cliente) y registro tras «listo» (D6); webhook solo si P9 lo pide.
6. **Enrutado** por `SHORT_VIDEO_MAX_*` en el navegador y revalidado en el servidor.
7. **Formatos:** AVIF fuera (comprobando antes con la consulta de F0 que no hay ninguno subido).
8. **Limpieza:** `r2FileStore`, borrado en Stream y `reconcile-media.mjs`, con tests.
9. **Componentes:** renombrados y vídeo de una sola fuente.
10. **Calentamiento** retirado.
11. **Documentación:** ADR nuevo que sustituya a ADR-13 y a §9.2, §2.N en el historial, fila en el índice, checklist de `PROGRESO.md` y el contrato de medios marcado como histórico para Cloudinary.

### F2 — Copia (C + G, 1 a 2 días)

Script `scripts/migrate-cloudinary-to-r2.mjs` (el patrón del proyecto: **simulación por defecto**, `--execute` para copiar):

1. `--bucket=media` (los modos `library` y `mailing`, guiados por el listado de su carpeta, se escriben cuando se aborde §6). La web va **guiada por `media_asset`** y revisa también lo que Cloudinary tenga de más.
2. **Excluye los 57 defaults** con una lista que la simulación enseña antes de copiar nada.
3. Descarga cada original y lo sube con la misma clave (web) o con la extensión (librería y mailing), su `Content-Type` y `Cache-Control: immutable`. Idempotente: salta lo que ya existe con el mismo peso.
4. Los **39 vídeos** de la web que superan 15 s o 15 MB van a Stream por copia desde URL (a verificar en P9); los otros 44 van a R2.
5. Comprueba recuento y bytes contra `media_asset` y contra el listado de Cloudinary.
6. Escribe un **manifiesto** (`manifest.csv`): URL antigua → URL nueva, y para los vídeos largos, `public_id` antiguo → `stream/<uid>`. Sirve para la otra web, para el mailing y para el `--revert`.
7. **No reescribe todavía ninguna fila:** los ids `stream/<uid>` se aplican en F3. Se ejecuta una vez ahora y otra justo antes del cambio.

### F3 — Cambio (G + C, 0,5 día)

1. Despliegue de preview con las variables nuevas. Matriz: feed (imagen y vídeo), ficha de tool, caso con carrusel, portada de episodio, Open Graph, ABM (subir, registrar, borrar), `prefers-reduced-motion`, Safari (rangos de vídeo) y móvil.
2. Congelar las subidas del ABM unos minutos, repetir la copia incremental, aplicar los ids `stream/<uid>` de los vídeos largos y desplegar con `MEDIA_PROVIDER=cloudflare`.
3. Vigilar 48 horas: errores 9422 (deben ser cero), 4xx en `media.`, panel de uso.
4. **Marcha atrás:** `MEDIA_PROVIDER=cloudinary` y redespliegue; si hubo vídeos largos, `--revert` con el manifiesto. Lo subido al ABM después del cambio solo existe en R2.
5. **Librería y mailing: diferido** (§6). Cuando se aborde, no se hace la semana de D3 ni la de D4.

### F4 — Limpieza (C, 1 día, 30 días después)

1. Cloudinary se deja 30 días como seguro. Después, retirar el contenido de la web de Cloudinary; **la cuenta no se borra**, porque la librería y las 4 imágenes del mailing se quedan en ella.
2. Quitar la dependencia `cloudinary`, las variables, los orígenes de la CSP y el código muerto (`warm*`).
3. Migración aparte para las columnas `warmed_*` y, solo si se quiere, para renombrar `cloudinary_public_id` (recrea las funciones y toca unos 48 ficheros: es cosmético).
4. Texto legal, inventario de cookies y lista del asesor. Repasar `PROGRESO.md`.

## 9. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Primera petición en frío de un vídeo o variante (el «vídeo roto» del contrato §3) | Medirlo en P4; si no es aceptable, un `GET` de cebado tras publicar |
| Abuso de variantes (coste o error 9422) | Lista blanca de WAF y alertas de uso (P7, F0.2 y F0.8) |
| Verificación de vídeo en servidor más débil que la Admin API | Parser de contenedor por rango con tests con clips reales; la ruta de subida es solo de administradores |
| Cookies o cabeceras de Cloudflare en los hosts proxificados | `scripts/cookie-audit.mjs` (P6) antes del cambio |
| AVIF ya subidos | Consulta de F0; convertir o excluir antes de copiar |
| Dependencia de un solo proveedor (DNS, medios y vídeo en Cloudflare; correo en Google) | Cloudinary vivo 30 días y copia periódica del bucket (hoy no hay copia de seguridad documentada) |
| Imágenes rotas en correos ya enviados | No aplica mientras la cuenta de Cloudinary siga viva (§6, diferido) |
| La otra web se rompe al cambiar de URLs | Diferido: no se cambia nada de ella ahora |
| WebP en el mailing | Diferido (§6, punto 3, y P10) |
| Stream: un solo webhook por cuenta, codificación asíncrona | Registro tras «listo» y sondeo (D6) |
| Que el cambio de medios coincida con DNS, Vercel o Workspace | Una semana de separación como mínimo |
| Safari y rangos de vídeo | `Range`/`206` en la matriz de F3 |
| La zona Free no da reglas de WAF suficientes | P7; si no basta, subir el plan de la zona |

## 10. Legal y cookies

Cloudinary aparece como encargado en `policyContent.ts` (el pasaje de IP y las listas de proveedores, transferencias y cookies), en `cookies-inventario.md` y en la lista del asesor; Cloudflare, Inc. ocupa su lugar para la entrega de medios y Stream es del mismo proveedor. Con el proxy solo en tres subdominios de medios, Cloudflare ve las peticiones de medios (IP y cabeceras habituales, como hoy Cloudinary) pero no el tráfico del sitio principal. Además: contrato de encargado (art. 28 RGPD), transferencias fuera del EEE y su amparo, la jurisdicción UE de R2 y, en el mailing, que los destinatarios cargan imágenes desde `mailing.itsgreener.com` (su IP llega a Cloudflare, como hoy llega a Cloudinary). Se añade a la lista del asesor sin abrir un documento nuevo.

## 11. Lo que sigue abierto

De Greener:

1. Quién contrata Images y Stream, y cuándo (Stream antes de la prueba P9).
2. Fechas: D1 se intenta el 17 nov si la dirección puede; D3 depende del contenido de la web y no tiene fecha; el cambio de medios, después de D3.
3. Resultado de la consulta de clasificación de los 39 vídeos de §2.1 (¿algún pin?).

Diferido (§6): dominio y código de la otra web, formato de las 4 imágenes del mailing y nombres públicos de los hosts de la librería y del mailing.

Sin verificar (los resuelve F0): que `/cdn-cgi/image` acepte claves sin extensión y con barras; si `/cdn-cgi/media` admite ruta relativa; si Media Transformations comparte cupo con las imágenes; resolución y `Range` del MP4 de `/downloads` de Stream; comodines frente a expresiones regulares en el WAF de la zona Free; si el límite de 1.200 px de AVIF afecta a la salida (hoy irrelevante: no hay AVIF).

## Fuentes

Documentación de Cloudflare consultada el 16 de noviembre de 2026: [precios de Images](https://developers.cloudflare.com/images/pricing), [precios de Stream](https://developers.cloudflare.com/stream/pricing/), [límites de R2](https://developers.cloudflare.com/r2/platform/limits) y [R2 GA](https://blog.cloudflare.com/r2-ga). Compatibilidad de WebP en correo: [WordPress Performance #74](https://github.com/WordPress/performance/issues/74) y [Tinify](https://blog.tinify.com/tag/jpg-to-webp). El resto procede del plan de octubre (documentación de Cloudflare del 26 de octubre) y de la lectura del código de este repositorio.
