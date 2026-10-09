# Inventario técnico de cookies, almacenamiento y terceros

Documento para el asesor legal de Greener, que redacta la política de **Privacy & Cookies** (la página `/privacy` es hoy un placeholder). Recoge **hechos comprobados en el código el 28 de septiembre de 2026**, y marca lo que aún hay que comprobar en un navegador. No es asesoramiento jurídico: los puntos que requieren criterio legal están en el §7.

Marco consultado: Guía sobre el uso de las cookies de la AEPD (mayo de 2024) y su guía de herramientas de medición de audiencia (enero de 2024).

---

## 1. Decisión tomada (28 sep): opción A, sin banner

Ningún contenido de un tercero se carga hasta que el visitante lo pide con un clic. Por eso no se coloca nada no exento en el equipo del visitante antes de una acción suya, y no hay banner de cookies. La elección **no se guarda** (ni cookie ni almacenamiento): se vuelve a preguntar en cada vídeo. Si más adelante se añaden etiquetas de marketing, o se prefiere un banner global, esta decisión se revisa.

## 2. Almacenamiento en el navegador del visitante

| Qué                               | Dónde                     | Contenido                                                                                  | Duración                   | Finalidad                                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `greener:feed`                    | `sessionStorage` (propio) | Metadatos de los lotes del feed, cursor y posición de scroll. Sin datos personales         | Hasta cerrar la pestaña    | Restaurar la posición al volver atrás desde un detalle                                                                                                                                                                                                        |
| Elección de los embeds            | No se guarda              | Nada                                                                                       | No aplica                  | No aplica                                                                                                                                                                                                                                                     |
| Plausible                         | No escribe nada           | Solo **lee** `localStorage.plausible_ignore`, una bandera para excluir las visitas propias | No aplica                  | No aplica                                                                                                                                                                                                                                                     |
| Cookies del ABM (Supabase Auth)   | Cookie de sesión          | Sesión de un administrador                                                                 | Sesión                     | Autenticación. **No las recibe ningún visitante**, solo los administradores del ABM                                                                                                                                                                           |
| `greener_visitor` (nueva, 29 sep) | Cookie propia, httpOnly   | Un UUID aleatorio, sin ningún dato personal ni relación con ninguna cuenta                 | 24 h, renovable con el uso | Limitar peticiones al feed público (evitar abuso/tráfico automatizado, §16.1) — cookie técnica de seguridad, exenta de consentimiento bajo el art. 22.2 LSSI (la guía de la AEPD pone justo este caso como ejemplo de lo exento), pero se menciona igualmente |

## 3. Terceros que reciben datos del navegador del visitante

**Al cargar cualquier página:**

1. **Cloudinary** (`res.cloudinary.com`): imágenes y vídeos. Recibe la IP y las cabeceras habituales de la petición. Cookies: no comprobado (ver §6).
2. **Plausible** (`plausible.io/api/event`): eventos de uso y la URL de la página, sin cookies. Solo en producción, y con `/admin` y `/auth` excluidos.

**Solo tras el clic del visitante, en la página de un episodio:**

3. **YouTube** (`youtube-nocookie.com`), **Vimeo** (`player.vimeo.com`, con `dnt=1`) y **Spotify** (`open.spotify.com/embed`).

Lo que se sabe de estos tres por la **auditoría del 22-23 de septiembre, sin repetir desde entonces**:

1. YouTube escribe un identificador de dispositivo en el almacenamiento local al cargar, y planta una cookie al reproducir.
2. Vimeo planta la cookie persistente `vuid` (dos años) desde la carga si no se le pasa `dnt=1`. Con `dnt=1` se evita antes de interactuar.
3. Spotify planta varias cookies desde la carga (`sp_t`, `sp_ab`, `sp_landing`…) y no ofrece parámetro equivalente.

## 4. Datos que trata el servidor (para la política de privacidad)

**Formulario de contacto.** Campos: nombre, teléfono, email y mensaje, más una casilla de aceptación de la política, que ahora enlaza a `/privacy`.

