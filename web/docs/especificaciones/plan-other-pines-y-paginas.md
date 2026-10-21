# Plan — `other`: pin de newsletter y páginas satélite

**Estado: plan cerrado el 15 de octubre de 2026 (revisado tres veces ese día), fases 0 a 4 hechas el 15 de octubre (§2.72, §2.73, §2.76, §2.77 y §2.78 del historial) y fase 5 el 16 (§2.79); la fase 6 (documentación final, inventario de cookies y registro) está en pausa hasta tener el visto bueno del asesor.** Sale de la auditoría del 14 de octubre (archivada en `docs/historial/historial-informes-cerrados-oct-2026.md`, informe 2), de la reunión con Greener y de las respuestas del 15 de octubre. Cuando se implemente, lo que quede vigente se traslada a `especificacion-final-formato-detalle.md` (§1, §3, §7) y este plan pasa a historial.

**Primera revisión:** la frecuencia pasa de ser un parámetro global a un campo de **cada contenido `other`**, con primera aparición aleatoria; la cookie la fija el servidor; valores confirmados (CTA «Open» —cambiado el 20 oct a «Upload your CV», §2.92, y por idioma del pin, §2.94—, frecuencia mínima 25, páginas fuera del sitemap).

**Segunda revisión:** la suscripción se gestiona **solo desde el pin**: el formulario de `/contact` deja de llevar la newsletter. No habrá página `/privacy-newsletter`: el texto legal de la newsletter es una sección de `/privacy`.

**Tercera revisión:** se mantiene la cookie propia de la newsletter. Nuevo calendario de primeras apariciones encadenadas (la primera entre el pin 10 y el 30; cada siguiente, la posición inicial de la anterior más 8-15), orden barajado de los `other` en cada visita, separación mínima de 5 pines y tope de retraso. Simulado con 20 `other` en el §13.

---

## 1. Decisiones tomadas

| Tema | Decisión |
| --- | --- |
| Qué es `other` | Dos subtipos: **newsletter** (pin formulario en el feed, sin destino ni ficha) y **página** (página satélite de Greener servida como paquete HTML) |
| Página satélite | **Paquete HTML** igual que tools e insights, en `/variety/{slug}/app`, con el menú lateral de navegación. No se hace enlace externo |
| Frecuencia | Campo **propio de cada contenido** `other`, editable en `/admin/contents/{id}/edit`: «una aparición cada N pines», mínimo **25** |
| Primeras apariciones | Los `other` se **barajan en cada visita**. El primero cae en un pin aleatorio entre el **10 y el 30**; cada siguiente, en **la posición inicial del anterior + un aleatorio entre 8 y 15**. A partir de ahí, cada uno repite cada N desde su posición inicial |
| Separación | Entre dos `other` hay siempre **al menos 5 pines** (antes 3). Si dos coinciden, el que llega después se desplaza hacia delante. Una repetición que se retrasaría más de 20 pines se omite (la primera aparición nunca) |
| Newsletter ya suscrito | Deja de salir en ese dispositivo con **cookie propia** (confirmada el 15 de octubre, §5) |
| Cerrar el pin | No lleva X. Vuelve a salir al cabo de N pines |
| Dónde aparece | Solo en la **home**: ni subhomes ni recomendaciones de las fichas |
| Texto legal | Sección **«Newsletter»** dentro de `/privacy` (Mailchimp, la cookie y la medición), enlazada desde el pin con `/privacy#newsletter`. Sin página propia |
| Formulario de contacto | **Deja de incluir la newsletter**. El pin es el único punto de alta |
| Portada de `other` | **Se retira** (columnas, restricción, RPC y bloque del ABM) |
| CTA del pin de página | Según el idioma del pin: `en` «Upload your CV», `es` «Sube tu portfolio», `ca` «Puja el teu CV»; otro idioma, inglés (era «Open» hasta el 20 oct, §2.92 y §2.94) |
| Sitemap | Las páginas satélite **no** entran |
| Encuesta | Fuera de alcance. No se prepara nada (ver §9) |

## 2. Qué cambia respecto al diseño actual

1. `other` **sale de la cuota del motor** (el 5 % de `feed_config.ratios`). Entra en el feed como *interludio* con su propio calendario por contenido. Esto resuelve O2 de la auditoría (peso desproporcionado con pocos contenidos): la presencia de cada `other` ya no depende de cuántos haya.
2. El tipo deja de tener doble sistema de medios (O3): la newsletter no tiene medios y la página usa un pin normal (imagen o vídeo) para el feed y el paquete para el contenido.
3. Ya no hay ficha `/variety/{slug}`: el pin de una página abre directamente `/variety/{slug}/app`, como los insights.

