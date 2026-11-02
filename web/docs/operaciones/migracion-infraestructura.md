# Migración de infraestructura: de Dinahosting a Vercel, Cloudflare y Google Workspace

**Estado a 30 de octubre de 2026.** Resumen operativo de lo decidido entre el 26 y el 29 de octubre. Los planes completos (con fuentes, cuentas de costes, riesgos y protocolos de prueba) son tres documentos del proyecto de Claude que **no viajan en este repositorio**: *Plan de migración del dominio y del DNS a Cloudflare* (27 oct), *Plan de migración de medios: de Cloudinary a Cloudflare* (26 y 27 oct) y *Bunny Stream para vídeos largos: implementación y prueba técnica* (29 oct). Este documento recoge lo que el repositorio necesita saber; el seguimiento de las tareas está en `docs/PROGRESO.md` §4.0.

**Nada de esto está ejecutado en producción.** El 27 de octubre `itsgreener.com` no estaba en Cloudflare: el registro del dominio está en un proveedor distinto de Dinahosting, su DNS está integrado en Dinahosting y todos los registros apuntan a Dinahosting salvo `@`, que apunta (confirmado por Greener el 30 de octubre) al despliegue real actual de la web en Netlify; se cambiará a Vercel cuando se despliegue (D3). Lo único en marcha es la **preview de la web en Vercel** (desde el 28 de octubre).

## 1. Qué cambia y por qué

| Pieza | Hoy (documentos antiguos) | Destino decidido |
| --- | --- | --- |
| Alojamiento de la web | Dinahosting con PM2, cron de vigilancia y proxy Nginx de Dinahosting (`despliegue.md`, arquitectura V1.3 ADR-12 y §19.1) | **Vercel** (preview funcionando; límites de uso en Upstash, `vercel.json` con un cron) |
| DNS | Dinahosting | **Cloudflare**, sin proxy en el sitio principal (solo DNS). Única excepción: el subdominio de medios |
| Correo | Servicio de correo de Dinahosting (ya no sirve) | **Google Workspace**. El formulario de contacto envía hoy por el SMTP de Dinahosting (funciona desde Vercel; en local da error 535, §2.114) y habrá que cambiar `CONTACT_SMTP_*` |
| Imágenes y vídeo ≤ 15 s | Cloudinary Free | **Cloudflare**: originales en R2, imágenes con Image Transformations y vídeo corto con Media Transformations, siempre a través de `media.itsgreener.com` (proxificado) |
| Vídeo de más de 15 s (hasta 3:30, quizá 4 min) | Cloudinary (tope de 180 s) | **Servicio especialista**: Bunny Stream o Mux (Cloudflare Stream queda como alternativa). Se elige tras la prueba técnica |
| Contenido para el feed | WebM y MP4 | Tras el tratamiento previo, **MP4**; imágenes siempre **WebP** (AVIF sale de las subidas) |

Decisiones de Greener que lo condicionan (26 y 27 oct): proxy de Cloudflare solo en un subdominio de medios; AVIF fuera; los vídeos de más de 60 s son obligatorios (no se limitan); primero se migra el dominio y desde allí el resto; el correo va aparte; la web se queda sin proxy de Cloudflare; BotID de Vercel, como opción para el asesor, sin decidir.

## 2. Orden y calendario

Regla: **no se solapan en la misma semana** el cambio de `@` y `www` (D3), el cambio de proveedor de medios (fase 4) y la migración del correo (D4). Así un fallo tiene una sola causa posible.

| Etapa | Qué se hace | Depende de |
| --- | --- | --- |
| **D0** Preparar | Accesos y 2FA; exportar la zona de Dinahosting con TTL; anotar a dónde apuntan `@` y `www`; comprobar DNSSEC; decidir la cuenta de Cloudflare (la misma que el bucket de R2) | Nada |
| **D1** Migrar el dominio | Zona Free en Cloudflare con los mismos registros y todo en DNS only (nube gris); quitar el DS si hay DNSSEC; bajar TTL; cambiar los NS en el registrador a primera hora de un día laborable, no en viernes | D0 |
| **D2** Preparar el DNS | Tabla final de registros; añadir el dominio en Vercel con sus registros de verificación sin tocar `@` ni `www`; decidir `www` ↔ apex; crear `media.itsgreener.com` | D1 estable |
| **D3** Cambiar `www` y `@` | Primero `www`, luego `@`, ambos en DNS only; TTL de 300 s desde hace más de 24 h; no antes de 48 h tras D1; Netlify desplegado al menos 7 días como marcha atrás | D2 y sitio validado en su URL `*.vercel.app` |
| **D4** Correo y Dinahosting | MX, SPF, DKIM y DMARC de Google Workspace; cambiar el SMTP del formulario; retirar Dinahosting cuando ningún registro ni servicio (incluidos `tools.` e `insight.`) apunte a él | D3 y una semana de distancia |
| Medios, fase 0 | Prueba de concepto (P2 a P8) en un subdominio de prueba de `itsgreener.com`. El plan original la hacía en `bckffc.com`, pero ese dominio es ajeno al proyecto (Greener, 30 oct), y las transformaciones de Cloudflare exigen una zona propia de la cuenta | D1 (zona activa), o un dominio propio de Greener para probar antes |
| Medios, fase 1 | Bucket `greener-media` (valorar jurisdicción UE), dominio personalizado `media.`, `r2.dev` apagado, Images > Transformations con plan de pago, CORS, clave S3 mínima, regla WAF de lista blanca, alertas de uso | D1 (zona activa) |
| Medios, fase 2 | Código en rama (5-8 días): `cloudflareUrl.ts`, `r2Server.ts`, verificación por rango, AVIF fuera, calentamiento de vídeo retirado si pasa la prueba, guarda temporal de 60 s para vídeo de caso y `other` | Prueba de concepto |
| Medios, fases 3 a 5 | Copia con un script nuevo, `scripts/migrate-cloudinary-to-r2.mjs` (por escribir; simulación por defecto), cambio de proveedor por despliegue, Cloudinary vivo 30 días y limpieza | D3 con al menos una semana de distancia |
| Medios, fase 2B | Vídeo largo con el especialista (4-6 días), cuando llegue el primer vídeo largo | Cambio de proveedor |

