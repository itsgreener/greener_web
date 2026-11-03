# Plan de implementación: mejoras desde código (2 de noviembre de 2026)

**Origen.** Greener pidió (2 nov) ampliar y planificar los puntos de `docs/PROGRESO.md` §4.0 bis que Claude puede hacer ya, sin depender de nadie: formulario de contacto, SEO, `lang`, movimiento reducido en el carrusel de caso, estado activo de la barra lateral del ABM, tests del login y de `?pin=`/`slide=`, CI en GitHub Actions, tests E2E con Playwright, y dos documentos (preguntas nuevas para el asesor y tabla DNS de D2). Este plan sale de leer el código de cada punto, no de la descripción de la checklist. **No hay cambios de código en esta entrega**: es solo el plan.

**Cómo leerlo.** El §1 resume y propone un orden; del §2 al §10 hay un apartado por punto con lo que hay hoy, lo que se propone, los pasos, los tests, los riesgos y cómo se comprueba; el §11 reúne las decisiones que necesito de Greener y el §12 lo que no he podido verificar. Tamaños: **S** menos de una sesión, **M** una sesión, **L** varias sesiones.

## 1. Resumen, hallazgos y orden propuesto

### 1.1 Hallazgos que cambian el planteamiento

La lectura del código corrige cuatro de los puntos tal y como estaban escritos en la checklist:

1. **`<html lang>` fijo no es un fallo, y cambiarlo sería peor que dejarlo.** La interfaz (menú, botones, avisos, formularios) está en inglés por decisión de arquitectura (§2.4), y lo que puede estar en español o catalán es el texto de cada contenido. Lo correcto es mantener `<html lang="en">` y marcar con `lang` solo el texto que cambia de idioma (§4). Además, el layout raíz no puede conocer el idioma de la ruta, y varios layouts raíz romperían la navegación sin recarga entre feed y detalle.
2. **El carrusel de la ficha de caso no tiene movimiento que reducir.** Es un desplazamiento horizontal nativo con `scroll-snap`, sin autoplay, sin transiciones y sin scroll suave; los vídeos llevan `controls` y arrancan solo al pulsar. Lo que sí falta es el `preload` de esos vídeos (§5).
3. **Los tests de `?pin=` ya existen y `slide=` ya no existe.** `resolveDetailCover.test.ts`, `toolInsightPages.cover.test.tsx` y `pinCardLink.test.tsx` cubren `?pin=`, y `getToolPinCover` es hoy `resolveDetailCover`. No hay ningún parámetro `slide` en `src`. La laguna real es otra: el acceso a base de datos de la portada (`getPublicPinCover`) no tiene test directo (§7).
4. **Parte del formulario de contacto ya está hecha.** Las etiquetas y los mensajes de validación ya están todos en inglés y los errores de campo ya llevan `role="alert"` y `aria-describedby`. Quedan cuatro cosas reales (§2).

Además, dos hallazgos nuevos que no estaban en la checklist:

5. **Contraste del texto atenuado del ABM.** Con el gris único (§2.123), `--admin-text-muted` (#6b7180) da **4,44:1 sobre #f4f4f4**, por debajo del 4,5:1 de WCAG AA para texto normal (sobre blanco da 4,88:1, bien). Es una corrección de un valor (§6).
6. **El texto legal de `/privacy` dice una cosa que el código ya no hace.** Afirma que, si un envío falla, se guarda el mensaje de error del servidor de correo y que «puede incluir el email» de quien escribió; desde SEC-PUB-A3 (27 oct) solo se guarda un código corto (`ETIMEDOUT`, `unknown`…). La consulta 2 al asesor ofrecía justo esa alternativa más estricta. Se corrige en el documento del asesor (§9), sin tocar el texto legal por nuestra cuenta.

### 1.2 Tabla resumen

| § | Punto | Tamaño | Riesgo | Depende de | Decide |
| --- | --- | --- | --- | --- | --- |
| 2 | Formulario de contacto | M | Bajo | Nada | **Hecho el 2 nov** (fallo cerrado mantenido) |
| 3 | SEO: canonical, `x-default`, JSON-LD | M | Bajo (canonical) a medio (JSON-LD) | Host canónico (`www` o apex, D2) | **Hecho el 2 nov** (sin `VideoObject`; falta validarlo con la web desplegada) |
| 4 | `lang` por texto | S | Bajo | Nada | **Hecho el 2 nov** |
| 5 | Carrusel de caso: `preload` | S | Bajo | Nada | **Hecho el 2 nov** (sin comprobar con un caso real) |
| 6 | Barra lateral del ABM y contraste | S | Bajo | Nada | **Hecho el 3 nov** (falta que Greener vea el estilo) |
| 7 | Tests del login y de la portada de pin | M | Bajo | Nada | **Hecho el 3 nov** |
| 8 | CI en GitHub Actions | S | Bajo | Que el repositorio esté en GitHub | **Hecho el 2 nov** (falta la primera ejecución real y la regla de rama) |
| 9 | E2E con Playwright | L | Medio | CI (§8) y formulario (§2) | **Fase 1 hecha el 3 nov** (falta la primera ejecución en GitHub) |
| 10 | Documento del asesor y tabla DNS | M y S | Ninguno (no es código) | Respuesta del asesor; exportación de D0 para la tabla | **Hecho el 2 nov** (consultas 30 a 34 y tabla DNS con plantilla) |

### 1.3 Orden propuesto

1. **CI (§8). Hecho el 2 nov.** Una hora de trabajo y protege todo lo demás: cada cambio posterior pasa por lint, `tsc`, tests y build en cada subida.
2. **Documentos (§10), en paralelo. Hechos el 2 nov.** No son código y el asesor tarda en contestar; cuanto antes salgan las preguntas, antes se cierra el texto legal. La tabla DNS se rellena con la exportación de D0.
3. **Contacto (§2). Hecho el 2 nov.** Es lo que un visitante real nota.
4. **`lang` y `preload` (§4 y §5). Hechos el 2 nov,** en la misma sesión: son pequeños y tocan los mismos componentes de detalle.
5. **ABM y tests (§6 y §7). Hechos el 3 nov,** en una sesión.
6. **SEO (§3). Hecho el 2 nov.** Se escribió antes de cerrar D2; el valor del canonical depende de que `NEXT_PUBLIC_SITE_URL` sea el host definitivo, así que se comprueba al cerrar D2.
7. **E2E (§9),** al final: se apoya en el CI, en el formulario corregido y en un entorno de datos que hay que montar.

Cada entrega incluye código, tests, documentación (`PROGRESO.md`, historial) y el zip del proyecto, y se verifica como en las anteriores: Vitest, `tsc`, ESLint, Prettier con la configuración del proyecto y el test de convenciones de CSS.

## 2. Formulario de contacto

**Hecho el 2 de noviembre de 2026** (historial §2.128). Se implementó lo propuesto, con estos detalles:

- **Conservar lo escrito.** `FormActionState` gana `values` (aditivo) y `PublicField` acepta `defaultValue`, `autoComplete` y `maxLength`. La acción devuelve lo escrito solo cuando falla, recortado a la longitud máxima de cada campo. **El plan A funcionó**: el test de integración con el `useActionState` real de React 19 confirma que los valores sobreviven al reinicio, y falla si se quita el `defaultValue`; no hizo falta pasar a campos controlados.
- **Límite frente a no disponible.** `isRateLimited(): boolean` pasó a `checkRateLimit(): 'allowed' | 'limited' | 'unavailable'`. Además deja de lanzar si falta la configuración de Supabase. `unavailable` no envía (fallo cerrado), muestra «We couldn't send your message right now…» y no se anota como `rate_limited`; el motivo queda en el log del servidor.
- **Longitudes.** `contactLimits.ts` (sin zod, para que el cliente no arrastre el esquema) alimenta el esquema, el `maxLength` y el recorte. Email con máximo de 254 y mensaje de longitud propio para nombre y email.
- **Accesibilidad.** Éxito con `role="status"`, `tabIndex={-1}` y foco; error general con `role="alert"`; foco en el primer campo con error tras un fallo de validación.
- **Decisión de Greener:** se mantuvo el fallo cerrado. Cambiar al limitador compartido de Upstash sería modificar `checkRateLimit` para que, ante un error de Supabase, consulte ese limitador en vez de devolver `unavailable`.

Pendiente a mano, en una preview: enviar con un campo mal y ver que lo escrito se queda; cortar la conexión a Supabase (variable errónea) y comprobar el mensaje.

## 3. SEO: canonical, `x-default` y JSON-LD

**Hecho el 2 de noviembre de 2026** (historial §2.129). Los apartados 3.1 a 3.5 son el plan tal y como se escribió; esto es lo que cambió al implementarlo:

- **Alcance del JSON-LD.** Greener pidió las tres piezas y **sin `VideoObject`** para YouTube. `NEXT_PUBLIC_SITE_URL` ya lleva el dominio definitivo (`https://`, sin barra final), así que el canonical sale correcto desde el primer despliegue.
- **Propiedades de schema.org.** El plan decía `timeRequired` y `partOf`; el código usa `duration` (propiedad de `Episode`, en ISO 8601) y `partOfSeries` (`PodcastSeries` con el nombre del programa), que son las que define el tipo `PodcastEpisode`. El caso es un `CreativeWork` con `creator` y `publisher` `Organization` en línea; no lleva el cliente, porque schema.org no tiene una propiedad que lo describa sin forzarla.
- **Fechas.** `publishedAt` es `publish_at` si existe y, si no, `created_at`; `dateModified` es `updated_at` de la fila de contenido. Un episodio usa su fecha de emisión (`episode_date`) como `datePublished` si la tiene.
- **Un solo idioma.** Como proponía el plan, un caso o episodio con un único idioma ya **no emite hreflang** (antes emitía una entrada suelta). `x-default` solo aparece con más de un idioma y apunta a la URL en el idioma por defecto.
- **En preview** no hay canonical, ni alternativas, ni JSON-LD (la ficha es `noindex`).
- **Raíz.** Next escribe el canonical de la home como `https://<dominio>` (sin barra final) y el sitemap lo lista con barra; para el dominio raíz son la misma URL.
- **Serializador compartido.** `serializeJsonLd` (escapa `<`, U+2028 y U+2029) se extrajo a `src/lib/serializeJsonLd.ts` y lo usan `<JsonLd>` y `renderPackageHead`. Se hizo ahí y no en `jsonLd.ts` porque el `<head>` de los paquetes solo necesita la función, no el componente.
- **Test estructural.** `pagesUseMetadataBuilders.test.ts` exige que toda `page.tsx` pública con `metadata` o `generateMetadata` use un constructor y que las fijas pasen `path`. `pagesJsonLd.test.tsx` llama a las páginas del servidor y comprueba qué JSON-LD devuelven, incluido que no hay ninguno en preview (comprobado con una mutación).
- **Comprobado con el build.** `next build` con las variables de relleno y `next start`: la home, `/work`, `/contact` y `/privacy` devuelven su canonical sin parámetros aunque se pida con `?utm_source=`, y la home lleva el `@graph` de Organization y WebSite. Los casos y episodios no se pudieron servir en local (necesitan Supabase).

Pendiente: la prueba de resultados enriquecidos de Google y el validador de schema.org sobre una home, un caso y un episodio con la web desplegada.

### 3.1 Qué hay hoy

- **No hay `rel="canonical"` en ninguna página.** `buildPageMetadata` (siete páginas fijas) y `buildContentMetadata` (ficha de tool) no definen `alternates`.
- **hreflang:** solo en los casos (`buildWorkMetadata` pone `alternates.languages` con todas las traducciones publicadas) y en el sitemap. No hay `x-default`.
- **Tools, insights y páginas satélite** (`/tools|insights|variety/{slug}/app`) ya llevan canonical y JSON-LD (`Article`, `WebApplication`, `WebPage`) en el `<head>` que compone `renderPackageHead`: **quedan fuera de este punto** para no duplicar.
- No hay JSON-LD en las páginas que renderiza Next. La ficha de episodio no dispone de fecha, duración ni número: `PublicEpisode` solo trae `program`, `provider`, `embedId` y `episodeKind`. El contenido guarda `publish_at` (publicación programada), `created_at` y `updated_at`.

### 3.2 Qué se propone

**Canonical (M, riesgo bajo).**

- `buildPageMetadata` recibe `path` (obligatorio) y devuelve `alternates.canonical`; así ninguna página fija puede olvidarlo. Next lo resuelve contra `metadataBase`.
- Casos y episodios: canonical autorreferente, `/work/{slug}` en el idioma por defecto y `/work/{slug}/{locale}` en los demás (`workLocalePath` ya existe).
- Ficha de tool: `/tools/{slug}`, sin `?pin=`. Con `?preview=` (borrador, `noindex`) **no se emite** canonical.
- Las URL con parámetros (`?pin=`, `?size=20`) comparten canonical con la limpia.

**`x-default`.** En los casos con más de un idioma publicado, `x-default` apunta a la URL en el idioma por defecto, además de las entradas por idioma que ya hay. Con un solo idioma no se emite hreflang (hoy se emite una sola entrada, que no aporta nada).

**JSON-LD, en tres piezas independientes** (decide Greener cuáles):

| Pieza | Dónde | Qué lleva | Valor |
| --- | --- | --- | --- |
| `Organization` y `WebSite` | Home | Nombre, logo, `sameAs` (las redes de `navItems.ts`), URL | Alto y casi sin riesgo: es lo que consumen los buscadores para la marca |
| `PodcastEpisode` | Episodios | Título, descripción, `datePublished`, `timeRequired`, `partOf` (programa), `inLanguage` | Medio: Google no ofrece un resultado enriquecido para podcasts, otros consumidores sí lo leen |
| `CreativeWork` (o `Article`) | Casos | Título, descripción, imagen, `inLanguage`, `datePublished`, `publisher` | Medio |

`VideoObject` para episodios de YouTube **no lo recomiendo**: el reproductor está detrás del consentimiento y no está en el HTML inicial, así que Google probablemente no lo asociaría a la página (no lo he comprobado).

### 3.3 Pasos

1. Extraer `jsonLd(...)` de `renderPackageHead.ts` a `src/lib/jsonLd.ts` (ya escapa `</script>` y tiene test) y reutilizarlo.
2. `path` en `buildPageMetadata` y canonical en las siete páginas, en `buildContentMetadata` y en `buildWorkMetadata`; `x-default`.
3. Ampliar el lector público: `PublicContent` con fechas (`publish_at` si existe, si no `created_at`) y `PublicEpisode` con número, fecha y duración. Es una lectura más en el mismo `select`, sin migración.
4. Piezas de JSON-LD y su inserción en los Server Components de la home, `work/[slug]` y `work/[slug]/[locale]`. El JSON-LD es un bloque de datos: no lo bloquea la CSP ni necesita nonce.
5. Documentación.

### 3.4 Tests y comprobación

- Canonical por página, con y sin `?pin=` y `?preview=`; `x-default` y reciprocidad entre idiomas; JSON-LD parseable con las claves obligatorias y sin romper el `<script>` con un título que lleve `</script>`.
- **Test estructural:** toda `page.tsx` pública que exporte `metadata` o `generateMetadata` define un canonical, para que una página nueva no lo olvide (mismo patrón que `adminGuardStructure.test.ts`).
- Con la web desplegada: la prueba de resultados enriquecidos de Google y el validador de schema.org sobre una home, un caso y un episodio.

### 3.5 Riesgos y dependencias

- **Host canónico.** El canonical sale de `NEXT_PUBLIC_SITE_URL`: debe ser el host definitivo (`www` o apex, decisión de D2). En las previews de Vercel apunta al dominio de producción, que es lo correcto.
- Un canonical mal puesto puede desindexar páginas; por eso los tests cubren todas las variantes y el cambio sale primero sin JSON-LD.

## 4. `lang` por texto en lugar de `<html lang>`

**Hecho el 2 de noviembre de 2026** (historial §2.130). Los apartados 4.1 a 4.3 son el plan tal y como se escribió; esto es lo que cambió al implementarlo:

- **El idioma que se declara es el real, no el del pin.** El título de un pin de caso, episodio o insight sale de la traducción del idioma del pin y, si no existe, cae a la del idioma por defecto. Marcar `lang` con `pin.language` habría declarado un idioma falso en ese caso, así que `derivedFeedLanguages` devuelve el idioma de la traducción que se muestra y el feed lo lleva en `FeedPinItem.languages`.
- **Qué se marca y qué no.** Título, destacado y cuerpo de caso y episodio; título y resumen de la tool; título de cada tarjeta del feed; el nombre de la tool (traducción) y su descripción (idioma del pin); el gancho y el botón de una página satélite (idioma del pin). No se marcan el cliente, el programa, «Insights by Greener», «Use», «Read», «Watch» ni el selector de idiomas.
- **Fuera de alcance.** El `alt` de los medios y el `title` del iframe del episodio: HTML no permite un `lang` distinto en un atributo. La tarjeta de newsletter ya no pinta el titular del contenido (lleva un texto fijo en inglés).
- **Test.** `contentLang.test.tsx` (fichas, selector sin `lang`, `<html lang="en">`), `pinCardLang.test.tsx` y casos nuevos en `pinFooter.test.ts` y `feedDomain.test.ts`.

### 4.1 Qué hay hoy

`<html lang="en">` fijo en `app/layout.tsx`. El idioma de un contenido está en `PublicContent.locale` y el de cada pin en `pin.language` (`es`, `en` o `ca`), pero ningún elemento lo declara.

### 4.2 Qué se propone

Mantener `<html lang="en">` (la interfaz) y añadir `lang` a los elementos con texto de contenido: título, destacado y cuerpo de caso, episodio y tool; y el texto de cada tarjeta del feed, con el idioma del pin. Es lo que pide WCAG 3.1.2 (idioma de las partes) y lo que usan los lectores de pantalla para cambiar de voz. El selector de idiomas (`ES EN CA`) y el resto de la interfaz no se tocan.

**Alternativas descartadas.**

- *`<html lang>` dinámico:* el layout raíz solo ve la ruta por una cabecera añadida en el proxy, y para `/work/{slug}` en el idioma por defecto habría que consultar la base de datos en cada petición, también con borradores; y sería inexacto, porque la interfaz sigue en inglés.
- *Un layout raíz por zona:* cambiar de layout raíz obliga a recargar el documento y rompería la persistencia del feed al ir al detalle y volver (el `FeedProvider` vive en `app/(public)/layout.tsx`, arquitectura §24.3).

### 4.3 Pasos y tests

1. `lang` en `CaseDetail`, `EpisodeDetail` y `ToolInsightDetail` (el bloque de texto) y en el texto de `PinCard` con `pin.language` (el campo ya llega en el modelo de lectura del feed).
2. Tests con RTL: un caso en `es` marca su título con `lang="es"`; un pin `ca` marca su texto; el selector de idiomas no lleva `lang`; `<html>` sigue en `en` (el layout).
3. Actualizar PROGRESO §4.3 (el punto pasa a «resuelto como decisión»).

**Tamaño S.** Riesgo bajo: es un atributo; el único cuidado es no marcar la interfaz como si fuera contenido.

## 5. Carrusel de la ficha de caso: `preload` de los vídeos

**Hecho el 2 de noviembre de 2026** (historial §2.130), tal y como se proponía, con dos precisiones: «primera diapositiva» es la primera del carrusel, no el primer vídeo (si abre con una imagen, ningún vídeo precarga), y el valor se calcula con `useMotionPreferences` (`save-data`, 2G o `downlink` bajo → `none`); `prefers-reduced-motion` no interviene. Con el renderizado en servidor el `preload` sale como `metadata` en la primera diapositiva y se corrige a `none` justo tras hidratar si el visitante ahorra datos: puede que el navegador haya pedido ya los metadatos de ese primer vídeo. **Sin comprobar con un caso real**: Greener aún no tiene ninguno; `caseCarouselPreload.test.tsx` cubre los casos con `matchMedia` y `navigator.connection` simulados.

### 5.1 Qué hay hoy

`.carousel` es un `overflow-x: auto` con `scroll-snap`. Sin autoplay, sin `scroll-behavior: smooth`, sin transiciones propias (y las del sitio ya pasan a 0 ms con `prefers-reduced-motion`, `--transition` en `globals.css`). Los vídeos (`CarouselVideo`) llevan `controls` y `poster`, sin atributo `preload`: lo decide el navegador.

### 5.2 Qué se propone

Dejar claro que `prefers-reduced-motion` no aplica aquí (se documenta y se cierra) y cubrir lo que sí queda de §9.3 (`save-data`): `CarouselVideo` usa `useMotionPreferences()` y pone `preload="none"` con `save-data` o conexión lenta; sin esas condiciones, `preload="metadata"` en la primera diapositiva y `preload="none"` en las demás (no se ven hasta que el visitante desliza). Con póster y controles, `none` no deja ningún hueco visible.

### 5.3 Pasos y tests

1. `CarouselVideo` con el `preload` calculado (necesita ser un componente cliente: ya lo es, `CaseDetail` lleva `'use client'`).
2. Test nuevo en `tests/unit/detail/` con `matchMedia` y `navigator.connection` simulados (mismo enfoque que `toolCoverVideo.test.tsx`): primera diapositiva `metadata`, siguientes `none`, `save-data` todo `none`.
3. PROGRESO §4.3 y historial.

**Tamaño S.** Riesgo bajo; lo único notable es que quien pulse play en una diapositiva posterior espera un instante más con el póster visible.

## 6. Barra lateral del ABM: ruta activa y contraste

**Hecho el 3 de noviembre de 2026** (historial §2.131). Los apartados 6.1 a 6.3 son el plan tal y como se escribió; esto es lo que cambió al implementarlo: `AdminNavLink` vive en `src/components/admin/AdminNavLink/` y recibe la clase desde `AdminShell` (que sigue siendo de servidor); la regla de coincidencia es una función exportada, `isActiveAdminRoute`, para probarla sola. El indicador es una barra de 3 px con `--color-cta` (a la izquierda; abajo a 900 px o menos) y el icono de la ruta activa también se pinta con `--color-cta`; el radio usa `--radius-pill` porque `cssConventions` no admite radios en píxeles. `--admin-text-muted` pasa a #686d7b. El test de contraste lee los colores de `globals.css` y `admin.css` (no los copia) y cruza los cuatro tokens de texto con los dos fondos, más `--color-error` sobre blanco. Queda a ojo de Greener el estilo de la ruta activa, que #686d7b no desentone y la caja gris de «Estado».

### 6.1 Qué hay hoy

`AdminShell` es un Server Component con los cuatro enlaces en una constante, sin saber la ruta. Los estilos `.link` tienen `:hover` y `:focus-visible`, pero nada para la ruta actual.

### 6.2 Qué se propone

- **Ruta activa.** Un componente cliente mínimo, `AdminNavLink`, que usa `usePathname()` y marca `aria-current="page"`. Regla: `/admin` solo coincide exacto (Panel); los demás, por prefijo con límite de segmento (`/admin/contents` y `/admin/contents/…` sí, `/admin/contents-old` no). El estilo se engancha al atributo (`&[aria-current='page']`), de modo que lo visual y lo semántico no pueden separarse, con tokens (`--color-surface`, `--color-text`) y un indicador con `--color-cta`; a 900 px o menos, la barra va en fila y el indicador pasa abajo. `AdminShell` sigue siendo de servidor.
- **Contraste.** Valores medidos el 2 nov (WCAG 2.x):

| Texto | Sobre #ffffff | Sobre #f4f4f4 | Veredicto AA (4,5:1) |
| --- | --- | --- | --- |
| `--admin-text-secondary` #575d6b | 6,60 | 6,00 | Cumple |
| `--admin-text-muted` #6b7180 | 4,88 | **4,44** | **No cumple sobre el gris** |
| `--color-text` #111111 | 18,88 | 17,17 | Cumple |
| `--color-cta` #1941f5 | 6,74 | 6,13 | Cumple |
| `--color-error` #c0392b | 5,44 | — | Cumple |

Propuesta: oscurecer `--admin-text-muted` a **#686d7b** (4,70:1 sobre el gris, 5,17:1 sobre blanco), un cambio casi imperceptible. Queda un test que calcula la razón de contraste de cada par de tokens de texto con cada fondo y falla por debajo de 4,5, para que la paleta no vuelva a salirse sin aviso.
- **Caja gris de «Estado» en las rejillas del editor:** se mira a ojo con Greener cuando esté el estilo activo; no la toco antes.

### 6.3 Pasos y tests

1. `AdminNavLink` (cliente) y `AdminShell` que lo usa; estilo en `AdminShell.module.css`.
2. Test: Panel activo solo en `/admin`; Contenidos en `/admin/contents/123`; Talent en `/admin/talent/upload`; ninguno en `/admin/contents-old`; `aria-current` presente solo en uno. `adminShell.test.tsx` pasa a simular `next/navigation`.
3. Token de texto y test de contraste (en `tests/unit/shared/`, junto a `cssConventions.test.ts`).
4. PROGRESO.

**Tamaño S.** Riesgo bajo. **Comprobación a ojo (Greener):** el estilo de la ruta activa y que #686d7b no desentona.

## 7. Tests del login del ABM y de la portada de pin

**Hecho el 3 de noviembre de 2026** (historial §2.131), tal y como se proponía, sin cambiar el código probado y sin hallazgos que anotar. Se añadió, por encima de lo previsto, que un segundo intento limpia el error anterior, y para `getPublicPinCover` un caso de pin cuyos medios son todos nulos. Con mutaciones sobre el código (quitar el filtro por `content_id`, invertir el orden de `slide_order`, no saltar los medios nulos, no reactivar el botón, no limpiar el error previo, no registrar con `console.error`) cada una hace fallar un test.

### 7.1 Estado real

- **Login (`app/admin/(auth)/login/page.tsx`):** no hay ningún test de la página (el callback sí: `authCallback.test.ts`).
- **`?pin=`:** cubierto (`resolveDetailCover.test.ts`, `toolInsightPages.cover.test.tsx`, `pinCardLink.test.tsx`). **`slide=`:** no existe en el código.
- **`getPublicPinCover` (acceso a datos):** sin test directo. Es la pieza de seguridad de `?pin=` («no se puede inyectar el medio de otro contenido»): filtra por `content_id` y elige el primer medio por `slide_order`. Acepta un cliente inyectable, así que se prueba sin base de datos.

### 7.2 Qué se propone

1. **`adminLoginPage.test.tsx`** (RTL, `createClient` y `useSearchParams` simulados): se ve el título y el botón; al pulsar, se llama a `signInWithOAuth` con `provider: 'google'` y `redirectTo` `…/auth/callback?next=/admin`; mientras tanto, el botón queda desactivado con «Conectando con Google…»; si devuelve error, aparece el mensaje, se registra con `console.error` (silenciado en el test) y el botón se reactiva; `?error=unauthorized` y `?error=oauth` muestran su mensaje con `role="alert"`; un código desconocido no muestra nada.
2. **`publicPinCover.test.ts`** con un cliente falso: consulta con `id` y `content_id`; sin fila o con error devuelve `null`; ordena por `slide_order` y salta medios nulos; pin sin medios devuelve `null`.
3. **Corregir la checklist:** quitar `slide=` y `getToolPinCover`, que ya no existen.

**Tamaño M.** Riesgo bajo; son tests sobre código que no se modifica. Si salta algo, se anota como hallazgo en lugar de arreglarlo a la vez.

## 8. CI en GitHub Actions

**Hecho el 2 de noviembre de 2026.** Descrito en `docs/operaciones/ci.md`; ficheros `.github/workflows/ci.yml` y `.github/dependabot.yml`; test `tests/unit/shared/ciWorkflow.test.ts`. Lo que cambió respecto a lo planeado:

- **Cuatro trabajos, no tres.** `checks` (lint, tipos y tests), `build`, `audit` y `format`. El formato va aparte y **sin bloquear** (`continue-on-error`): con el `.prettierrc` y el `.prettierignore` reales, `npm run format:check` marca hoy unos 25 ficheros (17 documentos, cinco scripts y los tipos generados de Supabase), y un trabajo que falla desde el primer día se ignora. Pasarlo a bloqueante está explicado en el §3 de `ci.md`.
- **El build necesita cinco variables de relleno, no tres:** además de `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `NEXT_PUBLIC_SITE_URL`, `SUPABASE_SECRET_KEY` (la exige `env.ts`) y `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (la exige `env.client.ts`). Se descubrió ejecutando el build, que falló dos veces antes de pasar. Sin secretos reales.
- **Auditoría semanal** (lunes, 06:17 UTC) además de en cada subida; solo corre el trabajo `audit`.
- **Acciones fijadas por SHA** (`actions/checkout` v7.0.1 y `actions/setup-node` v7.1.0, comprobadas contra sus repositorios), `permissions: contents: read`, `concurrency` y tiempos máximos. Dependabot semanal para npm (menores y parches agrupados; sin subidas mayores de Next, React, React DOM ni TypeScript) y para las acciones.
- **Comprobado en local:** `actionlint` limpio, YAML válido, `npm audit --omit=dev --audit-level=high` sale con 0, `next build` con las cinco variables termina bien, y el test nuevo vigila que cada `npm run` del flujo exista, que las acciones sigan por SHA, que el Node salga de `.nvmrc` y que el build no use secretos.

**Pendiente de Greener** (§4 de `ci.md`): subir `.github/` al repositorio, probar con una PR, proteger la rama principal exigiendo los tres trabajos bloqueantes, y confirmar el nombre de la rama (el flujo vigila `main` y `master`). **No he podido verificar** el flujo en GitHub desde aquí; la primera ejecución real es la prueba definitiva.

## 9. Tests E2E con Playwright

### 9.1 Qué hay hoy

- `playwright` ya es dependencia de desarrollo (`^1.64.1`), pero solo lo usan los scripts `cookie-audit*.mjs`. No hay carpeta de E2E.
- Los criterios de §20.1 están cubiertos **a nivel de dominio** por los tests de propiedad (`tests/property/feed`: determinismo, terminación, conservación de pines, separación mínima). Lo que no cubre nada es el comportamiento en navegador: recargar con otra seed, volver desde un detalle conservando orden y posición (`FeedProvider` + `sessionStorage`), y el scroll largo.
- Varias comprobaciones manuales del §4.2 (scroll largo, orden del feed, ventana de cookies, episodio sin consentimiento) son automatizables.
- Vitest recoge `tests/**/*.test.ts(x)`: los E2E irán en `e2e/*.spec.ts` para que no se mezclen.

### 9.2 El problema de fondo: los datos

La web lee de Supabase, así que un E2E necesita una base con contenido. Opciones:

| Opción | Ventajas | Inconvenientes |
| --- | --- | --- |
| **A. Supabase local en el CI** (`supabase start` con Docker; migraciones y `seed_demo_data.sql`) | Reproducible, gratis, aislada de producción; además prueba que las 58 migraciones aplican desde cero; el buzón incluido (Inbucket) sirve de destino SMTP | Descarga de imágenes (unos minutos), ruido de `pg_cron`, primera puesta en marcha con sorpresas |
| B. Proyecto de Supabase de pruebas en la nube | Más simple de arrancar | Estado compartido, claves en el CI, y los planes gratuitos limitan el número de proyectos |
| C. Contra la preview con la base real | Cero montaje | Sin aislamiento, ensucia datos reales: no lo recomiendo |

**Recomendación: A.** Las imágenes de demo apuntan a Cloudinary con identificadores que no existen: el test intercepta `res.cloudinary.com` y responde un PNG mínimo (sin red externa). Plausible no se configura y Upstash cae a memoria.

### 9.3 Casos de la primera tanda

| Id | Caso | Cómo se comprueba |
| --- | --- | --- |
| E1 | Primera carga del feed | 40 pines (20 en móvil con `?size=20`); sin errores en consola |
| E2 | Misma seed, misma secuencia | Dos peticiones a `/api/feed/sessions` con la misma cookie de visitante devuelven la misma sesión y los mismos lotes |
| E3 | Recargar con otra seed | Un contexto de navegador nuevo ve otro orden en los primeros 20 pines |
| E4 | Volver desde un detalle | Orden de los pines idéntico, scroll ±2 px y ninguna petición nueva al feed |
| E5 | Scroll largo | Recorrer 12 o más lotes: 0 *spacers* visibles en todo el trayecto y claves de pin sin duplicar |
| E6 | Consentimiento | Primera visita muestra la ventana; un episodio sin aceptar no hace ninguna petición a YouTube ni a Spotify; tras aceptar y pulsar play, el reproductor carga (con la petición interceptada) |
| E7 | Contacto | Un error conserva lo escrito (§2); el envío correcto llega a Inbucket |
| E8 | Paquete de tool | `/tools/{slug}/app` da 200 con su CSP; un `.svg` del paquete lleva la CSP `sandbox` |

El ABM no se prueba en E2E (el acceso es OAuth de Google); queda en los tests unitarios.

### 9.4 Fases

1. **Prueba de viabilidad (medio día a un día):** `supabase start` en el CI, aplicar migraciones y datos, arrancar la web y pasar un único test (E1). Es aquí donde puede aparecer lo imprevisto y lo que decide si la opción A es viable.
2. **Feed (E1 a E5).**
3. **Consentimiento, contacto y paquetes (E6 a E8).**
4. **Ampliar:** proyecto móvil y WebKit (Safari), y una ejecución nocturna.

Servidor de pruebas: `next build` y servir la compilación, no `next dev`, para parecerse a Vercel. Como el proyecto usa `output: 'standalone'`, hay que comprobar al empezar si `next start` sirve bien o hay que arrancar `.next/standalone/server.js` copiando los estáticos.

### 9.5 Riesgos y límites

- **No puedo ejecutar la fase 1 en este entorno:** hay cliente de Docker pero no hay demonio (comprobado el 2 nov: no conecta con `docker.sock`), así que no se puede arrancar el contenedor de Supabase. Los tests se escriben y se validan en el primer CI real o en una máquina de Greener con Docker.
- Los E2E de scroll son propensos a falsos fallos: se escriben con esperas sobre el estado (no sobre el tiempo) y se repiten una vez en el CI.
- Coste: cada ejecución añade varios minutos de CI; corre en las subidas a la rama principal y de noche, no en cada commit.

**Tamaño L** (de tres a cinco sesiones). Decisiones de Greener: aceptar Docker local en el CI y los minutos de GitHub Actions que consuma.

### 9.6 Estudio del montaje con Docker (3 nov 2026)

**Fase 1 hecha el 3 nov (historial §2.135).** Se ha montado todo y se ha validado hasta donde se puede sin Docker: ver `docs/operaciones/e2e.md`. Lo que salió al montarlo está en el historial: el orden de las migraciones (`admin_allowed_domain`), el seed de demo (`show_as_carousel`, `alt` de `case_detail_media`), que `supabase/config.toml` se genera con la CLI y que E1 pasa contra PostgreSQL 17 y PostgREST 14.15 con la compilación de producción. Lo que sigue pendiente es la primera ejecución real en GitHub (paso 1 de la tabla) y los pasos 2 a 4.

**Respuesta corta: lío medio, casi todo concentrado en la primera puesta en marcha.** «Con Docker» aquí solo significa que la CLI de Supabase levanta sus propios contenedores (base de datos, API, Storage, login): no hay que escribir ningún `Dockerfile` ni `docker-compose`, y los runners de GitHub ya traen Docker. Greener no necesita Docker en su máquina salvo que quiera lanzar los E2E en local. Una vez montado, el mantenimiento es bajo: lo que cuesta cada semana son los tests de scroll, no la infraestructura.

**Lo que he comprobado en el código (3 nov), y que cambia el plan:**

1. **`supabase/seed_demo_data.sql` está desfasado.** Tiene 231 inserciones que usan `show_as_carousel`, una columna que borró la migración `20261007120000`; aplicarlo tal cual fallaría. El generador (`scripts/generate-demo-data.mjs`) sí está al día (inserta `pin` sin esa columna): basta volver a ejecutarlo (`node scripts/generate-demo-data.mjs`) y revisar el resultado. Lo que no puedo saber sin una base de datos es si el resto de columnas y restricciones encajan con las 58 migraciones: lo dirá la fase 1.
2. **No existe `supabase/config.toml`.** La CLI lo exige (`supabase init` lo crea). Habrá que añadirlo con el proyecto, el puerto de la base de datos, la versión de PostgreSQL (la de producción: se mira en Settings → Infrastructure del proyecto de Supabase) y la lista de semillas (`seed.sql` y `seed_demo_data.sql`). El README ya habla de `supabase db reset`, que sin ese fichero no funciona.
3. **El build de los E2E tiene que ser propio.** Las variables `NEXT_PUBLIC_*` (URL y clave pública de Supabase, host de Cloudinary, `NEXT_PUBLIC_SITE_URL`) se incrustan al compilar, así que el trabajo `build` de CI (con valores de relleno) no sirve: los E2E compilan otra vez apuntando a la Supabase local. Son unos dos o tres minutos más.
4. **Variables que hacen falta** (`src/lib/env.ts`, `serverEnv.ts`): URL, clave pública y clave secreta de Supabase (las imprime `supabase status -o env`; el formato exacto de las claves de la CLI actual se confirma en la fase 1), `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, las siete variables de SMTP del contacto (apuntando a un receptor de pruebas) y `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` con cualquier valor. Plausible y Upstash son opcionales y sin ellas la web funciona (los límites caen a memoria y `instrumentation.ts` lo avisa).
5. **Servidor:** `output: 'standalone'` obliga a copiar `public/` y `.next/static/` junto a `.next/standalone/server.js` (como en `despliegue.md`). Hay que comprobar al empezar si `next start` sirve bien con esa opción; si no, se arranca el `server.js`.
6. **Cookies `secure` en producción** (`visitorCookie.ts`, `sessionCookies.ts`): Chromium las acepta sobre `http://localhost`; WebKit puede no hacerlo. No afecta a la primera tanda (solo Chromium) pero sí al proyecto WebKit de la fase 4: se decide entonces (certificado local o una variable de prueba).
7. **El seed solo tiene casos y episodios, no tools.** Para E8 hay que fabricar el paquete: el servidor lee la versión publicada (`html_package.current_version` con `storage_path`, `manifest` y `checksum`) y sirve los ficheros ya extraídos del bucket `html-packages`, así que el montaje es filas más ficheros subidos con la clave secreta, no solo un ZIP. Es la parte más laboriosa de los casos y por eso va la última.
8. **`pg_cron`:** dos migraciones ejecutan `create extension pg_cron with schema extensions`. La imagen de PostgreSQL de Supabase lo incluye, así que debería aplicar; es el primer sospechoso si la fase 1 falla en la migración 20260922090000.
9. **Login (GoTrue) se deja encendido** aunque el ABM no se pruebe: `auth.jwt()` aparece 84 veces en las migraciones (políticas y funciones) y no he comprobado si `updateSession` llama a GoTrue en visitas anónimas; apagarlo ahorraría poco y arriesga un falso fallo.
10. **El test `ciWorkflow.test.ts` solo lee `ci.yml`.** El flujo nuevo (`e2e.yml`) necesita su propia comprobación equivalente (acciones fijadas por SHA, sin `secrets.`, permisos de solo lectura) o se amplía ese test a `.github/workflows/*.yml`.

**Qué se añade al repositorio**

| Pieza | Para qué |
| --- | --- |
| `supabase/config.toml` | Configuración de la CLI (puntos 2 y 1) |
| `supabase/seed_demo_data.sql` | Regenerado con el generador |
| `@playwright/test` (misma versión que `playwright`, `1.64.1`) | El ejecutor de tests: hoy solo está la librería `playwright` |
| `e2e/playwright.config.ts` | Servidor web (`webServer`), proyecto Chromium de escritorio, reintento y trazas en el CI |
| `e2e/fixtures/` | Imagen mínima que sustituye a `res.cloudinary.com`, ayuda de consentimiento, paquete de tool (E8) |
| `e2e/specs/*.spec.ts` | Los casos E1 a E8 (§9.3) |
| `e2e/support/smtpSink.ts` | Receptor SMTP mínimo en Node para E7, sin Docker (el contacto envía con `nodemailer`; se lee lo recibido). Evita depender del puerto SMTP de la CLI |
| `scripts/e2e-env.mjs` | Lee `supabase status -o env` y compone las variables del build y del servidor |
| `scripts/e2e-serve.mjs` | Copia `public/` y los estáticos y arranca el servidor |
| `package.json` | Scripts `e2e:db` (arranca y siembra), `e2e:build`, `e2e` y `e2e:down`; la CLI se usa con `npx supabase` y versión fija (ya es como la usa el README) |
| `.github/workflows/e2e.yml` | El trabajo de CI (abajo) |
| `docs/operaciones/e2e.md` | Cómo ejecutarlos en local y qué hacer cuando fallan |

Vitest solo recoge `tests/**` y `tsconfig.json`, ESLint y Prettier ya cubren carpetas nuevas, así que `e2e/` no choca con lo existente; hay que añadir `e2e/` al `include` de `tsconfig.json` para que `npm run typecheck` también lo revise.

**Trabajo de CI (`e2e.yml`).** Se lanza en las subidas a `main`, cada noche y a mano (`workflow_dispatch`), no en cada pull request. Pasos: `checkout`, Node desde `.nvmrc`, `npm ci`, instalar la CLI de Supabase (acción oficial fijada por SHA), `supabase start` excluyendo lo que no se usa (`studio`, `realtime`, `edge-runtime`, `logflare`, `vector`, `imgproxy`, `postgres-meta`, `mailpit`, `supavisor`; la CLI admite `-x`), exportar las variables, `npm run build` con ellas, instalar Chromium de Playwright (con caché), `npx playwright test`, subir el informe y las trazas si algo falla y `supabase stop`. Tiempo estimado: de 8 a 12 minutos por ejecución (arranque de Supabase 2-3, build 2-3, Chromium 1, tests 3-5).

**Pasos y tamaños**

| # | Paso | Tamaño | Qué lo hace arriesgado |
| --- | --- | --- | --- |
| 1 | Viabilidad: `config.toml`, seed regenerado, scripts, `e2e.yml` solo manual, un test (E1) | 1 sesión + 2 a 4 vueltas de CI | Es donde salen las sorpresas (puntos 1, 8, 5). **No puedo ejecutarlo aquí** (sin demonio de Docker): cada intento es una ejecución manual en GitHub o una en tu máquina con Docker, y me pegas el registro |
| 2 | Feed: E1 a E5 | 1 sesión | Falsos fallos del scroll: esperas sobre estado, no sobre tiempo, y un reintento |
| 3 | E6 (consentimiento) y E7 (contacto) | 1 sesión | Interceptar YouTube y Spotify sin red real; el receptor SMTP |
| 4 | E8 (paquete de tool) y activar `e2e.yml` en `main` y de noche | 1 sesión | El montaje de filas y ficheros (punto 7) |
| 5 (opcional) | Móvil, WebKit y nocturna ampliada | 1 sesión | Cookies `secure` (punto 6) |

Total: de **cuatro a cinco sesiones**, de acuerdo con la estimación L de la tabla del §1.2; la incertidumbre está en el paso 1.

**Coste en minutos de GitHub Actions.** Con unas 10 min por ejecución y entre 30 y 60 ejecuciones al mes (subidas a `main` más la nocturna), son de 300 a 600 min al mes. Si el repositorio es público no cuenta; si es privado, el plan gratuito incluye 2.000 min al mes en Linux (conviene mirarlo en Settings → Billing). Los E2E no restan nada al CI normal, que sigue por separado.

**Alternativas descartadas.** Montar a mano PostgreSQL y PostgREST en un `docker-compose`: más trabajo, y no reproduce Storage ni las funciones de `auth`. Simular Supabase con un servidor falso: las lecturas se hacen desde el servidor de Next, no desde el navegador, así que habría que reimplementar la API REST. Un proyecto de Supabase en la nube dedicado a pruebas: la opción B de §9.2, más simple pero con estado compartido y claves en el CI.

**Decisiones de Greener (3 nov 2026)**, contestadas a las cinco preguntas de abajo: 1) los E2E corren **de noche y a mano**, no en `main` ni en pull request; 2) **solo en el CI**, sin ejecución en local; 3) la base de datos de producción es **PostgreSQL 17.6.1.155** (PostgREST 14.15, Auth 2.197.0), así que `major_version = 17`; 4) el repositorio es **privado** (unos 300 min al mes, dentro de los 2.000 del plan gratuito); 5) **hay tools reales** y aún no hay casos: E8 entra en esta tanda. Tampoco hace falta añadir `e2e/` al `include` de `tsconfig.json`: ya cubre `**/*.ts`.

