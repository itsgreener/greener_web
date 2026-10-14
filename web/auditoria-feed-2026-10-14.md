# Auditoría del feed: rondas, lotes y algoritmo de mezcla

**Estado: implementado el mismo día (PROGRESO §2.68).** Fecha: 14 de octubre de 2026 (apartado 10 añadido por la tarde, con las decisiones de Greener y las simulaciones con catálogo realista). Estado analizado: el código del zip de esa fecha (motor en `src/modules/feed/domain/`, API en `src/app/api/feed/`, cliente en `src/components/masonry/`). Todo lo medido aquí sale de ejecutar el motor real con catálogos simulados; no se ha tocado ningún fichero del proyecto para esta auditoría.

---

## 1. Resumen

1. **El síntoma que describes es real y es más general de lo que parece.** En todas las configuraciones probadas (con y sin casos, con cualquier fuerza), el último tercio de cada ronda sale con un solo tipo de contenido. Sin casos son insights; con casos son casos. No es un error de insights: es cómo mezcla el algoritmo.
2. **La causa es de diseño, no un fallo puntual.** La mezcla va colocando pines uno a uno con reglas duras (no repetir tipo seguido, separación de 10 entre pines del mismo contenido), y cuando se queda sin salida relaja las reglas **para el resto de la ronda**. Los tipos que se pueden colocar con facilidad se gastan pronto y lo que sobra, el tipo al que le cuesta más colocarse (los insights sin casos, los casos con ellos), sale seguido al final.
3. **Sin casos, además, el reparto está mal planteado.** Los pesos del feed (70/15/5/5/5) se renormalizan al quitar los casos y los insights pasan a pedir el 50 % de la ronda, aunque solo haya 5. Se rellena la cuota repitiendo esos 5 insights 4-5 veces, lo que ya no cabe respetando la separación.
4. **La fuerza de los casos agrava el problema.** Con fuerza 2, casi nueve de cada diez pares de pines del mismo caso salen seguidos; con fuerza 3 o 5, más del 90 %.
5. **Los tests actuales no podían detectarlo**: comprueban conservación de pines, determinismo y que la relajación se registre, pero ninguno mide cómo se reparten los tipos a lo largo de la ronda.
6. **Hay solución, y está probada en un prototipo.** Un esquema en dos pasos (primero repartir los tipos por toda la ronda y después asignar contenidos con vista adelantada) baja la racha máxima de 11-43 pines seguidos a 1-4 en los ocho escenarios medidos. El plan está en el apartado 6.

---

## 2. Cómo funciona hoy

**Sesión y lote.** El cliente abre una sesión (`POST /api/feed/sessions`) con un scope (`home`, `work`, `insights`, `tools`, `channel`) y recibe una seed. Cada petición `GET /api/feed/{sessionId}?cursor=…` devuelve **una ronda completa**: no hay lotes dentro de la ronda, el cursor solo lleva el número de ronda. La ronda se calcula con `generateRound(snapshot, config, seed, roundIndex)`, se guarda en `feed_round` (inmutable) y se devuelve. Pedir de nuevo la misma ronda la lee tal cual.

**Cliente.** `useFeed` pide la primera ronda al abrir la sesión y la siguiente cuando un elemento centinela entra a menos de 600 px del viewport. Los lotes se concatenan en un único feed continuo (`FeedProvider`). Límite de 50 lotes por minuto por visitante. El catálogo se cachea 60 s por scope.

**Qué hace `generateRound`, en orden:**

1. Selecciona `force` pines por caso (`rotateCasePins`) y los baraja por caso; los pines de un mismo caso entran en la cola **juntos y en orden**.
2. Calcula el tamaño de la ronda. Con casos: `ceil(pinesDeCasos / 0,70)`. Sin casos: el número de contenidos que no son casos (una «vuelta completa»).
3. Reparte el hueco que dejan los casos entre insights, tools, channel y other por restos mayores, **renormalizando solo esos cuatro pesos** (15/5/5/5 pasan a 50/16,7/16,7/16,7 %).
4. Rellena cada tipo con `circularFillPool`: recorre sus contenidos como un ciclo infinito; si la cuota supera el número de contenidos, repite (esos pines llevan nivel 4).
5. Mezcla con `constrainedMix`: un bucle que, en cada hueco, ordena los tipos por «déficit» dentro de una ventana de 20 pines y coloca el **primer pin de la cola** del tipo elegido, siempre que (a) no sea del mismo tipo que el anterior y (b) su contenido no esté en los últimos 10 pines. Si ningún tipo puede, **sube un nivel de relajación** (nivel 2: permite tipo seguido; nivel 3: separación 8, 6, 4; nivel 4: sin separación). El nivel nunca baja.
6. Genera el informe de la ronda (`RoundReport`).

