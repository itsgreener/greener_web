# Auditoría de restos y olvidos en la build final · 23 oct 2026

**Estado (29 oct 2026): aplicada en el código (§2.121 de `historial/historial-fase-5.md`).** Hechos RES-A1, A2, B1, C2, C3, C4 y las limpiezas del apartado 7 (`@vitest/ui`); RES-B2 y RES-C1 ya estaban resueltos en el zip del 29 oct; RES-A3 y RES-D2 no piden cambios de código. **Quedan dos cosas de Greener** (`PROGRESO.md` §4.1): activar la autenticación de los webhooks de n8n (RES-D1; el arranque de producción avisa en el log mientras falte) y sustituir la imagen para compartir provisional (RES-C3). Con ambas hechas, esta auditoría pasa a `historial/historial-informes-cerrados-oct-2026.md`. Correcciones al texto de abajo: `/work` no duplica la home (es la subhome de casos) y la nota de RES-A1 sobre sharp: sigue dentro del standalone aunque el optimizador esté apagado (80 MB), porque Next lo traza como dependencia opcional; en Vercel no importa.

Auditoría de solo lectura: no se ha modificado ningún fichero del proyecto. Revisa lo que acaba dentro de la build de producción (`next build`, salida `standalone`) y busca dos cosas: **restos** (ficheros, rutas, configuración o código que se quedaron sin uso) y **olvidos** (cosas que la build espera o que una web publicada debería tener y no están). Quedan fuera `tests/`, `scripts/`, la documentación y la configuración de desarrollo; solo se mencionan de pasada en el apartado 7. Los hallazgos llevan prefijo **RES-**. Severidad: **Baja** o **Info**. Prioridad: **M** (merece hacerse) o **B** (mejora menor).

## 1. Resumen

El proyecto está muy limpio. De los 505 ficheros de `src/`, 470 son alcanzables en tiempo de ejecución desde los puntos de entrada de Next, 33 son ficheros de solo tipos (legítimos) y solo quedan **un barrel sin uso en producción** y **un README dentro de `src/fonts`**. No hay `console.log`, `debugger`, `TODO`, ficheros duplicados, variables, imports o parámetros sin usar, ni dependencias de producción sin consumidor. Los restos reales son pocos y de configuración y metadatos, no de código.

| Bloque | Hallazgos | Baja | Info |
|--------|-----------|------|------|
| A. Rutas | 3 | 1 | 2 |
| B. Ficheros | 2 | 1 | 1 |
| C. Olvidos de contenido y metadatos | 4 | 2 | 2 |
| D. Provisionalidades | 2 | 1 | 1 |
| **Total** | **11** | **5** | **6** |

Lo más relevante, por este orden:

1. **Cinco páginas indexables comparten título y descripción (RES-C2).** `/`, `/channel`, `/insights`, `/tools` y `/work` salen con el mismo `<title>Greener</title>`; las siete páginas probadas carecen de imagen para compartir (RES-C3). Comprobado sobre la build.
2. **El optimizador de imágenes `/_next/image` está activo sin que nada lo use (RES-A1)** y arrastra 46 MB de binarios de sharp de los 79 MB del standalone.
3. **Los webhooks de n8n dependen solo del secreto de la URL (RES-D1)** mientras no se active la «fase 4».
4. **La carpeta `public/` no estaba en el zip (RES-C1):** no he podido comprobar los 12 ficheros que la build espera encontrar en ella.

## 2. Qué se ha comprobado y cómo

