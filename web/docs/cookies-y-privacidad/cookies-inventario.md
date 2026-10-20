# Inventario técnico de cookies, almacenamiento y terceros

Documento para el asesor legal de Greener, que redacta la política de **Privacy & Cookies** (la página `/privacy` lleva desde el 13 de octubre un texto **provisional**, ver `docs/cookies-y-privacidad/politica-cookies-cambios.md`). Recoge **hechos comprobados en el código** (28 de septiembre de 2026, actualizados el 13 de octubre con la ventana de cookies), y marca lo que aún hay que comprobar en un navegador. No es asesoramiento jurídico: los puntos que requieren criterio legal están en el §7.

Marco consultado: Guía sobre el uso de las cookies de la AEPD (mayo de 2024) y su guía de herramientas de medición de audiencia (enero de 2024).

---

## 1. Decisión vigente (13 oct): ventana de cookies con consentimiento global

El **28 de septiembre** se decidió la «opción A» (sin banner, elección no guardada, una pregunta por cada vídeo). **Queda sustituida el 13 de octubre** por una ventana de cookies:

1. **Ventana fija abajo y sin bloquear.** Se puede navegar y hacer scroll con ella a la vista; solo **Aceptar**, **Rechazar** o la **X** la cierran (la X cuenta como rechazar). Scroll, clic fuera y Escape no deciden nada. Aceptar y Rechazar tienen el mismo tamaño, color y peso.
2. **La decisión se guarda** en la cookie propia `greener_consent` (24 meses; solo decisión, versión del texto y fecha). Se vuelve a preguntar si cambia la versión del texto (`CONSENT_TEXT_VERSION`, igual a la fecha de «Última actualización» de la política) o si pasan 24 meses.
3. **Aceptar vale para todos los vídeos** hasta que se revoque. «Privacy & Cookies» en el menú lateral lleva a `/privacy`, donde, al principio, un bloque «Your cookie choice» muestra la decisión vigente y permite aceptar o rechazar de nuevo. Una vez decidido, la ventana no vuelve a salir. Revocar desmonta el reproductor al instante.
4. **Ningún reproductor se monta sin «sí» y sin clic en play.** Antes de eso, un episodio muestra una portada de Greener (el primer pin del episodio, servido por Cloudinary) y un botón de play. Con cookies rechazadas o sin decidir, play abre una petición dentro del propio episodio («Accept cookies and play» / «Not now»); aceptarla guarda la decisión global.
5. **Contador anónimo** de la elección: evento «Cookie Choice» de Plausible con `choice` (`accept` / `reject` / `close`) y la versión del texto. Sin identificador del visitante.
6. **Textos en inglés** de momento (la web no tiene selector de idioma). Los de la ventana están en `src/modules/consent/domain/copy.ts`, con estructura por idioma.

Si se añaden etiquetas de marketing, hay que revisar esta decisión: esas etiquetas necesitan consentimiento previo y su propia categoría en la ventana.

## 2. Almacenamiento en el navegador del visitante

