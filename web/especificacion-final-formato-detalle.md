# Especificación final — formato de detalle (tipo A / tipo B / contenido libre)

**Versión 2 — sustituye por completo a la anterior.** Todo lo de aquí está confirmado; no queda ninguna pregunta abierta sobre el formato en sí. Confirmado por diseño y, en el caso del modelo de columnas, verificado además por medición de píxeles directa sobre capturas del PDF a escala 1:1 de viewport.

---

## 1. Los tres formatos de detalle

|                                    | Tipo A                                                                                                           | Tipo B                                                                       | Contenido libre (`other`)                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| Contenidos                         | `tool`, `insight`                                                                                                | `case`, `episode`                                                            | Cualquier cosa suelta — sustituye por completo a `page` |
| CTA en el pin (feed)               | Use (tool) / Read (insight)                                                                                      | Watch                                                                        | Watch                                                   |
| CTA en el detalle                  | Use / Read (lleva al HTML real)                                                                                  | Ninguno (caso) / **Watch more** hacia la plataforma externa (episodio)       | Ninguno                                                 |
| Medio del detalle                  | 1 imagen (tool: 1 imagen **o** 1 vídeo, §8)                                                                      | Caso: carrusel 1-N mixto (imagen+vídeo) · Episodio: 1 vídeo externo, siempre | 1 imagen **o** 1 vídeo (nunca ambos, nunca carrusel)    |
| Ancho del contenido (imagen+texto) | Variable, 3-5 columnas según ratio                                                                               | **Siempre 6/6**, fijo                                                        | Variable, 3-5 columnas, igual que tipo A                |
| Recomendaciones                    | Derecha (1-3 columnas, el resto hasta 6) + debajo                                                                | Solo debajo (no hay hueco lateral)                                           | Derecha + debajo, igual que tipo A                      |
| Editor de bloques libre            | No existe                                                                                                        | No existe                                                                    | No existe                                               |
| Paquete HTML propio                | **Sí — tool/insight exigen su `html_package`** (ZIP con manifest, ya construido, sin cambios) servido en `/tools | insights/[slug]/app`                                                         | No                                                      | No  |

---

## 2. El modelo de columnas — de dónde sale cada número

Esto se confundió varias veces por el camino, así que lo dejo explicado paso a paso, con los números verificados sobre una captura real (ratio 4:5, grupo "vertical"):

1. **La imagen nunca se mide en columnas.** Su ancho sale siempre de `altura fija (66,7vh) × ratio`, igual en tipo A, B y contenido libre — sin excepción, sin tabla de por medio.
2. **Tope de ancho: 83% del ancho útil de contenido**, para que ningún ratio (ni en pantallas muy altas o ventanas estrechas) pueda dejar sin espacio al texto o desbordar el layout. Si `altura × ratio` supera ese 83%, se recorta la altura real renderizada de la imagen — nunca el ratio, que se respeta siempre.
   - **Excepción para tipo A (tool / insight / contenido libre), 2 oct 2026:** el texto ocupa siempre **una columna de la retícula** (ancho fijo; sobra aire a la derecha si la imagen es estrecha) y nunca menos. Para garantizarlo, el tope de la imagen pasa a ser el **menor** entre el 83% y «ancho útil − una columna − 16 px de hueco». Tipo B (caso / episodio) no cambia. Móvil (<3 columnas) tampoco: sigue el placeholder.
3. **El bloque de contenido (imagen + texto, como unidad) sí reserva un número entero de columnas** — esto es necesario porque las recomendaciones de al lado son un masonry real y necesitan saber cuántas columnas les quedan libres para poder encajar piezas. Ese reparto es el que depende del ratio, agrupado en tres franjas:

| Grupo de ratio      | Columnas de contenido (imagen+texto) | Columnas de recomendación (el resto, hasta 6) |
| ------------------- | ------------------------------------ | --------------------------------------------- |
| 16:9                | 5                                    | 1                                             |
| 1:1, 4:3            | 4                                    | 2                                             |
| 9:16, 3:4, 4:5, 2:3 | 3                                    | 3                                             |

Verificado con la captura de "Destroyer 2.0" (ratio 4:5): 3 columnas de recomendación de ~130px cada una a la derecha, bloque de contenido ocupando el equivalente a 3 columnas a la izquierda — cuadra exacto.

