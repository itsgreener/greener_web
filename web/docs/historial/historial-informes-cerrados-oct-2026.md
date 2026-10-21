# Historial — informes y planes cerrados (octubre de 2026)

Archivo de los informes y planes del 8 al 21 de octubre de 2026 que dejaron de ser documentos vivos: sus hallazgos están aplicados o recogidos en otro sitio, y mantenerlos como ficheros sueltos dejaba en `docs/` instrucciones que ya no se cumplen. Se archivaron el 21 de octubre de 2026 (§2.98 de `historial-fase-5.md`) con su texto íntegro, solo con los encabezados bajados un nivel.

Cómo leerlo: cada apartado conserva su numeración interna («apartado 10», «H3», «O2»…), que se cita junto al número del informe («informe 1, apartado 10»). Las menciones a los ficheros originales y a la carpeta `docs/auditorias/` son las de la fecha de cada informe: esa carpeta ya no existe. Los dos scripts de simulación de la auditoría del feed (`auditoria-feed-2026-10-14-simulacion.ts.txt` y `…-simulacion-realista.ts.txt`) se retiraron: eran prototipos del algoritmo que hoy está en `src/modules/feed/domain/` con sus tests, y el método de medición está descrito en el apartado 9 del informe 1.

| Nº | Informe | Fecha | Desenlace |
| --- | --- | --- | --- |
| 1 | Auditoría del feed: rondas, lotes y algoritmo de mezcla | 14 oct 2026 | Implementada el mismo día (§2.68 de `historial-fase-5.md`); el motor vive en `src/modules/feed/domain/`. |
| 2 | Auditoría general y del tipo `other` | 14 oct 2026 | Decisiones D1-D5 cerradas el 15 oct en `especificaciones/plan-other-pines-y-paginas.md`, que se ejecutó en las fases 0-5 (§2.72-§2.79). |
| 3 | Plan de pendientes del 16 de octubre | 16 oct 2026 | Bloques A, B y C ejecutados (§2.80); el D es `especificaciones/plan-talent-careers.md`; el E (fase 6 de `other`) sigue en pausa y está en `PROGRESO.md`. |
| 4 | Auditoría de errores y código muerto | 16 oct 2026 | Cambios aplicados (§2.81) y puntos 1-3 resueltos (§2.82). El punto 4 (`cookie-audit-all/` y `tsconfig.tsbuildinfo` fuera del repositorio) pasa a `PROGRESO.md`. |
| 5 | Simulación de la carga del vídeo en hover | 16 oct 2026 | Informó la decisión A3 del plan de pendientes (sin prefetch en hover), ya implementada. Los scripts siguen en `scripts/sim-video-hover/`. |
| 6 | Auditoría de `src` del 8 de octubre | 8 oct 2026 | Las cinco fases se hicieron el 9 oct (§2.57 a §2.61 de `historial-fase-5.md`); no queda nada pendiente. |

---

## 1. Auditoría del feed: rondas, lotes y algoritmo de mezcla

*Fichero original: `auditoria-feed-2026-10-14.md` (14 oct 2026).* **Desenlace:** Implementada el mismo día (§2.68 de `historial-fase-5.md`); el motor vive en `src/modules/feed/domain/`.

**Estado: implementado el mismo día (PROGRESO §2.68).** Fecha: 14 de octubre de 2026 (apartado 10 añadido por la tarde, con las decisiones de Greener y las simulaciones con catálogo realista). Estado analizado: el código del zip de esa fecha (motor en `src/modules/feed/domain/`, API en `src/app/api/feed/`, cliente en `src/components/masonry/`). Todo lo medido aquí sale de ejecutar el motor real con catálogos simulados; no se ha tocado ningún fichero del proyecto para esta auditoría.

---

### 1. Resumen

1. **El síntoma que describes es real y es más general de lo que parece.** En todas las configuraciones probadas (con y sin casos, con cualquier fuerza), el último tercio de cada ronda sale con un solo tipo de contenido. Sin casos son insights; con casos son casos. No es un error de insights: es cómo mezcla el algoritmo.
2. **La causa es de diseño, no un fallo puntual.** La mezcla va colocando pines uno a uno con reglas duras (no repetir tipo seguido, separación de 10 entre pines del mismo contenido), y cuando se queda sin salida relaja las reglas **para el resto de la ronda**. Los tipos que se pueden colocar con facilidad se gastan pronto y lo que sobra, el tipo al que le cuesta más colocarse (los insights sin casos, los casos con ellos), sale seguido al final.
3. **Sin casos, además, el reparto está mal planteado.** Los pesos del feed (70/15/5/5/5) se renormalizan al quitar los casos y los insights pasan a pedir el 50 % de la ronda, aunque solo haya 5. Se rellena la cuota repitiendo esos 5 insights 4-5 veces, lo que ya no cabe respetando la separación.
4. **La fuerza de los casos agrava el problema.** Con fuerza 2, casi nueve de cada diez pares de pines del mismo caso salen seguidos; con fuerza 3 o 5, más del 90 %.
5. **Los tests actuales no podían detectarlo**: comprueban conservación de pines, determinismo y que la relajación se registre, pero ninguno mide cómo se reparten los tipos a lo largo de la ronda.
6. **Hay solución, y está probada en un prototipo.** Un esquema en dos pasos (primero repartir los tipos por toda la ronda y después asignar contenidos con vista adelantada) baja la racha máxima de 11-43 pines seguidos a 1-4 en los ocho escenarios medidos. El plan está en el apartado 6.

---

### 2. Cómo funciona hoy

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

### 3. Hallazgos

Severidad: **A** = afecta a lo que ve el visitante hoy; **M** = riesgo o deuda con efecto probable al crecer el catálogo; **B** = menor.

#### H1 (A). La ronda termina con un solo tipo de contenido

Mecánica exacta, con la ronda real de 47 pines que genera el motor para 5 insights, 23 tools, 16 episodios y 3 «other» (H = channel, I = insight, T = tool, O = other):

`HITOIOHTITOIHIHOTHTIHOITOIOHTITIOHIIIIIIIIIIIII`

1. Cuota de insights: 23 pines (50 % de 47), repartidos entre solo 5 contenidos. Los otros tres tipos suman 24 pines.
2. La regla de separación (10 pines) bloquea a los insights: en cuanto el primero de su cola ha salido hace menos de 10 posiciones, no se puede colocar, y como solo hay 5 contenidos eso ocurre casi siempre. Mientras tanto la mezcla va colocando pines de los otros tipos. Resultado: en las primeras 34 posiciones salen los 24 pines que no son insights y solo 10 insights.
3. Cuando los otros tipos se agotan quedan 13 insights y ninguna regla permite colocarlos. La relajación sube hasta el nivel 4 (sin separación) y salen los 13 seguidos.
4. Una vez en nivel 4 **ya no se vuelve atrás**: todo lo que quede se coloca sin ninguna regla.

Con casos el mecanismo es otro, pero el resultado es el mismo: con 20 casos y el resto de tipos la ronda es `OCICHCTCICICTCICICCCCCCCCCCCC`. Como los casos no pueden ir seguidos, durante las primeras 17 posiciones se alterna caso y no-caso y los 9 pines que no son casos se gastan en un tramo en el que, por proporción, solo les correspondían ~5; los 12 últimos son todos casos.

En los dos casos, el motivo común es que la ronda se construye pin a pin y el tipo al que le cuesta más colocarse (por separación o por no poder ir seguido) se queda para el final.

#### H2 (A). Sin casos, el reparto de insights es incoherente con el catálogo

- Los pesos 70/15/5/5/5 solo tienen sentido con casos. Sin ellos se renormalizan y los insights pasan a pedir el 50 % de la ronda (23 de 47) aunque solo existan 5.
- Para llegar a esa cuota `circularFillPool` repite los 5 insights más de 4 veces. Con separación 10 solo caben ~4 apariciones por contenido en 47 pines, y además el resto de tipos tiene que rellenar los huecos intermedios. No hay solución sin relajar.
- Contradice lo que dice el propio código: «cada contenido aparece una sola vez antes de empezar la siguiente vuelta» solo se cumple en subhomes. En la home sin casos, 23 de los 47 pines son repetición (nivel 4) y de las 23 tools, 16 episodios y 5 insights solo entran 24 contenidos distintos.

#### H3 (A). Fuerza mayor que 1: los pines del mismo caso salen seguidos

Medido con 20 casos y 20 semillas:

| Fuerza | Pares de pines del mismo caso que salen consecutivos |
|---|---|
| 1 | ninguno |
| 2 | 88 % (17,6 de 20) |
| 3 | 91 % |
| 5 | 93 % |

Causa: los pines de un caso están juntos en su cola y la mezcla solo mira el primero. Si el primero choca con la separación, prueba otros tipos (el 30 % de la ronda); cuando se agotan, relaja, y el pin siguiente del mismo caso sale pegado.

#### H4 (M). La relajación es global y el informe etiqueta mal

- El nivel de relajación es una variable de toda la ronda que solo sube. Un solo hueco difícil relaja las reglas de todos los pines siguientes, incluidos los de contenidos que no tenían ningún problema.
- `repeatedContentPins` cuenta todos los pines de nivel 4. Eso mezcla tres cosas distintas: repetición porque la cuota supera el catálogo, pines de fuerza mayor que 1 y simple relajación de separación. El informe no sirve para diagnosticar.
- `mixWindow` (ventana de 20) se calcula sobre la ronda en curso y empieza en vacío en cada ronda: al principio de cada ronda la «proporción» se decide con 1, 2, 3… pines.

#### H5 (M). Las fronteras entre rondas no se vigilan

El cliente concatena las rondas en un único scroll continuo, pero `generateRound` no sabe cómo terminó la anterior. Se evita repetir contenido *dentro del ciclo de cada tipo*, pero nada impide que el último pin de la ronda *r* y el primero de la *r+1* sean del mismo tipo, ni que un contenido reaparezca a menos de 10 posiciones de la frontera.

#### H6 (M). El tamaño de la ronda no tiene tope

La ronda crece con el catálogo: ~`pinesDeCasos / 0,7` con casos (60 casos de fuerza 2 son ~170 pines en una sola respuesta) y el número de contenidos sin casos. Todo llega y se monta en el DOM de una vez. Hoy no duele, y el comentario del cliente ya anticipa el troceado («cuando una ronda se trocee en varios lotes»), pero no hay ningún límite.

**Relación con el cambio de esta mañana.** Acabo de retirar `feed_config.batch_size` por no usarse. Este hallazgo sugiere que un tamaño máximo de ronda podría ser un parámetro útil. La migración **no está aplicada todavía**, así que puede descartarse sin coste (basta no aplicarla y revertir el cambio) o aplicarse y reintroducir un parámetro con otro nombre y significado cuando se decida el punto 6.4 del plan.

#### H7 (B). El catálogo cambia entre rondas