| Qué                               | Dónde                     | Contenido                                                                                  | Duración                   | Finalidad                                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `greener:feed`                    | `sessionStorage` (propio) | Metadatos de los lotes del feed, cursor y posición de scroll. Sin datos personales         | Hasta cerrar la pestaña    | Restaurar la posición al volver atrás desde un detalle                                                                                                                                                                                                        |
| `greener_consent` (nueva, 13 oct) | Cookie propia, no httpOnly (la lee el cliente) | `{decisión, versión del texto, fecha}`; sin identificador                  | 24 meses (`Max-Age` 730 días), `SameSite=Lax`, `Secure` en https | Recordar la elección de la ventana de cookies. Preferencia del usuario, exenta (art. 22.2 LSSI)                                                                                                                            |
| `greener_newsletter` (nueva, 15 oct, fase 3 del plan de `other`) | Cookie propia, **no** httpOnly (la lee el cliente), escrita por el servidor con `Set-Cookie` | `1`; sin email ni identificador | 12 meses, `SameSite=Lax`, `Secure` en https, `Path=/` | Que el feed deje de intercalar el pin de newsletter en un dispositivo que ya se suscribió. Solo se escribe tras una acción real (alta nueva, pendiente o ya suscrito), nunca en el éxito silencioso del honeypot. Independiente de `greener_consent`. Se considera una preferencia que pide el propio visitante al suscribirse (art. 22.2 LSSI): **criterio final del asesor**; plan B si exige consentimiento previo: guardarla solo si aceptó cookies |
| Atribución de «Case Open»         | **Ya no se guarda**       | Variable en memoria de la pestaña (módulo `navigationAttribution`)                         | Hasta navegar o recargar   | Antes `sessionStorage` (`greener:analytics:navigation-source`), pero ese código nunca se llegó a escribir en producción (nadie llamaba a `rememberNavigationSource`). El 13 oct se cablea desde `PinCard` y pasa a memoria: no toca el dispositivo               |
| Plausible                         | No escribe nada           | Solo **lee** `localStorage.plausible_ignore`, una bandera para excluir las visitas propias | No aplica                  | No aplica                                                                                                                                                                                                                                                     |
| Cookies del ABM (Supabase Auth)   | Cookie de sesión          | Sesión de un administrador                                                                 | Sesión                     | Autenticación. **No las recibe ningún visitante**, solo los administradores del ABM                                                                                                                                                                           |
| `greener_visitor` (nueva, 29 sep) | Cookie propia, httpOnly   | Un UUID aleatorio, sin ningún dato personal ni relación con ninguna cuenta                 | 24 h, renovable con el uso | Limitar peticiones al feed público (evitar abuso/tráfico automatizado, §16.1) y, desde el 19 oct 2026, a las rutas de talent (`/api/talent`: alta por email, formulario y subida de CVs). Mismo identificador, misma finalidad y mismo plazo; no se lee para nada más — cookie técnica de seguridad, exenta de consentimiento bajo el art. 22.2 LSSI (la guía de la AEPD pone justo este caso como ejemplo de lo exento), pero se menciona igualmente |

## 3. Terceros que reciben datos del navegador del visitante

**Al cargar cualquier página:**

1. **Cloudinary** (`res.cloudinary.com`): imágenes y vídeos. Recibe la IP y las cabeceras habituales de la petición. Cookies: no comprobado (ver §6).
2. **Plausible** (`plausible.io/api/event`): eventos de uso y la URL de la página, sin cookies. Solo en producción, y con `/admin` y `/auth` excluidos.

**Solo con consentimiento y tras el clic en play, en la página de un episodio:**

3. **YouTube** (`youtube-nocookie.com`) y **Spotify** (`open.spotify.com/embed`). **Vimeo se retiró el 13 de octubre de 2026** (ver §2.63 de `docs/historial/historial-fase-5.md`): ya no está en la CSP ni en el ABM.

Lo que se sabe de estos por la **auditoría del 22-23 de septiembre, sin repetir desde entonces**:

1. YouTube escribe un identificador de dispositivo en el almacenamiento local al cargar, y planta una cookie al reproducir.
2. Spotify planta varias cookies desde la carga (`sp_t`, `sp_ab`, `sp_landing`…) y no ofrece parámetro equivalente.

## 4. Datos que trata el servidor (para la política de privacidad)

**Formulario de contacto.** Campos: nombre, teléfono, email y mensaje, más una casilla **informativa** («I have read the privacy policy»: no obligatoria, sin marcar y sin `name`, no viaja con el formulario) que enlaza a `/privacy#privacy` (desde el 19 oct 2026, §2.86).

1. Nombre, teléfono, email y mensaje **viajan por correo (SMTP) y no se guardan en la base de datos**. El servidor SMTP es el del servicio de correo de Dinahosting (nodemailer, `CONTACT_SMTP_*`; confirmado por Greener el 19 oct); el buzón de destino está en Google Workspace.
2. Se guarda en `contact_submission` únicamente: un **hash con sal de la IP**, la fecha, el resultado del envío y, si falló, el **mensaje de error** del servidor de correo (puede incluir la dirección de email del visitante). Finalidad: límite anti-abuso de 5 envíos por hora por IP.
3. **Conservación: 30 días**, con purga diaria por `pg_cron` (`purge-expired-contact-submissions`, migración `20261019140000`, §2.86; por aplicar en producción).
4. Aviso técnico: si el proxy de Dinahosting no reenvía la IP del visitante (se comprueba tras el primer despliegue), todos los visitantes compartirían el mismo hash.

