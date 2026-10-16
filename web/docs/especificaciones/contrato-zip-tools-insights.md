# Contrato del paquete ZIP — Tools, Insights y páginas satélite

Especificación técnica para quien prepare los paquetes de una tool, un insight o una página satélite (§9). El ABM valida esto automáticamente al subir el ZIP — si algo no cumple el contrato, la subida se rechaza con el motivo exacto, no hay validación parcial ni "se sube pero con avisos".

---

## 1. Estructura del ZIP

- **`index.html` en la raíz del ZIP.** Obligatorio, sin excepción — no puede estar dentro de una subcarpeta.
- **`manifest.json` en la raíz del ZIP.** Obligatorio (ver §2).
- **Todo lo demás (CSS, JS, Workers, imágenes, fuentes…) dentro de una carpeta `assets/`**, con las subcarpetas que se quiera dentro de ella (`assets/img/logo.png`, `assets/js/worker.js`…). No es solo una recomendación de orden: el servidor solo entrega archivos que cuelguen de `assets/`. **Desde el 29 de septiembre, la subida rechaza directamente cualquier archivo (que no sea `index.html` o `manifest.json`) que esté fuera de `assets/`**, con un mensaje que dice cuál. Antes de esa fecha, un `style.css` suelto en la raíz pasaba la validación sin avisar y solo se descubría al dar 404 en la página publicada.
- **Tamaño máximo del ZIP completo: 10 MB** (10.000.000 bytes, que es lo que muestra el Finder de macOS). Se mide sobre el archivo `.zip` ya comprimido, no sobre su contenido descomprimido. El límite viene del antivirus: el ZIP entero se escanea antes de publicarse y el servicio de escaneo no admite más. Un ZIP mayor se rechaza en la subida con un mensaje explícito.
- **Nada de rutas que salgan de la carpeta del paquete**: ninguna ruta interna puede contener `..` ni empezar por `/`. Cualquier entrada así hace que se rechace el ZIP entero.
- **Sin symlinks** dentro del ZIP — se rechaza el ZIP entero si se detecta alguno.

Estructura mínima correcta:

```
mi-tool.zip
├── index.html
├── manifest.json
└── assets/
    ├── style.css
    ├── main.js
    └── worker.js
```

### Tipos de archivo dentro de `assets/`

El servidor asigna el tipo de contenido (Content-Type) por extensión. Reconoce nueve, ampliados el 29 de septiembre tras los primeros insights reales (que traían tipografía propia): **`.js`, `.css`, `.json`, `.png`, `.svg`, `.jpg`, `.jpeg`, `.webp`, `.woff` y `.woff2`**. La extensión se normaliza a minúsculas (`Coolvetica.WOFF2` se sirve igual que `coolvetica.woff2`). Cualquier otra extensión (`.txt`, `.mp4`, `.pdf`…) se sirve con un tipo genérico. Consecuencias prácticas:

- Un archivo `.txt`, `.pdf` u otro enlazado con un `<a href>` **se descargará en vez de abrirse** en el navegador (por ejemplo, un `llms.txt` enlazado desde la página).
- Los nueve tipos de arriba (imágenes, tipografía, JS, CSS, JSON) están verificados. Cualquier otro tipo que el paquete necesite, se avisa para ampliar la lista en el servidor, no se improvisa.

## 2. `manifest.json` — campos obligatorios

```json
{
  "kind": "insight",
  "entrypoint": "index.html",
  "version": 1,
  "requiredCapabilities": ["canvas", "worker"],
  "externalDomains": [],
  "minViewport": { "width": 320, "height": 420 },
  "metadata": {
    "title": "Informe de tendencias 2026",
    "description": "Las diez tendencias que van a mover el sector el año que viene, con datos.",
    "language": "es",
    "ogImage": {
      "path": "assets/og.png",
      "alt": "Gráfico de barras con las diez tendencias del informe"
    },
    "themeColor": "#1941f5",
    "keywords": ["tendencias", "informe", "2026"]
  }
}
```