## 3. Modelo de datos

**Tabla de extensión `other_detail`** (mismo patrón que `case_detail` y `episode`):

| Columna | Detalle |
| --- | --- |
| `content_id` | PK y FK a `content`, `on delete cascade` |
| `kind` | enum nuevo `other_kind`: `newsletter` \| `page`. Se elige al crear y no cambia (como el tipo de contenido, `admin_lock_content_type`) |
| `frequency` | entero obligatorio, `check (frequency >= 25)`, defecto 100. «Una aparición cada N pines» |

Textos de la newsletter: se reutilizan `title` (titular, 80 caracteres) y `summary` (texto de apoyo, 200) de `content_translation`; sin campos nuevos. Se muestra el idioma por defecto del contenido.

No hay valor «0 = desactivado»: para retirar un `other` del feed se despublica o se pasa a borrador.

**Migraciones** (se aplican con `npx supabase db push`, en este orden, antes de desplegar el código):

1. `other_detail` + enum `other_kind`. Aborta con un mensaje claro si ya existe algún contenido `other` en producción, para decidir a mano qué hacer con él.
2. `alter type html_package_kind add value 'variety'` (en un fichero propio: Postgres no permite usar un valor de enum recién añadido en la misma transacción).
3. Paquetes y publicación: `create_html_package_version` y `publish_html_package_version` aceptan `other` de tipo `page` (`kind = 'variety'`); `publish_content` y `schedule_content` exigen al `page` un paquete publicado y al menos un pin, y a la `newsletter` solo el título.
4. Retirada de la portada: elimina `content_cover_only_for_other`, `cover_media_id` y `cover_ratio`, y las RPC `register_cover_image`, `register_cover_video` y la de borrado de portada. Antes borra cualquier `media_asset` de portada que no use nada más (mismo patrón que `20261007110000`).

**Cómo quedó la fase 1** (ficheros `supabase/migrations/20261015100000` a `20261015130000`):

- Migración 3: `publish_html_package_version` no hace falta tocarla (no distingue tipo de contenido); sí cambian `create_html_package_version`, `publish_content` y `schedule_content`. Códigos de error nuevos de la clase `ZG`: **ZG017** (el `other` no tiene subtipo, `other_kind_required`) y **ZG018** (la página no tiene ningún pin con medio, `page_pin_required`); el paquete publicado de la página sigue siendo **ZG009**. ZG011 y ZG012 (errores de portada) dejan de existir en el mapper.
- Migración 4: antes de quitar las columnas redefine `delete_pin` y `delete_content` sin mirar la portada, y conserva la protección de `og_media_id`.
- Mientras no llegue el ABM de la fase 5, un `other` creado hoy no tiene fila en `other_detail` y no se puede publicar (ZG017).
- `/variety/{slug}` sigue existiendo hasta la fase 4, pero sin medio: pinta título y resumen con `ToolInsightDetail`. (Retirado en la fase 4: ahora redirige a `/app`.)

`feed_config` no cambia. No puedo ejecutar `db push` ni `npm run db:types` desde aquí. Los tipos de `database.types.ts` los dejo editados a mano y marcados para regenerar en cuanto apliques las migraciones.

## 4. Motor del feed: interludios

**Principio.** La ronda sigue igual: precalculada, inmutable y solo con ids de pin. Los interludios se insertan **al servir cada lote**, fuera de la ronda guardada.

1. **Contador.** El cursor firmado gana un campo `served`: pines de ronda servidos en la sesión (sin contar interludios). Un cursor antiguo, sin el campo, se lee como `served = 0` (como ya se hace con `offset`).
2. **Calendario.** Las posiciones se cuentan en pines de ronda servidos (`served`); un interludio «en la posición x» se inserta justo después del pin x.
   1. **Orden.** Los `other` publicados llegan ordenados por `contentId` y se barajan con `deriveRng(seed, 'interludes', 'order')`. El orden cambia en cada visita y se mantiene durante toda la sesión.
   2. **Posición inicial.** El primero del orden: entero entre 10 y 30. Cada siguiente: posición inicial del anterior + entero entre 8 y 15. Los enteros salen de `deriveRng(seed, 'interludes', 'first' | 'step', contentId)`.
   3. **Repetición.** Cada contenido cae en `inicio + N`, `inicio + 2N`, etc., con su propia N. El calendario nominal nunca se corre: un retraso por coincidencia no desplaza las apariciones siguientes.
   4. **Qué implica.** Con K contenidos, el último llega a su primera aparición hacia el pin 20 + 11,5·(K − 1): unos 245 pines con 20 `other` (§13). Al principio de la visita salen espaciados 8-15 pines y la densidad sube sola a medida que entran las repeticiones.