**Lo que funciona bien:** determinismo por seed y ronda; ninguna pérdida ni invención de pines; ciclo por tipo sin repetir contenido hasta agotar todos los de su tipo (comprobado en subhomes); persistencia de rondas; límite de peticiones.

---

## 3. Hallazgos

Severidad: **A** = afecta a lo que ve el visitante hoy; **M** = riesgo o deuda con efecto probable al crecer el catálogo; **B** = menor.

### H1 (A). La ronda termina con un solo tipo de contenido

Mecánica exacta, con la ronda real de 47 pines que genera el motor para 5 insights, 23 tools, 16 episodios y 3 «other» (H = channel, I = insight, T = tool, O = other):

`HITOIOHTITOIHIHOTHTIHOITOIOHTITIOHIIIIIIIIIIIII`

1. Cuota de insights: 23 pines (50 % de 47), repartidos entre solo 5 contenidos. Los otros tres tipos suman 24 pines.
2. La regla de separación (10 pines) bloquea a los insights: en cuanto el primero de su cola ha salido hace menos de 10 posiciones, no se puede colocar, y como solo hay 5 contenidos eso ocurre casi siempre. Mientras tanto la mezcla va colocando pines de los otros tipos. Resultado: en las primeras 34 posiciones salen los 24 pines que no son insights y solo 10 insights.
3. Cuando los otros tipos se agotan quedan 13 insights y ninguna regla permite colocarlos. La relajación sube hasta el nivel 4 (sin separación) y salen los 13 seguidos.
4. Una vez en nivel 4 **ya no se vuelve atrás**: todo lo que quede se coloca sin ninguna regla.

Con casos el mecanismo es otro, pero el resultado es el mismo: con 20 casos y el resto de tipos la ronda es `OCICHCTCICICTCICICCCCCCCCCCCC`. Como los casos no pueden ir seguidos, durante las primeras 17 posiciones se alterna caso y no-caso y los 9 pines que no son casos se gastan en un tramo en el que, por proporción, solo les correspondían ~5; los 12 últimos son todos casos.

En los dos casos, el motivo común es que la ronda se construye pin a pin y el tipo al que le cuesta más colocarse (por separación o por no poder ir seguido) se queda para el final.

### H2 (A). Sin casos, el reparto de insights es incoherente con el catálogo

- Los pesos 70/15/5/5/5 solo tienen sentido con casos. Sin ellos se renormalizan y los insights pasan a pedir el 50 % de la ronda (23 de 47) aunque solo existan 5.
- Para llegar a esa cuota `circularFillPool` repite los 5 insights más de 4 veces. Con separación 10 solo caben ~4 apariciones por contenido en 47 pines, y además el resto de tipos tiene que rellenar los huecos intermedios. No hay solución sin relajar.
- Contradice lo que dice el propio código: «cada contenido aparece una sola vez antes de empezar la siguiente vuelta» solo se cumple en subhomes. En la home sin casos, 23 de los 47 pines son repetición (nivel 4) y de las 23 tools, 16 episodios y 5 insights solo entran 24 contenidos distintos.

### H3 (A). Fuerza mayor que 1: los pines del mismo caso salen seguidos

Medido con 20 casos y 20 semillas:

| Fuerza | Pares de pines del mismo caso que salen consecutivos |
|---|---|
| 1 | ninguno |
| 2 | 88 % (17,6 de 20) |
| 3 | 91 % |
| 5 | 93 % |

Causa: los pines de un caso están juntos en su cola y la mezcla solo mira el primero. Si el primero choca con la separación, prueba otros tipos (el 30 % de la ronda); cuando se agotan, relaja, y el pin siguiente del mismo caso sale pegado.

### H4 (M). La relajación es global y el informe etiqueta mal