4. **Dentro del bloque de contenido reservado, el texto ocupa lo que sobra** una vez descontado el ancho real de la imagen (que, recordemos, sale de altura×ratio, no de la reserva de columnas) — en la práctica ronda 1 columna de ancho, pero no es un valor fijo exacto, es "lo que queda del hueco reservado".

**Aproximación para anchos totales de 5, 4 y 3 columnas** (interpolación mía sobre las columnas de **recomendación** — móvil queda fuera, diseño entrega un rediseño propio aparte):

| Grupo de ratio      | 6 col | 5 col | 4 col | 3 col |
| ------------------- | ----- | ----- | ----- | ----- |
| 16:9                | 1     | 1     | 0     | 0     |
| 1:1, 4:3            | 2     | 2     | 1     | 0     |
| 9:16, 3:4, 4:5, 2:3 | 3     | 2     | 1     | 1     |

(Fila de verticales ajustada según pediste, para dejar más espacio al contenido en anchos intermedios.)

---

## 3. Campos por formato — listado exhaustivo, para recopilar datos

### Tipo B — Caso

_(traducible = por idioma, es/en/ca; el resto es un único valor)_

| Campo               | Traducible | Notas                                                                                           |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| `client`            | No         | Cliente para el que se hizo el trabajo                                                          |
| `title`             | Sí         | Título del caso                                                                                 |
| `highlight`         | Sí         | Subtítulo / cita destacada — **campo propio, independiente del cuerpo**, se muestra en negrita  |
| `body`              | Sí         | Cuerpo de texto — **campo nuevo**, no existe hoy en la base de datos                            |
| `seo_title`         | Sí         | Título SEO                                                                                      |
| `seo_description`   | Sí         | Descripción SEO                                                                                 |
| Carrusel de detalle | —          | 1-N imágenes/vídeos mixtos, sin tope. Imagen: WebP, máx. 5 MB. Vídeo: WebM, máx. 100 MB / 180 s |

`sector`, `services`, `year`, `credits`, `links` **quedan eliminados** — no tienen cabida en el nuevo diseño, no se arrastran como campos muertos.

### Tipo B — Episodio

Igual que caso, sustituyendo `client` por:

| Campo            | Traducible | Notas                                                                                                                                  |
| ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `episode_kind`   | No         | Tipo de episodio — enum ampliable (`podcast`, y lo que haga falta en el futuro), se ve arriba del todo igual que el cliente en un caso |
| Vídeo            | —          | Siempre exactamente uno, embed externo (`provider` + `embed_id`, ya existente) — nunca subida propia                                   |
| CTA "Watch more" | —          | No es un campo, sale automático según `provider`                                                                                       |

### Tipo A — Tool / Insight

| Campo                           | Traducible | Notas                                                                                                     |
| ------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `title`                         | Sí         | Nombre del contenido                                                                                      |
| `summary`                       | Sí         | Campo libre: para qué sirve / tema general (reutiliza columna ya existente)                               |
| `seo_title` / `seo_description` | Sí         |                                                                                                           |
| `cover_media_id`                | —          | 1 imagen, WebP, máx. 5 MB (en una tool, el medio de la ficha es el del pin de origen, imagen o vídeo, §8) |
| **Paquete HTML**                | —          | **Obligatorio.** ZIP con `manifest.json`, servido aparte en `/tools                                       | insights/[slug]/app`. Sistema ya construido, sin cambios — contrato detallado en documento aparte (§5) |

### Contenido libre (`other`)

Igual que tool/insight, **sin CTA, sin paquete HTML** — `cover_media_id` admite imagen o vídeo (nunca ambos a la vez).

### Pin (todos los tipos)

| Campo      | Notas                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `label`    | Gancho/título del pin. Obligatorio en tool/insight/libre, opcional (no se muestra) en caso/episodio                  |
| Medios     | Hasta 8 (imagen o vídeo, mezclados; vídeo ≤8 s, y ≤15 s / 15 MB en pines de tool, §8) + flag "mostrar como carrusel" |
| `ratio`    | Uno de los 7 ratios cerrados                                                                                         |
| `language` |                                                                                                                      |
| `alt`      |                                                                                                                      |

---

## 4. Ratios — lista cerrada, 7 valores

`1:1` · `4:3` · `4:5` · `3:4` · `2:3` · `9:16` · `16:9`

---

## 5. Paquete HTML de tool/insight

Contrato y validaciones detalladas en documento aparte: **`contrato-zip-tools-insights.md`** — pensado para enviar directamente a quien prepare los ZIP, sin depender de este documento de diseño.