3. **Inserción.** Al servir los pines en las posiciones `served … served + size`, cada aparición que cae en ese tramo se inserta justo después de su pin. El calendario se calcula **desde cero en cada petición, sin guardar estado** (unos cientos de elementos como mucho): servir en lotes de 20 o de 40 da el mismo resultado, comprobado en el prototipo (el plan calculado hasta el pin 300 es prefijo exacto del calculado hasta el 1000).
4. **Coincidencias y salvaguardas.**
   1. **Separación mínima de 5 pines** entre dos interludios consecutivos.
   2. Se ordenan todas las apariciones por posición nominal (a igual posición, por el orden barajado) y se recorren una vez: cada una cae en `max(su posición nominal, la anterior resuelta + 5)`. Es determinista y no necesita estado.
   3. **Tope de retraso: 20 pines.** Si una *repetición* acabaría más de 20 pines después de su posición nominal, se omite esa aparición y no empuja a las siguientes. La *primera aparición* nunca se omite (solo se retrasa). Sin tope, cuando hay más `other` de los que caben, la cola de retrasos crece sin límite (§13).
   4. **Techo estructural.** Con separación 5 el feed nunca supera un `other` cada 6 elementos (≈ 15-17 %), pase lo que pase en el ABM.
5. **Newsletter ya suscrita.** Sus apariciones se omiten, sin sustituirlas por otro `other`. Una página con varios pines rota entre ellos en cada aparición.
6. **Dónde.** Solo si `scope = 'home'` y la sesión no tiene `exclude_content_id` (las recomendaciones de las fichas son sesiones `home` con exclusión: así se distinguen).
7. **Quién lo sabe.** La ruta `GET /api/feed/{sessionId}` lee la cookie de la newsletter y pasa al caso de uso `newsletterSubscribed`. El catálogo cacheado (60 s) incluye los `other` publicados con su frecuencia. Cambiar la frecuencia de un contenido afecta a las sesiones abiertas en su siguiente lote.
8. **Cuota.** Los `other` dejan de entrar en el `snapshot` del motor. `generateRound` no se toca: ya trata como cero el peso de un tipo sin contenido, así que el 5 % se reparte entre los demás tipos. Se comprueba con las propiedades existentes y se retira la clave `other` del motor en una limpieza posterior.

**Módulo nuevo** `modules/feed/domain/interludes.ts`, puro, con `deriveRng` y `shuffled` de `prng.ts`, y con tests de propiedades: determinismo por semilla, el primero entre 10 y 30, cada inicio posterior entre 8 y 15 por encima del anterior (antes de desplazamientos), separación mínima de 5, retraso máximo de 20 en repeticiones, primera aparición nunca omitida, cadencia exacta de N cuando no hay coincidencias, omisión de la newsletter suscrita, y mismo resultado en lotes de 20 y de 40. El prototipo con el que se hizo el §13 sirve de base.

**Elemento del feed.** `FeedBatchItem` pasa a ser una unión:

1. `kind` de pin (el actual), con `pinId`, medio, etc. Un pin de página lleva `destination = /variety/{slug}/app` y CTA según el idioma del pin («Upload your CV», «Sube tu portfolio» o «Puja el teu CV»; antes «Open»).
2. `kind: 'newsletter'`: `contentId`, titular y texto. Su `pinId` se compone con el número de aparición (`newsletter:{contentId}:{j}`), único por aparición, para no repetir `key` en el masonry.

## 5. Pin de newsletter

