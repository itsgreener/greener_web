# Páginas de estado (`components/status`)

`StatusPage` es el cuerpo común del 404 y del error: título, mensaje y, si hay, acciones. A propósito **no** pinta `<main>`: dentro de `(public)` ya lo aporta el Shell, y en las páginas sin Shell (el `not-found` y el `global-error` de la raíz) lo pone quien la usa.

`NotFoundPage` y `ErrorPage` son las dos páginas hechas con ella; el texto de `ErrorPage` vive en `ErrorPage/copy.ts`. Cualquier otra pantalla de estado (mantenimiento, sin permiso…) debe salir de `StatusPage`, no de una copia.