- El nivel de relajación es una variable de toda la ronda que solo sube. Un solo hueco difícil relaja las reglas de todos los pines siguientes, incluidos los de contenidos que no tenían ningún problema.
- `repeatedContentPins` cuenta todos los pines de nivel 4. Eso mezcla tres cosas distintas: repetición porque la cuota supera el catálogo, pines de fuerza mayor que 1 y simple relajación de separación. El informe no sirve para diagnosticar.
- `mixWindow` (ventana de 20) se calcula sobre la ronda en curso y empieza en vacío en cada ronda: al principio de cada ronda la «proporción» se decide con 1, 2, 3… pines.

### H5 (M). Las fronteras entre rondas no se vigilan

El cliente concatena las rondas en un único scroll continuo, pero `generateRound` no sabe cómo terminó la anterior. Se evita repetir contenido *dentro del ciclo de cada tipo*, pero nada impide que el último pin de la ronda *r* y el primero de la *r+1* sean del mismo tipo, ni que un contenido reaparezca a menos de 10 posiciones de la frontera.

### H6 (M). El tamaño de la ronda no tiene tope

La ronda crece con el catálogo: ~`pinesDeCasos / 0,7` con casos (60 casos de fuerza 2 son ~170 pines en una sola respuesta) y el número de contenidos sin casos. Todo llega y se monta en el DOM de una vez. Hoy no duele, y el comentario del cliente ya anticipa el troceado («cuando una ronda se trocee en varios lotes»), pero no hay ningún límite.

**Relación con el cambio de esta mañana.** Acabo de retirar `feed_config.batch_size` por no usarse. Este hallazgo sugiere que un tamaño máximo de ronda podría ser un parámetro útil. La migración **no está aplicada todavía**, así que puede descartarse sin coste (basta no aplicarla y revertir el cambio) o aplicarse y reintroducir un parámetro con otro nombre y significado cuando se decida el punto 6.4 del plan.

### H7 (B). El catálogo cambia entre rondas

El ciclo calcula los huecos con el número de contenidos del momento. Si se publica o despublica algo entre dos rondas de la misma sesión (caché de 60 s más invalidación del ABM), el reparto del ciclo se desplaza y puede repetirse o saltarse algún contenido. Efecto pequeño, aceptable, pero conviene dejarlo documentado.

### H8 (M). Lo que no se probaba

`tests/property/feed/generateRound.property.test.ts` verifica terminación, conservación de pines, separación «salvo relajación registrada» y determinismo. Ninguna prueba mide rachas, reparto por tramos de la ronda, espaciado de los pines de un caso ni fronteras entre rondas. Por eso H1 y H3 pasaron todas las comprobaciones.

---

## 4. Evidencia: motor actual frente a prototipo

Medias sobre 40 semillas por escenario (catálogo: 5 insights, 23 tools, 16 episodios, 3 «other»; separación 10). «Último tercio» = porcentaje del tipo dominante en el último tercio de la ronda. «Repite a ≤10» = pines cuyo contenido ya salió en los 10 anteriores.

| Escenario | Racha máx. del mismo tipo (actual → prototipo) | Repite a ≤10 (actual → prototipo) | Último tercio, tipo dominante (actual → prototipo) |
|---|---|---|---|
| A. Sin casos | 12,3 → 1,0 | 10,7 → 0,03 | 86 % → 44 % |
| B. Sin casos, otro catálogo (8/12/10) | 11,4 → 2,0 | 5,0 → 1,5 | 100 % → 60 % |
| C. 20 casos, fuerza 1 | 11,9 → 2,1 | 0 → 0 | 100 % → 70 % |
| D. 40 casos, fuerza 1 | 15,4 → 3,0 | 0 → 0 | 92 % → 70 % |
| E. 20 casos, fuerza 2 | 29,2 → 3,0 | 20,5 → 0 | 100 % → 70 % |
| F. 20 casos, fuerza 3 | 42,9 → 4,0 | 40,8 → 0 | 100 % → 69 % |
| G. 6 casos, fuerza 2 | 10,8 → 2,8 | 6,1 → 2,7 | 100 % → 67 % |
| H. 20 casos, fuerza 1 a 3 | 31,1 → 4,0 | 19,3 → 1,1 | 100 % → 68 % |