1. **Componente nativo** `NewsletterPinCard`, no HTML subido ni iframe (`frame-ancestors 'none'`, `form-action 'self'`, «sin iframe»). Reutiliza `subscribeToNewsletter`: honeypot, límite por IP (30/hora), respuesta neutra de Mailchimp.
2. **Acción y contacto.** `newsletterActions.ts` vive hoy en `app/(public)/contact/` y deja de pertenecer a esa página: se mueve a un sitio neutro para que el feed la use sin romper las reglas de capas de ESLint. De `/contact` se retiran `NewsletterForm.tsx`, su CSS, la sección «Newsletter» de `page.tsx` y los estilos `.newsletter*` de `page.module.css`; el comentario de la página y los tests se ajustan (el smoke test de `NewsletterForm` se sustituye por el de la tarjeta). El evento `Newsletter Signup` queda solo con `placement: 'feed'`. **Retirada de `/contact` hecha el 15 de octubre (§2.73), antes de la fase 3** por petición de Greener; `newsletterActions.ts` se movió a `app/_actions/` en la fase 3 (§2.77), con la tarjeta del pin.
3. **Tarjeta.** Una columna, proporción **4:5**, tipografía en `cqw`, formulario mínimo (email y botón), sin pie. Se mide en Chromium en 2, 3, 4 y 6 columnas, incluido el móvil de 2 columnas (≈150 px por columna). Si el formulario no cabe, se avisa antes de cambiar la proporción.
4. **Aislada del resto del sitio.** En la propia tarjeta, antes del botón, una línea breve con el enlace a **`/privacy#newsletter`**, que es la primera capa de información: para qué se usa el email y que, al suscribirse, se guardará en ese dispositivo una cookie para no volver a mostrar el pin.
5. **Cookie `greener_newsletter`** (decisión del 15 de octubre: se mantiene).

   | Propiedad | Valor |
   | --- | --- |
   | Contenido | `1`; sin email ni identificador |
   | Quién la escribe | **La Server Action**, con cabecera `Set-Cookie`. No `document.cookie` |
   | Cuándo | Solo tras una acción real del visitante: alta nueva, ya pendiente o ya suscrito. Nunca en el éxito silencioso del honeypot |
   | Duración | **12 meses (confirmado el 15 de octubre)**. No se puede sincronizar con la suscripción: en Mailchimp dura hasta que la persona se da de baja y la web no puede saberlo (no hay login) |
   | Atributos | `SameSite=Lax`, `Secure` en https, `Path=/`, **no `httpOnly`** (el cliente la lee para filtrar el estado restaurado de `sessionStorage`) |
   | Independiente | No pertenece a la ventana de cookies ni depende de `greener_consent` |

6. **¿Cookie o almacenamiento local?** Legalmente no cambia nada: la LSSI (art. 22.2) y la política del sitio tratan igual cookies y `localStorage`. Las diferencias son técnicas: (a) la cookie viaja sola al servidor, que puede dejar de insertar la newsletter sin que el cliente tenga que acordarse de mandar un parámetro; (b) caduca por sí misma, mientras que en `localStorage` habría que guardar y comprobar una fecha; (c) en Safari, WebKit limita a 7 días las cookies creadas desde JavaScript y borra el almacenamiento local de la web tras 7 días de uso de Safari sin interacción con ella. Una cookie escrita por el servidor evita lo primero, de ahí que la fije la Server Action. Si Greener prefiere `localStorage`, es viable con un parámetro en la petición del feed y una fecha de caducidad guardada.
7. **Tras suscribirse.** La tarjeta usada muestra el mensaje de éxito (sin mover la retícula). Las demás tarjetas de newsletter ya cargadas se retiran de la lista y los lotes siguientes no las traen.
8. **Analítica.** `Newsletter Signup` con `placement: 'feed'` (solo altas nuevas, como en contacto); el tipo se vuelve a añadir a `AnalyticsEventMap`, de donde se retiró el 15 oct (§2.75) por no tener emisor. `Pin Click` para las páginas con `destinationType: 'other'`.

## 6. Página satélite (paquete)

1. **Rutas** `variety/[slug]/app/route.ts` y `variety/[slug]/app/assets/[...file]/route.ts`, copia de las de insights con `getPackage('variety', slug)`.
2. **CSP aislada.** `SANDBOXED_APP_PATTERN` de `src/proxy.ts` pasa a `(tools|insights|variety)` y el `PackageKind` se amplía con `variety`; el manifiesto acepta `kind: "variety"`.
3. **Menú lateral.** `composeToolDocument` ya lo inyecta (`SIDEBAR_WIDTH = 64`, §2.66); se comprueba que una página sin analítica de tool se compone igual.
4. **Sin ficha.** `variety/[slug]/page.tsx` se elimina; `/variety/{slug}` redirige a `/variety/{slug}/app` si es una página y da 404 si es una newsletter.
5. **Contrato.** `contrato-zip-tools-insights.md` documenta `kind: "variety"` y, como en tool e insight, exige el bloque `metadata` del manifest (título, descripción, idioma e imagen Open Graph, §2.1 del contrato, ya implementado en §2.75): una página satélite también se comparte por su URL `/variety/{slug}/app`. Se mantiene la CSP del paquete: `default-src 'self'; connect-src 'self'`. Una página satélite debe ser **autocontenida**: sus enlaces salientes se rigen por el §3 del contrato, y formularios o ATS embebidos de terceros no funcionarán. Para careers hay que confirmar con quien lo construya que cabe en esas condiciones.
6. **Pin.** Pin normal de imagen o vídeo con gancho (`label` obligatorio como hasta ahora). No desaparece al hacer clic.
7. **Sin preview de borrador.** Igual que tools e insights (limitación ya anotada en PROGRESO §4.2).
8. **Sitemap y `llms.txt`.** No se listan las páginas satélite.
9. **URL corta (añadida el 20 oct, §2.90 del historial).** `/{slug}` redirige (307) a `/variety/{slug}/app` para cualquier página satélite publicada (`src/app/(public)/[slug]/page.tsx`). Lista de slugs publicados cacheada 60 s e invalidada al publicar o despublicar (`listPublishedSlugs`); sin consulta por URL inventada. Los slugs que coinciden con una ruta de la web se rechazan al crear la página (`reservedSlugs.ts`).

