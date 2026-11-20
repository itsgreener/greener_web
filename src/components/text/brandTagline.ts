/**
 * Frase de marca «We should have a brand together». Vive aquí para que la
 * página de contacto (titular a cuatro líneas, vía `BrokenHeadline`) y el
 * header de la home y las subhomes (`AuxNav`, en una sola línea) pinten
 * siempre el mismo texto: si cambia la frase, cambia en los dos sitios.
 */
export const BRAND_TAGLINE_LINES = [
  'We',
  'should have',
  'a brand',
  'together',
] as const

/** La misma frase en una sola línea. */
export const BRAND_TAGLINE = BRAND_TAGLINE_LINES.join(' ')
