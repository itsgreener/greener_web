import { TRAP_PATH } from '@/lib/botTraps'

/**
 * Enlace invisible a la ruta señuelo (`lib/botTraps.ts`). Una persona no lo
 * ve (`hidden`), no se puede enfocar con el teclado ni lo lee un lector de
 * pantalla; un scraper que sigue todos los enlaces del HTML sí lo encuentra.
 * `nofollow` y la prohibición en robots.txt dejan fuera a los buscadores
 * educados. Es un `<a>` plano y no `Link` para que Next no lo precargue.
 */
export function BotTrapLink() {
  return (
    <a href={TRAP_PATH} rel="nofollow" tabIndex={-1} aria-hidden="true" hidden>
      Client list
    </a>
  )
}