## 7. ABM

1. **Alta.** «Other» ofrece dos tipos: «Pin de newsletter» y «Página satélite», con descripción. Se fija al crear.
2. **Frecuencia.** En `/admin/contents/{id}/edit`, dentro de los datos generales de cualquier `other`, un campo numérico «Frecuencia (una aparición cada N pines; mínimo 25)» con una nota: «Las primeras apariciones se reparten desde el pin 10 y se espacian 8-15 pines entre contenidos; después, cada N». Validación con zod y en la base de datos, `audit_log` e `invalidateFeedCache()` al guardar. No hay sección `/admin/feed` ni cambios en `feed_config`.
3. **Editor de newsletter:** datos generales con frecuencia y traducciones (título y texto). Sin pines, sin paquete, sin portada.
4. **Editor de página:** datos generales con frecuencia, traducciones, **paquete HTML** (`supportsPackage` incluye `other` de tipo `page`) y pines. Sin portada. Los textos «Tool o Insight» del bloque de paquete pasan a ser genéricos.
5. **Listado.** Muestra el subtipo junto a «Other».
6. **Indicador de ocupación (propuesta, pendiente de confirmar).** Un texto no bloqueante bajo el listado de `other` con la ocupación estimada del feed: la suma de 100/N de los `other` publicados (≈ 4 % con 5 contenidos de N medio, ≈ 8 % con 10, ≈ 16 % con 20) y un aviso cuando supere un umbral. Sirve para ver el efecto de publicar un `other` más sin tener que simularlo. No cambia el motor.

## 8. Texto legal y cookies

### 8.1 Sección «Newsletter» en `/privacy`

1. **Por qué hace falta texto aunque no haya cookies de terceros.** La obligación no nace de las cookies sino del tratamiento: al recoger un email para enviar la newsletter hay que informar de quién es el responsable, para qué se usa, con qué base legal, quién lo trata por cuenta de Greener (Mailchimp, con transferencia internacional), cuánto se conserva y qué derechos hay. Eso tiene que estar accesible desde el punto donde se recoge el dato. No exige página propia: basta una sección de la política, enlazada desde el pin.
2. **Dónde.** Sección con `id: 'newsletter'` en `policyContent.ts`, a la que apunta el pin con `/privacy#newsletter`. El renderizador ya pone `id` a cada encabezado. Texto **provisional en inglés**, pendiente del texto final del asesor.
3. **Contenido previsto:**
   1. Responsable (Xaga Creatividad Interactiva S.A., contacto `hi@itsgreener.com`).
   2. Qué se recoge: el email, la etiqueta «Greener Website» y el registro de consentimiento que guarda Mailchimp al confirmar.
   3. Finalidad y base legal: envío de la newsletter, consentimiento.
   4. Cómo se suscribe: doble confirmación por correo (double opt-in).
   5. Encargado del tratamiento: Mailchimp (Intuit), con transferencia internacional fuera de la UE y sus garantías.
   6. Conservación: hasta la baja; cómo darse de baja y derechos.
   7. **Almacenamiento en el dispositivo:** la cookie `greener_newsletter` (finalidad, duración, que no contiene email ni identificador y cuándo se escribe). Se añade también a la tabla de cookies propias de la política.
   8. **Medición:** el evento anónimo `Newsletter Signup` de Plausible.
4. **Sobre Plausible.** No escribe cookies ni almacenamiento (`cookies-inventario.md` §2); solo recibe un evento anónimo sin identificador. Se menciona como medición de audiencia, no como cookie, con las condiciones de la guía de la AEPD (el contrato con Plausible sigue pendiente de comprobar, `cookies-inventario.md` §5).
5. **Sobre Mailchimp.** No se carga ningún script ni formulario alojado por Mailchimp: el alta va por API desde el servidor, así que **su dominio no escribe ninguna cookie en el sitio**. Se dice así en la sección.
6. **Si finalmente no hubiera ninguna marca local**, la parte de almacenamiento (punto 7) desaparece, pero el resto de la sección se queda. Y el pin no podría dejar de salir tras suscribirse, porque sin login no hay otra forma de recordarlo.
7. **Versión del texto.** Cambiar `/privacy` obliga a subir `CONSENT_TEXT_VERSION`, y eso vuelve a mostrar la ventana de cookies a todos los visitantes que ya decidieron. Si la web aún no está abierta al público, el coste es nulo (solo lo han visto internos); si ya lo está, conviene hacerlo junto con el texto final del asesor.