Lecturas: con casos, el 70 % del último tercio es la proporción correcta (los casos son el 70 % de la ronda); lo que se busca es que no sea el 100 %. En el escenario G (6 casos) la repetición residual es inevitable: con 6 casos no se pueden separar 10 posiciones, y el prototipo solo relaja lo imprescindible, hueco a hueco. En el escenario B quedan 1,5 repeticiones por ronda por el mismo motivo (8 insights con cuota de 18).

El código del prototipo y de las medidas está en `auditoria-feed-2026-10-14-simulacion.ts.txt` (archivo de texto, fuera de la batería de tests, para poder repetir las mediciones).

---

## 5. Principios del rediseño

1. **El reparto de tipos se decide para toda la ronda, no hueco a hueco.** Cada tipo recibe posiciones espaciadas de forma uniforme; nada se «gasta» antes de tiempo.
2. **Primero el esqueleto, después los contenidos.** Una vez fijado qué tipo va en cada posición, se elige el contenido concreto con vista adelantada: se toma el primero de la cola del tipo que no esté en los últimos 10 pines, no estrictamente el primero.
3. **Relajar es local.** Si en un hueco no hay alternativa, se relaja solo ese hueco y la regla vuelve a estar activa en el siguiente.
4. **Las cuotas respetan el catálogo.** Ningún tipo puede pedir más pines de los que su catálogo permite colocar respetando la separación; el sobrante se reparte entre los demás tipos, y si no cabe, la ronda se acorta.
5. **Un caso es un contenido más.** Su fuerza solo cambia cuántas veces aparece por ronda, y esas apariciones se espacian como las de cualquier otro contenido.
6. **El informe distingue las causas:** separación relajada, repetición por falta de catálogo y repetición por fuerza.

---

## 6. Plan

### 6.1 Decisiones de producto previas (breves, antes de programar)

1. **Sin casos, ¿cómo se reparten insights, tools, channel y other?** Propuesta: seguir renormalizando los pesos (el comportamiento actual) pero con el tope por capacidad del principio 4. En el catálogo de ejemplo, los insights pasarían de 23 a 20 pines de 47 y el resto lo absorben tools, channel y other. Alternativa: cuotas más planas cuando faltan casos (p. ej. 25/25/25/25 %), que se parece más a «una vuelta» y repite menos.
2. **Fuerza.** Propuesta: se mantiene la definición actual (pines aportados por ronda) pero repartidos a lo largo de toda la ronda. Alternativa: que la fuerza sea un peso de frecuencia *entre rondas* y no dentro de una (un caso de fuerza 3 aparece en una de cada ~3 rondas con mayor protagonismo). La primera conserva el brief; la segunda da rondas más limpias. Recomiendo la primera.
3. **Adyacencia.** Los tipos con más del 50 % de la ronda (los casos, por definición) pueden aparecer seguidos, porque evitarlo es imposible; los minoritarios nunca deben aparecer seguidos salvo que el catálogo lo obligue. Propuesta: formalizarlo así en el brief.
4. **Tamaño máximo de ronda** (H6). Propuesta: aplazarlo, anotar la cifra a partir de la cual se hace (p. ej. 120 pines) y decidir entonces si se trocea la respuesta en varios lotes por cursor, o si se reutiliza `batch_size` como tope.

### 6.2 Fases

**Fase 1 — Pruebas primero (rojas).** Añadir propiedades que hoy fallan:
- ningún tramo de más de 3 pines consecutivos del mismo tipo salvo en el tipo mayoritario;
- el reparto por tercios no se desvía más de 10 puntos de la proporción global;
- los pines de un mismo caso nunca salen seguidos, salvo que haya menos de 10 casos distintos;
- las apariciones de un contenido en una ronda están separadas por la distancia, salvo relajación registrada y localizada;
- sobre una matriz de catálogos (sin casos / con casos / fuerzas 1 a 5 / catálogos pequeños), con 100 semillas cada una.

