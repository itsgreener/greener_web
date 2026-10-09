/**
 * Tamaño máximo del ZIP de tools/insights: 10 MB (decisión del 28 de
 * septiembre, cerrando la cifra que el brief dejó pendiente — Anexo A.2,
 * "Tamaño: límite operativo definido en la especificación del 15 de
 * agosto", que nunca se cerró).
 *
 * Por qué 10 MB y no más: el ZIP completo se envía tal cual a Cloudmersive
 * para el escaneo antivirus (§12.5, ver `uploadHtmlPackage.ts`), y la
 * cuenta gratuita de Cloudmersive solo admite ficheros de hasta 10 MB
 * ("requires paid account for >10MB" en su documentación). Un ZIP mayor
 * no se podría escanear y, como el escaneo es bloqueante, tampoco publicar.
 * Con un plan de pago el tope de Cloudmersive sube mucho más — si algún
 * día hace falta, subir aquí y en `CLOUDMERSIVE_MAX_FILE_BYTES`, y en
 * `next.config.ts` (ver más abajo). Hay un test que falla si estos límites
 * se desalinean.
 *
 * Son 10 MB DECIMALES (10.000.000 bytes), no 10 MiB: es lo que muestra el
 * Finder de macOS, así que coincide con lo que verá quien prepare el ZIP,
 * y deja margen de sobra bajo el tope del antivirus se cuente como se
 * cuente (la documentación de Cloudmersive no aclara cuál de las dos).
 *
 * `next.config.ts` (experimental.serverActions.bodySizeLimit) tiene que
 * ser IGUAL O MAYOR que esta cifra: el cuerpo de la Server Action lleva
 * el ZIP más los campos del formulario. A propósito es bastante mayor
 * (20 MB): así un ZIP de, digamos, 15 MB llega hasta el validador y recibe
 * el mensaje claro "supera el límite de 10 MB" en vez del error genérico
 * de Next.js por cuerpo demasiado grande.
 */
export const PACKAGE_LIMITS = {
  maxZipSizeBytes: 10 * 1000 * 1000,

  /*
   * Límites del contenido DESCOMPRIMIDO (auditoría 8 oct, P0-3: ZIP bomb).
   * Los 10 MB de arriba son del ZIP comprimido; sin estos topes, un ZIP
   * pequeño puede declarar gigas y tumbar el único proceso PM2 al extraerlo.
   * Holgados para un paquete real (HTML + JS + fuentes + imágenes).
   */
  maxEntries: 1000,
  maxUncompressedBytes: 60 * 1000 * 1000,
  maxEntryUncompressedBytes: 25 * 1000 * 1000,
}