---

## 6. Lo que desaparece

- El editor de bloques genérico (`content_block`, 6 tipos) deja de usarse por completo. `other` (antes `page`) usa el mismo modelo simple que tool/insight — sin tabla de extensión, sin bloques.
- `pin_type` como enum de tres valores excluyentes — sustituido por el modelo de pines de §3.
- `case_template_variant` — el formato se infiere directamente de `content.type`, siempre.
- Recomendaciones "relacionadas por etiqueta" — son aleatorias, igual que la home (ahorra el motor de relacionados que estaba pendiente).
- `sector`, `services`, `year`, `credits`, `links` de `case_detail`.

---

## 7. Rutas

- `/work/[slug]` → detalle tipo B (caso/episodio)
- `/tools/[slug]`, `/insights/[slug]` → detalle tipo A
- `/tools/[slug]/app`, `/insights/[slug]/app` → HTML real de la tool/insight
- `/variety/[slug]` → contenido libre (`other`) — **decidido el 21 de septiembre**, no estaba en esta lista en la v2 original. Prefijo propio en vez de raíz (`/[slug]`), para no arriesgar colisión con el resto de rutas del sitio (`/work`, `/tools`, `/insights`, `/channel`, `/contact`, `/admin`, `/preview`) sin necesidad de mantener una lista de palabras reservadas que validar en el ABM.

---

## 8. Decisiones posteriores a esta v2 (21-22 de septiembre)

Esta versión decía "no queda ninguna pregunta abierta sobre el formato en sí" — dos preguntas reales aparecieron igualmente al construirlo, más un ajuste de alcance. Se documentan aquí en vez de reescribir las secciones de arriba como si siempre hubieran estado, para no perder el rastro de cuándo y por qué se decidieron:

- **El ratio del carrusel de un caso (tipo B) — no estaba resuelto en el punto 1 de §2.** El punto 1 dice "la imagen nunca se mide en columnas... altura fija × ratio, igual en tipo A, B y contenido libre" — pero un caso trae un carrusel de 1-N imágenes/vídeos mixtos (§3), no una única imagen: ¿qué ratio gobierna la reserva cuando cada diapositiva puede tener uno distinto? Resuelto el 21 de septiembre: se usa el ratio del medio **más ancho** de todo el carrusel para las N diapositivas por igual — el resto se encaja con barras negras (`object-fit: contain`) en vez de recortarse, y **sin recalcular nada al cambiar de diapositiva** (mover la caja de texto en tiempo real porque cada imagen tiene un ratio distinto no tiene sentido visual, se descartó a propósito).
- **Móvil (<640px, fuera de la tabla del §2 a propósito) — placeholder acordado, no diseño final.** Mientras no exista el rediseño propio que menciona §2, el sitio no puede quedarse sin comportamiento por debajo de 640px: se acordó un interino el 21 de septiembre — sin panel lateral nunca (todo el ancho para el bloque de contenido), recomendaciones solo debajo, y la imagen a su ratio natural a ancho completo, **sin** la regla de 66,7vh del punto 1 (esa regla existe para coordinarse con un panel lateral que en móvil no existe). Construido y documentado como placeholder explícito, a sustituir cuando llegue el diseño real de móvil.
- **Ruta de `other` — no estaba en la lista de §7 de esta v2.** Resuelto el 21 de septiembre, ver §7 arriba.

- **Vídeos de demostración en las tools (5 de octubre).** Una tool puede enseñar un vídeo corto en lugar de la imagen de la ficha. **No hay tabla, carrusel ni fila nueva:** el vídeo es un medio más de un pin de la tool y, como ya ocurría con la imagen, `/tools/[slug]?pin=<pin>` toma el medio del pin de origen y lo pinta en el mismo cuadro y con la misma geometría (§2). Límites: vídeo de pin de tool **15 s y 15 MB**; en el resto de pines **8 s** (antes 5) y 100 MB. Un vídeo de más de 8 s no se anima en la home: muestra su poster. Entrada MP4/WebM/MOV, en los 7 ratios cerrados (el ABM avisa si no encaja con el del pin). En la ficha: mudo, en bucle, con botón de pausa, alt obligatorio, sin pie; no arranca solo con `prefers-reduced-motion` ni `save-data`. Sin analítica. Detalle en `historial-fase-5.md` §2.36.

---
