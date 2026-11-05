import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Los textos de «en curso» del ABM (`Guardando…`, `Subiendo…`) llevan el
 * carácter de puntos suspensivos, no tres puntos ASCII (decisión de Greener,
 * 26 oct 2026, ADM-A1/A2). Vitest no ve el texto de los componentes que no
 * renderiza, así que lo vigila este test leyendo el código.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

// Una letra y tres puntos pegados al cierre de una cadena: `'Guardando...'`.
// El spread (`...props`) no encaja: va seguido de un identificador.
const ASCII_ELLIPSIS_IN_STRING = /[a-záéíóúñ]\.\.\.['"`]/i

describe('textos de pendiente del ABM', () => {
  const root = process.cwd()
  const files = [
    ...sourceFiles(join(root, 'src', 'app', 'admin')),
    ...sourceFiles(join(root, 'src', 'components', 'admin')),
  ]

  it('hay ficheros que vigilar', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('el patrón detecta tres puntos ASCII y deja pasar el carácter y el spread', () => {
    expect("'Guardando...'").toMatch(ASCII_ELLIPSIS_IN_STRING)
    expect("'Guardando…'").not.toMatch(ASCII_ELLIPSIS_IN_STRING)
    expect('<Foo {...props} />').not.toMatch(ASCII_ELLIPSIS_IN_STRING)
  })

  it('ningún texto usa tres puntos ASCII en lugar de «…»', () => {
    const offenders = files.filter((path) =>
      ASCII_ELLIPSIS_IN_STRING.test(readFileSync(path, 'utf8')),
    )

    expect(offenders).toEqual([])
  })
})
