# Auditoría general y del tipo `other` (contenido libre, `/variety`)

**Estado: informe, sin cambios en el código. Las decisiones D1-D5 están cerradas desde el 15 de octubre en `docs/especificaciones/plan-other-pines-y-paginas.md`. La simulación del calendario de interludios con 20 `other` está en el §13 de ese plan.** Fecha: 14 de octubre de 2026. Estado analizado: el zip de esa fecha (después de §2.69). Método: lectura de `docs/` (README, `PROGRESO.md`, historiales, especificaciones, auditoría del feed), del documento de arquitectura V1.3 (`P26096.pdf`) y del código de punta a punta (`supabase/migrations`, `src/modules`, `src/app`, `src/components`); verificación con `vitest`, `tsc` y ESLint, y una simulación con el motor real del feed (anexo). Escala de gravedad, la misma que la auditoría del feed: **(A)** alta, **(M)** media, **(B)** baja.

---

## 1. Resumen

1. **El repositorio está sano.** 172 ficheros y 1796 tests en verde, `tsc` y ESLint limpios (tras `next typegen`), 49 migraciones. Las cifras coinciden con las de `PROGRESO.md` §1.
2. **Hay un fallo general que no es de `other` pero comparte su componente (G1, A):** desde el 7 de octubre, `/tools/{slug}` sin `?pin=` y `/insights/{slug}` se pintan **sin imagen ni vídeo**. Son las URL canónicas del sitemap y de `llms.txt`, así que es lo que ve Google y quien abra un enlace compartido.
3. **`other` funciona, pero no tiene propósito.** Nació en la arquitectura como «páginas sueltas» (§14.3, con los textos legales como ejemplo); la especificación v2 lo redujo a «cualquier cosa suelta» con el modelo de tool/insight, y los textos legales acabaron en código (`/privacy`). Hoy no hay ni un contenido `other`, ni en los datos de demo, ni sección pública, ni entrada en el menú; `/variety` sin slug da 404.
4. **Publicar uno solo inundaría el feed (O2, A).** La cuota del 5 % es del tipo, no de cada contenido: con el catálogo actual (sin casos), un único `other` ocupa el **15,6 %** de la ronda y reaparece cada ~6 pines; con el catálogo de lanzamiento, cada ~20.
5. **Es el único tipo con dos sistemas de medios (O3, A):** pines para el feed y portada para la ficha. Desde el 7 de octubre toda la maquinaria de portada (columnas, constraint, dos RPC, su componente del ABM, su caso de uso de borrado, su rama de calentamiento) existe solo para `other`, obliga a subir la pieza dos veces y el pin pulsado no coincide con lo que se ve en la ficha.
6. **Antes de construir nada hay que decidir qué es `other`** (apartado 5). Las cuatro salidas razonables tienen costes muy distintos; la que menos código cuesta y más simplifica es tratarlo como una tool sin paquete (ficha desde el pin, sin portada).

---

## 2. Estado general del repositorio

**Verificación ejecutada (14 oct):**

| Comprobación | Resultado |
| --- | --- |
| `vitest run` | 172 ficheros, 1796 tests en verde |
| `next typegen` + `tsc --noEmit` | 0 errores (sin `typegen` falla `LayoutProps`, ya documentado) |
| `eslint` | 0 errores, 0 avisos |
| `prettier --check` | No concluyente: el zip llega sin ficheros ocultos (`.prettierrc`, `.nvmrc`, `.gitignore`) y con finales CRLF; con la configuración deducida solo discrepan ficheros generados |
| Migraciones | 49 en `supabase/migrations`, como dice §1 |
| `next build` | No ejecutado (necesita las variables de entorno reales) |

### G1 (A). Las fichas de tool e insight se quedan sin medio fuera del feed

Desde §2.40 (7 oct) ni tool ni insight tienen portada (`content_cover_only_for_other`). `/tools/[slug]/page.tsx` solo pasa un medio a `ToolInsightDetail` si la URL trae `?pin=`; `/insights/[slug]/page.tsx` no pasa ninguno. `generateMetadata` sí usa el primer pin como respaldo para la imagen de OG, pero el cuerpo de la página no. Resultado: desde el sitemap, `llms.txt`, Google o un enlace compartido sin `?pin=`, la ficha muestra título, resumen y CTA con el hueco de una imagen 4:5 vacío. El feed no lo sufre (las tools llevan `?pin=` y los insights saltan a `/app`), por eso no se ha visto.

**Arreglo corto:** en la página, `pinCover?.media ?? await reader.firstPinMedia(id)` (con su ratio y alt), igual que ya hace `generateMetadata`. Es el mismo arreglo que necesitaría `other` si se quita su portada (O3).

### G2 (M). Checklist de migraciones del 7 oct sin confirmar