El ciclo calcula los huecos con el número de contenidos del momento. Si se publica o despublica algo entre dos rondas de la misma sesión (caché de 60 s más invalidación del ABM), el reparto del ciclo se desplaza y puede repetirse o saltarse algún contenido. Efecto pequeño, aceptable, pero conviene dejarlo documentado.

#### H8 (M). Lo que no se probaba

`tests/property/feed/generateRound.property.test.ts` verifica terminación, conservación de pines, separación «salvo relajación registrada» y determinismo. Ninguna prueba mide rachas, reparto por tramos de la ronda, espaciado de los pines de un caso ni fronteras entre rondas. Por eso H1 y H3 pasaron todas las comprobaciones.

---

### 4. Evidencia: motor actual frente a prototipo

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

El código del prototipo y de las medidas está en `docs/auditorias/auditoria-feed-2026-10-14-simulacion.ts.txt` (archivo de texto, fuera de la batería de tests, para poder repetir las mediciones).

---

### 5. Principios del rediseño

1. **El reparto de tipos se decide para toda la ronda, no hueco a hueco.** Cada tipo recibe posiciones espaciadas de forma uniforme; nada se «gasta» antes de tiempo.
2. **Primero el esqueleto, después los contenidos.** Una vez fijado qué tipo va en cada posición, se elige el contenido concreto con vista adelantada: se toma el primero de la cola del tipo que no esté en los últimos 10 pines, no estrictamente el primero.
3. **Relajar es local.** Si en un hueco no hay alternativa, se relaja solo ese hueco y la regla vuelve a estar activa en el siguiente.
4. **Las cuotas respetan el catálogo.** Ningún tipo puede pedir más pines de los que su catálogo permite colocar respetando la separación; el sobrante se reparte entre los demás tipos, y si no cabe, la ronda se acorta.
5. **Un caso es un contenido más.** Su fuerza solo cambia cuántas veces aparece por ronda, y esas apariciones se espacian como las de cualquier otro contenido.
6. **El informe distingue las causas:** separación relajada, repetición por falta de catálogo y repetición por fuerza.

---

### 6. Plan

#### 6.1 Decisiones de producto previas (breves, antes de programar)

1. **Sin casos, ¿cómo se reparten insights, tools, channel y other?** Propuesta: seguir renormalizando los pesos (el comportamiento actual) pero con el tope por capacidad del principio 4. En el catálogo de ejemplo, los insights pasarían de 23 a 20 pines de 47 y el resto lo absorben tools, channel y other. Alternativa: cuotas más planas cuando faltan casos (p. ej. 25/25/25/25 %), que se parece más a «una vuelta» y repite menos.
2. **Fuerza.** Propuesta: se mantiene la definición actual (pines aportados por ronda) pero repartidos a lo largo de toda la ronda. Alternativa: que la fuerza sea un peso de frecuencia *entre rondas* y no dentro de una (un caso de fuerza 3 aparece en una de cada ~3 rondas con mayor protagonismo). La primera conserva el brief; la segunda da rondas más limpias. Recomiendo la primera.
3. **Adyacencia.** Los tipos con más del 50 % de la ronda (los casos, por definición) pueden aparecer seguidos, porque evitarlo es imposible; los minoritarios nunca deben aparecer seguidos salvo que el catálogo lo obligue. Propuesta: formalizarlo así en el brief.
4. **Tamaño máximo de ronda** (H6). Propuesta: aplazarlo, anotar la cifra a partir de la cual se hace (p. ej. 120 pines) y decidir entonces si se trocea la respuesta en varios lotes por cursor, o si se reutiliza `batch_size` como tope.

#### 6.2 Fases

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

#### 6.3 Compatibilidad y riesgo de despliegue

- **Sin migraciones.** Es solo lógica de dominio.
- **Sesiones en curso:** las rondas ya guardadas en `feed_round` se sirven tal cual; las nuevas salen con el algoritmo nuevo. Dentro de una misma sesión puede haber un salto de comportamiento en la frontera, sin consecuencias visibles.
- **Determinismo:** se conserva (misma seed y ronda, misma salida), pero **cambia el orden concreto** que verá cada seed respecto a hoy. Los tests que fijan secuencias exactas, si los hay, habrá que regenerarlos.
- **Vuelta atrás:** revertir los ficheros del dominio basta; no hay estado persistente nuevo.
- **Riesgo principal:** que la nueva mezcla resulte demasiado «pareja». Una pequeña cantidad de ruido en el esqueleto (ya incluida en el prototipo) evita el patrón fijo; se afina con la inspección manual de la Fase 4.

#### 6.4 Esfuerzo estimado

Decisiones del apartado 6.1: una conversación breve. Fases 1 y 2: la parte principal del trabajo (un día de desarrollo con revisión). Fase 3: media jornada. Fase 4: media jornada, parte con datos reales del catálogo. Fase 5: se estimará si se decide hacerla.

---

### 7. La solución para la fuerza, en concreto

Un caso se trata como cualquier otro contenido que aparece más de una vez por ronda.

1. Las apariciones se organizan por capas. Con 20 casos y fuerzas de 1 a 3, la capa 1 tiene 20 pines (uno por caso), la capa 2 los de fuerza ≥ 2 y la capa 3 los de fuerza 3. Cada capa se baraja de forma distinta, así dos pines del mismo caso quedan separados por casi toda una capa.
2. El esqueleto de tipos reparte esos pines por toda la ronda, y la asignación con vista adelantada garantiza que la separación mínima (10) se respete siempre que haya al menos 10 casos distintos.
3. Si hay menos de 10 casos distintos, la separación máxima posible es el número de casos. Se relaja solo lo necesario y se anota como «relajación de separación», no como repetición.
4. Si la fuerza supera el número de pines del caso (fuerza 4 con 3 pines), el caso repite pines; eso sí se anota, como «repetición por fuerza».
5. Con el prototipo, en el escenario E (20 casos de fuerza 2) los pines seguidos pasan de 17 a 0 por ronda y en el F (fuerza 3) de 36 a 0.

---

### 8. Preguntas abiertas

1. ¿Qué hacemos cuando no hay casos: renormalizar con tope por capacidad (recomendado) o cuotas más planas?
2. ¿La fuerza mantiene su significado actual (pines por ronda, repartidos) o pasa a ser frecuencia entre rondas?
3. ¿Se aplica o se descarta la migración que retira `feed_config.batch_size`, dado H6?
4. ¿Se retira también `mix_window` cuando el nuevo mezclador deje de usarlo?
5. ¿Hay un catálogo real exportable del ABM (nº de contenidos y pines por tipo, fuerza de cada caso) para correr las mediciones de la Fase 4 con datos reales?

---

### 9. Anexo: método de medición

- Motor real (`generateRound`) frente a un prototipo del esquema propuesto, sobre 8 catálogos sintéticos, 40 semillas por escenario y rondas 0 a 2.
- Métricas: racha máxima de pines consecutivos del mismo tipo, pines cuyo contenido ya salió en los 10 anteriores, pares consecutivos del mismo contenido, desviación del reparto por tercios, porcentaje del tipo dominante en el último tercio.
- El prototipo no está integrado: la ronda de ejemplo y las cifras se pueden reproducir con `docs/auditorias/auditoria-feed-2026-10-14-simulacion.ts.txt` copiándolo como test temporal en `tests/` y ejecutando `npx vitest run`.

---

### 10. Decisiones de Greener (14 oct, tarde) y simulaciones con catálogo realista

#### 10.1 Decisiones tomadas

1. **Se mantiene la renormalización de los pesos** cuando no hay casos. Ese escenario solo existe en esta fase previa a la publicación; no se optimiza para él (los escenarios A y B del apartado 4 pierden prioridad).
2. **Se elimina la regla de separación de 10 posiciones** entre pines del mismo contenido: con pocos tipos y pocos contenidos por tipo no es cumplible. `distanceWindow` y `mixWindow` dejarán de usarse en el mezclador nuevo.
3. **Única regla de vecindad:** ningún pin de un tipo minoritario (todo salvo casos) va seguido de otro del mismo tipo. El algoritmo reparte los tipos por proporción y se organiza como quiera dentro de esa regla.
4. **Tamaño de la ronda y carga por partes:** pendiente de la respuesta del apartado 10.5.

#### 10.2 Escenarios medidos

Motor actual y prototipo, 30 semillas por escenario, ronda 0:

- **S1 (el tuyo):** 150 casos con fuerzas 1 a 5 repartidas por igual (media 3), 50 tools, 20 insights, 40 episodios y 7 «other».
- **S2:** igual, pero con fuerzas sesgadas a lo bajo (60 % de fuerza 1, 25 % de 2, 10 % de 3, 5 % de 5).
- **S3:** 150 casos todos de fuerza 1.
- **S4 (lanzamiento):** 40 casos de fuerza 1 a 5, 30 tools, 12 insights, 20 episodios y 5 «other».

Composición de la ronda con el catálogo S1: 450 pines de caso (150 casos × fuerza media 3) y 193 de los demás tipos, **643 pines en total**: 97 insights (4,85 apariciones por insight), 32 tools (0,64 por tool), 32 episodios (0,8 por episodio) y 32 «other» (4,6 por «other»). Las tools y los episodios dan la vuelta completa en 2 rondas.

#### 10.3 ¿Hay casos que no salen nunca?

No. La ronda incluye **todos** los casos, cada uno con tantos pines como su fuerza (los 450 pines caben porque el tamaño de la ronda se calcula a partir de ellos: 450 ÷ 0,7 ≈ 643). Con fuerza 5 no se «roban» huecos a nadie. Lo que cambia con un catálogo grande es **cuánto de la ronda llega a ver cada visitante**: en S1, con 40 pines ve el 19 % de los casos, con 100 el 47 % y con 200 el 77-93 %. Como el orden es distinto en cada sesión, entre visitantes todos los casos salen; dentro de una sola visita se ve la parte de la ronda que se haya recorrido. Si la ronda se sirve por tramos (10.5), lo no visto en una visita simplemente no se pide.

#### 10.4 La tensión entre «fuerza» y «no repetir hasta haber visto todos los demás»

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

#### 10.5 Pregunta 4: ¿cuánto cuesta precalcular la ronda y servir los pines por partes?

**Precalcular es barato, y ya se hace.** `feed_round.ordered_pin_ids` guarda hoy la secuencia completa de cada ronda como una lista de ids. En el catálogo S1 generar los 643 pines cuesta 1-4 ms de CPU, y guardarlos ocupa unos 10 KB por ronda y sesión (643 × 16 bytes). El coste es proporcional al tamaño de la ronda: aun con varios miles de pines sigue siendo cuestión de decenas de milisegundos.

**Lo que no escala es lo que viene después de generarla**, tal como funciona hoy (la ronda entera es un único lote):