**Preguntas originales**

1. ¿Disparo en `main` y de noche (propuesto), o también en cada pull request?
2. ¿Quieres poder ejecutarlos en tu máquina (Docker Desktop, unos 7 GB de RAM libres según la CLI) o basta con el CI?
3. ¿Qué versión de PostgreSQL tiene el proyecto de Supabase en producción?
4. ¿El repositorio es público o privado (para los minutos)?
5. ¿E8 (paquete de tool) en esta tanda o se aparca hasta que haya tools reales?

## 10. Documentación: asesor y DNS

**Hecho el 2 de noviembre de 2026**, con estas decisiones de Greener: Vercel se configurará para desplegar dentro de la UE; los archivos se siguen gestionando íntegramente en Cloudinary y Cloudflare solo gestiona el dominio (si eso cambia, se vuelve a preguntar); los subdominios `tools.` e `insight.` se apagan; no se mencionan proveedores de vídeo ni de almacenamiento nuevos; la foto de los DNS la hace Greener.

### 10.1 Preguntas para el asesor

En lugar de un documento aparte, se actualizó `docs/cookies-y-privacidad/consultas-asesor-legal.md`, para que Greener pueda enviar todo junto cuando el asesor conteste: consultas **1, 2, 3, 4, 9 y 17** puestas al día y consultas **30 a 34** nuevas (Vercel con funciones en la UE, correo por Google Workspace, Cloudflare solo para el DNS, baja de Dinahosting y fin de los subdominios, y cuándo se actualiza `/privacy`). Dos hallazgos de la revisión: la tabla del formulario ya solo guarda un código técnico de error (no el mensaje), así que `/privacy` describe más de lo que se hace (consulta 2); y el detalle completo del fallo sí va al registro del servidor (consulta 30). Ver también el cambio de la frase de «Security logs» a «en menos de 30 días» (consulta 1).

