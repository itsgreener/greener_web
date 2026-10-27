import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * Ficheros `.ts` y `.tsx` de una carpeta de `src`, con la ruta relativa a la
 * raíz del proyecto. Para los tests de arquitectura que leen el código.
 */
export function sourceFiles(...dirs: string[]): string[] {
  const root = process.cwd()

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)

      if (statSync(path).isDirectory()) return walk(path)

      return /\.(ts|tsx)$/.test(name) ? [path] : []
    })
  }

  return dirs
    .flatMap((dir) => walk(join(root, dir)))
    .map((path) => relative(root, path).split('\\').join('/'))
}

/** El código de un fichero sin comentarios de bloque ni de línea. */
export function codeOf(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}