1. **La respuesta:** 643 pines × ~500 bytes ≈ **314 KB** por petición sin comprimir, frente a ~20 KB por 40 pines.
2. **El enriquecimiento al releer una ronda guardada:** `getPinDirectoryByIds` consulta Supabase con `.in('id', …)` por URL. Con 643 ids son unos **23 KB de URL** (con 40 ids, 1,4 KB). Muchos proxies y pasarelas cortan por encima de ~8 KB; **no lo he podido comprobar contra el límite real de Supabase**, pero no conviene depender de ello.
3. **El navegador:** la virtualización del feed trabaja por lotes (`batchSizes`): cada lote se monta o se desmonta como una unidad. Un lote de 643 pines monta los 643 nodos a la vez. Las imágenes ya se cargan en diferido (`loading="lazy"`), pero los nodos, las posiciones del masonry y los vídeos no.

**Propuesta: separar «ronda» de «lote».** La ronda sigue siendo la vuelta completa, precalculada y guardada. El cursor pasa a llevar `{ronda, desplazamiento}` y cada petición devuelve un trozo de ~40-60 pines: el servidor lee la ronda guardada (10 KB), toma el trozo, lo enriquece con 40 ids y lo devuelve (~20 KB). Eso es exactamente lo que describes: orden global fijado de antemano, e imágenes y DOM cargados por partes como hoy. El cliente apenas cambia: ya concatena lotes de tamaño variable y ya virtualiza por lote.

- **Coste de la implementación:** pequeño-medio. Cursor (`cursor.ts`), `getFeedSessionBatch`, la ruta `GET /api/feed/{sessionId}` y sus tests; ajustar el evento `Feed Depth` (ya tiene un campo `batch` pensado para esto). Sin migraciones: `feed_round` ya sirve.
- **Tamaño del lote:** la columna `feed_config.batch_size` (valor por defecto 40) es **exactamente ese parámetro**. Recomiendo, por tanto, **no aplicar la migración que la elimina** (`20261014100000_drop_feed_config_batch_size.sql`) y, al implementar los lotes, volver a leerla como tamaño del lote (el cambio de esta mañana se revierte al implementarlo, no antes).
- **Si el catálogo creciera mucho** (por ejemplo 1.000 casos de fuerza media 3 ≈ 4.300 pines por ronda, una fila de ~70 KB y unas decenas de ms de generación, extrapolado, no medido), el esquema sigue funcionando; solo habría que mirar la memoria y el tamaño de la fila. Propongo fijar el umbral de revisión en **2.000 pines por ronda**.
- **Un aviso de operación:** las filas de `feed_session` y `feed_round` caducadas no las borra nadie (pendiente ya anotado en `docs/PROGRESO.md`). Con rondas más largas (10 KB en vez de ~1 KB) esa limpieza gana importancia.

#### 10.6 Cambios en el plan de la sección 6

- **Fase 2, mezclador simplificado:** sin vista adelantada ni distancia mínima. Casos estratificados (modelo B). Cuotas de los demás tipos por restos mayores, renormalizadas como hoy, sin tope por capacidad. Esqueleto de tipos por déficit acumulado con la regla de vecindad del 10.1. Informe nuevo con contadores separados.
- **Regla de vecindad más estricta, sin coste:** en S1 a S4 no aparecen **ni siquiera** dos pines de tipos minoritarios seguidos (de cualquier tipo) con el esqueleto nuevo, porque los casos (70 %) los separan siempre. Se puede formalizar la regla fuerte («ningún pin que no sea un caso va pegado a otro que no sea un caso») cuando los casos sean al menos la mitad de la ronda, y la débil (mismo tipo) en el resto.
- **Fase 3, fronteras entre rondas:** para los casos, queda resuelta por el desfase fijado por sesión; para el resto, basta pasar el tipo del último pin de la ronda anterior.
- **Nueva Fase 3b, lotes por tramos** (10.5). Orden recomendado: primero el mezclador con sus pruebas, después los lotes.
- **Fase 1, pruebas:** sustituir las propiedades de «distancia» por las nuevas: ningún tipo minoritario seguido, reparto de tipos por tercios, hueco mínimo entre apariciones de un caso proporcional a 1/fuerza, y todas las tools, episodios, insights y «other» recorridos antes de repetir.

#### 10.7 Decisiones pendientes

1. **Modelo de fuerza:** A (capas) o B (estratificado, recomendado).
2. **Tamaño del lote:** ¿40 pines? (valor actual de `batch_size`), con la posibilidad de un lote menor en móvil.
3. **Migración de `batch_size`:** no aplicarla y reutilizarla como tamaño del lote (recomendado), o aplicarla y fijar el tamaño en código.
4. **Umbral de revisión de la ronda completa:** 2.000 pines.

Las simulaciones están en `docs/auditorias/auditoria-feed-2026-10-14-simulacion-realista.ts.txt` (se ejecutan copiando el fichero como test temporal, igual que el anterior).

---

## 2. Auditoría general y del tipo `other`

*Fichero original: `auditoria-other-2026-10-14.md` (14 oct 2026).* **Desenlace:** Decisiones D1-D5 cerradas el 15 oct en `especificaciones/plan-other-pines-y-paginas.md`, que se ejecutó en las fases 0-5 (§2.72-§2.79).

**Estado: informe, sin cambios en el código. Las decisiones D1-D5 están cerradas desde el 15 de octubre en `docs/especificaciones/plan-other-pines-y-paginas.md`. La simulación del calendario de interludios con 20 `other` está en el §13 de ese plan.** Fecha: 14 de octubre de 2026. Estado analizado: el zip de esa fecha (después de §2.69). Método: lectura de `docs/` (README, `PROGRESO.md`, historiales, especificaciones, auditoría del feed), del documento de arquitectura V1.3 (`P26096.pdf`) y del código de punta a punta (`supabase/migrations`, `src/modules`, `src/app`, `src/components`); verificación con `vitest`, `tsc` y ESLint, y una simulación con el motor real del feed (anexo). Escala de gravedad, la misma que la auditoría del feed: **(A)** alta, **(M)** media, **(B)** baja.

---

### 1. Resumen

1. **El repositorio está sano.** 172 ficheros y 1796 tests en verde, `tsc` y ESLint limpios (tras `next typegen`), 49 migraciones. Las cifras coinciden con las de `PROGRESO.md` §1.
2. **Hay un fallo general que no es de `other` pero comparte su componente (G1, A):** desde el 7 de octubre, `/tools/{slug}` sin `?pin=` y `/insights/{slug}` se pintan **sin imagen ni vídeo**. Son las URL canónicas del sitemap y de `llms.txt`, así que es lo que ve Google y quien abra un enlace compartido.
3. **`other` funciona, pero no tiene propósito.** Nació en la arquitectura como «páginas sueltas» (§14.3, con los textos legales como ejemplo); la especificación v2 lo redujo a «cualquier cosa suelta» con el modelo de tool/insight, y los textos legales acabaron en código (`/privacy`). Hoy no hay ni un contenido `other`, ni en los datos de demo, ni sección pública, ni entrada en el menú; `/variety` sin slug da 404.
4. **Publicar uno solo inundaría el feed (O2, A).** La cuota del 5 % es del tipo, no de cada contenido: con el catálogo actual (sin casos), un único `other` ocupa el **15,6 %** de la ronda y reaparece cada ~6 pines; con el catálogo de lanzamiento, cada ~20.
5. **Es el único tipo con dos sistemas de medios (O3, A):** pines para el feed y portada para la ficha. Desde el 7 de octubre toda la maquinaria de portada (columnas, constraint, dos RPC, su componente del ABM, su caso de uso de borrado, su rama de calentamiento) existe solo para `other`, obliga a subir la pieza dos veces y el pin pulsado no coincide con lo que se ve en la ficha.
6. **Antes de construir nada hay que decidir qué es `other`** (apartado 5). Las cuatro salidas razonables tienen costes muy distintos; la que menos código cuesta y más simplifica es tratarlo como una tool sin paquete (ficha desde el pin, sin portada).

---

### 2. Estado general del repositorio

**Verificación ejecutada (14 oct):**

| Comprobación | Resultado |
| --- | --- |
| `vitest run` | 172 ficheros, 1796 tests en verde |
| `next typegen` + `tsc --noEmit` | 0 errores (sin `typegen` falla `LayoutProps`, ya documentado) |
| `eslint` | 0 errores, 0 avisos |
| `prettier --check` | No concluyente: el zip llega sin ficheros ocultos (`.prettierrc`, `.nvmrc`, `.gitignore`) y con finales CRLF; con la configuración deducida solo discrepan ficheros generados |
| Migraciones | 49 en `supabase/migrations`, como dice §1 |
| `next build` | No ejecutado (necesita las variables de entorno reales) |

#### G1 (A). Las fichas de tool e insight se quedan sin medio fuera del feed

Desde §2.40 (7 oct) ni tool ni insight tienen portada (`content_cover_only_for_other`). `/tools/[slug]/page.tsx` solo pasa un medio a `ToolInsightDetail` si la URL trae `?pin=`; `/insights/[slug]/page.tsx` no pasa ninguno. `generateMetadata` sí usa el primer pin como respaldo para la imagen de OG, pero el cuerpo de la página no. Resultado: desde el sitemap, `llms.txt`, Google o un enlace compartido sin `?pin=`, la ficha muestra título, resumen y CTA con el hueco de una imagen 4:5 vacío. El feed no lo sufre (las tools llevan `?pin=` y los insights saltan a `/app`), por eso no se ha visto.

**Arreglo corto:** en la página, `pinCover?.media ?? await reader.firstPinMedia(id)` (con su ratio y alt), igual que ya hace `generateMetadata`. Es el mismo arreglo que necesitaría `other` si se quita su portada (O3).

#### G2 (M). Checklist de migraciones del 7 oct sin confirmar

`PROGRESO.md` §4.0 sigue listando cinco migraciones del 7 de octubre como pendientes de `db push` (`20261007100000` a `20261007140000`). Desde el zip no se puede saber si ya están aplicadas. Si `20261007110000` no lo está, tool e insight aún aceptan portada en la base de datos y el ABM no la ofrece. Conviene marcar en el checklist lo que ya esté aplicado. El título de §4 sigue diciendo «checklist actualizado (2 de octubre de 2026)».

#### G3 (M). Traducciones de tipo A que no se ven

El ABM ofrece es/en/ca para tool, insight y `other` (`ContentTranslations`: solo el episodio se limita al idioma por defecto), pero sus fichas son de un solo idioma (`sitemap.ts`: «Tool, insight y other son de un solo idioma»; sin rutas `/{locale}`). Una traducción a catalán de una tool se guarda y no se publica en ninguna parte. O se limita el ABM al idioma por defecto o se decide servirlas.

#### G4 (B). Restos menores

1. `ToolInsightDetail` dice en su comentario que las recomendaciones son «de la misma sección»; desde §2.69 son siempre `home`.
2. `feed_config.mix_window` y `distance_window` ya no las lee nadie (anotado en §4.0).
3. `llms.txt` no menciona `/variety`; el sitemap sí incluye `/variety/{slug}`. Solo importa si `other` llega a tener contenido.

