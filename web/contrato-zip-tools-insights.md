# Contrato del paquete ZIP — Tools e Insights

Especificación técnica para quien prepare los paquetes de una tool o insight. El ABM valida esto automáticamente al subir el ZIP — si algo no cumple el contrato, la subida se rechaza con el motivo exacto, no hay validación parcial ni "se sube pero con avisos".

---

## 1. Estructura del ZIP

- **`index.html` en la raíz del ZIP.** Obligatorio, sin excepción — no puede estar dentro de una subcarpeta.
- **`manifest.json` en la raíz del ZIP.** Obligatorio (ver §2).
- **Todo lo demás (CSS, JS, Workers, imágenes, fuentes…) dentro de una carpeta `assets/`**, con las subcarpetas que se quiera dentro de ella (`assets/img/logo.png`, `assets/js/worker.js`…). Esto no es una recomendación de orden: el servidor solo entrega archivos que cuelguen de `assets/`. Un `style.css` suelto en la raíz **pasa la validación de la subida** (que no comprueba dónde está cada archivo) pero **da 404 al pedirlo** en la página publicada.
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

El servidor asigna el tipo de contenido (Content-Type) por extensión, y solo reconoce cinco: **`.js`, `.css`, `.json`, `.png` y `.svg`**. Cualquier otra extensión (`.webp`, `.jpg`, `.woff2`, `.txt`, `.mp4`, `.pdf`…) se sirve con un tipo genérico. Consecuencias prácticas:

- Un archivo `.txt`, `.pdf` u otro enlazado con un `<a href>` **se descargará en vez de abrirse** en el navegador (por ejemplo, un `llms.txt` enlazado desde la página).
- Las imágenes `.webp`/`.jpg` en un `<img>` y las fuentes `.woff2` en un `@font-face` **suelen funcionar** porque el navegador identifica el formato por su contenido, pero **no está verificado ni garantizado**. Si el paquete las necesita, hay que probarlas en una subida real antes de darlas por buenas.
- Para V1, lo seguro es limitarse a esos cinco tipos. Si hace falta otro, se avisa para ampliar la lista en el servidor, no se improvisa.

## 2. `manifest.json` — campos obligatorios

```json
{
  "kind": "tool",
  "entrypoint": "index.html",
  "version": 1,
  "requiredCapabilities": ["canvas", "worker"],
  "externalDomains": [],
  "minViewport": { "width": 320, "height": 420 }
}
```

| Campo                  | Tipo                    | Notas                                                                                                                                                                  |
| ---------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`                 | `"tool"` \| `"insight"` | Debe coincidir con el tipo de contenido al que se sube — si no coincide, se rechaza                                                                                    |
| `entrypoint`           | texto                   | Nombre del archivo HTML que se sirve. Debe existir de verdad dentro del ZIP. Normalmente `"index.html"`                                                                |
| `version`              | número entero positivo  | Versión del propio paquete (no confundir con la versión que asigna el ABM al subir)                                                                                    |
| `requiredCapabilities` | lista de textos         | Documentación de qué necesita el paquete (`"canvas"`, `"worker"`, `"webgl"`, etc.) — informativo, no bloquea la subida                                                 |
| `externalDomains`      | lista de textos         | **Todo dominio que aparezca en cualquier archivo del paquete tiene que estar aquí** — sea un enlace, un recurso o un texto (ver §3). Si no aparece ninguno, dejar `[]` |
| `minViewport`          | `{ width, height }`     | Tamaño mínimo recomendado para que la tool/insight se vea bien                                                                                                         |

Si el `manifest.json` no es JSON válido, o le falta cualquiera de estos campos, o `entrypoint` apunta a un archivo que no existe dentro del ZIP, se rechaza la subida entera.

## 3. Dependencias y dominios externos

### Qué debe ir dentro del paquete

**Todo lo que necesite el paquete para funcionar (fuentes, librerías JS, imágenes, workers) debe ir incluido dentro del ZIP.** Aunque un dominio esté declarado en `externalDomains`, la política de seguridad de la ruta (ver §6) **no deja cargar recursos de otros orígenes** (scripts, hojas de estilo, fuentes, imágenes, `fetch`). Declarar un dominio no lo habilita para eso.

### Cómo funciona el escaneo de dominios

Al subir el ZIP, el sistema recorre los archivos `.html`, `.htm`, `.js`, `.mjs`, `.css` y `.json` (incluido el propio `manifest.json`) buscando cualquier texto que empiece por `http://` o `https://`, y rechaza la subida si el dominio no está en `externalDomains`. Puntos que conviene tener claros:

- **Cuenta todo lo que parezca una URL absoluta, sin distinguir dónde está.** Un `<a href>` a una fuente citada cuenta igual que un `<script src>`; una URL escrita como texto visible de una cita, o dentro de un comentario, también. No hay distinción entre «enlace» y «recurso».
- **Se declara el dominio, no cada enlace.** Cien enlaces al mismo medio son una única entrada. La ruta de la URL da igual.
- **La comparación es por dominio exacto.** `www.ejemplo.com` y `ejemplo.com` son dos entradas distintas, y no hay comodines (`*.ejemplo.com` no vale).
- **Salen dominios que no son enlaces reales.** Los más habituales: el namespace de un SVG inline (`http://www.w3.org/2000/svg` → hay que declarar `www.w3.org`) y las cabeceras de licencia de las librerías (`https://threejs.org`, `github.com`…). Es una limitación conocida del escaneo, que es de texto y no entiende para qué se usa cada URL: hoy hay que declararlos igualmente.
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

### Cómo se monta tu HTML en la página

El servidor no sirve tu `index.html` tal cual: lo lee, separa su `<head>` y su `<body>`, y construye con ellos un documento nuevo que incluye el menú lateral. Qué se conserva y qué no:

- **Se conserva todo el contenido de tu `<head>`**: `<link rel="stylesheet">`, `<style>`, `<meta>`. El CSS puede ir en un archivo aparte, inline en el head, o de las dos formas. Ambas funcionan.
- **Del `<body>` solo se copia lo de dentro.** Los atributos del propio `<body>` y de `<html>` (`class`, `style`, `lang`, `data-*`…) **se pierden**. Si necesitas una clase o un estilo «de body», ponlo en un `<div>` raíz propio dentro del body.
- **Los selectores `body { … }` y `html { … }` de tu CSS se aplican al body del sitio**, que también contiene el menú lateral, no solo a tu contenido. Cuelga todo de una clase de tu contenedor raíz (`.mi-tool { … }`) y evita estilar `body`/`html` directamente.
- **Tu `<title>` no tiene efecto**: el documento ya lleva el suyo y el navegador usa el primero.
- **Todas las rutas relativas se resuelven desde `/tools/{slug}/app/`** (o `/insights/{slug}/app/`), porque el documento lleva un `<base href>` con esa dirección. Por eso las rutas del HTML se escriben `./assets/style.css`, `./assets/main.js`.
- **⚠ Las rutas relativas escritas dentro del JS también cuentan desde esa base, no desde la carpeta del archivo JS.** Un `new Worker('./worker.js')` escrito en `assets/main.js` apunta a `/tools/{slug}/app/worker.js`, que no existe (404). Hay que escribir `new Worker('./assets/worker.js')`, y lo mismo con `fetch('./assets/datos.json')`. Es la trampa más fácil de cometer.
- Las rutas dentro de un **CSS** (`url(./img/fondo.png)`) y los `import` de **módulos ES** sí cuentan desde su propio archivo, como es habitual.

### El contenedor real

Tu `<body>` no se sirve solo: se inserta dentro de `<main class="greener-package-content">`, la celda de un grid CSS de dos columnas (menú lateral de iconos + tu contenido). No hace falta que reserves hueco para el menú lateral — ya está descontado antes de que tu contenido reciba su espacio.

Tres variables CSS, disponibles en `:root` desde el primer render, sin nada que inicializar ni ningún `postMessage`:

```css
:root {
  --greener-available-width: <px>;
  --greener-available-height: <px>;
  --greener-sidebar-width: <px>;
}
```

### Reglas obligatorias

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

### Las variables reales contra las que construir hoy

Las variables SÍ reflejan la pantalla real de cada visitante, y se recalculan solas al redimensionar la ventana:

- `--greener-available-width: calc(100dvw - 64px)`
- `--greener-available-height: 100dvh`

(`64px` es el ancho real del menú lateral de iconos.) No hay ningún cálculo de tamaño de pantalla hecho en el servidor ni ningún `postMessage`: son expresiones CSS dinámicas de toda la vida, que el propio navegador resuelve y mantiene actualizadas.

**Para comprobar visualmente que algo se ve bien, pruébese redimensionando la ventana del navegador** en varios tamaños — ya no existe un único número que represente "lo que recibe cualquier tool publicada hoy", cada visitante recibe el suyo.

### La CSP de esta ruta, y por qué sigue siendo la misma