`PROGRESO.md` §4.0 sigue listando cinco migraciones del 7 de octubre como pendientes de `db push` (`20261007100000` a `20261007140000`). Desde el zip no se puede saber si ya están aplicadas. Si `20261007110000` no lo está, tool e insight aún aceptan portada en la base de datos y el ABM no la ofrece. Conviene marcar en el checklist lo que ya esté aplicado. El título de §4 sigue diciendo «checklist actualizado (2 de octubre de 2026)».

### G3 (M). Traducciones de tipo A que no se ven

El ABM ofrece es/en/ca para tool, insight y `other` (`ContentTranslations`: solo el episodio se limita al idioma por defecto), pero sus fichas son de un solo idioma (`sitemap.ts`: «Tool, insight y other son de un solo idioma»; sin rutas `/{locale}`). Una traducción a catalán de una tool se guarda y no se publica en ninguna parte. O se limita el ABM al idioma por defecto o se decide servirlas.

### G4 (B). Restos menores

1. `ToolInsightDetail` dice en su comentario que las recomendaciones son «de la misma sección»; desde §2.69 son siempre `home`.
2. `feed_config.mix_window` y `distance_window` ya no las lee nadie (anotado en §4.0).
3. `llms.txt` no menciona `/variety`; el sitemap sí incluye `/variety/{slug}`. Solo importa si `other` llega a tener contenido.

---

## 3. Cómo está construido hoy `other`, de punta a punta

| Capa | Dónde | Qué hace |
| --- | --- | --- |
| Origen | Arquitectura V1.3 §7.1 y §14.3 | `content.type = page`, «páginas sueltas» con bloques y traducciones, pueden tener pines y computan en la cuota «Otros»; los textos legales se citan como uso posible |
| Especificación | `especificacion-final-formato-detalle.md` §1, §3, §7 | Rebautizado `other`: «cualquier cosa suelta», igual que tool/insight sin CTA ni paquete; portada imagen **o** vídeo; ruta `/variety/[slug]` (21 sep) |
| Base de datos | `20260910083200` (rename `page`→`other`), `20260910083500`/`20260921091500` (portada y ratio), `20261007110000` (constraint `content_cover_only_for_other`), `20261009120000` (`register_cover_image`/`register_cover_video` solo `other`, códigos ZG011/ZG012) | Portada en `content.cover_media_id` + `cover_ratio`; `publish_content` no exige nada a `other` |
| Feed | `feedScope.ts`, `generateRound.ts`, `quotas.ts`, `typeSkeleton.ts` | Solo entra en `home` (no hay subhome); peso 5 % del tipo (`feed_config.ratios.other`); tipo minoritario: nunca dos `other` seguidos |
| Pin | `pinFooter.ts`, `PinCardLabel.tsx`, `feedItemPresentation.ts` | Pie = `pin.label` en bruto (gancho del admin, 2 líneas); CTA fijo «Watch»; destino `/variety/{slug}` sin `?pin=` |
| Ficha | `variety/[slug]/page.tsx` → `ToolInsightDetail` → `CoverMedia` | Portada (imagen con `srcset`, o `<video controls>` con escalón M y audio), título, `summary`, sin CTA; recomendaciones `home` a la derecha y debajo |
| SEO | `contentMetadata.ts`, `sitemap.ts` | OG solo desde la portada (sin respaldo de pin); entra en el sitemap como cualquier publicado |
| Analítica | `ContentOpenTracker.tsx`, `analytics.ts` | Sin evento propio; solo `Pin Click` con `kind: 'other'` |
| ABM | `NewContentForm`, `edit/page.tsx`, `CoverMediaUpload/`, `mediaActions.ts`, `deleteCoverMedia.ts` | Alta como «Other»; editor con traducciones (3 idiomas), bloque «Portada» (imagen o vídeo, ratio leído del nombre, §2.46) y pines |
| Medios | `warmPlan.ts`, `supabaseWarmRepository.ts`, `contrato-medios-fase-1.md` | La portada de vídeo se calienta en escalón M; límites genéricos 100 MB / 180 s |
| Tests | `contentPath`, `sitemap`, `contentMetadata`, `toolInsightDetail.smoke`, `coverOnlyForOther`, `warmPlan`… | Cobertura razonable con datos sintéticos; ningún contenido `other` en `seed_demo_data.sql` |

**Lo que está bien hecho y conviene conservar sea cual sea la decisión:** el prefijo propio de la ruta (sin colisiones ni palabras reservadas), el preview firmado, la integración con el sitemap, la regla de vecindad del feed, la limpieza de Cloudinary al sustituir o borrar la portada y la lectura del ratio desde el nombre del archivo.

---

## 4. Hallazgos sobre `other`

### O1 (A). Sin función ni lugar en el sitio