### 10.2 Tabla DNS de D2

`docs/operaciones/dns-d2-tabla-registros.md`: plantilla con los registros de la web (`@`, `www`, verificación de Vercel, `tools.` e `insight.` a apagar), los de correo de D4 (MX, SPF, DKIM, `_dmarc`, según el panel de Google Workspace) y los demás de la exportación, con las comprobaciones previas a D1, D3 y D4. Todo en DNS only. Los valores actuales los pone Greener a partir de la exportación de D0. **Se descartó el script `dns-snapshot.mjs`:** Greener hace la foto por su cuenta.

## 11. Decisiones que necesito de Greener

Las del 2 de noviembre están contestadas en lo que toca a §8 y §10. Siguen abiertas:

1. **Repositorio (§8):** ¿rama principal (el flujo vigila `main` y `master`)? ¿Bloquear uniones si el CI falla? ¿Se quiere que el formato pase a bloqueante y qué se ignora (§3 de `ci.md`)?
2. **Contacto:** se mantuvo el fallo cerrado (mi propuesta); si prefieres el limitador compartido, es un cambio pequeño (§2).
3. **JSON-LD:** ¿qué piezas, de `Organization`/`WebSite`, `PodcastEpisode` y casos? (§3.2). Mi propuesta: la primera sí; las otras dos, si quieres también esa señal.
4. **Carrusel:** ¿te vale `preload="none"` en las diapositivas que no se ven? (§5). *Aplicado el 2 nov tal como se proponía; se revisa cuando haya un caso con vídeos.*
5. **ABM:** el estilo de la ruta activa y oscurecer el gris atenuado a #686d7b (§6); lo ves tú. *Aplicado el 3 nov (decías que sí al gris); falta que mires la barra.*
6. **E2E:** ¿Docker local en el CI, con los minutos que gasta? (§9). *Estudio hecho el 3 nov: lío medio, 4 a 5 sesiones, cinco preguntas concretas en §9.6.*
7. **Región de Vercel:** ¿qué región de la UE? Conviene la más cercana a la del proyecto de Supabase, que no consta en la documentación; con ella se escribe `regions` en `vercel.json` (o se elige en Settings → Functions).

## 12. Lo que no he podido verificar

- Que el flujo de CI funcione en GitHub (se validó ejecutando sus comandos en local y con `actionlint`).
- Que «en menos de 30 días» siga siendo cierto si se contrata Observability Plus de Vercel (30 días exactos).
- Que Supabase local arranque en el CI con las 58 migraciones y que `next start` sirva la salida `standalone` (primera fase de §9).
- Que la conservación de los valores con `useActionState` de React 19 funcione con campos no controlados en el navegador: lo decide el test de integración (§2.2).
- Si Google tendría en cuenta el JSON-LD de `PodcastEpisode` y de casos (§3.2), y si descartaría `VideoObject` por el consentimiento.
- La región por defecto de las funciones de Vercel para este proyecto y la de Supabase: `vercel.json` no fija `regions` todavía.
- El estilo visual de la ruta activa y del nuevo gris: lo juzga Greener a ojo.