---

### 3. Cómo está construido hoy `other`, de punta a punta

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

### 4. Hallazgos sobre `other`

#### O1 (A). Sin función ni lugar en el sitio

El uso que justificaba el tipo (páginas sueltas, textos legales) desapareció: `/privacy` es código (`policyContent.ts`) y el contacto es una página propia. Lo que queda es una definición abierta («cualquier cosa suelta») sin ningún contenido real ni de demo. Además arrastra cuatro nombres para lo mismo: `other` (base de datos y código), «Other» (ABM), `/variety` (URL pública) y «Otros» (arquitectura). No hay subhome, ni entrada en el menú, ni índice en `/variety`, así que un visitante solo llega desde un pin de la home o desde Google.

#### O2 (A). Peso en el feed desproporcionado con pocos contenidos

La cuota del 5 % se reparte entre los `other` que haya, sin tope por contenido. Medido con el motor real (`generateRound`, 20 semillas por escenario, anexo):

| Catálogo | Pines por ronda | Pines `other` | Apariciones de cada `other` | Hueco medio entre apariciones del mismo |
| --- | --- | --- | --- | --- |
| Hoy, sin casos (23 tools, 5 insights, 16 episodios) + **1** `other` | 45 | 7 (15,6 %) | 7 | 6 pines |
| Lanzamiento S4 (40 casos, 30 tools, 12 insights, 20 episodios) + **1** `other` | 172 | 8 (4,7 %) | 8 | 20 pines |
| Realista S1 (150 casos, 50 tools, 20 insights, 40 episodios) + **1** `other` | 643 | 32 (5 %) | 32 | 20 pines |
| S1 + 3 `other` | 643 | 32 | 10,7 | 59 pines |
| S1 + 7 `other` | 643 | 32 | 4,6 | 136 pines |

Sin casos el efecto se triplica porque los pesos se renormalizan (decisión del 14 oct, se mantiene). Publicar un `other` de prueba hoy lo pondría en uno de cada seis pines de la home.

#### O3 (A). Dos sistemas de medios para un solo contenido

`other` es el único tipo que necesita pines (feed) **y** portada (ficha). Consecuencias:

1. **Trabajo doble en el ABM:** la misma pieza se sube como pin y como portada, con su ratio cada vez.
2. **Incoherencia para el visitante:** el pin que pulsa no es lo que ve en la ficha. Las tools resolvieron exactamente esto el 2 de octubre con `?pin=` (§2.24).
3. **Almacenamiento duplicado en Cloudinary Free**, donde no se tolera basura.
4. **Mantenimiento exclusivo:** desde el 7 de octubre, `cover_media_id`/`cover_ratio`, `content_cover_only_for_other`, `register_cover_image`, `register_cover_video`, ZG011/ZG012, `CoverMediaUpload/` (5 ficheros), `deleteCoverMedia`, la rama de portada de `supabaseWarmRepository` y `warmPlan`, y varias filas del contrato de medios existen solo para un tipo sin contenido. El historial (§2.40) ya lo apuntaba: «quitar la columna entera exigiría decidir antes cómo se sustituye en `other`».

#### O4 (M). Se puede publicar vacío

`publish_content` y `schedule_content` solo exigen algo a tool/insight (el paquete). Un `other` sin pines nunca sale en el feed pero sí en el sitemap: página huérfana indexable. Sin portada, la ficha se queda en título y resumen junto a un hueco calculado para 4:5 (`TOOL_INSIGHT_FALLBACK_RATIO`).

#### O5 (M). La ficha es un callejón sin salida y no se mide

El pin dice «Watch» (también cuando la portada es una imagen) y la ficha no tiene CTA, ni enlace externo, ni evento propio de apertura. Solo queda `Pin Click`, así que no se puede saber si alguien ve la ficha entera ni qué hace después.

#### O6 (M). Pie del pin a contracorriente del resto

Desde el 2 de octubre, case, episode, insight y tool derivan el pie del propio contenido (título + segunda línea en negrita). `other` sigue con el gancho libre del admin y sin título, de modo que su pin no se parece a ningún otro del feed y el título del contenido no aparece en la home.

#### O7 (M). Accesibilidad y reproducción de la portada

1. **Sin `alt` propio:** la imagen usa el título como `alt` y el vídeo `aria-label={title}`. Pines y carrusel de caso exigen `alt`.
2. **`<video>` sin `playsInline`:** en iPhone, pulsar play abre el reproductor a pantalla completa.
3. **Sin `preload` explícito:** queda al criterio del navegador; con un vídeo de hasta 100 MB y audio, puede descargar más de lo necesario en la factura de Cloudinary. `ToolCoverVideo` sí lo fija.

#### O8 (M). Vídeo de portada con límites genéricos y duración poco fiable

La portada de vídeo admite 100 MB / 180 s con audio (los mismos que un vídeo de caso), con el tope de 40 MB aún sin decidir (`contrato-medios-fase-1.md` §5.4). Su duración se guarda desde `verifyCloudinaryVideoAsset`, que aún lleva el `?? 10` (historial §2.52, punto 7): un vídeo de 2 minutos se registraría como 10 s y falsearía el coste estimado del calentamiento. Hoy no afecta a ningún dato porque no hay portadas.

#### O9 (B). Sustituir la portada y cambiar su ratio

Al sustituirla, la anterior se borra (base de datos y Cloudinary) **antes** de registrar la nueva; si el registro falla, un contenido publicado se queda sin portada. Y el ratio solo se cambia volviendo a subir el archivo.

#### O10 (B). Imagen al compartir sin respaldo

Tool e insight caen al primer pin para la imagen de OG; `other` solo mira la portada. Sin portada, se comparte sin imagen.

#### O11 (B). Nombres y textos que despistan

`ToolInsightDetail`, `toolInsightDetailRatio`, `TOOL_INSIGHT_FALLBACK_RATIO` y la prop `isTool` sirven también a `other`. En el ABM, el bloque «Portada» habla de «imagen principal» aunque admite vídeo, y la descripción del tipo («Contenido libre que no pertenece a los formatos principales») no orienta a quien carga contenido.

---

### 5. Qué hay que decidir para darle uso

#### D1. Qué es `other`

| Opción | Para qué serviría (ejemplos de Greener) | Qué implica en el código | Coste |
| --- | --- | --- | --- |
| **A. Pieza visual suelta** | Merch, stand y ferias, making-of, cultura de equipo, piezas propias sin cliente | Ficha desde el pin pulsado (`?pin=`, como tools) con respaldo al primer pin; se retira la portada (migración que la quita también de `other`, RPC, `CoverMediaUpload`, rama de calentamiento); pie derivado (título + texto fijo, como insights) | Bajo, y **resta** código |
| **B. Noticia o enlace saliente** | Prensa, premios, eventos, ofertas de empleo, colaboraciones | Lo de A + campo `external_url` y CTA en la ficha hacia fuera (como «Watch more» del episodio), o pin que va directo fuera; evento de analítica | Medio |
| **C. Pieza editorial con cuerpo** | Artículos cortos, manifiestos, notas de proyecto sin cliente | Pasar a tipo B: `highlight` + `body` + carrusel, reutilizando `CaseDetail` sin cliente; ficha 6/6 | Medio-alto (carrusel y textos por idioma) |
| **D. Retirarlo** | Ninguno | Quitar «Other» del ABM, peso 0 en `feed_config`, retirar la portada; el valor del enum se queda (Postgres no borra valores de un enum sin recrear el tipo) | Bajo |

A y B son compatibles: B es A con un enlace.

#### D2. Su peso en el feed

O se baja el 5 %, o se pone un tope de apariciones por contenido y ronda (lo sobrante vuelve a los demás tipos), o se acepta el comportamiento sabiendo que con pocos `other` se repiten mucho. Encaja con el modelo de cuotas que ya existe (`largestRemainderQuotas` + `circularFillPool`).

#### D3. Nombre público

`/variety` es la URL actual y no se usa en ningún otro sitio. Si el tipo pasa a tener sentido editorial, conviene que la URL, la etiqueta del ABM y, si la hay, la sección pública digan lo mismo. Cambiarla hoy no rompe nada (no hay contenido ni enlaces).

#### D4. Requisitos para publicar

Como mínimo un pin (y el enlace si se elige B), comprobado en `publish_content`/`schedule_content`, igual que el paquete en tool/insight.

#### D5. Medición

Si el tipo va a tener uso, un evento de apertura propio (`Other Open` o el nombre que se elija) dado de alta como objetivo en Plausible; con B, además el clic al enlace externo.

---

### 6. Orden de trabajo propuesto

1. **G1** primero: es un fallo visible en producción y su arreglo (medio del pin como respaldo en la ficha) es la misma pieza que necesita la opción A.
2. Cerrar **D1-D5** con Greener.
3. Implementar la opción elegida con su migración (aplicar con `db push` antes de desplegar), tests y la actualización de `especificacion-final-formato-detalle.md` §1, §3 y §7, `contrato-medios-fase-1.md` (filas de portada de `other`) y `llms.txt`.
4. Si se retira la portada, ejecutar después `scripts/reconcile-cloudinary.mjs` (hoy no habría nada que limpiar, porque no hay portadas).

---

### 7. Anexo: método de la simulación de O2

Test temporal de Vitest (borrado después) que llama a `generateRound(snapshot, config, seed, 0)` con `ratios` 70/15/5/5/5, 20 semillas por escenario. Casos de 5 pines con fuerzas 1-5 repartidas por igual; tools, insights y episodios de 3 pines; `other` de 2 pines. «Hueco medio» = distancia media, en posiciones de la ronda, entre dos apariciones consecutivas del mismo contenido `other`. El catálogo «hoy, sin casos» es el de la auditoría del feed (23 tools, 5 insights, 16 episodios); el real puede variar.

---

## 3. Plan de pendientes del 16 de octubre

*Fichero original: `plan-pendientes-2026-10-16.md` (16 oct 2026).* **Desenlace:** Bloques A, B y C ejecutados (§2.80); el D es `especificaciones/plan-talent-careers.md`; el E (fase 6 de `other`) sigue en pausa y está en `PROGRESO.md`.

**Estado (16 oct, tarde): bloques A, B y C ejecutados** (`docs/historial/historial-fase-5.md` §2.80). Pendientes: el bloque D (careers con n8n; **fase 0 cerrada el 19 oct y fase 1 hecha el mismo día**, siguen la 2 y la 3) y el bloque E (fase 6 de `other`), en pausa. Sale de la ronda de decisiones del 16 de octubre (lista de 22 puntos y respuestas de Greener). Regla de trabajo: primero se planifica y luego se ejecuta.

### 1. Decisiones recogidas