| Campo                  | Tipo                    | Notas                                                                                                                                                                  |
| ---------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`                 | `"tool"` \| `"insight"` \| `"variety"` | Debe coincidir con el tipo de contenido al que se sube (`variety` es el de una página satélite de `other`, §9) — si no coincide, se rechaza                                                                                    |
| `entrypoint`           | texto                   | Nombre del archivo HTML que se sirve. Debe existir de verdad dentro del ZIP. Normalmente `"index.html"`                                                                |
| `version`              | número entero positivo  | Versión del propio paquete (no confundir con la versión que asigna el ABM al subir)                                                                                    |
| `requiredCapabilities` | lista de textos         | Documentación de qué necesita el paquete (`"canvas"`, `"worker"`, `"webgl"`, etc.) — informativo, no bloquea la subida                                                 |
| `externalDomains`      | lista de textos         | **Todo dominio que aparezca en cualquier archivo del paquete tiene que estar aquí** — sea un enlace, un recurso o un texto (ver §3). Si no aparece ninguno, dejar `[]` |
| `minViewport`          | `{ width, height }`     | Tamaño mínimo recomendado para que la tool/insight se vea bien                                                                                                         |
| `metadata`             | objeto                  | **Obligatorio desde el 15 de octubre.** Título, descripción, idioma e imagen para compartir (ver §2.1)                                                                 |

Si el `manifest.json` no es JSON válido, o le falta cualquiera de estos campos (incluido `metadata`), o `entrypoint` apunta a un archivo que no existe dentro del ZIP, se rechaza la subida entera.

### 2.1 `metadata`: cómo se presenta el paquete al compartirlo

Añadido el 15 de octubre. Un insight o una tool **no tienen ficha propia en el sitio que se pueda compartir**: su URL pública (`/insights/{slug}/app`, `/tools/{slug}/app`) es el propio paquete. Cuando alguien pega ese enlace en LinkedIn, WhatsApp, Slack o X, o cuando lo indexa Google, lo que se ve (título, texto, imagen) sale de este bloque. Se escribe una sola vez, dentro del `manifest.json`, y **Greener genera a partir de él todas las etiquetas del `<head>`** (§6.2): no hay que escribir ninguna `<meta>` de Open Graph a mano en el HTML.

| Campo          | Tipo            | Obligatorio | Reglas                                                                                                                                                           |
| -------------- | --------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`        | texto           | Sí          | 1 a **70** caracteres. Es el título de la pestaña (se le añade « · Greener»), el de la tarjeta al compartir y el que ve Google. Sin el nombre del sitio          |
| `description`  | texto           | Sí          | 1 a **200** caracteres. El texto bajo el título al compartir y en Google. Una o dos frases, sin saltos de línea                                                  |
| `language`     | texto           | Sí          | Código de idioma: `es`, `en`, `ca`, `fr`… o con región, `es-ES`, `pt-BR` (minúsculas el idioma, mayúsculas la región). Pasa a ser el `<html lang>` del documento |
| `ogImage.path` | texto           | Sí          | Ruta de la imagen **dentro del ZIP**, siempre bajo `assets/` (`assets/og.png`, `assets/img/compartir.jpg`). Solo letras, números, `.`, `_` y `-`; sin espacios   |
| `ogImage.alt`  | texto           | Sí          | 1 a **200** caracteres. Describe la imagen para quien no la ve (accesibilidad; también lo usan LinkedIn y X)                                                     |
| `themeColor`   | texto           | No          | Color en formato `#rrggbb`. Tiñe la barra del navegador en móvil                                                                                                 |
| `keywords`     | lista de textos | No          | Hasta **12** palabras o expresiones de hasta 40 caracteres. Poco peso para Google, útil como documentación                                                       |

**Reglas de la imagen Open Graph** (es lo que más rechazos provoca; se comprueba al subir y el mensaje dice cuál falla):

- Formato **PNG, JPG/JPEG o WebP**, y que **el contenido sea de verdad de ese formato**: un SVG o un GIF renombrado a `.png` se rechaza. Los SVG no se aceptan porque LinkedIn, Facebook y X no los muestran.
- **Mínimo 1200 × 630 píxeles**, que es también el tamaño recomendado. Se admite cualquier tamaño mayor con la misma proporción (2400 × 1260 sirve).
- **Proporción 1,91 : 1** (1200 × 630), con un margen del ±5 %. Una imagen cuadrada o vertical se rechaza: las redes la recortarían por el centro y se perdería lo importante. Conviene dejar el contenido clave en el tercio central.
- **Máximo 5 MB.** Para una tarjeta basta con mucho menos (un PNG de 1200 × 630 suele quedar entre 100 y 400 KB).
- Va dentro de `assets/` como el resto, así que **cuenta para el límite de 10 MB del ZIP**, y se sirve igual que cualquier otro asset del paquete.

Otras cosas que conviene saber:

- **Las medidas las escribe el servidor**, no el autor: al subir se mide la imagen y se guardan como `ogImage.width` y `ogImage.height` (alimentan `og:image:width/height`, que LinkedIn necesita para pintar la tarjeta a la primera). Si alguien las pone a mano en el manifest, se descartan.
- **Los textos de `metadata` también pasan por el escaneo de dominios (§3)**, igual que el resto del `manifest.json`. Si el `description` contiene una URL (`https://…`), su dominio tendría que estar en `externalDomains`. Lo normal es no poner enlaces ahí.
- **No se pueden editar desde el ABM**: son parte del paquete. Para cambiar el título, la descripción o la imagen se sube una versión nueva del ZIP (queda en borrador hasta que se publique, §7).
- **Los metadatos van por versión.** Una versión publicada antes del 15 de octubre, que no los tiene, **se sigue sirviendo igual que siempre** (sin imagen para compartir y con el título provisional `{slug} · Greener`); no se rompe nada, pero tampoco hay tarjeta bonita hasta subir una versión nueva con `metadata`.

## 3. Dependencias y dominios externos

### Qué debe ir dentro del paquete

**Todo lo que necesite el paquete para funcionar (fuentes, librerías JS, imágenes, workers) debe ir incluido dentro del ZIP.** Aunque un dominio esté declarado en `externalDomains`, la política de seguridad de la ruta (ver §6) **no deja cargar recursos de otros orígenes** (scripts, hojas de estilo, fuentes, imágenes, `fetch`). Declarar un dominio no lo habilita para eso.

### Cómo funciona el escaneo de dominios

Al subir el ZIP, el sistema recorre los archivos `.html`, `.htm`, `.js`, `.mjs`, `.css` y `.json` (incluido el propio `manifest.json`) buscando cualquier texto que empiece por `http://` o `https://`, y rechaza la subida si el dominio no está en `externalDomains`. Puntos que conviene tener claros:

- **Cuenta todo lo que parezca una URL absoluta, sin distinguir dónde está.** Un `<a href>` a una fuente citada cuenta igual que un `<script src>`; una URL escrita como texto visible de una cita, o dentro de un comentario, también. No hay distinción entre «enlace» y «recurso».
- **Se declara el dominio, no cada enlace.** Cien enlaces al mismo medio son una única entrada. La ruta de la URL da igual.
- **La comparación es por dominio exacto.** `www.ejemplo.com` y `ejemplo.com` son dos entradas distintas, y no hay comodines (`*.ejemplo.com` no vale).
- **Salen dominios que no son enlaces reales — con una excepción corregida el 29 de septiembre.** El namespace de un SVG inline (`xmlns="http://www.w3.org/2000/svg"`, y también `http://www.w3.org/1999/xlink`, `http://www.w3.org/1999/xhtml`, `http://www.w3.org/2000/xmlns/`, `http://www.w3.org/XML/1998/namespace`, `http://www.w3.org/1998/Math/MathML`) **ya no cuenta como dominio externo**: el escaneo reconoce esas cadenas exactas y las ignora. **Las cabeceras de licencia de las librerías** (`https://threejs.org`, `github.com`…) siguen contando — no hay forma fiable de distinguir por texto «esto es un comentario de licencia» de «esto es una referencia real» —, así que esos dominios hay que seguir declarándolos.
- **Un enlace relativo** (`./assets/llms.txt`, `#seccion`) no es un dominio y no cuenta.
- El escaneo **no detecta** una URL que el código construya dinámicamente (por ejemplo, concatenando strings en tiempo de ejecución). Aun así, cualquier dominio que se use tiene que declararse igual — si se descubre uso no declarado más adelante, la versión se retira.

### Enlaces a fuentes y otras páginas

Un enlace normal a otra web **funciona** una vez declarado su dominio: la política de seguridad restringe qué se carga, no adónde puede navegar el usuario. Debe abrirse tras un clic del usuario y con `target="_blank" rel="noopener"`, como pide el §4. Por tanto, para citar fuentes con enlace, basta con listar sus dominios en `externalDomains`, aunque la lista sea larga.

## 4. Prohibido explícitamente

- **Service Workers.** Ninguna llamada a `serviceWorker.register(...)` en ningún archivo del paquete. Se rechaza la subida si se detecta.
- **Navegar fuera del propio documento.** El paquete no debe redirigir ni navegar la pestaña principal fuera de sí mismo. Los enlaces externos deben abrirse con `rel="noopener"` tras una acción explícita del usuario (clic), nunca automáticamente.

## 5. Permitido sin restricción

- **Descargas de archivos** iniciadas por el usuario (el paquete se sirve en el mismo origen que el resto del sitio, sin sandbox de iframe, así que las descargas funcionan de forma nativa), incluidas las generadas desde JS con `Blob` + `URL.createObjectURL` + `<a download>`.
- **Web Workers**, siempre que los archivos del worker estén dentro del propio paquete o se carguen como `blob:`.
- **Canvas y WebGL**, sin restricción. La tool debe responder correctamente a cambios de tamaño del contenedor (ver §6).

