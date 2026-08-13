import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

/**
 * Ejecuta el archivo REAL del worker de la tool de ejemplo (no una copia)
 * dentro de un sandbox de Node que simula el `self` de un Web Worker.
 * Así se valida el contrato tal cual se serviría (contrato §12.2), sin
 * riesgo de que un "puerto" en TypeScript se desincronice del original.
 */
function loadWorkerHandler() {
  const workerPath = join(process.cwd(), "fixtures/tools/pixel-palette/assets/worker.js");
  const source = readFileSync(workerPath, "utf-8");

  let onmessageHandler: ((event: { data: unknown }) => void) | null = null;
  let lastPosted: unknown = null;

  const self = {
    set onmessage(handler: (event: { data: unknown }) => void) {
      onmessageHandler = handler;
    },
    postMessage(payload: unknown) {
      lastPosted = payload;
    },
  };

  const context = vm.createContext({ self });
  vm.runInContext(source, context, { filename: "worker.js" });

  return {
    send(data: unknown) {
      if (!onmessageHandler) throw new Error("worker.js no registró self.onmessage");
      onmessageHandler({ data });
      return lastPosted as { palette: Array<{ r: number; g: number; b: number; count: number }> };
    },
  };
}

describe("fixtures/tools/pixel-palette/assets/worker.js", () => {
  let worker: ReturnType<typeof loadWorkerHandler>;

  beforeAll(() => {
    worker = loadWorkerHandler();
  });

  it("un lienzo de un solo color produce una paleta de un único bucket", () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 200; // r
      pixels[i + 1] = 30; // g
      pixels[i + 2] = 30; // b
      pixels[i + 3] = 255; // alpha
    }

    const result = worker.send({ pixels, bucketCount: 6 });

    expect(result.palette.length).toBe(1);
    expect(result.palette[0].count).toBe(width * height);
    // El bucket agrupa en pasos de 64 con centro +32: 200 -> floor(200/64)*64+32 = 160+32=192...
    // se comprueba el redondeo real en vez de fijar un valor mágico.
    expect(result.palette[0].r).toBe(Math.floor(200 / 64) * 64 + 32);
  });

  it("respeta bucketCount: nunca devuelve más colores de los pedidos", () => {
    const pixels = new Uint8ClampedArray(4 * 100);
    for (let i = 0; i < pixels.length; i += 4) {
      // Colores pseudoaleatorios pero deterministas para el test.
      pixels[i] = (i * 37) % 256;
      pixels[i + 1] = (i * 59) % 256;
      pixels[i + 2] = (i * 83) % 256;
      pixels[i + 3] = 255;
    }

    const result = worker.send({ pixels, bucketCount: 3 });
    expect(result.palette.length).toBeLessThanOrEqual(3);
  });

  it("ignora píxeles casi transparentes (alpha < 16)", () => {
    const pixels = new Uint8ClampedArray(8);
    // Un píxel opaco rojo, un píxel casi transparente azul.
    pixels.set([255, 0, 0, 255, 0, 0, 255, 5]);

    const result = worker.send({ pixels, bucketCount: 6 });
    expect(result.palette.length).toBe(1);
    expect(result.palette[0].r).toBeGreaterThan(200); // el bucket rojo, no el azul ignorado
  });

  it("ordena la paleta por frecuencia descendente", () => {
    const pixels = new Uint8ClampedArray(4 * 4);
    // 3 píxeles rojos, 1 píxel verde.
    pixels.set([255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 0, 255, 0, 255]);

    const result = worker.send({ pixels, bucketCount: 6 });
    expect(result.palette[0].count).toBeGreaterThanOrEqual(result.palette[1].count);
  });
});