| Nº | Tema | Decisión |
| --- | --- | --- |
| 1 | Indicador de ocupación del ABM (plan de `other` §7.6) | **Sí**, como aviso **no bloqueante al superar el 10 %**. |
| 2 | Criterios de la cookie `greener_newsletter` | **Confirmados**: cookie propia, 12 meses, no `httpOnly`. La revisión del texto por el asesor sigue dentro del punto 3. |
| 5 | Página de careers | Página propia en React con una llamada a un webhook de n8n y un pequeño backend en una ruta `/admin`. Se compartirá en otra conversación para convertirla en paquete `variety`. Ver §4. |
| 7 | Repetición de pines con catálogo corto | Se deja como está. |
| 8 | Vídeo `hover` | Desactivarlo para quien tenga `prefers-reduced-motion`; y **no reproducir ni descargar** si el puntero solo pasa por encima sin intención. |
| 9 | Preview de borrador | **Solo** para páginas de `case` y `episode`. Tool, insight y `other` no la tendrán. |
| 11 y 16 | Diseño móvil | No hay diseño: no se hace nada más en esa dirección. |
| 12 | Tipografía del admin | Se unifica con la del sitio: **Helvetica Neue**. |
| 14 | `tdm-reservation` y bots de entrenamiento | Se deja como está; se decide más adelante. |
| 15 | `--detail-block-gap` | Se queda en 40 px; lo cambia Greener cuando toque y avisa. |
| 19, 20 y 21 | Zip bomb, `GET /api/health`, purga de `feed_session`/`feed_round` | **Adelante.** |
| 22 | Fase 6 del plan de `other` | **En pausa** hasta terminar todo lo demás. |

### 2. Orden de ejecución

Cuatro bloques, de menor a mayor riesgo. Cada bloque acaba con `tsc`, ESLint, Prettier, la suite entera, la documentación del bloque (historial, PROGRESO, estructura) y el zip.

#### Bloque A — Cambios pequeños ya decididos

**A1. Aviso de ocupación del 10 % (punto 1).**

- Estimación: suma de `100 / frecuencia` de los `other` **publicados** (los programados no cuentan hasta publicarse). Es una cota alta, porque la separación mínima y el tope de retraso del calendario omiten alguna repetición.
- Dónde: (a) en el listado de contenidos, cuando el filtro de tipo es `other`; (b) en el formulario de frecuencia del editor de un `other`, calculando la ocupación con el valor que se está escribiendo.
- Comportamiento: texto informativo siempre («ocupación estimada del feed: X %»), y aviso visible al pasar del 10 %. Nunca bloquea guardar ni publicar.
- Constante `OTHER_OCCUPANCY_WARNING_PERCENT = 10` en `otherSchema.ts`; función pura `estimateOtherOccupation(frequencies)`.
- El listado necesita la frecuencia de cada `other` publicado: se añade al `select` anidado de `other_detail`.
- Tests: función pura (0, 1 y varios `other`; umbral exacto) y los dos textos.

**A2. Preview solo en case y episode (punto 9).**

- `PublishControls` recibe `previewAvailable` desde el editor: verdadero únicamente para `case` y `episode`. Hoy lo es también en tool e insight, donde el enlace acaba en un 404.
- Cierra en PROGRESO el punto «Preview de una versión en borrador del paquete HTML» como **decidido: no se hace**.
- Tests: botón visible en case/episode y oculto en tool/insight/other.

**A3. Vídeo `hover` (punto 8).** Hoy (`PinCard`, `usePinVideo`):

- el modo `hover` reproduce al instante en `onMouseEnter`, sin ninguna espera;
- el modo `hover` **sí participa en el prefetch**: los vídeos cercanos al viewport se descargan antes de que nadie pase el ratón (hasta 3 billetes en escritorio);
- con `prefers-reduced-motion` el prefetch se apaga, pero el hover **sigue reproduciendo**.

Cambios:

1. Con `feedAutoplayAllowed` falso (`prefers-reduced-motion`, `save-data`, 2G o conexión lenta) el hover tampoco reproduce: póster fijo. Aplicarlo a las tres condiciones y no solo a reduced-motion es una decisión mía por coherencia con el resto del feed; se puede acotar.
2. **Intención de hover:** el vídeo solo se monta y se descarga si el puntero permanece en la tarjeta unos **200 ms**. Si sale antes, no pasa nada. El foco de teclado cuenta como intención inmediata.
3. **Sin prefetch para `hover`:** el prefetch queda solo para `viewport`, así que un vídeo `hover` no se descarga hasta que hay intención. Contrapartida: el primer hover tarda en arrancar lo que tarde la descarga (el póster se mantiene hasta que el vídeo está listo, como ahora).
4. Dispositivos táctiles: el `mouseenter` emulado del toque, seguido de navegación, deja de montar el vídeo por la espera de 200 ms.
5. Tests: no monta antes de 200 ms, cancela al salir, monta tras 200 ms, no hay prefetch en `hover`, y no reproduce con reduced-motion, save-data ni conexión lenta.

**A4. Tipografía del admin (punto 12).**

- Interpretación: el admin deja de arrastrar su tipografía propia y usa Helvetica Neue como el resto del sitio, **con los pesos que realmente se cargan** (400 y 700, `src/lib/fonts.ts`). Hoy hay ~21 declaraciones con pesos entre 650 y 900 que el navegador aplana a negrita.
- No se toca Kinder (titulares de la web pública) ni las fuentes monoespaciadas del admin (`<code>`, ids).
- Antes de tocar: inventario de las declaraciones de `font-family` y `font-weight` de `admin.css` y del layout del admin. Después, normalización de pesos (≥ 600 a 700) y comprobación visual en Chromium del listado, el editor y el alta.

#### Bloque B — Robustez (puntos 19, 20 y 21)

**B1. Zip bomb.** El punto de PROGRESO está desfasado: ya existen límites de lo descomprimido (60 MB en total, 25 MB por fichero, `zipValidation.ts`, auditoría 8 oct P0-3) y un test. Lo que haré es **comprobar que el tope se aplica al tamaño real tras descomprimir**, no solo al declarado en la cabecera del ZIP (que un ZIP malicioso puede falsear). Si solo se mira el declarado, se añade la comprobación del tamaño real de lo leído y su test; si ya está cubierto, se cierra el punto sin tocar código.

**B2. `GET /api/health`.**

- Responde 200 con `{ "status": "ok" }` si una consulta mínima a Supabase (lectura de una fila de `feed_config`) funciona, y 503 si falla. Sin detalles del error en la respuesta (solo al log del servidor), sin datos del sitio y con `Cache-Control: no-store`.
- Se comprueba que el `proxy.ts` y la CSP global no estorban a una ruta de API y se documenta cómo usarla desde el vigilante de PM2 (`docs/operaciones/despliegue.md`).
- Tests: 200, 503 y que no filtra el mensaje de error.

**B3. Purga de `feed_session` y `feed_round`.**

- **Migración nueva** con un trabajo diario de `pg_cron` (la extensión ya se usa para la publicación programada, `20260922090000_publish_scheduled_content_cron.sql`) que borra las `feed_session` caducadas hace más de 24 h. `feed_round` cae en cascada.
- El margen de 24 h evita borrar una sesión que un visitante acaba de dejar abierta.
- Se prueba como los demás ficheros de migración (el test de contenido del SQL) y se documenta en el despliegue. **Hay que aplicarla con `npx supabase db push`.**

#### Bloque C — Decisiones con información (puntos 10 y 13)

Greener pidió más información. Se entrega en la conversación (resumen en §3) y el plan queda a la espera de su respuesta:

- **10. `feed_config.video_limit_*`.** Propuesta: **retirar las columnas muertas** con una migración.
- **13. Módulos del ABM que faltan.** Propuesta: solo el **visor de `audit_log`** (solo lectura).

#### Bloque D — Página de careers con n8n (punto 5)

**Actualización (16 oct, tarde):** el código ya está revisado y el plan detallado vive en `plan-talent-careers.md` (los pasos de abajo quedan como borrador previo). Planificado, sin ejecutar; **la fase 0 (datos de Supabase-talent y workflows de n8n) se cerró el 19 oct** y las fases 1 (servidor) y 2 (paquete) se hicieron ese mismo día (`plan-talent-careers.md` §3.1 y §3.2) y la 3 (ABM) el 19 oct también (§3.3); la 4 (puesta en marcha) está en curso desde el 20 oct (§3.4). Pasos previstos originalmente:

1. Revisar la página y su backend `/admin` y confirmar qué parte puede ser un paquete (§4).
2. Resolver la llamada al webhook de n8n de forma compatible con la CSP.
3. Adaptar la compilación a un paquete `variety`: `index.html`, JS y CSS en `assets/` con rutas `./assets/...`, sin scripts inline, sin enrutado por ruta del navegador (la ruta pública es una sola, `/variety/{slug}/app`), `manifest.json` con `kind: "variety"` y `metadata`.
4. Prueba de extremo a extremo con la migración de la fase 5 aplicada.

#### Bloque E — Cierre (en pausa)

Fase 6 del plan de `other`: documentación final, inventario de cookies y registro. No se empieza hasta terminar A, B, C y D, y depende de los textos del asesor (punto 3).

### 3. Resumen de la información dada sobre los puntos 10 y 13

**Punto 10.** De `feed_config` el motor lee solo `ratios` y `batch_size`. `mix_window`, `distance_window` (la regla de separación de 10 se eliminó el 14 oct) y `video_limit_desktop`/`video_limit_mobile` no se leen: el 2/1 de vídeos simultáneos está fijo en `videoPlaybackCoordinator.ts` según el ancho (< 640 px). Hay dos salidas: conectar los límites a la configuración (el cliente tendría que recibirla) o retirar las columnas muertas. Con la segunda, nadie cree que un valor de la base controla algo que no controla.

**Punto 13.** Hoy esas tablas solo se tocan por SQL:

- *Editor de `feed_config` con simulador:* cambia las proporciones sin SQL y simula el efecto. Solo `ratios` y `batch_size` tienen efecto real.
- *Acceso (`admin_allowed_domain`):* gestiona los dominios que pueden entrar al ABM. Hoy hay uno y casi nunca cambia.
- *Configuración:* no hay nada concreto que configurar hoy fuera de lo anterior.
- *Visor de `audit_log`:* lista de quién hizo qué y cuándo. Ya se escribe en todas las funciones de mutación; solo falta verlo. Es lo más barato (solo lectura) y lo único con valor diario.

### 4. Página con n8n: lo que condiciona el diseño