## 6. Tamaño y layout — instrucciones para construir la tool (escritorio)

Esto es lo que necesita saber quien genere el HTML/CSS/JS de la tool — pensado para pegarse directamente en el prompt de quien la construya, incluida una IA.

### 6.1 Cómo se monta tu HTML en la página

El servidor no sirve tu `index.html` tal cual: lo lee, separa su `<head>` y su `<body>`, y construye con ellos un documento nuevo que incluye el menú lateral. Qué se conserva y qué no:

- **Se conserva todo el contenido de tu `<head>`**: `<link rel="stylesheet">`, `<style>`, `<meta>`. El CSS puede ir en un archivo aparte, inline en el head, o de las dos formas. Ambas funcionan.
- **Del `<body>` solo se copia lo de dentro.** Los atributos del propio `<body>` y de `<html>` (`class`, `style`, `lang`, `data-*`…) **se pierden**. Si necesitas una clase o un estilo «de body», ponlo en un `<div>` raíz propio dentro del body.
- **Los selectores `body { … }` y `html { … }` de tu CSS se aplican al body del sitio**, que también contiene el menú lateral, no solo a tu contenido. Cuelga todo de una clase de tu contenedor raíz (`.mi-tool { … }`) y evita estilar `body`/`html` directamente.
- **Tu `<title>` y tus etiquetas de compartir se descartan.** Si el manifest trae `metadata` (siempre, en subidas nuevas), Greener quita del `<head>` del paquete el `<title>`, `<meta name="description">`, `<meta name="keywords">`, `<meta name="theme-color">`, todas las `<meta property="og:*">` y `<meta name="twitter:*">`, el `<link rel="canonical">` y los `<script type="application/ld+json">`, y pone los suyos, generados desde `metadata` (§6.2). No hace falta escribirlos en el HTML; si se escriben, no tienen efecto.
- **El `<html lang>` sale de `metadata.language`**, no del `lang` de tu `<html>`.
- **Todas las rutas relativas se resuelven desde `/tools/{slug}/app/`** (o `/insights/{slug}/app/`), porque el documento lleva un `<base href>` con esa dirección. Por eso las rutas del HTML se escriben `./assets/style.css`, `./assets/main.js`.
- **⚠ Las rutas relativas escritas dentro del JS también cuentan desde esa base, no desde la carpeta del archivo JS.** Un `new Worker('./worker.js')` escrito en `assets/main.js` apunta a `/tools/{slug}/app/worker.js`, que no existe (404). Hay que escribir `new Worker('./assets/worker.js')`, y lo mismo con `fetch('./assets/datos.json')`. Es la trampa más fácil de cometer.
- Las rutas dentro de un **CSS** (`url(./img/fondo.png)`) y los `import` de **módulos ES** sí cuentan desde su propio archivo, como es habitual.

### 6.2 Qué mete Greener en el `<head>` con tus metadatos

Añadido el 15 de octubre. Todo con **URLs absolutas** (los rastreadores de redes sociales no resuelven rutas relativas ni ejecutan JavaScript), y con los textos escapados. `{url}` es la URL pública del documento sin barra final (`https://itsgreener.com/insights/{slug}/app`) y `{imagen}` es `{url}/{ogImage.path}`:

| Etiqueta                                                                     | Valor                                                                                                                      |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `<html lang>`                                                                | `metadata.language`                                                                                                        |
| `<title>`                                                                    | `{title} · Greener`                                                                                                        |
| `<meta name="description">`                                                  | `description`                                                                                                              |
| `<link rel="canonical">`, `og:url`                                           | `{url}`                                                                                                                    |
| `og:type`                                                                    | `article` en un insight, `website` en una tool                                                                             |
| `og:site_name`                                                               | `Greener`                                                                                                                  |
| `og:title`, `og:description`                                                 | `title`, `description`                                                                                                     |
| `og:image`, `og:image:alt`, `og:image:width`, `og:image:height`              | `{imagen}`, `ogImage.alt`, y las medidas reales de la imagen                                                               |
| `og:locale`                                                                  | De `language`: `es` → `es_ES`, `en` → `en_US`, `ca` → `ca_ES`, `es-MX` → `es_MX`…                                          |
| `twitter:card`                                                               | Siempre `summary_large_image` (tarjeta grande)                                                                             |
| `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt` | Los mismos valores que Open Graph                                                                                          |
| `<meta name="theme-color">`, `<meta name="keywords">`                        | `themeColor`, `keywords` (solo si se han declarado)                                                                        |
| JSON-LD (`<script type="application/ld+json">`)                              | `Article` en un insight, `WebApplication` en una tool, con título, descripción, imagen, URL, idioma y `publisher: Greener` |