**Fase 2 — Nuevo mezclador** (`generateRound.ts`, `constrainedMix.ts`, `rotateQueue.ts`, `quotas.ts`):
1. Casos por capas: la capa *n* contiene el pin *n* de cada caso de fuerza ≥ *n*, barajada por capa; entre capas se evita que un caso quede pegado a sí mismo. Es lo que hace ya `circularFillPool` por vueltas.
2. Cuotas con tope de capacidad y reparto del sobrante (water-filling sobre `largestRemainderQuotas`).
3. Esqueleto de tipos: para cada posición, elegir el tipo con mayor déficit acumulado respecto a su cuota exacta (`cuota × (t+1) / T`), con ruido de la seed para desempatar; sin tipo seguido salvo el mayoritario.
4. Asignación de contenido con vista adelantada y relajación local.
5. Informe nuevo con tres contadores separados (ver H4). Retirar `mixWindow` y el sistema de niveles global, que dejan de tener función; decidir si se retira `feed_config.mix_window` como se ha hecho con `batch_size`.

**Fase 3 — Fronteras entre rondas** (H5). Pasar a `generateRound` la cola de la ronda anterior (los últimos 10 pines, leídos de `feed_round`, que ya la guarda) para que el esqueleto no empiece con el mismo tipo con el que acabó y la separación cuente a través de la frontera. Si la ronda anterior no está (acceso directo a una ronda), se genera sin historial.

**Fase 4 — Verificación.**
1. La batería de la Fase 1 en verde y la suite completa.
2. El script de simulación del anexo, ejecutado sobre el catálogo real exportado del ABM (número de contenidos y pines por tipo y fuerza de cada caso): comparar con las tablas de este informe.
3. Prueba manual en la home y en `/insights`, `/tools` y `/channel`: recorrer al menos 3 rondas en dos sesiones.
4. Comprobar en Plausible que `Feed Depth` sigue registrando una ronda por lote.

**Fase 5 (opcional, según 6.1 punto 4) — Tamaño de ronda y troceado.**

### 6.3 Compatibilidad y riesgo de despliegue

- **Sin migraciones.** Es solo lógica de dominio.
- **Sesiones en curso:** las rondas ya guardadas en `feed_round` se sirven tal cual; las nuevas salen con el algoritmo nuevo. Dentro de una misma sesión puede haber un salto de comportamiento en la frontera, sin consecuencias visibles.
- **Determinismo:** se conserva (misma seed y ronda, misma salida), pero **cambia el orden concreto** que verá cada seed respecto a hoy. Los tests que fijan secuencias exactas, si los hay, habrá que regenerarlos.
- **Vuelta atrás:** revertir los ficheros del dominio basta; no hay estado persistente nuevo.
- **Riesgo principal:** que la nueva mezcla resulte demasiado «pareja». Una pequeña cantidad de ruido en el esqueleto (ya incluida en el prototipo) evita el patrón fijo; se afina con la inspección manual de la Fase 4.

### 6.4 Esfuerzo estimado

Decisiones del apartado 6.1: una conversación breve. Fases 1 y 2: la parte principal del trabajo (un día de desarrollo con revisión). Fase 3: media jornada. Fase 4: media jornada, parte con datos reales del catálogo. Fase 5: se estimará si se decide hacerla.

---

## 7. La solución para la fuerza, en concreto

Un caso se trata como cualquier otro contenido que aparece más de una vez por ronda.

1. Las apariciones se organizan por capas. Con 20 casos y fuerzas de 1 a 3, la capa 1 tiene 20 pines (uno por caso), la capa 2 los de fuerza ≥ 2 y la capa 3 los de fuerza 3. Cada capa se baraja de forma distinta, así dos pines del mismo caso quedan separados por casi toda una capa.
2. El esqueleto de tipos reparte esos pines por toda la ronda, y la asignación con vista adelantada garantiza que la separación mínima (10) se respete siempre que haya al menos 10 casos distintos.
3. Si hay menos de 10 casos distintos, la separación máxima posible es el número de casos. Se relaja solo lo necesario y se anota como «relajación de separación», no como repetición.
4. Si la fuerza supera el número de pines del caso (fuerza 4 con 3 pines), el caso repite pines; eso sí se anota, como «repetición por fuerza».
5. Con el prototipo, en el escenario E (20 casos de fuerza 2) los pines seguidos pasan de 17 a 0 por ronda y en el F (fuerza 3) de 36 a 0.

---

## 8. Preguntas abiertas

