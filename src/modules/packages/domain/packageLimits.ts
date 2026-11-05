/**
 * Tamaño máximo del ZIP de tools/insights: 3,5 MB.
 *
 * Por qué 3,5 MB y no más: el ZIP completo se envía a Cloudmersive para el
 * escaneo antivirus (§12.5, `uploadHtmlPackage.ts`), y su cuenta gratuita
 * solo admite ficheros de hasta 3,5 MB (confirmado por Cloudmersive el 28 oct
 * 2026: «Your API call exceeded 3.5 MB file size limit of free tier»; antes
 * se creía que eran 10 MB). Un ZIP mayor no se podría escanear y, como el
 * escaneo es bloqueante, tampoco publicar. Con un plan de pago se sube aquí y
 * en `CLOUDMERSIVE_MAX_FILE_BYTES`; un test falla si los límites se
 * desalinean.
 *
 * Son MB DECIMALES (3.500.000 bytes), como los muestra el Finder: lo que verá
 * quien prepare el ZIP, y el valor más estricto de las dos lecturas posibles
 * (MB o MiB) del límite del servicio.
 *
 * `next.config.ts` (`serverActions.bodySizeLimit`, 5 MB) debe ser IGUAL O
 * MAYOR: lo necesita el CV del personal, que sí viaja en una Server Action y
 * tiene el mismo tope. El ZIP ya no viaja en esa petición (sube directo a
 * Storage, y el navegador avisa antes de subir si pasa de 3,5 MB), y 3,5 MB
 * cabe además bajo el límite de ~4,5 MB que la plataforma pone al cuerpo de
 * una función.
 */
export const PACKAGE_LIMITS = {
  maxZipSizeBytes: 3_500_000,

  /*
   * Límites del contenido DESCOMPRIMIDO (ZIP bomb).
   * Los 3,5 MB de arriba son del ZIP comprimido; sin estos topes, un ZIP
   * pequeño puede declarar gigas y tumbar el único proceso PM2 al extraerlo.
   * Holgados para un paquete real (HTML + JS + fuentes + imágenes).
   */
  maxEntries: 1000,
  maxUncompressedBytes: 60 * 1000 * 1000,
  maxEntryUncompressedBytes: 25 * 1000 * 1000,

  /*
   * Bloque `metadata` del manifest (contrato del ZIP §2.1). Los textos se
   * acotan a lo que las redes sociales y Google muestran sin cortar.
   */
  metadata: {
    titleMax: 70,
    descriptionMax: 200,
    altMax: 200,
    keywordsMax: 12,
    keywordMax: 40,
  },

  /*
   * Imagen Open Graph. 1200 × 630 es el tamaño de referencia de Facebook,
   * LinkedIn y X (ratio 1,91:1); se admite ±5 % de ratio y cualquier tamaño
   * mayor. 5 MB es el tope que aceptan los scrapers más estrictos.
   */
  ogImage: {
    maxBytes: 5 * 1000 * 1000,
    minWidth: 1200,
    minHeight: 630,
    ratio: 1200 / 630,
    ratioTolerance: 0.05,
  },
}

/** «3,5 MB» (decimal, con coma) para los mensajes que ve quien sube el ZIP. */
export function formatMegabytes(bytes: number): string {
  return `${String(bytes / 1_000_000).replace('.', ',')} MB`
}