## 3. Prueba técnica de Bunny Stream

Greener tiene una cuenta de prueba activa (14 días, 20 USD de crédito sin tarjeta; el 29 de octubre quedaban unos 10 días, es decir, hasta aproximadamente el **8 de noviembre**). Greener hará la prueba la semana del 2 de noviembre. El plan define trece pruebas (B0 a B13: tiempo de codificación, API, subida `tus` desde el navegador con CORS y reanudación, webhook, iframe, MP4 de respaldo, token de embed, token de CDN, miniaturas, borrado, errores, costes y privacidad), unos dos o tres días de trabajo. Claude puede preparar `scripts/bunny-probe.mjs` y una página mínima de `tus` y del iframe si Greener lo pide; las claves de API no se pegan en el chat, solo van como variables de entorno en la máquina de quien ejecuta la prueba.

Lo que decide la prueba: tiempo hasta «listo» de un vídeo de 3:30 (propuesta: 10 minutos como máximo en hora normal), calidad y peso del MP4 a 720p, CORS y `Range` desde un `<video>`, comportamiento real del webhook (que solo reintenta unas 4 horas) y esquema de token de la zona de descarga. Recomendación de partida del plan: MP4 del proveedor en un `<video>` normal, sin reproductor ni analítica de terceros, de modo que el tercero solo vea la petición cuando se pulsa play.

## 4. Impacto en el repositorio

1. **Documentación técnica.** `despliegue.md` describe el modelo de Dinahosting y queda como referencia hasta que se cierre la migración; las secciones que solo valen allí están marcadas. Hace falta un ADR nuevo que sustituya a ADR-12 y a §19.1 de la arquitectura V1.3, y otro que sustituya a ADR-13 (medios).
2. **Código.** `next.config.ts` conserva `output: 'standalone'` y un comentario que habla de Dinahosting; en Vercel es inocuo, pero conviene revisarlo al cerrar la migración. `images.remotePatterns` ya se retiró el 29 de octubre (§2.121).
3. **Base de datos.** Los topes de duración y peso de vídeo están repetidos en SQL (`p_duration_seconds > 180` y `p_bytes > 104857600` en las funciones de `20261009120000_typed_error_codes.sql`): subirlos para el vídeo largo exige una migración, no solo tocar `mediaLimits.ts`.
4. **Legal.** Cambian los encargados del tratamiento (Dinahosting sale; entran Vercel, Cloudflare, el proveedor de vídeo largo y, si se usa, BotID; Upstash ya está en la consulta 29). Hay que actualizar `policyContent.ts`, `cookies-inventario.md` y `consultas-asesor-legal.md`, y preparar el documento de preguntas nuevas para el asesor que Greener pidió el 26 de octubre. El texto de «Security logs» de `/privacy` promete borrar los registros a los 30 días con la rotación de PM2. En Vercel la retención de los runtime logs depende del plan (Hobby 1 hora, Pro 1 día, Pro con Observability Plus 30 días, Enterprise 3 días; documentación de Vercel, 28 ago 2026): hay que elegir plan, comprobar que no hay Log Drains y ajustar el texto; pasos en `PROGRESO.md` §4.1. A 2 de noviembre Greener usa la cuenta gratuita (Hobby, 1 hora) para probar y pasará a Pro; con Pro hay 1 día de logs y los 30 requieren Observability Plus.
5. **Variables de entorno.** Las de Vercel (Production) son las de `despliegue.md` §2, más las de Upstash y `CRON_SECRET`. Se añadirán las de R2 y del proveedor de vídeo largo cuando entren las fases 2 y 2B; con `NEXT_PUBLIC_*` hay que referenciarlas como literal para que Next las incruste.

## 5. Preguntas abiertas (a 30 de octubre)

1. ¿Qué etapas de D0 y D1 están hechas? El plan del 27 de octubre las dejaba sin empezar.
2. ¿En qué proveedor está registrado el dominio, qué sirve `www` en Dinahosting y hay DNSSEC activo? (`@` ya está confirmado: apunta al despliegue real en Netlify.)
3. ¿Quién puede añadir zonas y suscripciones (Images, Stream) en la cuenta de Cloudflare? (`bckffc.com`, la única zona hoy, es ajeno al proyecto: no se usa.)
4. Fechas de D1, D3 y del cambio de medios.
5. Proveedor de vídeo largo: Bunny, Mux o Cloudflare Stream; ¿vídeos de caso públicos (basta con dominios permitidos) o con token?; ¿se conservan los originales en el proveedor?; dónde se almacenan los datos y dónde está radicada la empresa (pregunta para el proveedor y el asesor).
6. Umbral de peso aceptable para el vídeo corto (propuesta: 1,5 veces el WebM VP9 actual) y si se retira el calentamiento de vídeo.