1. **Build real.** `next build` (Next 16.4.2, Turbopack) en una copia aislada con credenciales falsas: compila sin errores y genera 46 rutas. El original no se tocó. Después, el servidor `standalone` arrancado desde esa copia para comprobar cabeceras, `/_next/image` y los metadatos de las páginas.
2. **Grafo de importaciones.** Un script recorre los `import`, `export … from`, `import()` y las rutas de fuentes y CSS desde los puntos de entrada de Next (`page`, `layout`, `route`, `error`, `not-found`, `robots`, `sitemap`, `proxy`, `instrumentation`) y separa lo alcanzable en ejecución, lo alcanzable solo por tipos, lo que solo usan los tests y lo que no usa nadie.
3. **Compilador.** `tsc --noEmit --noUnusedLocals --noUnusedParameters` sobre todo el proyecto.
4. **Búsquedas con scripts:** restos de depuración, `TODO`/`FIXME`, direcciones locales, marcas de provisionalidad, ficheros duplicados por contenido, exports sin consumidor, dependencias, variables de entorno declaradas, usadas y documentadas, enlaces entrantes de cada ruta y referencias a ficheros estáticos.
5. **Contenido del standalone:** tamaño por carpeta, mapas de código, ficheros `.env` y dependencias copiadas.

## 3. Lo que se buscó y no se encontró

| Búsqueda | Resultado |
|----------|-----------|
| `console.log`, `console.debug`, `debugger` en `src/` | 0 |
| `TODO`, `FIXME`, `HACK`, `XXX` | 0 (dos coincidencias son la palabra «todo» en mayúsculas dentro de un comentario) |
| Variables, imports y parámetros sin usar (`tsc`) | 0 |
| Ficheros con contenido idéntico | 0 |
| Ficheros de `src/` no alcanzables en ejecución | 0 de código (solo el barrel y el README del apartado 4) |
| Variables de entorno declaradas sin uso | 0 (31 declaradas; `SCOPES` es una constante, no una variable) |
| `.env.local.example` frente a las declaradas | En sincronía (30 frente a 30) |
| Dependencias de producción sin uso | 0 (`react-dom` no se importa en `src/` porque lo exige Next) |
| `.env*` dentro del standalone | 0 |
| Mapas de código públicos en `.next/static` | 0 (45 mapas de servidor en el standalone, que no se sirven) |
| Direcciones `localhost` fijas | 0 (solo el valor por defecto documentado de `NEXT_PUBLIC_SITE_URL`) |
| `dangerouslySetInnerHTML`, `innerHTML`, `eval` | 0 |

## 4. Hallazgos

### 4.1 A. Rutas

**RES-A1 · Baja · M — El optimizador de imágenes de Next está activo y nada lo usa.**
Evidencia: `next/image` no se importa en ningún fichero de `src/` (el propio comentario de `securityHeaders.ts` lo dice); aun así `next.config.ts` declara `images.remotePatterns` con `res.cloudinary.com`, y la configuración final de la build lleva `images.unoptimized: false`. Prueba sobre el standalone: `GET /_next/image?url=https://example.com/a.jpg` responde 400 («url parameter is not allowed»), pero la misma petición con `https://res.cloudinary.com/demo/…` pasa el filtro y el servidor intenta descargarla (en la copia falla por no haber red). El filtro es por dominio, sin ruta ni cuenta. El `standalone` pesa 79 MB y 46 MB son `node_modules/@img` (binarios de sharp).
Impacto: cualquier visitante anónimo puede pedir que el servidor descargue y reescale imágenes de cualquier cuenta de Cloudinary, con el consumo de CPU y de red que eso implica, para una función que la web no usa. Además cada despliegue arrastra 46 MB que no hacen falta.
Propuesta: quitar el bloque `images` y poner `images: { unoptimized: true }`, que desactiva el endpoint. Después comprobar con un build que el standalone deja de incluir sharp (Next lo trata como dependencia opcional; no he verificado que desaparezca de la traza) y que el matcher del proxy, que ya excluye `_next/image`, sigue como está.

**RES-A2 · Info — `/work` está enlazada pero no está en el sitemap.**
Evidencia: `AuxNav` enlaza `/work` («We did it»); `STATIC_SITEMAP_PATHS` lista `/`, `/channel`, `/insights`, `/tools`, `/contact` y `/privacy`, pero no `/work`.
Pregunta: ¿es intencional porque duplica la home? Si lo es, conviene que la página lo diga con un `canonical` a `/`; si no, falta añadirla.

