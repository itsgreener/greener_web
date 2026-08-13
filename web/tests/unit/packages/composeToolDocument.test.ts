import { describe, it, expect } from "vitest";
import { composeToolDocument } from "@/modules/packages/application/composeToolDocument";
import type { ResolvedPackage } from "@/modules/packages/domain/manifest";

const SAMPLE_PACKAGE: ResolvedPackage = {
  slug: "pixel-palette",
  manifest: {
    kind: "tool",
    entrypoint: "index.html",
    version: 1,
    requiredCapabilities: ["canvas", "worker", "download"],
    externalDomains: [],
    minViewport: { width: 320, height: 420 },
  },
  html: `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Pixel Palette</title>
    <link rel="stylesheet" href="./assets/style.css" />
  </head>
  <body>
    <canvas id="canvas"></canvas>
    <script src="./assets/main.js"></script>
  </body>
</html>`,
};

const VIEWPORT = { width: 900, height: 700, sidebarWidth: 64 };

describe("composeToolDocument", () => {
  const doc = composeToolDocument(SAMPLE_PACKAGE, VIEWPORT, "/tools/pixel-palette/");

  it("produce un único documento HTML, sin <html> anidado", () => {
    const htmlTagCount = (doc.match(/<html/g) || []).length;
    expect(htmlTagCount).toBe(1);
    const bodyTagCount = (doc.match(/<body/g) || []).length;
    expect(bodyTagCount).toBe(1);
  });

  it("inyecta <base href> apuntando a la ruta propia del paquete", () => {
    expect(doc).toContain('<base href="/tools/pixel-palette/" />');
  });

  it("inyecta las variables CSS de viewport (§12.3)", () => {
    expect(doc).toContain("--greener-available-width: 900px");
    expect(doc).toContain("--greener-available-height: 700px");
    expect(doc).toContain("--greener-sidebar-width: 64px");
  });

  it("conserva el <link> y el <script> del paquete, con rutas relativas intactas", () => {
    expect(doc).toContain('href="./assets/style.css"');
    expect(doc).toContain('src="./assets/main.js"');
  });

  it("incluye el menú lateral con las cinco entradas del brief §6, sin entrada de Casos", () => {
    for (const label of ["Home", "Insights", "Tools", "Channel", "Contacto"]) {
      expect(doc).toContain(`title="${label}"`);
    }
    expect(doc).not.toContain('title="Casos"');
  });

  it("conserva el contenido del body del paquete (el canvas)", () => {
    expect(doc).toContain('<canvas id="canvas">');
  });
});