El uso que justificaba el tipo (páginas sueltas, textos legales) desapareció: `/privacy` es código (`policyContent.ts`) y el contacto es una página propia. Lo que queda es una definición abierta («cualquier cosa suelta») sin ningún contenido real ni de demo. Además arrastra cuatro nombres para lo mismo: `other` (base de datos y código), «Other» (ABM), `/variety` (URL pública) y «Otros» (arquitectura). No hay subhome, ni entrada en el menú, ni índice en `/variety`, así que un visitante solo llega desde un pin de la home o desde Google.

### O2 (A). Peso en el feed desproporcionado con pocos contenidos

La cuota del 5 % se reparte entre los `other` que haya, sin tope por contenido. Medido con el motor real (`generateRound`, 20 semillas por escenario, anexo):

| Catálogo | Pines por ronda | Pines `other` | Apariciones de cada `other` | Hueco medio entre apariciones del mismo |
| --- | --- | --- | --- | --- |
| Hoy, sin casos (23 tools, 5 insights, 16 episodios) + **1** `other` | 45 | 7 (15,6 %) | 7 | 6 pines |
| Lanzamiento S4 (40 casos, 30 tools, 12 insights, 20 episodios) + **1** `other` | 172 | 8 (4,7 %) | 8 | 20 pines |
| Realista S1 (150 casos, 50 tools, 20 insights, 40 episodios) + **1** `other` | 643 | 32 (5 %) | 32 | 20 pines |
| S1 + 3 `other` | 643 | 32 | 10,7 | 59 pines |
| S1 + 7 `other` | 643 | 32 | 4,6 | 136 pines |

Sin casos el efecto se triplica porque los pesos se renormalizan (decisión del 14 oct, se mantiene). Publicar un `other` de prueba hoy lo pondría en uno de cada seis pines de la home.

### O3 (A). Dos sistemas de medios para un solo contenido

`other` es el único tipo que necesita pines (feed) **y** portada (ficha). Consecuencias:

1. **Trabajo doble en el ABM:** la misma pieza se sube como pin y como portada, con su ratio cada vez.
2. **Incoherencia para el visitante:** el pin que pulsa no es lo que ve en la ficha. Las tools resolvieron exactamente esto el 2 de octubre con `?pin=` (§2.24).
3. **Almacenamiento duplicado en Cloudinary Free**, donde no se tolera basura.
4. **Mantenimiento exclusivo:** desde el 7 de octubre, `cover_media_id`/`cover_ratio`, `content_cover_only_for_other`, `register_cover_image`, `register_cover_video`, ZG011/ZG012, `CoverMediaUpload/` (5 ficheros), `deleteCoverMedia`, la rama de portada de `supabaseWarmRepository` y `warmPlan`, y varias filas del contrato de medios existen solo para un tipo sin contenido. El historial (§2.40) ya lo apuntaba: «quitar la columna entera exigiría decidir antes cómo se sustituye en `other`».

### O4 (M). Se puede publicar vacío

`publish_content` y `schedule_content` solo exigen algo a tool/insight (el paquete). Un `other` sin pines nunca sale en el feed pero sí en el sitemap: página huérfana indexable. Sin portada, la ficha se queda en título y resumen junto a un hueco calculado para 4:5 (`TOOL_INSIGHT_FALLBACK_RATIO`).

### O5 (M). La ficha es un callejón sin salida y no se mide

El pin dice «Watch» (también cuando la portada es una imagen) y la ficha no tiene CTA, ni enlace externo, ni evento propio de apertura. Solo queda `Pin Click`, así que no se puede saber si alguien ve la ficha entera ni qué hace después.

### O6 (M). Pie del pin a contracorriente del resto

Desde el 2 de octubre, case, episode, insight y tool derivan el pie del propio contenido (título + segunda línea en negrita). `other` sigue con el gancho libre del admin y sin título, de modo que su pin no se parece a ningún otro del feed y el título del contenido no aparece en la home.

### O7 (M). Accesibilidad y reproducción de la portada

1. **Sin `alt` propio:** la imagen usa el título como `alt` y el vídeo `aria-label={title}`. Pines y carrusel de caso exigen `alt`.
2. **`<video>` sin `playsInline`:** en iPhone, pulsar play abre el reproductor a pantalla completa.
3. **Sin `preload` explícito:** queda al criterio del navegador; con un vídeo de hasta 100 MB y audio, puede descargar más de lo necesario en la factura de Cloudinary. `ToolCoverVideo` sí lo fija.

### O8 (M). Vídeo de portada con límites genéricos y duración poco fiable

La portada de vídeo admite 100 MB / 180 s con audio (los mismos que un vídeo de caso), con el tope de 40 MB aún sin decidir (`contrato-medios-fase-1.md` §5.4). Su duración se guarda desde `verifyCloudinaryVideoAsset`, que aún lleva el `?? 10` (historial §2.52, punto 7): un vídeo de 2 minutos se registraría como 10 s y falsearía el coste estimado del calentamiento. Hoy no afecta a ningún dato porque no hay portadas.