1. **Un paquete es estático.** Es HTML, JS, CSS y recursos servidos desde `/variety/{slug}/app`. No puede contener código de servidor.
2. **La CSP bloquea llamadas a otros orígenes** (`connect-src 'self'`). Una llamada directa desde el navegador al webhook de n8n no funcionaría. Opciones: (a) una **ruta del propio sitio** que reciba el envío y lo reenvíe a n8n (la URL del webhook queda en una variable de entorno del servidor, sin exponerse, y se pueden añadir límite de peticiones y honeypot); (b) permitir ese origen en la CSP, ampliando la política de los paquetes. La opción (a) es la recomendada.
3. **El backend de `/admin` no puede vivir dentro del paquete.** Además, `/admin` del sitio es el ABM y el paquete solo sirve `/variety/{slug}/app` y `/app/assets/...`: una ruta interna de la página sería `/variety/{slug}/app/admin`, que hoy daría 404. Hay que saber qué hace ese backend (quién lo usa, qué guarda, dónde) para decidir si se queda fuera (en n8n o en su propio alojamiento), se integra en el ABM de Greener o se descarta.
4. **Qué necesito ver:** el código de la página, la URL y el formato de la llamada al webhook, y una descripción del backend `/admin`.

### 5. Pendiente de Greener (lista para más tarde)

Cosas que aún no se pueden dar y que bloquean o condicionan lo anterior.

| Nº | Qué falta | De quién | Bloquea |
| --- | --- | --- | --- |
| 3 | ~~Texto legal final del asesor para `/privacy` (cookies y newsletter). Después se sube `CONSENT_TEXT_VERSION`.~~ **Incorporado el 19 oct (§2.86), con `CONSENT_TEXT_VERSION` = `2026-10-19`.** Queda el visto bueno del asesor a los tres añadidos de Greener (`politica-cookies-cambios.md` §5). | Asesor | Bloque E; publicar cualquier `other` |
| 6 | ~~Política de privacidad de los formularios: mención de Mailchimp y plazo de retención de `contact_submission`.~~ **Hecho el 19 oct (§2.86):** Mailchimp en el texto y purga a 30 días (migración `20261019140000`, por aplicar). | Greener y asesor | Bloque E |
| 4 | ~~Tabla de cookies de terceros medida con DevTools (YouTube, Spotify, Cloudinary).~~ **Hecha** con la auditoría del 15-16 de octubre e incorporada a `/privacy` el 19 (§2.86). | Greener | Bloque E |
| 5 | ~~Código de la página de careers, URL y formato del webhook de n8n, y descripción del backend `/admin`.~~ **Entregado** (16 y 19 oct). `talent.zip` recibido el 19 oct y fases 2 y 3 hechas. Queda el identificador de la audiencia de Mailchimp de talent (`TALENT_MAILCHIMP_AUDIENCE_ID`, `plan-talent-careers.md` §5.2). | Greener | Puesta en marcha de talent |
| 10 | Decidir: retirar las columnas muertas de `feed_config` (propuesto) o conectarlas. | Greener | Bloque C |
| 13 | Decidir qué módulos del ABM entran (propuesto: solo visor de `audit_log`). | Greener | Bloque C |
| 17 | Confirmar que las licencias de Helvetica Neue y Kinder cubren web autoalojada y la conversión a WOFF2. | Greener | Antes de publicar |
| 18 | Plan alternativo a Cloudinary Free para no superar los 25 créditos; preguntar a soporte qué pasa si se superan. | Greener | Antes de abrir al público |
| 14 | Reserva de derechos de minería de texto y bloqueo de bots de entrenamiento. | Greener y asesor | Más adelante |
| 15 | Valor definitivo de `--detail-block-gap`. Lo cambia Greener y avisa. | Greener | Nada |
| 7 | Repetición de pines con catálogo corto: se revisa con contenido en masa. | Greener | Nada |
| 11 y 16 | Diseño móvil y masonry real: en pausa hasta que exista. | Diseño | Los puntos de móvil de PROGRESO quedan aparcados |

Tareas operativas de Greener, sin decisión de por medio:

- Aplicar la migración `20261016090000_other_abm.sql` (y `20261016100000_purge_feed_sessions_cron.sql` y `20261016110000_feed_config_drop_dead_columns.sql`, ya escritas), regenerar los tipos y subir un ZIP de prueba con `kind: "variety"`.
- Revisar cuáles de las migraciones de los días 7 y 8 de octubre marcadas como pendientes en PROGRESO siguen sin aplicarse (la lista puede estar desfasada).
- Configuración de producción: URL de Supabase Auth, cliente OAuth de Google y `.env` de producción.
- Las tres comprobaciones del proxy de Dinahosting y el `HOSTNAME` del proxy.
- Comprobar Plausible y la ventana de cookies ya desplegados.
- Carga real de contenido en el ABM.
- Apagar `tools.itsgreener.com` e `insight.itsgreener.com` tras publicar.
- Scripts de vídeo y Cloudinary: `warm-cloudinary` y `reconcile-cloudinary` (`fix-video-durations` se retiró el 19 oct, §2.82).

---

## 4. Auditoría de errores y código muerto

*Fichero original: `auditoria-codigo-muerto-2026-10-16.md` (16 oct 2026).* **Desenlace:** Cambios aplicados (§2.81) y puntos 1-3 resueltos (§2.82). El punto 4 (`cookie-audit-all/` y `tsconfig.tsbuildinfo` fuera del repositorio) pasa a `PROGRESO.md`.