### 8.2 Resto

1. **Asesor legal.** La cookie se documenta también en `cookies-inventario.md` (§2) y en `politica-cookies-cambios.md`, con finalidad, duración y por qué se considera una preferencia pedida por el propio usuario. **El criterio final es del asesor.** Plan B si exige consentimiento previo: guardarla solo si el visitante aceptó cookies; quien las rechaza vería el pin más veces.
2. **Mailchimp en `/privacy`.** Sigue sin mencionarse (PROGRESO §2.54). La sección de §8.1 lo resuelve, y como el formulario de `/contact` ya no lleva newsletter, el pin es el único punto de alta. **Bloquea publicar un `other` de newsletter** hasta que el texto esté revisado, no su desarrollo.
3. **Documentos que se actualizan:** `especificacion-final-formato-detalle.md` (§1, §3, §7, tabla de formatos), `contrato-zip-tools-insights.md`, `contrato-medios-fase-1.md` (filas de portada de `other`), `PROGRESO.md`, historial y auditoría.

## 9. Fuera de alcance

**Encuesta** (idea ilustrativa, sin código ni campos preparados): un pin formulario con una pregunta y unas opciones configuradas en el ABM, respuestas anónimas guardadas en una tabla propia y recuento de resultados para el equipo. Añadirla en el futuro supondría un valor nuevo en `other_kind`, su componente de tarjeta, una tabla de respuestas y su pantalla de resultados. Quedan por decidir entonces: tipos de pregunta, si admite texto libre (datos personales) y quién ve los resultados.

## 10. Orden de ejecución y verificación

Cada fase termina con `npm test`, `tsc`, ESLint y un zip del proyecto completo.

| Fase | Contenido | Se comprueba |
| --- | --- | --- |
| 0 | **Hecha el 15 de octubre (§2.72).** Fichas de tool e insight sin medio fuera del feed (G1 de la auditoría): usar el primer pin como respaldo en la página. **La parte de insight se revirtió el mismo día (§2.74):** `/insights/{slug}` redirige a `/app` | Test de la página sin `?pin=` |
| 1 | **Hecha el 15 de octubre (§2.73).** Migraciones 1-4, tipos de la base de datos, retirada de la portada en `src` (dominio, casos de uso, ABM, calentamiento, OG) | Tests de `other_kind`, de reglas de publicación y de que no queda código de portada |
| 2 | **Hecha el 15 de octubre (§2.76).** `interludes.ts`, cursor con `served`, unión de `FeedBatchItem`, ruta del feed con la cookie, exclusión de recomendaciones. **Aviso de despliegue:** hasta la fase 3 el cliente descarta los elementos `newsletter` (`fetchFeedBatch`), y hasta la fase 4 el pin de una página apunta a `/variety/{slug}/app`, que aún no existe: no se publica ningún `other` hasta tener las fases 3 y 4 | Propiedades de determinismo, orden barajado, inicios 10-30 y +8-15, separación 5, tope de retraso, lotes de 20 y 40 |
| 3 | **Hecha el 15 de octubre (§2.77).** `NewsletterPinCard`, acción movida a `app/_actions/`, cookie por `Set-Cookie`, retirada en cliente, analítica y sección «Newsletter» de `/privacy` (provisional; no se sube `CONSENT_TEXT_VERSION` hasta el texto del asesor). Medida en Chromium con el peor caso de texto en 2, 3, 4 y 6 columnas | Tests de componente, del flujo de cookie, de `/contact` sin newsletter y de la sección; medición en Chromium en 2, 3, 4 y 6 columnas |
| 4 | **Hecha el 15 de octubre (§2.78).** Rutas `/variety/{slug}/app` y de assets, `proxy.ts`, paquete `variety`, redirección sin base de datos (el 404 de una newsletter lo da `/app`), destino del pin, fuera del sitemap, contrato §9. **La subida de un ZIP de prueba queda para la fase 5**: sin ABM no se puede crear un `other` de tipo página | Tests de rutas, CSP, manifest, head, storage y redirección; el ZIP de prueba de extremo a extremo, con la fase 5 |
| 5 | **Hecha el 16 de octubre (§2.79).** Migración `20261016090000_other_abm.sql`, alta por subtipo, editores, campo de frecuencia. **Indicador de ocupación sin hacer** (§7.6, pendiente de confirmar) | Tests de formularios, de la validación del mínimo y de la migración |
| 6 | Documentación, inventario de cookies, política y registro | Revisión cruzada de referencias |

