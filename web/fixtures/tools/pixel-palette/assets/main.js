/**
 * "Pixel Palette" — main thread. Dibuja un degradado en canvas, delega el
 * cálculo de paleta a un Worker propio del paquete, y permite descargar el
 * resultado como archivo — las tres capacidades que motivaron validar el
 * servido en mismo origen sin iframe (arquitectura §22, §12.1).
 */
(function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const redrawBtn = document.getElementById("redraw");
  const computeBtn = document.getElementById("compute");
  const downloadBtn = document.getElementById("download");
  const paletteEl = document.getElementById("palette");

  let worker = null;
  let lastPalette = null;

  function randomHue() {
    return Math.floor(Math.random() * 360);
  }

  function drawGradient() {
    const h1 = randomHue();
    const h2 = (h1 + 90 + Math.floor(Math.random() * 90)) % 360;
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, `hsl(${h1}, 70%, 55%)`);
    gradient.addColorStop(1, `hsl(${h2}, 70%, 45%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    paletteEl.innerHTML = "";
    downloadBtn.disabled = true;
    lastPalette = null;
  }

  function renderPalette(palette) {
    paletteEl.innerHTML = "";
    for (const { r, g, b } of palette) {
      const li = document.createElement("li");
      li.style.background = `rgb(${r}, ${g}, ${b})`;
      li.title = `rgb(${r}, ${g}, ${b})`;
      paletteEl.appendChild(li);
    }
  }

  function computePalette() {
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (!worker) {
      // Worker propio del paquete, ruta relativa (contrato §12.2).
      worker = new Worker("./worker.js");
      worker.onmessage = (event) => {
        lastPalette = event.data.palette;
        renderPalette(lastPalette);
        downloadBtn.disabled = false;
      };
    }

    // Copia transferible: no bloquea el hilo principal con el cálculo.
    const pixels = new Uint8ClampedArray(data);
    worker.postMessage({ pixels, bucketCount: 6 }, [pixels.buffer]);
  }

  function downloadPalette() {
    if (!lastPalette) return;
    const blob = new Blob([JSON.stringify(lastPalette, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paleta.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  redrawBtn.addEventListener("click", drawGradient);
  computeBtn.addEventListener("click", computePalette);
  downloadBtn.addEventListener("click", downloadPalette);

  drawGradient();
})();
