# Simulación: cuánto tarda el vídeo en hover sin prefetch

**Fecha:** 16 oct 2026 · **Decisión que informa:** plan de pendientes, A3 (los pines `hover` ya no hacen prefetch y solo piden el vídeo con intención de hover).

## Qué se midió

Chromium con la red limitada (ancho de banda y latencia por CDP) contra un servidor local que sirve el clip en WebM/VP9 a 480×600, 30 fps, 6 s, sin audio (la rendición del feed del contrato de medios, §4). Tres pesos: **0,20 MB** (ligero), **0,33 MB** (típico, el del contrato) y **0,57 MB** (pesado). Cinco repeticiones por celda, sin caché. Se mide desde que el puntero entra en el pin hasta el evento `playing` del `<video>`; **los 200 ms de intención de hover están incluidos**. Con prefetch el vídeo ya está descargado: el resultado es ≈ 200 ms en todas las conexiones (solo la espera de intención).

El navegador empieza a reproducir en cuanto tiene suficiente buffer, **sin esperar a bajarse el clip entero**, y el clip es corto: por eso las cifras son menores que las del §6.1 del contrato (que suponían bajar el clip completo).

## Resultados (mediana, ms desde que entra el puntero)

| Conexión (efectiva) | Ligero 0,2 MB | **Típico 0,33 MB** | Pesado 0,57 MB | Típico, CDN lento (+600 ms) |
| --- | --- | --- | --- | --- |
| Fibra / wifi bueno (50 Mbps, 20 ms) | 273 | **276** | 279 | 841 |
| 4G bueno (12 Mbps, 50 ms) | 292 | **324** | 336 | 869 |
| 4G normal (5 Mbps, 80 ms) | 351 | **408** | 451 | 934 |
| 3G rápido / 4G flojo (2 Mbps, 150 ms) | 500 | **635** | 752 | 1.088 |
| 1,6 Mbps (límite del feed, 200 ms) | 586 | **752** | 903 | 1.156 |

«CDN lento» simula una derivada que Cloudinary tiene que generar o traer de origen en la primera petición (600 ms hasta el primer byte). El calentado de derivadas (`warmVideoRenditions`, §2.53) existe para evitar justo eso.

## Lectura

1. **Con conexión normal (fibra, 4G) el vídeo arranca entre 0,27 y 0,45 s después de entrar el puntero**, es decir, 70-250 ms más que con prefetch. Apenas se nota: el póster sigue ahí durante esa espera, y el vídeo lo sustituye sin salto.
2. **En una conexión floja (2 Mbps o menos) tarda de 0,5 a 0,9 s** (el doble o el triple que con prefetch). Se nota, pero el póster sigue visible y no hay tirón. Por debajo de 1,5 Mbps estimados (`SLOW_DOWNLINK_MBPS`) el feed ya no reproduce nada en hover: póster fijo.
3. **El factor que más pesa es el primer byte del CDN, no el ancho de banda**: una derivada sin calentar suma ~0,6 s a cualquier conexión. Por eso calentar las derivadas (botón del ABM, `scripts/warm-cloudinary.mjs`) es lo que de verdad protege esta experiencia.
4. Lo que se gana: un pin `hover` ya no gasta ancho de banda de Cloudinary Free cuando el visitante solo pasa por encima, ni ocupa uno de los 3 billetes de prefetch (los pines `viewport` los aprovechan mejor).

## Límites de la simulación

Es un servidor local con latencia y ancho de banda emulados, no Cloudinary real; el clip es sintético (`testsrc2` con ruido), con el peso del contrato pero no con el contenido real; y Chromium de Playwright reproduce WebM (VP9). Safari reproduce el MP4/H.264 y su comportamiento de buffer es algo más conservador: allí las cifras pueden ser algo mayores. Para cifras reales basta repetir la medición en producción con la pestaña Network de las herramientas de desarrollo.

Los scripts están en `scripts/sim-video-hover/` (ver su README para repetirla).