**Estado: cambios aplicados (§2.81); puntos 1-3 del apartado 4 resueltos el 19 de octubre (§2.82), el 4 sigue abierto.** Fecha: 16 de octubre de 2026. Estado analizado: el zip de esa fecha, después de §2.80 y de la corrección de ESLint de `ConsentProvider`. Método: `next typegen` + `tsc` (también con `--noUnusedLocals --noUnusedParameters`), ESLint (también con `--report-unused-disable-directives`), [knip](https://knip.dev) 5 para ficheros, exportaciones y dependencias, y comprobaciones propias: clases de CSS (módulos y globales), variables de entorno, eventos de analítica, rutas de API, ficheros de `public/`, scripts, funciones SQL reconstruyendo las 56 migraciones en orden y códigos de error `ZG…`. Verificación final con la suite completa y `next build`.

---

### 1. Resumen

1. **El código está limpio.** No hay variables, parámetros ni imports sin usar (ni `tsc` estricto ni ESLint encuentran nada), ni clases de CSS huérfanas, ni variables de entorno, eventos de Plausible, rutas, iconos o scripts sin uso. Las directivas `eslint-disable` y `@ts-expect-error` están todas justificadas.
2. **Muerto de verdad solo había tres cosas**, todas borradas: dos constantes de scripts (`FALLBACK_RATIO` en `warm-cloudinary.mjs` y `CONTENT_TYPES` en `warm-probe.mjs`) y la dependencia `@types/adm-zip`, obsoleta porque `adm-zip` 0.6 ya trae sus propios tipos.
3. **32 símbolos de `src` estaban exportados sin que nadie los importara.** Se usan dentro de su propio fichero (casi siempre agrupados en el objeto que implementa un puerto, p. ej. `feedSessionRepository`), así que se les ha quitado el `export`. No cambia el comportamiento: `tsc` fallaría si alguien los importara.
4. **Quedaban cuatro decisiones para Greener** (apartado 4). Las tres primeras (respaldo de mensajes antiguos de `postgresErrors.ts`, código `stale_reference` y script `fix-video-durations.mjs`) se resolvieron el 19 de octubre; queda abierta la de los resultados de la auditoría de cookies dentro del repositorio.

### 2. Cambios aplicados

| Fichero | Cambio | Motivo |
| --- | --- | --- |
| `scripts/warm-cloudinary.mjs` | Fuera `FALLBACK_RATIO` | Declarada en la copia del contrato de entrega, sin ningún uso ni en el script ni en sus tests |
| `scripts/warm-probe.mjs` | Fuera `CONTENT_TYPES` | Sin ningún uso |
| `package.json`, `package-lock.json` | Fuera `@types/adm-zip` (0.5.8) | `adm-zip` 0.6.1 publica `types.d.ts`; el paquete de tipos era el de la versión anterior y TypeScript ya no lo usaba. El lock solo pierde esa entrada |
| 19 ficheros de `src` | `export` retirado de 32 símbolos | Solo se usan en su propio fichero (lista en el anexo) |

En la misma jornada, antes de esta auditoría (también en §2.81): `ConsentProvider` lee la cookie con `useSyncExternalStore` (regla `react-hooks/set-state-in-effect`), con respaldo en memoria si el navegador bloquea las cookies y dos tests nuevos; y fuera `allowVimeo` (`cookie-audit-all.mjs`) e `isLocal` (`cookie-audit.mjs`).

### 3. Revisado y vivo (falsos positivos de knip)

1. **`public/greener-package-analytics.js`**: lo inyecta `composeToolDocument.ts` como `<script src>` en los documentos de tools e insights.
2. **`scripts/generate-demo-data.mjs`** y **`scripts/sim-video-hover/`**: herramientas manuales documentadas (`PROGRESO.md` y `docs/operaciones/simulacion-video-hover.md`); se conservan a propósito (§2.20 del historial).
3. **Exportaciones de `scripts/*.mjs`** (`warm-cloudinary`, `warm-probe`, `reconcile-cloudinary`): las importan los tests de contrato o el propio script.
4. **57 tipos exportados que solo se usan en su fichero**: inofensivos y útiles como documentación de la forma de los datos. No se tocan.
5. **Vimeo**: lo que queda en `src` es intencionado (el valor sigue en el enum de Postgres `episode_provider`) y en los scripts de auditoría de cookies sirve para detectar tráfico de Vimeo si volviera a colarse.
6. **Funciones SQL que el código no llama**: las del editor de bloques y las de portada ya se borran en `20260910083700` y `20261015130000`; `enforce_max_pins_per_content`, `enforce_single_pin_media`, `other_detail_guard` y `set_updated_at` son triggers. Tras aplicar las 56 migraciones quedan 31 funciones, todas en uso.
7. **`/api/health`**: no la llama la web, sino la monitorización del despliegue (`despliegue.md` §8).

### 4. Pendiente de decisión

**Actualización del 19 oct (§2.82):** Greener pide quitar los puntos 1, 2 y 3. Hecho; el 4 se deja de momento.

1. **(Hecho, §2.82)** **Respaldo `LEGACY_KIND_BY_MESSAGE` (`src/lib/supabase/postgresErrors.ts`).** Traduce los mensajes de error de las funciones SQL anteriores a `20261009120000_typed_error_codes.sql`. El propio comentario dice que se puede borrar cuando esa migración esté aplicada en todos los entornos. **Greener: confirmar si está aplicada en producción**; si lo está, se borra junto con sus tests.
2. **(Hecho, §2.82)** **`stale_reference` (ZG013) ya no lo lanza ninguna función.** Lo lanzaba `unlink_and_delete_cover_media`, que se borró el 15 de octubre con la portada de `other`. Sigue cableado en `domainError.ts`, `adminErrorMessage.ts`, `postgresErrors.ts` y sus tests. Es inofensivo; se puede retirar junto con el punto anterior. Ojo: el comentario de `20261015130000_remove_other_cover.sql` dice que ZG013 «lo sigue usando `unlink_and_delete_media_asset`», pero esa función se borró el 10 de septiembre. No se corrige porque una migración aplicada no se edita.
3. **(Hecho, §2.82)** **`scripts/fix-video-durations.mjs`** es de un solo uso (corrige las 27 duraciones de 10 s inventadas antes del 8 de octubre). Según `PROGRESO.md` sigue pendiente de ejecutar; una vez ejecutado con `--execute`, se puede borrar.
4. **`cookie-audit-all/` en la raíz del repositorio.** Son los resultados de la auditoría de cookies del 15-16 de octubre. Su README avisa de que `audit.json` y `network.csv` pueden contener tokens en las URL. Conviene sacarlos del repositorio (o añadirlos al `.gitignore`) y guardarlos aparte. Lo mismo con `tsconfig.tsbuildinfo`, que es un artefacto de compilación. El zip no trae los ficheros ocultos, así que no se ha podido comprobar el `.gitignore`.

### 5. Verificación

`tsc` (tras `next typegen`) y ESLint limpios; **191 ficheros y 2055 tests en verde**; `next build` de producción compila (con variables de entorno ficticias, porque el zip no trae `.env.local`). Una segunda pasada de knip solo devuelve los falsos positivos del apartado 3. Prettier no se ha podido comprobar porque el zip no trae su configuración.

### Anexo: símbolos a los que se ha quitado el `export`

| Fichero | Símbolos |
| --- | --- |
| `app/(public)/privacy/policyContent.ts` | `POLICY_EMAIL` |
| `app/admin/(panel)/contents/[id]/edit/BulkPinUpload/rows.ts` | `buildRow` |
| `app/admin/_lib/formatAdminDateTime.ts` | `ADMIN_TIME_ZONE` |
| `components/masonry/useMasonryPositions.ts` | `NEWSLETTER_CARD_RATIO`, `isNewsletterEntry` |
| `lib/auth/adminSession.ts` | `checkAdminSession` |
| `lib/http/clientIp.ts` | `getClientIp` |
| `modules/contact/infrastructure/contactSubmissionLog.ts` | `RATE_LIMIT_WINDOW_MS` |
| `modules/contact/infrastructure/mailer.ts` | `sendContactEmail` |
| `modules/content/domain/otherSchema.ts` | `OTHER_KINDS` |
| `modules/feed/domain/feedScope.ts` | `SCOPE_TO_TYPES` |
| `modules/feed/infrastructure/cachedFeedCatalog.ts` | `FEED_DATASET_TTL_SECONDS` |
| `modules/feed/infrastructure/feedSessionRepository.ts` | `createFeedSessionRow`, `getFeedSessionRow`, `getFeedRound`, `saveFeedRound` |
| `modules/masonry/domain/labelHeight.ts` | `LABEL_SIDE_PADDING`, `APPROX_CHAR_WIDTH` |
| `modules/media/domain/closestRatio.ts` | `RATIO_MATCH_TOLERANCE` |
| `modules/media/domain/videoPlayback.ts` | `HAVE_FUTURE_DATA` |
| `modules/media/infrastructure/cloudinaryServer.ts` | `isManagedPublicId`, `warmVideoRenditions` |
| `modules/media/infrastructure/supabaseMediaRefs.ts` | `listPinMediaRefs`, `listContentMediaRefs`, `listMediaRefsByIds`, `findExistingMediaIds`, `isPublicIdRegistered` |
| `modules/media/infrastructure/supabaseWarmRepository.ts` | `readContentWarmInfo`, `readPinContentId`, `markWarmedWithSession`, `markWarmedWithService` |
| `modules/packages/infrastructure/supabaseStorageSource.ts` | `PACKAGE_VERSION_TTL_SECONDS` |

---

## 5. Simulación de la carga del vídeo en hover

*Fichero original: `simulacion-video-hover.md` (16 oct 2026).* **Desenlace:** Informó la decisión A3 del plan de pendientes (sin prefetch en hover), ya implementada. Los scripts siguen en `scripts/sim-video-hover/`.

**Fecha:** 16 oct 2026 · **Decisión que informa:** plan de pendientes, A3 (los pines `hover` ya no hacen prefetch y solo piden el vídeo con intención de hover).

### Qué se midió

Chromium con la red limitada (ancho de banda y latencia por CDP) contra un servidor local que sirve el clip en WebM/VP9 a 480×600, 30 fps, 6 s, sin audio (la rendición del feed del contrato de medios, §4). Tres pesos: **0,20 MB** (ligero), **0,33 MB** (típico, el del contrato) y **0,57 MB** (pesado). Cinco repeticiones por celda, sin caché. Se mide desde que el puntero entra en el pin hasta el evento `playing` del `<video>`; **los 200 ms de intención de hover están incluidos**. Con prefetch el vídeo ya está descargado: el resultado es ≈ 200 ms en todas las conexiones (solo la espera de intención).

El navegador empieza a reproducir en cuanto tiene suficiente buffer, **sin esperar a bajarse el clip entero**, y el clip es corto: por eso las cifras son menores que las del §6.1 del contrato (que suponían bajar el clip completo).

### Resultados (mediana, ms desde que entra el puntero)

| Conexión (efectiva) | Ligero 0,2 MB | **Típico 0,33 MB** | Pesado 0,57 MB | Típico, CDN lento (+600 ms) |
| --- | --- | --- | --- | --- |
| Fibra / wifi bueno (50 Mbps, 20 ms) | 273 | **276** | 279 | 841 |
| 4G bueno (12 Mbps, 50 ms) | 292 | **324** | 336 | 869 |
| 4G normal (5 Mbps, 80 ms) | 351 | **408** | 451 | 934 |
| 3G rápido / 4G flojo (2 Mbps, 150 ms) | 500 | **635** | 752 | 1.088 |
| 1,6 Mbps (límite del feed, 200 ms) | 586 | **752** | 903 | 1.156 |

«CDN lento» simula una derivada que Cloudinary tiene que generar o traer de origen en la primera petición (600 ms hasta el primer byte). El calentado de derivadas (`warmVideoRenditions`, §2.53) existe para evitar justo eso.

### Lectura

1. **Con conexión normal (fibra, 4G) el vídeo arranca entre 0,27 y 0,45 s después de entrar el puntero**, es decir, 70-250 ms más que con prefetch. Apenas se nota: el póster sigue ahí durante esa espera, y el vídeo lo sustituye sin salto.
2. **En una conexión floja (2 Mbps o menos) tarda de 0,5 a 0,9 s** (el doble o el triple que con prefetch). Se nota, pero el póster sigue visible y no hay tirón. Por debajo de 1,5 Mbps estimados (`SLOW_DOWNLINK_MBPS`) el feed ya no reproduce nada en hover: póster fijo.
3. **El factor que más pesa es el primer byte del CDN, no el ancho de banda**: una derivada sin calentar suma ~0,6 s a cualquier conexión. Por eso calentar las derivadas (botón del ABM, `scripts/warm-cloudinary.mjs`) es lo que de verdad protege esta experiencia.
4. Lo que se gana: un pin `hover` ya no gasta ancho de banda de Cloudinary Free cuando el visitante solo pasa por encima, ni ocupa uno de los 3 billetes de prefetch (los pines `viewport` los aprovechan mejor).

### Límites de la simulación

Es un servidor local con latencia y ancho de banda emulados, no Cloudinary real; el clip es sintético (`testsrc2` con ruido), con el peso del contrato pero no con el contenido real; y Chromium de Playwright reproduce WebM (VP9). Safari reproduce el MP4/H.264 y su comportamiento de buffer es algo más conservador: allí las cifras pueden ser algo mayores. Para cifras reales basta repetir la medición en producción con la pestaña Network de las herramientas de desarrollo.

Los scripts están en `scripts/sim-video-hover/` (ver su README para repetirla).

---

## 6. Auditoría de `src` del 8 de octubre: resumen de las cinco fases

*Documento original: resumen en las notas del proyecto, `auditoria-src-2026-10-08.md` (8 oct 2026).* **Desenlace:** Las cinco fases se hicieron el 9 oct (§2.57 a §2.61 de `historial-fase-5.md`); no queda nada pendiente.

Informe completo: https://claude.ai/code/artifact/bad8537c-aef4-4198-bd74-fc11e77f425c

Estado base: tsc 0 errores, eslint 0 avisos, 139 ficheros / 1.457 tests en verde.

### Fase 1 (P0) — HECHA el 9 oct 2026
Tras la fase 1: next build en verde, 145 ficheros / 1.488 tests en verde. Sin migraciones. Registrada en PROGRESO.md §2.57.
- P0-1 `lib/auth/adminSession.ts` (`isAdminRequest`, `adminApiGuard`) en las 32 Server Actions del ABM y en las rutas `api/admin/media/*`. En tests, `tests/setup.ts` mockea `isAdminRequest` a true por defecto.
- P0-2 Pin y portada: el archivo a borrar en Cloudinary se lee de Postgres (`snapshotMedia`) y se purga con `purgeRemovedMedia`; `deleteCloudinaryAsset` rechaza lo que esté fuera de `greener/content/`.
- P0-3 `PACKAGE_LIMITS`: máx. 1000 ficheros, 60 MB descomprimidos, 25 MB por fichero (tamaños declarados; adm-zip ya corta la descompresión en lo declarado).
- P0-4 Cursor de recomendaciones en un ref; lote vacío corta, lote `rateLimited` no.
- P0-5 `FeedProvider`: scroll en un ref; respaldo escrito solo al cambiar sesión/lotes y en `pagehide`/`visibilitychange`. (Sigue guardando los pines completos: el respaldo solo con metadatos queda para más adelante.)
- P0-6 `enrich` omite unidades despublicadas en vez de lanzar.
- P0-7 `createPinWithImageAction` verifica la imagen antes de crear el pin y lo borra si falla el adjunto.
- P0-8 `PinCard` con `Link` (`prefetch={false}`), salvo `/tools|insights/{slug}/app`. CONFIRMADO por el usuario (la vuelta atrás conserva feed y scroll).
- P0-9 `app/admin/_lib/formatAdminDateTime.ts` con `timeZone: 'Europe/Madrid'`.
- P0-10 `uploadVersion` borra de Storage lo que subió si falla a mitad o falla la RPC.
- Menores: aviso en producción si falta `CONTACT_IP_HASH_SALT`; `APP_SIGNING_SECRET` opcional (sin ella se firma como antes) con `lib/security/signedToken.ts` compartido por cursor y preview; `api/analytics/package` con límite 60/min por IP, timeout de 5 s y solo la primera IP de x-forwarded-for; uuid validado en `api/feed/*` (`lib/validation/uuid.ts`); detección de WebP/APNG animado por chunks; `auth/callback` usa `NEXT_PUBLIC_SITE_URL` si está definida y rechaza `//`.
- Convención detectada: el repo usa finales de línea CRLF en src, tests, package.json y lockfile; hay que conservarlos al editar (prettier con `--end-of-line crlf`).

### Fase 2 (cimientos) — HECHA el 9 oct 2026
Tras la fase 2: next build en verde, tsc/eslint/prettier limpios, 150 ficheros / 1.526 tests en verde. Sin migraciones. Registrada en PROGRESO.md §2.58 y en `historial-fase-5.md`.
- Tipos de Supabase: `src/lib/supabase/database.types.ts` generado con `npm run db:types` (`scripts/generate-db-types.mjs`); `database.ts` exporta `Database` (con `NullableRpcArgs` para los argumentos de RPC que Postgres admite nulos), `AppSupabaseClient`, `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`. Los 4 clientes van tipados; fuera los `as` sobre filas y RPC. Regla: lo que está en `supabase/migrations` es la verdad; tras aplicar una migración, regenerar tipos.
- Fallo real corregido: `register_cover_video` no enviaba `p_ratio` (subir vídeo de portada fallaba siempre). Test `mediaAssetRepositoryRpc`.
- `modules/shared/domain`: `hash` (`fnv1a32`, único; el orden del feed y los `warmed_contract` guardados no cambian), `ratio`, `locale`, `contentType`, `mediaKind`, `contentStatus`. Test `dbEnums` contrasta con los tipos generados.
- Duplicación retirada: `repositoryError`, `idSchema`, `uploadedMediaFields`, `imageValidationMessage`, `packageFiles` (`PACKAGE_BUCKET`, `contentTypeFor`), `formActionState`, `clientIp` (ahora en `lib/http`). Manifiesto de paquetes y ratios del feed validados con zod.
- Entorno por ámbitos: `env.ts` (núcleo, `server-only`) + `serverEnv.ts` (lectores perezosos por integración y `validateServerEnv()`), ejecutado al arrancar desde `instrumentation.ts` (solo registra, no detiene el servidor). `CONTACT_IP_HASH_SALT` obligatoria en producción; se rechazan `DEV_IP_HASH_SALT` y `EXAMPLE_IP_HASH_SALT`. Dependencia nueva: `server-only`.
- Dejado fuera a propósito: `.email()` encadenado en contact/newsletter (para no cambiar mensajes múltiples), estados `error` de Publish/Preview/Warm/Package/Delete sin unificar, `cloudinaryPublicId` aún aceptado por `deleteCoverMediaSchema` (el servidor lo ignora).

### Fase 3 (capas) — HECHA el 9 oct 2026
Tras la fase 3: next build en verde, tsc/eslint/prettier limpios, 155 ficheros / 1.600 tests en verde. **Una migración: `20261009120000_typed_error_codes.sql` (el usuario debe aplicarla en Supabase; hasta entonces funciona un respaldo que lee los mensajes antiguos, retirable después).** Registrada en PROGRESO.md §2.59 y en `historial-fase-5.md`.
- Regla de capas por módulo: `domain` (puertos, modelos de lectura, errores, reglas puras) ← `application` (fábricas `makeX({ puertos })`) ← `infrastructure` (adaptadores). Solo `modules/<m>/container.ts` (`import 'server-only'`) conecta adaptadores; páginas, acciones y rutas importan de containers (o tipos/dominio). `media` es el módulo base: `content` y `pin` dependen de él, nunca al revés.
- A3: errores de Postgres con SQLSTATE clase `ZG…` → `DomainError` con `kind`; `isDomainError(error, kind)`; respaldo para mensajes antiguos.
- A2: casos de uso nuevos (borrar contenido, publicar/programar con calentamiento dentro, carrusel añadir/quitar/quitar todo, pines borrar/borrar todos/crear con imagen o vídeo, portadas, paquetes subir/publicar/borrar versión, contacto, newsletter). Las Server Actions solo comprueban admin, validan, llaman al caso de uso y traducen mensajes.
- A1/A9: containers en media, content, pin, packages, contact, newsletter y feed. `after()` solo en el container de media (`warmScheduler`); `application` no usa cliente de servicio.
- A4/A5/A6/A7/A8: resolución de paquetes publicada unificada; modelos de lectura y `derivedFeedText` en dominio; puerto `PublicContentReader` (la instancia sabe sus privilegios) sustituye a los envoltorios y a pasar `SupabaseClient` a las páginas; `resolvePreviewContext` devuelve `reader`.
- A12: helpers de navegador/URL de Cloudinary en `modules/media/client/`; `contentMetadata` sin dependencia de infraestructura.
- A13: ESLint `layerRules` (`no-restricted-imports` en domain/application; `@typescript-eslint/no-restricted-imports` con `allowTypeImports` en app/components/lib; `no-restricted-syntax` contra `error.message.includes|startsWith|endsWith|match`).
- Tests: casos de uso con puertos falsos (sin `vi.mock` de módulos); acciones mockean solo el container; rutas del feed con `vi.resetModules()` + `vi.doMock` en `beforeEach`. Nuevos: caseCarousel, generatePreviewLink, pinFooter, feedDomain.
- Sin cambios de URL, formatos de datos ni orden del feed.

### Fase 4 (UI y CSS) — HECHA el 9 oct 2026
Tras la fase 4: next build en verde, tsc/eslint/prettier limpios, 160 ficheros / 1.640 tests en verde. Sin migraciones ni variables nuevas. Registrada en PROGRESO.md §2.60 y en `historial-fase-5.md`.
- CSS: el CSS del ABM (~1.900 líneas) sale de `globals.css` a `app/admin/admin.css` (lo importa solo `app/admin/layout.tsx`). Breakpoints en `modules/shared/domain/breakpoints.ts` (`BREAKPOINT_PX`, `ADMIN_BREAKPOINT_PX`) con test que escanea todo el CSS. Colores a tokens `var(--color-*)`. `aspect-ratio` por variable `--ratio` (`cssAspectRatio`); la geometría del masonry sigue inline a propósito.
- Subida de medios del ABM: `useCloudinaryUpload` (`uploadImageFlow`/`uploadVideoFlow` + hook con `uploading/error/warning`) y `modules/media/client/videoUploadChecks.ts`. `BulkPinUpload`, `CoverMediaUpload`, `CaseCarouselManager`, `PinMediaManager` y `PinList` pasan a carpeta (`index.tsx` + `useX.ts` + filas/subcomponentes).
- Las 12 `window.location.reload()` pasan a `router.refresh()` (`useEditorRefresh`, `useEditorOperation`); el cerrojo del editor se mantiene hasta que acaba el refresco; se vacía el `<input type=file>` al terminar. Efectos visibles: los avisos ya no se pierden, y al sustituir portada-imagen la anterior se borra cuando la nueva ya está subida.
- Compartido en detalle/feed: `RecommendationsGrid`, `CoverMedia`, `feedApi`, `useContainerWidth`, `useSentinel` (sentinel por ref), `masonry/domain/labelHeight.ts`, `PinCard` troceado (`PinCardMedia`, `PinCardLabel`, `CardLink`, `types`).
- Convención de carpetas: `ToolInsightDetail/`, `FeedProvider/`, `usePinVideo/`, `useVideoSlot/`; `CaseDetail`/`EpisodeDetail` ahora en `components/detail/`; `useShell` → `navItems.ts`. eslint-disable: de 16 a 6 (5 con motivo + global-error).
- Rutas: grupos `(public)/(feed)` (layout con AuxNav; páginas de una línea), `(public)/(detail)` (layout común de los 4 detalles), `admin/(panel)` (barra lateral) y `admin/(auth)` (login sin barra). URLs sin cambios.
- Textos: públicos en inglés (`copy.ts` en `components/masonry` y `components/detail`, `contactSchema`, `submitContactForm`, aria-labels, descripción del sitio). ABM en español (Panel, Contenidos, Publicados, Borradores, Programados). Nombres de tipo (Case, Tool…) en inglés.
- Nota técnica: `LayoutProps` viene de `next typegen`; tras borrar `.next`, `tsc` necesita `npx next typegen` (o un build) antes.

### Fase 5 (rendimiento y limpieza) — HECHA el 9 oct 2026
Tras la fase 5: next build en verde, tsc/eslint/prettier limpios, 158 ficheros / 1.641 tests en verde. **Sin migraciones ni variables nuevas.** Registrada en PROGRESO.md §2.61 y en `historial-fase-5.md`.
- Borrado: `/preview/masonry`, `/api/feed/demo`, `MasonryFeed`, `getDemoFeedBatch`, `demoSnapshotSource`, `domain/demoFeed.ts`, `continuousFeed.ts` (E8), `localPackageSource.ts`, `data/`, `fixtures/`, `.gitkeep` y carpetas vacías, `validatePinAnimationUpload`; `validateImageUpload` → `validateImageSize`; `PinListItem.media` pasa a un único medio o null; `scope` obligatorio en la memoria de sesiones del feed. `scripts/generate-demo-data.mjs` solo genera `supabase/seed_demo_data.sql`. Se mantienen `slide_order` y `p_slide_order: 0` (quitarlos exige migración).
- Dependencias: fuera `next-cloudinary`, `react-hook-form`, `@hookform/resolvers`. `@types/adm-zip` se queda.
- E1: `unstable_cache` del snapshot del feed (`modules/feed/infrastructure/cachedFeedCatalog.ts`, etiqueta `feed-dataset`, TTL 60 s); exclusión por petición en memoria (`excludeContent`); `lib/cache/feedCache.ts` → `invalidateFeedCache()` (`updateTag`) desde pines, publicación, episodios, casos, traducciones y `updateContent`. La publicación programada (pg_cron) entra por el TTL.
- E3: `supabaseStorageSource` con una sola consulta (versión actual por `html_package_current_version_fk`, exige `published`) cacheada con `unstable_cache` (etiqueta `published-package-version`, 60 s, sin cachear fallos); `PackageSourceUnavailableError` → rutas de paquetes responden 503 con `Retry-After: 30` (`lib/http/packageErrorResponse.ts`), 404 solo si no existe. `invalidatePackageCache()` en `packageActions` y `publishActions`.
- E4: `requestScopedReader` (React `cache`) sobre el lector público y el del preview; `generateMetadata` y la página no repiten consultas.
- E5: listado del ABM con filtro y paginación en servidor (`contentListQuery.ts`, 25 por página), `counts()` con tres `head: true`. Búsqueda por título en cualquier idioma.
- E6: `readContentWarmInfo` y `listContentMediaRefs` con portada/OG embebidas y lecturas en paralelo. E9: `durationMs` fuera de `RoundReport`.
- E7: `despliegue.md` documenta PM2 con una sola instancia (limitadores, sesiones del feed y cachés de Next son por proceso).
- Comentarios: los desfasados corregidos y ~55 comentarios-diario recortados a su porqué vigente; la historia retirada está en `historial-fase-5.md` §2.61.
- Sin verificar contra Supabase real: los embebidos PostgREST (`html_package_current_version_fk`, `og_media_id`). Prueba recomendada: abrir `/tools/<slug>/app` de una tool publicada y editar/borrar un contenido desde el ABM.

### Fases pendientes
Ninguna. El plan de 5 fases de la auditoría está completo.
