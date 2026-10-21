# Política de cookies provisional: inconsistencias con la web y cambios propuestos

> **Estado a 19 de octubre de 2026:** el asesor legal entregó el texto definitivo (P26096, versión del 19 de octubre) y ya está en `/privacy` (§2.86 del historial). Lo de abajo es el contexto con el que se redactó; lo vigente está en `policyContent.ts`. Los **tres añadidos que pidió Greener** (§5) siguen pendientes del visto bueno del asesor.

Documento para el asesor legal de Greener. Parte del documento «Política de cookies · Cookie Policy» (P26096, actualizado el 1 de octubre de 2026) y lo contrasta con lo que **hace de verdad el sitio** a 13 de octubre de 2026. **No es un texto legal:** Claude no redacta la versión final. Recoge qué se ha corregido ya en `/privacy` (texto provisional en inglés, en `src/app/(public)/privacy/policyContent.ts`), qué queda para el asesor y qué falta por comprobar. Los hechos técnicos completos están en `docs/cookies-y-privacidad/cookies-inventario.md`.

## 1. Inconsistencias encontradas y qué se ha hecho en `/privacy`

1. **`greener_seed` no existe.** El orden de la portada no se guarda con ese nombre. Lo que hay es `greener:feed` en `sessionStorage` (lotes cargados, cursor y posición de scroll, sin datos personales; dura hasta cerrar la pestaña). *Corregido en la tabla.* El PDF lo llamaba «cookie» y la duración «sesión de navegación»; es almacenamiento de sesión.
2. **Faltaba `greener_visitor`.** Cookie propia httpOnly con un UUID aleatorio, 24 h renovable, que limita las peticiones al feed (seguridad). Exenta, pero conviene declararla. *Añadida.*
3. **«Cookies» ya no está en un pie de página**: la web no tiene pie (el feed es infinito). El menú lateral tiene una única entrada, «Privacy & Cookies», que lleva a `/privacy`; al principio de esa página, el bloque «Your cookie choice» muestra la decisión y permite aceptar o rechazar de nuevo. *Corregido el texto.*
4. **El PDF solo hablaba de cookies de YouTube, Vimeo y Spotify (Vimeo se ha retirado de la web el 13 de octubre) «al reproducir».** Es exacto en la práctica: el iframe se monta tras el consentimiento y el clic en play, y antes solo se ve una portada de Greener (Cloudinary). *Se mantiene y se precisa: «hasta que aceptes y pulses play no se pide nada a esos proveedores».*
5. **Cloudinary no aparecía.** Sirve todas las imágenes y vídeos y recibe la IP y las cabeceras de cada petición. *Añadido un apartado.* Pendiente: comprobar si deja cookies (el visitante lo medirá con las herramientas de desarrollador).
6. **Plausible:** el texto es exacto (no escribe nada; solo lee `localStorage.plausible_ignore`, una bandera para excluir las visitas propias). *Añadido* que se cuenta de forma anónima qué elige el visitante en la ventana (`Cookie Choice`).
7. **Faltaba la tabla de cookies de terceros** (nombre, titular, finalidad, duración). Es obligatoria según la guía de la AEPD y hoy no se puede rellenar sin inventar: **pendiente de la medición con DevTools** (YouTube, Spotify y Cloudinary). Entre tanto, la página enlaza a las políticas de Google y Spotify.
8. **Idioma.** El PDF dice «las dos versiones dicen lo mismo; prevalece la castellana». La web solo muestra el inglés, así que esa frase no se ha puesto (sería falsa en pantalla). Decidir cuándo se publica la versión en castellano; la estructura de los textos ya admite varios idiomas.
9. **Revocar no borra lo ya instalado.** Al revocar desde `/privacy`, el reproductor se desmonta al instante, pero las cookies que el proveedor ya puso siguen en el dispositivo hasta que el navegador las borre. El texto actual solo dice que se puede revocar y bloquear/borrar desde el navegador; el asesor debe decidir si hay que decirlo más explícitamente.
10. **Newsletter (15 oct).** Se añade a `/privacy` la sección `#newsletter` (responsable, datos, finalidad y base legal, doble confirmación, Mailchimp como encargado con transferencia internacional, conservación, la cookie `greener_newsletter` y la medición con el evento anónimo de Plausible) y la fila de la cookie en la tabla de almacenamiento propio. Texto provisional en inglés. **No se ha subido `CONSENT_TEXT_VERSION`**: hasta que el asesor entregue el texto final, la ventana no se reabre a quien ya decidió (plan §8.1.7); al sustituir el texto hay que subirla. Bloquea publicar un `other` de newsletter.
11. **Datos de los formularios.** Esta página es solo de cookies. El formulario de contacto y la newsletter tratan datos personales (ver `docs/cookies-y-privacidad/cookies-inventario.md` §4: SMTP, hash de IP sin plazo de conservación, proveedores). Falta una política de privacidad para ellos; la casilla del formulario enlaza hoy a esta misma página.

