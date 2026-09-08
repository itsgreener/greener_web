/**
 * El tamaño máximo del ZIP de tools/insights es una de las cifras que el
 * brief deja pendiente de especificar (Anexo A.2: "Tamaño Límite operativo
 * definido en la especificación del 15 de agosto" — nunca se cerró). 20 MB
 * es un valor de partida razonable para un bundle de canvas/WebGL/Worker
 * con fuentes propias, no una cifra confirmada por Greener — cambiar aquí
 * si llega una cifra oficial, y también en next.config.ts
 * (experimental.serverActions.bodySizeLimit), que tiene que ser igual o
 * mayor.
 */
export const PACKAGE_LIMITS = {
  maxZipSizeBytes: 20 * 1024 * 1024,
}
