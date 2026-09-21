# Contrato del paquete ZIP — Tools e Insights

Especificación técnica para quien prepare los paquetes de una tool o insight. El ABM valida esto automáticamente al subir el ZIP — si algo no cumple el contrato, la subida se rechaza con el motivo exacto, no hay validación parcial ni "se sube pero con avisos".

---

## 1. Estructura del ZIP

- **`index.html` en la raíz del ZIP.** Obligatorio, sin excepción — no puede estar dentro de una subcarpeta.
- **`manifest.json` en la raíz del ZIP.** Obligatorio (ver §2).
- El resto de archivos (CSS, JS, imágenes, fuentes, etc.) pueden organizarse en subcarpetas libremente — las rutas relativas dentro del HTML/CSS/JS deben apuntar correctamente a esa estructura.
- **Tamaño máximo del ZIP completo: 10 MB.**
- **Nada de rutas que salgan de la carpeta del paquete**: ninguna ruta interna puede contener `..` ni empezar por `/`. Cualquier entrada así hace que se rechace el ZIP entero.
- **Sin symlinks** dentro del ZIP — se rechaza el ZIP entero si se detecta alguno.

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

| Campo                  | Tipo                    | Notas                                                                                                                                  |
| ---------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`                 | `"tool"` \| `"insight"` | Debe coincidir con el tipo de contenido al que se sube — si no coincide, se rechaza                                                    |
| `entrypoint`           | texto                   | Nombre del archivo HTML que se sirve. Debe existir de verdad dentro del ZIP. Normalmente `"index.html"`                                |
| `version`              | número entero positivo  | Versión del propio paquete (no confundir con la versión que asigna el ABM al subir)                                                    |
| `requiredCapabilities` | lista de textos         | Documentación de qué necesita el paquete (`"canvas"`, `"worker"`, `"webgl"`, etc.) — informativo, no bloquea la subida                 |
| `externalDomains`      | lista de textos         | **Todo dominio externo que el paquete referencie tiene que estar aquí** (ver §3). Si no se necesita ningún recurso externo, dejar `[]` |
| `minViewport`          | `{ width, height }`     | Tamaño mínimo recomendado para que la tool/insight se vea bien                                                                         |

Si el `manifest.json` no es JSON válido, o le falta cualquiera de estos campos, o `entrypoint` apunta a un archivo que no existe dentro del ZIP, se rechaza la subida entera.

## 3. Dependencias — todo dentro del paquete, salvo excepción declarada

- **Todo lo que necesite el paquete para funcionar (fuentes, librerías JS, imágenes) debe ir incluido dentro del ZIP.** No se puede depender de un CDN externo sin más.
- Si de verdad hace falta cargar algo de un dominio externo (una fuente de Google Fonts, una librería de un CDN concreto), **ese dominio tiene que estar en `externalDomains` del manifest**. El sistema escanea el HTML/CSS/JS del paquete buscando URLs absolutas (`https://...`) y rechaza la subida si encuentra alguna a un dominio que no esté en la lista.
  - Aviso honesto sobre esta comprobación: es un escaneo de texto, no un análisis real de JavaScript — no detecta una URL que el propio código construya dinámicamente (por ejemplo, concatenando strings en tiempo de ejecución). Aun así, cualquier dominio que se use tiene que declararse igual, aunque el escaneo automático no lo detecte — si se descubre uso no declarado más adelante, la versión se retira.

## 4. Prohibido explícitamente

- **Service Workers.** Ninguna llamada a `serviceWorker.register(...)` en ningún archivo del paquete. Se rechaza la subida si se detecta.
- **Navegar fuera del propio documento.** El paquete no debe redirigir ni navegar la pestaña principal fuera de sí mismo. Los enlaces externos deben abrirse con `rel="noopener"` tras una acción explícita del usuario (clic), nunca automáticamente.

## 5. Permitido sin restricción

- **Descargas de archivos** iniciadas por el usuario (el paquete se sirve en el mismo origen que el resto del sitio, sin sandbox de iframe, así que las descargas funcionan de forma nativa).
- **Web Workers**, siempre que los archivos del worker estén dentro del propio paquete o se carguen como `blob:`.
- **Canvas y WebGL**, sin restricción. La tool debe responder correctamente a cambios de tamaño del contenedor (ver §6).

## 6. Tamaño y layout — instrucciones para construir la tool (escritorio)

Esto es lo que necesita saber quien genere el HTML/CSS/JS de la tool — pensado para pegarse directamente en el prompt de quien la construya, incluida una IA.

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

### El número real contra el que construir hoy — y por qué ya no es un número fijo

**Actualización del 21 de septiembre: esto ya está resuelto.** Las variables SÍ reflejan la pantalla real de cada visitante, y se recalculan solas al redimensionar la ventana:

- `--greener-available-width: calc(100dvw - 64px)`
- `--greener-available-height: 100dvh`

(`64px` es el ancho real del menú lateral de iconos.) No hay ningún cálculo de tamaño de pantalla hecho en el servidor ni ningún `postMessage`: son expresiones CSS dinámicas de toda la vida, que el propio navegador resuelve y mantiene actualizadas.

**Por eso sigue siendo imprescindible construir contra las variables CSS, nunca contra un número en píxeles escrito a mano** — ahora con más motivo que antes: cada visitante recibe un valor distinto según su propia ventana, así que una tool que asuma un tamaño fijo (`1136×800` o cualquier otro) se verá mal en la mayoría de pantallas reales, no solo el día en que esto cambiara.

**Para comprobar visualmente que algo se ve bien, pruébese redimensionando la ventana del navegador** en varios tamaños — ya no existe un único número que represente "lo que recibe cualquier tool publicada hoy", cada visitante recibe el suyo.

## 7. Qué pasa después de subir el ZIP

1. El ZIP se valida contra todo lo anterior. Si falla algo, se informa el motivo exacto y no se sube nada.
2. Se escanea con un antivirus (Cloudmersive) antes de aceptarse. Si el escaneo encuentra algo o el servicio no responde, la subida se rechaza — es una comprobación bloqueante, no un aviso.
3. Si todo pasa, se crea como una **nueva versión en borrador** — no sustituye automáticamente a la versión pública actual.
4. Desde el ABM, un administrador decide cuándo esa versión pasa a ser la pública. Se puede volver a una versión anterior en cualquier momento sin volver a subir nada.

## 8. Checklist rápido antes de enviar un ZIP

- [ ] `index.html` en la raíz
- [ ] `manifest.json` en la raíz, con los 6 campos completos
- [ ] `entrypoint` del manifest coincide con un archivo real del ZIP
- [ ] `kind` del manifest coincide con el tipo de contenido (tool/insight)
- [ ] Todos los dominios externos usados están en `externalDomains`
- [ ] Sin Service Workers
- [ ] ZIP completo por debajo de 10 MB
- [ ] Sin rutas `..` ni symlinks (si se ha construido el ZIP con herramientas estándar, esto no suele dar problema — es una comprobación de seguridad, no algo que haya que montar a mano)
- [ ] Nada de `100vw`/`100vh`/`window.innerWidth`/`window.innerHeight` en el código — solo `100%` o las variables `--greener-available-*`
- [ ] Probado visualmente redimensionando la ventana del navegador (§6) — el viewport es real y dinámico por visitante desde el 21 de septiembre, ya no hay un único tamaño fijo contra el que probar
- [ ] Si hay `<canvas>`: `canvas.width`/`canvas.height` fijados en JS, no solo el tamaño CSS
