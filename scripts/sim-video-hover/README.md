# Simulación de carga del vídeo en hover (plan de pendientes, A3)

Mide cuánto tarda en empezar a sonar el vídeo de un pin en modo `hover` **sin prefetch**, comparado con tenerlo ya descargado. Chromium (Playwright) con la red limitada por CDP (`Network.emulateNetworkConditions`: ancho de banda y latencia) contra un servidor local que sirve un WebM de 6 s a 480×600 con latencia de CDN configurable.

## Cómo repetirla

```
# 1. Tres clips a 480×600, 30 fps, 6 s, VP9 (≈0,2 / 0,33 / 0,57 MB)
for spec in light:250k typical:420k heavy:850k; do n=${spec%%:*}; b=${spec##*:}
  ffmpeg -y -f lavfi -i "testsrc2=size=480x600:rate=30:duration=6" \
    -vf "noise=alls=6:allf=t,format=yuv420p" -c:v libvpx-vp9 -b:v $b -maxrate $b -bufsize $b \
    -deadline good -cpu-used 4 -an $n.webm; done
# 2. Copiar server.mjs, index.html y run.py junto a los .webm, y:
python3 run.py            # TTFB del CDN por defecto: 40 ms (env TTFB=600 para una derivada sin calentar)
```

Los resultados de la medición del 16 de octubre están en `docs/historial/historial-informes-cerrados-oct-2026.md` (informe 5).

Mide desde el `mouseenter` hasta el evento `playing` del `<video>`. Los 200 ms de intención de hover están incluidos. Con prefetch el vídeo ya está descargado y solo se espera esa intención (≈200 ms).