1. ¿Qué hacemos cuando no hay casos: renormalizar con tope por capacidad (recomendado) o cuotas más planas?
2. ¿La fuerza mantiene su significado actual (pines por ronda, repartidos) o pasa a ser frecuencia entre rondas?
3. ¿Se aplica o se descarta la migración que retira `feed_config.batch_size`, dado H6?
4. ¿Se retira también `mix_window` cuando el nuevo mezclador deje de usarlo?
5. ¿Hay un catálogo real exportable del ABM (nº de contenidos y pines por tipo, fuerza de cada caso) para correr las mediciones de la Fase 4 con datos reales?

---

## 9. Anexo: método de medición

- Motor real (`generateRound`) frente a un prototipo del esquema propuesto, sobre 8 catálogos sintéticos, 40 semillas por escenario y rondas 0 a 2.
- Métricas: racha máxima de pines consecutivos del mismo tipo, pines cuyo contenido ya salió en los 10 anteriores, pares consecutivos del mismo contenido, desviación del reparto por tercios, porcentaje del tipo dominante en el último tercio.
- El prototipo no está integrado: la ronda de ejemplo y las cifras se pueden reproducir con `auditoria-feed-2026-10-14-simulacion.ts.txt` copiándolo como test temporal en `tests/` y ejecutando `npx vitest run`.

---

## 10. Decisiones de Greener (14 oct, tarde) y simulaciones con catálogo realista

### 10.1 Decisiones tomadas

1. **Se mantiene la renormalización de los pesos** cuando no hay casos. Ese escenario solo existe en esta fase previa a la publicación; no se optimiza para él (los escenarios A y B del apartado 4 pierden prioridad).
2. **Se elimina la regla de separación de 10 posiciones** entre pines del mismo contenido: con pocos tipos y pocos contenidos por tipo no es cumplible. `distanceWindow` y `mixWindow` dejarán de usarse en el mezclador nuevo.
3. **Única regla de vecindad:** ningún pin de un tipo minoritario (todo salvo casos) va seguido de otro del mismo tipo. El algoritmo reparte los tipos por proporción y se organiza como quiera dentro de esa regla.
4. **Tamaño de la ronda y carga por partes:** pendiente de la respuesta del apartado 10.5.

### 10.2 Escenarios medidos

Motor actual y prototipo, 30 semillas por escenario, ronda 0:

- **S1 (el tuyo):** 150 casos con fuerzas 1 a 5 repartidas por igual (media 3), 50 tools, 20 insights, 40 episodios y 7 «other».
- **S2:** igual, pero con fuerzas sesgadas a lo bajo (60 % de fuerza 1, 25 % de 2, 10 % de 3, 5 % de 5).
- **S3:** 150 casos todos de fuerza 1.
- **S4 (lanzamiento):** 40 casos de fuerza 1 a 5, 30 tools, 12 insights, 20 episodios y 5 «other».

Composición de la ronda con el catálogo S1: 450 pines de caso (150 casos × fuerza media 3) y 193 de los demás tipos, **643 pines en total**: 97 insights (4,85 apariciones por insight), 32 tools (0,64 por tool), 32 episodios (0,8 por episodio) y 32 «other» (4,6 por «other»). Las tools y los episodios dan la vuelta completa en 2 rondas.

### 10.3 ¿Hay casos que no salen nunca?

No. La ronda incluye **todos** los casos, cada uno con tantos pines como su fuerza (los 450 pines caben porque el tamaño de la ronda se calcula a partir de ellos: 450 ÷ 0,7 ≈ 643). Con fuerza 5 no se «roban» huecos a nadie. Lo que cambia con un catálogo grande es **cuánto de la ronda llega a ver cada visitante**: en S1, con 40 pines ve el 19 % de los casos, con 100 el 47 % y con 200 el 77-93 %. Como el orden es distinto en cada sesión, entre visitantes todos los casos salen; dentro de una sola visita se ve la parte de la ronda que se haya recorrido. Si la ronda se sirve por tramos (10.5), lo no visto en una visita simplemente no se pide.

### 10.4 La tensión entre «fuerza» y «no repetir hasta haber visto todos los demás»

Las dos reglas no pueden cumplirse a la vez dentro de una ronda. Si un caso de fuerza 5 aparece 5 veces, alguna de esas apariciones tiene que llegar antes de que hayan salido todos los demás casos. Hay dos maneras de resolverlo y las he medido:

- **Modelo A, por capas (se respeta la regla estricta):** primero sale una vez cada caso, después los de fuerza ≥ 2 una segunda vez, y así. Ningún caso se repite antes de haber salido todos. Pero la fuerza **no influye en lo que ve el visitante** hasta pasada la primera capa (los 150 casos salen una vez hasta la posición ~213 de 643).
- **Modelo B, estratificado (la fuerza es un peso):** las apariciones de un caso se reparten a intervalos regulares por toda la ronda (cada ~1/fuerza de la ronda). La fuerza manda sobre la probabilidad de verlo y las repeticiones quedan muy espaciadas.

Resultados en S1 (media de 30 semillas):

| | Modelo A (capas) | Modelo B (estratificado) |
|---|---|---|
| Probabilidad de ver un caso en los primeros 100 pines, fuerza 1 / 2 / 3 / 4 / 5 | 46 / 48 / 48 / 45 / 46 % | 14 / 30 / 46 / 62 / 80 % |
| Apariciones medias en los primeros 200 pines, fuerza 1 / 3 / 5 | 0,92 / 0,93 / 0,93 | 0,30 / 0,94 / 1,55 |
| Pines de caso repetidos antes de haber salido todos los casos | 0 | casi todas las repeticiones (288 de 300) |
| Visitas que ven un caso repetido en los primeros 40 / 100 / 200 pines | 0 / 0 / 0 % (la primera repetición llega pasada la posición ~213) | 0 / 0 / 100 % (la primera repetición cae entre la 100 y la 200) |
| Hueco entre dos apariciones del mismo caso | medio: 150 posiciones | medio: 174; el más corto de cada ronda, 113 de media (p5: 120; mediana: 157) |

Lectura: en el catálogo S1 **ninguna visita ve un caso repetido en sus primeros 100 pines con ninguno de los dos modelos**; la diferencia es que con A la fuerza es invisible para la mayoría de las visitas (todos los casos tienen la misma probabilidad de verse) y con B se nota desde el principio. En S3 (todos de fuerza 1) los dos modelos son idénticos: cada caso sale una vez, sin repeticiones. Con B, las repeticiones llegan antes cuanto más alta es la fuerza y más corta la ronda: en S2 (fuerzas sesgadas, ronda de 352 pines, el hueco más corto de cada ronda baja a 57) el 98 % de las visitas ve algún caso repetido antes del pin 100, y en el catálogo pequeño S4 (40 casos con fuerzas altas, hueco más corto 28) el 70 % lo ve en los primeros 40. Es el precio de que la fuerza pese: un caso de fuerza 5 vuelve cada ~1/5 de la ronda.

**Recomendación: modelo B**, con la regla redefinida como «un caso no se repite antes de que hayan pasado, como mínimo, 1/fuerza de la ronda en la secuencia de casos», que es lo que da los huecos de 113-157 posiciones. Es el único con el que la fuerza «tiene valor». Detalle técnico: el desfase inicial de cada caso se fija por sesión (con una pequeña variación por ronda) para que el hueco se mantenga también al cruzar de una ronda a la siguiente.

### 10.5 Pregunta 4: ¿cuánto cuesta precalcular la ronda y servir los pines por partes?

**Precalcular es barato, y ya se hace.** `feed_round.ordered_pin_ids` guarda hoy la secuencia completa de cada ronda como una lista de ids. En el catálogo S1 generar los 643 pines cuesta 1-4 ms de CPU, y guardarlos ocupa unos 10 KB por ronda y sesión (643 × 16 bytes). El coste es proporcional al tamaño de la ronda: aun con varios miles de pines sigue siendo cuestión de decenas de milisegundos.

**Lo que no escala es lo que viene después de generarla**, tal como funciona hoy (la ronda entera es un único lote):

1. **La respuesta:** 643 pines × ~500 bytes ≈ **314 KB** por petición sin comprimir, frente a ~20 KB por 40 pines.
2. **El enriquecimiento al releer una ronda guardada:** `getPinDirectoryByIds` consulta Supabase con `.in('id', …)` por URL. Con 643 ids son unos **23 KB de URL** (con 40 ids, 1,4 KB). Muchos proxies y pasarelas cortan por encima de ~8 KB; **no lo he podido comprobar contra el límite real de Supabase**, pero no conviene depender de ello.
3. **El navegador:** la virtualización del feed trabaja por lotes (`batchSizes`): cada lote se monta o se desmonta como una unidad. Un lote de 643 pines monta los 643 nodos a la vez. Las imágenes ya se cargan en diferido (`loading="lazy"`), pero los nodos, las posiciones del masonry y los vídeos no.