1. Nombre, teléfono, email y mensaje **viajan por correo (SMTP) y no se guardan en la base de datos**. El proveedor del buzón está por confirmar.
2. Se guarda en `contact_submission` únicamente: un **hash con sal de la IP**, la fecha y el resultado del envío. Finalidad: límite anti-abuso de 5 envíos por hora por IP.
3. **Conservación: sin plazo definido y sin purga automática.**
4. Aviso técnico: si el proxy de Dinahosting no reenvía la IP del visitante (se comprueba tras el primer despliegue), todos los visitantes compartirían el mismo hash.

**Proveedores que intervienen en el tratamiento:** Dinahosting (hosting y proxy), Supabase (base de datos, autenticación y almacenamiento de paquetes), Cloudinary (medios), Plausible (analítica) y el proveedor SMTP. Cloudmersive (antivirus) y Google OAuth solo intervienen en el ABM, no con datos de visitantes.

## 5. Analítica (Plausible)

Eventos actuales: `Pin Click` (con `destinationType`, `section`, `tag` y `pinType`). Previstos: `Case Open`, `Tool Open`, `Tool Used`, `Insight Open`, `Episode Play`, `Newsletter Signup` y `Feed Depth`.

La guía de la AEPD de enero de 2024 permite no pedir consentimiento para medición de audiencia si: la finalidad es solo medir, en nombre exclusivo del editor, con datos anónimos, sin cruzarlos con otros tratamientos, sin cederlos y sin seguir al usuario entre sitios. Su lista cerrada de mediciones incluye las acciones de usuario (clics) por página. Exige además: informar en la política de privacidad, un contrato con el proveedor del art. 28 del RGPD (sin reutilización de los datos, con las transferencias fuera de la UE conformes al RGPD), una evaluación documentada de la configuración, y una conservación de la información recogida de como máximo 25 meses.

**Pendiente de comprobar**: el contrato (DPA) con Plausible, dónde se alojan y cuánto tiempo se conservan sus datos, y documentar la evaluación.

## 6. Comprobación en el navegador (unos 5 minutos)

Con las herramientas de desarrollador (pestañas **Application** y **Network**), en un episodio de cada proveedor:

1. Antes de pulsar «Load … content»: no debe haber cookies ni entradas de almacenamiento de terceros, ni ninguna petición a YouTube, Vimeo o Spotify.
2. Tras pulsarlo: anotar qué cookies y entradas de almacenamiento aparecen, de qué dominio y con qué duración. Ese es el contenido real de la tabla de cookies de terceros de la política.
3. En cualquier página: que las peticiones a `res.cloudinary.com` no dejen cookies.
4. En producción: que Plausible **no escribe** cookies ni almacenamiento, y que su petición a `plausible.io/api/event` responde 202 y no aparece un error de CSP en la consola (la CSP no lo permitía hasta el 28 de septiembre; ver `PROGRESO.md` §2.11).

## 7. Puntos para el criterio del asesor legal

1. Si `greener:feed` (estado de navegación en `sessionStorage`, sin datos personales) queda exento como funcionalidad solicitada por el usuario.
2. Si Plausible cumple las condiciones de exención de la guía de analítica, y las garantías del §5.
3. Si el aviso previo a la carga, con el clic como acción afirmativa, basta como consentimiento válido, sabiendo que **no hay botón «rechazar» explícito**: no pulsar equivale a rechazar y no se carga nada. La guía de la AEPD reconoce pedir el consentimiento antes de descargar un vídeo (§3.2.3 d).
4. Transferencias internacionales de YouTube/Google, Vimeo, Spotify, Cloudinary, Supabase y Plausible.
5. Plazo de conservación y base legal del hash de IP del formulario de contacto.
6. Idioma de la política: la interfaz es inglesa, y la guía pide que la información esté en castellano o en la lengua cooficial del sitio.
7. Si se añaden etiquetas de marketing (LinkedIn, Meta, Google Ads) o se pasa a un banner global, hay que revisar esta decisión: esas etiquetas sí necesitan consentimiento previo.
8. Enlaces a las políticas de privacidad de cada tercero, que la política puede usar para dar la información de sus cookies.