El resto del sitio ganó una política de seguridad global (`Content-Security-Policy` con nonce por petición, HSTS, `frame-ancestors`, etc. — arquitectura §17.1). **La ruta `/tools|insights/[slug]/app` queda fuera de ese cambio a propósito, sin tocar ni una coma**, porque el navegador combina dos cabeceras `Content-Security-Policy` en la misma respuesta en vez de sustituir una por la otra — mandar las dos habría podido romper `worker-src`/`canvas` sin ningún aviso visible. Lo que rige aquí es exactamente esto:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
worker-src 'self' blob:; connect-src 'self'; img-src 'self' data:;
```

Qué significa para quien escribe el código de la tool o insight:

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

## 7. Qué pasa después de subir el ZIP

1. El ZIP se valida contra todo lo anterior. Si falla algo, se informa el motivo exacto y no se sube nada.
2. Se escanea con un antivirus (Cloudmersive) antes de aceptarse. Si el escaneo encuentra algo o el servicio no responde, la subida se rechaza — es una comprobación bloqueante, no un aviso.
3. Si todo pasa, se crea como una **nueva versión en borrador** — no sustituye automáticamente a la versión pública actual.
4. Desde el ABM, un administrador decide cuándo esa versión pasa a ser la pública. Se puede volver a una versión anterior en cualquier momento sin volver a subir nada.

### Versiones y caché del navegador

Los archivos de `assets/` **no llevan la versión en su dirección** (`/tools/mi-tool/app/assets/main.js` es la misma en la v1 y en la v2), así que se sirven con **revalidación en cada carga** (`Cache-Control: no-cache` + `ETag`), no con una caché larga. En la práctica:

- **No hace falta renombrar archivos** (`main.v2.js`) ni añadir sufijos para que los visitantes vean los cambios. Al publicar una versión nueva, o al volver a una anterior, cada visitante recibe los archivos correctos en su siguiente carga de la página.
- Si el paquete no ha cambiado, el navegador recibe una respuesta vacía de «sin cambios» (304) y reutiliza lo que ya tiene: no se vuelve a descargar nada.
- El identificador de versión es el contenido del paquete, no el número del manifest. Dos subidas idénticas se consideran la misma versión.

## 8. Checklist rápido antes de enviar un ZIP

- [ ] `index.html` en la raíz
- [ ] `manifest.json` en la raíz, con los 6 campos completos
- [ ] `entrypoint` del manifest coincide con un archivo real del ZIP
- [ ] `kind` del manifest coincide con el tipo de contenido (tool/insight)
- [ ] **Todo lo demás dentro de `assets/`** (CSS, JS, workers, imágenes), y referenciado como `./assets/...`
- [ ] Solo extensiones `.js`, `.css`, `.json`, `.png`, `.svg` dentro de `assets/` (cualquier otra, probada antes en una subida real — §1)
- [ ] **Ningún `<script>` con código inline ni manejadores `onclick=`**: todo el JS en archivo (§6)
- [ ] Las rutas relativas escritas **dentro del JS** (`new Worker(...)`, `fetch(...)`) empiezan por `./assets/...`, no por el nombre del archivo a secas (§6)
- [ ] Todo dominio que aparezca en cualquier archivo (enlaces a fuentes, textos de cita, `www.w3.org` de un SVG, cabeceras de licencia de librerías) está en `externalDomains` — se declara el dominio, no cada enlace (§3)
- [ ] Ningún recurso (script, fuente, imagen, `fetch`) cargado desde otro dominio — no funciona aunque esté declarado (§3, §6)
- [ ] Enlaces externos con `target="_blank" rel="noopener"`, sin navegación automática
- [ ] Sin Service Workers
- [ ] Sin `eval()` ni `new Function()`
- [ ] Sin imágenes desde `blob:`; sin fuentes incrustadas como `data:` (§6)
- [ ] CSS colgado de una clase de contenedor propio, sin estilar `body`/`html` directamente, ni depender de atributos del `<body>` (§6)
- [ ] ZIP completo por debajo de 10 MB
- [ ] Sin rutas `..` ni symlinks (si se ha construido el ZIP con herramientas estándar, esto no suele dar problema — es una comprobación de seguridad, no algo que haya que montar a mano)
- [ ] Nada de `100vw`/`100vh`/`window.innerWidth`/`window.innerHeight` en el código — solo `100%` o las variables `--greener-available-*`
- [ ] Probado visualmente redimensionando la ventana del navegador (§6) — el viewport es real y dinámico por visitante desde el 21 de septiembre, ya no hay un único tamaño fijo contra el que probar
- [ ] Si hay `<canvas>`: `canvas.width`/`canvas.height` fijados en JS, no solo el tamaño CSS