**Propuesta: separar «ronda» de «lote».** La ronda sigue siendo la vuelta completa, precalculada y guardada. El cursor pasa a llevar `{ronda, desplazamiento}` y cada petición devuelve un trozo de ~40-60 pines: el servidor lee la ronda guardada (10 KB), toma el trozo, lo enriquece con 40 ids y lo devuelve (~20 KB). Eso es exactamente lo que describes: orden global fijado de antemano, e imágenes y DOM cargados por partes como hoy. El cliente apenas cambia: ya concatena lotes de tamaño variable y ya virtualiza por lote.

- **Coste de la implementación:** pequeño-medio. Cursor (`cursor.ts`), `getFeedSessionBatch`, la ruta `GET /api/feed/{sessionId}` y sus tests; ajustar el evento `Feed Depth` (ya tiene un campo `batch` pensado para esto). Sin migraciones: `feed_round` ya sirve.
- **Tamaño del lote:** la columna `feed_config.batch_size` (valor por defecto 40) es **exactamente ese parámetro**. Recomiendo, por tanto, **no aplicar la migración que la elimina** (`20261014100000_drop_feed_config_batch_size.sql`) y, al implementar los lotes, volver a leerla como tamaño del lote (el cambio de esta mañana se revierte al implementarlo, no antes).
- **Si el catálogo creciera mucho** (por ejemplo 1.000 casos de fuerza media 3 ≈ 4.300 pines por ronda, una fila de ~70 KB y unas decenas de ms de generación, extrapolado, no medido), el esquema sigue funcionando; solo habría que mirar la memoria y el tamaño de la fila. Propongo fijar el umbral de revisión en **2.000 pines por ronda**.
- **Un aviso de operación:** las filas de `feed_session` y `feed_round` caducadas no las borra nadie (pendiente ya anotado en `PROGRESO.md`). Con rondas más largas (10 KB en vez de ~1 KB) esa limpieza gana importancia.

### 10.6 Cambios en el plan de la sección 6

- **Fase 2, mezclador simplificado:** sin vista adelantada ni distancia mínima. Casos estratificados (modelo B). Cuotas de los demás tipos por restos mayores, renormalizadas como hoy, sin tope por capacidad. Esqueleto de tipos por déficit acumulado con la regla de vecindad del 10.1. Informe nuevo con contadores separados.
- **Regla de vecindad más estricta, sin coste:** en S1 a S4 no aparecen **ni siquiera** dos pines de tipos minoritarios seguidos (de cualquier tipo) con el esqueleto nuevo, porque los casos (70 %) los separan siempre. Se puede formalizar la regla fuerte («ningún pin que no sea un caso va pegado a otro que no sea un caso») cuando los casos sean al menos la mitad de la ronda, y la débil (mismo tipo) en el resto.
- **Fase 3, fronteras entre rondas:** para los casos, queda resuelta por el desfase fijado por sesión; para el resto, basta pasar el tipo del último pin de la ronda anterior.
- **Nueva Fase 3b, lotes por tramos** (10.5). Orden recomendado: primero el mezclador con sus pruebas, después los lotes.
- **Fase 1, pruebas:** sustituir las propiedades de «distancia» por las nuevas: ningún tipo minoritario seguido, reparto de tipos por tercios, hueco mínimo entre apariciones de un caso proporcional a 1/fuerza, y todas las tools, episodios, insights y «other» recorridos antes de repetir.

### 10.7 Decisiones pendientes

1. **Modelo de fuerza:** A (capas) o B (estratificado, recomendado).
2. **Tamaño del lote:** ¿40 pines? (valor actual de `batch_size`), con la posibilidad de un lote menor en móvil.
3. **Migración de `batch_size`:** no aplicarla y reutilizarla como tamaño del lote (recomendado), o aplicarla y fijar el tamaño en código.
4. **Umbral de revisión de la ronda completa:** 2.000 pines.

Las simulaciones están en `auditoria-feed-2026-10-14-simulacion-realista.ts.txt` (se ejecutan copiando el fichero como test temporal, igual que el anterior).
