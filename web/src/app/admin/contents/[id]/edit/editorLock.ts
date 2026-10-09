import { useSyncExternalStore } from 'react'

/**
 * Cerrojo compartido de las operaciones destructivas del editor de un
 * contenido (borrar pines, quitar diapositivas del carrusel…).
 *
 * POR QUÉ (8 oct): cada botón tenía su propio estado «pendiente». Con dos
 * operaciones lanzadas a la vez (p. ej. «Quitar todas las diapositivas» y,
 * antes de que acabe, «Borrar todos los pines»), la primera en terminar
 * recargaba la página (`window.location.reload()`) mientras la segunda
 * seguía en marcha: la recarga mostraba un estado intermedio (pines ya
 * borrados en la base de datos pero aún en pantalla) y la segunda respuesta
 * se perdía. Con el cerrojo, mientras una operación está en marcha las demás
 * están deshabilitadas.
 *
 * Es un almacén a nivel de módulo (no un contexto) porque los botones viven
 * en componentes cliente hermanos bajo una página de servidor, sin padre
 * cliente común. Cada operación pide el cerrojo con `acquireEditorLock()` y
 * lo suelta con la función que devuelve. Si la operación acaba en recarga de
 * página no hace falta soltarlo: la recarga lo reinicia.
 */

let held = 0

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

/** Toma el cerrojo; devuelve la función que lo suelta (idempotente). */
export function acquireEditorLock(): () => void {
  held += 1
  emit()

  let released = false

  return () => {
    if (released) return

    released = true
    held -= 1
    emit()
  }
}

/** ¿Hay alguna operación destructiva en marcha en el editor? */
export function useEditorBusy(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => held > 0,
    () => false,
  )
}

/** Solo para tests: deja el cerrojo como al cargar la página. */
export function resetEditorLockForTests() {
  held = 0
  emit()
}