Para comprobarlo antes de dar un paquete por bueno: abrir el insight ya publicado, «Ver código fuente» y buscar `og:image`; y pegar su URL en el depurador de Facebook/LinkedIn (Post Inspector) o en una conversación de WhatsApp o Slack, que muestran la tarjeta tal cual la verán los demás. Estos servicios cachean la tarjeta: si se cambia la imagen, hay que volver a pasar el enlace por su depurador para que la refresquen.

### 6.3 El contenedor real

Tu `<body>` no se sirve solo: se inserta dentro de `<main class="greener-package-content">`, la celda de un grid CSS de dos columnas (menú lateral de iconos + tu contenido). No hace falta que reserves hueco para el menú lateral — ya está descontado antes de que tu contenido reciba su espacio.

Tres variables CSS, disponibles en `:root` desde el primer render, sin nada que inicializar ni ningún `postMessage`:

```css
:root {
  --greener-available-width: <px>;
  --greener-available-height: <px>;
  --greener-sidebar-width: <px>;
}
```

### 6.4 Reglas obligatorias

1. **Nunca uses `100vw` / `100vh` / `window.innerWidth` / `window.innerHeight`.** Miden el navegador entero, incluido el hueco del menú lateral — el contenido se desbordaría o quedaría descentrado. Usa `100%` en CSS (el contenedor ya viene bien dimensionado desde fuera) o, si hace falta el valor en píxeles desde JS, lee la variable CSS:

   ```js
   const width = parseInt(
     getComputedStyle(document.documentElement).getPropertyValue(
       '--greener-available-width',
     ),
   )
   const height = parseInt(
     getComputedStyle(document.documentElement).getPropertyValue(
       '--greener-available-height',
     ),
   )
   ```

2. **El elemento raíz de la tool debe medir `width: 100%; height: 100%;`** relativo a su contenedor — nunca un tamaño fijo en píxeles ni un `max-width` arbitrario que deje franjas en blanco.

3. **Nada de `position: fixed` para elementos a pantalla completa** (fondos, overlays, modales). `fixed` se posiciona contra el viewport real del navegador, no contra el contenedor de la tool — se colaría por debajo o por encima del menú lateral. Usar `position: absolute` contra un contenedor propio con `position: relative`.

4. **Canvas/WebGL — donde más se suele fallar.** Un `<canvas>` tiene dos tamaños independientes: el visual (CSS) y el del buffer real de píxeles (`canvas.width`/`canvas.height`, atributos JS — si no se fijan, el navegador usa 300×150 por defecto y sale borroso o estirado). Hay que fijar los dos:

   ```js
   const canvas = document.querySelector('canvas')
   const dpr = window.devicePixelRatio || 1
   canvas.style.width = '100%'
   canvas.style.height = '100%'
   canvas.width = canvas.clientWidth * dpr
   canvas.height = canvas.clientHeight * dpr
   ```

5. **`minViewport` del manifest es solo documentación — hoy nada lo comprueba automáticamente.** Declararlo no reserva ni garantiza ese espacio, ni bloquea la subida si el número declarado es mayor que el espacio real disponible. Si la tool de verdad necesita un mínimo, ese aviso o fallback tiene que estar programado dentro del propio HTML, no basta con escribirlo en el manifest.

### 6.5 Las variables reales contra las que construir hoy

Las variables SÍ reflejan la pantalla real de cada visitante, y se recalculan solas al redimensionar la ventana:

- `--greener-available-width: calc(100dvw - 64px)`
- `--greener-available-height: 100dvh`

(`64px` es el ancho real del menú lateral de iconos.) No hay ningún cálculo de tamaño de pantalla hecho en el servidor ni ningún `postMessage`: son expresiones CSS dinámicas de toda la vida, que el propio navegador resuelve y mantiene actualizadas.

**Para comprobar visualmente que algo se ve bien, pruébese redimensionando la ventana del navegador** en varios tamaños — ya no existe un único número que represente "lo que recibe cualquier tool publicada hoy", cada visitante recibe el suyo.

### 6.6 La CSP de esta ruta, y por qué sigue siendo la misma

