/**
 * Tamaño máximo del ZIP de tools/insights: 10 MB.
 *
 * Por qué 10 MB y no más: el ZIP completo se envía a Cloudmersive para el
 * escaneo antivirus (§12.5, `uploadHtmlPackage.ts`), y su cuenta gratuita
 * solo admite hasta 10 MB; un ZIP mayor no se podría escanear y, como el
 * escaneo es bloqueante, tampoco publicar. Con un plan de pago se sube aquí,
 * en `CLOUDMERSIVE_MAX_FILE_BYTES` y en `next.config.ts`; un test falla si
 * los límites se desalinean.
 *
 * Son 10 MB DECIMALES (10.000.000 bytes), como los muestra el Finder: lo que
 * verá quien prepare el ZIP, y con margen bajo el tope del antivirus.
 *
 * `next.config.ts` (`serverActions.bodySizeLimit`) debe ser IGUAL O MAYOR: el
 * cuerpo lleva el ZIP más los campos del formulario. Es bastante mayor
 * (20 MB) para que un ZIP de 15 MB llegue al validador y reciba el mensaje
 * claro «supera el límite» en vez del error genérico de Next.
 */
export const PACKAGE_LIMITS = {
  maxZipSizeBytes: 10 * 1000 * 1000,

  /*
   * Límites del contenido DESCOMPRIMIDO (ZIP bomb).
   * Los 10 MB de arriba son del ZIP comprimido; sin estos topes, un ZIP
   * pequeño puede declarar gigas y tumbar el único proceso PM2 al extraerlo.
   * Holgados para un paquete real (HTML + JS + fuentes + imágenes).
   */
  maxEntries: 1000,
  maxUncompressedBytes: 60 * 1000 * 1000,
  maxEntryUncompressedBytes: 25 * 1000 * 1000,
}