### O9 (B). Sustituir la portada y cambiar su ratio

Al sustituirla, la anterior se borra (base de datos y Cloudinary) **antes** de registrar la nueva; si el registro falla, un contenido publicado se queda sin portada. Y el ratio solo se cambia volviendo a subir el archivo.

### O10 (B). Imagen al compartir sin respaldo

Tool e insight caen al primer pin para la imagen de OG; `other` solo mira la portada. Sin portada, se comparte sin imagen.

### O11 (B). Nombres y textos que despistan

`ToolInsightDetail`, `toolInsightDetailRatio`, `TOOL_INSIGHT_FALLBACK_RATIO` y la prop `isTool` sirven también a `other`. En el ABM, el bloque «Portada» habla de «imagen principal» aunque admite vídeo, y la descripción del tipo («Contenido libre que no pertenece a los formatos principales») no orienta a quien carga contenido.

---

## 5. Qué hay que decidir para darle uso

### D1. Qué es `other`

| Opción | Para qué serviría (ejemplos de Greener) | Qué implica en el código | Coste |
| --- | --- | --- | --- |
| **A. Pieza visual suelta** | Merch, stand y ferias, making-of, cultura de equipo, piezas propias sin cliente | Ficha desde el pin pulsado (`?pin=`, como tools) con respaldo al primer pin; se retira la portada (migración que la quita también de `other`, RPC, `CoverMediaUpload`, rama de calentamiento); pie derivado (título + texto fijo, como insights) | Bajo, y **resta** código |
| **B. Noticia o enlace saliente** | Prensa, premios, eventos, ofertas de empleo, colaboraciones | Lo de A + campo `external_url` y CTA en la ficha hacia fuera (como «Watch more» del episodio), o pin que va directo fuera; evento de analítica | Medio |
| **C. Pieza editorial con cuerpo** | Artículos cortos, manifiestos, notas de proyecto sin cliente | Pasar a tipo B: `highlight` + `body` + carrusel, reutilizando `CaseDetail` sin cliente; ficha 6/6 | Medio-alto (carrusel y textos por idioma) |
| **D. Retirarlo** | Ninguno | Quitar «Other» del ABM, peso 0 en `feed_config`, retirar la portada; el valor del enum se queda (Postgres no borra valores de un enum sin recrear el tipo) | Bajo |

A y B son compatibles: B es A con un enlace.

### D2. Su peso en el feed

O se baja el 5 %, o se pone un tope de apariciones por contenido y ronda (lo sobrante vuelve a los demás tipos), o se acepta el comportamiento sabiendo que con pocos `other` se repiten mucho. Encaja con el modelo de cuotas que ya existe (`largestRemainderQuotas` + `circularFillPool`).

### D3. Nombre público

`/variety` es la URL actual y no se usa en ningún otro sitio. Si el tipo pasa a tener sentido editorial, conviene que la URL, la etiqueta del ABM y, si la hay, la sección pública digan lo mismo. Cambiarla hoy no rompe nada (no hay contenido ni enlaces).

### D4. Requisitos para publicar

Como mínimo un pin (y el enlace si se elige B), comprobado en `publish_content`/`schedule_content`, igual que el paquete en tool/insight.

### D5. Medición

Si el tipo va a tener uso, un evento de apertura propio (`Other Open` o el nombre que se elija) dado de alta como objetivo en Plausible; con B, además el clic al enlace externo.

---

## 6. Orden de trabajo propuesto

1. **G1** primero: es un fallo visible en producción y su arreglo (medio del pin como respaldo en la ficha) es la misma pieza que necesita la opción A.
2. Cerrar **D1-D5** con Greener.
3. Implementar la opción elegida con su migración (aplicar con `db push` antes de desplegar), tests y la actualización de `especificacion-final-formato-detalle.md` §1, §3 y §7, `contrato-medios-fase-1.md` (filas de portada de `other`) y `llms.txt`.
4. Si se retira la portada, ejecutar después `scripts/reconcile-cloudinary.mjs` (hoy no habría nada que limpiar, porque no hay portadas).

---

## 7. Anexo: método de la simulación de O2

Test temporal de Vitest (borrado después) que llama a `generateRound(snapshot, config, seed, 0)` con `ratios` 70/15/5/5/5, 20 semillas por escenario. Casos de 5 pines con fuerzas 1-5 repartidas por igual; tools, insights y episodios de 3 pines; `other` de 2 pines. «Hueco medio» = distancia media, en posiciones de la ronda, entre dos apariciones consecutivas del mismo contenido `other`. El catálogo «hoy, sin casos» es el de la auditoría del feed (23 tools, 5 insights, 16 episodios); el real puede variar.