El resto del sitio ganó una política de seguridad global (`Content-Security-Policy` con nonce por petición, HSTS, `frame-ancestors`, etc. — arquitectura §17.1). **La ruta `/tools|insights/[slug]/app` queda fuera de ese cambio a propósito, sin tocar ni una coma**, porque el navegador combina dos cabeceras `Content-Security-Policy` en la misma respuesta en vez de sustituir una por la otra — mandar las dos habría podido romper `worker-src`/`canvas` sin ningún aviso visible. Lo que rige aquí es exactamente esto:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
worker-src 'self' blob:; connect-src 'self'; img-src 'self' data:;
```

Qué significa para quien escribe el código de la tool o insight (la imagen Open Graph de §2.1 no se ve afectada por esta tabla: la descargan los rastreadores de redes sociales, no el navegador del visitante):

| Situación                                                               | Resultado                                                                          |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `<script src="./assets/main.js">`                                       | ✅ Funciona                                                                        |
| `<script> … código … </script>` inline en el HTML                       | ❌ **No se ejecuta** — el JS tiene que ir en un archivo `.js`                      |
| Manejadores inline (`onclick="…"`, `onload="…"`)                        | ❌ No se ejecutan — usar `addEventListener` desde el archivo JS                    |
| `eval()`, `new Function(…)`                                             | ❌ Bloqueados (algunas librerías de plantillas o de cálculo los usan; comprobarlo) |
| CSS en archivo, en `<style>` o en atributos `style="…"`                 | ✅ Funciona                                                                        |
| `fetch`/XHR a archivos del propio paquete o del propio sitio            | ✅ Funciona                                                                        |
| `fetch`/XHR a otro dominio                                              | ❌ Bloqueado, aunque esté en `externalDomains`                                     |
| Scripts, hojas de estilo o fuentes desde un CDN (incluido Google Fonts) | ❌ Bloqueados, aunque esté en `externalDomains`                                    |
| Fuentes: `@font-face` con un archivo del paquete                        | ⚠ Permitido por la política, pero ver «tipos de archivo» en §1                     |
| Fuentes incrustadas como `data:` en el CSS                              | ❌ Bloqueadas (la política permite `data:` solo para imágenes)                     |
| Imágenes del propio paquete o como `data:`                              | ✅ Funciona                                                                        |
| Imágenes desde `blob:` (por ejemplo `img.src = URL.createObjectURL(…)`) | ❌ Bloqueadas — usar `data:` (`canvas.toDataURL`) o pintar en un `<canvas>`        |
| Web Workers desde archivos propios o `blob:`                            | ✅ Funciona                                                                        |
| Descargas con `Blob` + `<a download>`                                   | ✅ Funciona                                                                        |
| `<iframe>` de otros sitios (YouTube, mapas…)                            | ❌ Bloqueados                                                                      |
| Enlaces `<a href>` a otras webs                                         | ✅ Funciona, con el dominio declarado (ver §3)                                     |

Si algún paquete necesita cargar algo de un origen externo, hoy no es posible: es una limitación real, pendiente de si algún día hace falta ampliar esta política concreta.

### 6.7 Analítica del paquete

El documento de cada paquete carga automáticamente `/greener-package-analytics.js` (un script del propio sitio, nada que añadir al paquete; la política de §6.6 lo permite porque es del mismo origen). Qué hace depende del `kind` del manifest:

**Insights: automático, no hay que hacer nada.** Actualizado el 15 de octubre. Cada vez que se carga `/insights/{slug}/app` se registra **una vez** el evento **«Insight Open»**, con el identificador real del insight. Un insight no tiene ficha propia desde la que contar la apertura (su URL pública es el propio documento), así que la apertura se mide aquí. Detalles:

- Cuenta una vez por carga del documento: recargar la página vuelve a contar. Los robots que se identifican como tales los descarta la propia herramienta de analítica.
- No expone nada al paquete: un insight no puede enviar eventos propios ni llamar a `window.GreenerAnalytics`.
- Solo cuenta insights **publicados**, y solo en producción. No hay forma de inflar el contador de un insight ajeno ni inexistente.
- Es un contador anónimo, sin cookies ni identificador del visitante.

**Tools: la apertura la cuenta la ficha, el uso lo reporta la propia Tool con `window.GreenerAnalytics.toolUsed()`.** «Tool Open» se registra al abrir la ficha de la tool en el sitio. El **uso real** («Tool Used») lo tiene que avisar la Tool tras una acción real del usuario — generar algo, descargar, completar un paso — **no** al cargar la página:

```js
// Desde cualquier archivo .js del paquete, tras una acción real:
window.GreenerAnalytics.toolUsed('generate')
```

Equivalente, si se prefiere no depender de que el script ya esté cargado (por ejemplo, disparado desde un `<script>` que se ejecuta antes):

```js
window.dispatchEvent(
  new CustomEvent('greener:tool-used', { detail: { action: 'generate' } }),
)
```

Reglas sobre `action`:

- Texto, 1 a 64 caracteres: letras, números, `:`, `_` y `-`. El primer carácter no puede ser `:`, `_` ni `-`.
- Lo decide quien construye la Tool — no hay una lista cerrada. Conviene que sea corto y describa la acción (`'generate'`, `'download'`, `'export:png'`), porque es lo que luego se ve en el panel de analítica.
- Una `action` que no cumpla el patrón se descarta en silencio, sin avisar — ni en la consola del navegador ni en ningún sitio. Probarlo antes de dar la Tool por terminada.

Qué hace por dentro, para quien quiera entender el porqué: pide al propio servidor (mismo origen, por eso no choca con la CSP de arriba) que resuelva el slug de la Tool al identificador real de su ficha, y desde ahí lo manda a la analítica — así este evento se puede cruzar con el de apertura de la ficha de la Tool, cosa que no sería posible si cada Tool mandara su propio identificador.

**No es obligatorio, pero sin ninguna llamada la Tool mostrará cero uso en el panel de analítica aunque reciba visitas reales.** No hay ningún aviso de que falte: es un silencio, no un error. Para una Tool puramente informativa, sin ninguna acción que reportar, es aceptable no llamarlo nunca — pero si la Tool genera, descarga o transforma algo, conviene no olvidarlo.

## 7. Qué pasa después de subir el ZIP

1. El ZIP se valida contra todo lo anterior, incluidos los metadatos y la imagen para compartir (§2.1). Si falla algo, se informa el motivo exacto y no se sube nada.
2. Se escanea con un antivirus (Cloudmersive) antes de aceptarse. Si el escaneo encuentra algo o el servicio no responde, la subida se rechaza — es una comprobación bloqueante, no un aviso.
3. Si todo pasa, se crea como una **nueva versión en borrador** — no sustituye automáticamente a la versión pública actual.
4. Desde el ABM, un administrador decide cuándo esa versión pasa a ser la pública. Se puede volver a una versión anterior en cualquier momento sin volver a subir nada. Las versiones que ya no hagan falta se pueden **borrar** desde el ABM (una a una o todas las anteriores de golpe); se borran también sus ficheros y no se pueden recuperar. La versión activa no se puede borrar: hay que publicar otra antes.

### Versiones y caché del navegador

Los archivos de `assets/` **no llevan la versión en su dirección** (`/tools/mi-tool/app/assets/main.js` es la misma en la v1 y en la v2), así que se sirven con **revalidación en cada carga** (`Cache-Control: no-cache` + `ETag`), no con una caché larga. En la práctica:

- **No hace falta renombrar archivos** (`main.v2.js`) ni añadir sufijos para que los visitantes vean los cambios. Al publicar una versión nueva, o al volver a una anterior, cada visitante recibe los archivos correctos en su siguiente carga de la página.
- Si el paquete no ha cambiado, el navegador recibe una respuesta vacía de «sin cambios» (304) y reutiliza lo que ya tiene: no se vuelve a descargar nada.
- El identificador de versión es el contenido del paquete, no el número del manifest. Dos subidas idénticas se consideran la misma versión.

## 8. Checklist rápido antes de enviar un ZIP

- [ ] `index.html` en la raíz
- [ ] `manifest.json` en la raíz, con los 7 campos completos (los 6 técnicos y `metadata`)
- [ ] `metadata.title` (≤ 70), `metadata.description` (≤ 200) y `metadata.language` (`es`, `en`, `es-ES`…) rellenos (§2.1)
- [ ] `metadata.ogImage`: imagen **PNG, JPG o WebP de verdad**, **mínimo 1200 × 630 px y proporción 1,91 : 1**, de **menos de 5 MB**, dentro de `assets/` y con su texto alternativo (§2.1)
- [ ] Sin `<title>`, `og:*` ni `twitter:*` escritos a mano en el HTML: se descartan, los genera Greener desde `metadata` (§6.2)
- [ ] `entrypoint` del manifest coincide con un archivo real del ZIP
- [ ] `kind` del manifest coincide con el tipo de contenido (tool/insight/variety)
- [ ] **Todo lo demás dentro de `assets/`** (CSS, JS, workers, imágenes), y referenciado como `./assets/...`
- [ ] Solo extensiones `.js`, `.css`, `.json`, `.png`, `.svg`, `.jpg`, `.jpeg`, `.webp`, `.woff`, `.woff2` dentro de `assets/` (cualquier otra, probada antes en una subida real — §1)
- [ ] **Ningún `<script>` con código inline ni manejadores `onclick=`**: todo el JS en archivo (§6)
- [ ] Las rutas relativas escritas **dentro del JS** (`new Worker(...)`, `fetch(...)`) empiezan por `./assets/...`, no por el nombre del archivo a secas (§6)
- [ ] Todo dominio que aparezca en cualquier archivo (enlaces a fuentes, textos de cita, cabeceras de licencia de librerías) está en `externalDomains` — se declara el dominio, no cada enlace; **excepción:** el namespace de un SVG inline (`www.w3.org`) no hace falta declararlo (§3)
- [ ] Ningún recurso (script, fuente, imagen, `fetch`) cargado desde otro dominio — no funciona aunque esté declarado (§3, §6)
- [ ] Enlaces externos con `target="_blank" rel="noopener"`, sin navegación automática
- [ ] Sin Service Workers
- [ ] Sin `eval()` ni `new Function()`
- [ ] Sin imágenes desde `blob:`; sin fuentes incrustadas como `data:` (§6)
- [ ] CSS colgado de una clase de contenedor propio, sin estilar `body`/`html` directamente, ni depender de atributos del `<body>` (§6)
- [ ] Si es un Insight: no hay que hacer nada para la analítica, la apertura se registra sola (§6.7)
- [ ] Si es una Tool con alguna acción real (generar, descargar, transformar...): llama a `window.GreenerAnalytics.toolUsed('acción')` tras esa acción — si no, mostrará cero uso en analítica aunque reciba visitas (§6.7)
- [ ] ZIP completo por debajo de 10 MB (la imagen para compartir cuenta)
- [ ] Sin rutas `..` ni symlinks (si se ha construido el ZIP con herramientas estándar, esto no suele dar problema — es una comprobación de seguridad, no algo que haya que montar a mano)
- [ ] Nada de `100vw`/`100vh`/`window.innerWidth`/`window.innerHeight` en el código — solo `100%` o las variables `--greener-available-*`
- [ ] Probado visualmente redimensionando la ventana del navegador (§6) — el viewport es real y dinámico por visitante desde el 21 de septiembre, ya no hay un único tamaño fijo contra el que probar
- [ ] Si hay `<canvas>`: `canvas.width`/`canvas.height` fijados en JS, no solo el tamaño CSS

---

## 9. Páginas satélite (`kind: "variety"`)

Añadido el 15 de octubre (plan de `other`, fase 4). Una **página satélite** es un contenido de tipo `other` y subtipo página: una página propia de Greener (una landing de campaña, una sección de careers, una página de evento…) que se publica como paquete HTML y se enlaza desde un pin del feed. Usa **el mismo contrato que una tool o un insight**, con estas particularidades:

- **`kind` del manifest: `"variety"`.** Es el valor que tiene que llevar el `manifest.json` de una página satélite: de él dependen el `og:type`, el JSON-LD y que no se cargue la analítica de §6.7. Un paquete `variety` solo puede subirse a un contenido `other` de tipo página; a cualquier otro, la subida se rechaza.
- **`metadata` obligatorio**, con las mismas reglas que en §2.1 (título, descripción, idioma e imagen para compartir). Una página satélite se comparte por su URL igual que un insight, así que el bloque es lo que ven LinkedIn, WhatsApp o Google. En el `<head>` el `og:type` es `website` y el JSON-LD es `WebPage`.
- **URL pública: `/variety/{slug}/app`.** Los assets cuelgan de `/variety/{slug}/app/assets/...` y las rutas relativas del HTML se resuelven desde `/variety/{slug}/app/` (§6.1). `/variety/{slug}` a secas redirige a `/app`: la página no tiene ficha.
- **Misma CSP que cualquier paquete** (§6.6): `default-src 'self'` y `connect-src 'self'`. **La página tiene que ser autocontenida**: JS en archivo, CSS y fuentes dentro del paquete, y nada cargado de otro dominio. Esto deja fuera, tal cual, los formularios o buscadores de empleo incrustados de terceros (un ATS, un formulario de un proveedor, un widget de calendario) y los `<iframe>` de otros sitios. Si una página satélite concreta necesita uno, es una decisión aparte sobre la CSP y no se resuelve subiendo el ZIP.
- **Sin analítica automática del paquete.** El script de §6.7 no se carga en una página satélite: no hay evento «Open» propio. La apertura se mide en el feed, con el clic del pin.
- **Sin vista previa de borrador**, como las tools y los insights: la página solo se ve una vez publicada.
- **No entra en el sitemap ni en `llms.txt`.** Se llega a ella desde el feed, no desde buscadores. Eso no impide que quien tenga el enlace la comparta (con su tarjeta de §6.2).
- **El pin del feed es un pin normal**, con `label` obligatorio. La página satélite no existe sin un pin que la enlace.

El resto (estructura del ZIP, tipos de archivo, dominios externos, límites de tamaño, reglas de layout y checklist de §8) se aplica sin cambios.