**RES-A3 · Info — Entrada «Shop» oculta que apunta a una ruta que no existe.**
Evidencia: `navItems.ts` declara `/shop` con `visible: false`; no hay página `/shop` (la petición cae en la ruta por slug y da 404). Está documentado como previsto («activarlo es una sola línea»).
Nada que hacer ahora; al abrir Shop hay que crear la ruta, y el icono `shop.svg` viaja en `public/` aunque no se muestre (ver RES-C1).

### 4.2 B. Ficheros

**RES-B1 · Baja · B — Un barrel que solo usan los tests.**
Evidencia: `src/modules/feed/domain/index.ts` reexporta nueve módulos con `export *`; solo lo importan dos tests (`import type { FeedConfig } from '@/modules/feed/domain'`). El código de producción importa por ruta directa.
Impacto: ninguno en la build, pero es el único fichero de código de `src/` sin consumidor real, y un barrel con `export *` puede esconder choques de nombres.
Propuesta: apuntar los dos tests a `@/modules/feed/domain/types` y borrarlo, o usarlo de verdad.

**RES-B2 · Info — Exports sin consumidor.**
Ya recogido en el informe de seguridad (SEC-X-4 y SEC-ADM-A6): cinco tipos sin ningún uso (`TextLimitField`, `MediaAsset`, `NewsletterInput`, `PinImageUpload`, `SignupInput`), tres funciones que solo usan los tests (`allowsThirdParties`, `getFirstPinMedia`, `pickDetailWidth`) y `createPinAction`, una Server Action que ninguna pantalla importa. No se repite aquí.

### 4.3 C. Olvidos de contenido y metadatos

**RES-C1 · Info · M — La carpeta `public/` no estaba en el zip.**
Evidencia: el zip no la incluye, pero el código espera encontrar en ella 12 ficheros: `icons/contact.svg`, `episodes.svg`, `insights.svg`, `instagram.svg`, `linkedin.svg`, `privacy.svg`, `shop.svg`, `tools.svg`, `works.svg`, `youtube.svg` y `logo_greener.svg` (menú lateral, favicon y documentos de paquetes), y `greener-package-analytics.js` (analítica de los paquetes). El standalone no copia `public/` por sí solo (`next.config.ts` lo explica).
Qué no he podido hacer: confirmar que existen, ni detectar ficheros de `public/` que ya no usa nadie (por ejemplo, restos de iconos o imágenes de prueba). Si quieres esa revisión, adjunta la carpeta y la repaso con el mismo método.

**RES-C2 · Baja · M — Cinco páginas indexables con el mismo título y descripción.**
Evidencia (sobre la build): `/`, `/channel`, `/insights`, `/tools` y `/work` devuelven `<title>Greener</title>` y la descripción genérica del layout raíz; `/contact` y `/privacy` tienen título propio pero comparten la misma descripción. Solo `contact`, `privacy`, `work/[slug]` y `tools/[slug]` exportan metadatos propios. Cuatro de las cinco están en el sitemap (`/work` no, RES-A2).
Impacto: en buscadores y al compartir enlaces las cinco páginas son indistinguibles.
Propuesta: un `metadata` por página (título y descripción), por ejemplo «Podcasts · Greener», «Insights · Greener», «Tools · Greener».

**RES-C3 · Baja · B — Ninguna página pública tiene imagen para compartir.**
Evidencia (sobre la build): ninguna de las siete páginas probadas lleva `og:image`; el layout raíz no define `openGraph.images` y solo los casos con miniatura la generan (`workContent.ts` lo reconoce: «se queda sin imagen de compartición por ahora»).
Propuesta: una imagen por defecto en el `metadata` raíz (la de marca, 1200 × 630), que las páginas con la suya sobrescriben.

**RES-C4 · Info — Favicon solo en SVG.**
Evidencia: `icons: { icon: '/icons/logo_greener.svg' }`; no hay `favicon.ico` ni `apple-touch-icon`. Una petición a `/favicon.ico` cae en la ruta por slug y da 404 (con una consulta de slugs cacheada).
Es válido para navegadores modernos; iOS suele generar el icono de la pantalla de inicio a partir de una captura de la página y algunos rastreadores piden el `.ico`. Decisión de Greener.