## 2. Qué dice el sitio y debe seguir diciendo el texto

1. Aceptar vale para **todos los vídeos** durante **24 meses** o hasta que cambie el texto (la versión del texto, `CONSENT_TEXT_VERSION`, coincide con la fecha de «Última actualización»: si cambias una, cambia la otra y todo el mundo vuelve a ver la ventana).
2. Rechazar y la X tienen el mismo efecto (no se carga nada de terceros). La X se cuenta aparte, solo en el contador anónimo.
3. Hacer scroll, pulsar fuera o Escape **no** deciden nada; la ventana se queda abajo hasta que se acepta, se rechaza o se cierra.
4. Con cookies rechazadas o sin decidir, el botón de play de un episodio vuelve a pedir el «sí» en el propio episodio.

## 3. Puntos que necesitan criterio legal (no resueltos por código)

1. Si la ventana cumple la guía de la AEPD (equivalencia visual de Aceptar y Rechazar, X que rechaza, ventana no bloqueante, revocación en un clic desde el menú).
2. Si `greener:feed` y `greener_visitor` quedan exentas como el texto afirma (art. 22.2 LSSI).
3. Si Plausible, con su configuración actual, queda en la exención de medición de audiencia, y dónde se alojan y cuánto tiempo se conservan sus datos (el «alojados en la Unión Europea» del PDF no se puede comprobar desde el código; el contrato con Plausible sigue pendiente).
4. Qué decir sobre transferencias internacionales (Google, Spotify, Cloudinary, Supabase, Plausible).
5. Si hay que enumerar las cookies de terceros con nombre y duración, o basta con remitir a sus políticas.
6. Texto final en castellano (prevalece) y en inglés.
7. Si la cookie `greener_newsletter` queda exenta como preferencia pedida por el propio visitante, o exige consentimiento previo (plan B: guardarla solo si aceptó cookies).
8. La sección «Newsletter» (base legal, encargado y transferencia internacional de Mailchimp, plazos).

## 4. Pendiente de Greener

1. **Tabla de cookies de terceros** medida en el navegador (nombre, dominio, duración, antes y después de aceptar y pulsar play, en un episodio de cada proveedor). Cuando esté, se añade a `policyContent.ts` y se sube la versión del texto.
2. Texto final del asesor: se sustituye `policyContent.ts` (y, si cambia la ventana, `src/modules/consent/domain/copy.ts`) y se actualiza `CONSENT_TEXT_VERSION`.

## 5. Añadidos pendientes de visto bueno del asesor (19 oct 2026)

El texto del asesor se incorporó tal cual, con una excepción: Greener pidió añadir tres cosas que el texto no recogía y que **el asesor todavía no ha visto**. Están marcadas aquí para que se las pasen (la lista para el asesor, con las preguntas, es un documento aparte: `consultas-asesor-legal.md`, de esta misma carpeta).

1. **Correo del formulario por Dinahosting.** El texto decía «el servicio de envío de correo de la web» sin nombre. El proveedor es el servidor de correo de Dinahosting, al que se llega por SMTP con nodemailer (variables `CONTACT_SMTP_*`). En `/privacy`: «Where it goes» nombra a Dinahosting y la lista de encargados une «alojamiento» y «servicio de correo» en una sola línea (se retiró el punto del servicio sin nombre). El buzón de destino sigue siendo Google Workspace.
2. **Campo `error` de `contact_submission`.** Si el envío falla, la tabla guarda el mensaje de error del servidor de correo, que en algún caso puede incluir la dirección de email del visitante. «Protecting the form from abuse» lo declara y dice que se borra con el resto del registro a los 30 días. «Where it goes» ya no afirma que el formulario no guarda nada: remite a ese apartado.
3. **Registros de seguridad del servidor (trampas para bots).** `logBotTrap` escribe en el log de PM2 la ruta, la IP en claro y el user agent de las peticiones a la ruta señuelo y a rutas de escáner (`.php`, `.env`…). Nuevo apartado «Security logs», con base de interés legítimo. **El plazo de 30 días lo propone Claude** para igualarlo al del registro antiabuso: solo es cierto cuando el despliegue rote los logs (`despliegue.md` §10). Si el asesor prefiere otro plazo, se cambia ahí y en el texto.

Además: el texto del asesor pide que la casilla del formulario sea informativa («I have read the privacy policy», sin marcar y no obligatoria). Hecho; la casilla no viaja con el formulario ni se valida.
