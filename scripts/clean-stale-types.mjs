// `tsconfig.json` incluye `.next/dev/types`, que escribe `next dev` y que se
// queda con rutas de páginas que ya no existen (renombradas o borradas): el
// `tsc` de la build falla con «Cannot find module '…/page.js'». Se borra antes
// de cada build y de cada typecheck; `next dev` lo regenera al arrancar.
import { rmSync } from 'node:fs'

rmSync('.next/dev/types', { recursive: true, force: true })