## 11. Riesgos y puntos abiertos

1. **Cookie, texto legal y consentimiento** (§8). Es el único punto con riesgo legal.
2. **Móvil.** Una columna de ≈150 px es justa para un formulario con enlace legal. Se mide en la fase 3 y, si no cabe, se propone una alternativa antes de cambiar nada; el masonry no admite ocupar dos columnas y no se añade soporte.
3. **No verificable aquí:** `db push`, regeneración de tipos y comportamiento real con Mailchimp. Quedan en la lista de pasos de Greener.
4. **Sesiones abiertas** durante el despliegue: conservan su ronda y cursor; el cursor antiguo se interpreta como `served = 0`.
5. **Densidad con muchos `other`.** La frecuencia es por contenido, así que la presencia total es la suma: con 20 `other` de N entre 75 y 200 llegan a ≈ 13 % del feed (uno cada 6,7 pines), más que el 5 % de cuota que había. No hay colapso, pero es el punto a vigilar (§13).
6. **Conjunto de `other` cambiante en mitad de una sesión.** El calendario se recalcula en cada petición con los `other` publicados en ese momento (catálogo cacheado 60 s). Si se publica o retira uno, el orden barajado y los inicios de los demás pueden cambiar; solo afecta a lo que aún no se ha servido y, como mucho, puede romper una vez la separación en esa sesión. No se guarda estado para evitarlo.
7. **Valores aún por confirmar:** indicador de ocupación del ABM (§7.6) y el criterio del asesor sobre la cookie (la duración de 12 meses está confirmada).

## 12. Trazabilidad con la auditoría

| Hallazgo | Cómo se cierra |
| --- | --- |
| G1 fichas sin medio | Fase 0 |
| O1 sin propósito | Dos subtipos con función definida |
| O2 peso en el feed | Frecuencia propia por contenido con arranque aleatorio; `other` fuera de la cuota |
| O3 doble sistema de medios | Portada retirada |
| O4 se publica vacío | Reglas de publicación por subtipo |
| O5 ficha sin salida ni evento | Sin ficha; `Newsletter Signup` y `Pin Click` |
| O6 pie del pin | La newsletter no lleva pie; la página conserva el gancho |
| O7-O10 portada | Dejan de aplicar al retirar la portada |
| O11 nombres | `ToolInsightDetail` sirve solo a tool e insight |

## 13. Anexo: simulación del calendario con muchos `other`

**Cómo se hizo.** Prototipo de `interludes.ts` (barajado, inicio 10-30, +8-15, repetición cada N, separación y tope de retraso) probado con vitest, fuera de `src` y borrado después. Cada fila promedia **1.000 visitas** simuladas (400 en las de tope). N de cada `other`: entero aleatorio entre 75 y 200, sorteado por visita, salvo donde se indica. Horizonte: 1.000 pines de ronda (algo más de una ronda y media). Catálogo: **150 casos** (5 pines, fuerza 1-5), **25 insights**, **50 tools** y **35 episodios** (3 pines cada uno, supuesto): `generateRound` real da una ronda de **643 pines** en todas las semillas, con 70 % casos, 18 % insights, 6,1 % tools y 5,9 % episodios (sin `other`, el 5 % se reparte). Las posiciones del calendario no dependen del catálogo, solo la longitud de la ronda.

Las cuotas se miden sobre el feed servido (pines de ronda + interludios). «Pegados» es la parte de huecos entre interludios que valen exactamente el mínimo (5).

### 13.1 Cuántos `other` hay (separación 5, sin tope)

| `other` | Suma teórica de 1/N | Cuota real | Pegados | Pines entre interludios | Vistos antes del pin 100 / 200 | Última primera aparición (media / máx) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0,8 % | 0,8 % | 0 % | 136 | 1 / 1 | 20 / 30 |
| 3 | 2,4 % | 2,4 % | 8 % | 42 | 3 / 3 | 43 / 59 |
| 5 | 3,9 % | 3,9 % | 15 % | 25 | 5 / 5 | 66 / 85 |
| 10 | 7,9 % | 7,2 % | 34 % | 12,7 | 7,5 / 10 | 124 / 152 |
| **20** | **15,8 %** | **12,8 %** | **70 %** | **6,7** | **7,5 / 16** | **245 / 288** |
| 30 | 23,6 % | 15,2 % | 91 % | 5,5 | 7,5 / 15,9 | 383 / 451 |
| 40 | 31,5 % | 15,2 % | 91 % | 5,5 | 7,5 / 15,9 | 565 / 640 |

Con 20 `other`: en cualquier ventana de 30 pines hay 4,4 interludios de media y nunca más de 6; el 65 % se desplaza respecto a su posición nominal (6,7 pines de media, p95 17, máx 39) y la cadencia real coincide con N (periodo real / N = 1,00).