### 4.4 D. Provisionalidades

**RES-D1 · Baja · M — Los webhooks de n8n dependen solo de que su URL sea secreta.**
Evidencia: el comentario de `n8nTalentWorkflows.ts` lo dice: «La URL del webhook es el único secreto que lo protege hasta que se active la autenticación (fase 4)»; `TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME` y `_VALUE` son opcionales y el código ya los envía si existen.
Impacto: quien obtenga la URL (un log, una captura, un historial) puede lanzar el envío del enlace al candidato o el procesado de CV. El código ya está preparado: activarlo es configurar la cabecera en n8n y rellenar las dos variables, sin tocar código.
Propuesta: activarlo antes de abrir talent al público.

**RES-D2 · Info — Marcas de «por ahora» en lo que se publica.**
Textos y datos que el código declara provisionales y que conviene tener a la vista antes de salir:
1. Ventana de cookies solo en inglés («de momento»), `consent/domain/copy.ts`.
2. Política de privacidad solo en inglés («por ahora»), `privacy/policyContent.ts`.
3. Casos sin miniatura propia: sin imagen de compartición «por ahora», `workContent.ts`.
4. `TALENT_N8N_PROCESS_CV_WEBHOOK_URL` es opcional «de momento»; sin ella, «Procesar nuevo CV» del ABM responde que no está configurado.
5. Autenticación de webhooks de n8n «fase 4» (RES-D1).
6. Shop oculto (RES-A3).

## 5. Observaciones sin acción

1. **Las 46 rutas son dinámicas** (`ƒ` en el listado de la build), incluidas `/privacy` y `/contact`. Es el coste asumido del nonce de la CSP (lo explica el comentario del layout raíz, auditoría E2), compensado con las cachés de datos.
2. **Rutas de la build:** las 46 rutas son las del producto (feed y subhomes, detalles, contacto, privacidad, ABM, API, paquetes, `robots`, `sitemap` y `llms.txt`). No hay rutas de prueba, de demostración ni de depuración.
3. **Mapas de código del servidor** (45 ficheros `.map` en el standalone): no se sirven, pero ocupan espacio; no son un riesgo.

## 6. Pendiente de revisión y no verificado

1. **`public/`** (RES-C1): sin comprobar que existan los 12 ficheros ni qué sobra.
2. **Que sharp desaparezca del standalone** al desactivar el optimizador (RES-A1): hay que probarlo con un build.
3. **Que la petición a Cloudinary llegue a hacerse** (RES-A1): en la copia no hay red, así que solo se ha visto que el filtro la deja pasar.
4. **Ninguna ruta que necesite la base de datos real** se ha probado: la ruta por slug da 500 en la copia (la base falsa no responde) y 404 en producción.
5. **Imágenes y CSS sin uso dentro de `src/`**: el grafo confirma que todos los CSS y las fuentes están importados; las clases CSS sin uso se auditaron en el informe de CSS.
6. **Los tests no se han ejecutado** en esta auditoría.

## 7. Fuera de la build (solo anotado)

1. `@vitest/ui` está en `devDependencies` y ningún script ni configuración lo usa.
2. `tsconfig.tsbuildinfo` y `next-env.d.ts` viajan en el zip del proyecto; el primero es un artefacto de compilación.
3. `src/fonts/README.md` vive junto a las fuentes: no se importa y no entra en la build.
4. `.nvmrc` (24.15.0) y `engines` (`>=24.15.0 <25`) son coherentes.

## 8. Decisiones pendientes para Greener

1. ¿Se desactiva el optimizador de imágenes de Next? (RES-A1)
2. ¿`/work` va al sitemap o se declara canónica a la home? (RES-A2)
3. ¿Títulos y descripciones de las cinco páginas, y una imagen por defecto para compartir? (RES-C2, RES-C3)
4. ¿Se activa la autenticación de los webhooks de n8n antes de abrir talent? (RES-D1)
5. ¿Se añade `favicon.ico` y `apple-touch-icon`? (RES-C4)
6. ¿Me pasas la carpeta `public/` para revisarla? (RES-C1)