**Proveedores que intervienen en el tratamiento:** Dinahosting (hosting y proxy), Supabase (base de datos, autenticación y almacenamiento de paquetes), Cloudinary (medios), Plausible (analítica) y el servicio de correo de Dinahosting (SMTP). Cloudmersive (antivirus) y Google OAuth solo intervienen en el ABM, no con datos de visitantes.

## 5. Analítica (Plausible)

Eventos actuales: `Pin Click` (con `destinationType`, `section`, `tag` y `pinType`) y, desde el 13 de octubre, `Cookie Choice` (`choice`: accept / reject / close, y `textVersion`). Desde el 15 de octubre, `Newsletter Signup` (`placement: 'feed'`, solo altas nuevas, sin email). Previstos: `Case Open`, `Tool Open`, `Tool Used`, `Insight Open`, `Episode Play` y `Feed Depth`.

La guía de la AEPD de enero de 2024 permite no pedir consentimiento para medición de audiencia si: la finalidad es solo medir, en nombre exclusivo del editor, con datos anónimos, sin cruzarlos con otros tratamientos, sin cederlos y sin seguir al usuario entre sitios. Su lista cerrada de mediciones incluye las acciones de usuario (clics) por página. Exige además: informar en la política de privacidad, un contrato con el proveedor del art. 28 del RGPD (sin reutilización de los datos, con las transferencias fuera de la UE conformes al RGPD), una evaluación documentada de la configuración, y una conservación de la información recogida de como máximo 25 meses.

**Pendiente de comprobar**: el contrato (DPA) con Plausible, dónde se alojan y cuánto tiempo se conservan sus datos, y documentar la evaluación.

## 6. Comprobación en el navegador (unos 5 minutos)

Con las herramientas de desarrollador (pestañas **Application** y **Network**), en un episodio de cada proveedor:

1. Antes de aceptar las cookies y pulsar play: no debe haber cookies ni entradas de almacenamiento de terceros, ni ninguna petición a YouTube ni a Spotify (solo `res.cloudinary.com` para la portada).
2. Tras aceptar y pulsar play: anotar qué cookies y entradas de almacenamiento aparecen, de qué dominio y con qué duración. Ese es el contenido real de la tabla de cookies de terceros de la política.
3. En cualquier página: que las peticiones a `res.cloudinary.com` no dejen cookies.
4. En producción: que Plausible **no escribe** cookies ni almacenamiento, y que su petición a `plausible.io/api/event` responde 202 y no aparece un error de CSP en la consola (la CSP no lo permitía hasta el 28 de septiembre; ver `docs/PROGRESO.md` §2.11).

## 7. Puntos para el criterio del asesor legal

1. Si `greener:feed` (estado de navegación en `sessionStorage`, sin datos personales) queda exento como funcionalidad solicitada por el usuario.
2. Si Plausible cumple las condiciones de exención de la guía de analítica, y las garantías del §5.
3. Si la ventana de cookies cumple (botones de aceptar y rechazar equivalentes, X que rechaza, ventana no bloqueante que se queda hasta decidir, revocación desde `/privacy` (a la que lleva «Privacy & Cookies» del menú), nueva petición al pulsar play cuando no se ha aceptado). Que **aceptar valga para todos los vídeos** y para 24 meses, y que revocar desmonte el reproductor pero **no borre** las cookies que el proveedor ya hubiera puesto (eso lo hace el navegador).
4. Transferencias internacionales de YouTube/Google, Spotify, Cloudinary, Supabase y Plausible.
5. Plazo de conservación y base legal del hash de IP del formulario de contacto.
6. Idioma de la política: la interfaz es inglesa, y la guía pide que la información esté en castellano o en la lengua cooficial del sitio.
7. Si se añaden etiquetas de marketing (LinkedIn, Meta, Google Ads) o se pasa a un banner global, hay que revisar esta decisión: esas etiquetas sí necesitan consentimiento previo.
8. El contador anónimo «Cookie Choice» (qué se elige y con qué versión del texto) está informado en la política; confirmar que encaja en la exención de medición de audiencia.
9. Enlaces a las políticas de privacidad de cada tercero, que la política puede usar para dar la información de sus cookies.