### 13.2 Separación 3 (plan anterior) contra 5, con 20 `other`

| Separación | Pegados | Desplazados | Retraso medio / p95 / máx | Máx. de interludios en 30 pines |
| --- | --- | --- | --- | --- |
| 3 | 44 % | 36 % | 2,8 / 6 / 17 | **10** |
| **5** | 70 % | 65 % | 7,1 / 17 / 39 | **6** |
| 6 | 84 % | 81 % | 14,8 / 36 / 114 | 5 |

La separación de 3 deja rachas de hasta 10 interludios en 30 pines; la de 5 las corta en 6. Subir más (6) apenas gana y multiplica los retrasos.

### 13.3 Extremos con 20 `other` (separación 5, sin tope)

| Caso | Suma teórica | Cuota real | Retraso medio / máx | Periodo real / N |
| --- | --- | --- | --- | --- |
| todos N = 200 | 10,0 % | 8,8 % | 2,6 / 7 | 1,00 |
| todos N = 100 | 20,0 % | 15,5 % | 6,4 / 19 | 1,01 |
| todos N = 75 | 26,7 % | 15,7 % | **101 / 219** | **1,31** |

### 13.4 Tope de retraso de 20 pines (la primera aparición nunca se omite)

| Caso | Cuota real | Repeticiones omitidas por 1.000 pines | Retraso máx | Periodo real / N |
| --- | --- | --- | --- | --- |
| 20 `other`, N 75-200, sin tope | 12,8 % | 0 | 36 | 1,00 |
| 20 `other`, N 75-200, tope 20 | 12,7 % | 1,1 | 22 | 1,01 |
| 30 `other`, N 75-200, sin tope | 15,2 % | 0 | 199 | 1,16 |
| 30 `other`, N 75-200, tope 20 | 15,0 % | 27,6 | 25 | 1,15 |
| 40 `other`, N 75-200, sin tope | 15,2 % | 0 | 303 | 1,44 |
| 40 `other`, N 75-200, tope 20 | 15,1 % | 75,8 | 25 | 1,38 |
| 20 `other`, todos N = 75, tope 20 | 15,7 % | 52,3 | 25 | 1,02 |

### 13.5 Lectura

1. **No hay colapso.** En todas las visitas simuladas la distancia mínima entre interludios fue 5, y con 20 `other` nunca hubo más de 6 en 30 pines. El plan calculado por tramos coincide con el calculado de golpe.
2. **Con 20 `other` la presencia sí es alta**: ≈ 13 % del feed, uno cada 6,7 pines y el 70 % de los huecos en el mínimo. Si cada pantalla de escritorio enseña unos 16 pines, salen 2 o 3 `other` por pantalla. La causa no son las coincidencias sino la suma de frecuencias: cada `other` con N = 137 es un 0,7 %, y 20 suman un 15 %.
3. **El techo es ≈ 15 %**: pasado ese punto, añadir `other` no los hace salir más, solo retrasa a los demás.
4. **Sin tope, la saturación degrada mal**: con 30-40 `other` o con 20 de N = 75 la cola de retrasos crece durante toda la sesión (retraso medio de 59 a 110 pines, máximo de 199 a 303). Con el tope de 20, el retraso queda acotado y lo que sobra se omite. Con 20 `other` de N entre 75 y 200 el tope casi no actúa (1,1 omisiones por 1.000 pines).
5. **Entrada progresiva.** Con 20 `other` solo se ven 7,5 de ellos en los primeros 100 pines y los 20 hacia el pin 245 (máx 288).
6. **Qué mantiene esto bajo control**: la suma de 100/N de los `other` publicados. Hasta ≈ 10 contenidos queda por debajo del 8 %; a partir de 20 el feed se llena de interludios aunque el algoritmo funcione bien. Por eso el §7.6 propone un indicador en el ABM; un tope global duro (p. ej. porcentaje máximo en `feed_config`) sería posible, pero no se prepara sin que lo pidáis.

**Muestra** (visita `sim-7`, 20 `other`, tope 20, posiciones tras las que sale cada uno; `*` desplazado, `r` repetición): 29 · 42 · 57 · 70 · 81 · 96 · 110 · 125 · 140 · 153 · 163r · 168\* · 174 · 187 · 192\*r · 201 · 213 · 218r · 223\*r · 228\*r · 233\* · 238\* · 244 · 249\*r · 254\*r · 259\* · 264\* · 269\*r · 274r · 279\*r · 297r. Los 10 primeros salen espaciados; a partir del pin 150 empiezan a entrar las repeticiones y los huecos se estrechan.
